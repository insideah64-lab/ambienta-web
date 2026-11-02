import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createDiablillosState} from '../src/lib/diablillosDemo.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const out='qa/ambienta-v366-document-identity';
await fs.mkdir(out,{recursive:true});
const host='http://127.0.0.1:8787/v3/index.html?caso=diablillos';
const storageKey='ambienta-v2-diablillos-2026-demo';
async function session(state,width){
 const context=await browser.newContext({viewport:{width,height:900}});
 await context.addInitScript(({key,value})=>localStorage.setItem(key,value),
  {key:storageKey,value:JSON.stringify(state)});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 return {context,page,errors};
}
try{
 for(const width of [1800,1440,1366]){
  const duplicated=createDiablillosState();
  duplicated.evidence.push({...duplicated.evidence[3],
   reference:'SIMULADO://documento-homonimo'});
  const {context,page,errors}=await session(duplicated,width);
  const before=JSON.stringify(duplicated);
  await page.goto(host+'#/evidencias?evidencia=EVID-D-004');
  const note=page.locator('[data-record-ambiguous=evidence]');
  await note.waitFor();
  assert.match(await note.innerText(),/Identificador duplicado/);
  assert.match(await note.innerText(),/ni se siguieron vínculos/i);
  assert.equal(await page.locator('[data-record-focus="EVID-D-004"]').count(),0);
  await note.screenshot({path:out+'/duplicate-evidence-'+width+'.png',
   animations:'disabled'});
  await page.goto(host+'#/pga');
  const audit=page.locator('[data-link-audit="case"]');
  await audit.waitFor();
  assert((await audit.getAttribute('data-link-audit-count'))!=='0');
  await audit.locator('summary').click();
  const warning=audit.locator('[data-audit-kind=duplicate_id]');
  await warning.waitFor();
  assert.match(await warning.innerText(),/EVID-D-004/);
  assert.equal(await warning.locator('a').count(),0);
  assert.match(await warning.innerText(),/Sin enlace inequívoco/);
  await audit.screenshot({path:out+'/audit-duplicate-'+width+'.png',
   animations:'disabled'});
  const saved=await page.evaluate(k=>localStorage.getItem(k),storageKey);
  assert.equal(saved,before,'An audit view must not change the local record');
  assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+6);
  assert.deepEqual(errors,[]);
  await context.close();
  // A duplicate principal measure ID cannot generate or export a graph.
  const badMeasure=createDiablillosState();
  badMeasure.measures.push({...badMeasure.measures[1],title:'DEMO duplicado'});
  const second=await session(badMeasure,width);
  await second.page.goto(host+'#/pga?medida=MED-DIAB-002');
  const blocked=second.page.locator('[data-trace-ambiguous=true]');
  await blocked.waitFor();
  assert.match(await blocked.innerText(),/no se habilitó la exportación/);
  assert.equal(await second.page.locator('[data-export-graph]').count(),0);
  assert.equal(await second.page.evaluate(k=>localStorage.getItem(k),storageKey),
   JSON.stringify(badMeasure));
  assert.deepEqual(second.errors,[]);
  await blocked.screenshot({path:out+'/measure-ambiguous-'+width+'.png',
   animations:'disabled'});
  await second.context.close();
  console.log(JSON.stringify({width,result:'PASS',duplicateEvidence:true,
   ambiguousMeasure:true,readOnly:true,screenshots:3}));
 }
}finally{await browser.close()}
