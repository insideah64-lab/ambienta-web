import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeDocumentLinks,reviewDocumentLink,matchesDocumentContext,exportDocumentReview} from '../../v3/overrides/src/features/maps/documentary-links.mjs';
const sha='a'.repeat(64),other='b'.repeat(64),at='2026-11-01T06:00:00Z';
const geom={type:'Polygon',coordinates:[[[0,0],[4,0],[4,4],[0,4],[0,0]]]};
const scenario={sourceHash:other,createdAt:at,bbox:[0,0,4,4],
 parent:{features:[{geometry:geom}]},zones:{features:[{geometry:geom,properties:{zoneId:'A'}}]}};
const report={schema:'ambienta-point-zones-v1',provenance:{inputSha256:sha,scenarioSha256:other,scenarioCreatedAt:at,scenarioBbox:[0,0,4,4]},points:[
 {ref:'F1',status:'inside_zone',zoneId:'A',coordinate:[1,1]},
 {ref:'F2',status:'review_boundary',zoneId:null,coordinate:[0,2]},
 {ref:'F3',status:'outside_perimeter',zoneId:null,coordinate:[-1,0]},
 {ref:'F4',status:'inside_zone',zoneId:'A',coordinate:[0.000001,2]}]};
const record=(id,pointRef)=>({id,pointRef,recordType:'monitoring',observedAt:at,method:'muestreo declarado',
 sourceUri:'qa:local',sourceId:'QA-01',accuracyMethod:'GPS declarado',
 accuracyMeters:5,evidenceSha256:sha});
const propose=items=>proposeDocumentLinks(report,items,at,scenario);
test('only complete interiors beyond declared uncertainty become pending, not approved',()=>{
 const input=[record('m1','F1'),record('m2','F2'),record('m3','F3'),record('m4','missing'),
 {...record('m5','F1'),method:''},record('m6','F4')];
 const before=JSON.stringify(input);
 const p=propose(input);
 assert.deepEqual(p.entries.map(x=>x.status),['awaiting_review','needs_spatial_review','needs_spatial_review','needs_spatial_review','needs_metadata','needs_spatial_review']);
 assert.equal(p.entries[0].zoneId,'A');assert(p.entries.slice(1).every(x=>x.zoneId===null));
 assert.equal(JSON.stringify(input),before);assert.equal(p.entries.some(x=>x.status==='approved'),false);
 assert(p.entries[5].boundaryDistanceMeters<1);
 assert.equal(p.entries[0].sourceId,'QA-01');assert.equal(p.entries[0].accuracyMeters,5);
});
test('requires named human, reason, decision and stable spatial context',()=>{
 const p=propose([record('m1','F1')]);
 assert.throws(()=>reviewDocumentLink(p,report,'m1','approve','','verified',at),/revisión humana/);
 const approved=reviewDocumentLink(p,report,'m1','approve','Revisor QA','Comparación documental QA',at);
 assert.equal(approved.entries[0].status,'approved');assert.equal(p.entries[0].status,'awaiting_review');
 assert.equal(exportDocumentReview(approved,report).exportedAs,'derived_review_only');
 assert.throws(()=>reviewDocumentLink(approved,report,'m1','approve','X','Y',at),/pendientes/);
 const stale={...report,provenance:{...report.provenance,inputSha256:'c'.repeat(64)}};
 assert.equal(matchesDocumentContext(p,stale),false);
 assert.throws(()=>reviewDocumentLink(p,stale,'m1','reject','X','Y',at),/recalcular/);
});
test('reject corrupted inputs, omitted scenario, false precision and ambiguous points',()=>{
 assert.throws(()=>propose([record('m1','F1'),record('m1','F2')]),/duplicado/);
 assert.throws(()=>proposeDocumentLinks({...report,provenance:{}},[],at,scenario),/informe espacial/);
 assert.throws(()=>proposeDocumentLinks(report,[],at,{...scenario,sourceHash:'c'.repeat(64)}),/topológico/);
 const p=propose([{...record('m1','F1'),accuracyMeters:-3}]);
 assert.equal(p.entries[0].status,'needs_metadata');
 assert.throws(()=>reviewDocumentLink(propose([record('m2','F2')]),report,'m2','approve','X','Y',at),/pendientes/);
});
