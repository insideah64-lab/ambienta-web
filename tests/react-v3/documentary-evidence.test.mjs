import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {eligibleInspectionEvidence,parseRegisteredFingerprint,verifyExistingEvidence,matchesEvidenceContext}
 from '../../v3/overrides/src/features/maps/documentary-evidence.mjs';
const hash=createHash('sha256').update('muestra QA controlada').digest('hex');
const at='2026-11-01T12:00:00Z',point='a'.repeat(64),zone='b'.repeat(64);
const report={schema:'ambienta-point-zones-v1',provenance:{inputSha256:point,scenarioSha256:zone,
 scenarioCreatedAt:at,scenarioBbox:[-67.3,-24.8,-67.1,-24.6]}};
function proposals(){return {schema:'ambienta-documentary-proposals-v1',
 origin:{...report.provenance,scenarioBbox:[...report.provenance.scenarioBbox]},
 entries:[{recordId:'REG-1',recordType:'inspection',pointRef:'F1',
 status:'approved',zoneId:'B',evidenceSha256:hash,
 review:{reviewer:'QA'},sourceId:'SOURCE'}]};}
function data(){return {demo:true,revision:3,project:{id:'DIAB-2026-DEMO'},
 inspections:[{id:'INSP-1',measureId:'MED-1'}],
 evidence:[{id:'EVID-1',inspectionId:'INSP-1',measureId:'MED-1',
 reference:'sha256:'+hash+'|archivo:muestra-qa.txt|bytes:20',status:'pendiente'}]};}
const opts=(p=proposals(),d=data())=>({proposals:p,report,entryId:'REG-1',
 inspectionId:'INSP-1',evidenceId:'EVID-1',data:d,
 fingerprint:{sha256:hash,bytes:20},checkedAt:at});
test('match existing inspection, existing evidence, expected SHA and exact bytes',()=>{
 const p=proposals(),d=data();
 const match=verifyExistingEvidence(opts(p,d));
 assert.equal(match.status,'FILE_BYTES_MATCH_REGISTERED_FINGERPRINT');
 assert.equal(match.projectId,d.project.id);
 assert.equal(match.inspectionId,'INSP-1');
 assert.equal(match.evidenceId,'EVID-1');
 assert.equal(match.sourcePointSha256,point);
 assert(matchesEvidenceContext(match,p,report,d));
 assert.equal(p.entries[0].status,'approved');
 assert.equal(d.evidence[0].status,'pendiente');
 assert(!JSON.stringify(match).includes('muestra QA controlada'));
 assert.equal(eligibleInspectionEvidence(d,'INSP-1').length,1);
});
test('fail closed on missing or cross-related domain record',()=>{
 const d=data();d.evidence[0].inspectionId='INSP-OTHER';
 assert.throws(()=>verifyExistingEvidence(opts(proposals(),d)),/no referencia exactamente/);
 const other=data();other.inspections[0].measureId='MED-OTHER';
 assert.throws(()=>verifyExistingEvidence(opts(proposals(),other)),/no referencia exactamente/);
 assert.equal(eligibleInspectionEvidence(other,'INSP-1').length,0);
 const missing=data();missing.inspections=[];
 assert.throws(()=>verifyExistingEvidence(opts(proposals(),missing)),/inspección no existe/);
});
test('reject wrong bytes, forged SHA, declared mismatch and records without human review',()=>{
 assert.throws(()=>verifyExistingEvidence({...opts(),fingerprint:{sha256:hash,bytes:19}}),/NO coincide/);
 assert.throws(()=>verifyExistingEvidence({...opts(),fingerprint:{sha256:'f'.repeat(64),bytes:20}}),/NO coincide/);
 const p=proposals();p.entries[0].evidenceSha256='e'.repeat(64);
 assert.throws(()=>verifyExistingEvidence(opts(p)),/huella declarada/);
 const pending=proposals();pending.entries[0].status='awaiting_review';
 assert.throws(()=>verifyExistingEvidence(opts(pending)),/revisión espacial/);
 const monitoring=proposals();monitoring.entries[0].recordType='monitoring';
 assert.throws(()=>verifyExistingEvidence(opts(monitoring)),/revisión espacial/);
});
test('changes to source, domain revision and evidence state invalidate prior local match',()=>{
 const p=proposals(),d=data(),match=verifyExistingEvidence(opts(p,d));
 assert(!matchesEvidenceContext(match,p,report,{...d,revision:4}));
 const changed={...report,provenance:{...report.provenance,scenarioSha256:'c'.repeat(64)}};
 assert(!matchesEvidenceContext(match,p,changed,d));
 const changedStatus=data();changedStatus.evidence[0].status='validada';
 assert(!matchesEvidenceContext(match,p,report,changedStatus));
 const removed=data();removed.evidence=[];
 assert(!matchesEvidenceContext(match,p,report,removed));
});
test('parse existing fingerprint format without accepting overlarge, zero or malformed bytes',()=>{
 assert.deepEqual(parseRegisteredFingerprint(data().evidence[0].reference),{sha256:hash,name:'muestra-qa.txt',bytes:20});
 for(const b of [0,10485761,'foo'])assert.equal(parseRegisteredFingerprint('sha256:'+hash+'|archivo:x.pdf|bytes:'+b),null);
 assert.equal(parseRegisteredFingerprint('sha256:'+hash+'|archivo:x|bytes:20|extra'),null);
});
