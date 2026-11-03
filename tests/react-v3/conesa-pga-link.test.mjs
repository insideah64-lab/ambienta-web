import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiablillosState} from '../../apps/web-v3/src/lib/diablillosDemo.mjs';
import {resolveConesaPgaLink,uniquePgaMeasures} from '../../apps/web-v3/src/features/impacts/conesa-pga-link.mjs';

test('Conesa resolves an explicit PGA measure by unique ID, without modifying the source',()=>{
 const d=createDiablillosState(),snapshot=JSON.stringify(d);
 const r=resolveConesaPgaLink(d,d.project.id,'MED-DIAB-001');
 assert.equal(r.status,'vinculado');
 assert.equal(r.measure.id,'MED-DIAB-001');
 assert.equal(r.trace.counts.inspections,1);
 assert.equal(r.trace.counts.evidence,3);
 assert.equal(JSON.stringify(d),snapshot);
 assert.equal(r.warnings.length,0);
});
test('No automatic selection by title; missing and cross-project links are rejected',()=>{
 const d=createDiablillosState();
 assert.equal(resolveConesaPgaLink(d,d.project.id,'').status,'sin-vinculo');
 assert.equal(resolveConesaPgaLink(d,d.project.id,d.measures[0].title).status,'no-encontrado');
 assert.equal(resolveConesaPgaLink(d,'OTHER',d.measures[0].id).status,'proyecto-distinto');
 assert.equal(uniquePgaMeasures(d,'OTHER').length,0);
});
test('Duplicate IDs are not exposed or resolved; no first-match fallback',()=>{
 const d=createDiablillosState();
 d.measures.push({...d.measures[0]});
 const id=d.measures[0].id;
 const r=resolveConesaPgaLink(d,d.project.id,id);
 assert.equal(r.status,'ambiguo');
 assert.equal(r.measure,null);
 assert(!uniquePgaMeasures(d,d.project.id).some(m=>m.id===id));
});
test('Inspection/evidence inconsistencies surface as warnings; no compliance inference',()=>{
 const d=createDiablillosState();
 d.evidence.push({...d.evidence[0],id:'EVID-D-CONFLICT',
   measureId:'MED-DIAB-002',inspectionId:'INSP-DIAB-001'});
 const r=resolveConesaPgaLink(d,d.project.id,'MED-DIAB-001');
 assert.equal(r.status,'vinculado');
 assert(r.warnings.some(w=>w.includes('EVID-D-CONFLICT')));
 assert(!r.trace.evidence.some(e=>e.record.id==='EVID-D-CONFLICT'));
});
