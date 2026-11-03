import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const source=await readFile('apps/web-v3/src/features/impacts/ConesaLibroModel.ts','utf8');
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const ts=require('typescript');
const compiled=ts.transpileModule(source,{compilerOptions:{
 target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext
}}).outputText;
const model=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const {
 BOOK_METHOD_ID,BOOK_SCHEMA,BOOK_STORAGE_PREFIX,BOOK_FIELDS,BOOK_BOUNDARY_POLICY,
 calculateBookConesa,bookProblems,bookCategory,validBookEntry
}=model;
const criteria={IN:2,EX:2,EX_CR:0,MO:4,MO_CR:0,PE:4,RV:1,SI:1,AC:1,EF:4,PR:1,MC:2};
const entry=(changes={})=>({
 sign:-1,criteria:{...criteria},recovery:null,
 reason:'Fundamento didáctico explícito, no dato real',
 evidence:'Libro Conesa 1997, p. 95',...changes
});
test('Book engine has own schema, key and provenance, not tutorial identity',()=>{
 assert.equal(BOOK_METHOD_ID,'conesa-libro-1997-cualitativo-f1');
 assert.equal(BOOK_SCHEMA,'ambienta.conesa-libro-1997.cualitativo-f1');
 assert.equal(BOOK_STORAGE_PREFIX,'ambienta-conesa-libro-1997-f1:');
 assert.equal(BOOK_FIELDS.length,12);
 assert(BOOK_BOUNDARY_POLICY.includes('50<=I<=75'));
});
test('Basic documented equation reproduces 28 without workbook-dependent shortcuts',()=>{
 assert.deepEqual(calculateBookConesa(entry()),{
  absolute:28,signed:-28,category:'Moderado',status:'calculado'
 });
 assert.equal(calculateBookConesa(entry({sign:1})).signed,28);
 assert.equal(calculateBookConesa(entry({sign:1})).category,'Beneficioso');
});
test('Critical moment +1 or +4 is in 1997 prose, critical location is doubled inside EX',()=>{
 assert.equal(calculateBookConesa(entry({criteria:{...criteria,MO_CR:1}})).absolute,29);
 assert.equal(calculateBookConesa(entry({criteria:{...criteria,MO_CR:4}})).absolute,32);
 assert.equal(calculateBookConesa(entry({
  criteria:{...criteria,EX:1,EX_CR:4}
 })).absolute,34);
 assert.equal(calculateBookConesa(entry({
  criteria:{...criteria,EX:2,EX_CR:4}
 })),null,'Location exception described as punctual requires the matching scope');
});
test('Uncertain nature x is explicit; never silently classified adverse',()=>{
 const result=calculateBookConesa(entry({sign:'x'}));
 assert.equal(result.absolute,28);
 assert.equal(result.signed,null);
 assert.equal(result.category,'Indeterminado');
 assert.equal(result.status,'naturaleza-incierta');
 assert.equal(calculateBookConesa(entry({sign:null})),null);
});
test('1997 limits 50 and 75 are explicit, non-overlapping implementation decisions',()=>{
 assert.equal(bookCategory(24),'Irrelevante');
 assert.equal(bookCategory(25),'Moderado');
 assert.equal(bookCategory(49),'Moderado');
 assert.equal(bookCategory(50),'Severo');
 assert.equal(bookCategory(75),'Severo');
 assert.equal(bookCategory(76),'Crítico');
 assert.equal(bookCategory(-1),null);
 assert.equal(bookCategory(NaN),null);
});
test('Recovery MC=4 must declare mitigation vs irrecoverable-compensable explicitly',()=>{
 const e=entry({criteria:{...criteria,MC:4}});
 assert.equal(calculateBookConesa(e),null);
 assert(bookProblems(e).some(m=>m.includes('MC=4')));
 const mitigable=entry({criteria:{...criteria,MC:4},recovery:'mitigable'});
 const compensated=entry({criteria:{...criteria,MC:4},recovery:'compensable'});
 assert.equal(calculateBookConesa(mitigable).absolute,30);
 assert.equal(calculateBookConesa(compensated).absolute,30);
 assert.equal(calculateBookConesa(entry({...compensated,evidence:''})),null,
  'Compensation requires documented evidence, not an invented measure');
});
test('Invalid critical modifiers and Excel RV=3 must be flagged, not coerced',()=>{
 assert.equal(calculateBookConesa(entry({criteria:{...criteria,RV:3}})),null);
 assert(bookProblems(entry({criteria:{...criteria,RV:3}})).some(m=>m.includes('RV: fuera')));
 assert.equal(calculateBookConesa(entry({criteria:{...criteria,MO_CR:2}})),null);
 assert.equal(calculateBookConesa(entry({criteria:{...criteria,EX_CR:4,EX:1},reason:''})),null);
 assert.equal(calculateBookConesa(entry({criteria:{...criteria,MO_CR:1},evidence:''})),null);
 assert.equal(calculateBookConesa(entry({criteria:{...criteria,MC:1},recovery:'mitigable'})),null);
});
test('Saved entries have a strict validator and never silently normalize unfamiliar fields',()=>{
 assert(validBookEntry(entry()));
 assert(validBookEntry(entry({sign:'x'})));
 assert(!validBookEntry(entry({criteria:{...criteria,RV:3}})));
 assert(!validBookEntry(entry({criteria:{...criteria,EXTRA:999}})));
 assert(!validBookEntry(entry({reason:'z'.repeat(5001)})));
 assert(!validBookEntry(entry({recovery:'automatic-approved'})));
});
