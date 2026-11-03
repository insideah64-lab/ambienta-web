import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const ts=require('typescript');
const path='apps/web-v3/src/features/impacts/ConesaF3Model.ts';
const code=ts.transpileModule(await readFile(path,'utf8'),{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}
}).outputText;
const f3=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const example=()=>{
 const r=f3.blankF3Factor();
 r.indicator='Concentración del parámetro';
 r.unit='mg/L';
 r.composition='Magnitudes completas sin aditividad entre unidades';
 r.transformation={kind:'lineal',min:0,max:100,orientation:'decreciente',
  source:'Acta explícita de función didáctica',scope:'Solo laboratorio didáctico, dominio 0–100'};
 r.without={value:20,kind:'medido',date:'2026-10-01',source:'Ensayo documentado de línea base'};
 r.withProject={value:50,kind:'estimado',date:'2026-10-02',source:'Predicción documentada para ensayo'};
 return r;
};
test('F3a has distinct key and blank project does not invent CA',()=>{
 const d=f3.blankF3('p','Ejemplo');
 assert.equal(d.schema,f3.F3_SCHEMA);assert.equal(d.methodId,f3.F3_METHOD);
 assert.equal(f3.F3_STORAGE,'ambienta-conesa-libro-1997-f3a:');
 assert.deepEqual(d.records,{});
 assert(f3.validF3Document(d,'p'));
 assert(!f3.validF3Document(d,'q'));
 assert.equal(f3.evaluateF3Factor(undefined),null);
});
test('Only sourced transformations and both documented scenarios enable CA',()=>{
 const r=example();
 assert.deepEqual(f3.f3Problems(r),[]);
 const q=f3.evaluateF3Factor(r);
 assert(q);assert(Math.abs(q.without-0.8)<1e-12);
 assert(Math.abs(q.withProject-0.5)<1e-12);
 assert(Math.abs(q.delta+0.3)<1e-12);
 assert.equal(q.rawDelta,30);
 assert.notEqual(q.delta,0.7,'Do not transform the net 30 as if it were a scenario');
});
test('Quality direction is declared and not tied to metric sign by guess',()=>{
 const r=example();r.transformation.orientation='creciente';
 const q=f3.evaluateF3Factor(r);
 assert(q);assert.equal(q.delta,0.3);
});
test('No extrapolation, invalid interval, missing source or invalid date',()=>{
 const bad=[
  r=>{r.without.value=-1},
  r=>{r.withProject.value=101},
  r=>{r.transformation.min=100},
  r=>{r.transformation.max=0},
  r=>{r.transformation.source=''},
  r=>{r.transformation.scope=''},
  r=>{r.without.source=''},
  r=>{r.withProject.date='2026-02-30'},
  r=>{r.without.value=null},
  r=>{r.composition=''}
 ];
 for(const alter of bad){const r=example();alter(r);
  assert(f3.f3Problems(r).length>0);
  assert.equal(f3.evaluateF3Factor(r),null);
 }
});
test('Indirect indicator requires model evidence; no default imaginary curve',()=>{
 const r=example();r.method='modelo';
 assert.equal(f3.evaluateF3Factor(r),null);
 r.modelReference='Modelo indirecto documentado, versión 1';
 assert(f3.evaluateF3Factor(r));
 const fresh=f3.blankF3Factor();assert.equal(fresh.without.value,null);
 assert.equal(fresh.transformation.min,null);
 assert.equal(f3.evaluateF3Factor(fresh),null);
});
test('Schema validation blocks corrupt records but retains valid unfinished drafts',()=>{
 const d=f3.blankF3('p','Ejemplo');d.records.f1=f3.blankF3Factor();
 assert(f3.validF3Document(d,'p'));
 d.records.f1.without.value=Infinity;
 assert(!f3.validF3Document(d,'p'));
 d.records.f1.without.value=null;
 d.records.f1.without.kind='fabricado';
 assert(!f3.validF3Document(d,'p'));
});
