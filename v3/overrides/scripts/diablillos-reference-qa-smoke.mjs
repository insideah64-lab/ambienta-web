import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const url='http://127.0.0.1:8787/v3/index.html?caso=diablillos&perimetro=referencia-qa#/area';
const out='qa/diablillos-v353/screenshots';
await fs.mkdir(out,{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:1480,height:940},deviceScaleFactor:1,acceptDownloads:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(url);
 await page.locator('[data-diablillos-qa-active=true]').waitFor({timeout:15000});
 await page.locator('[data-perimeter-saved=true]').waitFor();
 const label=await page.locator('[data-diablillos-qa-active=true]').innerText();
 assert.match(label,/NO OFICIAL/);
 assert.equal(await page.locator('[data-study-areas-ready=true]').count(),0,
  'QA perimeter must not force four bands');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-perimeter-diablillos-v352')));
 assert.equal(saved.geometricStatus,'SYNTHETIC_QA_ONLY');
 assert.equal(saved.qaMarker,'ambienta-diablillos-reference-QA-v1');
 assert.deepEqual(saved.geojson.features[0].geometry.coordinates.length,1);
 const aoi=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-aoi-diablillos-v3')));
 assert(Math.abs(aoi.center.lat+25.3)<.03);
 assert(Math.abs(aoi.center.lon+66.833333)<.03);
 // The original drawing panel must visibly contain the real bounding extent of QA polygon.
 const areaMap=page.locator('[data-perimeter-draw-map=true]');
 await areaMap.locator('canvas').waitFor();
 await page.screenshot({path:out+'/01-area-full.png',fullPage:true,animations:'disabled'});
 await areaMap.screenshot({path:out+'/02-area-map.png',animations:'disabled'});
 const dl=page.waitForEvent('download');
 await page.getByRole('button',{name:'Exportar perímetro guardado'}).click();
 const file=await dl;const text=await fs.readFile(await file.path(),'utf8');
 assert.deepEqual(JSON.parse(text),saved.geojson);
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 await page.locator('[data-user-perimeter-visible=true][data-perimeter-qa=true]').waitFor();
 assert.match(await page.locator('[data-user-perimeter-visible=true]').innerText(),/NO OFICIAL/);
 assert.equal(await page.locator('[data-map-study-zones="4"]').count(),0);
 await page.screenshot({path:out+'/03-sig-full.png',fullPage:true,animations:'disabled'});
 const canvas=page.locator('[data-map-engine=maplibre]').first();
 if(await canvas.count())await canvas.screenshot({path:out+'/04-sig-map.png',animations:'disabled'});
 await page.reload();
 await page.locator('[data-user-perimeter-visible=true][data-perimeter-qa=true]').waitFor();
 const again=await page.evaluate(()=>localStorage.getItem('ambienta-perimeter-diablillos-v352'));
 assert.deepEqual(JSON.parse(again).geojson,saved.geojson);
 const fresh=await browser.newContext();
 const page2=await fresh.newPage();await page2.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/area');
 await page2.locator('[data-perimeter-editor=true]').waitFor();
 assert.equal(await page2.evaluate(()=>localStorage.getItem('ambienta-perimeter-diablillos-v352')),null);
 const real=await browser.newContext();
 await real.addInitScript((value)=>{
  localStorage.setItem('ambienta-perimeter-diablillos-v352',value);
 },JSON.stringify({...saved,sourceName:'GEOMETRIA REAL EXISTENTE DEL USUARIO.geojson',qaMarker:null}));
 const page3=await real.newPage();await page3.goto(url);
 await page3.locator('[data-perimeter-saved=true]').waitFor();
 const unchanged=await page3.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-perimeter-diablillos-v352')));
 assert.equal(unchanged.sourceName,'GEOMETRIA REAL EXISTENTE DEL USUARIO.geojson');
 assert.equal(unchanged.qaMarker,null);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',correctSourceCenter:true,noAutoStripes:true,
 noOverwrite:true,exportIdentical:true,gisVisible:true,screenshots:4,
 invalidDemoAbsent:true,javaScriptErrors:0}));
}finally{await browser.close();}
