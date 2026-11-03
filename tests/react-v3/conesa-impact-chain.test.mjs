import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiablillosState} from '../../apps/web-v3/src/lib/diablillosDemo.mjs';
import {resolveConesaImpactChain,uniqueRegisteredImpacts}
 from '../../apps/web-v3/src/features/impacts/conesa-impact-chain.mjs';

test('explicit ID chain relates one registered impact to a matching PGA measure and inspection',()=>{
 const d=createDiablillosState(),before=JSON.stringify(d);
 const c=resolveConesaImpactChain(d,d.project.id,'IMP-D-AGU','MED-DIAB-001');
 assert.equal(c.status,'vinculado');
 assert.equal(c.impact.id,'IMP-D-AGU');
 assert.equal(c.measure.id,'MED-DIAB-001');
 assert.equal(c.monitoring,'con-registros');
 assert.deepEqual(c.inspectionIds,['INSP-DIAB-001']);
 assert.deepEqual(c.evidenceIds,['EVID-D-001','EVID-D-002','EVID-D-003']);
 assert.equal(JSON.stringify(d),before,'Chain must not mutate the source');
});
test('Conesa interaction never acquires an impact by matching label, factor or order',()=>{
 const d=createDiablillosState(),pid=d.project.id;
 assert.equal(resolveConesaImpactChain(d,pid,'','').status,'sin-referencias');
 assert.equal(resolveConesaImpactChain(d,pid,'','MED-DIAB-001').status,'impacto-pendiente');
 assert.equal(resolveConesaImpactChain(d,pid,'Agua','MED-DIAB-001').status,'impacto-no-encontrado');
 assert.equal(resolveConesaImpactChain(d,pid,'IMP-D-AGU','').status,'medida-pendiente');
 assert.equal(resolveConesaImpactChain(d,'OTHER','IMP-D-AGU','MED-DIAB-001').status,'proyecto-distinto');
 assert.equal(uniqueRegisteredImpacts(d,'OTHER').length,0);
});
test('wrong impact-to-measure association is rejected with no misleading inspection attribution',()=>{
 const d=createDiablillosState();
 const x=resolveConesaImpactChain(d,d.project.id,'IMP-D-EFL','MED-DIAB-001');
 assert.equal(x.status,'incompatible');
 assert.equal(x.impact.id,'IMP-D-EFL');
 assert.equal(x.measure.id,'MED-DIAB-001');
 assert.deepEqual(x.inspectionIds,[]);
 assert.deepEqual(x.evidenceIds,[]);
 assert.equal(x.trace,null);
 assert(x.warnings.some(w=>w.includes('impactIds')));
});
test('unresolved and duplicate IDs fail closed and do not select first record',()=>{
 const d=createDiablillosState(),pid=d.project.id;
 assert.equal(resolveConesaImpactChain(d,pid,'IMP-404','MED-DIAB-001').status,'impacto-no-encontrado');
 assert.equal(resolveConesaImpactChain(d,pid,'IMP-D-AGU','MED-404').status,'medida-no-encontrado');
 d.impacts.push({...d.impacts[0]});
 assert.equal(resolveConesaImpactChain(d,pid,'IMP-D-AGU','MED-DIAB-001').status,'impacto-ambiguo');
 assert(!uniqueRegisteredImpacts(d,pid).some(i=>i.id==='IMP-D-AGU'));
 d.impacts.pop();
 d.measures.push({...d.measures[0]});
 assert.equal(resolveConesaImpactChain(d,pid,'IMP-D-AGU','MED-DIAB-001').status,'medida-ambiguo');
});
test('linked impact with no inspection is not treated as having verified monitoring',()=>{
 const d=createDiablillosState(),pid=d.project.id;
 const c=resolveConesaImpactChain(d,pid,'IMP-D-SUE','MED-DIAB-003');
 assert.equal(c.status,'vinculado');
 assert.equal(c.monitoring,'sin-inspecciones');
 assert.deepEqual(c.inspectionIds,[]);
 assert.deepEqual(c.evidenceIds,['EVID-D-005']);
});
test('conflicting documentary evidence is reported and prevents a clean chain',()=>{
 const d=createDiablillosState(),pid=d.project.id;
 d.evidence.push({...d.evidence[0],id:'EVID-CONFLICT-ID',
   measureId:'MED-DIAB-002',inspectionId:'INSP-DIAB-001'});
 const c=resolveConesaImpactChain(d,pid,'IMP-D-AGU','MED-DIAB-001');
 assert.equal(c.status,'revisar-documentos');
 assert(c.warnings.some(w=>w.includes('EVID-CONFLICT-ID')));
 assert(!c.evidenceIds.includes('EVID-CONFLICT-ID'));
});
