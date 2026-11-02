/**
 * V3.6.1 — read-only, explicit-ID record focus.
 * Never infer documentary links from labels or status; always verify references.
 * Returned fields preserve the source values; no modifying or certifying records.
 */
const SCOPES={
 inspection:{collection:'inspections',url:'monitoreo',param:'inspeccion'},
 evidence:{collection:'evidence',url:'evidencias',param:'evidencia'},
 finding:{collection:'findings',url:'auditorias',param:'hallazgo'},
 action:{collection:'correctiveActions',url:'auditorias',param:'accion'}
};
export function recordFocusUrl(kind,id){
 const rule=SCOPES[kind];
 if(!rule||typeof id!=='string'||!id.trim())return null;
 return '/'+rule.url+'?'+rule.param+'='+encodeURIComponent(id);
}
export function resolveRecordFocus(state,kind,id){
 const rule=SCOPES[kind];
 if(!rule||typeof id!=='string'||!id.trim())return null;
 const record=(state?.[rule.collection]??[]).find(r=>r.id===id);
 if(!record)return null;
 const warnings=[],relations=[];
 const target=(key,refId,label)=>{
  if(!refId)return null;
  const row=(state?.[key]??[]).find(r=>r.id===refId);
  if(!row){warnings.push(label+' '+refId+' no existe en el expediente.');return null}
  return row;
 };
 const add=(kind,id,label)=>{
  const url=kind==='measure'?'/pga?medida='+encodeURIComponent(id):recordFocusUrl(kind,id);
  if(url)relations.push({kind,id,label,url});
 };
 if(kind==='inspection'){
  const m=target('measures',record.measureId,'Medida');
  if(m)add('measure',m.id,'Medida asociada por measureId');
 }else if(kind==='evidence'){
  const m=record.measureId?target('measures',record.measureId,'Medida'):null;
  const i=record.inspectionId?target('inspections',record.inspectionId,'Inspección'):null;
  if(m&&i&&i.measureId!==m.id){
   warnings.push('Conflicto entre measureId e inspectionId: no se muestra vínculo a medida.');
  }else{
   if(m)add('measure',m.id,'Medida asociada por measureId');
   if(!m&&!record.measureId&&i){
    const ind=target('measures',i.measureId,'Medida vía inspección');
    if(ind)add('measure',ind.id,'Medida vinculada indirectamente por inspección');
   }
  }
  if(i)add('inspection',i.id,'Inspección declarada por inspectionId');
 }else if(kind==='finding'){
  const i=target('inspections',record.inspectionId,'Inspección');
  if(i){
   add('inspection',i.id,'Inspección origen por inspectionId');
   const m=target('measures',i.measureId,'Medida vía inspección');
   if(m)add('measure',m.id,'Medida vinculada indirectamente por inspección');
  }
 }else if(kind==='action'){
  const f=target('findings',record.findingId,'Hallazgo');
  if(f){
   add('finding',f.id,'Hallazgo origen por findingId');
   const i=target('inspections',f.inspectionId,'Inspección vía hallazgo');
   if(i){
    add('inspection',i.id,'Inspección vinculada por hallazgo');
    const m=target('measures',i.measureId,'Medida vía inspección');
    if(m)add('measure',m.id,'Medida vinculada por hallazgo e inspección');
   }
  }
 }
 const fieldsByKind={
  inspection:[['Fecha',record.date],['Resultado declarado',record.result],['Responsable',record.assignee],['Observación',record.note]],
  evidence:[['Descripción',record.label],['Referencia declarada',record.reference],['Estado documental',record.status],['Autor',record.author],['Revisor',record.reviewer],['Fecha de revisión',record.reviewedAt]],
  finding:[['Título',record.title],['Descripción',record.description],['Estado documental',record.status],['Clasificación declarada',record.severity],['Apertura',record.openedAt]],
  action:[['Acción',record.action],['Responsable',record.owner],['Estado documental',record.status],['Vencimiento',record.due],['Verificación declarada',record.verification]]
 };
 return {kind,id:record.id,record,fields:fieldsByKind[kind].filter(pair=>pair[1]!==null&&pair[1]!==undefined&&pair[1]!==''),relations,warnings};
}
