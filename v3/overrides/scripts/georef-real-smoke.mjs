import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

const URL='https://apis.datos.gob.ar/georef/api/v2.1/departamentos?provincia=66&max=50';
const response=await fetch(URL,{signal:AbortSignal.timeout(20000)});
assert.equal(response.status,200,'La API Georef oficial debe responder');
const body=await response.json();
assert(Array.isArray(body.departamentos)&&body.departamentos.length>=20);
const cachi=body.departamentos.find(d=>d.id==='66014');
assert(cachi&&cachi.centroide);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/area');
 await page.getByRole('textbox',{name:'Latitud de consulta'}).fill(String(cachi.centroide.lat));
 await page.getByRole('textbox',{name:'Longitud de consulta'}).fill(String(cachi.centroide.lon));
 await page.getByRole('textbox',{name:'Distancia de consulta'}).fill('10');
 await page.locator('[data-aoi-active="true"]').waitFor();
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 await page.locator('[data-page-role="gis-analysis"]').waitFor();
 await page.getByRole('button',{name:'Consultar centroides departamentales Georef · Salta'}).click();
 await page.locator('[data-georef-centroids="true"]').waitFor({timeout:20000});
 const state=page.locator('[data-aoi-clip="clipped_local"]');
 await state.waitFor();
 const line=await state.innerText();
 assert.match(line,/entidades locales intersectan el área/);
 assert.match(line,/0 con topología a revisar/);
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Descargar recorte GeoJSON'}).click();
 const download=await downloadPromise;
 const output=JSON.parse(fs.readFileSync(await download.path(),'utf-8'));
 assert.equal(output.properties.ambientaClip.hashScope,'normalized_georef_geojson');
 assert.equal(output.properties.ambientaClip.inputSha256,null);
 assert.match(output.properties.ambientaClip.derivedLayerSha256,/^[a-f0-9]{64}$/);
 const selected=output.features.find(f=>f.properties.name===cachi.nombre);
 assert(selected,'El punto de Cachi debe estar en la ventana centrada sobre Cachi');
 assert.equal(selected.geometry.type,'Point');
 assert(Math.abs(selected.geometry.coordinates[0]-cachi.centroide.lon)<1e-8);
 assert(Math.abs(selected.geometry.coordinates[1]-cachi.centroide.lat)<1e-8);
 assert.equal(await page.locator('[data-georef-centroids]').count(),1);
 assert.equal(errors.length,0);
 const v3Stored=await page.evaluate(()=>localStorage.getItem('ambienta-gis-diablillos-working-v3'));
 const v2Stored=await page.evaluate(()=>localStorage.getItem('ambienta-gis-diablillos-working-v1'));
 assert(v3Stored&&!v2Stored,'La V3 no puede modificar la capa local de V2');
 console.log(JSON.stringify({result:'PASS',source:URL,department:cachi.nombre,departmentId:cachi.id,
  officialCentroid:cachi.centroide,featuresIntersecting:output.features.length,
  exportDerivedHash:true,v2StorageUntouched:true,jsErrors:errors.length}));
}finally{
 await browser.close();
}
