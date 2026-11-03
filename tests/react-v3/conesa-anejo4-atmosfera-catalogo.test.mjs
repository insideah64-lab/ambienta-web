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
const entries=catalog.ANNEX4_ATMOSPHERE;

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
 assert.equal(catalog.searchAnnex4('DBO').length,0,'No inventar registros aún no transcritos');
 assert.equal(catalog.searchAnnex4('').length,10);
});
