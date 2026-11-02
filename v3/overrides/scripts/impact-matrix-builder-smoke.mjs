import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const output='qa/ambienta-matrix-builder';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 for(const width of [1366,1800]){
  const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,reducedMotion:'reduce'});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/impactos');
  await page.locator('[data-impact-matrix="v1"]').waitFor();
  const grid=page.locator('.amb-matrix-grid');
  assert.equal(await grid.locator('thead th').count(),5,'4 action examples plus factor header');
  assert.equal(await grid.locator('tbody tr').count(),7,'7 factors, no fake evaluations');
  assert.equal(await page.locator('.amb-matrix-kpis>span').nth(1).locator('strong').innerText(),'0');
  assert.equal(await page.locator('.amb-matrix-cell--negative,.amb-matrix-cell--positive').count(),0);
  assert.equal(await page.getByText('No hay puntuaciones de significancia ambiental calculadas automáticamente.').count(),1);
  await page.screenshot({path:output+'/matrix-empty-'+width+'.png',animations:'disabled'});
  await page.locator('.amb-matrix-cell').first().click();
  const nature=page.getByRole('combobox',{name:'Naturaleza de la interacción'});
  await nature.selectOption('-1');
  await page.getByRole('combobox',{name:'Magnitud del impacto'}).selectOption('7');
  await page.getByRole('combobox',{name:'Importancia del impacto'}).selectOption('5');
  await page.getByPlaceholder('Describir relación causal, escenario, temporalidad e incertidumbre…').fill('Hipótesis de laboratorio, sin mediciones ni observaciones de campo.');
  await page.getByPlaceholder('Código, página, enlace o informe verificable…').fill('Fuente pendiente de verificación');
  assert.equal(await page.locator('.amb-matrix-cell--negative').count(),1);
  await page.getByRole('button',{name:'Leopold',exact:true}).click();
  assert.equal((await page.locator('.amb-matrix-cell--negative').first().innerText()).trim(),'−7/5');
  await page.getByRole('button',{name:'Ponderación exploratoria'}).click();
  assert.equal((await page.locator('.amb-matrix-cell--negative').first().innerText()).trim(),'-35');
  await page.screenshot({path:output+'/matrix-edited-'+width+'.png',animations:'disabled'});
  const before=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('ambienta-impact-matrix-v1:')));
  assert.equal(before.length,1,'Project scoped storage only');
  await page.reload();await page.locator('[data-impact-matrix]').waitFor();
  assert.equal(await page.locator('.amb-matrix-cell--negative').count(),1,'Draft must persist across reload');
  assert.equal(await page.locator('.amb-matrix-kpis>span').nth(2).locator('strong').innerText(),'1');
  await page.getByRole('button',{name:'Identificación'}).click();
  await page.getByRole('button',{name:'Incorporar factores existentes del expediente'}).click();
  assert(await grid.locator('tbody tr').count()>=7,'Existing impact factors imported by name only');
  await page.getByRole('textbox',{name:'Nombre de nueva acción'}).fill('Obra piloto de ejemplo');
  await page.getByRole('button',{name:'Acción',exact:true}).click();
  assert.equal(await grid.locator('thead th').count(),6,'Add action');
  await page.getByRole('textbox',{name:'Nombre de nuevo factor'}).fill('Humedales de referencia');
  await page.getByRole('button',{name:'Factor',exact:true}).click();
  assert(await grid.getByRole('rowheader',{name:/Humedales de referencia/}).count()===1,'Add factor');
  const [csvDownload]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'CSV',exact:true}).click()
  ]);
  assert(csvDownload.suggestedFilename().endsWith('.csv'));
  const csv=await fs.readFile(await csvDownload.path(),'utf8');
  assert(csv.includes('Hipótesis de laboratorio')&&csv.includes('Fuente pendiente de verificación'),'CSV preserves source and justification');
  const [jsonDownload]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'JSON',exact:true}).click()
  ]);
  const imported=JSON.parse(await fs.readFile(await jsonDownload.path(),'utf8'));
  assert.equal(imported.schema,'ambienta.impact-matrix.v1');
  assert(imported.actions.some(x=>x.name==='Obra piloto de ejemplo'));
  assert.equal(Object.values(imported.cells).filter(c=>c.sign!==0).length,1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overflow<=6,'No page-wide horizontal overflow at width '+width+' ('+overflow+')');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',width,actions:imported.actions.length,factors:imported.factors.length,
    valued:1,workflow:'screening→Leopold→weighted→reload→add→CSV→JSON',
    originalExpedientePreserved:true,errors:0}));
  await ctx.close();
 }
} finally {await browser.close();}
