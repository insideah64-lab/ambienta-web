// AMBIENTA V3.9 — audited, explicit station-to-point proposals (local QA only).
// No coordinate fabrication, measurement mutation, status promotion, or network.
import {validateMeasurementBook} from '../monitoring/measurements.mjs';
import {analyzePointsInStudyAreas,analysisMatchesContext} from './point-zone-analysis.mjs';
import {boundaryDistance} from './documentary-links.mjs';
export const STATION_LINK_SCHEMA='ambienta-station-point-links-v1';
export const stationLinksKey=diablillos=>diablillos?'ambienta-v39-stations-diablillos':'ambienta-v39-stations-demo';
const SHA=/^[a-f0-9]{64}$/;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const label=x=>typeof x==='string'&&x.trim().length>0&&x.length<=180;
const iso=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(x)&&
 !Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,19)===x.slice(0,19);
const insist=(condition,message)=>{if(!condition)throw Error('Estaciones V3.9: '+message);};
function activeStationIds(book){
 const voided=new Set(book.events.filter(x=>x.kind==='voided').map(x=>x.measurementId));
 return [...new Set(book.entries.filter(x=>!voided.has(x.id)).map(x=>x.stationId))].sort();
}
export function stationContext({book,data,report,layer,scenario}){
 validateMeasurementBook(book,data);
 insist(analysisMatchesContext(report,layer,scenario),'fuente o polígono de V3.5 obsoletos');
 insist(report.status==='SIMULADO_NO_OFICIAL'&&report.crs==='EPSG:4326'&&
  SHA.test(report.provenance.inputSha256),'reporte de puntos sin procedencia y CRS esperados');
 // Re-evaluate geometry, holes and zone classification from the active source, not a guessed station name.
 const derived=analyzePointsInStudyAreas({layer,scenario});
 insist(report.points.length===derived.points.length&&report.points.every((p,i)=>{
  const q=derived.points[i];
  return p.ref===q.ref&&p.status===q.status&&p.zoneId===q.zoneId&&
   JSON.stringify(p.coordinate)===JSON.stringify(q.coordinate);
 }), 'la clasificación de puntos no coincide con la fuente vigente');
 const origin={projectId:data.project.id,domainRevision:data.revision,
  measurementRevision:book.revision,inputSha256:layer.sha256,
  scenarioSha256:scenario.sourceHash,scenarioCreatedAt:scenario.createdAt,
  scenarioBbox:[...scenario.bbox],crs:'EPSG:4326'};
 return {origin,stations:activeStationIds(book),points:derived.points,scenario};
}
function sameOrigin(a,b){return JSON.stringify(a)===JSON.stringify(b);}
export function blankStationLinks(ctx,at){
 insist(iso(at),'fecha de registro inválida');
 return {schema:STATION_LINK_SCHEMA,version:1,status:'SIMULADO_NO_OFICIAL',
  origin:structuredClone(ctx.origin),createdAt:at,updatedAt:at,entries:[]};
}
function assessment(item,ctx){
 insist(object(item)&&label(item.stationId)&&ctx.stations.includes(item.stationId),
  'estación sin medición activa');
 insist(label(item.pointRef),'referencia puntual faltante');
 insist(label(item.sourceId)&&label(item.positionMethod)&&label(item.proposer)&&
  iso(item.positionObservedAt)&&iso(item.proposedAt),'procedencia y responsable obligatorios');
 insist(typeof item.accuracyMeters==='number'&&Number.isFinite(item.accuracyMeters)&&
  item.accuracyMeters>=0&&item.accuracyMeters<=100000,'precisión en metros inválida');
 const point=ctx.points.find(p=>p.ref===item.pointRef);
 insist(point,'el punto no existe en la capa importada');
 const meters=boundaryDistance(point.coordinate,ctx.scenario);
 const eligible=point.status==='inside_zone'&&
  ['A','B','C','D'].includes(point.zoneId)&&Number.isFinite(meters)&&
  meters>item.accuracyMeters*1.25;
 return {status:eligible?'awaiting_review':'needs_spatial_review',
  zoneId:eligible?point.zoneId:null,boundaryDistanceMeters:Number.isFinite(meters)?Number(meters.toFixed(2)):null,
  reason:eligible?'Candidato para revisión documental':
   point.status==='outside_perimeter'?'Punto exterior al perímetro':
   point.status.startsWith('review_')?'Punto en límite o topología ambigua':
   'Precisión declarada alcanza un límite o no se puede calcular distancia'};
}
export function validateStationLinks(book,ctx){
 insist(object(book)&&book.schema===STATION_LINK_SCHEMA&&book.version===1&&
  book.status==='SIMULADO_NO_OFICIAL'&&sameOrigin(book.origin,ctx.origin)&&
  iso(book.createdAt)&&iso(book.updatedAt)&&Array.isArray(book.entries)&&
  book.entries.length<=300,'registro de enlaces corrupto o contexto cambiado');
 const ids=new Set();
 for(const item of book.entries){
  insist(!ids.has(item.stationId),'estación repetida');ids.add(item.stationId);
  const expected=assessment(item,ctx);
  insist(item.zoneId===expected.zoneId&&item.reason===expected.reason&&
   item.boundaryDistanceMeters===expected.boundaryDistanceMeters,
   'resultado SIG alterado o fuente desactualizada');
  if(expected.status==='needs_spatial_review'){
   insist(item.status==='needs_spatial_review'&&item.review===null,
    'punto ambiguo no puede ser aprobado');
  }else{
   insist(['awaiting_review','accepted_qa','rejected'].includes(item.status),
    'estado de revisión inválido');
   if(item.status==='awaiting_review')insist(item.review===null,'revisión no autorizada');
   else{
    insist(object(item.review)&&label(item.review.reviewer)&&label(item.review.reason)&&
     iso(item.review.reviewedAt)&&
     item.review.reviewer.trim().toLowerCase()!==item.proposer.trim().toLowerCase()&&
     item.review.decision===(item.status==='accepted_qa'?'accept':'reject'),
     'revisión incompleta o realizada por la misma persona');
   }
  }
 }
 return book;
}
export function proposeStationLink(book,ctx,input,at){
 validateStationLinks(book,ctx);
 insist(book.entries.length<300&&iso(at),'límite o fecha inválidos');
 insist(!book.entries.some(x=>x.stationId===input.stationId),
  'estación ya enlazada: revisar o volver a generar el escenario');
 const candidate={
  stationId:input.stationId,pointRef:input.pointRef,sourceId:input.sourceId?.trim(),
  positionMethod:input.positionMethod?.trim(),positionObservedAt:input.positionObservedAt,
  accuracyMeters:input.accuracyMeters,proposer:input.proposer?.trim(),proposedAt:at
 };
 const result=assessment(candidate,ctx);
 const next=structuredClone(book);
 next.entries.push({...candidate,...result,review:null});
 next.updatedAt=at;
 return validateStationLinks(next,ctx);
}
export function reviewStationLink(book,ctx,stationId,decision,reviewer,reason,at){
 validateStationLinks(book,ctx);
 insist(['accept','reject'].includes(decision)&&label(reviewer)&&label(reason)&&iso(at),
  'decisión, fecha o responsable inválidos');
 const next=structuredClone(book);
 const entry=next.entries.find(x=>x.stationId===stationId);
 insist(entry&&entry.status==='awaiting_review','únicamente propuestas interiores no revisadas');
 insist(entry.proposer.toLowerCase()!==reviewer.trim().toLowerCase(),
  'el proponente no puede revisar su propio vínculo');
 entry.status=decision==='accept'?'accepted_qa':'rejected';
 entry.review={decision,reviewer:reviewer.trim(),reason:reason.trim(),reviewedAt:at};
 next.updatedAt=at;
 return validateStationLinks(next,ctx);
}
export function readStationLinks(storage,key,ctx){
 try{
  const raw=storage.getItem(key);
  if(raw===null)return {status:'empty',book:blankStationLinks(ctx,new Date().toISOString()),reason:''};
  if(raw.length>160000)return {status:'blocked',book:null,reason:'El archivo excede 160 KiB'};
  const book=JSON.parse(raw);
  if(!sameOrigin(book?.origin,ctx.origin))
   return {status:'stale',book:null,reason:'Cambió el proyecto, la capa, el polígono o las mediciones.'};
  return {status:'ready',book:validateStationLinks(book,ctx),reason:''};
 }catch{
  return {status:'blocked',book:null,reason:'Registro inválido. No se sobrescribió el origen.'};
 }
}
export function stationLinkSummary(book,ctx){
 validateStationLinks(book,ctx);
 return {total:book.entries.length,accepted:book.entries.filter(e=>e.status==='accepted_qa').length,
  pending:book.entries.filter(e=>e.status==='awaiting_review').length,
  reviewSpatial:book.entries.filter(e=>e.status==='needs_spatial_review').length,
  rejected:book.entries.filter(e=>e.status==='rejected').length,
  unlinked:ctx.stations.filter(s=>!book.entries.some(e=>e.stationId===s)).length};
}
export function exportStationLinks(book,ctx){
 validateStationLinks(book,ctx);
 return {...structuredClone(book),exportType:'LOCAL_EXPLICIT_STATION_LINKS_NO_COORDINATES',
  caveat:'ID de estación vinculado explícitamente a punto SIG declarado. No verifica coordenadas en campo, estación real, muestreo, QA analítico ni cumplimiento ambiental.'};
}
