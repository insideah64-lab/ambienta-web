// AMBIENTA V3.6 — auditable proposals, never automatic documentary links.
// Pure local model. A spatial coincidence is not environmental compliance.
const SHA=/^[a-f0-9]{64}$/;
const iso=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&s.length<=40;
const nonempty=s=>typeof s==='string'&&s.trim().length>0&&s.length<=500;
const fail=s=>{throw Error('V3.6: '+s);};
export const DOCUMENT_STATES=Object.freeze(['needs_metadata','needs_spatial_review','awaiting_review','approved','rejected']);
function context(report){
 if(report?.schema!=='ambienta-point-zones-v1'||!SHA.test(report.provenance?.inputSha256||'')||
 !SHA.test(report.provenance?.scenarioSha256||'')||!Array.isArray(report.points))
  fail('informe espacial original inválido');
 return {inputSha256:report.provenance.inputSha256,scenarioSha256:report.provenance.scenarioSha256,
 scenarioCreatedAt:report.provenance.scenarioCreatedAt,scenarioBbox:[...(report.provenance.scenarioBbox||[])]};
}
function metadata(record){
 if(!record||!nonempty(record.id)||!nonempty(record.pointRef)||!nonempty(record.recordType)||
 !['monitoring','inspection'].includes(record.recordType))return false;
 if(!nonempty(record.observedAt)||!iso(record.observedAt)||!nonempty(record.method)||
 !nonempty(record.sourceUri)||!nonempty(record.sourceId)||!nonempty(record.accuracyMethod)||
 typeof record.accuracyMeters!=='number'||!Number.isFinite(record.accuracyMeters)||
 record.accuracyMeters<0||record.accuracyMeters>100000||!SHA.test(record.evidenceSha256||''))
 return false;
 return true;
}
export function proposeDocumentLinks(report,records,createdAt){
 const origin=context(report);
 if(!Array.isArray(records)||records.length>1000||!iso(createdAt))
  fail('registros o fecha inválidos');
 const points=new Map(report.points.map(p=>[p.ref,p]));
 if(points.size!==report.points.length)fail('referencias puntuales duplicadas');
 const ids=new Set();
 const entries=records.map(record=>{
  if(!nonempty(record?.id)||ids.has(record.id))fail('ID documental ausente o duplicado');
  ids.add(record.id);
  const point=points.get(record.pointRef);
  const status=!point?'needs_spatial_review':!metadata(record)?'needs_metadata':
    point.status!=='inside_zone'?'needs_spatial_review':'awaiting_review';
  return {recordId:record.id,recordType:record.recordType||null,pointRef:record.pointRef||null,
   zoneId:status==='awaiting_review'?point.zoneId:null,spatialStatus:point?.status||'missing_point',
   status,metadataComplete:metadata(record),sourceId:record.sourceId||null,
   evidenceSha256:record.evidenceSha256||null,review:null};
 });
 return {schema:'ambienta-documentary-proposals-v1',status:'LOCAL_PROPOSALS_NOT_CERTIFIED',
  createdAt,origin,entries,disclaimer:'Coincidencia espacial no implica medición auténtica, impacto, cumplimiento ni habilitación.'};
}
export function matchesDocumentContext(proposals,report){
 try{
  const a=proposals?.origin,b=context(report);
  return proposals?.schema==='ambienta-documentary-proposals-v1'&&
   a.inputSha256===b.inputSha256&&a.scenarioSha256===b.scenarioSha256&&
   a.scenarioCreatedAt===b.scenarioCreatedAt&&
   JSON.stringify(a.scenarioBbox)===JSON.stringify(b.scenarioBbox);
 }catch{return false;}
}
export function reviewDocumentLink(proposals,report,recordId,decision,reviewer,reason,reviewedAt){
 if(!matchesDocumentContext(proposals,report))fail('escenario o capa cambiados; recalcular');
 if(!['approve','reject'].includes(decision)||!nonempty(reviewer)||!nonempty(reason)||!iso(reviewedAt))
  fail('revisión humana incompleta');
 const idx=proposals.entries.findIndex(x=>x.recordId===recordId);
 if(idx<0)fail('registro inexistente');
 const entry=proposals.entries[idx];
 if(entry.status!=='awaiting_review')fail('solo se revisan propuestas completas y pendientes');
 const next=structuredClone(proposals);
 next.entries[idx].status=decision==='approve'?'approved':'rejected';
 next.entries[idx].review={decision,reviewer,reason,reviewedAt};
 return next;
}
export function exportDocumentReview(proposals,report){
 if(!matchesDocumentContext(proposals,report))fail('procedencia obsoleta');
 return { ...structuredClone(proposals),exportedAs:'derived_review_only',
  limitation:'No altera expediente, evidencia original o estado de cumplimiento.'};
}
