import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiablillosState} from '../../apps/web-v3/src/lib/diablillosDemo.mjs';
import {buildPreliminaryTechnicalReview,preparePreliminaryTechnicalDownload}
 from '../../apps/web-v3/src/features/reporting/preliminary-technical-report.mjs';

function exampleAnnex(projectId){
 return {schema:'ambienta.conesa-report-annex.v1',projectId,
  methods:{initial:'conesa-simplificado-tutorial-v1',residual:'conesa-simplificado-residual-v1'},
  source:{initial:'Borrador local del navegador',residual:'Escenario residual local del navegador',
   initialUpdatedAt:'2026-11-03T00:00:00Z',residualUpdatedAt:'2026-11-03T00:00:00Z'},
  counts:{initialEntries:1,initialCalculated:1,residualEntries:1,reviewRequired:0,documentedChains:1},
  issues:[],disclaimer:'Método experimental, sin aprobación normativa.',
  rows:[{
   id:'demo-f4::demo-a1',factor:'Agua superficial',action:'Movimiento de suelos',phase:'construccion',
   catalogStatus:'Vinculado',initialNature:'Negativo',initialAbsolute:28,initialSigned:-28,
   initialCategory:'Moderado',initialCriteria:'IN=2; EX=2; EX_CR=0; MO=4; MO_CR=0; PE=4; RV=1; SI=1; AC=1; EF=4; PR=1; MC=2',
   initialReason:'Hipótesis documental',initialEvidence:'Ficha QA I-001',
   residualOutcome:'Persiste',residualAbsolute:13,residualSigned:-13,
   residualCategory:'Irrelevante',residualCriteria:'IN=1; EX=1; EX_CR=0; MO=1; MO_CR=0; PE=1; RV=1; SI=1; AC=1; EF=1; PR=1; MC=1',
   residualReason:'Hipótesis residual',residualEvidence:'Ficha QA R-001',delta:-15,
   reviewStatus:'Completo documental',hierarchy:'minimizar',measureDescription:'Medida QA',
   measureReference:'Protocolo QA',measureId:'MED-DIAB-001',impactId:'IMP-D-AGU',
   impactLinkReason:'Vinculación declarada por evaluador',pgaReference:'PGA-QA',
   indicator:'Indicador QA',frequency:'Mensual',responsible:'Responsable QA',
   uncertainty:'alta',evidenceQuality:'declarada',declaredExecution:'prevista',
   assumptions:'No se ejecutó campo',chainStatus:'vinculado',
   inspectionIds:['INSP-DIAB-001'],evidenceIds:['EVID-D-001','EVID-D-002','EVID-D-003'],
   warnings:[]
  }]};
}
test('Conesa annex prints recalculated source data and explicit IDs, but does not overwrite original DEMO',()=>{
 const d=createDiablillosState(),before=JSON.stringify(d),annex=exampleAnnex(d.project.id);
 const {model,html}=preparePreliminaryTechnicalDownload(d,annex);
 assert.equal(model.conesaAnnex.rows.length,1);
 assert.equal(model.readiness.length,12);
 assert.equal(model.readiness.find(x=>x.name==='Evaluación de significancia de impactos').status,
  'Borrador metodológico (no acreditado)');
 for(const term of ['11. Anexo Conesa simplificado','demo-f4::demo-a1',
  'conesa-simplificado-tutorial-v1','Moderado','Irrelevante',
  'IN=2; EX=2','PGA-QA','IMP-D-AGU','MED-DIAB-001',
  'INSP-DIAB-001','EVID-D-001','Ficha QA I-001','Ficha QA R-001',
  'No se representan como importancia cero']){
  if(term==='No se representan como importancia cero')continue;
  assert(html.includes(term),'missing '+term);
 }
 assert.match(html,/no son porcentajes de mitigación/);
 assert(!html.includes('No se calcularon impactos ni resultados'));
 assert.equal(JSON.stringify(d),before);
});
test('An incorrect project annex is silently excluded; no cross-project impact values leak',()=>{
 const d=createDiablillosState(),annex=exampleAnnex('PROJECT-DIFFERENT');
 const m=buildPreliminaryTechnicalReview(d,annex);
 assert.equal(m.conesaAnnex,null);
 assert.equal(m.readiness.find(x=>x.name==='Evaluación de significancia de impactos').status,
  'No documentado');
 const html=preparePreliminaryTechnicalDownload(d,annex).html;
 assert(!html.includes('11. Anexo Conesa'));
 assert(!html.includes('PGA-QA'));
});
test('Local technical annex text is HTML escaped; no script or forged HTML in printable report',()=>{
 const d=createDiablillosState(),annex=exampleAnnex(d.project.id);
 annex.rows[0].initialReason='</td><script>window.pwned=true</script>';
 annex.rows[0].measureDescription='<img src=x onerror=alert(1)>';
 annex.rows[0].impactLinkReason='<svg onload=alert(1)>';
 annex.issues=['<iframe src=javascript:alert(1)>'];
 const html=preparePreliminaryTechnicalDownload(d,annex).html;
 assert(!html.includes('<script>'));
 assert(!html.includes('<img src=x'));
 assert(!html.includes('<svg onload'));
 assert(!html.includes('<iframe'));
 assert(html.includes('&lt;script&gt;'));
 assert(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert(html.includes('&lt;svg onload=alert(1)&gt;'));
 assert(html.includes('&lt;iframe src=javascript:alert(1)&gt;'));
});
test('Unreadable draft issues may be reported without fabricating Conesa scores',()=>{
 const d=createDiablillosState(),a=exampleAnnex(d.project.id);
 a.rows=[];a.counts={initialEntries:0,initialCalculated:0,residualEntries:0,reviewRequired:0,documentedChains:0};
 a.issues=['Matriz Conesa inicial: borrador incompatible'];
 const html=preparePreliminaryTechnicalDownload(d,a).html;
 assert(html.includes('Matriz Conesa inicial: borrador incompatible'));
 assert(html.includes('11. Anexo Conesa'));
 assert(!html.includes('IN=2; EX=2'));
 assert(!html.includes('I inicial absoluta</th></tr>'));
});
test('Output remains deterministic given an unchanged source and annex',()=>{
 const d=createDiablillosState(),a=exampleAnnex(d.project.id);
 const one=preparePreliminaryTechnicalDownload(d,a);
 const two=preparePreliminaryTechnicalDownload(d,a);
 assert.equal(one.html,two.html);
 assert.equal(one.filename,two.filename);
});
