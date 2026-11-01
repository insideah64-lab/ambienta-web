import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeDocumentLinks,reviewDocumentLink,matchesDocumentContext,exportDocumentReview} from '../../v3/overrides/src/features/maps/documentary-links.mjs';
const sha='a'.repeat(64),other='b'.repeat(64),at='2026-11-01T06:00:00Z';
const report={schema:'ambienta-point-zones-v1',provenance:{inputSha256:sha,scenarioSha256:other,scenarioCreatedAt:at,scenarioBbox:[-68,-25,-67,-24]},points:[
 {ref:'F1',status:'inside_zone',zoneId:'A'},{ref:'F2',status:'review_boundary',zoneId:null},{ref:'F3',status:'outside_perimeter',zoneId:null}]};
const record=(id,pointRef)=>({id,pointRef,recordType:'monitoring',observedAt:at,method:'muestreo declarado',
 sourceUri:'file:local-qa',sourceId:'QA-01',accuracyMethod:'GPS declarado',
 accuracyMeters:5,evidenceSha256:sha});
test('only complete interior candidates become pending; none auto-approved',()=>{
 const input=[record('m1','F1'),record('m2','F2'),record('m3','F3'),record('m4','missing'),{...record('m5','F1'),method:''}];
 const before=JSON.stringify(input);
 const p=proposeDocumentLinks(report,input,at);
 assert.deepEqual(p.entries.map(x=>x.status),['awaiting_review','needs_spatial_review','needs_spatial_review','needs_spatial_review','needs_metadata']);
 assert.equal(p.entries[0].zoneId,'A');assert(p.entries.slice(1).every(x=>x.zoneId===null));
 assert.equal(JSON.stringify(input),before);assert.equal(p.entries.some(x=>x.status==='approved'),false);
});
test('requires named human, reason, decision and stable spatial context',()=>{
 const p=proposeDocumentLinks(report,[record('m1','F1')],at);
 assert.throws(()=>reviewDocumentLink(p,report,'m1','approve','','verified',at),/revisión humana/);
 const approved=reviewDocumentLink(p,report,'m1','approve','Revisor QA','Comparación documental QA',at);
 assert.equal(approved.entries[0].status,'approved');assert.equal(p.entries[0].status,'awaiting_review');
 assert.equal(exportDocumentReview(approved,report).exportedAs,'derived_review_only');
 assert.throws(()=>reviewDocumentLink(approved,report,'m1','approve','X','Y',at),/pendientes/);
 const stale={...report,provenance:{...report.provenance,inputSha256:'c'.repeat(64)}};
 assert.equal(matchesDocumentContext(p,stale),false);
 assert.throws(()=>reviewDocumentLink(p,stale,'m1','reject','X','Y',at),/recalcular/);
});
test('reject duplicates, corrupted report, false precision and ambiguous points',()=>{
 assert.throws(()=>proposeDocumentLinks(report,[record('m1','F1'),record('m1','F2')],at),/duplicado/);
 assert.throws(()=>proposeDocumentLinks({...report,provenance:{}},[],at),/informe espacial/);
 const p=proposeDocumentLinks(report,[{...record('m1','F1'),accuracyMeters:-3}],at);
 assert.equal(p.entries[0].status,'needs_metadata');
 assert.throws(()=>reviewDocumentLink(proposeDocumentLinks(report,[record('m2','F2')],at),report,'m2','approve','X','Y',at),/pendientes/);
});
