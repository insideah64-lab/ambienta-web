import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createPointAoi} from '../src/features/maps/aoi-model.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const ctx=await browser.newContext({viewport:{width:1360,height:900}});
 const page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/area');
 await page.locator('[data-study-areas-ready=true]').waitFor();
 await page.locator('[data-diablillos-demo-polygon=true]').waitFor();
 assert.equal(await page.getByRole('textbox',{name:'Latitud de consulta'}).inputValue(),'-24.7');
 assert.equal(await page.getByRole('textbox',{name:'Longitud de consulta'}).inputValue(),'-67.2');
 const seed=await page.evaluate(()=>({
  aoi:JSON.parse(localStorage.getItem('ambienta-aoi-diablillos-v3')),
  scenario:JSON.parse(localStorage.getItem('ambienta-study-areas-diablillos-v1'))
 }));
 assert.equal(seed.scenario.sourceKind,'synthetic');
 assert.equal(seed.scenario.status,'SIMULADO_NO_OFICIAL');
 assert.equal(seed.scenario.parent.features[0].geometry.coordinates.length,2);
 assert.equal(seed.scenario.summary.nonEmptyZoneCount,4);
 assert.equal(seed.aoi.radiusKm,5);
 assert.match(seed.scenario.caveat,/NO representa los límites/);
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 await page.locator('[data-page-role=gis-analysis]').waitFor();
 await page.locator('[data-map-engine=maplibre]').waitFor();
 const map=await page.locator('[data-map-engine=maplibre]').count();
 assert(map>0);
 await page.reload();
 await page.locator('[data-page-role=gis-analysis]').waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-study-areas-diablillos-v1')).createdAt),
  seed.scenario.createdAt);
 assert.deepEqual(errors,[]);
 // Existing user-drawn or imported work must not be replaced by a preview.
 const own=await browser.newContext();
 const existing=createPointAoi(-25,-68,3);
 const previous={...existing,savedAt:'2026-10-31T17:00:00Z'};
 await own.addInitScript(value=>{
  localStorage.setItem('ambienta-aoi-diablillos-v3',JSON.stringify(value));
 },previous);
 const page2=await own.newPage();
 await page2.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/area');
 await page2.locator('[data-aoi-active=true]').waitFor();
 const preserved=await page2.evaluate(()=>({
  aoi:JSON.parse(localStorage.getItem('ambienta-aoi-diablillos-v3')),
  study:localStorage.getItem('ambienta-study-areas-diablillos-v1')
 }));
 assert.equal(preserved.aoi.center.lat,-25);
 assert.equal(preserved.aoi.center.lon,-68);
 assert.equal(preserved.study,null);
 const generic=await browser.newContext();
 const page3=await generic.newPage();
 await page3.goto('http://127.0.0.1:8787/v3/index.html?caso=demo#/area');
 await page3.locator('[data-aoi-workbench=true]').waitFor();
 assert.equal(await page3.evaluate(()=>localStorage.getItem('ambienta-aoi-demo-v3')),null);
 assert.equal(await page3.evaluate(()=>localStorage.getItem('ambienta-study-areas-demo-v1')),null);
 console.log(JSON.stringify({result:'PASS',case:'Diablillos synthetic example',
  fourZones:4,oneHole:true,noOfficialClaim:true,noOverwrite:true,genericUntouched:true,
  startupVisibleOnMap:true,jsErrors:0}));
}finally{await browser.close();}
