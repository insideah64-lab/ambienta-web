import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base='http://127.0.0.1:8787/v3/index.html?caso=diablillos&perimetro=referencia-qa#/';
const out='qa/ambienta-v359-commitments';
await fs.mkdir(out,{recursive:true});
try{
 for(const [width,height] of [[1800,950],[1440,900],[1366,850]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base);
  const panel=page.locator('.ref-commitments');await panel.waitFor();
  const rows=panel.locator('.ref-commitment');
  assert.equal(await rows.count(),4);
  assert.equal(await panel.locator('.ref-progress-track').count(),0,
   'Nonquantitative measure status must never render as percent progress bar');
  assert.equal(await panel.locator('[role="progressbar"]').count(),0);
  const expected=['En ejecución','En revisión','Borrador','Borrador'];
  for(let i=0;i<expected.length;i++){
   const row=rows.nth(i);
   assert.equal(await row.locator('.ref-stage-tag').innerText(),expected[i],
    'State must come from the actual case fixture, not a modeled percentage');
   assert.match(await row.locator('small').innerText(),new RegExp('MED-DIAB-00'+(i+1)));
   assert((await row.getAttribute('href'))?.endsWith('/pga?medida=MED-DIAB-00'+(i+1)),
    'Dashboard must deep-link to exact measure');
  }
  const footer=await panel.locator('.ref-panel-foot').innerText();
  assert.match(footer,/sin estimación de avance físico ni de cumplimiento ambiental/i);
  assert.match(footer,/0 de 4 medidas figuran como verificadas documentalmente/i);
  const dims=await panel.evaluate(el=>{
   const items=[...el.querySelectorAll('.ref-commitment')];
   const rect=x=>{const r=x.getBoundingClientRect();return {height:r.height,width:r.width,x:r.x,y:r.y}};
   return {rows:items.map(rect),panel:rect(el),
    titleFont:parseFloat(getComputedStyle(items[0].querySelector('strong')).fontSize),
    metaFont:parseFloat(getComputedStyle(items[0].querySelector('small')).fontSize),
    statusFont:parseFloat(getComputedStyle(items[0].querySelector('.ref-stage-tag')).fontSize),
    docScrollWidth:document.documentElement.scrollWidth,viewport:window.innerWidth};
  });
  assert(dims.rows.every(r=>r.height>=70&&r.height<=130),
   'Measure items should be compact without clipping: '+JSON.stringify(dims.rows));
  assert(dims.titleFont>=15&&dims.metaFont>=13&&dims.statusFont>=12);
  assert(dims.docScrollWidth<=width+6,'No horizontal scrolling in desktop');
  await panel.screenshot({path:out+'/commitments-'+width+'.png',animations:'disabled'});
  await page.screenshot({path:out+'/desktop-'+width+'.png',animations:'disabled',fullPage:true});
  await rows.first().click();await page.locator('.v2-page-intro h1').waitFor();
  assert.equal(await page.locator('.v2-page-intro h1').innerText(),'Plan de Gestión');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(JSON.stringify({viewport:width,rows:dims.rows.map(x=>Math.round(x.height)),
   font:{title:dims.titleFont,meta:dims.metaFont,status:dims.statusFont}}));
 }
 console.log(JSON.stringify({result:'PASS',categoricalStatus:true,zeroFakeProgress:true,
  sourceRecordsPreserved:true,moduleNavigation:true,desktopOnly:true,screenshots:6}));
}finally{await browser.close();}
