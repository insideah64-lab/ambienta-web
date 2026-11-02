import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiablillosState} from '../../apps/web-v3/src/lib/diablillosDemo.mjs';
import {prepareDocumentGraphExport,canonicalGraphJson,sha256Text} from '../../apps/web-v3/src/features/traceability/document-graph-export.mjs';
import {inspectDocumentGraphImport,MAX_GRAPH_IMPORT_BYTES} from '../../apps/web-v3/src/features/traceability/document-graph-import.mjs';
const base=createDiablillosState();
const snap=async (s=base,m='MED-DIAB-002')=>(await prepareDocumentGraphExport(s,m)).json;
const inspect=async(json,st=base,m='MED-DIAB-002')=>inspectDocumentGraphImport(json,st,m);
test('valid export with matching source is read-only and identical',async()=>{
 const before=JSON.stringify(base);
 const x=await inspect(await snap());
 assert.equal(x.status,'identical');assert.equal(x.code,'matching_snapshot');
 assert.equal(x.checksumVerified,true);assert.equal(x.comparable,true);
 assert.equal(x.imported.nodes,6);assert.equal(x.imported.edges,6);
 assert.equal(x.changes.changedNodes,0);assert.deepEqual(x.details,[]);
 assert.equal(JSON.stringify(base),before);
});
test('edited JSON with original hash is invalid and must not be compared',async()=>{
 const x=JSON.parse(await snap());
 x.nodes.find(n=>n.kind==='evidence').data.status='validada';
 const report=await inspect(JSON.stringify(x));
 assert.equal(report.code,'checksum_mismatch');assert.equal(report.comparable,false);
 assert.equal(report.checksumVerified,false);
});
test('independently rehashed changed export is valid integrity, but different documentary content',async()=>{
 const past=createDiablillosState();
 past.evidence[3].status='validada';
 const x=await inspect(await snap(past));
 assert.equal(x.status,'different');assert.equal(x.checksumVerified,true);
 assert.equal(x.changes.changedNodes,1);assert.equal(x.changes.addedEdges,0);
 assert(x.details.some(d=>d.id==='evidence:EVID-D-004'&&d.fields.includes('status')));
});
test('current new finding/addition is reported rather than imported',async()=>{
 const earlier=await snap();
 const current=createDiablillosState();
 current.findings.push({...current.findings[0],id:'HALL-D-002'});
 const x=await inspect(earlier,current);
 assert.equal(x.status,'different');assert.equal(x.changes.addedNodes,1);
 assert(x.details.some(d=>d.id==='finding:HALL-D-002'&&d.kind==='added'));
});
test('foreign project with valid SHA is not mixed with current case',async()=>{
 const other=createDiablillosState();other.project.id='OTHER-DEMO';
 const x=await inspect(await snap(other));
 assert.equal(x.code,'foreign_project');assert.equal(x.checksumVerified,true);
 assert.equal(x.comparable,false);
});
test('correct SHA for another measure is still rejected for current selection',async()=>{
 const x=await inspect(await snap(base,'MED-DIAB-001'));
 assert.equal(x.code,'different_measure');assert.equal(x.checksumVerified,true);
});
test('invalid, very large and pathological JSON fail without throwing',async()=>{
 assert.equal((await inspect('{')).code,'parse_error');
 assert.equal((await inspect(' ')).code,'parse_error');
 assert.equal((await inspect(' '.repeat(MAX_GRAPH_IMPORT_BYTES+1))).code,'too_large');
 assert.equal((await inspect(JSON.stringify({schema:'wrong'}))).code,'invalid_schema');
 let deep={value:true};for(let i=0;i<30;i++)deep={nest:deep};
 assert.equal((await inspect(JSON.stringify(deep))).code,'invalid_schema');
});
test('duplicate node IDs and missing endpoints never become accepted as relations',async()=>{
 const orig=JSON.parse(await snap());
 orig.nodes.push({...orig.nodes[0]});orig.nodeCount++;
 assert.equal((await inspect(JSON.stringify(orig))).code,'invalid_schema');
 const noEndpoint=JSON.parse(await snap());
 noEndpoint.edges[0].to='measure:NO-EXISTE';
 assert.equal((await inspect(JSON.stringify(noEndpoint))).code,'invalid_schema');
});
test('no fake success when integrity metadata itself is missing or malformed',async()=>{
 const x=JSON.parse(await snap());delete x.integrity;
 assert.equal((await inspect(JSON.stringify(x))).code,'invalid_schema');
 const y=JSON.parse(await snap());y.source.externalSourcesIndependentlyVerified=true;
 assert.equal((await inspect(JSON.stringify(y))).code,'invalid_schema');
});
test('changed excluded link and warnings are diffed without trusting file authority',async()=>{
 const st=createDiablillosState();
 st.evidence.push({...st.evidence[0],id:'EVID-INVALID',measureId:'MED-DIAB-002',inspectionId:'INSP-DIAB-001'});
 const imported=await snap(st);
 const r=await inspect(imported);
 assert.equal(r.status,'different');
 assert.equal(r.changes.warningsChanged,true);
});
test('export graph integrity checksum is canonical, not a SHA of supporting documents',async()=>{
 const x=JSON.parse(await snap());
 const {integrity,...graph}=x;
 assert.equal(await sha256Text(canonicalGraphJson(graph)),integrity.graph_sha256);
 assert.equal(x.source.evidenceFilesIncluded,false);
});
