import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1380,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/area');
 const area=page.locator('[data-page-role="territory-definition"]');
 await area.waitFor();
 assert.equal(await page.locator('[data-page-role="gis-analysis"]').count(),0);
 assert.equal(await area.locator('[data-aoi-workbench="true"]').count(),1);
 assert.equal(await area.locator('[data-study-area-panel="true"]').count(),1);
 assert.equal(await area.locator('[data-study-map-preview="true"]').count(),0);
 assert.equal(await area.locator('[data-perimeter-draw-map="true"]').count(),1);
 assert.equal(await area.locator('[data-sig-gateway]').count(),0);
 assert.equal(await area.getByLabel('Importar GeoJSON').count(),0);
 assert.equal(await area.locator('[data-spatial-links="overview"]').count(),1);
 await page.getByRole('textbox',{name:'Latitud de consulta'}).fill('-24.70');
 await page.getByRole('textbox',{name:'Longitud de consulta'}).fill('-67.20');
 await page.getByRole('textbox',{name:'Distancia de consulta'}).fill('5');
 await area.locator('[data-aoi-active="true"]').waitFor();
 await area.getByRole('button',{name:'Cargar solo ejemplo de geometría de ensayo (4 franjas)'}).click();
 await area.locator('[data-study-areas-ready="true"]').waitFor();
 const original=await page.evaluate(()=>localStorage.getItem('ambienta-study-areas-diablillos-v1'));
 assert(original);
 const areas=JSON.parse(original).summary;
 assert.equal(areas.zoneCount,4);
 assert(areas.parentHa>0);
 assert(Math.abs(areas.assignedHa-areas.parentHa)<areas.parentHa*.0005);
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 const gis=page.locator('[data-page-role="gis-analysis"]');
 await gis.waitFor();
 assert.equal(await area.count(),0);
 assert.equal(await gis.locator('[data-aoi-workbench]').count(),0);
 assert.equal(await gis.locator('[data-study-area-panel]').count(),0);
 assert.equal(await gis.getByRole('textbox',{name:'Latitud de consulta'}).count(),0);
 assert.equal(await gis.locator('[data-spatial-links="overview"]').count(),0);
 assert.equal(await gis.locator('[data-sig-gateway="configured"]').count(),1);
 assert.equal(await gis.getByLabel('Importar GeoJSON').count(),1);
 assert.equal(await gis.getByRole('button',{name:'Descargar recorte GeoJSON'}).count(),0);
 await gis.locator('[data-map-study-zones="4"]').waitFor();
 assert.equal(await gis.locator('[data-aoi-map="active"]').count(),1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-study-areas-diablillos-v1')),original);
 await page.reload();
 await gis.waitFor();
 await gis.locator('[data-map-study-zones="4"]').waitFor();
 assert.equal(await gis.getByLabel('Importar GeoJSON').count(),1);
 await page.getByRole('link',{name:'Área de estudio',exact:true}).click();
 await area.waitFor();
 await area.locator('[data-study-areas-ready="true"]').waitFor();
 assert.equal(await area.locator('[data-perimeter-draw-map="true"]').count(),1);
 assert.equal(await area.locator('[data-sig-gateway]').count(),0);
 await page.getByRole('textbox',{name:'Distancia de consulta'}).fill('7');
 await area.locator('[data-aoi-active="true"]').waitFor();
 await area.locator('[data-study-areas-ready="true"]').waitFor({state:'detached'});
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 await gis.waitFor();
 assert.equal(await gis.locator('[data-map-study-zones="4"]').count(),0,
  'GIS must not continue showing stale geographic zones');
 assert.equal(await gis.locator('[data-aoi-map="active"]').count(),1);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',feature:'nonredundant_area_gis_routes',
  territoryEditorUnique:true,gisImportExclusive:true,sharedStudyScenario:true,
  dataRestoredAfterReload:true,staleAoiZonesBlocked:true,domainUnchanged:true,pageErrors:0}));
}finally{await browser.close();}
