import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='qa/ambienta-matrix-methods';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const ctx=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,
   acceptDownloads:true,reducedMotion:'reduce'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices');
  await page.locator('[data-matrix-method-catalog="v1"]').waitFor();
  assert.equal(await page.locator('[data-catalog-method]').count(),4,'Four distinct methods in catalogue');
  assert.equal(await page.locator('[data-catalog-method="battelle"] button').count(),0,
   'Battelle must not be presented as executable without measurement transformation curves');
  assert.equal(await page.locator('[data-impact-matrix="v1"]').count(),1,
   'Existing identification and Leopold workbench remains accessible and compatible');
  assert.equal(await page.locator('[data-matrix-method-catalog] button[aria-pressed="true"]').count(),1);
  const before=await page.evaluate(()=>Object.keys(localStorage)
   .filter(k=>k.startsWith('ambienta-scored-matrix-v1:')));
  assert.equal(before.length,0,'Opening catalog does not generate new scored-matrix records');
  await page.screenshot({path:out+'/catalog-'+width+'.png',animations:'disabled'});
  await page.locator('[data-catalog-method="conesa-1997-2ex"] button').click();
  await page.locator('[data-method-assessment="conesa-1997-2ex"]').waitFor();
  assert.equal(await page.locator('[data-method-assessment] .amb-matrix-cell--negative').count(),0);
  assert.equal(await page.locator('[data-method-assessment] [data-method-cell]').count(),28);
  await page.locator('[data-method-cell]').first().click();
  await page.getByRole('combobox',{name:'Signo Conesa'}).selectOption('-1');
  const conesa={IN:4,EX:2,MO:4,PE:1,RV:1,SI:1,AC:1,EF:1,PR:1,MC:1};
  for(const [criterion,value] of Object.entries(conesa)){
   const field=page.locator('[data-method-editor] label').filter({has:page.getByRole('combobox',{name:new RegExp('^'+criterion+' - ')})});
   assert.equal(await field.count(),1,'Criterion '+criterion+' must be independently configured');
   await field.locator('select').selectOption(String(value));
  }
  assert.equal((await page.locator('[data-method-result]').innerText()).trim(),'-27',
   'Conesa must use 3IN+2EX and ten individual criterion scores');
  await page.getByPlaceholder('Describir por qué se asignó cada criterio y qué incertidumbre persiste…')
    .fill('Escenario didáctico; falta relevamiento y respaldo.');
  await page.screenshot({path:out+'/conesa-'+width+'.png',animations:'disabled'});
  let saved=await page.evaluate(()=>Object.keys(localStorage)
   .filter(k=>k.startsWith('ambienta-scored-matrix-v1:')));
  assert.equal(saved.length,1,'First method must create its own explicit draft only after edits');
  await page.locator('[data-catalog-method="riam-1998"] button').click();
  await page.locator('[data-method-assessment="riam-1998"]').waitFor();
  assert.equal(await page.locator('[data-method-assessment] [data-method-cell]').count(),28);
  assert.equal(await page.locator('[data-method-assessment] .amb-matrix-cell--negative').count(),0,
   'RIAM is empty; incompatible Conesa numbers must NOT leak into a different method');
  await page.locator('[data-method-cell]').first().click();
  const riam={A1:3,A2:-2,B1:3,B2:2,B3:3};
  for(const [criterion,value] of Object.entries(riam))
    await page.getByRole('combobox',{name:new RegExp('^'+criterion+' - ')}).selectOption(String(value));
  assert.equal((await page.locator('[data-method-result]').innerText()).trim(),'-48',
   'RIAM ES = (3×−2) × (3+2+3) = −48');
  await page.screenshot({path:out+'/riam-'+width+'.png',animations:'disabled'});
  saved=await page.evaluate(()=>Object.keys(localStorage)
   .filter(k=>k.startsWith('ambienta-scored-matrix-v1:')));
  assert.equal(saved.length,2,'Conesa and RIAM require different project-scoped saved documents');
  const [download]=await Promise.all([page.waitForEvent('download'),
    page.locator('[data-method-assessment] .amb-matrix-exports button').first().click()]);
  const csv=await fs.readFile(await download.path(),'utf8');
  assert(csv.includes('Pastakia')&&csv.includes('-48'),'Export identifies method and calculated result');
  await page.reload();
  await page.locator('[data-catalog-method="riam-1998"] button').click();
  await page.locator('[data-method-cell]').first().click();
  assert.equal((await page.locator('[data-method-result]').innerText()).trim(),'-48',
   'Scores persist after full reload without altering other methods');
  await page.locator('[data-catalog-method="conesa-1997-2ex"] button').click();
  await page.locator('[data-method-cell]').first().click();
  assert.equal((await page.locator('[data-method-result]').innerText()).trim(),'-27',
   'Conesa original scores still distinct');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overflow<=6,'No whole-site overflow on '+width+'px: '+overflow);
  assert.deepEqual(errors,[],'No JS runtime errors');
  console.log(JSON.stringify({result:'PASS',width,methods:4,working:3,
    conesa:-27,riam:-48,independentStorage:true,errors:0}));
  await ctx.close();
 }
}finally{await browser.close();}
