/**
 * AMBIENTA V3.6.6 — fail-closed, read-only graph projection for one measure.
 * Links are explicit IDs only. Duplicate identifiers never resolve by array order.
 * Documentary health is not environmental/legal compliance or authenticity.
 */
const counts=rows=>{
 const ids=new Map();
 for(const row of rows)if(typeof row?.id==='string')
  ids.set(row.id,(ids.get(row.id)??0)+1);
 return ids;
};
export function measureDocumentTrace(state,measureId){
 const measures=state?.measures??[];
 const matched=measures.filter(m=>m?.id===measureId);
 // A single-ID URL cannot distinguish two measures with the same identifier.
 if(matched.length!==1)return null;
 const measure=matched[0];
 const inspections=state?.inspections??[];
 const findings=state?.findings??[];
 const actions=state?.correctiveActions??[];
 const evidences=state?.evidence??[];
 const programs=state?.programs??[];
 const nI=counts(inspections),nF=counts(findings),nA=counts(actions),
  nE=counts(evidences),nP=counts(programs);
 const warnings=[];
 const warn=(kind,id,message)=>warnings.push({kind,id,message});
 const unique=(numberMap,id)=>numberMap.get(id)===1;
 const linkedInspections=inspections.filter(i=>{
  if(i.measureId!==measureId)return false;
  if(!unique(nI,i.id)){
   warn('ambiguous_inspection',i.id,'Inspección con ID duplicado; vínculo excluido.');
   return false;
  }
  return true;
 });
 const inspectionIds=new Set(linkedInspections.map(i=>i.id));
 const knownInspections=new Map(inspections.filter(i=>unique(nI,i.id)).map(i=>[i.id,i]));
 const linkedFindings=findings.filter(f=>{
  if(!inspectionIds.has(f.inspectionId))return false;
  if(!unique(nF,f.id)){
   warn('ambiguous_finding',f.id,'Hallazgo con ID duplicado; vínculo excluido.');
   return false;
  }
  return true;
 });
 const findingIds=new Set(linkedFindings.map(f=>f.id));
 const linkedActions=actions.filter(a=>{
  if(!findingIds.has(a.findingId))return false;
  if(!unique(nA,a.id)){
   warn('ambiguous_action',a.id,'Acción con ID duplicado; vínculo excluido.');
   return false;
  }
  return true;
 });
 const relatedEvidence=[];
 for(const e of evidences){
  const direct=e.measureId===measureId;
  const viaInspection=Boolean(e.inspectionId&&inspectionIds.has(e.inspectionId));
  if(!direct&&!viaInspection)continue;
  if(!unique(nE,e.id)){
   warn('ambiguous_evidence',e.id,'Evidencia con ID duplicado; vínculo excluido.');
   continue;
  }
  if(e.inspectionId&&(nI.get(e.inspectionId)??0)>1){
   warn('ambiguous_inspection',e.id,
    'inspectionId de evidencia no es inequívoco; revisar referencia.');
   // A valid direct measureId remains a direct relationship, never indirect.
   if(!direct)continue;
  }
  const inspectionRef=e.inspectionId?knownInspections.get(e.inspectionId):null;
  const conflicting=Boolean(e.measureId&&inspectionRef&&inspectionRef.measureId!==e.measureId);
  if(conflicting){
   warn('conflicting_evidence',e.id,
    'Evidencia con medida e inspección de medidas diferentes; vínculo no incorporado.');
   continue;
  }
  if(direct&&e.inspectionId&&!inspectionRef&&(nI.get(e.inspectionId)??0)===0){
   warn('unresolved_inspection',e.id,
    'La evidencia referencia una inspección inexistente; revisar procedencia.');
  }
  if(direct||(!e.measureId&&viaInspection)){
   relatedEvidence.push({record:e,via:direct?'medida':'inspeccion'});
  }
  if(viaInspection&&e.measureId&&e.measureId!==measureId&&!conflicting){
   warn('conflicting_evidence',e.id,
    'Referencia indirecta incompatible con la medida declarada.');
  }
 }
 const availablePrograms=programs.filter(p=>p.id===measure.programId);
 if(availablePrograms.length>1)warn('ambiguous_program',measure.programId,
  'Programa de medida con ID duplicado; vínculo no incorporado.');
 const program=availablePrograms.length===1?availablePrograms[0]:null;
 const countsResult={inspections:linkedInspections.length,findings:linkedFindings.length,
  actions:linkedActions.length,evidence:relatedEvidence.length};
 return {measure,program,inspections:linkedInspections,findings:linkedFindings,
  actions:linkedActions,evidence:relatedEvidence,warnings,counts:countsResult};
}
