import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {syntheticStudyPolygon} from '../src/features/maps/study-areas.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1400,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/area');
 for(const [name,value] of [['Latitud de consulta','-24.70'],['Longitud de consulta','-67.20'],['Distancia de consulta','5']])
  await page.getByRole('textbox',{name}).fill(value);
 await page.locator('[data-aoi-active=true]').waitFor();
 const bbox=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-aoi-diablillos-v3')).bbox);
 const xy=(x,y)=>[Number((bbox[0]+(bbox[2]-bbox[0])*x).toFixed(9)),
  Number((bbox[1]+(bbox[3]-bbox[1])*y).toFixed(9))];
 const polygon=JSON.stringify({type:'FeatureCollection',features:[syntheticStudyPolygon(bbox)]});
 const polySha=createHash('sha256').update(polygon).digest('hex');
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 await page.getByRole('textbox',{name:'Procedencia o descripción'}).fill('Perímetro ficticio importado para QA');
 await page.getByLabel('Importar GeoJSON').setInputFiles({
  name:'perimetro-qa.geojson',mimeType:'application/geo+json',buffer:Buffer.from(polygon)});
 await page.locator('[data-geojson-loaded=true]').waitFor();
 await page.getByRole('link',{name:'Área de estudio',exact:true}).click();
 await page.getByRole('button',{name:'Asignar 4 áreas a un polígono importado'}).click();
 await page.locator('[data-study-areas-ready=true]').waitFor();
 const study=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-study-areas-diablillos-v1')));
 assert.equal(study.sourceHash,polySha);
 assert.equal(study.sourceKind,'imported');
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 const gis=page.locator('[data-page-role=gis-analysis]');
 await gis.locator('[data-geojson-loaded=true]').waitFor();
 const before=await page.evaluate(()=>localStorage.getItem('ambienta-gis-diablillos-working-v3'));
 const points=JSON.stringify({type:'FeatureCollection',features:[
  {type:'Feature',properties:{name:'Punto A ficticio'},geometry:{type:'Point',coordinates:xy(.26,.5)}},
  {type:'Feature',properties:{name:'Hueco ficticio'},geometry:{type:'Point',coordinates:xy(.18,.36)}}
 ]});
 const ptsSha=createHash('sha256').update(points).digest('hex');
 await gis.getByLabel('Importar puntos para análisis SIG').setInputFiles({
  name:'puntos-independientes.geojson',mimeType:'application/geo+json',buffer:Buffer.from(points)});
 await gis.locator('[data-point-context=ready]').waitFor();
 await gis.getByRole('button',{name:'Analizar puntos contra las subáreas'}).click();
 const result=gis.locator('[data-point-analysis-ready=true]');await result.waitFor();
 assert.equal(await result.locator('[data-point-inside=true]').innerText(),'1');
 assert.equal(await result.locator('[data-point-outside=true]').innerText(),'1');
 assert.equal(await result.locator('[data-point-review=true]').innerText(),'0');
 assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-gis-diablillos-working-v3')),before);
 const scenario=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-study-areas-diablillos-v1')));
 assert.equal(scenario.sourceHash,polySha);
 assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-gis-diablillos-working-v3')!==null),true);
 await gis.locator('[data-map-point-analysis=active]').waitFor();
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',sourcePolygonHash:polySha,
  independentPointHash:ptsSha,inside:1,holeOutside:1,originalPolygonPreserved:true,
  resultNotSavedAsSource:true,pageErrors:0}));
}finally{await browser.close();}
