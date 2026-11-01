import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDocumentSummary,countDocumentStatuses} from '../../v3/overrides/src/features/maps/documentary-summary.mjs';
const at='2026-11-01T06:00:00Z',sha='b'.repeat(64);
const scenario={sourceHash:sha,createdAt:at,bbox:[-68,-25,-67,-24]};
const summary=()=>({schema:'ambienta-documentary-summary-v1',status:'LOCAL_QA_NOT_CERTIFIED',
 projectCase:'diablillos',savedAt:at,
 origin:{inputSha256:'a'.repeat(64),scenarioSha256:sha,scenarioCreatedAt:at,
 scenarioBbox:[-68,-25,-67,-24]},
 records:[{recordId:'INSP-1',recordType:'inspection',pointRef:'F1',zoneId:'B',
 status:'approved',review:{reviewer:'Revisor QA',reason:'Enlace ficticio inspeccionado',
 reviewedAt:at,decision:'approve'}},
 {recordId:'MON-2',recordType:'monitoring',pointRef:'F2',zoneId:null,
 status:'needs_spatial_review',review:null}]});
test('summary safely presents review state without coordinates or document mutation',()=>{
 const s=summary();
 assert.equal(validateDocumentSummary(s,scenario,'diablillos').status,'ready');
 assert.deepEqual(countDocumentStatuses(s),{total:2,approved:1,pending:0,blocked:1,rejected:0});
 assert(!JSON.stringify(s.records).includes('coordinate'));
});
test('scenario or generation modifications invalidate links',()=>{
 const s=summary();
 assert.equal(validateDocumentSummary(s,{...scenario,createdAt:'2026-11-02'},'diablillos').status,'stale');
 assert.equal(validateDocumentSummary(s,{...scenario,bbox:[-69,-25,-67,-24]},'diablillos').status,'stale');
 assert.equal(validateDocumentSummary(s,scenario,'demo').status,'blocked');
 assert.equal(validateDocumentSummary(s,null,'diablillos').status,'stale');
});
test('fail closed for tampering, fake reviewers, duplicate ids, larger input',()=>{
 const s=summary();
 s.records[0].review=null;
 assert.equal(validateDocumentSummary(s,scenario,'diablillos').status,'blocked');
 const z=summary();z.records.push({...z.records[0]});
 assert.equal(validateDocumentSummary(z,scenario,'diablillos').status,'blocked');
 const j=summary();j.records[0].zoneId=null;
 assert.equal(validateDocumentSummary(j,scenario,'diablillos').status,'blocked');
 const k=summary();k.records=[{...k.records[1],zoneId:'A'}];
 assert.equal(validateDocumentSummary(k,scenario,'diablillos').status,'blocked');
});
