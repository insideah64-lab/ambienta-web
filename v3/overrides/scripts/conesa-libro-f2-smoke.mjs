import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='qa/ambienta-conesa-f2';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,
   reducedMotion:'reduce'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices');
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  assert.equal(await page.locator('[data-catalog-method^="conesa"]').count(),1);
  await page.locator('[data-conesa-book]').waitFor();
  const book=page.locator('[data-conesa-book]'),f2=page.locator('[data-conesa-f2]');
  await f2.waitFor({state:'attached'});
  assert.equal(await f2.isVisible(),false,'F2 is mounted but hidden until selected');

  assert.equal(await f2.locator('[data-f2-interaction]').count(),0);
  assert.equal((await f2.locator('[data-f2-uip-total]').count()),0,
   'Weight proposal is hidden until explicit expansion');
  const before=await page.evaluate(()=>Object.keys(localStorage)
   .filter(key=>key.includes('conesa-libro-1997-f2')));
  assert.deepEqual(before,[],'F2 must not create empty records when merely opened');
  await book.locator('[data-conesa-book-cell]').first().click();
  await book.getByRole('combobox',{name:'Conesa libro naturaleza'}).selectOption('-1');
  const vals={IN:2,EX:2,EX_CR:0,MO:4,MO_CR:0,PE:4,RV:1,SI:1,AC:1,EF:4,PR:1,MC:2};
  for(const [key,n] of Object.entries(vals))
   await book.getByRole('combobox',{name:'Conesa libro '+key,exact:true}).selectOption(String(n));
  assert.equal((await book.locator('[data-book-absolute]').innerText()).trim(),'28');
  assert.equal(await f2.locator('[data-f2-interaction]').count(),1);
  const button=f2.locator('[data-f2-interaction]').first();
  await button.click();
  const editor=f2.locator('[data-f2-editor]');
  await editor.getByRole('combobox',{name:'Conesa F2 tratamiento'}).selectOption('tamiz');
  assert.match(await editor.locator('[data-f2-problems]').innerText(),/umbral/i);
  await f2.getByRole('spinbutton',{name:'Conesa F2 umbral'}).fill('30');
  await f2.getByRole('textbox',{name:'Conesa F2 fundamento tamiz'}).fill('Tamiz documentado del ejercicio de regresión');
  await f2.getByRole('textbox',{name:'Conesa F2 evidencia tamiz'}).fill('Acta QA del ejemplo ficticio');
  await editor.getByRole('textbox',{name:'Conesa F2 fundamento decisión'}).fill('Por debajo del umbral de este ensayo didáctico');
  await editor.getByRole('textbox',{name:'Conesa F2 evidencia decisión'}).fill('Caso didáctico en laboratorio QA');
  assert.match(await editor.locator('[data-f2-problems]').innerText(),/revisión profesional/i);
  const summary=f2.locator('.amb-f2-summary span');
  assert.equal((await summary.nth(3).locator('strong').innerText()).trim(),'1',
   'Explicit below-threshold treatment is counted, never automatically assigned');
  await editor.locator('input[type="checkbox"]').check();
  assert.match(await editor.locator('[data-f2-problems]').innerText(),/alerta roja/i);
  await editor.getByRole('textbox',{name:'Conesa F2 motivo bandera roja'}).fill('Lugar de daño potencial irreversible en circunstancias críticas');
  await editor.getByRole('textbox',{name:'Conesa F2 evidencia bandera roja'}).fill('Acta de prueba QA');
  await editor.getByRole('textbox',{name:'Conesa F2 alternativa'}).fill('Alternativa de ubicación sujeta a análisis');
  assert.equal((await summary.nth(5).locator('strong').innerText()).trim(),'1');
  await f2.getByRole('button',{name:'Registrar ponderación de factores'}).click();
  assert.match(await f2.locator('[data-f2-uip-total]').innerText(),/pendientes/i);
  await f2.getByRole('textbox',{name:'Conesa F2 panel'}).fill('Equipo ambiental de consulta didáctica');
  await f2.getByRole('textbox',{name:'Conesa F2 fuente UIP'}).fill('Acta del panel de valoración didáctica');
  await f2.getByLabel('Conesa F2 fecha UIP').fill('2026-11-03');
  const weights=f2.locator('.amb-f2-weight-table input[type="number"]');
  const qty=await weights.count();
  assert.equal(qty,7,'Demo factor axes only, no UIP are automatically preassigned');
  for(let i=0;i<qty;i++)await weights.nth(i).fill('1');
  assert.match(await f2.locator('[data-f2-uip-total]').innerText(),/1000 UIP/);
  assert.equal(await f2.locator('[data-f2-uip-problems]').count(),0);
  await page.screenshot({path:out+'/conesa-f2-'+width+'.png',animations:'disabled'});
  const f2key=await page.evaluate(()=>Object.keys(localStorage)
   .find(key=>key.startsWith('ambienta-conesa-libro-1997-f2:')));
  assert(f2key,'F2 must have its own persistent key');
  const f1key=await page.evaluate(()=>Object.keys(localStorage)
   .find(key=>key.startsWith('ambienta-conesa-libro-1997-f1:')));
  assert(f1key,'F1 data must remain independent and saved');
  const f1Before=await page.evaluate(key=>localStorage.getItem(key),f1key);
  const [dl]=await Promise.all([page.waitForEvent('download'),
   f2.getByRole('button',{name:'JSON F2'}).click()]);
  const exported=JSON.parse(await fs.readFile(await dl.path(),'utf8'));
  assert.equal(exported.methodId,'conesa-libro-1997-f2');
  assert.equal(exported.screening.threshold,30);
  assert.equal(Object.keys(exported.screening.alerts).length,1);
  assert.equal(exported.uip.panelReference,'Equipo ambiental de consulta didáctica');
  const f2Before=await page.evaluate(key=>localStorage.getItem(key),f2key);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),f1key),f1Before,
   'F2 never writes F1 scores');
  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  await page.locator('[data-conesa-phase-tab="f2"]').click();
  await page.locator('[data-conesa-book]').waitFor();
  assert.equal(await f2.locator('[data-f2-interaction]').count(),1);
  assert.equal((await f2.locator('.amb-f2-summary span').nth(3).locator('strong').innerText()).trim(),'1');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),f2key),f2Before,
   'Read-only reload does not alter previously saved content');
  await page.evaluate(key=>localStorage.setItem(key,'{invalid-F2-json'),f2key);
  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  await page.locator('[data-conesa-phase-tab="f2"]').click();
  await page.locator('[data-conesa-book]').waitFor();
  assert.equal(await f2.locator('[role="alert"]').count(),1);
  const [raw]=await Promise.all([page.waitForEvent('download'),
   f2.getByRole('button',{name:'Descargar original sin modificar'}).click()]);
  assert.equal(await fs.readFile(await raw.path(),'utf8'),'{invalid-F2-json');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),f2key),'{invalid-F2-json');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',width,methodCards:1,uip:1000,normal:0,
   tamiz:1,flags:1,missingUIPPrevented:true,corruptPreserved:true,errors:errors.length}));
  await ctx.close();
 }
}finally{await browser.close();}
