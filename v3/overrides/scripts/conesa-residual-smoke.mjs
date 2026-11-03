import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const out='qa/ambienta-conesa-residual';
await fs.mkdir(out,{recursive:true});
const initial={
 sign:-1,criteria:{IN:2,EX:2,EX_CR:0,MO:4,MO_CR:0,PE:4,RV:1,SI:1,AC:1,EF:4,PR:1,MC:2},
 reason:'Ejercicio técnico ficticio',evidence:'Ficha didáctica de prueba'
};
const expectedAbs=3*2+2*2+4+4+1+1+1+4+1+2;
assert.equal(expectedAbs,28);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const ctx=await browser.newContext({viewport:{width,height:900},
   reducedMotion:'reduce',acceptDownloads:true});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices');
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  const panel=page.locator('[data-conesa-residual]');
  await panel.waitFor();
  assert.equal(await panel.locator('[data-residual-row]').count(),0,
   'No residual rows are seeded by opening the module');
  const projectId=(await page.locator('.amb-conesa-rev .amb-matrix-footer span').first().innerText())
    .split('·').at(-1)?.trim();
  assert(projectId);
  assert.equal(await page.evaluate(()=>Object.keys(localStorage)
    .filter(x=>x.startsWith('ambienta-conesa-residual-v1:')).length),0);
  await page.evaluate(({projectId,initial})=>{
   localStorage.setItem('ambienta-conesa-simplificado-v1:'+projectId,JSON.stringify({
    schema:'ambienta.conesa-simplificado.v1',projectId,projectName:'CASO DIDÁCTICO',
    updatedAt:new Date().toISOString(),entries:{'demo-f4::demo-a1':initial}
   }));
  },{projectId,initial});
  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  const row=panel.locator('[data-residual-row="demo-f4::demo-a1"]');
  assert.equal((await row.locator('[data-residual-initial]').innerText()).trim(),'-28');
  assert.equal((await row.locator('[data-residual-state]').innerText()).trim(),'Sin residual');
  await row.getByRole('button',{name:'Revisar'}).click();
  const editor=panel.locator('[data-residual-editor]');
  await editor.getByRole('combobox',{name:'Naturaleza residual'}).selectOption('-1');
  const values={IN:1,EX:1,EX_CR:0,MO:1,MO_CR:0,PE:1,RV:1,SI:1,AC:1,EF:1,PR:1,MC:1};
  for(const [field,value] of Object.entries(values))
   await editor.getByRole('combobox',{name:'Residual '+field,exact:true}).selectOption(String(value));
  assert.equal((await editor.locator('[data-residual-editor-score]').innerText()).trim(),'13');
  assert.equal((await row.locator('[data-residual-delta]').innerText()).trim(),'-15');
  assert.equal((await row.locator('[data-residual-state]').innerText()).trim(),'Revisar',
   'A numerical score is not a complete mitigation assessment');
  await editor.getByRole('combobox',{name:'Jerarquía de mitigación'}).selectOption('minimizar');
  await editor.getByLabel('Descripción de la medida').fill('Control de emisión de partículas');
  await editor.getByLabel('Referencia de la medida / fuente').fill('Protocolo de ejercicio M-01');
  await editor.getByLabel('Responsable').fill('Equipo ambiental');
  await editor.getByLabel('Indicador de seguimiento').fill('Material particulado');
  await editor.getByLabel('Frecuencia de seguimiento').fill('Mensual');
  await editor.getByRole('combobox',{name:'Incertidumbre residual'}).selectOption('alta');
  await editor.getByRole('combobox',{name:'Calidad de evidencia'}).selectOption('declarada');
  await editor.getByLabel('Justificación de los criterios residuales').fill('Hipótesis didáctica de escenario');
  await editor.getByLabel('Evidencia de la valoración residual').fill('Ficha didáctica M-01');
  await editor.getByLabel('Referencia PGA (manual, no sincronizada)').fill('PGA-M01');
  assert.equal((await row.locator('[data-residual-state]').innerText()).trim(),'Completo');
  assert.equal((await panel.locator('.amb-residual-stats span').first().locator('strong').innerText()).trim(),'1');
  // Link one existing PGA measure by its unique ID, without mutating PGA source data.
  const selector=editor.getByRole('combobox',{name:'Medida PGA vinculada'});
  assert((await selector.locator('option').count())>1);
  const sourceId=await selector.locator('option').nth(1).getAttribute('value');
  assert(sourceId);
  await selector.selectOption(sourceId);
  assert.equal((await row.locator('[data-residual-pga]').innerText()).trim(),'Vinculado · '+sourceId);
  assert.equal(await editor.locator('[data-pga-linked-detail]').count(),1);
  assert((await editor.getByRole('link',{name:'Abrir ficha y trazabilidad en PGA'}).getAttribute('href'))
   .includes('/pga?medida='+encodeURIComponent(sourceId)));
  assert.equal((await row.locator('[data-residual-state]').innerText()).trim(),'Completo');
  await page.screenshot({path:out+'/conesa-residual-'+width+'.png',animations:'disabled'});
  const [download]=await Promise.all([page.waitForEvent('download'),
    panel.getByRole('button',{name:'CSV',exact:true}).click()]);
  const csv=await fs.readFile(await download.path(),'utf8');
  assert(csv.includes('"-15"')&&csv.includes('"PGA-M01"')&&csv.includes('"alta"'));
  assert(csv.includes('"conesa-simplificado-residual-v1"'));
  assert(csv.includes('"' + sourceId + '"')&&csv.includes('"vinculado"'),
   'CSV must preserve exact PGA measure ID and documented linkage status');
  const original=await page.evaluate(projectId=>
   JSON.parse(localStorage.getItem('ambienta-conesa-simplificado-v1:'+projectId)).entries['demo-f4::demo-a1'],
   projectId);
  assert.equal(original.criteria.IN,2,'Residual edit must not change initial criteria');
  const residualBefore=await page.evaluate(projectId=>
   JSON.parse(localStorage.getItem('ambienta-conesa-residual-v1:'+projectId)).entries['demo-f4::demo-a1'],
   projectId);
  assert.equal(residualBefore.residual.criteria.IN,1);
  assert.equal(residualBefore.measure.execution,'prevista');

  // Changing the source scoring must invalidate a previously reviewed scenario.
  await page.evaluate(projectId=>{
   const k='ambienta-conesa-simplificado-v1:'+projectId,d=JSON.parse(localStorage.getItem(k));
   d.entries['demo-f4::demo-a1'].criteria.IN=4;
   localStorage.setItem(k,JSON.stringify(d));
  },projectId);
  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  const changed=panel.locator('[data-residual-row="demo-f4::demo-a1"]');
  assert.equal((await changed.locator('[data-residual-state]').innerText()).trim(),'Revisar');
  assert.equal((await changed.locator('[data-residual-delta]').innerText()).trim(),'No comparable',
   'A stale original assessment cannot generate a valid comparison');
  await changed.getByRole('button',{name:'Revisar'}).click();
  assert((await panel.locator('.amb-residual-errors').innerText())
   .includes('Cambió la valoración inicial'));
  await panel.getByRole('button',{name:'Ratificar vínculo tras revisar el impacto inicial'}).click();
  assert.equal((await changed.locator('[data-residual-state]').innerText()).trim(),'Completo');

  // Avoided is not an invented Conesa score of zero.
  await editor.getByRole('combobox',{name:'Persistencia del impacto'}).selectOption('evitado');
  assert.equal((await changed.locator('[data-residual-score]').innerText()).trim(),'Evitado');
  assert.equal((await changed.locator('[data-residual-delta]').innerText()).trim(),'No comparable');
  assert.equal((await changed.locator('[data-residual-state]').innerText()).trim(),'Revisar');
  await editor.getByRole('combobox',{name:'Jerarquía de mitigación'}).selectOption('evitar');
  assert.equal((await changed.locator('[data-residual-state]').innerText()).trim(),'Completo');
  // A now-missing PGA ID is retained as an unresolved reference and blocks completeness.
  await page.evaluate(projectId=>{
   const k='ambienta-conesa-residual-v1:'+projectId,d=JSON.parse(localStorage.getItem(k));
   d.entries['demo-f4::demo-a1'].measure.pgaMeasureId='MED-NOT-EXIST';
   localStorage.setItem(k,JSON.stringify(d));
  },projectId);
  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  const missing=panel.locator('[data-residual-row="demo-f4::demo-a1"]');
  assert.equal((await missing.locator('[data-residual-state]').innerText()).trim(),'Revisar');
  assert.equal((await missing.locator('[data-residual-pga]').innerText()).trim(),'Revisar vínculo');
  await missing.getByRole('button',{name:'Revisar'}).click();
  assert((await panel.locator('[data-pga-link-warning]').innerText()).includes('no existe'));
  assert.equal(await panel.locator('[data-pga-linked-detail]').count(),0);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overflow<=6,'Desktop page overflow at '+width+' px: '+overflow);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',width,initial:28,residual:13,delta:-15,
    sourceChangeInvalidates:true,avoidedNotZero:true,sourceUnchanged:true,errors:0}));
  await ctx.close();
 }
}finally{await browser.close();}
