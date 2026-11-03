import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const ts=require('typescript');
const js=async path=>ts.transpileModule(await readFile(path,'utf8'),{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}
}).outputText;
const source=await js('apps/web-v3/src/features/impacts/ConesaLibroModel.ts');
const sourceURL='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const f2src=await js('apps/web-v3/src/features/impacts/ConesaF2Model.ts');
const f2js=f2src.replace(/from ['"]\.\/ConesaLibroModel['"]/,"from '"+sourceURL+"'");
assert.notEqual(f2src,f2js,'F2 must import the actual F1 model');
const f2=await import('data:text/javascript;base64,'+Buffer.from(f2js).toString('base64'));
const f1=await import(sourceURL);
const factors=[{id:'f1',name:'Agua',group:'Físico'},
 {id:'f2',name:'Suelo',group:'Físico'},{id:'f3',name:'Fauna',group:'Biótico'}];
const criteria={IN:2,EX:2,EX_CR:0,MO:4,MO_CR:0,PE:4,RV:1,SI:1,AC:1,EF:4,PR:1,MC:2};
const entry=(changes={})=>({sign:-1,criteria:{...criteria},recovery:null,reason:'Fundamento técnico declarado',evidence:'Libro 1997, p. 95',...changes});
const panel=(changes={})=>({method:'pesos_1_10',panelReference:'Responsables de panel',
 source:'Acta local de ponderación documentada',sessionDate:'2026-11-03',
 notes:'Propuesta no validada',coefficients:{f1:1,f2:2,f3:3},...changes});
test('Schema F2 independent from all earlier methods; blank document does not fabricate scores',()=>{
 const d=f2.blankF2('p','Proyecto');
 assert.equal(d.schema,'ambienta.conesa-libro-1997.dep-uip.f2');
 assert.equal(f2.F2_STORAGE,'ambienta-conesa-libro-1997-f2:');
 assert.equal(f2.validF2Document(d,'p'),true);
 assert.equal(f2.validF2Document(d,'q'),false);
 assert.deepEqual(d.screening.decisions,{});assert.deepEqual(d.uip.coefficients,{});
});
test('UIP are not fabricated for missing, out-of-range, foreign or untraceable coefficients',()=>{
 for(const bad of [
  panel({source:''}),panel({coefficients:{f1:1,f2:2}}),
  panel({coefficients:{f1:1,f2:2,f3:0}}),
  panel({coefficients:{f1:1,f2:2,f3:11}}),
  panel({coefficients:{f1:1,f2:2,f3:3,other:5}}),
  panel({sessionDate:'2027-02-29'})
 ])assert.equal(f2.proposeUIP(factors,bad),null);
});
test('UIP sums exactly to 1000 with stable largest-remainder order',()=>{
 const r=f2.proposeUIP(factors,panel());
 assert.deepEqual(r.allocations.map(v=>v.uip),[167,333,500]);
 assert.equal(r.total,1000);
 assert.deepEqual(f2.proposeUIP(factors,panel()).allocations,r.allocations);
 assert.deepEqual(f2.proposeUIP(factors,panel({coefficients:{f1:1,f2:1,f3:1}}))
  .allocations.map(v=>v.uip),[334,333,333]);
});
test('Tamiz requires documented, strictly greater threshold; no silent exclusion',()=>{
 const s=f2.blankF2('p','Proyecto').screening;
 const value=f1.calculateBookConesa(entry());
 assert.equal(value.absolute,28);
 assert.deepEqual(f2.treatmentProblems(undefined,value,s),['Tratamiento de depuración pendiente']);
 assert.deepEqual(f2.treatmentProblems({treatment:'normal',reason:'',evidence:''},value,s),[]);
 const d={treatment:'tamiz',reason:'Justificación explícita del tamiz en evaluación',evidence:'Acta de estudio'};
 assert(f2.treatmentProblems(d,value,s).length>0);
 const valid={...s,threshold:30,thresholdReason:'Umbral fundamentado en estudio',
  thresholdEvidence:'Acta 01'};
 assert.deepEqual(f2.treatmentProblems(d,value,valid),[]);
 assert(f2.treatmentProblems(d,value,{...valid,threshold:28}).some(v=>v.includes('no es menor')));
 assert(f2.treatmentProblems(d,value,{...valid,thresholdReason:''}).length>0);
});
test('Intangible/determinant require parallel reasoning even with uncertain sign',()=>{
 const s=f2.blankF2('p','Proyecto').screening;
 const d={treatment:'intangible',reason:'Falta indicador razonablemente representativo',evidence:'Informe técnico'};
 assert.deepEqual(f2.treatmentProblems(d,null,s),[]);
 assert.deepEqual(f2.treatmentProblems({...d,treatment:'determinante'},null,s),[]);
 assert(f2.treatmentProblems({...d,reason:''},null,s).length>0);
 assert(f2.treatmentProblems({...d,evidence:''},null,s).length>0);
});
test('Bandera roja needs adverse assessed F1 plus evidence, never automatically assigned',()=>{
 const negative=f1.calculateBookConesa(entry());
 const flag={enabled:true,reason:'Daño imposible de corregir en lugar crítico',evidence:'Acta',alternative:''};
 assert.deepEqual(f2.alertProblems(flag,negative),[]);
 assert(f2.alertProblems(flag,f1.calculateBookConesa(entry({sign:1}))).length>0);
 assert(f2.alertProblems(flag,f1.calculateBookConesa(entry({sign:'x'}))).length>0);
 assert(f2.alertProblems({...flag,reason:''},negative).length>0);
 assert(f2.alertProblems({...flag,evidence:''},negative).length>0);
 assert.deepEqual(f2.alertProblems({enabled:false,reason:'',evidence:'',alternative:''},negative),[]);
});
test('Normal needs signed complete F1; summary retains orphan decisions for review',()=>{
 const s=f2.blankF2('p','Proyecto').screening;
 const n={treatment:'normal',reason:'',evidence:''};
 assert(f2.treatmentProblems(n,null,s).length>0);
 assert(f2.treatmentProblems(n,f1.calculateBookConesa(entry({sign:'x'})),s).length>0);
 const impact={id:'f1::a1',factorId:'f1',actionId:'a1',entry:entry()};
 assert.equal(f2.screeningReport([impact],s).pending,1);
 const report=f2.screeningReport([impact],{...s,decisions:{
  'f1::a1':n,
  'lost::a2':{treatment:'determinante',reason:'Texto anterior',evidence:'Acta'}
 }});
 assert.equal(report.normal,1);
 assert(report.findings.some(x=>x.id==='lost::a2'&&x.warnings.join('').includes('desvinculado')));
});
test('Bad schema, coefficients and unsupported decisions are rejected',()=>{
 const d=f2.blankF2('p','Proyecto');
 d.uip.coefficients={f1:5};assert(f2.validF2Document(d,'p'));
 d.uip.coefficients.f2=25;assert(!f2.validF2Document(d,'p'));
 d.uip.coefficients.f2=1;
 d.screening.decisions['f1::a1']={treatment:'invisible',reason:'',evidence:''};
 assert(!f2.validF2Document(d,'p'));
});
