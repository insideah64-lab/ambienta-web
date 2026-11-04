import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const built=await require('esbuild').build({entryPoints:['v3/overrides/src/features/impacts/BattelleModel.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const doc=()=>({...m.emptyBattelle('DEMO-001','QA ficticio'),alternative:'Alternativa QA',horizon:'2030, ambos escenarios',boundary:'Ámbito sintético'});
const entry=()=>({...m.emptyBattelleEntry(),indicator:'Indicador sintético',unit:'u QA',xWithout:20,xWith:50,kindWithout:'estimated',kindWith:'estimated',evidenceWithout:'SIN ficticio',evidenceWith:'CON ficticio',curveText:'0;1\n100;0',curveSource:'Curva lineal QA; no original del libro',convention:'CA 1 mejor y 0 peor, sin equivalencia normativa',evaluator:'Equipo QA'});
const approx=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('Battelle historical catalog: 78 unique parameters, 17 quantitative components, exact original budgets',()=>{
 assert.equal(m.BATTELLE_PARAMETERS.length,78);assert.equal(new Set(m.BATTELLE_PARAMETERS.map(p=>p.id)).size,78);
 assert.equal(new Set(m.BATTELLE_PARAMETERS.map(p=>p.componentId)).size,17);
 assert.deepEqual(Object.keys(m.BATTELLE_CATEGORIES).map(c=>m.BATTELLE_PARAMETERS.filter(p=>p.category===c).reduce((s,p)=>s+p.weight,0)),[240,402,153,205]);
 assert.equal(m.BATTELLE_PARAMETERS.find(p=>p.id==='bc-20').weight,25);
 assert.equal(m.BATTELLE_PARAMETERS.find(p=>p.id==='bc-21').weight,31);
});
test('Battelle missing observations are gaps, never zero or a complete environmental assessment',()=>{
 const d=doc(),before=JSON.stringify(d),s=m.summarizeBattelle(d);
 assert.equal(s.ready,0);assert.equal(s.delta,null);assert.equal(s.without,null);assert.equal(s.coveredWeight,0);assert.equal(s.complete,false);
 assert(s.rows.every(r=>r.flag==='gap'));assert.equal(JSON.stringify(d),before);
});
test('Battelle transforms both scenarios and weights their difference independently of Conesa/Leopold',()=>{
 const d=doc();d.entries['bc-20']=entry();const r=m.evaluateBattelle(d,m.BATTELLE_PARAMETERS[19]);
 assert.equal(r.ready,true);approx(r.without,.8);approx(r.withProject,.5);approx(r.uiaWithout,20);approx(r.uiaWith,12.5);approx(r.delta,-7.5);assert.equal(r.flag,'major');
 const s=m.summarizeBattelle(d);assert.equal(s.ready,1);assert.equal(s.coveredWeight,25);approx(s.delta,-7.5);assert.equal(s.complete,false);
});
test('Battelle non-monotonic manual curve, decimal commas and interpolation endpoints',()=>{
 const c=m.battelleCurve('0;0\n50;1\n100;0');assert.equal(c.error,'');approx(m.battelleQuality(c.nodes,20),.4);approx(m.battelleQuality(c.nodes,50),1);
 approx(m.battelleQuality(m.battelleCurve('0;0,2\n100;0,8').nodes,50),.5);
 assert.equal(m.battelleQuality(c.nodes,-1),null);assert.equal(m.battelleQuality(c.nodes,101),null);assert.equal(m.battelleQuality(c.nodes,null),null);
 for(const raw of ['','0;0','0;0\n0;1','100;0\n0;1','0;2\n100;1',';0\n100;1','0;NaN\n100;1','0;1\n1e309;0','0;0\n50;1\n50;0\n100;1'])assert(m.battelleCurve(raw).error,raw);
});
test('Battelle ecology warning boundaries: 5 through 10 inclusive minor, above 10 major',()=>{
 assert.equal(m.battelleFlag('ecology',1,.951),'none');assert.equal(m.battelleFlag('ecology',1,.95),'minor');assert.equal(m.battelleFlag('ecology',1,.9),'minor');assert.equal(m.battelleFlag('ecology',1,.899),'major');
});
test('Battelle other warning categories require absolute fall 0.1 before relative threshold 30%',()=>{
 for(const c of ['pollution','aesthetics','human']){
  assert.equal(m.battelleFlag(c,.2,.11),'none');assert.equal(m.battelleFlag(c,.8,.7),'minor');assert.equal(m.battelleFlag(c,1,.7),'major');assert.equal(m.battelleFlag(c,.8,.5),'major');
  assert.equal(m.battelleFlag(c,0,0),'none');assert.equal(m.battelleFlag(c,0,1),'none');assert.equal(m.battelleFlag(c,null,.5),'gap');
 }
});
test('Battelle incomplete provenance, common horizon and out-of-domain values block numerical results',()=>{
 for(const field of ['indicator','unit','kindWithout','kindWith','evidenceWithout','evidenceWith','curveSource','convention','evaluator']){
  const d=doc();d.entries['bc-20']={...entry(),[field]:''};assert.equal(m.evaluateBattelle(d,m.BATTELLE_PARAMETERS[19]).delta,null,field);
 }
 const d=doc();d.entries['bc-20']={...entry(),xWith:200};assert.equal(m.summarizeBattelle(d).ready,0);
 d.entries['bc-20']=entry();d.horizon='';assert.equal(m.summarizeBattelle(d).ready,0);
});
test('Battelle complete profile aggregates 1000 UIP without redistributing missing weights; ecosystems stays descriptive',()=>{
 const d=doc();for(const p of m.BATTELLE_PARAMETERS)d.entries[p.id]=entry();const s=m.summarizeBattelle(d);
 assert.equal(s.ready,78);assert.equal(s.coveredWeight,1000);approx(s.without,800);approx(s.withProject,500);approx(s.delta,-300);assert.equal(s.complete,false);
 d.ecosystems='Descripción QA';assert.equal(m.summarizeBattelle(d).complete,true);delete d.entries['bc-21'];const partial=m.summarizeBattelle(d);assert.equal(partial.coveredWeight,969);assert.equal(partial.complete,false);
});
test('Battelle validator rejects foreign profiles, malformed data and cross-project imports',()=>{
 const d=doc();d.entries['bc-20']=entry();assert.equal(m.validBattelle(JSON.parse(JSON.stringify(d)),'DEMO-001'),true);
 assert.equal(m.validBattelle(d,'OTHER'),false);assert.equal(m.validBattelle({...d,profile:'conesa'},'DEMO-001'),false);
 for(const entries of [null,[],{'bc-99':entry()},{'bc-20':null},{'bc-20':{...entry(),xWith:NaN}},{'bc-20':{...entry(),kindWith:'approved'}},{'bc-20':{...entry(),unit:3}}])assert.equal(m.validBattelle({...d,entries},'DEMO-001'),false);
});
test('Battelle CSV contains inputs, provenance and nulls with formula-injection protection',()=>{
 const d=doc();d.entries['bc-20']={...entry(),indicator:'=HYPERLINK("x")'};const before=JSON.stringify(d),csv=m.battelleCsv(d);
 assert(csv.includes("'="));assert(csv.includes('Fuente SIN'));assert(csv.includes('ΔUIA'));assert(csv.includes('bc-20'));assert(csv.includes('Nudos indicador;CA'));assert.equal(JSON.stringify(d),before);
});
