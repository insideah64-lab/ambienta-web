/**
 * AMBIENTA / expedientes privados.
 *
 * Pure validation and read-only provenance for user-declared monitoring.
 * Authorization belongs to Supabase Auth + RLS and composite FKs, never this file.
 */
export const PRIVATE_MONITORING_RESULTS=Object.freeze([
 'pending','conformant','observed','not_applicable'
]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function identifier(value,label){
 if(typeof value!=='string'||!UUID.test(value))
  throw new Error(label+': identificador inválido');
 return value;
}
function required(value,label,min,max){
 if(typeof value!=='string')throw new Error(label+': valor requerido');
 const cleaned=value.trim();
 if(cleaned.length<min||cleaned.length>max)
  throw new Error(label+': entre '+min+' y '+max+' caracteres');
 return cleaned;
}
function isoDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))
  throw new Error('Fecha de inspección: formato AAAA-MM-DD requerido');
 const d=new Date(value+'T00:00:00.000Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)
  throw new Error('Fecha de inspección: día inexistente');
 return value;
}
function scopeId(scope){
 if(!scope||!UUID.test(scope.projectId||''))
  throw new Error('Expediente privado inválido');
 return scope.projectId;
}
function measureInScope(scope,measureId){
 identifier(measureId,'Medida PGA');
 const projectId=scopeId(scope);
 if(!Array.isArray(scope.measures)||!scope.measures.some(
  m=>m.id===measureId&&m.project_id===projectId
 ))throw new Error('La medida no pertenece al expediente activo');
 return measureId;
}
export function validatePrivateInspection(values,scope){
 if(!values||typeof values!=='object'||Array.isArray(values))
  throw new Error('Datos de inspección inválidos');
 const measureId=measureInScope(scope,values.measureId);
 if(!PRIVATE_MONITORING_RESULTS.includes(values.result))
  throw new Error('Resultado de inspección no reconocido');
 return {
  measureId,
  date:isoDate(values.date),
  result:values.result,
  note:required(values.note,'Observación',3,2000)
 };
}
export function validatePrivateEvidenceReference(values,scope){
 if(!values||typeof values!=='object'||Array.isArray(values))
  throw new Error('Datos de evidencia inválidos');
 const measureId=measureInScope(scope,values.measureId);
 const inspectionId=values.inspectionId||'';
 if(inspectionId){
  identifier(inspectionId,'Inspección');
  if(!Array.isArray(scope.inspections)||!scope.inspections.some(i=>
   i.id===inspectionId&&i.measure_id===measureId&&i.project_id===scope.projectId))
   throw new Error('La inspección no corresponde a la medida y al expediente seleccionados');
 }
 return {
  measureId,inspectionId,
  label:required(values.label,'Descripción documental',3,320),
  reference:required(values.reference,'Referencia de fuente',3,350)
 };
}
/**
 * Displays only rows explicitly scoped to the selected project. Unresolved
 * measure or inspection pointers remain visible as warnings, not guesses.
 * No inspection status or evidence status implies a scientific verification.
 */
export function privateMonitoringSummary(state){
 const projectId=identifier(state?.project?.id,'Expediente');
 const measures=(state.management_measures||[]).filter(x=>x.project_id===projectId);
 const measureMap=new Map(measures.map(m=>[m.id,m]));
 const rows=(state.monitoring_inspections||[])
  .filter(i=>i.project_id===projectId)
  .map(i=>({
   id:i.id,measureId:i.measure_id,measureName:measureMap.get(i.measure_id)?.title||i.measure_id,
   date:i.scheduled_for,result:i.result,note:i.note,
   warnings:measureMap.has(i.measure_id)?[]:['Medida no resuelta en este expediente']
  }));
 const inspections=new Map(rows.map(i=>[i.id,i]));
 const references=(state.environmental_evidence||[])
  .filter(e=>e.project_id===projectId&&!e.storage_path)
  .map(e=>{
   const issues=[];
   if(!measureMap.has(e.measure_id))issues.push('Medida no resuelta');
   if(e.inspection_id){
    const i=inspections.get(e.inspection_id);
    if(!i||i.measureId!==e.measure_id)
     issues.push('Inspección no corresponde con la medida');
   }
   return {
    id:e.id,measureId:e.measure_id,
    inspectionId:e.inspection_id||'',
    measureName:measureMap.get(e.measure_id)?.title||e.measure_id,
    label:e.label,reference:e.reference_label,
    status:e.status||'pending',warnings:issues
   };
  });
 return {inspections:rows,references};
}
