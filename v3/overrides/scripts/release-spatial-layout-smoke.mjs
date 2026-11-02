import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
// V3.7.0: geometry assertions test whether two independent desktop controls overlap.
// Inputs intentionally overlay their own color swatches; those are NOT counted as collisions.
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const path='qa/ambienta-v365-desktop';
await fs.mkdir(path,{recursive:true});
try{
 for(const [width,height] of [[1800,950],[1440,900],[1366,850]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[]; page.on('pageerror',err=>errors.push(String(err)));
  // A perimeter alone is not a zone scenario. Follow the existing
  // V3.3 contract: explicitly create the four QA zones in this fresh browser.
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/area');
  await page.getByRole('textbox',{name:'Latitud de consulta'}).fill('-24.70');
  await page.getByRole('textbox',{name:'Longitud de consulta'}).fill('-67.20');
  await page.getByRole('textbox',{name:'Distancia de consulta'}).fill('5');
  await page.locator('[data-aoi-active=true]').waitFor();
  await page.getByRole('button',{name:'Cargar solo ejemplo de geometría de ensayo (4 franjas)'}).click();
  await page.locator('[data-study-areas-ready=true]').waitFor();
  const original=await page.evaluate(()=>localStorage.getItem('ambienta-v2-diablillos-2026-demo'));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/pga?medida=MED-DIAB-002');
  const badge=page.locator('[data-app-release]');
  await badge.waitFor();
  assert.equal(await badge.getAttribute('data-app-release'),'3.7.0');
  assert.match(await badge.innerText(),/WEB 3[.]7[.]0/);
  await page.locator('[data-measure-trace="MED-DIAB-002"]').waitFor();
  const spatial=page.locator('[data-spatial-links="measure"]');
  await spatial.waitFor();
  await page.locator('[data-spatial-record="MED-DIAB-002"]').waitFor();
  const layout=await page.evaluate(()=>{
   const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
   const collides=(a,b)=>a.left<b.right-2&&a.right>b.left+2&&a.top<b.bottom-2&&a.bottom>b.top+2;
   const failures=[];
   for(const row of document.querySelectorAll('[data-spatial-record]')){
    const rowBox=rect(row),title=rect(row.querySelector('.geo-links-record-title')), controls=rect(row.querySelector('.geo-links-zone-controls'));
    if(collides(title,controls))failures.push(row.getAttribute('data-spatial-record')+': título sobre controles');
    if(title.left<rowBox.left-2||title.right>rowBox.right+2||controls.right>rowBox.right+2)
      failures.push(row.getAttribute('data-spatial-record')+': desborde lateral');
    const swatches=[...row.querySelectorAll('.geo-links-zone-controls label')].map(rect);
    for(let i=1;i<swatches.length;i++)if(collides(swatches[i-1],swatches[i]))
      failures.push(row.getAttribute('data-spatial-record')+': controles SIG superpuestos');
   }
   const panel=document.querySelector('.geo-links-panel').getBoundingClientRect();
   const trace=document.querySelector('.ref-trace-panel').getBoundingClientRect();
   if(panel.top<trace.bottom-2&&panel.bottom>trace.top+2&&
      panel.left<trace.right-2&&panel.right>trace.left+2)
     failures.push('panel espacial y trazabilidad superpuestos');
   return {failures,overflow:document.documentElement.scrollWidth-window.innerWidth,records:document.querySelectorAll('[data-spatial-record]').length};
  });
  assert(layout.records>=4,'El panel debe mostrar registros espaciales de PGA');
  assert.deepEqual(layout.failures,[]);
  assert(layout.overflow<=6,'No se admite desbordamiento horizontal en escritorio');
  assert.deepEqual(errors,[]);
  const afterDomain=await page.evaluate(()=>localStorage.getItem('ambienta-v2-diablillos-2026-demo'));
  assert.equal(afterDomain,original,'La vista SIG no debe mutar el expediente');
  await badge.screenshot({path:path+'/release-'+width+'.png',animations:'disabled'});
  await spatial.screenshot({path:path+'/spatial-'+width+'.png',animations:'disabled'});
  console.log(JSON.stringify({width,layout,release:'3.7.0',result:'PASS'}));
  await context.close();
 }
}finally{await browser.close()}
