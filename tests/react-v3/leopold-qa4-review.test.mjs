import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const esbuild=require('esbuild');
const built=await esbuild.build({
 entryPoints:['v3/overrides/src/features/impacts/LeopoldReview.ts'],
 bundle:true,write:false,format:'esm',platform:'node',target:'es2022'
});
const {scanLeopoldHighlights:scan}=await import('data:text/javascript;base64,'+
 Buffer.from(built.outputFiles[0].text).toString('base64'));
const factors=[{id:'f1',name:'Agua'},{id:'f2',name:'Fauna'}];
const actions=[{id:'a1',name:'Excavación'},{id:'a2',name:'Revegetación'},{id:'a3',name:'Transporte'}];
const cells={
 'f1::a1':{sign:-1,magnitude:9,importance:2,reason:'Causa',evidence:''},
 'f1::a2':{sign:1,magnitude:3,importance:9,reason:'',evidence:'Ref. 1'},
 'f1::a3':{sign:-1,magnitude:7,importance:7,reason:'Causa',evidence:'Ref. 2'},
 'f2::a1':{sign:1,magnitude:8,importance:null,reason:'',evidence:''},
 'f2::a2':{sign:0,magnitude:null,importance:null}
};
test('Independent magnitude or importance: never compare multiplication',()=>{
 const r=scan(factors,actions,cells,{minMagnitude:8,minImportance:8,logic:'either'});
 assert.equal(r.reviewedComplete,3);
 assert.equal(r.pending,1);
 assert.equal(r.noInteraction,1);
 assert.equal(r.unassessed,1);
 assert.equal(r.hits.length,2);
 assert.deepEqual(r.hits.map(x=>x.key),['f1::a1','f1::a2']);
 assert.equal(r.hits[0].hasReason,true);
 assert.equal(r.hits[0].hasEvidence,false);
 assert.equal(r.hits[1].hasReason,false);
 assert.equal(r.hits[1].hasEvidence,true);
 assert.equal(r.byFactor.f1,2);
 assert.equal(r.byAction.a1,1);
 assert.equal(r.byAction.a2,1);
 assert.equal(r.hits[0].soleCompletedForAction,true);
 assert.equal(r.hits[1].soleCompletedForFactor,false);
});
test('Both criteria, high cutoff and incomplete cells',()=>{
 const r=scan(factors,actions,cells,{minMagnitude:8,minImportance:8,logic:'both'});
 assert.equal(r.hits.length,0);
 const high=scan(factors,actions,cells,{minMagnitude:10,minImportance:10,logic:'either'});
 assert.equal(high.hits.length,0);
 const r2=scan(factors,actions,cells,{minMagnitude:7,minImportance:7,logic:'both'});
 assert.deepEqual(r2.hits.map(x=>x.key),['f1::a3']);
 assert.equal(r2.hits[0].soleCompletedForAction,true);
});
test('All thresholds are reviewer view criteria, not persisted scoring',()=>{
 assert.throws(()=>scan(factors,actions,cells,{minMagnitude:0,minImportance:8,logic:'either'}),RangeError);
 assert.throws(()=>scan(factors,actions,cells,{minMagnitude:9,minImportance:11,logic:'either'}),RangeError);
 assert.throws(()=>scan(factors,actions,cells,{minMagnitude:8.5,minImportance:8,logic:'either'}),RangeError);
 const old=JSON.stringify(cells);
 scan(factors,actions,cells,{minMagnitude:1,minImportance:1,logic:'either'});
 assert.equal(JSON.stringify(cells),old);
});
test('Empty matrix, pending-only, and name keys never synthesize measurements',()=>{
 const blank=scan(factors,actions,{}, {minMagnitude:8,minImportance:8,logic:'either'});
 assert.equal(blank.hits.length,0);
 assert.equal(blank.unassessed,6);
 assert.deepEqual(Object.keys(blank.byFactor),[]);
 const partial=scan([{id:'f',name:'Water'}],[{id:'a',name:'Site'}],
  {'f::a':{sign:-1,magnitude:null,importance:10}},{minMagnitude:1,minImportance:1,logic:'either'});
 assert.equal(partial.pending,1);
 assert.equal(partial.hits.length,0);
});
