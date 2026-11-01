import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const out='qa/ambienta-v360-trace';
const base='http://127.0.0.1:8787/v3/index.html?caso=diablillos&perimetro=referencia-qa';
await fs.mkdir(out,{recursive:true});
try {
 for(const [width,height] of [[1800,950],[1440,900],[1366,850]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await ctx.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'#/pga');
  const before=await page.evaluate(()=>localStorage.getItem('ambienta-v2-diablillos-2026-demo'));
  await page.locator('[data-trace-empty-selection=true]').waitFor();
  assert.equal(await page.locator('[data-measure-trace]').count(),0);
  await page.locator('[data-select-measure="MED-DIAB-002"]').click();
  const panel=page.locator('[data-measure-trace="MED-DIAB-002"]');
  await panel.waitFor();
  assert.match(page.url(),/medida=MED-DIAB-002/);
  assert.deepEqual(await panel.locator('.ref-trace-counts strong').allInnerTexts(),['1','1','1','1']);
  assert.match(await panel.locator('[data-trace-group=inspections]').innerText(),/INSP-DIAB-002/);
  assert.match(await panel.locator('[data-trace-group=evidence]').innerText(),/EVID-D-004/);
  assert.match(await panel.locator('[data-trace-group=findings]').innerText(),/HALL-D-001/);
  assert.match(await panel.locator('[data-trace-group=actions]').innerText(),/AC-D-001/);
  assert.equal(await panel.locator('[data-trace-group=evidence] .ref-trace-record').count(),1);
  assert.match(await panel.innerText(),/no certifica/i);
  const geometry=await panel.evaluate(el=>{
   const r=el.getBoundingClientRect();
   return {width:r.width,height:r.height,scrollWidth:document.documentElement.scrollWidth,
    viewport:window.innerWidth};
  });
  assert(geometry.scrollWidth<=width+6,'No horizontal overflow in desktop');
  await panel.screenshot({path:out+'/trace-efluentes-'+width+'.png',animations:'disabled'});
  await page.screenshot({path:out+'/pga-'+width+'.png',animations:'disabled',fullPage:true});
  await page.reload();await page.locator('[data-measure-trace="MED-DIAB-002"]').waitFor();
  await page.locator('[data-select-measure="MED-DIAB-001"]').click();
  const water=page.locator('[data-measure-trace="MED-DIAB-001"]');
  await water.waitFor();
  assert.deepEqual(await water.locator('.ref-trace-counts strong').allInnerTexts(),['1','3','0','0']);
  assert.equal(await water.locator('[data-trace-group=actions] .ref-trace-record').count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-v2-diablillos-2026-demo')),before,
   'Read-only links may not alter original local case');
  await page.locator('.ref-trace-close').click();
  await page.locator('[data-trace-empty-selection=true]').waitFor();
  await page.getByRole('link',{name:'Resumen',exact:true}).click();
  await page.locator('.ref-commitment').first().click();
  await page.locator('[data-measure-trace="MED-DIAB-001"]').waitFor();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({viewport:width,traceHeight:Math.round(geometry.height),
    directSummaryLink:true,readOnly:true,counts:true,queryPersists:true}));
  await ctx.close();
 }
 console.log(JSON.stringify({result:'PASS',desktopOnly:true,sourceIds:true,
   zeroInventedRelations:true,readOnly:true,screenshots:6}));
}finally{await browser.close();}
