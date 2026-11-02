import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='qa/ambienta-conesa-simplificado';
await fs.mkdir(out,{recursive:true});

/** Reconstructed from user-provided "matriz metodo CONESSA.xlsx", EJEMPLO rows 5–9.
 * This fixture is a didactic input, NEVER attributed to a real Diablillos EIA.
 */
const examples=[
 {name:'Cobertura vegetal',IN:2,EX:2,MO:4,PE:4,RV:1,SI:1,AC:1,EF:4,PR:1,MC:2,absolute:28,cat:'Moderado'},
 {name:'Paisaje',IN:8,EX:2,MO:4,PE:2,RV:2,SI:1,AC:1,EF:1,PR:4,MC:4,absolute:47,cat:'Moderado'},
 {name:'Agua por sólidos',IN:8,EX:8,MO:4,PE:4,RV:3,SI:1,AC:4,EF:4,PR:2,MC:4,absolute:66,cat:'Severo'},
 {name:'Aire por partículas',IN:8,EX:1,MO:4,PE:4,RV:1,SI:1,AC:1,EF:4,PR:2,MC:1,absolute:44,cat:'Moderado'},
 {name:'Suelo por residuos',IN:12,EX:1,MO:4,PE:4,RV:4,SI:1,AC:4,EF:4,PR:2,MC:1,absolute:62,cat:'Severo'}
];
const calc=v=>3*v.IN+2*v.EX+v.MO+v.PE+v.RV+v.SI+v.AC+v.EF+v.PR+v.MC;
assert.deepEqual(examples.map(x=>calc(x)),[28,47,66,44,62],
 'Independent arithmetic of all 5 tutorial rows must match the uploaded workbook');
const rvScale=[1,2,4];
assert.equal(examples.filter(x=>!rvScale.includes(x.RV)).length,1,
 'One published tutorial example uses RV=3, outside its own declared scale');
assert.equal(examples.find(x=>x.RV===3)?.absolute,66);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const ctx=await browser.newContext({viewport:{width,height:900},
   reducedMotion:'reduce',acceptDownloads:true});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices');
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"]').waitFor();
  const nav=page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button');
  await nav.click();
  await page.locator('[data-conesa-simplificado="conesa-simplificado-tutorial-v1"]').waitFor();
  assert.equal(await page.locator('[data-conesa-review-row]').count(),0,
   'The new method does not seed real or example scores');
  const initial=await page.evaluate(()=>Object.keys(localStorage).filter(
    x=>x.startsWith('ambienta-conesa-simplificado-v1:')));
  assert.equal(initial.length,0,'Opening variant must not persist an empty document');
  const projectId=(await page.locator('.amb-conesa-rev .amb-matrix-footer span').first().innerText())
   .split('·').at(-1)?.trim();
  assert(projectId);
  const entries={};
  const demoFactors=['demo-f1','demo-f2','demo-f3','demo-f4'];
  // Four valid examples of the uploaded workbook. The fifth (water/RV=3)
  // remains an explicit validation anomaly, not secretly allowed or coerced.
  const usable=[examples[0],examples[1],examples[3],examples[4]];
  for(let i=0;i<usable.length;i++){
   const e=usable[i],criteria={};
   for(const key of ['IN','EX','MO','PE','RV','SI','AC','EF','PR','MC'])criteria[key]=e[key];
   criteria.EX_CR=0;criteria.MO_CR=0;
   entries[demoFactors[i]+'::demo-a1']={sign:-1,criteria,
     reason:'Solo ejercicio de Conesa simplificado, sin datos de campo.',
     evidence:'matriz metodo CONESSA.xlsx · EJEMPLO'};
  }
  await page.evaluate(({projectId,entries})=>{
   localStorage.setItem('ambienta-conesa-simplificado-v1:'+projectId,JSON.stringify({
    schema:'ambienta.conesa-simplificado.v1',projectId,
    projectName:'EJERCICIO DIDÁCTICO, NO DIABLILLOS',
    updatedAt:new Date().toISOString(),entries
   }));
  },{projectId,entries});
  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  const panel=page.locator('[data-conesa-simplificado]');
  assert.equal(await panel.locator('[data-conesa-review-row]').count(),4);
  const expected=[28,47,44,62],cats=['Moderado','Moderado','Moderado','Severo'];
  for(let i=0;i<4;i++){
   const row=panel.locator('[data-conesa-review-row]').nth(i);
   assert.equal((await row.locator('[data-review-absolute]').innerText()).trim(),String(expected[i]));
   assert.equal((await row.locator('[data-review-signed]').innerText()).trim(),String(-expected[i]));
   assert.equal((await row.locator('[data-review-category]').innerText()).trim(),cats[i]);
  }
  assert.equal((await panel.locator('.amb-conesa-kpis span').nth(1).locator('strong').innerText()),'4');
  await page.screenshot({path:out+'/conesa-reviewed-'+width+'.png',animations:'disabled'});
  const row=panel.locator('[data-conesa-review-row]').first();
  await row.locator('button').click();
  assert.equal((await panel.locator('[data-conesa-absolute]').innerText()).trim(),'28');
  assert.equal((await panel.locator('[data-conesa-signed]').innerText()).trim(),'-28');
  assert.equal((await panel.locator('[data-conesa-category]').innerText()).trim(),'Moderado');
  await panel.getByRole('combobox',{name:'Conesa RV'}).selectOption('2');
  assert.equal((await panel.locator('[data-conesa-absolute]').innerText()).trim(),'29',
   'Changing RV updates a computed row, unlike the hardcoded Excel results');
  await panel.getByRole('combobox',{name:'Conesa RV'}).selectOption('1');
  assert.equal((await panel.locator('[data-conesa-absolute]').innerText()).trim(),'28');
  assert.equal(await panel.locator('select[aria-label="Conesa RV"] option[value="3"]').count(),0,
   'RV=3 stays prohibited by this declared variant');
  await panel.getByRole('combobox',{name:'Conesa EX_CR'}).selectOption('4');
  assert.equal((await panel.locator('[data-conesa-absolute]').innerText()).trim(),'Pendiente',
   'Critical extension without supporting evidence cannot be accepted');
  await panel.getByRole('combobox',{name:'Conesa EX_CR'}).selectOption('0');
  const [dl]=await Promise.all([page.waitForEvent('download'),panel.getByRole('button',{name:'CSV',exact:true}).click()]);
  const csv=await fs.readFile(await dl.path(),'utf8');
  assert(csv.includes('"28"')&&csv.includes('"-28"')&&csv.includes('"62"'));
  assert(csv.includes('"conesa-simplificado-tutorial-v1"'));
  assert(csv.includes('matriz metodo CONESSA.xlsx'));
  // Still independent of the 1997 engine and other saved methods.
  const allKeys=await page.evaluate(()=>Object.keys(localStorage));
  assert.equal(allKeys.filter(k=>k.startsWith('ambienta-conesa-simplificado-v1:')).length,1);
  await page.locator('[data-catalog-method="conesa-1997-2ex"] button').click();
  assert.equal(await page.locator('[data-method-assessment="conesa-1997-2ex"] [data-method-cell]').count(),28);
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  assert.equal(await panel.locator('[data-conesa-review-row]').count(),4);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overflow<=6,'No page-wide horizontal overflow at '+width+' px: '+overflow);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',viewport:width,workbookResults:examples.map(x=>x.absolute),
   acceptedResults:expected,flaggedRV3:66,
   criticalRequiresEvidence:true,reactiveCalculation:true,isolatedLegacyStorage:true,errors:0}));
  await ctx.close();
 }
}finally{await browser.close();}
