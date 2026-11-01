import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1320,height:880},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/area');
 for(const [name,value] of [['Latitud de consulta','-24.70'],['Longitud de consulta','-67.20'],['Distancia de consulta','5']])
  await page.getByRole('textbox',{name}).fill(value);
 await page.locator('[data-aoi-active=true]').waitFor();
 await page.getByRole('button',{name:'Crear polígono sintético y 4 áreas'}).click();
 await page.locator('[data-study-areas-ready=true]').waitFor();
 const bbox=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-aoi-diablillos-v3')).bbox);
 const xy=(x,y)=>[Number((bbox[0]+(bbox[2]-bbox[0])*x).toFixed(9)),
 Number((bbox[1]+(bbox[3]-bbox[1])*y).toFixed(9))];
 const feats=[[.26,.5],[.36,.5],[.55,.5],[.85,.5],[.18,.36],[.65,.82],[.02,.5],[.08,.5],[.29,.5],[.15,.35]]
  .map(([x,y],i)=>({type:'Feature',properties:{name:'QA '+(i+1)},
   geometry:{type:'Point',coordinates:xy(x,y)}}));
 const raw=JSON.stringify({type:'FeatureCollection',features:feats});
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 const gis=page.locator('[data-page-role=gis-analysis]');await gis.waitFor();
 await gis.getByRole('textbox',{name:'Procedencia o descripción'}).fill('Fuente QA sintética');
 await gis.getByLabel('Importar GeoJSON').setInputFiles({
  name:'qa-v36.geojson',mimeType:'application/geo+json',buffer:Buffer.from(raw)});
 await gis.locator('[data-point-context=ready]').waitFor();
 await gis.getByRole('button',{name:'Analizar puntos contra las subáreas'}).click();
 await gis.locator('[data-point-analysis-ready=true]').waitFor();
 await gis.getByRole('button',{name:'Generar registros ficticios QA'}).click();
 const doc=gis.locator('[data-document-review=true]');
 await doc.locator('[data-document-records="10"]').waitFor();
 assert.equal(await doc.locator('[data-doc-pending=true]').innerText(),'4');
 assert.equal(await doc.locator('[data-doc-blocked=true]').innerText(),'6');
 assert.equal(await doc.locator('[data-doc-approved=true]').innerText(),'0');
 const candidate=doc.locator('[data-doc-status=awaiting_review]').first();
 await candidate.getByRole('button',{name:'Aceptar vínculo QA'}).click();
 assert.equal(await doc.getByRole('alert').count(),1);
 await doc.getByRole('textbox',{name:'Nombre del revisor'}).fill('Revisor laboratorio');
 await doc.getByRole('textbox',{name:'Motivo y respaldo de la decisión'}).fill('Verificación simulada para probar el circuito');
 await candidate.getByRole('button',{name:'Aceptar vínculo QA'}).click();
 assert.equal(await doc.locator('[data-doc-approved=true]').innerText(),'1');
 const download=page.waitForEvent('download');
 await doc.getByRole('button',{name:'Exportar auditoría JSON'}).click();
 const json=JSON.parse(fs.readFileSync(await (await download).path(),'utf8'));
 assert.equal(json.schema,'ambienta-documentary-proposals-v1');
 assert.equal(json.entries.filter(e=>e.status==='approved').length,1);
 assert.equal(json.entries.filter(e=>e.status.startsWith('needs_')).length,6);
 await doc.getByRole('button',{name:'Guardar resumen QA para Monitoreo'}).click();
 await doc.getByRole('link',{name:'Abrir Monitoreo'}).click();
 const summary=page.locator('[data-document-monitoring=ready]');await summary.waitFor();
 assert.equal(await summary.locator('[data-doc-summary=true] strong').first().innerText(),'10');
 const stored=await page.evaluate(()=>localStorage.getItem('ambienta-documentary-review-diablillos-v36'));
 assert(!stored.includes('coordinate'));
 assert(!stored.includes('-24.70'));
 await page.getByRole('link',{name:'Área de estudio',exact:true}).click();
 await page.getByRole('textbox',{name:'Distancia de consulta'}).fill('7');
 await page.getByRole('link',{name:'Monitoreo',exact:true}).click();
 await page.locator('[data-document-monitoring=stale]').waitFor();
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',records:10,approvedQA:1,blocked:6,summaryReadOnly:true,staleBlocked:true,jsErrors:0}));
}finally{await browser.close();}
