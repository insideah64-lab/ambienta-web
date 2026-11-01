import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiablillosState} from '../../apps/web-v3/src/lib/diablillosDemo.mjs';
import {measureDocumentTrace} from '../../apps/web-v3/src/features/traceability/measure-document-trace.mjs';
test('Diablillos water measure: three explicitly linked evidences and one inspection; no unrelated findings',()=>{
 const data=createDiablillosState(),before=JSON.stringify(data);
 const g=measureDocumentTrace(data,'MED-DIAB-001');
 assert.deepEqual(g.counts,{inspections:1,findings:0,actions:0,evidence:3});
 assert.equal(g.inspections[0].id,'INSP-DIAB-001');
 assert.deepEqual(g.evidence.map(x=>x.record.id),['EVID-D-001','EVID-D-002','EVID-D-003']);
 assert(g.evidence.every(x=>x.via==='medida'));
 assert.deepEqual(g.warnings,[]);
 assert.equal(JSON.stringify(data),before,'The selector must not mutate a record');
});
test('Efluents measure preserves factual ID path inspection -> finding -> action',()=>{
 const g=measureDocumentTrace(createDiablillosState(),'MED-DIAB-002');
 assert.deepEqual(g.counts,{inspections:1,findings:1,actions:1,evidence:1});
 assert.equal(g.inspections[0].id,'INSP-DIAB-002');
 assert.equal(g.findings[0].inspectionId,g.inspections[0].id);
 assert.equal(g.actions[0].findingId,g.findings[0].id);
 assert.equal(g.evidence[0].record.id,'EVID-D-004');
});
test('Measures without inspections show their direct evidence, not fabricated visits',()=>{
 const data=createDiablillosState();
 for(const id of ['MED-DIAB-003','MED-DIAB-004']){
  const g=measureDocumentTrace(data,id);
  assert.deepEqual(g.counts,{inspections:0,findings:0,actions:0,evidence:1});
 }
 assert.equal(measureDocumentTrace(data,'INVALID'),null);
});
test('Evidence linked by inspection only is marked indirect; incompatible IDs quarantined',()=>{
 const d=createDiablillosState();
 d.evidence.push({...d.evidence[0],id:'EVID-INDIRECT',measureId:null,inspectionId:'INSP-DIAB-001'});
 d.evidence.push({...d.evidence[0],id:'EVID-CONFLICT',measureId:'MED-DIAB-002',inspectionId:'INSP-DIAB-001'});
 const a=measureDocumentTrace(d,'MED-DIAB-001');
 assert(a.evidence.some(x=>x.record.id==='EVID-INDIRECT'&&x.via==='inspeccion'));
 assert(!a.evidence.some(x=>x.record.id==='EVID-CONFLICT'));
 assert(a.warnings.some(w=>w.id==='EVID-CONFLICT'&&w.kind==='conflicting_evidence'));
 const b=measureDocumentTrace(d,'MED-DIAB-002');
 assert(!b.evidence.some(x=>x.record.id==='EVID-CONFLICT'));
 assert(b.warnings.some(w=>w.id==='EVID-CONFLICT'));
});
test('Broken inspection reference is flagged without inventing a linked inspection',()=>{
 const d=createDiablillosState();
 d.evidence.push({...d.evidence[0],id:'EVID-ORPHAN',inspectionId:'INSP-UNKNOWN'});
 const g=measureDocumentTrace(d,'MED-DIAB-001');
 assert.equal(g.inspections.length,1);
 assert(g.evidence.some(x=>x.record.id==='EVID-ORPHAN'&&x.via==='medida'));
 assert(g.warnings.some(w=>w.id==='EVID-ORPHAN'&&w.kind==='unresolved_inspection'));
});
test('Changing source statuses updates trace without reclassifying environmental harm',()=>{
 const d=createDiablillosState();const g1=measureDocumentTrace(d,'MED-DIAB-002');
 assert.equal(g1.findings[0].status,'abierto');
 d.findings[0].status='cerrado';
 const g2=measureDocumentTrace(d,'MED-DIAB-002');
 assert.equal(g2.findings[0].status,'cerrado');
 assert.equal(g2.counts.findings,1,'Closed findings remain historically linked');
});
