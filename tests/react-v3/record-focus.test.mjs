import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiablillosState} from '../../apps/web-v3/src/lib/diablillosDemo.mjs';
import {recordFocusUrl,resolveRecordFocus} from '../../apps/web-v3/src/features/traceability/record-focus.mjs';
const S=createDiablillosState();
test('every V3.6.1 deep-link is scope-specific and encodes its ID',()=>{
 assert.equal(recordFocusUrl('inspection','INSP-DIAB-002'),'/monitoreo?inspeccion=INSP-DIAB-002');
 assert.equal(recordFocusUrl('evidence','EVID-D-004'),'/evidencias?evidencia=EVID-D-004');
 assert.equal(recordFocusUrl('finding','HALL-D-001'),'/auditorias?hallazgo=HALL-D-001');
 assert.equal(recordFocusUrl('action','AC-D-001'),'/auditorias?accion=AC-D-001');
 assert.equal(recordFocusUrl('action','A # / +'),'/auditorias?accion=A%20%23%20%2F%20%2B');
 assert.equal(recordFocusUrl('unknown','X'),null);
});
test('Diablillos inspection reports original observed state and direct measure link',()=>{
 const before=JSON.stringify(S),d=resolveRecordFocus(S,'inspection','INSP-DIAB-002');
 assert.equal(d.record.result,'observada');
 assert(d.fields.some(([k,v])=>k==='Resultado declarado'&&v==='observada'));
 assert.deepEqual(d.relations.map(x=>x.id),['MED-DIAB-002']);
 assert.equal(d.warnings.length,0);
 assert.equal(JSON.stringify(S),before);
});
test('Evidence retains pending source and its direct inspection and measure references',()=>{
 const d=resolveRecordFocus(S,'evidence','EVID-D-004');
 assert.equal(d.record.status,'pendiente');
 assert.deepEqual(d.relations.map(x=>x.id),['MED-DIAB-002','INSP-DIAB-002']);
 assert.equal(d.warnings.length,0);
});
test('Finding and corrective action preserve transitive ID paths',()=>{
 const f=resolveRecordFocus(S,'finding','HALL-D-001');
 const a=resolveRecordFocus(S,'action','AC-D-001');
 assert.equal(f.record.status,'abierto');assert.equal(a.record.status,'abierta');
 assert.deepEqual(f.relations.map(x=>x.id),['INSP-DIAB-002','MED-DIAB-002']);
 assert.deepEqual(a.relations.map(x=>x.id),['HALL-D-001','INSP-DIAB-002','MED-DIAB-002']);
});
test('Conflicting evidence does not imply a measure backlink, but shows warning',()=>{
 const d=createDiablillosState();
 d.evidence[3].measureId='MED-DIAB-003';
 const x=resolveRecordFocus(d,'evidence','EVID-D-004');
 assert(!x.relations.some(r=>r.kind==='measure'));
 assert(x.relations.some(r=>r.kind==='inspection'&&r.id==='INSP-DIAB-002'));
 assert(x.warnings.some(w=>/Conflicto/.test(w)));
});
test('Orphan references are flagged; never generate synthetic targets',()=>{
 const d=createDiablillosState();
 d.correctiveActions[0].findingId='HALL-MISSING';
 const x=resolveRecordFocus(d,'action','AC-D-001');
 assert.deepEqual(x.relations,[]);
 assert(x.warnings.some(w=>/no existe/.test(w)));
 assert.equal(resolveRecordFocus(d,'action','NOT-FOUND'),null);
 assert.equal(resolveRecordFocus(d,'finding','AC-D-001'),null);
});
