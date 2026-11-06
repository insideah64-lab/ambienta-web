import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createDemoState} from '../../../web/domain.mjs';

// Source data comes from the actual DEMO-001 fixture. Numerical controls below
// are existing regression examples, never measurements of this urbanization.
const fixture=createDemoState(),sourceRaw=JSON.stringify(fixture);
const sourceKey='ambienta-pga-demo-v05',matrixKey='ambienta-impact-matrix-v1:DEMO-001';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:8787/v3/';
const out=process.env.QA_OUTPUT||'qa/ambienta-demo-project-matrices/local';
await fs.mkdir(out,{recursive:true});
await fs.writeFile(out+'/source-project.json',JSON.stringify(fixture,null,2));
const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const width of [1366,1800]){
  const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true,reducedMotion:'reduce'});
  await context.addInitScript(({key,raw})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,raw);},{key:sourceKey,raw:sourceRaw});
  const page=await context.newPage(),logs={pageerrors:[],failed:[],httpErrors:[]};let step='source-register';
  page.on('pageerror',e=>logs.pageerrors.push(String(e)));
  page.on('requestfailed',r=>logs.failed.push({url:r.url(),error:r.failure()}));
  page.on('response',r=>{if(r.status()>=400)logs.httpErrors.push({status:r.status(),url:r.url()});});
  const evidence={width,base,sourceProject:fixture.project,sourceImpactIds:fixture.impacts.map(i=>i.id),
   sourceHash:createHash('sha256').update(sourceRaw).digest('hex'),logs,checks:{}};
  const saveDownload=async(locator,name)=>{
   const event=page.waitForEvent('download');await locator.click();const file=await event;
   const path=out+'/'+width+'-'+name;await file.saveAs(path);const text=await fs.readFile(path,'utf8');
   assert(text.length>0);return name.endsWith('.json')?JSON.parse(text):text;
  };
  const openConesa=async()=>{await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();await page.locator('[data-conesa-book]').waitFor();};
  try{
   await page.goto(base+'index.html#/impactos');
   for(const impact of fixture.impacts){const row=page.locator('.v2-table tbody tr').filter({hasText:impact.id});assert.equal(await row.count(),1);const text=await row.innerText();assert(text.includes(impact.name)&&text.includes(impact.factor)&&text.includes(impact.phase)&&text.includes(impact.sign));}
   evidence.checks.sourceRegister='PASS: four original impact IDs, names and signs';
   await page.locator('[data-open-matrix-tool]').click();const leopold=page.locator('[data-impact-matrix]');await leopold.waitFor();
   step='source-catalog-import';
   await leopold.getByRole('button',{name:'Incorporar factores existentes del expediente',exact:true}).click();
   let matrix=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),matrixKey));
   assert.equal(matrix.factors.length,11);assert.equal(matrix.actions.length,4);assert.deepEqual(matrix.cells,{});
   const actualFactors=fixture.impacts.map(impact=>{const rows=matrix.factors.filter(f=>f.name===impact.factor);assert.equal(rows.length,1);return {...impact,factorId:rows[0].id};});
   const rawImported=await page.evaluate(k=>localStorage.getItem(k),matrixKey);
   await leopold.getByRole('button',{name:'Incorporar factores existentes del expediente',exact:true}).click();
   assert.equal(await page.evaluate(k=>localStorage.getItem(k),matrixKey),rawImported,'Repeated import must not duplicate rows or rewrite the draft');
   const sourceOnly=await saveDownload(leopold.locator('.amb-matrix-exports').getByRole('button',{name:'JSON',exact:true}),'source-only-leopold.json');
   assert.deepEqual(sourceOnly.cells,{});assert(sourceOnly.actions.every(a=>a.name.includes('ejemplo')));
   await page.screenshot({path:out+'/'+width+'-source-only-leopold.png',fullPage:true});
   await openConesa();const book=page.locator('[data-conesa-book]');
   assert.equal(await book.locator('[data-conesa-book-cell]').count(),44);
   assert.equal(await book.locator('.amb-conesa-kpis>span').nth(1).locator('strong').innerText(),'0');
   await page.locator('[data-conesa-phase-tab="f3a"]').click();const f3=page.locator('[data-conesa-f3]');
   assert.equal(await f3.locator('[data-f3-factor]').count(),11);
   assert.equal(await f3.locator('.amb-f3-quality-count').innerText(),'0 de 11 factores calculables');
   assert.equal(await f3.locator('[data-f3-chart-row]').count(),0);
   await page.screenshot({path:out+'/'+width+'-source-only-conesa.png',fullPage:true});
   evidence.checks.sourceOnly='PASS: imported four factors, 44 unassessed crossings; no invented scores or environmental measurements';
   evidence.checks.environmentalAssessment='BLOCKED: fixture lacks M/I, complete F1 criteria, UIP judgments and SIN/CON measurements/functions';
   const soil=actualFactors.find(f=>f.factor==='Suelo'),action=matrix.actions[0],cellKey=soil.factorId+'::'+action.id;
   evidence.control={impactId:soil.id,factorId:soil.factorId,actionId:action.id,
    warning:'Illustrative constructor action and existing QA numerical controls; not an assessment of the project'};

   step='leopold-controlled-valuation';
   await page.locator('[data-catalog-method="causa-leopold"] button').click();
   const row=leopold.locator('tbody tr').filter({has:page.getByRole('rowheader',{name:/^Suelo\b/})});
   await row.locator('.amb-matrix-cell').first().click();
   await page.getByRole('button',{name:'− Adverso',exact:true}).click();
   await page.getByPlaceholder('Describir relación causal, escenario, temporalidad e incertidumbre…').fill(
    'Fuente del factor y signo: '+soil.id+' '+soil.name+'. Cruce ilustrativo y valores del control QA, sin medición de este proyecto.');
   await page.getByPlaceholder('Código, página, enlace o informe verificable…').fill('DEMO-001 / '+soil.id+'; magnitud e importancia: control QA previo');
   assert.equal(await leopold.locator('.amb-matrix-kpis>span').nth(2).locator('strong').innerText(),'0');
   await page.getByRole('combobox',{name:'Magnitud del impacto',exact:true}).selectOption('7');
   await page.getByRole('combobox',{name:'Importancia del impacto',exact:true}).selectOption('5');
   assert.equal((await row.locator('.amb-matrix-cell').first().innerText()).trim(),'−7/5');
   const leopoldRaw=await page.evaluate(k=>localStorage.getItem(k),matrixKey);
   const leopoldJson=await saveDownload(leopold.locator('.amb-matrix-exports').getByRole('button',{name:'JSON',exact:true}),'leopold.json');
   const leopoldCsv=await saveDownload(leopold.locator('.amb-matrix-exports').getByRole('button',{name:'CSV',exact:true}),'leopold.csv');
   assert.equal(leopoldJson.cells[cellKey].magnitude,7);assert.equal(leopoldJson.cells[cellKey].importance,5);assert(leopoldCsv.includes(soil.id));
   assert.equal(Object.keys(leopoldJson.cells).length,1,'Unrelated project factors must stay unassessed');
   await page.reload();await leopold.waitFor();assert.equal((await row.locator('.amb-matrix-cell').first().innerText()).trim(),'−7/5');
   await row.locator('.amb-matrix-cell').first().click();
   await page.screenshot({path:out+'/'+width+'-leopold-control.png',fullPage:true});
   await leopold.locator('[data-matrix-canvas]').screenshot({path:out+'/'+width+'-leopold-detail.png'});
   evidence.checks.leopold='PASS: -7/5 on imported Suelo, real reload and JSON/CSV; other factors unassessed';

   step='conesa-f1-independent';await openConesa();
   await book.locator('[data-conesa-book-cell="'+cellKey+'"]').click();
   assert.equal(await book.locator('[data-book-signed]').innerText(),'Pendiente','Leopold scores must not populate Conesa');
   await book.getByRole('combobox',{name:'Conesa libro naturaleza',exact:true}).selectOption('-1');
   assert.equal(await book.locator('[data-book-signed]').innerText(),'Pendiente');
   const values={IN:4,EX:2,EX_CR:0,MO:4,MO_CR:0,PE:4,RV:1,SI:1,AC:1,EF:4,PR:1,MC:2};
   for(const [id,value] of Object.entries(values))await book.getByRole('combobox',{name:'Conesa libro '+id,exact:true}).selectOption(String(value));
   await book.getByPlaceholder('Justificar criterios, circunstancias críticas y compensación…').fill('Criterios numéricos del control QA previo, no valoración ambiental del expediente. Factor y signo tomados de '+soil.id+'.');
   await book.getByPlaceholder('Referencia verificable, documento y localización del impacto').fill('DEMO-001 / '+soil.id+'; escala de ensayo de conesa-libro-f2-smoke.mjs');
   assert.equal(await book.locator('[data-book-signed]').innerText(),'-34');assert.equal(await book.locator('[data-book-category]').innerText(),'Moderado');
   const f1=await saveDownload(book.locator('.amb-conesa-top .amb-matrix-exports').getByRole('button',{name:'JSON',exact:true}),'conesa-f1.json');
   const f1Csv=await saveDownload(book.locator('.amb-conesa-top .amb-matrix-exports').getByRole('button',{name:'CSV',exact:true}),'conesa-f1.csv');
   assert.deepEqual(f1.entries[cellKey].criteria,values);assert(f1Csv.includes('Suelo')&&f1Csv.includes('34'));
   await page.reload();await openConesa();await book.locator('[data-conesa-book-cell="'+cellKey+'"]').click();assert.equal(await book.locator('[data-book-signed]').innerText(),'-34');
   await page.screenshot({path:out+'/'+width+'-conesa-f1.png',fullPage:true});evidence.checks.f1='PASS: -34, Moderado; independent criteria and real reload/export';

   step='conesa-f2-eleven-factors';await page.locator('[data-conesa-phase-tab="f2"]').click();const f2=page.locator('[data-conesa-f2]');
   await f2.getByRole('button',{name:'Registrar ponderación de factores',exact:true}).click();
   assert.match(await f2.locator('[data-f2-uip-total]').innerText(),/pendientes/);
   await f2.getByRole('textbox',{name:'Conesa F2 panel',exact:true}).fill('Equipo ficticio de control QA, sin panel real');
   await f2.getByRole('textbox',{name:'Conesa F2 fuente UIP',exact:true}).fill('Pesos iguales de ensayo; no derivados de las medidas del expediente');
   await f2.getByLabel('Conesa F2 fecha UIP',{exact:true}).fill('2026-11-04');
   const weights=f2.locator('.amb-f2-weight-table input[type="number"]');assert.equal(await weights.count(),11);
   for(let i=0;i<11;i++)await weights.nth(i).fill('1');
   assert.match(await f2.locator('[data-f2-uip-total]').innerText(),/1000 UIP/);
   const f2File=await saveDownload(f2.getByRole('button',{name:'JSON F2',exact:true}),'conesa-f2.json');
   assert.equal(Object.keys(f2File.uip.coefficients).length,11);assert(Object.values(f2File.uip.coefficients).every(n=>n===1));
   await saveDownload(f2.getByRole('button',{name:'CSV F2',exact:true}),'conesa-f2.csv');
   await page.reload();await openConesa();await page.locator('[data-conesa-phase-tab="f2"]').click();
   await f2.getByRole('button',{name:'Registrar ponderación de factores',exact:true}).click();assert.match(await f2.locator('[data-f2-uip-total]').innerText(),/1000 UIP/);
   const distributed=await f2.locator('.amb-f2-weight-table tbody tr td:last-child').allTextContents();
   assert.equal(distributed.reduce((sum,value)=>sum+Number(value.trim()),0),1000);
   evidence.checks.f2='PASS: 1000 UIP for 11 factors after actual reload; equal weights explicitly supplied as QA controls';

   step='conesa-f3a';await page.locator('[data-conesa-phase-tab="f3a"]').click();await f3.locator('[data-f3-factor="'+soil.factorId+'"]').click();
   const editor=f3.locator('[data-f3-editor]');
   for(const [name,value] of Object.entries({'F3 indicador':'Parámetro sintético de control QA','F3 unidad':'mg/L','F3 composición':'Ensayo funcional del factor importado; no representa mediciones de suelo del proyecto','F3 función fuente':'Función sintética del control QA previo','F3 función alcance':'Solo prueba informática entre 0 y 100, sin validez ambiental local','F3 without fuente':'Escenario SIN sintético del control QA','F3 withProject fuente':'Escenario CON sintético del control QA'}))await editor.getByRole('textbox',{name,exact:true}).fill(value);
   for(const [name,value] of Object.entries({'F3 mínimo':'0','F3 máximo':'100','F3 without magnitud':'20','F3 withProject magnitud':'50'}))await editor.getByRole('spinbutton',{name,exact:true}).fill(value);
   await editor.getByRole('combobox',{name:'F3 orientación',exact:true}).selectOption('decreciente');
   await editor.getByRole('combobox',{name:'F3 without tipo',exact:true}).selectOption('estimado');
   await editor.getByRole('combobox',{name:'F3 withProject tipo',exact:true}).selectOption('estimado');
   await editor.getByLabel('F3 without fecha',{exact:true}).fill('2026-11-04');await editor.getByLabel('F3 withProject fecha',{exact:true}).fill('2026-11-04');
   assert.equal(await f3.locator('.amb-f3-quality-count').innerText(),'1 de 11 factores calculables');
   const linear=await editor.locator('[data-f3-results]').innerText();assert(linear.includes('0.8000')&&linear.includes('0.5000')&&linear.includes('-0.3000'));
   const f3File=await saveDownload(f3.getByRole('button',{name:'JSON F3a',exact:true}),'conesa-f3a.json');
   assert.equal(f3File.records[soil.factorId].without.value,20);assert.equal(f3File.records[soil.factorId].withProject.value,50);
   assert.equal(f3File.records[soil.factorId].without.kind,'estimado');
   await saveDownload(f3.getByRole('button',{name:'CSV F3a/F3b',exact:true}),'conesa-f3a.csv');
   await page.screenshot({path:out+'/'+width+'-conesa-f3a.png',fullPage:true});evidence.checks.f3a='PASS: 0.8 / 0.5 / -0.3 and 1/11 factors';

   step='conesa-f3b';await page.locator('[data-conesa-phase-tab="f3b"]').click();
   await editor.getByRole('combobox',{name:'F3 tipo de función',exact:true}).selectOption('curva');
   assert.equal(await editor.locator('[data-f3-results]').count(),0);
   await editor.getByRole('combobox',{name:'F3b procedencia',exact:true}).selectOption('expertos');
   for(const [name,value] of Object.entries({'F3b fuente':'Acta sintética QA, no una curva del Anejo 4','F3b responsable':'Equipo ficticio de ensayo informático','F3b ámbito':'Solo control sintético entre M=0 y M=100, no evaluación del proyecto','F3b evidencia':'Nudos de regresión ya usados en el repositorio, no lecturas ambientales'}))await editor.getByRole('textbox',{name,exact:true}).fill(value);
   for(const [name,value] of Object.entries({'F3b magnitud nudo 1':'0','F3b CA nudo 1':'0','F3b magnitud nudo 2':'50','F3b CA nudo 2':'1'}))await editor.getByRole('spinbutton',{name,exact:true}).fill(value);
   await editor.getByRole('button',{name:'Añadir nudo',exact:true}).click();await editor.getByRole('spinbutton',{name:'F3b magnitud nudo 3',exact:true}).fill('100');await editor.getByRole('spinbutton',{name:'F3b CA nudo 3',exact:true}).fill('0');
   assert.equal(await editor.locator('[data-f3b-ready]').count(),1);
   const curveFile=await saveDownload(f3.getByRole('button',{name:'JSON Curvas F3b',exact:true}),'conesa-f3b.json');
   assert.equal(curveFile.records[soil.factorId].origin,'expertos');
   assert.deepEqual(curveFile.records[soil.factorId].points,[{m:0,ca:0},{m:50,ca:1},{m:100,ca:0}]);
   await page.reload();await openConesa();await page.locator('[data-conesa-phase-tab="f3a"]').click();await f3.locator('[data-f3-factor="'+soil.factorId+'"]').click();
   const curve=await editor.locator('[data-f3-results]').innerText();assert(curve.includes('0.4000')&&curve.includes('1.0000')&&curve.includes('0.6000'));
   assert.equal(await f3.locator('.amb-f3-quality-count').innerText(),'1 de 11 factores calculables');
   await saveDownload(f3.getByRole('button',{name:'CSV F3a/F3b',exact:true}),'conesa-f3b.csv');
   await page.screenshot({path:out+'/'+width+'-conesa-f3b.png',fullPage:true});evidence.checks.f3b='PASS: 0.4 / 1 / +0.6 after real reload; active curve reflected in F3a, 1/11 factors';
   assert.equal(await page.evaluate(k=>localStorage.getItem(k),matrixKey),leopoldRaw,'Conesa must not modify Leopold');
   assert.equal(await page.evaluate(k=>localStorage.getItem(k),sourceKey),sourceRaw,'The original project register must remain byte-identical');
   evidence.checks.sourcePreserved='PASS: original project, impacts, measures, evidence and revision byte-identical';
   evidence.assets=await page.locator('script[src],link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(n=>n.src||n.href));
   assert.deepEqual(logs.pageerrors,[]);assert.deepEqual(logs.failed,[]);assert.deepEqual(logs.httpErrors,[]);
   evidence.status='PASS';
  }catch(error){evidence.status='FAIL';evidence.step=step;evidence.error=String(error.stack||error);await page.screenshot({path:out+'/'+width+'-FAIL.png',fullPage:true}).catch(()=>{});}
  results.push(evidence);await fs.writeFile(out+'/results.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify({width,base,status:evidence.status,step:evidence.step,error:evidence.error,checks:evidence.checks}));
  await context.close();
 }
}finally{await browser.close();}
if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
