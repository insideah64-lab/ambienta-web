import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiablillosState} from '../../apps/web-v3/src/lib/diablillosDemo.mjs';
import {resolveRecordFocus} from '../../apps/web-v3/src/features/traceability/record-focus.mjs';
import {measureDocumentTrace} from '../../apps/web-v3/src/features/traceability/measure-document-trace.mjs';
import {buildDocumentGraph,prepareDocumentGraphExport} from '../../apps/web-v3/src/features/traceability/document-graph-export.mjs';
import {auditDocumentLinks} from '../../apps/web-v3/src/features/traceability/document-link-audit.mjs';

test('fixture Diablillos preserves previously approved trace and four independent record routes',()=>{
 const data=createDiablillosState(),snapshot=JSON.stringify(data);
 assert.deepEqual(measureDocumentTrace(data,'MED-DIAB-002').counts,
  {inspections:1,findings:1,actions:1,evidence:1});
 for(const [kind,id] of [['inspection','INSP-DIAB-002'],['evidence','EVID-D-004'],
  ['finding','HALL-D-001'],['action','AC-D-001']]){
  const result=resolveRecordFocus(data,kind,id);
  assert.equal(result.id,id);
  assert.equal(result.ambiguous,undefined);
  assert(result.relations.length>0);
 }
 assert.equal(JSON.stringify(data),snapshot);
});
test('duplicate source evidence is never represented as an arbitrary first record',()=>{
 const data=createDiablillosState();
 data.evidence.push({...data.evidence[3],reference:'SIMULADO://segundo-distinto'});
 const before=JSON.stringify(data);
 const selected=resolveRecordFocus(data,'evidence','EVID-D-004');
 assert.equal(selected.ambiguous,true);
 assert.equal(selected.occurrences,2);
 assert.equal(selected.record,null);
 assert.deepEqual(selected.relations,[]);
 const trace=measureDocumentTrace(data,'MED-DIAB-002');
 assert.equal(trace.counts.evidence,0);
 assert(trace.warnings.some(x=>x.kind==='ambiguous_evidence'));
 const graph=buildDocumentGraph(data,'MED-DIAB-002');
 assert(!graph.nodes.some(x=>x.key==='evidence:EVID-D-004'));
 assert.equal(JSON.stringify(data),before);
});
test('duplicate inspection target blocks both direct and transitive selection',()=>{
 const data=createDiablillosState();
 data.inspections.push({...data.inspections[1],measureId:'MED-DIAB-001'});
 const before=JSON.stringify(data);
 const e=resolveRecordFocus(data,'evidence','EVID-D-004');
 assert(!e.relations.some(x=>x.kind==='inspection'));
 assert(e.warnings.some(x=>/ambiguo|mismo ID/i.test(x)));
 const f=resolveRecordFocus(data,'finding','HALL-D-001');
 assert.deepEqual(f.relations,[]);
 assert(f.warnings.some(x=>/mismo ID/i.test(x)));
 const t=measureDocumentTrace(data,'MED-DIAB-002');
 assert.equal(t.counts.inspections,0);
 assert.equal(t.counts.findings,0);
 assert.equal(t.counts.actions,0);
 assert(t.warnings.some(x=>x.kind==='ambiguous_inspection'));
 assert.equal(JSON.stringify(data),before);
});
test('duplicate measure ID prevents graph export and prevents inspection backlink',async()=>{
 const data=createDiablillosState();
 data.measures.push({...data.measures[1],title:'DEMO segundo homónimo'});
 const before=JSON.stringify(data);
 assert.equal(measureDocumentTrace(data,'MED-DIAB-002'),null);
 assert.equal(buildDocumentGraph(data,'MED-DIAB-002'),null);
 assert.equal(await prepareDocumentGraphExport(data,'MED-DIAB-002'),null);
 const inspection=resolveRecordFocus(data,'inspection','INSP-DIAB-002');
 assert.deepEqual(inspection.relations,[]);
 assert(inspection.warnings.some(x=>/mismo ID/i.test(x)));
 assert.equal(JSON.stringify(data),before);
});
test('duplicate finding and action IDs exclude ambiguous transitive records',()=>{
 const data=createDiablillosState();
 data.findings.push({...data.findings[0],title:'Repetido'});
 data.correctiveActions.push({...data.correctiveActions[0],action:'Repetida'});
 const t=measureDocumentTrace(data,'MED-DIAB-002');
 assert.equal(t.counts.inspections,1);
 assert.equal(t.counts.findings,0);
 assert.equal(t.counts.actions,0);
 assert(t.warnings.some(x=>x.kind==='ambiguous_finding'));
 assert.equal(resolveRecordFocus(data,'finding','HALL-D-001').ambiguous,true);
 assert.equal(resolveRecordFocus(data,'action','AC-D-001').ambiguous,true);
});
test('orphan reference retains warning; does not synthesize missing inspection',()=>{
 const data=createDiablillosState();
 data.evidence[3].inspectionId='INSP-ORFANA';
 const t=measureDocumentTrace(data,'MED-DIAB-002');
 assert.equal(t.counts.evidence,1);
 assert(t.warnings.some(x=>x.kind==='unresolved_inspection'));
 const f=resolveRecordFocus(data,'evidence','EVID-D-004');
 assert(!f.relations.some(x=>x.kind==='inspection'));
 assert(f.warnings.some(x=>/no existe/i.test(x)));
});
test('duplicate programs excluded and surfaced as documentary ambiguity',()=>{
 const data=createDiablillosState();
 data.programs.push({...data.programs[1]});
 const t=measureDocumentTrace(data,'MED-DIAB-002');
 assert.equal(t.program,null);
 assert(t.warnings.some(x=>x.kind==='ambiguous_program'));
 const graph=buildDocumentGraph(data,'MED-DIAB-002');
 assert(!graph.nodes.some(x=>x.kind==='program'));
});
test('original case-wide audit does not provide misleading navigation when source is duplicated',()=>{
 const data=createDiablillosState();data.evidence.push({...data.evidence[3]});
 const report=auditDocumentLinks(data);
 assert(report.issues.some(x=>x.code==='duplicate_id'&&x.id==='EVID-D-004'));
 assert(report.issues.filter(x=>x.id==='EVID-D-004').every(x=>x.url===null));
 assert.match(report.disclaimer,/cumplimiento ambiental/);
});
