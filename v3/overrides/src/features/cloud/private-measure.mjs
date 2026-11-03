/**
 * Validation and provenance selection for private, authenticated PGA measures.
 * This module does NOT authorize records: Supabase RLS, composite foreign keys,
 * and the invoker-rights atomic RPC remain the server-side authority.
 */
export const PRIVATE_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function required(value,label,min,max){
 if(typeof value!=='string')throw new Error(label+': valor requerido');
 const result=value.trim();
 if(result.length<min||result.length>max)
  throw new Error(label+': entre '+min+' y '+max+' caracteres');
 return result;
}
function dateOrBlank(value){
 if(value===null||value===undefined||value==='')return '';
 if(typeof value!=='string'||!/^(\d{4})-(\d{2})-(\d{2})$/.test(value))
  throw new Error('Fecha límite: ingresar fecha ISO válida');
 const date=new Date(value+'T00:00:00.000Z');
 if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)
  throw new Error('Fecha límite: día inexistente');
 return value;
}
export function validatePrivateMeasure(values,scope){
 if(!values||typeof values!=='object'||Array.isArray(values))
  throw new Error('La medida no tiene datos válidos');
 if(!scope||typeof scope!=='object')throw new Error('Expediente privado no seleccionado');
 const {projectId,programIds,impactIds}=scope;
 if(!PRIVATE_UUID.test(projectId||''))throw new Error('Proyecto privado inválido');
 if(!Array.isArray(programIds)||!Array.isArray(impactIds))
  throw new Error('Catálogos de programa e impacto no disponibles');
 const programId=required(values.programId,'Programa PGA',36,36);
 const impactId=required(values.impactId,'Impacto',36,36);
 if(!PRIVATE_UUID.test(programId)||!programIds.includes(programId))
  throw new Error('Programa no pertenece al expediente seleccionado');
 if(!PRIVATE_UUID.test(impactId)||!impactIds.includes(impactId))
  throw new Error('Impacto no pertenece al expediente seleccionado');
 return {
  programId,impactId,
  title:required(values.title,'Nombre de la medida',3,240),
  description:required(values.description,'Descripción',3,2000),
  owner:required(values.owner,'Responsable',2,240),
  indicator:required(values.indicator,'Indicador',3,500),
  criterion:required(values.criterion,'Criterio de seguimiento',3,500),
  frequency:required(values.frequency,'Frecuencia',3,80),
  dueDate:dateOrBlank(values.dueDate)
 };
}
/** No inferred links by factor/title. Invalid or cross-scope references are surfaced. */
export function privateMeasureSummary(measures,links,impacts,programs){
 const impactNames=new Map((impacts||[]).map(i=>[i.id,i.code||i.title||i.id]));
 const programNames=new Map((programs||[]).map(p=>[p.id,p.code||p.name||p.id]));
 return (measures||[]).map(m=>{
  const linked=(links||[]).filter(l=>l.measure_id===m.id);
  const linkedIds=[...new Set(linked.map(l=>l.impact_id))];
  const problems=[];
  if(!programNames.has(m.program_id))problems.push('Programa PGA no resuelto');
  if(!linkedIds.length)problems.push('Sin impacto vinculado');
  for(const id of linkedIds)if(!impactNames.has(id))problems.push('Impacto asociado no resuelto: '+id);
  return {
   id:m.id,title:m.title||m.id,
   status:m.status||'draft',
   programId:m.program_id,
   programLabel:programNames.get(m.program_id)||m.program_id||'Sin programa',
   impactIds:linkedIds,
   impactLabels:linkedIds.map(id=>impactNames.get(id)||id),
   problems
  };
 });
}
