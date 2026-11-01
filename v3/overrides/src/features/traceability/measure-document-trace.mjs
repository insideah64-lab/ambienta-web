/**
 * AMBIENTA V3.6.0 — Pure, read-only document trace selector.
 * Links by explicit IDs only. Transitive paths are labelled, never inferred
 * from descriptions, dates or matching titles. A conflict is NOT a valid link.
 * No statuses imply legal/environmental compliance.
 */
export function measureDocumentTrace(state,measureId){
 const measures=state?.measures??[];
 const measure=measures.find(m=>m.id===measureId);
 if(!measure)return null;
 const inspections=state?.inspections??[];
 const findings=state?.findings??[];
 const actions=state?.correctiveActions??[];
 const evidences=state?.evidence??[];
 const knownInspections=new Map(inspections.map(i=>[i.id,i]));
 const knownFindings=new Map(findings.map(f=>[f.id,f]));
 const linkedInspections=inspections.filter(i=>i.measureId===measureId);
 const inspectionIds=new Set(linkedInspections.map(i=>i.id));
 const linkedFindings=findings.filter(f=>inspectionIds.has(f.inspectionId));
 const findingIds=new Set(linkedFindings.map(f=>f.id));
 const linkedActions=actions.filter(a=>findingIds.has(a.findingId));
 const warnings=[];
 const relatedEvidence=[];
 for(const e of evidences){
  const direct=e.measureId===measureId;
  const inspectionRef=e.inspectionId?knownInspections.get(e.inspectionId):null;
  const viaInspection=Boolean(e.inspectionId&&inspectionIds.has(e.inspectionId));
  const conflicting=Boolean(e.measureId&&inspectionRef&&inspectionRef.measureId!==e.measureId);
  if((direct||viaInspection)&&conflicting){
   warnings.push({kind:'conflicting_evidence',id:e.id,
    message:'Evidencia con medida e inspección de medidas diferentes; vínculo no incorporado.'});
   continue;
  }
  if(direct&&e.inspectionId&&!inspectionRef){
   warnings.push({kind:'unresolved_inspection',id:e.id,
    message:'La evidencia referencia una inspección inexistente; revisar procedencia.'});
  }
  if(direct||(!e.measureId&&viaInspection)){
   relatedEvidence.push({record:e,via:direct?'medida':'inspeccion'});
  }
  // If the inspection points here but a different measure is declared, it is
  // incompatible even if the other measure does not exist.
  if(viaInspection&&e.measureId&&e.measureId!==measureId&&!conflicting){
   warnings.push({kind:'conflicting_evidence',id:e.id,
    message:'Referencia indirecta incompatible con la medida declarada.'});
  }
 }
 for(const f of linkedFindings){
  if(!knownInspections.has(f.inspectionId)){
   warnings.push({kind:'unresolved_finding',id:f.id,
    message:'Referencia de inspección faltante.'});
  }
 }
 for(const a of linkedActions){
  if(!knownFindings.has(a.findingId)){
   warnings.push({kind:'unresolved_action',id:a.id,
    message:'Referencia de hallazgo faltante.'});
  }
 }
 return {
  measure,
  program:(state.programs??[]).find(p=>p.id===measure.programId)??null,
  inspections:linkedInspections,
  findings:linkedFindings,
  actions:linkedActions,
  evidence:relatedEvidence,
  warnings,
  counts:{inspections:linkedInspections.length,findings:linkedFindings.length,
   actions:linkedActions.length,evidence:relatedEvidence.length}
 };
}
