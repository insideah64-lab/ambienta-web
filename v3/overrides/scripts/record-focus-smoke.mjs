import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const out='qa/ambienta-v361-records';
await fs.mkdir(out,{recursive:true});
const url='http://127.0.0.1:8787/v3/index.html?caso=diablillos&perimetro=referencia-qa';
const specs=[
 {group:'inspections',id:'INSP-DIAB-002',kind:'inspection',field:'observada',path:'/monitoreo?inspeccion='},
 {group:'evidence',id:'EVID-D-004',kind:'evidence',field:'pendiente',path:'/evidencias?evidencia='},
 {group:'findings',id:'HALL-D-001',kind:'finding',field:'abierto',path:'/auditorias?hallazgo='},
 {group:'actions',id:'AC-D-001',kind:'action',field:'abierta',path:'/auditorias?accion='}
];
try{
 for(const [width,height] of [[1800,950],[1440,900],[1366,850]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(url+'#/pga?medida=MED-DIAB-002');
  await page.locator('[data-measure-trace="MED-DIAB-002"]').waitFor();
  const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
  for(const spec of specs){
   const source=page.locator('[data-trace-group='+spec.group+']');
   const link=source.locator('.ref-trace-record-link');
   assert.equal(await link.count(),1,'One deep link per trace record');
   assert((await link.getAttribute('href'))?.endsWith(spec.path+spec.id));
   await link.click();
   const focus=page.locator('[data-record-focus='+spec.id+']');
   await focus.waitFor();
   assert.equal(await focus.getAttribute('data-record-kind'),spec.kind);
   assert.match(await focus.innerText(),new RegExp(spec.field));
   assert.match(await focus.innerText(),/no certifica cumplimiento/i);
   assert.equal(await focus.locator('.ref-record-warnings').count(),0);
   const dims=await focus.evaluate(el=>{
    const rect=el.getBoundingClientRect();
    return {width:rect.width,scrollWidth:document.documentElement.scrollWidth,
      titleFont:parseFloat(getComputedStyle(el.querySelector('h3')).fontSize),
      fieldFont:parseFloat(getComputedStyle(el.querySelector('dd')).fontSize)};
   });
   assert(dims.scrollWidth<=width+6,'Unexpected horizontal overflow');
   assert(dims.titleFont>=22&&dims.fieldFont>=14,'Do not shrink record text');
   await focus.screenshot({path:out+'/desktop-'+width+'-'+spec.kind+'.png',
     animations:'disabled'});
   await page.reload();await page.locator('[data-record-focus='+spec.id+']').waitFor();
   const back=focus.locator('.ref-record-links-list a[href*="medida=MED-DIAB-002"]');
   assert.equal(await back.count(),1,'Exact measure backlink required');
   await back.click();
   await page.locator('[data-measure-trace="MED-DIAB-002"]').waitFor();
  }
  const after=await page.evaluate(()=>JSON.stringify({...localStorage}));
  assert.equal(after,before,'Read-only navigation must never alter persisted case');
  await page.goto(url+'#/evidencias?evidencia=EVID-NO-EXISTE');
  await page.locator('[data-record-missing=evidence]').waitFor();
  assert.match(await page.locator('[data-record-missing=evidence]').innerText(),/no encontrado/i);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(JSON.stringify({viewport:width,recordScreenshots:4,
    deepLinks:true,backLinks:true,readOnly:true,invalidRefHandled:true}));
 }
 console.log(JSON.stringify({result:'PASS',desktopOnly:true,recordTypes:4,
  directDeepLink:true,persistence:true,screenshots:12}));
}finally{await browser.close();}
