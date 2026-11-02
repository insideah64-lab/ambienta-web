import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const out='qa/ambienta-integral-report';
await fs.mkdir(out,{recursive:true});
try{
 for(const width of [1800,1440,1366]){
  const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/reportes');
  const panel=page.locator('[data-technical-report=preliminary]');
  await panel.waitFor();
  assert.match(await panel.innerText(),/Informe integrado del expediente/i);
  const gaps=panel.locator('[data-report-readiness]');
  assert.equal(await gaps.count(),12);
  assert((await panel.locator('[data-report-missing]').textContent()??'')!=='0');
  const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
  const promise=page.waitForEvent('download');
  await panel.locator('[data-export-technical-report=html]').click();
  const downloaded=await promise;
  assert.match(downloaded.suggestedFilename(),/^ambienta-diagnostico-preliminar-.*\.html$/);
  const html=await fs.readFile(await downloaded.path(),'utf8');
  assert.match(html,/<!doctype html>/i);
  assert.match(html,/No constituye Estudio de Impacto Ambiental/i);
  assert.match(html,/Diablillos/);
  assert.match(html,/MED-DIAB-002/);
  assert.match(html,/INSP-DIAB-002/);
  assert.match(html,/EVID-D-004/);
  assert.match(html,/HALL-D-001/);
  assert.match(html,/AC-D-001/);
  assert.match(html,/Matriz de información faltante para un EsIA/);
  assert(!html.includes('<script'));
  const rendered=await ctx.newPage();
  await rendered.setContent(html,{waitUntil:'domcontentloaded'});
  assert.equal(await rendered.locator('h2').count(),10);
  assert.equal(await rendered.locator('script').count(),0);
  assert.equal(await rendered.locator('table').count(),9);
  assert.deepEqual(errors,[]);
  const after=await page.evaluate(()=>JSON.stringify({...localStorage}));
  assert.equal(after,before,'The technical report cannot mutate localStorage');
  assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+6);
  await panel.screenshot({path:out+'/workbench-'+width+'.png',animations:'disabled'});
  await rendered.screenshot({path:out+'/print-report-'+width+'.png',fullPage:true,animations:'disabled'});
  console.log(JSON.stringify({width,result:'PASS',gaps:12,sectionCount:10,
   linksPreserved:true,readOnly:true,downloaded:true,screenshots:2}));
  await ctx.close();
 }
}finally{await browser.close()}
