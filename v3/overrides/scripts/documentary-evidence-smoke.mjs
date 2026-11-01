import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1400,height:920},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const bytes=Buffer.from('muestra QA controlada','utf8');
 const sha=createHash('sha256').update(bytes).digest('hex');
 await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/evidencias');
 await page.getByLabel('Medida vinculada a huella').selectOption('MED-DIAB-001');
 await page.getByLabel('Inspección vinculada a huella').selectOption('INSP-DIAB-001');
 await page.getByLabel('Archivo para calcular huella').setInputFiles({
  name:'muestra-v37-qa.txt',mimeType:'text/plain',buffer:bytes
 });
 await page.locator('[data-file-hash=computed]').waitFor();
 await page.getByRole('button',{name:'Registrar solo huella y metadatos'}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-v2-diablillos-2026-demo')));
 const evidence=saved.evidence.find(e=>e.reference?.includes(sha));
 assert(evidence);
 assert.equal(evidence.inspectionId,'INSP-DIAB-001');
 assert.equal(evidence.measureId,'MED-DIAB-001');
 const revision=saved.revision;
 await page.getByRole('link',{name:'Área de estudio',exact:true}).click();
 for(const [name,value] of [['Latitud de consulta','-24.70'],['Longitud de consulta','-67.20'],['Distancia de consulta','5']])
  await page.getByRole('textbox',{name}).fill(value);
 await page.locator('[data-aoi-active=true]').waitFor();
 await page.getByRole('button',{name:'Crear polígono sintético y 4 áreas'}).click();
 await page.locator('[data-study-areas-ready=true]').waitFor();
 const bbox=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-aoi-diablillos-v3')).bbox);
 const xy=(x,y)=>[Number((bbox[0]+(bbox[2]-bbox[0])*x).toFixed(9)),
 Number((bbox[1]+(bbox[3]-bbox[1])*y).toFixed(9))];
 const pointSource=JSON.stringify({type:'FeatureCollection',features:[
  {type:'Feature',properties:{name:'Inspección sintética en zona A'},
   geometry:{type:'Point',coordinates:xy(.26,.5)}}]});
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 const gis=page.locator('[data-page-role=gis-analysis]');await gis.waitFor();
 await gis.getByRole('textbox',{name:'Procedencia o descripción'}).fill('SIG QA V3.7');
 await gis.getByLabel('Importar GeoJSON').setInputFiles({
  name:'qa-v37-punto.geojson',mimeType:'application/geo+json',buffer:Buffer.from(pointSource)});
 await gis.locator('[data-point-context=ready]').waitFor();
 await gis.getByRole('button',{name:'Analizar puntos contra las subáreas'}).click();
 await gis.locator('[data-point-analysis-ready=true]').waitFor();
 const input={schema:'ambienta-monitoring-input-v1',records:[{
  id:'REG-QA-V37',pointRef:'F1',recordType:'inspection',
  observedAt:'2026-11-01T12:00:00Z',method:'Ensayo ficticio V3.7',
  sourceUri:'qa:local',sourceId:'QA-V37',
  accuracyMethod:'Precisión simulada, no certificada',accuracyMeters:1,evidenceSha256:sha
 }]};
 await gis.getByLabel('Importar registros documentales V3.6').setInputFiles({
  name:'qa-v37-record.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
 const review=gis.locator('[data-document-review=true]');await review.locator('[data-document-records="1"]').waitFor();
 assert.equal(await review.locator('[data-doc-pending=true]').innerText(),'1');
 await review.getByRole('textbox',{name:'Nombre del revisor'}).fill('Revisor QA V3.7');
 await review.getByRole('textbox',{name:'Motivo y respaldo de la decisión'}).fill('Ensayo de integración documental sin datos de campo');
 await review.getByRole('button',{name:'Aceptar vínculo QA'}).click();
 const bridge=review.locator('[data-evidence-bridge=v37]');await bridge.waitFor();
 await bridge.getByLabel('Propuesta espacial V3.7').selectOption('REG-QA-V37');
 await bridge.getByLabel('Inspección existente V3.7').selectOption('INSP-DIAB-001');
 await bridge.getByLabel('Evidencia existente V3.7').selectOption(evidence.id);
 await bridge.getByLabel('Archivo local para verificar SHA-256 V3.7').setInputFiles({
  name:'wrong.txt',mimeType:'text/plain',buffer:Buffer.from('documento incorrecto')});
 await bridge.locator('[data-v37-mismatch=true]').waitFor();
 assert.equal(await bridge.locator('[data-v37-match=true]').count(),0);
 await bridge.getByLabel('Archivo local para verificar SHA-256 V3.7').setInputFiles({
  name:'original.txt',mimeType:'text/plain',buffer:bytes});
 await bridge.locator('[data-v37-match=true]').waitFor();
 const pending=page.waitForEvent('download');
 await bridge.getByRole('button',{name:'Exportar acta local de coincidencia JSON'}).click();
 const exported=JSON.parse(fs.readFileSync(await (await pending).path(),'utf8'));
 assert.equal(exported.status,'FILE_BYTES_MATCH_REGISTERED_FINGERPRINT');
 assert.equal(exported.inspectionId,'INSP-DIAB-001');
 assert.equal(exported.evidenceId,evidence.id);
 assert.equal(exported.sha256,sha);
 assert.equal(exported.bytes,bytes.length);
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-v2-diablillos-2026-demo')));
 assert.equal(after.revision,revision);
 assert.equal(after.evidence.find(e=>e.id===evidence.id).reference,evidence.reference);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',fileHashMatch:true,fileHashMismatchRejected:true,
  exactInspectionEvidenceLink:true,domainUnchanged:true,origin:'SIMULADO',jsErrors:0}));
}finally{await browser.close();}
