import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeWork} from '../../apps/web-v3/src/features/dashboard/work-priorities.mjs';
import {createDiablillosState} from '../../apps/web-v3/src/lib/diablillosDemo.mjs';
test('Diablillos priorities are derived exclusively from document states, not environmental hazards',()=>{
 const data=createDiablillosState(),original=JSON.stringify(data);
 const w=summarizeWork(data);
 assert.equal(w.followUp,2); // one open finding plus one open corrective action
 assert.equal(w.review,4); // one measure plus three evidence records
 assert.equal(w.all,6);assert.equal(w.noPending,false);
 assert.deepEqual(w.groups.map(g=>g.key),['findings','corrective','measures','evidence']);
 assert.deepEqual(w.groups.map(g=>g.path),['/auditorias','/auditorias','/pga','/evidencias']);
 assert(w.groups.every(g=>!g.caption.toLowerCase().includes('incumplimiento verificado')));
 assert.equal(JSON.stringify(data),original,'Selectors must never mutate stored domain');
});
test('changes to document statuses invalidate priority counts without synthetic severity',()=>{
 const data=createDiablillosState();
 data.findings[0].status='cerrado';
 data.correctiveActions[0].status='cerrada';
 data.measures[1].status='verificada';
 data.evidence.forEach(e=>e.status='validada');
 let w=summarizeWork(data);
 assert.equal(w.all,0);assert.equal(w.followUp,0);assert.equal(w.review,0);
 assert.equal(w.noPending,true);
 data.inspections[0].result='pendiente';
 w=summarizeWork(data);
 assert.equal(w.all,1);assert.equal(w.review,1);
 assert.equal(w.groups[0].key,'inspections');
 assert.equal(w.groups[0].path,'/monitoreo');
});
test('empty or partially absent collections do not invent pending tasks',()=>{
 const w=summarizeWork({});
 assert.equal(w.all,0);
 assert.deepEqual(w.groups,[]);
 assert.equal(w.noPending,true);
});
