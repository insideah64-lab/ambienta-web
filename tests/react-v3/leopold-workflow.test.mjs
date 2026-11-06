import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const built=await require('esbuild').build({entryPoints:['v3/overrides/src/features/impacts/LeopoldWorkflow.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {leopoldCatalogCells,leopoldReadiness,nextLeopoldCell}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const full={sign:-1,magnitude:7,importance:5,reason:'',evidence:''};
test('Catalog counters exclude retained historic cells and preserve their original data',()=>{
 const cells={'current::action':full,'old::removed':{...full,reason:'Histórico',evidence:'Archivo 1'}};
 const before=JSON.stringify(cells);
 assert.deepEqual(leopoldCatalogCells(['current::action','empty::action'],cells),[full]);
 assert.deepEqual(leopoldCatalogCells([],cells),[]);
 assert.equal(JSON.stringify(cells),before);
});
test('Complete numerical valuation is independent of documentation and does not mutate scores',()=>{
 const original=structuredClone(full);
 assert.deepEqual(leopoldReadiness(full),{scored:true,documented:false});
 assert.equal(leopoldReadiness({...full,reason:'Campo',evidence:'  '}).documented,false);
 assert.equal(leopoldReadiness({...full,reason:'Campo',evidence:'Informe 1'}).documented,true);
 assert.equal(leopoldReadiness({...full,sign:0}).scored,false);
 assert.equal(leopoldReadiness({...full,magnitude:null,reason:'Campo',evidence:'Informe 1'}).documented,false);
 assert.deepEqual(full,original);
});
test('Pending traversal wraps, skips declared absence, and respects the visible catalog',()=>{
 const keys=['f::a','f::b','f::c','f::d'];
 const cells={'f::a':{...full,sign:0},'f::b':full,'f::c':{...full,magnitude:null}};
 assert.equal(nextLeopoldCell(keys,cells,null,'valuation'),'f::c');
 assert.equal(nextLeopoldCell(keys,cells,'f::c','valuation'),'f::d');
 assert.equal(nextLeopoldCell(keys,cells,'f::d','valuation'),'f::c');
 assert.equal(nextLeopoldCell(keys,cells,'f::d','documentation'),'f::b');
 assert.equal(nextLeopoldCell(['f::a'],cells,null,'documentation'),null);
 assert.equal(nextLeopoldCell([],cells,null,'valuation'),null);
 assert.equal(nextLeopoldCell(['f::d'],cells,'unknown::id','valuation'),'f::d');
});
