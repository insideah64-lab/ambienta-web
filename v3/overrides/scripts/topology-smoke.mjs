import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const square=(x1,y1,x2,y2)=>[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]];
const fc=geometry=>({type:'FeatureCollection',features:[{type:'Feature',properties:{name:'QA topológico'},geometry}]});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8787/v3/index.html',{waitUntil:'domcontentloaded'});
 await page.getByRole('link',{name:'Área de estudio'}).click();
 await page.locator('[data-aoi-workbench="true"]').waitFor();
 await page.getByRole('textbox',{name:'Latitud de consulta'}).fill('-24.82');
 await page.getByRole('textbox',{name:'Longitud de consulta'}).fill('-65.45');
 await page.getByRole('textbox',{name:'Distancia de consulta'}).fill('20');
 await page.locator('[data-aoi-active="true"]').waitFor();
 await page.getByRole('textbox',{name:'Procedencia o descripción'}).fill('GeoJSON sintético para QA topológico');
 const original=fc({type:'Polygon',coordinates:[
  square(-67,-26,-64,-23),
  square(-65.47,-24.84,-65.43,-24.80)
 ]});
 const originalBytes=JSON.stringify(original);
 const hash=createHash('sha256').update(originalBytes).digest('hex');
 const upload=async(name,payload)=>{
  await page.getByLabel('Importar GeoJSON').setInputFiles({
   name,mimeType:'application/geo+json',buffer:Buffer.from(payload)
  });
 };
 await upload('hueco-qa.geojson',originalBytes);
 const complete=page.locator('[data-aoi-clip="clipped_local"]');
 await complete.waitFor();
 assert.match(await complete.innerText(),/1 de 1 entidades locales/);
 const exportButton=page.getByRole('button',{name:'Descargar recorte GeoJSON'});
 assert.equal(await exportButton.isEnabled(),true);
 let promise=page.waitForEvent('download');
 await exportButton.click();
 const clippedDownload=await promise;
 const clipped=JSON.parse(fs.readFileSync(await clippedDownload.path(),'utf-8'));
 assert.equal(clipped.features.length,1);
 assert.equal(clipped.features[0].geometry.type,'Polygon');
 assert.equal(clipped.features[0].geometry.coordinates.length,2,'Hueco interior conservado');
 assert.equal(clipped.properties.ambientaClip.inputSha256,hash);
 assert.equal(clipped.properties.ambientaClip.selectedCount,1);

 // The persisted source remains un-clipped. Only its sanitized working copy is kept.
 promise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Exportar GeoJSON depurado'}).click();
 const originalDownload=await promise;
 const source=JSON.parse(fs.readFileSync(await originalDownload.path(),'utf-8'));
 assert.deepEqual(source.features[0].geometry.coordinates,original.features[0].geometry.coordinates);

 // A concave U clipped above its connecting base must become two disconnected polygons.
 const concave=fc({type:'Polygon',coordinates:[[
  [-65.8,-25.3],[-65.1,-25.3],[-65.1,-24.3],[-65.4,-24.3],
  [-65.4,-25.1],[-65.5,-25.1],[-65.5,-24.3],[-65.8,-24.3],[-65.8,-25.3]
 ]]});
 await upload('concavo-qa.geojson',JSON.stringify(concave));
 await complete.waitFor();
 promise=page.waitForEvent('download');
 await exportButton.click();
 const concaveDownload=await promise;
 const concaveResult=JSON.parse(fs.readFileSync(await concaveDownload.path(),'utf-8'));
 assert.equal(concaveResult.features[0].geometry.type,'MultiPolygon');
 assert.equal(concaveResult.features[0].geometry.coordinates.length,2);

 // The same AOI must refuse a self-intersecting polygon, not silently fabricate a shape.
 const bowtie=fc({type:'Polygon',coordinates:[[
  [-65.60,-24.90],[-65.30,-24.70],[-65.60,-24.70],
  [-65.30,-24.90],[-65.60,-24.90]
 ]]});
 await upload('invalido-qa.geojson',JSON.stringify(bowtie));
 const partial=page.locator('[data-aoi-clip="partial_requires_gis"]');
 await partial.waitFor();
 assert.match(await partial.innerText(),/topología a revisar/);
 assert.equal(await exportButton.isDisabled(),true);
 assert.match(await partial.locator('[role=alert]').innerText(),/Recorte incompleto/);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',sourceSha256:hash,holesPreserved:1,concaveParts:2,
  originalUnchanged:true,invalidGeometryBlocked:true,pageErrors:errors.length}));
}finally{
 await browser.close();
}
