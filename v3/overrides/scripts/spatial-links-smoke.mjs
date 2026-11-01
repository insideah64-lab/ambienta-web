import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1460,height:920},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const base='http://127.0.0.1:8787/v3/index.html?caso=diablillos#/area';
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.getByRole('textbox',{name:'Latitud de consulta'}).fill('-24.70');
 await page.getByRole('textbox',{name:'Longitud de consulta'}).fill('-67.20');
 await page.getByRole('textbox',{name:'Distancia de consulta'}).fill('5');
 await page.locator('[data-aoi-active=true]').waitFor();
 await page.getByRole('button',{name:'Crear polígono sintético y 4 áreas'}).click();
 await page.locator('[data-study-areas-ready=true]').waitFor();
 const overview=page.locator('[data-spatial-links=overview]');
 await overview.locator('[data-spatial-context=empty]').waitFor();
 const original=await page.evaluate(()=>localStorage.getItem('ambienta-v2-diablillos-2026-demo'));
 await overview.locator('[data-spatial-seed=qa]').click();
 await overview.locator('[data-spatial-counts=true]').getByText('4 / 4').first().waitFor();
 await overview.getByText('Sin contradicciones').waitFor();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-zone-links-diablillos-v1')));
 assert.equal(stored.projectId,'DIAB-2026-DEMO');
 assert.deepEqual(stored.records.impact['IMP-D-AGU'].zoneIds,['B']);
 assert.equal(Object.keys(stored.records.evidence).length,6);
 // Walk modules and show exactly the same metadata tied to zone IDs.
 await page.getByRole('link',{name:'Impactos',exact:true}).click();
 const impacts=page.locator('[data-spatial-links=impact]');
 await impacts.waitFor();
 assert.equal(await impacts.locator('[data-spatial-record]').count(),4);
 assert(await impacts.getByRole('checkbox',{name:'Zona B para IMP-D-AGU'}).isChecked());
 await impacts.getByRole('checkbox',{name:'Zona A para IMP-D-AGU'}).check();
 await impacts.getByRole('checkbox',{name:'Zona B para IMP-D-AGU'}).uncheck();
 assert(await impacts.getByRole('checkbox',{name:'Zona A para IMP-D-AGU'}).isChecked());
 await impacts.getByRole('checkbox',{name:'Zona B para IMP-D-AGU'}).check();
 // A record can span multiple zones.
 assert(await impacts.getByRole('checkbox',{name:'Zona A para IMP-D-AGU'}).isChecked());
 assert(await impacts.getByRole('checkbox',{name:'Zona B para IMP-D-AGU'}).isChecked());
 await page.getByRole('link',{name:'Plan de Gestión',exact:true}).click();
 const pga=page.locator('[data-spatial-links=measure]');
 await pga.waitFor();
 assert.equal(await pga.locator('[data-spatial-record]').count(),4);
 assert(await pga.getByRole('checkbox',{name:'Zona B para MED-DIAB-001'}).isChecked());
 await page.getByRole('link',{name:'Monitoreo',exact:true}).click();
 const moni=page.locator('[data-spatial-links=inspection]');
 await moni.waitFor();
 assert.equal(await moni.locator('[data-spatial-record]').count(),2);
 await moni.getByRole('checkbox',{name:'Zona B para INSP-DIAB-001'}).uncheck();
 await moni.getByRole('checkbox',{name:'Zona C para INSP-DIAB-001'}).check();
 await moni.getByText('Se detectaron').waitFor();
 // Geolocation conflict is a QA signal, not a claim of environmental noncompliance.
 await page.getByRole('link',{name:'Evidencias',exact:true}).click();
 const evid=page.locator('[data-spatial-links=evidence]');
 await evid.waitFor();
 assert.equal(await evid.locator('[data-spatial-record]').count(),6);
 assert(await evid.getByRole('checkbox',{name:'Zona B para EVID-D-001'}).isChecked());
 await evid.getByRole('combobox',{name:'Filtrar Evidencias por zona'}).selectOption('D');
 assert.equal(await evid.locator('[data-spatial-record]').count(),1);
 await evid.getByRole('combobox',{name:'Filtrar Evidencias por zona'}).selectOption('todos');
 await page.getByRole('link',{name:'Reportes',exact:true}).click();
 const report=page.locator('[data-spatial-links=report]');
 await report.waitFor();
 await report.getByText('Se detectaron').waitFor();
 let promise=page.waitForEvent('download');
 await report.getByRole('button',{name:'Exportar vínculos JSON'}).click();
 const content=JSON.parse(fs.readFileSync(await (await promise).path(),'utf8'));
 assert.equal(content.status,'SIMULADO_NO_OFICIAL');
 assert.equal(content.summary.totalLinked,16);
 assert.deepEqual(content.records.impact['IMP-D-AGU'].zoneIds,['A','B']);
 assert.deepEqual(content.records.inspection['INSP-DIAB-001'].zoneIds,['C']);
 assert(content.summary.conflicts.length>=2);
 assert.equal(content.scenario.zoneAreasHa.length,4);
 assert.equal(content.domainRevision,0);
 await page.reload();
 await report.waitFor();
 await report.getByText('Se detectaron').waitFor();
 // The domain state remains untouched when only local geographic tags change.
 const originalAfter=await page.evaluate(()=>localStorage.getItem('ambienta-v2-diablillos-2026-demo'));
 assert.equal(originalAfter,original);
 await page.getByRole('link',{name:'Área de estudio',exact:true}).click();
 await page.getByRole('textbox',{name:'Distancia de consulta'}).fill('8');
 await page.locator('[data-aoi-active=true]').waitFor();
 const previous=page.locator('[data-spatial-links=overview]');
 await previous.locator('[data-spatial-context=missing]').waitFor();
 await page.getByRole('link',{name:'Impactos',exact:true}).click();
 await page.locator('[data-spatial-links=impact] [data-spatial-context=missing]').waitFor();
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',case:'Diablillos V3.3 cross-module local zone links',
  seededRecords:16,multiZoneImpact:true,documentaryMismatchDetected:true,
  areaFiltering:true,exportedWithProvenance:true,revisionPreserved:true,
  persistedAfterReload:true,staleAoiDenied:true,pageErrors:errors.length}));
}finally{await browser.close();}
