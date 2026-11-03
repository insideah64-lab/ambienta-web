import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const out='qa/ambienta-conesa-report';
await fs.mkdir(out,{recursive:true});
const initial={sign:-1,criteria:{
 IN:2,EX:2,EX_CR:0,MO:4,MO_CR:0,PE:4,RV:1,SI:1,AC:1,EF:4,PR:1,MC:2
},reason:'Revisión QA del agua',evidence:'DOCUMENTO-QA-AGUA-I'};
const residual={sign:-1,criteria:{
 IN:1,EX:1,EX_CR:0,MO:1,MO_CR:0,PE:1,RV:1,SI:1,AC:1,EF:1,PR:1,MC:1
},reason:'Escenario hipotético QA',evidence:'DOCUMENTO-QA-AGUA-R'};
const measure={hierarchy:'minimizar',description:'Control documental QA',
 reference:'PROTOCOLO-QA-01',pgaRef:'PGA-QA-01',pgaMeasureId:'MED-DIAB-001',
 responsible:'Responsable QA',indicator:'Indicador didáctico',
 frequency:'Mensual',uncertainty:'alta',quality:'declarada',
 assumptions:'No se realizaron mediciones reales',execution:'prevista'};
const id='demo-f2::demo-a3';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/reportes');
  const panel=page.locator('[data-technical-report="preliminary"]');
  await panel.waitFor();
  assert.equal((await panel.locator('[data-report-conesa-initial]').innerText()).trim(),'0');
  assert.equal((await panel.locator('[data-report-conesa-residual]').innerText()).trim(),'0');
  const projectId=await page.evaluate(()=>{
   const candidates=Object.keys(localStorage).filter(x=>x.startsWith('ambienta-v2-diablillos'));
   return candidates.length?JSON.parse(localStorage.getItem(candidates[0])).project.id:'DIAB-2026-DEMO';
  });
  const sourceFingerprint=JSON.stringify([
   initial.sign,initial.criteria.IN,initial.criteria.EX,initial.criteria.EX_CR,
   initial.criteria.MO,initial.criteria.MO_CR,initial.criteria.PE,
   initial.criteria.RV,initial.criteria.SI,initial.criteria.AC,
   initial.criteria.EF,initial.criteria.PR,initial.criteria.MC
  ]);
  await page.evaluate(({projectId,id,initial,residual,measure,sourceFingerprint})=>{
   localStorage.setItem('ambienta-conesa-simplificado-v1:'+projectId,JSON.stringify({
    schema:'ambienta.conesa-simplificado.v1',projectId,projectName:'Diablillos DEMO',
    updatedAt:'2026-11-03T00:00:00.000Z',entries:{[id]:initial}
   }));
   localStorage.setItem('ambienta-conesa-residual-v1:'+projectId,JSON.stringify({
    schema:'ambienta.conesa-residual.v1',projectId,
    method:'conesa-simplificado-residual-v1',
    updatedAt:'2026-11-03T00:10:00.000Z',entries:{[id]:{
     initialFingerprint:sourceFingerprint,outcome:'persiste',residual,
     impactId:'IMP-D-AGU',impactLinkReason:'La interacción de agua está vinculada explícitamente al impacto hídrico DEMO',
     measure
    }}
   }));
  },{projectId,id,initial,residual,measure,sourceFingerprint});
  await page.reload();
  await panel.waitFor();
  assert.equal((await panel.locator('[data-report-conesa-initial]').innerText()).trim(),'1');
  assert.equal((await panel.locator('[data-report-conesa-residual]').innerText()).trim(),'1');
  assert.equal((await panel.locator('[data-report-conesa-chains]').innerText()).trim(),'1');
  assert.equal((await panel.locator('[data-report-conesa-review]').innerText()).trim(),'0');
  assert.equal(await panel.locator('[data-report-readiness]').count(),12);
  assert((await panel.innerText()).includes('Borrador metodológico (no acreditado)'));
  const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
  const [download]=await Promise.all([
   page.waitForEvent('download'),panel.locator('[data-export-technical-report="html"]').click()
  ]);
  const html=await fs.readFile(await download.path(),'utf8');
  for(const term of [
   '11. Anexo Conesa simplificado','demo-f2::demo-a3','DOCUMENTO-QA-AGUA-I',
   'DOCUMENTO-QA-AGUA-R','MED-DIAB-001','IMP-D-AGU',
   'INSP-DIAB-001','EVID-D-001','PGA-QA-01',
   'No se realizaron mediciones reales','conesa-simplificado-residual-v1',
   'Las diferencias entre puntuaciones ordinales no son porcentajes'
  ])assert(html.includes(term),'Missing real draft value: '+term);
  assert(!html.includes('<script'));
  const render=await context.newPage();
  await render.setContent(html,{waitUntil:'domcontentloaded'});
  assert.equal(await render.locator('h2').count(),11);
  assert.equal(await render.locator('#conesa-anexo table').count(),3);
  assert.equal(await render.locator('script').count(),0);
  const firstTable=render.locator('#conesa-anexo table').first();
  assert.match(await firstTable.innerText(),/\b28\b/);
  assert.match(await firstTable.innerText(),/\b13\b/);
  assert.match(await firstTable.innerText(),/-15/);
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before,
   'Generating HTML must not mutate source drafts or DEMO data');
  await panel.screenshot({path:out+'/report-panel-'+width+'.png',animations:'disabled'});
  await render.screenshot({path:out+'/report-annex-'+width+'.png',fullPage:true,animations:'disabled'});

  // An out-of-scale RV=3 must not leak a numeric initial Conesa result into the report.
  await page.evaluate(projectId=>{
   const k='ambienta-conesa-simplificado-v1:'+projectId,d=JSON.parse(localStorage.getItem(k));
   d.entries['demo-f2::demo-a3'].criteria.RV=3;
   localStorage.setItem(k,JSON.stringify(d));
  },projectId);
  await page.reload();
  await panel.waitFor();
  assert.equal((await panel.locator('[data-report-conesa-initial]').innerText()).trim(),'0');
  assert((await panel.innerText()).includes('no cumple el esquema'));
  const [invalidDownload]=await Promise.all([
   page.waitForEvent('download'),panel.locator('[data-export-technical-report="html"]').click()
  ]);
  const invalidHtml=await fs.readFile(await invalidDownload.path(),'utf8');
  const invalidRender=await context.newPage();
  await invalidRender.setContent(invalidHtml,{waitUntil:'domcontentloaded'});
  assert((await invalidRender.locator('#conesa-anexo').innerText()).includes('borrador local no cumple'));
  assert(!(await invalidRender.locator('#conesa-anexo table').first().innerText()).includes('-28'),
   'Invalid RV cannot be used as an accepted initial score');
  assert.deepEqual(errors,[]);
  assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+6);
  console.log(JSON.stringify({result:'PASS',width,sections:11,annexTables:3,
   initial:28,residual:13,delta:-15,linkedImpact:true,storedIntact:true,
   invalidRVGuard:true,errors:0}));
  await context.close();
 }
}finally{await browser.close();}
