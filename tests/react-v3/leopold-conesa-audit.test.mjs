import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const esbuild=require('esbuild');
const built=await esbuild.build({
 entryPoints:['v3/overrides/src/features/impacts/LeopoldAnalytics.ts'],
 bundle:true,write:false,format:'esm',platform:'node',target:'es2022'
});
const model=await import('data:text/javascript;base64,'+
 Buffer.from(built.outputFiles[0].text).toString('base64'));
const factors=[{id:'f1',name:'Agua'},{id:'f2',name:'Aire'}];
const actions=[{id:'a1',name:'Obra'},{id:'a2',name:'Cierre'}];
test('No evaluation is different from no interaction or pending',()=>{
 const cells={
  'f1::a1':{sign:-1,magnitude:7,importance:5},
  'f1::a2':{sign:1,magnitude:4,importance:3},
  'f2::a1':{sign:0,magnitude:null,importance:null}
 };
 const s=model.summarizeLeopold(factors,actions,cells);
 assert.deepEqual({
  negative:s.total.negative,positive:s.total.positive,none:s.total.none,
  unassessed:s.total.unassessed,pending:s.total.pending,evaluated:s.total.evaluated
 },{negative:1,positive:1,none:1,unassessed:1,pending:0,evaluated:2});
 assert.equal(s.total.beneficialProducts,12);
 assert.equal(s.total.adverseProducts,35);
 assert.equal(s.total.signedSum,-23);
 assert.equal(s.byAction.a1.signedSum,-35);
 assert.equal(s.byFactor.f1.signedSum,-23);
 const pending={...cells,'f2::a2':{sign:-1,magnitude:10,importance:null}};
 const second=model.summarizeLeopold(factors,actions,pending);
 assert.equal(second.total.pending,1);
 assert.equal(second.total.unassessed,0);
 assert.equal(second.total.signedSum,-23);
});
test('Possible duplicate names are warnings, not proof of equal impacts',()=>{
 const names=[
  {name:'Perforación de suelo'},{name:'  PERFORACION   DE   SUELO  '},
  {name:'Operación normal'},{name:'Operación normal  '},{name:'Otra acción'}
 ];
 assert.equal(model.possibleLeopoldDuplicateNames(names).length,2);
 assert.deepEqual(model.possibleLeopoldDuplicateNames([{name:'Agua'},{name:'Aire'}]),[]);
});
