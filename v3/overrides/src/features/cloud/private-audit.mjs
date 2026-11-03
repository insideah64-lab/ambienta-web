/**
 * Pure validation and read-only provenance for private environmental audit drafts.
 * Browser checks are for usability; PostgreSQL RLS and composite foreign keys are
 * the authority. No value here implies professional validation or legal closure.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const FINDING_SEVERITIES=Object.freeze(['observation','minor','major']);
function id(value,label){
 if(typeof value!=='string'||!UUID.test(value))throw new Error(label+': identificador inválido');
 return value;
}
function required(value,label,min,max){
 if(typeof value!=='string')throw new Error(label+': valor requerido');
 const trimmed=value.trim();
 if(trimmed.length<min||trimmed.length>max)
  throw new Error(label+': entre '+min+' y '+max+' caracteres');
 return trimmed;
}
function date(value){
 if(value===null||value===undefined||value==='')return '';
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))
  throw new Error('Fecha límite: formato AAAA-MM-DD requerido');
 const d=new Date(value+'T00:00:00.000Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)
  throw new Error('Fecha límite: día inexistente');
 return value;
}
export function validatePrivateFinding(values,scope){
 if(!values||typeof values!=='object'||Array.isArray(values))
  throw new Error('Hallazgo: datos inválidos');
 const projectId=id(scope?.projectId,'Expediente');
 const inspectionId=id(values.inspectionId,'Inspección');
 if(!Array.isArray(scope.inspections))throw new Error('Inspecciones no disponibles');
 const inspection=scope.inspections.find(i=>i.id===inspectionId&&i.project_id===projectId);
 if(!inspection)throw new Error('Inspección no pertenece al expediente activo');
 if(inspection.result!=='observed')
  throw new Error('El hallazgo requiere una inspección con observaciones declaradas, no una pendiente');
 if(!FINDING_SEVERITIES.includes(values.severity))
  throw new Error('Gravedad de hallazgo no reconocida');
 return {
  inspectionId,
  title:required(values.title,'Título del hallazgo',3,240),
  description:required(values.description,'Descripción del hallazgo',3,2000),
  severity:values.severity
 };
}
export function validatePrivateCorrectiveAction(values,scope){
 if(!values||typeof values!=='object'||Array.isArray(values))
  throw new Error('Acción correctiva: datos inválidos');
 const projectId=id(scope?.projectId,'Expediente');
 const findingId=id(values.findingId,'Hallazgo');
 if(!Array.isArray(scope.findings)||!scope.findings.some(f=>f.id===findingId&&f.project_id===projectId))
  throw new Error('El hallazgo no pertenece al expediente activo');
 return {
  findingId,
  action:required(values.action,'Acción correctiva',3,2000),
  owner:required(values.owner,'Responsable',2,240),
  dueDate:date(values.dueDate)
 };
}
export function privateAuditSummary(state){
 const projectId=id(state?.project?.id,'Expediente');
 const inspectionMap=new Map((state.monitoring_inspections||[])
  .filter(x=>x.project_id===projectId).map(x=>[x.id,x]));
 const findings=(state.audit_findings||[]).filter(x=>x.project_id===projectId);
 const findingMap=new Map(findings.map(x=>[x.id,x]));
 const normalizedFindings=findings.map(f=>{
  const i=inspectionMap.get(f.inspection_id);
  const warnings=[];
  if(!i)warnings.push('Inspección no resuelta en este expediente');
  if(i&&i.result!=='observed')warnings.push('Resultado de inspección no es observado');
  return {
   id:f.id,inspectionId:f.inspection_id,
   inspectionDate:i?.scheduled_for||'Sin inspección resuelta',
   title:f.title,description:f.description,severity:f.severity,
   status:f.status||'open',warnings
  };
 });
 const actions=(state.corrective_actions||[])
  .filter(x=>x.project_id===projectId).map(a=>{
   const f=findingMap.get(a.finding_id);
   return {
    id:a.id,findingId:a.finding_id,linkedTitle:f?.title||a.finding_id,
    action:a.action,owner:a.owner_label,dueDate:a.due_date||'',
    status:a.status||'open',
    warnings:f?[]:['Hallazgo no resuelto en este expediente']
   };
  });
 return {findings:normalizedFindings,actions};
}
