import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const esbuild=require('esbuild');
const built=await esbuild.build({
 entryPoints:['v3/overrides/src/features/impacts/LeopoldAlternativeComparison.ts'],
 bundle:true,write:false,format:'esm',platform:'node',target:'es2022'
});
const {isAlternativeMatrix,compareLeopoldAlternatives:compare}=await import('data:text/javascript;base64,'+
 Buffer.from(built.outputFiles[0].text).toString('base64'));
const A={
 schema:'ambienta.impact-matrix.v1',projectId:'a',projectName:'Trazado A',
 actions:[{id:'a1',name:'Obras'},{id:'a2',name:'Transporte'}],
 factors:[{id:'f1',name:'Agua',group:'Físico'},{id:'f2',name:'Fauna',group:'Biótico'}],
 cells:{
  'f1::a1':{sign:-1,magnitude:8,importance:9},
  'f1::a2':{sign:1,magnitude:null,importance:8},
  'f2::a1':{sign:0,magnitude:null,importance:null}
 }
};
const B={
 schema:'ambienta.impact-matrix.v1',projectId:'b',projectName:'Trazado B',
 actions:[{id:'b1',name:'Movimiento'}],
 factors:[{id:'g1',name:' ÁGUA ',group:'fisico'},{id:'g2',name:'Paisaje',group:'Estético'}],
 cells:{'g1::b1':{sign:-1,magnitude:5,importance:2}}
};
test('QA5 aligns only unique matching factors and preserves original values',()=>{
 const original=JSON.stringify(A);
 assert.equal(isAlternativeMatrix(A),true);
 assert.equal(isAlternativeMatrix(B),true);
 const v=compare(A,B);
 assert.equal(v.rows.length,1);
 assert.equal(v.rows[0].name,'Agua');
 assert.deepEqual(v.onlyA,['Fauna']);
 assert.deepEqual(v.onlyB,['Paisaje']);
 assert.equal(v.rows[0].A.negative,1);
 assert.equal(v.rows[0].A.pending,1);
 assert.equal(v.rows[0].A.evaluated,1);
 assert.equal(v.rows[0].B.negative,1);
 assert.equal(v.rows[0].B.pending,0);
 assert.equal(v.summaryA.unassessed,1);
 assert.equal(v.summaryB.evaluated,1);
 assert.equal(JSON.stringify(A),original);
});
test('Ambiguous factor names excluded and incomplete JSON rejected',()=>{
 const dup={...B,factors:[...B.factors,{id:'g3',name:'AGUA',group:'Físico'}]};
 const r=compare(A,dup);
 assert.equal(r.rows.length,0);
 assert.equal(r.ambiguous.length,1);
 assert.equal(isAlternativeMatrix({...B,cells:{x:{sign:1,magnitude:0,importance:3}}}),false);
 assert.equal(isAlternativeMatrix({...B,actions:[B.actions[0],B.actions[0]]}),false);
 assert.equal(isAlternativeMatrix({...B,factors:[]}),true);
 assert.throws(()=>compare(A,{...B,schema:'wrong'}));
});
