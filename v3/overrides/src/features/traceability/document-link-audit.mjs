import {recordFocusUrl} from './record-focus.mjs';

/** Read-only audit of EXPLICIT DEMO documentary IDs (not environmental compliance).
 * Each issue records the source collection, field and declared reference.
 * No record, geometry, localStorage key or evidence file is modified or inferred.
 */
const SPECS=[
 ['program','programs'],['measure','measures'],['inspection','inspections'],
 ['evidence','evidence'],['finding','findings'],['action','correctiveActions']
];
const COLLECTIONS=Object.fromEntries(SPECS);
const urlFor=(kind,id)=>kind==='measure'
 ? '/pga?medida='+encodeURIComponent(id):recordFocusUrl(kind,id);
const validId=x=>typeof x==='string'&&x.trim().length>0;

export function auditDocumentLinks(state){
 const index={},issues=[];
 const issue=(kind,id,code,message,{field='id',reference=null,
  targetKind=null,occurrences=null,canOpen=true}={})=>issues.push({
  kind,id,code,message,field,reference,targetKind,
  sourceCollection:COLLECTIONS[kind]??null,occurrences,
  url:canOpen&&validId(id)?urlFor(kind,id):null
 });
 let checked=0;
 for(const [kind,collection] of SPECS){
  const rows=Array.isArray(state?.[collection])?state[collection]:[];
  checked+=rows.length;
  const byId=new Map(),duplicates=new Set(),counter=new Map();
  for(const row of rows){
   if(!row||!validId(row.id)){
    issue(kind,'(sin ID)','invalid_id',
     'Registro sin identificador utilizable.',{field:'id',canOpen:false});
    continue;
   }
   counter.set(row.id,(counter.get(row.id)??0)+1);
   if(byId.has(row.id))duplicates.add(row.id);
   else byId.set(row.id,row);
  }
  index[kind]={byId,duplicates,rows};
  for(const id of [...duplicates].sort())issue(kind,id,'duplicate_id',
   'Identificador repetido en la misma colección: referencia ambigua.',
   {field:'id',reference:id,occurrences:counter.get(id),canOpen:false});
 }
 const ref=(kind,row,field,target,required=true)=>{
  if(!row||!validId(row.id))return null;
  const id=row[field];
  if(!validId(id)){
   if(required)issue(kind,row.id,'missing_reference',
    field+' no tiene un identificador declarado.',{field,targetKind:target});
   return null;
  }
  const dest=index[target];
  if(dest.duplicates.has(id)){
   issue(kind,row.id,'ambiguous_target',
    field+' → '+id+': hay más de un registro de destino con ese ID.',
    {field,reference:id,targetKind:target});
   return null;
  }
  if(!dest.byId.has(id)){
   issue(kind,row.id,'missing_target',
    field+' → '+id+': referencia inexistente en el expediente.',
    {field,reference:id,targetKind:target});
   return null;
  }
  return dest.byId.get(id);
 };
 for(const m of index.measure.rows)ref('measure',m,'programId','program');
 for(const i of index.inspection.rows)ref('inspection',i,'measureId','measure');
 for(const e of index.evidence.rows){
  if(!validId(e?.id))continue;
  const hasMeasure=validId(e.measureId),hasInspection=validId(e.inspectionId);
  if(!hasMeasure&&!hasInspection){
   issue('evidence',e.id,'unlinked_evidence',
    'Sin measureId ni inspectionId; no se asocia automáticamente a una medida.',
    {field:'measureId/inspectionId'});
   continue;
  }
  const measure=hasMeasure?ref('evidence',e,'measureId','measure'):null;
  const inspection=hasInspection?ref('evidence',e,'inspectionId','inspection'):null;
  if(measure&&inspection&&inspection.measureId!==measure.id){
   issue('evidence',e.id,'conflicting_reference',
    'measureId e inspectionId apuntan a medidas distintas; no se unifican.',
    {field:'measureId/inspectionId',
     reference:e.measureId+' | '+e.inspectionId,targetKind:'measure/inspection'});
  }
 }
 for(const f of index.finding.rows)ref('finding',f,'inspectionId','inspection');
 for(const a of index.action.rows)ref('action',a,'findingId','finding');
 // A source with a duplicated ID cannot be navigated safely via a single-ID URL.
 for(const item of issues){
  const source=index[item.kind];
  if(!source?.byId.has(item.id)||source.duplicates.has(item.id))item.url=null;
 }
 issues.sort((a,b)=>a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id)||
  a.code.localeCompare(b.code)||a.field.localeCompare(b.field));
 return {checked,total:issues.length,issues,
  disclaimer:'Solo calidad de referencias declaradas: cero alertas no implica evidencia auténtica, inspección de campo ni cumplimiento ambiental.'};
}
