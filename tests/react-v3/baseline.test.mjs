import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
async function module(file){const built=await require('esbuild').build({entryPoints:['v3/overrides/src/features/baseline/'+file+'.ts'],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));}
const m=await module('BaselineModel'),{baselineTraining}=await module('BaselineTraining');
const now='2026-11-04T12:00:00.000Z';
const definition=()=>({...m.blankIndicator(),name:'PM10 QA',factor:'Aire',unit:'µg/m³',method:'Método declarado QA',temporalSupport:'Promedio 24 h'});
const doc=()=>m.registerIndicator(m.emptyBaseline('DEMO-001','QA'),definition(),'i1',now);
const record=()=>({...m.blankObservation('i1'),start:'2026-11-01',end:'2026-11-02',location:'Estación QA',value:0,source:'Informe QA, tabla 1',author:'Responsable ficticio',uncertaintyNote:'No cuantificada; ejercicio QA'});
const withRecord=()=>m.registerObservation(doc(),record(),'r1',now);
test('Baseline opens empty, project scoped, without inferred environmental data',()=>{
 const d=m.emptyBaseline('DEMO-001','QA');assert(m.validBaseline(d,'DEMO-001'));assert(!m.validBaseline(d,'OTHER'));assert.equal(m.baselineSummary(d).active,0);assert.notEqual(m.baselineKey('A'),m.baselineKey('B'));
});
test('Baseline preserves definitions and accepts zero without treating it as missing',()=>{
 const d=doc(),before=JSON.stringify(d),next=m.registerObservation(d,record(),'r1',now);assert.equal(JSON.stringify(d),before);assert.equal(m.baselineResult(next.observations[0]),'0');assert.equal(m.baselineSummary(next).exact,1);assert.equal(m.baselineSummary(next).missing,0);
});
test('Baseline requires method, unit, temporal support and distinguishes case-sensitive SI units',()=>{
 for(const field of ['name','factor','unit','method','temporalSupport'])assert.throws(()=>m.registerIndicator(m.emptyBaseline('DEMO-001','QA'),{...definition(),[field]:''},'x',now));
 assert.throws(()=>m.registerIndicator(doc(),definition(),'i2',now),/idéntica/);
 const a=m.registerIndicator(m.emptyBaseline('DEMO-001','QA'),{...definition(),unit:'mg'},'i1',now);assert.equal(m.registerIndicator(a,{...definition(),unit:'Mg'},'i2',now).indicators.length,2);
});
test('Baseline rejects impossible dates, reverse periods and non-finite point values',()=>{
 assert(m.baselineDate('2024-02-29'));for(const date of ['2026-02-29','2026-02-30','2026-13-01','01/11/2026'])assert(!m.baselineDate(date));
 for(const patch of [{start:'2026-02-30'},{end:'2026-10-01'},{value:NaN},{value:Infinity},{value:null}])assert.throws(()=>m.registerObservation(doc(),{...record(),...patch},'x',now));
});
test('Baseline keeps censored results and ND limits separate from zero',()=>{
 const nd={...record(),qualifier:'not-detected',value:null,detectionLimit:0.5};const d=m.registerObservation(doc(),nd,'nd',now);assert.equal(m.baselineResult(d.observations[0]),'ND (LD 0.5)');assert.equal(m.baselineSummary(d).exact,0);assert.equal(m.baselineSummary(d).censored,1);
 for(const patch of [{value:0},{detectionLimit:0},{detectionLimit:null},{uncertainty:1}])assert.throws(()=>m.registerObservation(doc(),{...nd,...patch},'x',now));
 assert.equal(m.baselineResult({...record(),qualifier:'lt',value:0.5}),'< 0.5');
 assert.throws(()=>m.registerObservation(doc(),{...record(),qualifier:'missing',value:null},'x',now));
 assert(m.validBaseline(m.registerObservation(doc(),{...record(),qualifier:'missing',value:null,notes:'Campaña no realizada'},'x',now),'DEMO-001'));
});
test('Baseline requires sources, uncertainty context, paired WGS84 and scenario assumptions',()=>{
 for(const patch of [{source:''},{author:''},{uncertaintyNote:''},{latitude:10},{latitude:91,longitude:0},{latitude:0,longitude:-181},{uncertainty:-1},{scenario:'with',horizon:''}])assert.throws(()=>m.registerObservation(doc(),{...record(),...patch},'x',now));
 assert(m.validBaseline(m.registerObservation(doc(),{...record(),scenario:'without',horizon:'2030, hipótesis QA',latitude:0,longitude:0},'x',now),'DEMO-001'));
});
test('Baseline correction appends a new version and retains the original unchanged',()=>{
 const d=withRecord(),before=JSON.stringify(d),next=m.registerObservation(d,{...record(),value:2,supersedes:'r1',correctionReason:'Transcripción'},'r2',now);
 assert.equal(JSON.stringify(d),before);assert.equal(next.observations[0].value,0);assert.deepEqual(m.activeObservations(next).map(x=>x.id),['r2']);assert.equal(m.baselineSummary(next).history,1);
 assert.throws(()=>m.registerObservation(next,{...record(),supersedes:'r1',correctionReason:'Otra'},'r3',now),/última versión/);
});
test('Baseline rejects orphan, cyclic, forked and origin-changing histories on import',()=>{
 const d=withRecord();
 const child={...d.observations[0],id:'r2',supersedes:'r1',correctionReason:'QA'};
 for(const observations of [[{...d.observations[0],indicatorId:'unknown'}],[{...child,supersedes:'unknown'}],[{...child,id:'r1'}],[d.observations[0],{...child,origin:'synthetic'}],[d.observations[0],child,{...child,id:'r3'}],[{...d.observations[0],supersedes:'r2',correctionReason:'Cycle'},child]])assert(!m.validBaseline({...d,observations},'DEMO-001'));
 assert(!m.validBaseline({...d,unexpected:'x'},'DEMO-001'));assert(!m.validBaseline({...d,observations:[{...d.observations[0],value:'0'}]},'DEMO-001'));
});
test('Baseline imports add records atomically; key order is idempotent and conflicts never overwrite',()=>{
 const d=withRecord(),before=JSON.stringify(d);const reordered=JSON.parse(JSON.stringify(d),(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).reverse()):x);
 const same=m.mergeBaseline(d,reordered);assert.equal(same.changed,false);assert.equal(same.doc,d);
 const incoming=m.registerObservation(d,{...record(),value:3},'r2',now),merged=m.mergeBaseline(d,incoming);assert.equal(merged.doc.observations.length,2);assert.equal(JSON.stringify(d),before);
 assert.throws(()=>m.mergeBaseline(d,{...d,observations:[{...d.observations[0],value:5}]}),/Conflicto/);assert.equal(JSON.stringify(d),before);
 assert.throws(()=>m.mergeBaseline(d,{...d,projectId:'OTHER'}),/incompatible/);
});
test('Baseline CSV includes all versions, qualifiers, provenance and spreadsheet injection protection',()=>{
 const d=m.registerObservation(withRecord(),{...record(),qualifier:'not-detected',value:null,detectionLimit:0.2,source:'=malicious(); "quoted"',supersedes:'r1',correctionReason:'QA'},'r2',now),csv=m.baselineCsv(d);
 for(const value of ['Límite detección','No detectado','Corregido, conservado','Vigente','0.2','r1','r2','Fuente y calidad no verificadas',"'=malicious()",'""quoted""'])assert(csv.includes(value),value);
 assert(csv.startsWith('\uFEFF'));assert.equal(csv.split('\r\n').length,3);
});
test('Baseline opt-in examples reuse two report indicators per project and never claim measurements',()=>{
 for(const id of ['DEMO-001','DIAB-2026-DEMO']){const d=baselineTraining(id,'QA');assert(m.validBaseline(d,id));assert.equal(d.indicators.length,2);assert.equal(d.observations.length,4);assert(d.observations.every(o=>o.origin==='synthetic'&&o.basis==='estimated'&&o.latitude===null));assert.deepEqual(new Set(d.observations.map(o=>o.scenario)),new Set(['without','with']));assert(!m.mergeBaseline(d,baselineTraining(id,'QA')).changed);}
 assert.throws(()=>baselineTraining('UNKNOWN','QA'),/No hay ejemplo/);
});
