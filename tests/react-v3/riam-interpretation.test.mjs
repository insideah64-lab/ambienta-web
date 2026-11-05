import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const built=await require('esbuild').build({entryPoints:['v3/overrides/src/features/impacts/RiamInterpretationModel.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const axes={factors:[{id:'f1',name:'Agua QA',group:'Sin inferencia'},{id:'f2',name:'Fauna QA',group:'Medio biótico'}],actions:[{id:'a1',name:'Acción QA',phase:'construccion'},{id:'a2',name:'Otra QA',phase:'operacion'}]};
const entry=(criteria={A1:3,A2:-2,B1:2,B2:2,B3:3},reason='Fundamento QA',evidence='Documento QA')=>({sign:null,criteria,reason,evidence});
test('RIAM bands preserve both signs and every published boundary including N',()=>{
 for(const [n,letter] of [[1,'A'],[9,'A'],[10,'B'],[18,'B'],[19,'C'],[35,'C'],[36,'D'],[71,'D'],[72,'E'],[108,'E']])for(const sign of [-1,1])assert.equal(m.riamBand(n*sign).code,(sign<0?'-':'+')+letter);
 assert.equal(m.riamBand(0).code,'N');assert.equal(m.riamBand(-0).code,'N');
});
test('RIAM missing, noninteger, nonfinite and out-of-range scores never acquire a band',()=>{
 for(const value of [null,undefined,NaN,Infinity,-Infinity,109,-109,0.5,'42'])assert.equal(m.riamBand(value),null);
});
test('RIAM complete zero differs from incomplete criteria; published example is -42/-D',()=>{
 const meta=m.emptyRiamMetadata('DEMO-001'),rows=m.riamRows(axes,{'f1::a1':entry(),'f1::a2':entry({A1:0,A2:-3,B1:3,B2:3,B3:3}),'f2::a1':entry({A1:3})},meta);
 assert.equal(rows[0].score,-42);assert.equal(rows[0].band.code,'-D');assert.equal(rows[1].score,0);assert.equal(rows[1].band.code,'N');assert.equal(rows[2].score,null);assert.equal(rows[2].band,null);
});
test('RIAM categories are explicit, project isolated, immutable updates and retain unknown factor IDs',()=>{
 const meta=m.emptyRiamMetadata('A'),before=JSON.stringify(meta),next=m.assignRiamCategory(meta,'f1','PC');assert.equal(JSON.stringify(meta),before);assert.equal(m.categoryAt(meta,'f1'),null);assert.equal(m.categoryAt(next,'f1'),'PC');assert.equal(m.categoryAt(meta,'constructor'),null);
 assert(m.validRiamMetadata(next,'A'));assert(!m.validRiamMetadata(next,'B'));assert.notEqual(m.riamMetadataKey('A'),m.riamMetadataKey('B'));
 const old=m.assignRiamCategory(next,'old-factor','EO');assert.equal(old.factorCategories['old-factor'],'EO');assert.equal(m.assignRiamCategory(old,'f1','').factorCategories['old-factor'],'EO');
});
test('RIAM category imports reject invalid schema, type, category and identifiers',()=>{
 const d=m.emptyRiamMetadata('A');for(const patch of [{schema:'other'},{updatedAt:'not-a-date'},{factorCategories:[]},{factorCategories:{f:'INVALID'}},{factorCategories:{'':'PC'}},{factorCategories:{f:{toString:null}}}])assert(!m.validRiamMetadata({...d,...patch},'A'));
 assert.throws(()=>m.assignRiamCategory(d,'f','INVALID'));assert(!m.validRiamMetadata({...d,extra:1},'A'));
});
test('RIAM summary counts untouched interactions as pending and metadata classifies factors with no records',()=>{
 let meta=m.assignRiamCategory(m.emptyRiamMetadata('A'),'f1','PC');meta=m.assignRiamCategory(meta,'f2','BE');
 const rows=m.riamRows(axes,{'f1::a1':entry()},meta),s=m.summarizeRiam(axes,rows,meta);assert.equal(s.total,4);assert.equal(s.ready,1);assert.equal(s.pending,3);assert.equal(s.bands['-D'],1);
 assert.equal(s.categories.find(x=>x.code==='PC').pending,1);assert.equal(s.categories.find(x=>x.code==='BE').pending,2);assert.equal(s.categories.reduce((n,x)=>n+x.pending,0),3);
});
test('RIAM unclassified and undocumented are separate from numerical readiness',()=>{
 const meta=m.emptyRiamMetadata('A'),rows=m.riamRows(axes,{'f1::a1':entry(undefined,'','')},meta),s=m.summarizeRiam(axes,rows,meta);assert.equal(s.ready,1);assert.equal(s.documented,0);assert.equal(s.undocumented,1);assert.equal(rows[0].category,null);assert.equal(s.categories.find(x=>x.code==='unassigned').ready,1);
});
test('RIAM orphaned scores remain exportable and do not contaminate current-catalog counts',()=>{
 const meta=m.emptyRiamMetadata('A'),entries={'removed::gone':entry(),'f1::a1':entry()},snapshot=JSON.stringify(entries),rows=m.riamRows(axes,entries,meta),s=m.summarizeRiam(axes,rows,meta),exported=m.riamExport(axes,entries,meta);
 assert.equal(s.ready,1);assert.equal(s.orphaned,1);assert.equal(s.bands['-D'],1);assert.equal(exported.results.length,2);assert.equal(exported.results[0].inCatalog,false);assert.equal(JSON.stringify(entries),snapshot);
});
test('RIAM JSON includes classification version, provenance, explicit assignments and all stored result IDs',()=>{
 const meta=m.assignRiamCategory(m.emptyRiamMetadata('A'),'f1','PC'),e=m.riamExport(axes,{'f1::a1':entry()},meta);assert.equal(e.schema,'ambienta.riam-interpretation.export.v1');assert.equal(e.metadata.factorCategories.f1,'PC');assert.equal(e.results[0].band.code,'-D');assert.equal(e.results[0].id,'f1::a1');assert.equal(e.sources[0],'https://doi.org/10.1016/S0195-9255(98)00018-3');assert.equal(e.sources.length,2);assert(e.classificationVersion.includes('1998'));assert(!Object.hasOwn(e.summary,'sum'));
});
test('RIAM CSV preserves incomplete fields, orphan IDs, bands and spreadsheet formula protection',()=>{
 const meta=m.emptyRiamMetadata('A'),entries={'f1::a1':entry(undefined,'=unsafe','Evidence "quoted"'),'removed::gone':entry({A1:1})},csv=m.riamCsv('A','QA',axes,entries,meta,'1998');
 for(const value of ['Banda RIAM','-D',"'=unsafe",'""quoted""','removed::gone','Fuera del catálogo; conservado','Documentación pendiente','Estado categorías'])assert(csv.includes(value),value);assert.equal(csv.split('\r\n').length,3);assert(csv.startsWith('\uFEFF'));
});
