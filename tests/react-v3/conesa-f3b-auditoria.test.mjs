import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../v3/overrides/package.json',import.meta.url));
const esbuild=require('esbuild');
const built=await esbuild.build({
 entryPoints:['v3/overrides/src/features/impacts/ConesaF3DigitizationModel.ts'],
 bundle:true,write:false,format:'esm',platform:'node',target:'es2022'
});
const a=await import('data:text/javascript;base64,'+
 Buffer.from(built.outputFiles[0].text).toString('base64'));
const baseCurve=()=>({
 enabled:true,origin:'anejo4',source:'Conesa Fernández-Vítora, Guía metodológica para la evaluación del impacto ambiental, 3.ª ed. (1997), reimp. 2000, Anejo 4, I. Atmósfera, ficha 1 («Monóxido de carbono (1)»), p. 254.',
 bookPage:254,unit:'p.p.m.',indicator:'Concentración media diaria',
 points:[{m:0,ca:0},{m:10,ca:.5},{m:20,ca:1}],
 scope:'Ámbito de ensayo documentado',assessor:'Persona responsable',
 evidence:'Justificación de puntos',interpolation:'tramos-lineales'
});
const audit=()=>{
 const d=a.blankF3BAudit('study','factor01');
 Object.assign(d,{
  catalogId:'atm-01-co-diario',scanReference:'Anexo gráfico PDF página 245, recorte fuente',
  xPixelA:'100',xValueA:'0',xPixelB:'500',xValueB:'20',
  yPixelA:'500',yValueA:'0',yPixelB:'100',yValueB:'1',
  readerA:'Operador lectura A',readerB:'Operador lectura B',
  readingA:'0;0\n10;0,5\n20;1',readingB:'0;0\n10;0.5\n20;1',
  maxDeviationM:'0,1',maxDeviationCA:'0.02',
  toleranceBasis:'Resolución y tamaño del recorte justifican desvío instrumental indicado',
  correspondence:'El indicador, unidad, período y región se documentaron para este ensayo',
  reviewer:'Tercera persona revisora',reviewDate:'2026-11-04',
  reviewNotes:'Se cotejaron los ejes, las lecturas independientes y el gráfico original'
 });
 return d;
};
test('Preserves independent schema and validates partial drafts without invented readings',()=>{
 const d=a.blankF3BAudit('p','f');
 assert.equal(d.catalogId,'');
 assert.equal(d.readingA,'');
 assert.equal(d.approval,null);
 assert.equal(a.F3B_AUDIT_STORAGE,'ambienta-conesa-1997-f3b-auditoria:');
 assert(a.validF3BAudit(d,'p','f'));
 assert(!a.validF3BAudit(d,'other','f'));
 assert(!a.validF3BAudit({...d,readingA:Infinity},'p','f'));
 assert(!a.validF3BAudit({...d,approval:{fingerprint:42,recordedAt:''}},'p','f'));
});
test('Spanish decimal comma, finite numbers and strictly increasing readings',()=>{
 assert.equal(a.auditNumber('0,125'),.125);
 assert.equal(a.auditNumber('1e-2'),.01);
 for(const value of ['','2;5','Infinity','NaN','1,2,3','1 2','0x20']){
  assert.equal(a.auditNumber(value),null);
 }
 assert.deepEqual(a.parseIndependentReading('0;0\n10;0,5\n20;1').problems,[]);
 assert(a.parseIndependentReading('0;0\n0;0,5').problems.length>0);
 assert(a.parseIndependentReading('0;0\n20;1,2').problems.length>0);
 assert(a.parseIndependentReading('0;0\n15;1\n10;0,5').problems.length>0);
});
test('Two readers, axis anchors and nudos yield zero observed discrepancies',()=>{
 const d=audit(),c=baseCurve();
 assert.deepEqual(a.f3bAuditProblems(d,c),[]);
 assert.deepEqual(a.auditComparison(d,c),{
  maxDifferenceM:0,maxDifferenceCA:0,maxVersusCurveM:0,maxVersusCurveCA:0
 });
 d.approval={fingerprint:a.f3bAuditFingerprint(d,c),
  recordedAt:'2026-11-04T12:00:00Z'};
 assert(a.auditIsCurrent(d,c));
 assert(!a.auditIsCurrent(d,{...c,points:[{m:0,ca:0},{m:10,ca:.51},{m:20,ca:1}]}),
  'Every changed F3b nudo invalidates the old decision');
 assert(!a.auditIsCurrent({...d,reviewNotes:'Informe reemplazado'},c));
});
test('Rejects overstated or unsupported references and mismatched provenance',()=>{
 const cases=[
  (d,c)=>{d.catalogId='water-07-sustancias-toxicas';},
  (d,c)=>{d.catalogId='water-08-dbo';},
  (d,c)=>{c.source='Cita fabricada por el navegador';},
  (d,c)=>{c.bookPage=255;},
  (d,c)=>{c.unit='mg/m³';},
  (d,c)=>{c.origin='estudio';},
  (d,c)=>{d.readerB=d.readerA;},
  (d,c)=>{d.reviewer=d.readerB;},
  (d,c)=>{d.xPixelB=d.xPixelA;},
  (d,c)=>{d.yValueA='-1';},
  (d,c)=>{d.yValueA='0';d.yValueB='0';},
  (d,c)=>{d.maxDeviationCA='1.5';},
  (d,c)=>{d.maxDeviationM='1000';},
  (d,c)=>{d.reviewDate='2026-02-30';},
  (d,c)=>{d.scanReference='';},
  (d,c)=>{d.correspondence='';},
  (d,c)=>{d.toleranceBasis='';},
  (d,c)=>{d.readingB='0;0\n10;0,5\n20;1.1';},
  (d,c)=>{d.readingB='0;0\n10;0,7\n20;1';},
  (d,c)=>{d.readingB='0;0\n10;0,5';}
 ];
 for(const change of cases){
  const d=audit(),c=baseCurve();change(d,c);
  assert(a.f3bAuditProblems(d,c).length>0,JSON.stringify({d,c}));
 }
});
test('Exposes measured errors and does not silently deem tolerances authoritative',()=>{
 const d=audit(),c=baseCurve();
 d.readingB='0;0\n10,05;0,51\n20;1';
 assert(Math.abs(a.auditComparison(d,c).maxDifferenceM-.05)<1e-12);
 assert(Math.abs(a.auditComparison(d,c).maxDifferenceCA-.01)<1e-12);
 assert.deepEqual(a.f3bAuditProblems(d,c),[]);
 d.maxDeviationCA='0.005';
 assert(a.f3bAuditProblems(d,c).some(s=>s.includes('discrepancias')));
});
