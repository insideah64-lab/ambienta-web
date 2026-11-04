import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const out='qa/ambienta-matrix-methods';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices');
  await page.locator('[data-matrix-method-catalog="v1"]').waitFor();
  assert.equal(await page.locator('[data-catalog-method]').count(),4);
  assert.equal(await page.locator('[data-catalog-method^="conesa"]').count(),1);
  assert.equal((await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] .amb-method-cardcopy strong').innerText()).trim(),'Conesa');
  assert.equal(await page.locator('[data-catalog-method="battelle"] button').count(),0);
  const ids=['causa-leopold','conesa-simplificado-tutorial-v1','riam-1998','battelle'];
  const accents=[];
  for(const id of ids){
   const card=page.locator('[data-catalog-method="'+id+'"]');
   assert((await card.locator('.amb-method-cardvisual svg').count())>=1);
   accents.push(await card.evaluate(n=>getComputedStyle(n).getPropertyValue('--method-accent').trim()));
  }
  assert.equal(new Set(accents).size,4);
  assert.equal(await page.locator('.amb-method-matrix-art i').count(),16);
  assert.equal(await page.locator('.amb-method-conesa-art').count(),1);
  assert.equal(await page.locator('.amb-method-riam-art i').count(),5);
  assert.equal(await page.locator('.amb-method-battelle-art').count(),1);
  await page.screenshot({path:out+'/catalog-'+width+'.png',animations:'disabled'});
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  const main=page.locator('[data-conesa-book]');
  await main.waitFor();
  assert.equal((await main.locator('h3').first().innerText()).trim(),'Conesa');
  assert.equal(await page.locator('[data-conesa-variant-switch]').count(),0);
  const tabs=page.getByRole('tablist',{name:'Etapas de evaluación Conesa'});
  assert.equal(await tabs.getByRole('tab').count(),4,'One tab for each Conesa workspace');
  assert.equal(await page.locator('[data-conesa-phase-panel="f1"]').isVisible(),true);
  assert.equal(await page.locator('[data-conesa-phase-panel="f2"]').isVisible(),false);
  assert.equal(await page.locator('[data-conesa-phase-panel="f3"]').isVisible(),false);
  const originalKeys=await page.evaluate(()=>Object.keys(localStorage).sort());
  await page.locator('[data-conesa-phase-tab="f1"]').focus();
  await page.keyboard.press('End');
  assert.equal(await page.locator('[data-conesa-phase-tab="f3b"]').getAttribute('aria-selected'),'true',
   'End key opens final curves stage');
  assert.equal(await page.locator('[data-conesa-f3]').getAttribute('data-conesa-f3-focus'),'f3b');
  await page.keyboard.press('Home');
  assert.equal(await page.locator('[data-conesa-phase-tab="f1"]').getAttribute('aria-selected'),'true',
   'Home key returns to first phase');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-conesa-phase-tab="f2"]').getAttribute('aria-selected'),'true');
  await page.locator('[data-conesa-phase-tab="f3a"]').click();
  assert.equal(await page.locator('[data-conesa-f3]').getAttribute('data-conesa-f3-focus'),'f3a');
  await page.locator('[data-conesa-phase-tab="f3b"]').click();
  assert.equal(await page.locator('[data-conesa-f3]').getAttribute('data-conesa-f3-focus'),'f3b');
  await page.locator('[data-conesa-phase-tab="f1"]').click();
  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).sort()),originalKeys,
   'Navigation through empty stages must not seed or rewrite Conesa drafts');

  assert.equal(await page.locator('[data-conesa-simplificado]').count(),0);
  assert.equal(await page.locator('[data-conesa-simplified-archive]').count(),0);
  assert.equal(await page.locator('[data-conesa-legacy-archive]').count(),0);
  const before=await page.evaluate(()=>Object.keys(localStorage).sort());
  await main.locator('[data-conesa-book-cell]').first().click();
  await main.getByRole('combobox',{name:'Conesa libro naturaleza'}).selectOption('-1');
  const values={IN:2,EX:2,EX_CR:0,MO:4,MO_CR:0,PE:4,RV:1,SI:1,AC:1,EF:4,PR:1,MC:2};
  for(const [id,value] of Object.entries(values))
   await main.getByRole('combobox',{name:'Conesa libro '+id,exact:true}).selectOption(String(value));
  assert.equal((await main.locator('[data-book-absolute]').innerText()).trim(),'28');
  assert.equal((await main.locator('[data-book-signed]').innerText()).trim(),'-28');
  assert.equal((await main.locator('[data-book-category]').innerText()).trim(),'Moderado');
  const newKeys=await page.evaluate(()=>Object.keys(localStorage).sort());
  const bookKey=newKeys.find(x=>x.startsWith('ambienta-conesa-libro-1997-f1:'));
  assert(bookKey);
  assert(!newKeys.some(x=>x.startsWith('ambienta-conesa-simplificado-v1:')));
  const projectId=bookKey.slice('ambienta-conesa-libro-1997-f1:'.length);
  assert(before.every(k=>newKeys.includes(k)));
  await page.screenshot({path:out+'/conesa-'+width+'.png',animations:'disabled'});

  await page.locator('[data-catalog-method="riam-1998"] button').click();
  await page.locator('[data-method-assessment="riam-1998"]').waitFor();
  await page.locator('[data-method-cell]').first().click();
  for(const [id,value] of Object.entries({A1:3,A2:-2,B1:3,B2:2,B3:3}))
   await page.getByRole('combobox',{name:new RegExp('^'+id+' - ')}).selectOption(String(value));
  assert.equal((await page.locator('[data-method-result]').innerText()).trim(),'-48');

  const oldKey='ambienta-scored-matrix-v1:'+projectId+':conesa-1997-2ex';
  const oldDoc={schema:'ambienta.scored-matrix.v1',projectId,projectName:'EJERCICIO QA',
   method:'conesa-1997-2ex',updatedAt:'2026-11-03T00:00:00Z',entries:{
    'demo-f1::demo-a1':{sign:-1,criteria:{IN:4,EX:2,MO:4,PE:1,RV:1,SI:1,AC:1,EF:1,PR:1,MC:1},
     reason:'Histórico',evidence:'DOC-ANT-01'}}};
  const simpleKey='ambienta-conesa-simplificado-v1:'+projectId;
  const simpleDoc={schema:'ambienta.conesa-simplificado.v1',projectId,
   projectName:'EJERCICIO QA',updatedAt:'2026-11-03T00:00:00Z',entries:{
    'demo-f1::demo-a1':{sign:-1,criteria:values,reason:'Histórico Excel',evidence:'EXCEL-01'}}};
  await page.evaluate(({oldKey,oldDoc,simpleKey,simpleDoc})=>{
   localStorage.setItem(oldKey,JSON.stringify(oldDoc));
   localStorage.setItem(simpleKey,JSON.stringify(simpleDoc));
  },{oldKey,oldDoc,simpleKey,simpleDoc});
  const oldBefore=await page.evaluate(({oldKey,simpleKey})=>[localStorage.getItem(oldKey),
   localStorage.getItem(simpleKey)],{oldKey,simpleKey});
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  await page.locator('[data-conesa-simplified-archive]').waitFor();
  await page.locator('[data-conesa-legacy-archive]').waitFor();
  assert.equal(await page.locator('[data-conesa-book]').count(),1);
  assert.equal(await page.locator('[data-conesa-simplificado]').count(),0);
  await page.getByRole('button',{name:'Consultar y exportar archivo simplificado'}).click();
  const archive=page.locator('[data-conesa-simplified-archive] [data-conesa-simplificado]');
  await archive.waitFor();
  assert.equal(await archive.locator('[data-conesa-review-row]').count(),1);
  await archive.locator('[data-conesa-cell]').first().click();
  assert.equal((await archive.locator('[data-conesa-signed]').innerText()).trim(),'-28');
  assert.equal(await archive.getByRole('combobox',{name:'Naturaleza Conesa revisado'}).isDisabled(),true);
  assert.equal(await archive.getByRole('combobox',{name:'Conesa IN'}).isDisabled(),true);
  assert.equal(await archive.getByRole('button',{name:'Eliminar valoración'}).count(),0);
  const [legacyJson]=await Promise.all([page.waitForEvent('download'),
   archive.getByRole('button',{name:'JSON',exact:true}).click()]);
  assert((await fs.readFile(await legacyJson.path(),'utf8')).includes('EXCEL-01'));
  await page.getByRole('button',{name:'Consultar y exportar valoraciones anteriores'}).click();
  const oldArchive=page.locator('[data-method-assessment="conesa-1997-2ex"]');
  await oldArchive.waitFor();await oldArchive.locator('[data-method-cell]').first().click();
  assert.equal((await oldArchive.locator('[data-method-result]').innerText()).trim(),'-27');
  assert.equal(await oldArchive.getByRole('combobox',{name:'Signo Conesa'}).isDisabled(),true);
  assert.deepEqual(await page.evaluate(({oldKey,simpleKey})=>[localStorage.getItem(oldKey),
   localStorage.getItem(simpleKey)],{oldKey,simpleKey}),oldBefore);

  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  assert.equal((await page.locator('[data-conesa-book] h3').first().innerText()).trim(),'Conesa');
  assert.equal(await page.locator('[data-conesa-simplified-archive]').count(),1);
  assert.equal(await page.locator('[data-conesa-legacy-archive]').count(),1);
  await page.evaluate(({oldKey,simpleKey})=>{
   localStorage.setItem(oldKey,'{damaged-old');
   localStorage.setItem(simpleKey,'{damaged-simple');
  },{oldKey,simpleKey});
  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  const [rawSimple]=await Promise.all([page.waitForEvent('download'),
   page.getByRole('button',{name:'Descargar respaldo simplificado sin modificar'}).click()]);
  assert.equal(await fs.readFile(await rawSimple.path(),'utf8'),'{damaged-simple');
  const [rawOld]=await Promise.all([page.waitForEvent('download'),
   page.getByRole('button',{name:'Descargar respaldo anterior sin modificar'}).click()]);
  assert.equal(await fs.readFile(await rawOld.path(),'utf8'),'{damaged-old');
  assert.equal(await page.locator('[data-conesa-book]').count(),1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overflow<=6,'No desktop overflow: '+overflow);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',width,conesaEditors:1,book:-28,
   oldExcelPreserved:true,readOnly:true,oldArchivePreserved:true,errors:0}));
  await context.close();
 }
}finally{await browser.close()}
