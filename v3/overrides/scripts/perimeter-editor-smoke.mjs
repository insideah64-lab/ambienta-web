import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const url='http://127.0.0.1:8787/v3/index.html?caso=diablillos&poligono=ensayo#/area';
const polygon={type:'FeatureCollection',features:[{type:'Feature',
 properties:{name:'Perímetro test con entrante y hueco'},geometry:{type:'Polygon',coordinates:[
 [[-67.23,-24.718],[-67.208,-24.713],[-67.195,-24.718],[-67.174,-24.703],
 [-67.183,-24.688],[-67.203,-24.693],[-67.213,-24.683],[-67.232,-24.694],[-67.23,-24.718]],
 [[-67.209,-24.704],[-67.204,-24.704],[-67.204,-24.702],[-67.209,-24.702],[-67.209,-24.704]]
 ]}}]};
try{
 const context=await browser.newContext({viewport:{width:1450,height:1000},acceptDownloads:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(url);
 await page.locator('[data-perimeter-editor=true]').waitFor();
 // Obsolete URL should no longer generate the green rectangle and stripes.
 assert.equal(await page.locator('[data-study-areas-ready=true]').count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-study-areas-diablillos-v1')),null);
 await page.getByLabel('Importar perímetro GeoJSON o KML').setInputFiles({
  name:'perimetro-validado-solo-por-geometria.geojson',mimeType:'application/geo+json',
  buffer:Buffer.from(JSON.stringify(polygon))});
 await page.locator('[data-perimeter-candidate=true]').waitFor();
 await page.getByLabel('Procedencia del perímetro').fill('Ejemplo suministrado por operador QA, no oficial');
 await page.getByRole('button',{name:'Guardar este perímetro'}).click();
 await page.locator('[data-perimeter-saved=true]').waitFor();
 await page.locator('[data-perimeter-unzoned=true]').waitFor();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-perimeter-diablillos-v352')));
 assert.equal(saved.sourceType,'geojson');
 assert.equal(saved.geojson.features[0].geometry.coordinates.length,2);
 assert.equal(saved.status,'DECLARED_NOT_VERIFIED');
 assert.equal(await page.locator('[data-study-areas-ready=true]').count(),0);
 const d=page.waitForEvent('download');
 await page.getByRole('button',{name:'Exportar perímetro guardado'}).click();
 const downloaded=JSON.parse(fs.readFileSync(await (await d).path(),'utf8'));
 assert.deepEqual(downloaded.features[0].geometry.coordinates,saved.geojson.features[0].geometry.coordinates);
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 await page.locator('[data-user-perimeter-visible=true]').waitFor();
 assert.equal(await page.locator('[data-study-areas-ready=true]').count(),0);
 await page.reload();
 await page.locator('[data-user-perimeter-visible=true]').waitFor();
 const again=await page.evaluate(()=>localStorage.getItem('ambienta-perimeter-diablillos-v352'));
 assert.equal(JSON.parse(again).sourceSha256,saved.sourceSha256);
 // No stale demo may override a user polygon on a fresh page.
 const other=await browser.newContext({viewport:{width:1450,height:1000}});
 await other.addInitScript(value=>{
  localStorage.setItem('ambienta-perimeter-diablillos-v352',JSON.stringify(value));
 },saved);
 const page2=await other.newPage();await page2.goto(url);
 await page2.locator('[data-perimeter-saved=true]').waitFor();
 assert.equal(await page2.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-perimeter-diablillos-v352')).sourceSha256),
  saved.sourceSha256);
 assert.equal(await page2.evaluate(()=>localStorage.getItem('ambienta-study-areas-diablillos-v1')),null);
 // Test manual vertex editor through real browser clicks.
 const third=await browser.newContext({viewport:{width:1450,height:1000}});
 const page3=await third.newPage();await page3.goto(url);
 await page3.locator('[data-perimeter-draw-map=true]').waitFor();
 await page3.getByRole('button',{name:'Dibujar perímetro en el mapa'}).click();
 const canvas=page3.locator('.geo-perimeter-map-canvas canvas');
 await canvas.waitFor();
 const bound=await canvas.boundingBox();
 assert(bound);
 for(const [x,y] of [[.22,.25],[.72,.24],[.8,.53],[.62,.75],[.3,.7]]){
  await canvas.click({position:{x:bound.width*x,y:bound.height*y}});
 }
 assert.equal(await page3.locator('[data-perimeter-vertices=true]').innerText(),'5 vértices del trazado actual');
 await page3.getByRole('button',{name:'Cerrar y validar dibujo'}).click();
 await page3.locator('[data-perimeter-candidate=true]').waitFor();
 await page3.getByLabel('Procedencia del perímetro').fill('Dibujo ficticio del laboratorio');
 await page3.getByRole('button',{name:'Guardar este perímetro'}).click();
 await page3.locator('[data-perimeter-saved=true]').waitFor();
 assert.equal(await page3.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-perimeter-diablillos-v352')).sourceType),'drawn');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',importPreservesHoles:true,noRectangularZones:true,
  exportOriginalGeometry:true,displayOnGIS:true,drawingFunctional:true,noOverwrite:true,
  previewRemoved:true,jsErrors:0}));
}finally{await browser.close();}
