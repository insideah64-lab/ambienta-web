import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='qa/ambienta-conesa-f3b';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const ctx=await browser.newContext({
   viewport:{width,height:900},acceptDownloads:true,reducedMotion:'reduce'
  });
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  async function open(){
   await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
   await page.locator('[data-conesa-book]').waitFor();
  }
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices');
  await open();
  await page.locator('[data-conesa-phase-tab="f3a"]').click();
  const f3=page.locator('[data-conesa-f3]');
  assert.equal(await f3.locator('[data-f3-factor]').count(),7);
  assert.equal(await f3.locator('[data-f3-visual-empty]').count(),1);
  assert.equal(await page.evaluate(()=>Object.keys(localStorage)
   .filter(k=>k.startsWith('ambienta-conesa-libro-1997-f3b:')).length),0);
  await f3.locator('[data-f3-factor]').first().click();
  const editor=f3.locator('[data-f3-editor]');
  await editor.getByRole('textbox',{name:'F3 indicador'}).fill('Parámetro ambiental ficticio del QA');
  await editor.getByRole('textbox',{name:'F3 unidad'}).fill('mg/L');
  await editor.getByRole('textbox',{name:'F3 composición'}).fill('Acciones del caso didáctico tratadas explícitamente');
  await editor.getByRole('spinbutton',{name:'F3 mínimo'}).fill('0');
  await editor.getByRole('spinbutton',{name:'F3 máximo'}).fill('100');
  await editor.getByRole('combobox',{name:'F3 orientación'}).selectOption('decreciente');
  await editor.getByRole('textbox',{name:'F3 función fuente'}).fill('Fuente de control lineal ficticia QA');
  await editor.getByRole('textbox',{name:'F3 función alcance'}).fill('Solo para regresión local y valores de 0 a 100');
  await editor.getByRole('spinbutton',{name:'F3 without magnitud'}).fill('20');
  await editor.getByRole('spinbutton',{name:'F3 withProject magnitud'}).fill('75');
  await editor.getByLabel('F3 without fecha').fill('2026-10-01');
  await editor.getByLabel('F3 withProject fecha').fill('2026-10-02');
  await editor.getByRole('textbox',{name:'F3 without fuente'}).fill('Línea de base de ensayo reproducible');
  await editor.getByRole('textbox',{name:'F3 withProject fuente'}).fill('Modelo predictivo de ensayo reproducible');
  assert.match(await editor.locator('[data-f3-results]').innerText(),/-0.5500/);
  const f3aKey=await page.evaluate(()=>Object.keys(localStorage)
   .find(k=>k.startsWith('ambienta-conesa-libro-1997-f3a:')));
  assert(f3aKey);
  const f3aRaw=await page.evaluate(k=>localStorage.getItem(k),f3aKey);
  await page.locator('[data-conesa-phase-tab="f3b"]').click();
  assert.equal(await f3.getAttribute('data-conesa-f3-focus'),'f3b');
  assert.equal(await editor.locator('[data-f3-results]').count(),0,
   'Curves view must never present linear CA as an unconfigured curve');
  await editor.getByRole('combobox',{name:'F3 tipo de función'}).selectOption('curva');
  assert.equal(await editor.locator('[data-f3b-curve-editor]').count(),1);
  assert.equal(await editor.locator('[data-f3-results]').count(),0,
   'F3b pending provenance must not silently fall back to existing F3a scores');
  assert.match(await editor.locator('[data-f3b-issues]').innerText(),/fuente/i);
  await editor.getByRole('textbox',{name:'F3b fuente'})
   .fill('Conesa 1997, Anejo 4, ejemplo didáctico revisado');
  await editor.getByRole('spinbutton',{name:'F3b página'}).fill('267');
  await editor.getByRole('textbox',{name:'F3b responsable'}).fill('Equipo evaluador de prueba');
  await editor.getByRole('textbox',{name:'F3b ámbito'})
   .fill('Únicamente escenario ficticio de laboratorio entre M=0 y M=100');
  await editor.getByRole('textbox',{name:'F3b evidencia'})
   .fill('Nudos sintéticos de prueba, no digitalización de la curva del libro');
  await editor.getByRole('spinbutton',{name:'F3b magnitud nudo 1'}).fill('0');
  await editor.getByRole('spinbutton',{name:'F3b CA nudo 1'}).fill('0');
  await editor.getByRole('spinbutton',{name:'F3b magnitud nudo 2'}).fill('50');
  await editor.getByRole('spinbutton',{name:'F3b CA nudo 2'}).fill('1');
  await editor.getByRole('button',{name:'Añadir nudo'}).click();
  await editor.getByRole('spinbutton',{name:'F3b magnitud nudo 3'}).fill('100');
  await editor.getByRole('spinbutton',{name:'F3b CA nudo 3'}).fill('0');
  assert.equal(await editor.locator('[data-f3b-ready]').count(),1);
  const f3bOutput=await editor.locator('[data-f3-results]').innerText();
  assert(f3bOutput.includes('0.4000')&&f3bOutput.includes('0.5000')
   &&f3bOutput.includes('0.1000'),f3bOutput);
  assert.equal(await f3.locator('[data-f3b-workspace]').count(),1);
  assert.equal(await f3.locator('[data-f3a-workspace]').count(),0,
   'Curves must not repeat the SIN/CON comparison page');
  assert.equal(await f3.locator('[data-f3-chart-row]').count(),0);
  assert.equal(await f3.locator('[data-f3b-overview] strong').nth(1).innerText(),'1');
  assert.equal(await f3.locator('[data-f3b-curve-card]').first().getAttribute('data-f3b-curve-card'),await f3.locator('[data-f3-factor]').first().getAttribute('data-f3-factor'));
  assert.equal(await editor.locator('[data-f3b-preview] path[stroke="#4ed5c1"]').count(),1);
  await page.locator('[data-conesa-phase-tab="f3a"]').click();
  assert.equal(await f3.locator('[data-f3-chart-row]').count(),1);
  await f3.locator('.amb-f3-quality-disclosure summary').click();
  const compare=await f3.locator('.amb-f3-quality-disclosure tbody').innerText();
  assert(compare.includes('F3b · interpolación por tramos')&&compare.includes('0.1000'),compare);
  await page.locator('[data-conesa-phase-tab="f3b"]').click();
  const f3bKey=await page.evaluate(()=>Object.keys(localStorage)
   .find(k=>k.startsWith('ambienta-conesa-libro-1997-f3b:')));
  assert(f3bKey);
  const [download]=await Promise.all([
   page.waitForEvent('download'),f3.getByRole('button',{name:'JSON Curvas F3b'}).click()
  ]);
  const saved=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  assert.equal(saved.methodId,'conesa-libro-1997-f3b');
  assert.equal(Object.values(saved.records)[0].points.length,3);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),f3aKey),f3aRaw,
   'F3b edits must not rewrite existing F3a draft');
  await page.screenshot({path:out+'/curvas-f3b-'+width+'.png',
   animations:'disabled',fullPage:true});
  await editor.getByRole('combobox',{name:'F3 tipo de función'}).selectOption('lineal');
  assert.equal(await editor.locator('[data-f3-results]').count(),0,
   'F3b must not show F3a linear output as a curve interpolation');
  await page.locator('[data-conesa-phase-tab="f3a"]').click();
  assert.match(await editor.locator('[data-f3-results]').innerText(),/-0.5500/,
   'Linear result remains available in the environmental quality tab');
  await page.locator('[data-conesa-phase-tab="f3b"]').click();
  await editor.getByRole('combobox',{name:'F3 tipo de función'}).selectOption('curva');
  assert.match(await editor.locator('[data-f3-results]').innerText(),/0.1000/);
  await page.reload();await open();await page.locator('[data-conesa-phase-tab="f3b"]').click();
  await f3.locator('[data-f3-factor]').first().click();
  assert.equal(await editor.getByRole('combobox',{name:'F3 tipo de función'}).inputValue(),'curva');
  assert.match(await editor.locator('[data-f3-results]').innerText(),/0.1000/);
  await page.evaluate(k=>localStorage.setItem(k,'{damaged-F3b-draft'),f3bKey);
  await page.reload();await open();await page.locator('[data-conesa-phase-tab="f3b"]').click();
  assert.equal(await f3.locator('[data-f3b-damaged]').count(),1);
  const [raw]=await Promise.all([
   page.waitForEvent('download'),
   f3.getByRole('button',{name:'Descargar original F3b sin modificar'}).click()
  ]);
  assert.equal(await fs.readFile(await raw.path(),'utf8'),'{damaged-F3b-draft');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),f3bKey),'{damaged-F3b-draft');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),f3aKey),f3aRaw);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',width,curvePoints:3,
   nonMonotone:true,deltaCA:0.1,independent:true,corruptedPreserved:true}));
  await ctx.close();
 }
}finally{await browser.close();}
