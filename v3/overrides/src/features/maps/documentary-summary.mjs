// AMBIENTA V3.6 — read-only bounded summary validation (not original evidence).
const HEX=/^[0-9a-f]{64}$/;
const statuses=new Set(['awaiting_review','needs_metadata','needs_spatial_review','approved','rejected']);
const types=new Set(['monitoring','inspection']);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validText=x=>typeof x==='string'&&x.length>0&&x.length<=500;
export function validateDocumentSummary(raw,scenario,caseId){
 if(!object(raw)||raw.schema!=='ambienta-documentary-summary-v1'||
 raw.status!=='LOCAL_QA_NOT_CERTIFIED'||raw.projectCase!==caseId||
 !validText(raw.savedAt)||!object(raw.origin)||!HEX.test(raw.origin.inputSha256||'')||
 !HEX.test(raw.origin.scenarioSha256||'')||
 !Array.isArray(raw.origin.scenarioBbox)||raw.origin.scenarioBbox.length!==4||
 !Array.isArray(raw.records)||raw.records.length>1000)return {status:'blocked',summary:null};
 if(!scenario||raw.origin.scenarioSha256!==scenario.sourceHash||
 raw.origin.scenarioCreatedAt!==scenario.createdAt||
 JSON.stringify(raw.origin.scenarioBbox)!==JSON.stringify(scenario.bbox))
  return {status:'stale',summary:null};
 const ids=new Set();
 for(const r of raw.records){
  if(!object(r)||!validText(r.recordId)||ids.has(r.recordId)||!validText(r.pointRef)||
   !types.has(r.recordType)||!statuses.has(r.status)||
   (r.zoneId!==null&&!['A','B','C','D'].includes(r.zoneId))||
   (r.status.startsWith('needs_')&&r.zoneId!==null)||
   (['approved','rejected'].includes(r.status)&&
    (!object(r.review)||!validText(r.review.reviewer)||!validText(r.review.reason)||
     !validText(r.review.reviewedAt)||!['approve','reject'].includes(r.review.decision)))||
   (r.status==='approved'&&(!r.zoneId||r.review?.decision!=='approve'))||
   (r.status==='rejected'&&r.review?.decision!=='reject'))return {status:'blocked',summary:null};
  ids.add(r.recordId);
 }
 return {status:'ready',summary:raw};
}
export function countDocumentStatuses(s){
 const rows=s?.records||[];
 return {total:rows.length,approved:rows.filter(x=>x.status==='approved').length,
  pending:rows.filter(x=>x.status==='awaiting_review').length,
  blocked:rows.filter(x=>x.status.startsWith('needs_')).length,
  rejected:rows.filter(x=>x.status==='rejected').length};
}
