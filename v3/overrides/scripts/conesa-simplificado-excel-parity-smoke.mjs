import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const out='qa/ambienta-conesa-simplificado';
await fs.mkdir(out,{recursive:true});
// Parity of user-provided workbook, kept as an archival-only source.
const examples=[
 {IN:2,EX:2,MO:4,PE:4,RV:1,SI:1,AC:1,EF:4,PR:1,MC:2,absolute:28},
 {IN:8,EX:2,MO:4,PE:2,RV:2,SI:1,AC:1,EF:1,PR:4,MC:4,absolute:47},
 {IN:8,EX:8,MO:4,PE:4,RV:3,SI:1,AC:4,EF:4,PR:2,MC:4,absolute:66},
 {IN:8,EX:1,MO:4,PE:4,RV:1,SI:1,AC:1,EF:4,PR:2,MC:1,absolute:44},
 {IN:12,EX:1,MO:4,PE:4,RV:4,SI:1,AC:4,EF:4,PR:2,MC:1,absolute:62}
];
const calc=v=>3*v.IN+2*v.EX+v.MO+v.PE+v.RV+v.SI+v.AC+v.EF+v.PR+v.MC;
assert.deepEqual(examples.map(calc),[28,47,66,44,62]);
assert.equal(examples.filter(x=>![1,2,4].includes(x.RV)).length,1,
 'The RV=3 row is a known didactic anomaly; do not treat it as a valid new score');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,reducedMotion:'reduce'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices');
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  assert.equal(await page.locator('[data-conesa-simplificado]').count(),0);
  const projectId=await page.evaluate(()=>Object.keys(localStorage).filter(x=>x.startsWith('ambienta-impact-matrix-v1:'))
   .map(x=>x.slice('ambienta-impact-matrix-v1:'.length))[0]??null);
  const actualId=projectId??(await page.locator('[data-conesa-book] .amb-matrix-footer').first().innerText())
   .match(/DIAB[^\s·]*/)?.[0];
  assert(actualId,'Main Conesa must identify its real project');
  const entries={};
  const usable=[examples[0],examples[1],examples[3],examples[4]];
  for(let i=0;i<usable.length;i++){
   const e=usable[i],criteria={EX_CR:0,MO_CR:0};
   for(const k of ['IN','EX','MO','PE','RV','SI','AC','EF','PR','MC'])criteria[k]=e[k];
   entries['demo-f'+(i+1)+'::demo-a1']={sign:-1,criteria,
    reason:'EJEMPLO HISTÓRICO, no Diablillos',evidence:'matriz metodo CONESSA.xlsx · EJEMPLO'};
  }
  entries['deleted-factor::deleted-action']={sign:-1,criteria:entries['demo-f1::demo-a1'].criteria,
   reason:'Evaluación desvinculada preservada',evidence:'DOC-ORF-01'};
  const key='ambienta-conesa-simplificado-v1:'+actualId;
  await page.evaluate(({key,id,entries})=>localStorage.setItem(key,JSON.stringify({
   schema:'ambienta.conesa-simplificado.v1',projectId:id,projectName:'EJERCICIO HISTÓRICO',
   updatedAt:'2026-11-03T00:00:00Z',entries
  })),{key,id:actualId,entries});
  const original=await page.evaluate(key=>localStorage.getItem(key),key);
  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  await page.locator('[data-conesa-simplified-archive]').waitFor();
  assert.equal(await page.locator('[data-conesa-simplificado]').count(),0,
   'No second interactive editor can be mounted by selecting main Conesa');
  await page.getByRole('button',{name:'Consultar y exportar archivo simplificado'}).click();
  const archive=page.locator('[data-conesa-simplified-archive] [data-conesa-simplificado]');
  await archive.waitFor();
  assert.equal(await archive.locator('[data-conesa-review-row]').count(),5);
  const expected=[28,47,44,62,28];
  for(let i=0;i<5;i++){
   const row=archive.locator('[data-conesa-review-row]').nth(i);
   assert.equal((await row.locator('[data-review-absolute]').innerText()).trim(),String(expected[i]));
  }
  assert.equal(await archive.locator('[data-conesa-review-row="deleted-factor::deleted-action"]')
   .getAttribute('data-conesa-orphan'),'true');
  await archive.locator('[data-conesa-cell]').first().click();
  assert.equal((await archive.locator('[data-conesa-signed]').innerText()).trim(),'-28');
  assert.equal(await archive.getByRole('combobox',{name:'Naturaleza Conesa revisado'}).isDisabled(),true);
  assert.equal(await archive.getByRole('combobox',{name:'Conesa IN'}).isDisabled(),true);
  assert.equal(await archive.getByRole('button',{name:'Eliminar valoración'}).count(),0);
  assert.equal(await archive.locator('[data-conesa-residual]').count(),0,
   'Historical residual editor is never mounted in editable mode');
  const [csvDl]=await Promise.all([page.waitForEvent('download'),
   archive.getByRole('button',{name:'CSV',exact:true}).click()]);
  const csv=await fs.readFile(await csvDl.path(),'utf8');
  assert(csv.includes('DOC-ORF-01')&&csv.includes('Desvinculado')&&csv.includes('"-62"'));
  const [jsonDl]=await Promise.all([page.waitForEvent('download'),
   archive.getByRole('button',{name:'JSON',exact:true}).click()]);
  const parsed=JSON.parse(await fs.readFile(await jsonDl.path(),'utf8'));
  assert.equal(Object.keys(parsed.entries).length,5);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),original,
   'Archived read-only view and CSV/JSON downloads must not alter the saved document');
  await page.screenshot({path:out+'/conesa-simplificado-archivo-'+width+'.png',animations:'disabled'});
  assert.deepEqual(errors,[]);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overflow<=6,'No desktop overflow at '+width);
  console.log(JSON.stringify({result:'PASS',width,history:5,legacyWorkbook:[28,47,66,44,62],
   readOnly:true,storagePreserved:true,errors:0}));
  await ctx.close();
 }
}finally{await browser.close()}
