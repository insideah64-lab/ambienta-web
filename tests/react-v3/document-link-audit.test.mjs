import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiablillosState} from '../../apps/web-v3/src/lib/diablillosDemo.mjs';
import {auditDocumentLinks} from '../../apps/web-v3/src/features/traceability/document-link-audit.mjs';
const fixture=()=>createDiablillosState();
test('Diablillos baseline has connected declared IDs; pending states are not failures',()=>{
 const s=fixture(),before=JSON.stringify(s);
 const a=auditDocumentLinks(s);
 assert.equal(a.total,0);assert.equal(a.checked,18);
 assert.equal(JSON.stringify(s),before);
 assert.match(a.disclaimer,/no implica/i);
});
test('orphan inspection, finding, action and measure are detected without fake links',()=>{
 const s=fixture();
 s.measures[0].programId='PG-NO-EXISTE';
 s.inspections[0].measureId='MED-NO-EXISTE';
 s.findings[0].inspectionId='INSP-NO-EXISTE';
 s.correctiveActions[0].findingId='HALL-NO-EXISTE';
 const issues=auditDocumentLinks(s).issues;
 assert.equal(issues.filter(i=>i.code==='missing_target').length,4);
 assert(issues.some(i=>i.kind==='finding'&&i.url==='/auditorias?hallazgo=HALL-D-001'));
 assert(!issues.some(i=>i.message.includes('infracción')));
});
test('conflicting and missing evidence references are distinguished',()=>{
 const s=fixture();
 s.evidence[3].measureId='MED-DIAB-003';
 s.evidence[4].inspectionId='INSP-NO-EXISTE';
 s.evidence[5].measureId=null;
 const issues=auditDocumentLinks(s).issues;
 assert(issues.some(i=>i.id==='EVID-D-004'&&i.code==='conflicting_reference'));
 assert(issues.some(i=>i.id==='EVID-D-005'&&i.code==='missing_target'));
 assert(issues.some(i=>i.id==='EVID-D-006'&&i.code==='unlinked_evidence'));
});
test('duplicate IDs block ambiguous targets; never fabricate deep links',()=>{
 const s=fixture();
 s.inspections.push({...s.inspections[1]});
 const issues=auditDocumentLinks(s).issues;
 assert(issues.some(i=>i.id==='INSP-DIAB-002'&&i.code==='duplicate_id'&&i.url===null));
 assert(issues.some(i=>i.id==='EVID-D-004'&&i.code==='ambiguous_target'));
 assert(issues.some(i=>i.id==='HALL-D-001'&&i.code==='ambiguous_target'));
});
test('indirect evidence through valid inspection is not marked orphan',()=>{
 const s=fixture();
 s.evidence[3].measureId=null;
 assert.equal(auditDocumentLinks(s).total,0);
});
test('incomplete inputs remain pure and only report document reference issues',()=>{
 const x={measures:[{id:'M-1'}],evidence:[{id:'E-1',measureId:'M-1'}]};
 const before=JSON.stringify(x);
 const audit=auditDocumentLinks(x);
 assert.equal(audit.checked,2);
 assert(audit.issues.some(i=>i.kind==='measure'&&i.code==='missing_reference'));
 assert.equal(JSON.stringify(x),before);
});

test('duplicated evidence source never deep-links to the first arbitrary duplicate',()=>{
 const s=fixture();
 s.evidence.push({...s.evidence[3],reference:'SIMULADO://otro'});
 s.evidence[3].inspectionId='INSP-MISSING';
 const issues=auditDocumentLinks(s).issues.filter(x=>x.id==='EVID-D-004');
 assert(issues.some(x=>x.code==='duplicate_id'));
 assert(issues.some(x=>x.code==='missing_target'));
 assert(issues.every(x=>x.url===null));
});
test('unique source with a missing target keeps a safe link to its own record',()=>{
 const s=fixture();s.findings[0].inspectionId='INSP-NO';
 const issues=auditDocumentLinks(s).issues.filter(x=>x.id==='HALL-D-001');
 assert.equal(issues.length,1);
 assert.equal(issues[0].url,'/auditorias?hallazgo=HALL-D-001');
});
