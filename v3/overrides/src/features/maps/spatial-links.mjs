// AMBIENTA V3.3 — local-only, explicit, versioned links between DEMO records and
// nonofficial study zones. Kept separate from the certified original V1/V2 domain.
import {AREA_LABELS,restoreStudyScenario,studyAreaStorageKey,scenarioMatchesAoi} from './study-areas.mjs';
import {aoiKey,readPointAoi} from './aoi-model.mjs';

export const SPATIAL_LINKS_VERSION=1;
export const SPATIAL_KINDS=Object.freeze(['impact','measure','inspection','evidence']);
export const zoneLinksKey=diablillos=>diablillos?'ambienta-zone-links-diablillos-v1':'ambienta-zone-links-demo-v1';
const zoneIds=new Set(AREA_LABELS.map(x=>x.id));
const recordGroups=Object.freeze({
 impact:'impacts',measure:'measures',inspection:'inspections',evidence:'evidence'
});
function insist(test,message){if(!test)throw Error(message);}
function isObj(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
function serializableState(s){
 insist(isObj(s)&&s.kind==='study_area_demo'&&s.status==='SIMULADO_NO_OFICIAL'&&
  typeof s.sourceHash==='string'&&/^[a-f0-9]{64}$/.test(s.sourceHash)&&
  typeof s.createdAt==='string'&&s.createdAt.length>=10&&s.createdAt.length<100&&
  Array.isArray(s.bbox)&&s.bbox.length===4&&scenarioMatchesAoi(s,s.bbox) &&
  Array.isArray(s.summary?.areas)&&s.summary.areas.length===AREA_LABELS.length&&
  Array.isArray(s.zones?.features),
  'Falta un escenario espacial de ensayo válido.');
 const available=new Set(s.zones.features.map(x=>x?.properties?.zoneId));
 insist(available.size>0&&[...available].every(id=>zoneIds.has(id)),
  'El escenario no contiene zonas reconocibles.');
 return available;
}
export function scenarioFingerprint(scenario){
 serializableState(scenario);
 // Not a cryptographic digest: token binds a local demo registry to one scenario instance.
 return [scenario.version,scenario.sourceHash,scenario.createdAt,
  ...scenario.bbox.map(n=>Number(n).toFixed(9))].join('|');
}
export function blankSpatialLinks(data,scenario,now=''){
 insist(data?.demo===true&&typeof data.project?.id==='string','Se requiere un expediente DEMO.');
 return {version:SPATIAL_LINKS_VERSION,status:'SIMULADO_NO_OFICIAL',
  projectId:data.project.id,scenarioFingerprint:scenarioFingerprint(scenario),
  createdAt:now,updatedAt:now,records:{
   impact:{},measure:{},inspection:{},evidence:{}
  }};
}
export function recordList(data,kind){
 insist(Object.hasOwn(recordGroups,kind),'Tipo de registro espacial no admitido.');
 const rows=data?.[recordGroups[kind]];
 insist(Array.isArray(rows),'La colección de registros DEMO es inválida.');
 return rows;
}
export function displayName(kind,row){
 if(kind==='impact')return row.name;
 if(kind==='measure')return row.title;
 if(kind==='inspection')return row.note||('Inspección '+row.id);
 if(kind==='evidence')return row.label;
 throw Error('Tipo de registro no admitido.');
}
function validateLinkState(value,data,scenario){
 insist(isObj(value)&&value.version===SPATIAL_LINKS_VERSION&&
  value.status==='SIMULADO_NO_OFICIAL'&&value.projectId===data.project.id,
  'El registro espacial no corresponde al proyecto y esquema actual.');
 insist(value.scenarioFingerprint===scenarioFingerprint(scenario),
  'El registro espacial pertenece a otro polígono, BBOX o generación del ensayo.');
 insist(isObj(value.records)&&Object.keys(value.records).length===4,
  'Los vínculos espaciales carecen de estructura completa.');
 const available=serializableState(scenario);
 let total=0;
 for(const kind of SPATIAL_KINDS){
  const existing=new Set(recordList(data,kind).map(x=>x.id));
  const byId=value.records[kind];
  insist(isObj(byId)&&Object.keys(byId).length<=200,'Demasiados vínculos en el registro.');
  for(const [id,entry] of Object.entries(byId)){
   total++;
   insist(existing.has(id),'Una asignación referencia un registro que ya no existe: '+id);
   insist(isObj(entry)&&Array.isArray(entry.zoneIds)&&entry.zoneIds.length>=1&&
    entry.zoneIds.length<=4&&new Set(entry.zoneIds).size===entry.zoneIds.length&&
    entry.zoneIds.every(zone=>available.has(zone))&&typeof entry.updatedAt==='string'&&
    entry.updatedAt.length<=100,
    'Una asignación contiene áreas inexistentes, duplicadas o datos corruptos.');
  }
 }
 insist(total<=400,'Demasiadas asignaciones para una sesión de laboratorio.');
 return value;
}
export function readSpatialLinks(storage,key,data,scenario){
 if(!scenario)return {state:null,status:'no_scenario',reason:'No existe polígono de ensayo activo.'};
 let current=blankSpatialLinks(data,scenario);
 try{
  const raw=storage.getItem(key);
  if(raw===null)return {state:current,status:'empty',reason:null};
  if(raw.length>60000)return {state:current,status:'blocked',reason:'El registro excede el límite de tamaño.'};
  const parsed=JSON.parse(raw);
  current=validateLinkState(parsed,data,scenario);
  return {state:current,status:'ready',reason:null};
 }catch(cause){
  return {state:current,status:'blocked',
   reason:'Las asignaciones guardadas no corresponden al polígono o registros actuales. No se reutilizaron.'};
 }
}
export function assignRecordZones(existing,data,scenario,kind,id,zones,at){
 insist(SPATIAL_KINDS.includes(kind),'Tipo de vínculo inválido.');
 const known=recordList(data,kind).some(r=>r.id===id);
 insist(known,'No existe el registro ambiental de demostración indicado.');
 const allowed=serializableState(scenario);
 insist(Array.isArray(zones)&&zones.length<=4&&zones.every(z=>allowed.has(z))&&
  new Set(zones).size===zones.length,'Áreas desconocidas o repetidas en la asignación.');
 insist(typeof at==='string'&&at.length>=10&&at.length<=100,'Fecha de asignación inválida.');
 const original=validateLinkState(existing,data,scenario);
 const state=structuredClone(original);
 if(zones.length)state.records[kind][id]={zoneIds:[...zones].sort(),updatedAt:at};
 else delete state.records[kind][id];
 state.updatedAt=at;
 return validateLinkState(state,data,scenario);
}
export function seedDemoSpatialLinks(existing,data,scenario,at){
 insist(data.demo===true&&data.project.id==='DIAB-2026-DEMO',
  'La asignación precargada es exclusiva del caso Diablillos simulado.');
 const defaults={
  impact:{'IMP-D-AGU':['B'],'IMP-D-EFL':['A'],'IMP-D-SUE':['C'],'IMP-D-SOC':['D']},
  measure:{'MED-DIAB-001':['B'],'MED-DIAB-002':['A'],
           'MED-DIAB-003':['C'],'MED-DIAB-004':['D']},
  inspection:{'INSP-DIAB-001':['B'],'INSP-DIAB-002':['A']},
  evidence:{'EVID-D-001':['B'],'EVID-D-002':['B'],'EVID-D-003':['B'],
            'EVID-D-004':['A'],'EVID-D-005':['C'],'EVID-D-006':['D']}
 };
 let state=validateLinkState(existing,data,scenario);
 for(const kind of SPATIAL_KINDS)for(const [id,zones] of Object.entries(defaults[kind]))
  state=assignRecordZones(state,data,scenario,kind,id,zones,at);
 return state;
}
export function summarizeSpatialLinks(state,data,scenario){
 validateLinkState(state,data,scenario);
 const counts=Object.fromEntries(SPATIAL_KINDS.map(kind=>[
  kind,{linked:Object.keys(state.records[kind]).length,total:recordList(data,kind).length}
 ]));
 const byZone=AREA_LABELS.map(z=>({id:z.id,label:z.label,color:z.color,
  ...Object.fromEntries(SPATIAL_KINDS.map(kind=>[
   kind,Object.values(state.records[kind]).filter(v=>v.zoneIds.includes(z.id)).length
  ]))
 }));
 // Record-to-record links are documentary and do not imply physical coincidence.
 // A differing assigned zone is flagged for human review; it is never auto-corrected.
 const conflicts=[];
 function conflict(kind,id,refKind,refId){
  const child=state.records[kind][id]?.zoneIds;
  const parent=state.records[refKind][refId]?.zoneIds;
  if(child?.length&&parent?.length&&!child.some(z=>parent.includes(z)))
   conflicts.push({kind,id,relatedKind:refKind,relatedId:refId,
    reason:'Zonas de ensayo diferentes en registros documentales relacionados.'});
 }
 for(const m of data.measures)for(const imp of m.impactIds)conflict('measure',m.id,'impact',imp);
 for(const i of data.inspections)conflict('inspection',i.id,'measure',i.measureId);
 for(const e of data.evidence){
  if(e.measureId)conflict('evidence',e.id,'measure',e.measureId);
  if(e.inspectionId)conflict('evidence',e.id,'inspection',e.inspectionId);
 }
 return {counts,byZone,conflicts,totalLinked:Object.values(counts).reduce((a,x)=>a+x.linked,0),
  totalRecords:Object.values(counts).reduce((a,x)=>a+x.total,0)};
}
export function exportSpatialLinks(state,data,scenario){
 validateLinkState(state,data,scenario);
 return {
  schema:'ambienta-spatial-demo-v1',status:'SIMULADO_NO_OFICIAL',
  projectId:data.project.id,domainRevision:data.revision,
  scenario:{sourceHash:scenario.sourceHash,sourceHashScope:scenario.sourceHashScope,
   createdAt:scenario.createdAt,bbox:scenario.bbox,crs:scenario.crs,
   caveat:scenario.caveat,scenarioFingerprint:state.scenarioFingerprint,
   zoneAreasHa:scenario.summary.areas.map(({id,label,areaHa,percent})=>({id,label,areaHa,percent}))},
  records:state.records,summary:summarizeSpatialLinks(state,data,scenario),
  limitation:'Asignación documental explícita de prueba; no establece localización de impacto, medición real o evidencia georreferenciada.'
 };
}
// Read the same local scenario and AOI as GeoMap, without modifying source records
// or triggering network requests. Invalid or stale local inputs are never linked.
export function readSpatialBrowserContext(data,isDiablillos,storage=localStorage){
 const bbox=readPointAoi(aoiKey(isDiablillos))?.bbox;
 const key=zoneLinksKey(isDiablillos);
 if(!bbox)return {scenario:null,state:null,status:'no_scenario',reason:'Primero creá una ventana y un polígono de ensayo en Área de estudio.',key};
 let workHash=null;
 try{
  const raw=storage.getItem(isDiablillos?'ambienta-gis-diablillos-working-v3':'ambienta-gis-demo-working-v3');
  if(raw&&raw.length<=1400000){
   const imported=JSON.parse(raw);
   if(typeof imported?.sha256==='string')workHash=imported.sha256;
  }
 }catch{/* Ignore malformed local layer: scenario validation fails closed. */}
 const scenario=restoreStudyScenario(studyAreaStorageKey(isDiablillos),bbox,workHash);
 if(!scenario)return {scenario:null,state:null,status:'no_scenario',
  reason:'El polígono anterior ya no está disponible o no coincide con la ventana/fuente actual.',key};
 const found=readSpatialLinks(storage,key,data,scenario);
 return {...found,scenario,key};
}
