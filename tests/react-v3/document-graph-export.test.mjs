import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiablillosState} from '../../apps/web-v3/src/lib/diablillosDemo.mjs';
import {buildDocumentGraph,prepareDocumentGraphExport,verifyDocumentGraphExport,
 canonicalGraphJson,GRAPH_SCHEMA} from '../../apps/web-v3/src/features/traceability/document-graph-export.mjs';

test('Diablillos efluents graph encodes six ID-backed records and six explicit edges',()=>{
 const source=createDiablillosState(),original=JSON.stringify(source);
 const graph=buildDocumentGraph(source,'MED-DIAB-002');
 assert.equal(graph.schema,GRAPH_SCHEMA);assert.equal(graph.source.caseDemo,true);
 assert.equal(graph.source.projectId,'DIAB-2026-DEMO');
 assert.equal(graph.nodeCount,6);assert.equal(graph.edgeCount,6);
 assert.deepEqual(graph.nodes.map(n=>n.key).sort(),[
  'action:AC-D-001','evidence:EVID-D-004','finding:HALL-D-001',
  'inspection:INSP-DIAB-002','measure:MED-DIAB-002','program:PG-D-EFL'].sort());
 assert(graph.edges.every(x=>x.kind==='direct'));
 assert(graph.edges.some(x=>x.from==='action:AC-D-001'&&x.to==='finding:HALL-D-001'&&x.referenceField==='action.findingId'));
 assert(graph.edges.some(x=>x.from==='evidence:EVID-D-004'&&x.to==='inspection:INSP-DIAB-002'));
 assert.deepEqual(graph.excludedLinks,[]);assert.deepEqual(graph.warnings,[]);
 assert.equal(JSON.stringify(source),original,'Read-only projection must not mutate the case');
});
test('Water graph has one inspection, three evidence references, eight explicit edges',()=>{
 const x=buildDocumentGraph(createDiablillosState(),'MED-DIAB-001');
 assert.equal(x.nodeCount,6);assert.equal(x.edgeCount,8);
 assert.equal(x.nodes.filter(n=>n.kind==='evidence').length,3);
 assert.equal(x.edges.filter(e=>e.referenceField==='evidence.measureId').length,3);
});
test('Indirect-only evidence uses precise path and never claims direct measureId',()=>{
 const state=createDiablillosState();
 state.evidence.push({...state.evidence[0],id:'EVID-INDIRECT',measureId:null,inspectionId:'INSP-DIAB-001'});
 const x=buildDocumentGraph(state,'MED-DIAB-001');
 assert(x.edges.some(e=>e.from==='evidence:EVID-INDIRECT'&&e.to==='measure:MED-DIAB-001'
  &&e.kind==='indirect'&&e.via[0]==='INSP-DIAB-001'));
 assert(!x.edges.some(e=>e.from==='evidence:EVID-INDIRECT'&&e.referenceField==='evidence.measureId'));
});
test('Contradictory evidence is quarantined from nodes/edges; warning exported',()=>{
 const state=createDiablillosState();
 state.evidence.push({...state.evidence[0],id:'EVID-CONFLICT',
  measureId:'MED-DIAB-002',inspectionId:'INSP-DIAB-001'});
 const x=buildDocumentGraph(state,'MED-DIAB-002');
 assert(!x.nodes.some(n=>n.id==='EVID-CONFLICT'));
 assert(!x.edges.some(e=>e.from==='evidence:EVID-CONFLICT'));
 assert(x.warnings.some(w=>w.id==='EVID-CONFLICT'&&w.kind==='conflicting_evidence'));
 assert(x.excludedLinks.some(w=>w.id==='EVID-CONFLICT'));
});
test('An unknown inspection is warned without adding a synthetic node or edge',()=>{
 const state=createDiablillosState();
 state.evidence[3].inspectionId='INSP-MISSING';
 const x=buildDocumentGraph(state,'MED-DIAB-002');
 assert(x.warnings.some(w=>w.kind==='unresolved_inspection'&&w.id==='EVID-D-004'));
 assert(!x.edges.some(e=>e.to==='inspection:INSP-MISSING'));
 assert.equal(x.nodeCount,6);
 assert.equal(x.edgeCount,5);
});
test('SHA-256 verifies the exact canonical graph and detects any tampering',async()=>{
 const source=createDiablillosState();
 const snap=JSON.stringify(source);
 const first=await prepareDocumentGraphExport(source,'MED-DIAB-002');
 const second=await prepareDocumentGraphExport(source,'MED-DIAB-002');
 assert(first.filename.endsWith('MED-DIAB-002.json'));
 assert.equal(first.json,second.json,'stable export without synthetic observation timestamp');
 assert.match(first.data.integrity.graph_sha256,/^[0-9a-f]{64}$/);
 assert.equal(await verifyDocumentGraphExport(first.data),true);
 const changed=JSON.parse(first.json);
 changed.nodes.find(n=>n.kind==='evidence').data.status='validada';
 assert.equal(await verifyDocumentGraphExport(changed),false);
 const changedEdge=JSON.parse(first.json);
 changedEdge.edges[0].kind='indirect';
 assert.equal(await verifyDocumentGraphExport(changedEdge),false);
 assert.equal(await verifyDocumentGraphExport({...first.data,integrity:{...first.data.integrity,graph_sha256:'0'}}),false);
 assert.equal(JSON.stringify(source),snap,'Export must never alter local demo state');
});
test('Missing measure produces no downloadable graph or invented record',async()=>{
 assert.equal(buildDocumentGraph(createDiablillosState(),'INVALID'),null);
 assert.equal(await prepareDocumentGraphExport(createDiablillosState(),'INVALID'),null);
});
