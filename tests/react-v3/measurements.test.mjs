import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMeasurementBook,addMeasurement,voidMeasurement,validateMeasurementBook,
 measurementStatus,summarizeMeasurements,readMeasurementBook,exportMeasurementBook,MEASUREMENT_SCHEMA}
 from '../../v3/overrides/src/features/monitoring/measurements.mjs';
const at='2026-11-01T15:00:00.000Z',later='2026-11-01T17:00:00.000Z';
const hash='a'.repeat(64);
const data=()=>({demo:true,project:{id:'DIAB-2026-DEMO'},revision:3,
 measures:[{id:'MED-1'}],inspections:[{id:'INSP-1',measureId:'MED-1'}],
 evidence:[{id:'EVID-1',measureId:'MED-1',inspectionId:'INSP-1',
 reference:'sha256:'+hash+'|archivo:qa.csv|bytes:6'}]});
const q=()=>({measureId:'MED-1',inspectionId:'INSP-1',evidenceId:'EVID-1',
 sampleId:'S01',stationId:'EST-01',matrix:'agua',parameter:'Arsénico total',
 qualifier:'quantified',unit:'mg/L',value:0.012,detectionLimit:0.001,quantificationLimit:0.005,
 uncertainty:0.002,collectedAt:at,analyzedAt:later,method:'ICP-MS declarado',
 sourceId:'REPORTE-LAB-DEMO-01',operator:'Operador DEMO'});
test('registrar un valor medido no altera el dominio ni lo considera conforme',()=>{
 const d=data(),before=JSON.stringify(d),empty=blankMeasurementBook(d,at);
 const book=addMeasurement(empty,d,q(),later);
 assert.equal(book.schema,MEASUREMENT_SCHEMA);
 assert.equal(book.entries[0].id,'MUE-0001');
 assert.equal(book.entries[0].value,0.012);
 assert.equal(book.events.length,1);
 assert.equal(book.revision,1);
 assert.equal(measurementStatus(book.entries[0],book,d),'fingerprint_declared_unverified');
 assert.deepEqual(summarizeMeasurements(book,d),{total:1,active:1,voided:0,awaitingEvidence:0,referenceOnly:0,fingerprintDeclared:1});
 assert.equal(JSON.stringify(d),before);
 assert(!JSON.stringify(book).includes('cumplimiento_verificado'));
});
test('below detection/quantification are censored, not numerically zero',()=>{
 const d=data();
 const b=blankMeasurementBook(d,at);
 const c=addMeasurement(b,d,{...q(),qualifier:'below_detection',value:999},later);
 assert.equal(c.entries[0].value,null);
 assert.equal(c.entries[0].qualifier,'below_detection');
 assert.throws(()=>addMeasurement(b,d,{...q(),qualifier:'below_detection',detectionLimit:null},later),/detección positivo/);
 const l=addMeasurement(b,d,{...q(),qualifier:'below_quantification'},later);
 assert.equal(l.entries[0].value,null);
 assert.throws(()=>addMeasurement(b,d,{...q(),qualifier:'below_quantification',quantificationLimit:null},later),/cuantificación positivo/);
});
test('unidades y valores inválidos o negativos se bloquean',()=>{
 const d=data(),b=blankMeasurementBook(d);
 for(const input of [{unit:'bananas'},{value:-0.1},{detectionLimit:0.01,quantificationLimit:0.005},
 {matrix:'unknown'},{method:''},{analyzedAt:'2026-10-31T15:00:00.000Z'},
 {unit:'pH',value:17},{inspectionId:'INSP-X'},{measureId:'MED-X'},
 {evidenceId:'EVID-X'},{inspectionId:null,evidenceId:'EVID-1'}]){
  assert.throws(()=>addMeasurement(b,d,{...q(),...input},later));
 }
 const negativeTemp=addMeasurement(b,d,{...q(),unit:'°C',value:-2},later);
 assert.equal(negativeTemp.entries[0].value,-2);
});
test('una muestra/parametro/fecha no puede duplicarse; entradas quedan inmutables y anulaciones son auditables',()=>{
 const d=data(),b=addMeasurement(blankMeasurementBook(d),d,q(),later);
 assert.throws(()=>addMeasurement(b,d,q(),later),/duplicados/);
 const before=JSON.stringify(b.entries[0]);
 const annulled=voidMeasurement(b,d,'MUE-0001','Error de transcripción','Revisor QA',later);
 assert.equal(annulled.entries.length,1);
 assert.equal(JSON.stringify(annulled.entries[0]),before);
 assert.equal(measurementStatus(annulled.entries[0],annulled,d),'voided');
 assert.equal(summarizeMeasurements(annulled,d).active,0);
 assert.throws(()=>voidMeasurement(annulled,d,'MUE-0001','Duplicar','QA',later),/ya se anuló/);
 assert.equal(annulled.events[1].reason,'Error de transcripción');
});
test('importación validada, fail closed y exportación conservan las referencias',()=>{
 const d=data(),book=addMeasurement(blankMeasurementBook(d),d,q(),later);
 const mem={getItem:()=>JSON.stringify(book)};
 assert.equal(readMeasurementBook(mem,'key',d).status,'ready');
 assert.equal(readMeasurementBook({getItem:()=>null},'key',d).status,'empty');
 const corrupted=structuredClone(book);corrupted.events=[];
 assert.equal(readMeasurementBook({getItem:()=>JSON.stringify(corrupted)},'key',d).status,'blocked');
 const changed=data();changed.evidence=[];
 assert.equal(readMeasurementBook(mem,'key',changed).status,'blocked');
 const exported=exportMeasurementBook(book,d);
 assert.equal(exported.entries[0].stationId,'EST-01');
 assert.equal(exported.status,'LABORATORY_DEMO_NOT_VERIFIED');
 assert.match(exported.caveat,/sin acreditación/);
 assert.throws(()=>validateMeasurementBook({...book,projectId:'OTHER'},d),/identidad/);
});
test('no genera ejemplos de medición automáticamente: registro inicial vacío',()=>{
 const blank=blankMeasurementBook(data(),at);
 assert.deepEqual(blank.entries,[]);
 assert.deepEqual(blank.events,[]);
 assert.equal(blank.nextId,1);
});
