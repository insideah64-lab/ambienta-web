import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const out='qa/ambienta-conesa-libro-f1';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const context=await browser.newContext({viewport:{width,height:900},
   acceptDownloads:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices');
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  await page.locator('[data-conesa-variant-switch]').waitFor();
  assert.equal(await page.locator('[data-catalog-method^="conesa"]').count(),1,
   'Book and workbook must not create two Conesa method cards');
  assert.equal(await page.locator('[data-conesa-simplificado]').count(),1,
   'Compatibility default keeps tutorial draft accessible');
  const oldKeys=await page.evaluate(()=>Object.keys(localStorage).sort());
  await page.getByRole('button',{name:'Según libro · Conesa 1997 (experimental)'}).click();
  const panel=page.locator('[data-conesa-book]');
  await panel.waitFor();
  assert.equal(await page.locator('[data-conesa-simplificado]').count(),0,
   'Only one Conesa editor mounted at a time');
  const original=await page.evaluate(()=>Object.keys(localStorage));
  assert(!original.some(k=>k.startsWith('ambienta-conesa-libro-1997-f1:')),
   'Opening a blank F1 matrix never creates a false evaluation');
  assert.deepEqual(oldKeys,original.sort(),'Opening F1 does not overwrite old documents');
  await panel.locator('[data-conesa-book-cell]').first().click();
  await panel.getByRole('combobox',{name:'Conesa libro naturaleza'}).selectOption('-1');
  const values={IN:2,EX:2,EX_CR:0,MO:4,MO_CR:0,PE:4,RV:1,SI:1,AC:1,EF:4,PR:1,MC:2};
  for(const [id,value] of Object.entries(values))
   await panel.getByRole('combobox',{name:'Conesa libro '+id,exact:true}).selectOption(String(value));
  assert.equal((await panel.locator('[data-book-absolute]').innerText()).trim(),'28');
  assert.equal((await panel.locator('[data-book-signed]').innerText()).trim(),'-28');
  assert.equal((await panel.locator('[data-book-category]').innerText()).trim(),'Moderado');
  assert.equal(await panel.locator('select[aria-label="Conesa libro RV"] option[value="3"]').count(),0);
  await panel.getByRole('combobox',{name:'Conesa libro MO_CR'}).selectOption('1');
  assert.equal((await panel.locator('[data-book-absolute]').innerText()).trim(),'Pendiente',
   'Critical moment requires justification and evidence');
  await panel.getByPlaceholder('Justificar criterios, circunstancias críticas y compensación…')
   .fill('Criterio didáctico, no representa una observación real');
  await panel.getByPlaceholder('Referencia verificable, documento y localización del impacto')
   .fill('Conesa 1997, p. 90');
  assert.equal((await panel.locator('[data-book-absolute]').innerText()).trim(),'29');
  await panel.getByRole('combobox',{name:'Conesa libro MO_CR'}).selectOption('4');
  assert.equal((await panel.locator('[data-book-absolute]').innerText()).trim(),'32');
  await panel.getByRole('combobox',{name:'Conesa libro MO_CR'}).selectOption('0');
  await panel.getByRole('combobox',{name:'Conesa libro naturaleza'}).selectOption('x');
  assert.equal((await panel.locator('[data-book-absolute]').innerText()).trim(),'28');
  assert.equal((await panel.locator('[data-book-signed]').innerText()).trim(),'Indeterminado');
  assert.equal((await panel.locator('[data-book-category]').innerText()).trim(),'Indeterminado');
  await panel.getByRole('combobox',{name:'Conesa libro naturaleza'}).selectOption('-1');
  await panel.getByRole('combobox',{name:'Conesa libro MC',exact:true}).selectOption('4');
  assert.equal((await panel.locator('[data-book-absolute]').innerText()).trim(),'Pendiente',
   'MC=4 requires mitigation vs compensation declaration');
  await panel.getByRole('combobox',{name:'Conesa libro recuperación'}).selectOption('compensable');
  assert.equal((await panel.locator('[data-book-absolute]').innerText()).trim(),'30');
  await page.screenshot({path:out+'/conesa-libro-'+width+'.png',animations:'disabled'});
  const bookKey=await page.evaluate(()=>Object.keys(localStorage).find(k=>k.startsWith('ambienta-conesa-libro-1997-f1:')));
  assert(bookKey,'F1 saves only into its own versioned key');
  assert.equal(await panel.locator('[data-book-review-row]').count(),1);
  const [json]=await Promise.all([
   page.waitForEvent('download'),
   panel.getByRole('button',{name:'JSON',exact:true}).click()
  ]);
  const parsed=JSON.parse(await fs.readFile(await json.path(),'utf8'));
  assert.equal(parsed.methodId,'conesa-libro-1997-cualitativo-f1');
  assert.equal(parsed.entries[Object.keys(parsed.entries)[0]].recovery,'compensable');
  assert(parsed.boundaryPolicy.includes('50<=I<=75'));
  const [csv]=await Promise.all([page.waitForEvent('download'),panel.getByRole('button',{name:'CSV',exact:true}).click()]);
  const csvText=await fs.readFile(await csv.path(),'utf8');
  assert(csvText.includes('conesa-libro-1997-cualitativo-f1'));
  assert(csvText.includes('compensable'));
  await page.getByRole('button',{name:'Simplificado · Excel anterior'}).click();
  await page.locator('[data-conesa-simplificado]').waitFor();
  assert.equal(await page.locator('[data-conesa-book]').count(),0);
  await page.getByRole('button',{name:'Según libro · Conesa 1997 (experimental)'}).click();
  await panel.locator('[data-conesa-book-cell]').first().click();
  assert.equal((await panel.locator('[data-book-absolute]').innerText()).trim(),'30');
  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  await page.getByRole('button',{name:'Según libro · Conesa 1997 (experimental)'}).click();
  await page.locator('[data-conesa-book-cell]').first().click();
  assert.equal((await panel.locator('[data-book-absolute]').innerText()).trim(),'30');
  assert.equal((await panel.locator('[data-book-category]').innerText()).trim(),'Moderado');
  const before=await page.evaluate(key=>localStorage.getItem(key),bookKey);
  await page.evaluate(key=>localStorage.setItem(key,'{malformed-F1'),bookKey);
  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  await page.getByRole('button',{name:'Según libro · Conesa 1997 (experimental)'}).click();
  assert.equal(await panel.locator('[role="alert"]').count(),1);
  await panel.locator('[data-conesa-book-cell]').first().click();
  assert.equal(await panel.getByRole('combobox',{name:'Conesa libro naturaleza'}).isDisabled(),true);
  const [raw]=await Promise.all([page.waitForEvent('download'),
   panel.getByRole('button',{name:'Descargar respaldo original'}).click()]);
  assert.equal(await fs.readFile(await raw.path(),'utf8'),'{malformed-F1');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),bookKey),'{malformed-F1');
  assert(before&&JSON.parse(before).methodId==='conesa-libro-1997-cualitativo-f1');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',width,bookScore:30,
   momentCritical:[29,32],natureX:'Indeterminado',
   preservedMalformed:true,methodCards:1,errors:errors.length}));
  await context.close();
 }
}finally{await browser.close()}
