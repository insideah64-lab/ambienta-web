import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='qa/ambienta-battelle';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const width of [1366,1800]){
  const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],network=[];page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>network.push(r.url()));
  await page.goto((process.env.QA_BASE_URL||'http://127.0.0.1:8787/v3/')+'index.html#/matrices');
  await page.locator('.amb-matrix-grid').waitFor();
  const original=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  const open=()=>page.locator('[data-catalog-method="battelle"] button').click();await open();
  const panel=page.locator('[data-battelle]');await panel.waitFor();
  assert.equal(await panel.locator('[data-bc-row]').count(),78);assert.equal(await panel.locator('[data-bc-ready]').innerText(),'0 / 78');assert.equal(await panel.locator('[data-bc-total]').innerText(),'—');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-battelle-v1:DEMO-001')),null);
  await panel.getByLabel('Filtrar categoría Battelle',{exact:true}).selectOption('pollution');
  assert.equal(await panel.locator('[data-bc-row]').count(),24);assert.match(await panel.locator('[data-bc-editor] legend').innerText(),/19\. Basin hydrologic loss/);
  await panel.getByLabel('Filtrar categoría Battelle',{exact:true}).selectOption('');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-battelle-v1:DEMO-001')),null,'Filtering must neither create nor rewrite measurements');
  await page.screenshot({path:out+'/initial-'+width+'.png',fullPage:true});
  await panel.getByRole('textbox',{name:'Alternativa Battelle',exact:true}).fill('Alternativa sintética QA, no evaluación de DEMO-001');
  await panel.getByRole('textbox',{name:'Horizonte Battelle',exact:true}).fill('2030, comparación simultánea QA');
  await panel.getByRole('textbox',{name:'Ámbito Battelle',exact:true}).fill('Territorio ficticio QA; escenario sin proyecto estimado al mismo horizonte');
  await panel.getByRole('button',{name:'20. BOD',exact:true}).click();
  await panel.getByLabel('Indicador ambiental',{exact:true}).fill('DBO sintética QA');await panel.getByLabel('Unidad del indicador',{exact:true}).fill('mg/L');
  await panel.getByLabel('Valor SIN Battelle',{exact:true}).fill('20');await panel.getByLabel('Valor CON Battelle',{exact:true}).fill('50');
  await panel.getByLabel('Procedencia SIN Battelle',{exact:true}).selectOption('estimated');await panel.getByLabel('Procedencia CON Battelle',{exact:true}).selectOption('estimated');
  await panel.getByLabel('Fuente SIN',{exact:true}).fill('SIN ficticio del test; no medición');await panel.getByLabel('Fuente CON',{exact:true}).fill('CON ficticio del test; no predicción real');
  await panel.getByLabel('Nudos de función: indicador;CA, uno por línea',{exact:true}).fill('0;1\n100;0');
  await panel.getByLabel('Convención de calidad del estudio (0/0,5 y referencias)',{exact:true}).fill('Recta sintética QA sin umbral legal; 1 mejor, 0 peor');
  await panel.getByLabel('Evaluador / equipo responsable',{exact:true}).fill('Equipo ficticio QA');
  assert.equal(await panel.locator('[data-bc-delta]').innerText(),'—','Missing function provenance must block');
  await panel.getByLabel('Fuente, localizador y ámbito de la función',{exact:true}).fill('Recta QA construida para verificar aritmética. No proviene del Anejo 4 ni es una curva validada de DBO.');
  assert.equal(await panel.locator('[data-bc-ready]').innerText(),'1 / 78');assert.equal(await panel.locator('[data-bc-delta]').innerText(),'-7,5000');assert.equal(await panel.locator('[data-bc-flag]').innerText(),'Bandera mayor');
  const row=panel.locator('[data-bc-row="bc-20"]');assert.deepEqual((await row.locator('td').allInnerTexts()).slice(0,6),['25','0,8000','0,5000','20,0000','12,5000','-7,5000']);
  await panel.locator('.amb-battelle-scroll').screenshot({path:out+'/table-'+width+'.png'});
  await panel.locator('[data-bc-editor]').screenshot({path:out+'/editor-'+width+'.png'});
  await page.screenshot({path:out+'/linear-'+width+'.png',fullPage:true});
  for(const format of ['JSON','CSV']){
   const event=page.waitForEvent('download');await panel.getByRole('button',{name:format,exact:true}).click();const download=await event;const path=out+'/linear-'+width+'.'+format.toLowerCase();await download.saveAs(path);
   const body=await fs.readFile(path,'utf8');assert(body.includes('bc-20'));if(format==='JSON'){const d=JSON.parse(body);assert.equal(d.profile,'battelle-ees-dee-1973-original');assert.equal(d.entries['bc-20'].xWithout,20);assert.equal(d.results.ready,1);assert(Math.abs(d.results.delta+7.5)<1e-10);}else{assert(body.includes('DBO sintética QA'));assert(body.includes('Fuente SIN'));}
  }
  await page.reload();await page.locator('[data-catalog-method="battelle"] button').waitFor();await open();await panel.getByRole('button',{name:'20. BOD',exact:true}).click();
  assert.equal(await panel.locator('[data-bc-delta]').innerText(),'-7,5000');
  await panel.getByLabel('Nudos de función: indicador;CA, uno por línea',{exact:true}).fill('0;0\n50;1\n100;0');
  await panel.getByLabel('Fuente, localizador y ámbito de la función',{exact:true}).fill('Triángulo sintético QA para interpolación no monótona. No es una función ambiental validada de DBO.');
  assert.equal(await panel.locator('[data-bc-delta]').innerText(),'15,0000');assert.equal(await panel.locator('[data-bc-flag]').innerText(),'Sin bandera');
  await panel.locator('[data-bc-editor]').screenshot({path:out+'/nonlinear-'+width+'.png'});
  for(const format of ['JSON','CSV']){
   const event=page.waitForEvent('download');await panel.getByRole('button',{name:format,exact:true}).click();const download=await event;const path=out+'/nonlinear-'+width+'.'+format.toLowerCase();await download.saveAs(path);
   const body=await fs.readFile(path,'utf8');assert(body.includes('Triángulo sintético QA'));if(format==='JSON'){const d=JSON.parse(body);assert(Math.abs(d.results.delta-15)<1e-10);assert.equal(d.entries['bc-20'].curveText,'0;0\n50;1\n100;0');}
  }
  await panel.getByLabel('Valor CON Battelle',{exact:true}).fill('101');assert.equal(await panel.locator('[data-bc-delta]').innerText(),'—');
  await panel.getByLabel('Valor CON Battelle',{exact:true}).fill('50');
  const savedDoc=await page.evaluate(()=>localStorage.getItem('ambienta-battelle-v1:DEMO-001'));await fs.writeFile(out+'/roundtrip-'+width+'.json',savedDoc);
  // Reject a foreign project without rewriting this draft.
  await panel.getByLabel('Importar JSON Battelle',{exact:true}).setInputFiles({name:'foreign.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...JSON.parse(savedDoc),projectId:'OTHER'}))});
  assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-battelle-v1:DEMO-001')),savedDoc);
  page.once('dialog',dialog=>dialog.accept());
  await panel.getByLabel('Importar JSON Battelle',{exact:true}).setInputFiles(out+'/roundtrip-'+width+'.json');
  await page.waitForFunction(()=>Object.keys(localStorage).some(k=>k.startsWith('ambienta-battelle-v1:DEMO-001:backup:')));
  const unchanged=await page.evaluate(source=>Object.entries(source).every(([k,v])=>localStorage.getItem(k)===v),original);assert.equal(unchanged,true,'Original project and previous matrix storage must not change');
  // Corrupt local content is preserved byte-for-byte and editing is blocked.
  await page.evaluate(()=>localStorage.setItem('ambienta-battelle-v1:DEMO-001','{invalid QA'));
  await page.reload();await page.locator('[data-catalog-method="battelle"] button').waitFor();await open();
  assert.equal(await panel.getByRole('textbox',{name:'Alternativa Battelle',exact:true}).isDisabled(),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-battelle-v1:DEMO-001')),'{invalid QA');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);results.push({width,status:'PASS',parameters:78,linearDelta:-7.5,nonlinearDelta:15,realDownloads:4,sourceUnchanged:unchanged,errors});await context.close();
 }
}finally{await browser.close();}
await fs.writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
