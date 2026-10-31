import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {createPointAoi} from '../src/features/maps/aoi-model.mjs';
import {buildIdesaWfsUrl} from '../src/features/maps/idesa-wfs.mjs';

const queryWindow=[-66.30,-25.12,-66.10,-24.96];
const sourceUrl=buildIdesaWfsUrl(queryWindow,'municipios');
const response=await fetch(sourceUrl,{signal:AbortSignal.timeout(15000)});
assert.equal(response.status,200,'IDESA WFS official endpoint must return HTTP 200');
const raw=await response.text();
assert(Buffer.byteLength(raw)<=1048576,'source WFS must fit browser size budget');
const collection=JSON.parse(raw);
assert.equal(collection.type,'FeatureCollection');
assert.equal(collection.features.length,collection.totalFeatures??collection.numberOfFeatures,'No silently truncated WFS records');
assert.equal(collection.features.length,5,'Laboratory fixture review required if official dataset changes');
const originalHash=createHash('sha256').update(raw).digest('hex');

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
 const errors=[];page.on('pageerror',err=>errors.push(String(err)));
 await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/area');
 const lat=-25.038755786,lon=-66.202620089,radiusKm=2;
 await page.getByRole('textbox',{name:'Latitud de consulta'}).fill(String(lat));
 await page.getByRole('textbox',{name:'Longitud de consulta'}).fill(String(lon));
 await page.getByRole('textbox',{name:'Distancia de consulta'}).fill(String(radiusKm));
 await page.locator('[data-aoi-active=true]').waitFor();
 await page.getByRole('textbox',{name:'Procedencia o descripción'}).fill('IDESA Salta WFS, geonode:municipios, consulta limitada de QA');
 const input=page.getByLabel('Importar GeoJSON');
 // Simulate a partial server response: it MUST be rejected without modifying the current source.
 const incomplete={...collection,features:collection.features.slice(0,2)};
 await input.setInputFiles({name:'municipios-parcial.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify(incomplete))});
 assert.match(await page.getByRole('alert').innerText(),/consulta WFS incompleta/i);
 assert.equal(await page.locator('[data-geojson-loaded]').count(),0);
 // Upload the complete, exact WFS body, retaining the imported SHA.
 await input.setInputFiles({name:'municipios-idesa.geojson',mimeType:'application/geo+json',buffer:Buffer.from(raw)});
 await page.locator('[data-geojson-loaded]').waitFor();
 assert.equal(await page.locator('[data-aoi-clip=clipped_local]').count(),1,
  'If real polygons need GIS review, do not export them as complete');
 assert.match(await page.locator('[data-geojson-loaded]').innerText(),new RegExp(originalHash));
 const request=page.waitForEvent('download');
 await page.getByRole('button',{name:'Descargar recorte GeoJSON'}).click();
 const downloaded=await request;
 const clip=JSON.parse(fs.readFileSync(await downloaded.path(),'utf8'));
 assert(clip.features.length>=1,'Cachi bbox must intersect at least one real municipality');
 assert(clip.features.every(f=>['Polygon','MultiPolygon'].includes(f.geometry.type)));
 assert.equal(clip.properties.ambientaClip.inputSha256,originalHash);
 const bbox=createPointAoi(lat,lon,radiusKm).bbox;
 const coords=(g)=>g.type==='Polygon'?g.coordinates:g.coordinates.flat();
 for(const feature of clip.features)for(const ring of coords(feature.geometry))
  for(const [x,y] of ring)assert(x>=bbox[0]-1e-7&&x<=bbox[2]+1e-7&&y>=bbox[1]-1e-7&&y<=bbox[3]+1e-7);
 const sourceExport=page.waitForEvent('download');
 await page.getByRole('button',{name:'Exportar GeoJSON depurado'}).click();
 const sourceDownload=await sourceExport;
 const derived=JSON.parse(fs.readFileSync(await sourceDownload.path(),'utf8'));
 assert.equal(derived.features.length,collection.features.length,'Source must remain uncut');
 assert.equal(errors.length,0);
 console.log(JSON.stringify({result:'PASS',provider:'IDESA Salta',typeName:'geonode:municipios',
  queryWindow,officialSourceCount:collection.features.length,
  selected:clip.features.length,originalHash,partialRejected:true,originalUncut:true,
  jsErrors:errors.length}));
}finally{await browser.close();}
