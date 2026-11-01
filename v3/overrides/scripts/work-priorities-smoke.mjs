import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const root='qa/ambienta-v356-prioridades';
await fs.mkdir(root,{recursive:true});
const address='http://127.0.0.1:8787/v3/index.html?caso=diablillos&perimetro=referencia-qa#/';
try{
 for(const [width,height] of [[1800,950],[1440,900],[1366,850]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(address);
  await page.locator('[data-work-attention=true]').waitFor();
  const first=await page.locator('.ref-hero').boundingBox();
  const work=await page.locator('[data-work-attention=true]').boundingBox();
  const metrics=await page.locator('.ref-metrics').boundingBox();
  const map=await page.locator('.ref-map-panel').boundingBox();
  assert(first&&work&&metrics&&map);
  assert(work.y>=first.y+first.height-1,'Work summary must follow project identity');
  assert(metrics.y>=work.y+work.height-1,'Metrics follow outstanding work');
  assert(map.y>=metrics.y+metrics.height-1,'Territorial map is for consultation, below actionable work');
  assert.equal(await page.locator('[data-work-follow-up=true]').innerText(),'2');
  assert.equal(await page.locator('[data-work-review=true]').innerText(),'4');
  assert.equal(await page.locator('[data-attention-key]').count(),4);
  assert.equal(await page.locator('[data-attention-key=inspections]').count(),0,
   'No inspection work should be invented where none is pending');
  const a=page.locator('[data-attention-key=findings]');
  assert.match(await a.innerText(),/Hallazgos para seguimiento/);
  assert.match(await page.locator('[data-work-attention=true]').innerText(),
   /no alertas ambientales ni incumplimientos comprobados/);
  const columns=await page.locator('.ref-dashboard-columns').evaluate(el=>
   getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
  assert.equal(columns,width>=1400?2:1);
  const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert(scroll<=width+6,'Avoid horizontal scroll at desktop');
  await page.screenshot({path:root+'/desktop-'+width+'-prioridades.png',animations:'disabled',
   fullPage:true});
  await a.click();
  await page.locator('.v2-page-intro h1').waitFor();
  assert.equal(await page.locator('.v2-page-intro h1').innerText(),'Auditorías');
  assert.deepEqual(errors,[]);
  await ctx.close();
 }
 // Check that actions route to the actual document registry without changing a record.
 const ctx=await browser.newContext({viewport:{width:1600,height:900}});
 const page=await ctx.newPage();await page.goto(address);
 await page.locator('[data-attention-key=evidence]').click();
 assert.equal(await page.locator('.v2-page-intro h1').innerText(),'Evidencias');
 await page.goto(address);
 await page.locator('[data-attention-key=measures]').click();
 assert.equal(await page.locator('.v2-page-intro h1').innerText(),'Plan de Gestión');
 console.log(JSON.stringify({result:'PASS',desktopOnly:true,workFirst:true,summary:{followUp:2,review:4},
   realModuleLinks:true,noFalseEnvironmentalEmergency:true,noHorizontalOverflow:true,screenshots:3}));
}finally{await browser.close();}
