import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const esbuild=require('esbuild');
const build=await esbuild.build({
 entryPoints:['v3/overrides/src/features/impacts/LeopoldReviewLedger.ts'],
 bundle:true,write:false,format:'esm',platform:'node',target:'es2022'
});
const model=await import('data:text/javascript;base64,'+
 Buffer.from(build.outputFiles[0].text).toString('base64'));
const projectId='project-test';
const cell={sign:-1,magnitude:9,importance:7,reason:'Condición inicial',evidence:'E-1'};
const snapshot=model.snapshotReview(cell,'Agua','Excavación');
const entry={id:'a1',projectId,key:'f1::a1',factorId:'f1',actionId:'a1',
 reviewer:'Técnico A',decision:'observaciones',comment:'Falta línea de base',
 recordedAt:'2026-11-04T11:00:00.000Z',snapshot};
test('QA5 ledger appends records without editing matrix or scores',()=>{
 const original=JSON.stringify(cell),blank=model.emptyReviewLedger(projectId);
 const first=model.appendReview(blank,entry);
 assert.equal(first.entries.length,1);
 assert.equal(blank.entries.length,0);
 assert.equal(model.isReviewLedger(first,projectId),true);
 assert.equal(JSON.stringify(cell),original);
 assert.equal(model.reviewCurrency(entry,cell,'Agua','Excavación'),'vigente');
 assert.equal(model.reviewCurrency(entry,{...cell,magnitude:8},'Agua','Excavación'),'modificada');
 assert.equal(model.reviewCurrency(entry,cell,'Agua','Obras'),'modificada');
 assert.equal(model.reviewCurrency(entry,undefined,'Agua','Excavación'),'eliminada');
 const second=model.appendReview(first,{...entry,id:'a2',decision:'revisar'});
 assert.deepEqual(second.entries.map(e=>e.id),['a1','a2']);
 assert.equal(first.entries.length,1);
});
test('Reject wrong project, duplicate IDs and corrupt review history',()=>{
 const blank=model.emptyReviewLedger(projectId);
 const first=model.appendReview(blank,entry);
 assert.throws(()=>model.appendReview(first,entry));
 assert.throws(()=>model.appendReview(first,{...entry,id:'b',projectId:'another'}));
 assert.equal(model.isReviewLedger(first,'another'),false);
 assert.equal(model.isReviewLedger({...first,entries:[{...entry,reviewer:''}]},projectId),false);
 assert.equal(model.isReviewLedger({...first,entries:[{...entry,snapshot:{...snapshot,magnitude:0}}]},projectId),false);
 assert.equal(model.isReviewLedger({...first,entries:[entry,entry]},projectId),false);
});

test('Changes to source justification or evidence invalidate previous review snapshot',()=>{
 const original={...cell};
 assert.equal(model.reviewCurrency(entry,original,'Agua','Excavación'),'vigente');
 assert.equal(model.reviewCurrency(entry,{...original,reason:'Nuevo fundamento'},'Agua','Excavación'),'modificada');
 assert.equal(model.reviewCurrency(entry,{...original,evidence:'E-2'},'Agua','Excavación'),'modificada');
 assert.equal(model.reviewCurrency(entry,original,undefined,'Excavación'),'eliminada');
});
