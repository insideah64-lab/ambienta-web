import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1420,height:900},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/monitoreo');
 const mon=page.locator('[data-measurements-panel]');await mon.waitFor();
 await mon.getByLabel('Medida PGA').selectOption('MED-DIAB-001');
 const fill=async(name,value)=>mon.getByLabel(name,{exact:true}).fill(value);
 await fill('ID de muestra','SINTETICA-V39-1');
 await fill('Identificador de estación','EST-V39-QA');
 await fill('Parámetro o analito','Parámetro ficticio QA');
 await fill('Valor numérico declarado','12');
 await fill('Fecha y hora de toma','2026-11-01T11:00');
 await fill('Método analítico','Método sintético QA sin laboratorio');
 await fill('Identificador del informe o fuente','REF-DEMO-V39');
 await fill('Responsable declarante','Proponente QA');
 await mon.getByRole('button',{name:'Registrar medición declarada'}).click();
 await mon.locator('[data-measurement-id=MUE-0001]').waitFor();
 const measurementBefore=await page.evaluate(()=>localStorage.getItem('ambienta-v38-measurements-diablillos'));
 const domainBefore=await page.evaluate(()=>localStorage.getItem('ambienta-v2-diablillos-2026-demo'));
 await page.getByRole('link',{name:'Área de estudio',exact:true}).click();
 for(const [name,val] of [['Latitud de consulta','-24.70'],['Longitud de consulta','-67.20'],['Distancia de consulta','5']])
  await page.getByRole('textbox',{name}).fill(val);
 await page.locator('[data-aoi-active=true]').waitFor();
 await page.getByRole('button',{name:'Crear polígono sintético y 4 áreas'}).click();
 await page.locator('[data-study-areas-ready=true]').waitFor();
 const bbox=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-aoi-diablillos-v3')).bbox);
 const xy=(x,y)=>[Number((bbox[0]+(bbox[2]-bbox[0])*x).toFixed(9)),
 Number((bbox[1]+(bbox[3]-bbox[1])*y).toFixed(9))];
 const raw=JSON.stringify({type:'FeatureCollection',features:[
  {type:'Feature',properties:{name:'Estación potencial interior (QA)'},geometry:{type:'Point',coordinates:xy(.26,.5)}},
  {type:'Feature',properties:{name:'Punto exterior (QA)'},geometry:{type:'Point',coordinates:xy(.02,.5)}}
 ]});
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 const gis=page.locator('[data-page-role=gis-analysis]');await gis.waitFor();
 await gis.getByRole('textbox',{name:'Procedencia o descripción'}).fill('Puntos ficticios sin fuente oficial');
 await gis.getByLabel('Importar GeoJSON').setInputFiles({
  name:'estaciones-ficticias-v39.geojson',mimeType:'application/geo+json',buffer:Buffer.from(raw)});
 await gis.locator('[data-point-context=ready]').waitFor();
 const workingBefore=await page.evaluate(()=>localStorage.getItem('ambienta-gis-diablillos-working-v3'));
 await gis.getByRole('button',{name:'Analizar puntos contra las subáreas'}).click();
 await gis.locator('[data-point-analysis-ready=true]').waitFor();
 const stations=gis.locator('[data-station-panel]');await gis.locator('[data-station-panel=empty]').waitFor();
 assert.equal(await stations.locator('[data-station-id]').count(),0);
 await stations.getByLabel('Estación de medición V3.9').selectOption('EST-V39-QA');
 await stations.getByLabel('Punto GIS V3.9').selectOption('F1');
 await stations.getByLabel('Identificador de procedencia').fill('GPS-QA-FICTICIO');
 await stations.getByLabel('Método de geolocalización declarado').fill('Levantamiento sintético QA');
 await stations.getByLabel('Responsable que propone').fill('Proponente QA');
 await stations.getByLabel('Precisión de estación en metros').fill('1');
 await stations.getByLabel('Fecha de referencia espacial').fill('2026-11-01T11:30');
 await stations.getByRole('button',{name:'Proponer enlace de estación'}).click();
 const pending=gis.locator('[data-station-id=EST-V39-QA][data-station-status=awaiting_review]');
 await pending.waitFor();
 assert.equal(await gis.locator('[data-station-accepted=true]').innerText(),'0');
 await pending.getByRole('button',{name:'Aceptar enlace QA'}).click();
 assert.equal(await gis.locator('[data-station-id=EST-V39-QA][data-station-status=accepted_qa]').count(),0);
 await stations.getByLabel('Revisor de estación').fill('Proponente QA');
 await stations.getByLabel('Justificación de estación').fill('Revisión artificial por el proponente');
 await pending.getByRole('button',{name:'Aceptar enlace QA'}).click();
 await gis.getByRole('alert').last().waitFor();
 assert.equal(await gis.locator('[data-station-accepted=true]').innerText(),'0');
 await stations.getByLabel('Revisor de estación').fill('Revisor SIG QA');
 await stations.getByLabel('Justificación de estación').fill('Fuente y geometría revisadas ficticiamente');
 await pending.getByRole('button',{name:'Aceptar enlace QA'}).click();
 await gis.locator('[data-station-id=EST-V39-QA][data-station-status=accepted_qa]').waitFor();
 const waitDownload=page.waitForEvent('download');
 await stations.getByRole('button',{name:'Exportar revisión de estaciones JSON'}).click();
 const downloaded=JSON.parse(fs.readFileSync(await (await waitDownload).path(),'utf8'));
 assert.equal(downloaded.entries.length,1);
 assert.equal(downloaded.entries[0].zoneId,'A');
 assert.equal(downloaded.entries[0].pointRef,'F1');
 assert.equal(downloaded.entries[0].review.reviewer,'Revisor SIG QA');
 assert(!JSON.stringify(downloaded).includes('coordinates'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-v38-measurements-diablillos')),measurementBefore);
 assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-gis-diablillos-working-v3')),workingBefore);
 assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-v2-diablillos-2026-demo')),domainBefore);
 await page.getByRole('link',{name:'Monitoreo',exact:true}).click();
 await page.locator('[data-measurement-id=MUE-0001]').getByRole('button',{name:'Anular con motivo'}).click();
 await page.getByLabel('Motivo de anulación').fill('Anulación solo para invalidación V39');
 await page.getByLabel('Responsable de anulación').fill('Revisor QA');
 await page.getByRole('button',{name:'Confirmar anulación'}).click();
 await page.locator('[data-measurement-id=MUE-0001][data-measurement-status=voided]').waitFor();
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 await gis.locator('[data-point-context=ready]').waitFor();
 await gis.getByRole('button',{name:'Analizar puntos contra las subáreas'}).click();
 await gis.locator('[data-station-panel=stale]').waitFor();
 assert.equal(await gis.locator('[data-station-id=EST-V39-QA][data-station-status=accepted_qa]').count(),0);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',stationLinks:1,acceptedQa:1,automaticAssignments:0,
  sameProposerBlocked:true,originalMeasurementUnchangedUntilExplicitVoid:true,
  originalPolygonAndDomainUnchanged:true,staleMeasurementRevisionBlocked:true,jsErrors:0}));
}finally{await browser.close();}
