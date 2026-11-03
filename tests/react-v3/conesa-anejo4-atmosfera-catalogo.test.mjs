import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const ts=require('typescript');
const source=await readFile('apps/web-v3/src/features/impacts/ConesaAnnex4Catalog.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{
 target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext
}}).outputText;
const catalog=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const entries=catalog.ANNEX4_ATMOSPHERE.slice(0,10);
const all=catalog.ANNEX4_CATALOG;

test('Anejo 4: ten distinct bibliographic entries verified on printed pages 254–258',()=>{
 assert.equal(entries.length,10);
 assert.equal(new Set(entries.map(x=>x.id)).size,10);
 assert.deepEqual(entries.map(x=>x.number),[1,2,3,4,5,6,7,8,9,10]);
 assert.deepEqual(entries.map(x=>x.printedPage),[254,254,255,255,256,256,257,257,258,258]);
 assert.deepEqual(entries.map(x=>x.pdfPage),[245,245,246,246,247,247,248,248,249,249]);
 for(const x of entries){
  assert.equal(x.section,'I. Atmósfera');
  assert(x.title.trim()&&x.indicator.trim()&&x.unit.trim());
  assert(x.graphReading.trim().length>10);
  assert.equal(x.numericCurve,'pendiente-de-digitalizacion');
  assert.equal(Object.hasOwn(x,'points'),false,'Metadata must never pretend to include digitized points');
  assert.equal(Object.hasOwn(x,'quality'),false);
  assert.equal(Object.hasOwn(x,'legalLimit'),false);
  assert.match(catalog.annex4Citation(x),/Anejo 4, I\. Atmósfera, ficha \d+/);
 }
});
test('Anejo 4 exact bibliography retains units and indicator averaging periods',()=>{
 assert.equal(entries[0].indicator,'Concentración media diaria');
 assert.equal(entries[0].unit,'p.p.m.');
 assert.equal(entries[2].indicator,'Concentración media en 3 horas');
 assert.equal(entries[4].unit,'mg/m³');
 assert.equal(entries[4].indicator,'Concentración media en 24 horas');
 assert.equal(entries[5].indicator,'Concentración media en 1 hora');
 assert.equal(entries[6].indicator,'Concentración media anual');
 assert.equal(entries[7].unit,'µg/m³');
 assert.equal(entries[9].indicator,'Índice ORAQI (OR)');
 assert.equal(entries[9].unit,'escala 10 a 100');
});
test('Anejo 4 search folds accents and does not synthesize extra curves',()=>{
 assert.equal(catalog.searchAnnex4('MONOXIDO').length,2);
 assert.equal(catalog.searchAnnex4('pArticulas').length,1);
 assert.equal(catalog.searchAnnex4('oraqi').length,1);
 assert.equal(catalog.searchAnnex4('hidrocarburos').length,2);
 assert.equal(catalog.searchAnnex4('DBO').length,1,'La nueva ficha de DBO está documentada');
 assert.equal(catalog.searchAnnex4('').length,27);
});


test('Extended Annex 4 has 14 atmosphere, 5 soil, 8 water; 27 unique references',()=>{
 assert.equal(catalog.ANNEX4_ATMOSPHERE.length,14);
 assert.equal(catalog.ANNEX4_SOIL.length,5);
 assert.equal(catalog.ANNEX4_WATER.length,8);
 assert.equal(all.length,27);
 assert.equal(new Set(all.map(r=>r.id)).size,27);
 assert.deepEqual(catalog.annex4SectionCounts().map(s=>s.count),[14,5,8]);
 for(const [group,expectedPages] of [
  [catalog.ANNEX4_ATMOSPHERE.slice(10),[259,259,260,260]],
  [catalog.ANNEX4_SOIL,[261,261,262,262,263]],
  [catalog.ANNEX4_WATER,[264,264,265,265,266,266,267,267]]
 ]){
  assert.deepEqual(group.map(e=>e.printedPage),expectedPages);
  for(const entry of group){
   assert.equal(entry.pdfPage,entry.printedPage-9);
   assert.equal(entry.numericCurve,'pendiente-de-digitalizacion');
   assert(!Object.hasOwn(entry,'points'));
   assert(!Object.hasOwn(entry,'limits'));
   assert(entry.graphReading.trim().length>=15);
   assert(['continua','categorica','varias-series','discontinua'].includes(entry.graphForm));
  }
 }
});
test('Differentiates categorical and discontinuous figures not reproducible by current F3b',()=>{
 const byId=id=>all.find(e=>e.id===id);
 assert.equal(byId('atm-11-ruido-presion').graphForm,'varias-series');
 assert.equal(byId('atm-13-sonido-agradabilidad').graphForm,'categorica');
 assert.equal(byId('soil-05-margenes-geologicos').graphForm,'varias-series');
 assert.equal(byId('water-04-olor-materiales-flotantes').graphForm,'varias-series');
 assert.equal(byId('water-06-temperatura').graphForm,'varias-series');
 assert.equal(byId('water-07-sustancias-toxicas').graphForm,'discontinua');
 assert.equal(byId('water-08-dbo').graphForm,'varias-series');
 assert.equal(byId('water-03-oxigeno-fluido').indicator,'Cantidad de oxígeno disuelto en agua');
 assert.equal(byId('soil-01-erosion-sedimentos').unit,'m³/ha/año');
 assert.equal(byId('water-05-plaguicidas').unit,'Adimensional');
});
test('Catalog filters by sections and retains stable locators',()=>{
 const S='II. Suelo',W='III. Agua',A='I. Atmósfera';
 assert.equal(catalog.searchAnnex4('',A).length,14);
 assert.equal(catalog.searchAnnex4('',S).length,5);
 assert.equal(catalog.searchAnnex4('',W).length,8);
 assert.equal(catalog.searchAnnex4('erosion',S).length,3);
 assert.equal(catalog.searchAnnex4('oxigeno',W).length,2);
 assert.equal(catalog.searchAnnex4('DBO',W).length,1);
 assert.equal(catalog.searchAnnex4('DBO',A).length,0);
 assert.equal(catalog.searchAnnex4('Sonido',A).length,1);
 const ref=all.find(e=>e.id==='water-07-sustancias-toxicas');
 assert.match(catalog.annex4Citation(ref),/III\. Agua, ficha 7/);
 assert.match(catalog.annex4Citation(ref),/p\. 267/);
});
