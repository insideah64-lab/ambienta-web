import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const ts=require('typescript');
const transpile=async path=>ts.transpileModule(await readFile(path,'utf8'),{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}
}).outputText;
const source=await transpile('apps/web-v3/src/features/impacts/ConesaF3CurveModel.ts');
const f3b=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const base=()=>({
 indicator:'Calidad del parámetro ambiental',unit:'mg/L',method:'directo',
 modelReference:'',composition:'Conjunto de acciones con composición explícita',
 transformation:{kind:'lineal',min:null,max:null,orientation:'creciente',source:'',scope:''},
 without:{value:20,date:'2026-10-12',source:'Línea base certificada del laboratorio',kind:'medido'},
 withProject:{value:50,date:'2026-10-13',source:'Predicción documentada del informe técnico',kind:'estimado'}
});
const curve=(points=[{m:0,ca:0},{m:50,ca:1},{m:100,ca:0}])=>({
 ...f3b.blankF3BCurve(base()),source:'Conesa, Anejo 4, curva transcrita en ensayo documental',
 bookPage:267,scope:'Solo en este factor, región y condiciones documentadas',
 assessor:'Equipo de valoración',evidence:'Acta de revisión técnica de puntos con referencia',
 points
});
test('F3b is a new optional storage schema without fabricated points',()=>{
 const doc=f3b.blankF3BDoc('project','Proyecto');
 assert.equal(doc.schema,'ambienta.conesa-libro-1997.curvas-documentadas.f3b');
 assert.equal(f3b.F3B_STORAGE,'ambienta-conesa-libro-1997-f3b:');
 assert.deepEqual(doc.records,{});
 assert(f3b.validF3BDoc(doc,'project'));assert(!f3b.validF3BDoc(doc,'other'));
 const empty=f3b.blankF3BCurve(base());
 assert(empty.points.every(x=>x.m===null&&x.ca===null));
 assert.equal(f3b.evaluateF3BCurve(base(),empty),null);
});
test('Nonmonotonic intermediate maximum uses f(CON)-f(SIN), not f(delta M)',()=>{
 const a=base(),c=curve();
 assert.deepEqual(f3b.f3bProblems(a,c),[]);
 const q=f3b.evaluateF3BCurve(a,c);
 assert(q);assert(Math.abs(q.without-0.4)<1e-12);
 assert.equal(q.withProject,1);assert(Math.abs(q.delta-0.6)<1e-12);
 assert.equal(q.rawDelta,30);
 assert.equal(f3b.interpolateF3BCurve(c.points,30),0.6);
 assert.equal(f3b.interpolateF3BCurve(c.points,100),0);
});
test('Increasing, decreasing, and nonmonotonic values are all supported',()=>{
 const a=base();
 const rising=curve([{m:0,ca:0},{m:100,ca:1}]);
 assert(Math.abs(f3b.evaluateF3BCurve(a,rising).delta-0.3)<1e-12);
 const falling=curve([{m:0,ca:1},{m:100,ca:0}]);
 assert(Math.abs(f3b.evaluateF3BCurve(a,falling).delta+0.3)<1e-12);
 const valley=curve([{m:0,ca:1},{m:50,ca:0},{m:100,ca:1}]);
 assert(Math.abs(f3b.evaluateF3BCurve(a,valley).delta+0.6)<1e-12);
});
test('No extrapolation; no duplicated abscissae disguised as discontinuity',()=>{
 const a=base(),c=curve();
 a.withProject.value=200;
 assert.equal(f3b.evaluateF3BCurve(a,c),null);
 assert(f3b.f3bProblems(a,c).some(s=>s.includes('fuera del dominio')));
 assert.equal(f3b.interpolateF3BCurve(c.points,-1),null);
 assert.equal(f3b.interpolateF3BCurve(c.points,101),null);
 assert.equal(f3b.interpolateF3BCurve([{m:0,ca:0},{m:0,ca:1}],0),null);
 assert(f3b.f3bPointProblems([{m:2,ca:0.1},{m:1,ca:0.9}]).length>0);
 assert(f3b.f3bPointProblems([{m:0,ca:1},{m:1,ca:1.1}]).length>0);
});
test('No CA without provenance, local validity, factor binding and scenarios',()=>{
 const changes=[
  c=>{c.source=''},
  c=>{c.scope=''},
  c=>{c.assessor=''},
  c=>{c.evidence=''},
  c=>{c.bookPage=null},
  c=>{c.bookPage=267.5},
  c=>{c.bookPage=1200},
  c=>{c.indicator='Otro indicador'},
  c=>{c.unit='µg/L'},
  c=>{c.points[1].m=null},
  c=>{c.points[1].ca=Infinity},
  c=>{c.points[2].ca=-0.2},
  c=>{c.enabled=false}
 ];
 for(const change of changes){
  const a=base(),c=curve();change(c);
  assert.equal(f3b.evaluateF3BCurve(a,c),null);
 }
 for(const change of [
  a=>{a.without.source=''},
  a=>{a.without.date='2026-02-30'},
  a=>{a.withProject.value=null},
  a=>{a.method='modelo';a.modelReference=''},
  a=>{a.composition=''}
 ]){
  const a=base(),c=curve();change(a);
  assert.equal(f3b.evaluateF3BCurve(a,c),null);
 }
});
test('External sources and expert panels require evidence but not a Conesa page',()=>{
 const a=base();
 const c=curve();c.origin='expertos';c.bookPage=null;
 assert(f3b.evaluateF3BCurve(a,c));
 c.origin='estudio';assert(f3b.evaluateF3BCurve(a,c));
});
test('Damaged and foreign F3b drafts are rejected, valid partial drafts preserved',()=>{
 const doc=f3b.blankF3BDoc('project','Proyecto');doc.records.f1=f3b.blankF3BCurve(base());
 assert(f3b.validF3BDoc(doc,'project'));
 doc.records.f1.points[0].m=Infinity;assert(!f3b.validF3BDoc(doc,'project'));
 doc.records.f1.points[0].m=null;
 doc.records.f1.origin='not-supported';assert(!f3b.validF3BDoc(doc,'project'));
 doc.records.f1.origin='anejo4';
 doc.records.f1.points=Array.from({length:25},()=>({m:null,ca:null}));
 assert(!f3b.validF3BDoc(doc,'project'));
});
