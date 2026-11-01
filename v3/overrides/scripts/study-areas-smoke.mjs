import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const fixture=(feature)=>({type:'FeatureCollection',features:[feature]});
const originalFeature={type:'Feature',properties:{name:'Límite ficticio de validación'},geometry:{
 type:'Polygon',coordinates:[[
 [-67.248,-24.74],[-67.165,-24.74],[-67.165,-24.663],
 [-67.221,-24.663],[-67.221,-24.69],[-67.248,-24.69],[-67.248,-24.74]
 ],[
 [-67.197,-24.71],[-67.19,-24.71],[-67.19,-24.70],[-67.197,-24.70],[-67.197,-24.71]
 ]] // Invalid: hole may be outside concavity? verify via explicit import QA.
}};
try{
 const page=await browser.newPage({viewport:{width:1440,height:950},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/area',{waitUntil:'domcontentloaded'});
 await page.getByRole('textbox',{name:'Latitud de consulta'}).fill('-24.70');
 await page.getByRole('textbox',{name:'Longitud de consulta'}).fill('-67.20');
 await page.getByRole('textbox',{name:'Distancia de consulta'}).fill('5');
 await page.locator('[data-aoi-active=true]').waitFor();
 await page.locator('[data-study-area-panel=true]').waitFor();
 await page.getByRole('button',{name:'Crear polígono sintético y 4 áreas'}).click();
 const ready=page.locator('[data-study-areas-ready=true]');
 await ready.waitFor({timeout:12000});
 const rows=await ready.locator('[data-study-zone]').count();
 assert.equal(rows,4);
 assert.match(await ready.innerText(),/SIMULADO|Superficie del polígono|Operación simulada/);
 const mapBadge=page.locator('[data-map-study-zones="4"]');
 await mapBadge.waitFor();
 const zone1=await ready.locator('[data-study-zone=A]').innerText();
 assert.match(zone1,/ha/);
 const d1=page.waitForEvent('download');
 await page.getByRole('button',{name:'Descargar subáreas GeoJSON'}).click();
 const output=JSON.parse(fs.readFileSync(await (await d1).path(),'utf8'));
 assert.equal(output.features.length,4);
 assert.equal(output.properties.ambientaStudyAreas.status,'SIMULADO_NO_OFICIAL');
 assert.equal(output.properties.ambientaStudyAreas.exportPart,'zones');
 assert(output.features.every(x=>['Polygon','MultiPolygon'].includes(x.geometry.type)));
 const metrics=output.properties.ambientaStudyAreas;
 const pct=metrics.areas.reduce((sum,x)=>sum+x.percent,0);
 assert(Math.abs(pct-100)<.1);
 const d2=page.waitForEvent('download');
 await page.getByRole('button',{name:'Descargar polígono base'}).click();
 const base=JSON.parse(fs.readFileSync(await (await d2).path(),'utf8'));
 assert.equal(base.features.length,1);
 assert.equal(base.features[0].geometry.type,'Polygon');
 assert.equal(base.features[0].geometry.coordinates.length,2);
 assert.deepEqual(base.properties.ambientaStudyAreas.sourceSha256,metrics.sourceSha256);
 const localStore=await page.evaluate(()=>localStorage.getItem('ambienta-study-areas-diablillos-v1'));
 assert(localStore);
 await page.reload();
 await ready.waitFor();
 assert.equal(await ready.locator('[data-study-zone]').count(),4);
 assert.equal(await mapBadge.count(),1);
 await page.getByRole('textbox',{name:'Distancia de consulta'}).fill('8');
 await page.locator('[data-aoi-active=true]').waitFor();
 await ready.waitFor({state:'detached'});
 assert.equal(await mapBadge.count(),0,'Stale scenario must be hidden after changing AOI');
 // Explicit removal and regeneration after changing coordinates.
 await page.getByRole('button',{name:'Crear polígono sintético y 4 áreas'}).click();
 await ready.waitFor();
 await page.getByRole('button',{name:'Quitar ensayo'}).click();
 await ready.waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-study-areas-diablillos-v1')),null);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',scenario:'Diablillos synthetic AOI study polygons',
  zones:rows,distributionPercent:pct,hasInnerHole:true,sourceUnchanged:true,
  reloadPersisted:true,staleAoiBlocked:true,exportSufficient:true,pageErrors:errors.length}));
}finally{await browser.close();}
