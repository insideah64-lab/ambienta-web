import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {writeDemoPack} from './generate-battelle-demo-pack.mjs';
const out='qa/ambienta-battelle-demo-pack',pack=await writeDemoPack(out);
for(const [file,expected] of [...pack.cases.map(c=>[c.doc.projectId+'_Battelle_SINTETICO.json',c.doc]),['DEMO-001_Battelle_CONTROL_78_NO_EVALUACION.json',pack.control.doc]]){
 const fixture=JSON.parse(await fs.readFile(new URL('../../../docs/examples/battelle-training/'+file,import.meta.url),'utf8'));
 assert.deepEqual(fixture,expected,'Committed user files must match the deterministic generator');
}
const browser=await chromium.launch({headless:true}),results=[];
const fmt=n=>n.toLocaleString('es-AR',{minimumFractionDigits:4,maximumFractionDigits:4});
function csvRows(raw){
 const rows=[];let row=[],value='',quoted=false;
 for(let i=0;i<raw.length;i++){
  const c=raw[i];if(c==='"'){if(quoted&&raw[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&c===';'){row.push(value);value='';}
  else if(!quoted&&(c==='\r'||c==='\n')){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(value);rows.push(row);row=[];value='';}
  else value+=c;
 }
 if(value||row.length){row.push(value);rows.push(row);}return rows;
}
try{
 for(const width of [1366,1800]){
  const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const originalStores={};
  const cases=[...pack.cases.map(c=>({tag:c.tag,doc:c.doc,expected:c.expected,details:c.details,file:c.doc.projectId+'_Battelle_SINTETICO.json'})),{tag:'CONTROL_78',doc:pack.control.doc,expected:pack.control.expected,details:[],file:'DEMO-001_Battelle_CONTROL_78_NO_EVALUACION.json'}];
  for(const c of cases){
   const query=c.doc.projectId==='DIAB-2026-DEMO'?'?caso=diablillos':'';
   const url=(process.env.QA_BASE_URL||'http://127.0.0.1:8787/v3/')+'index.html'+query+'#/matrices';
   await page.goto(url);await page.locator('[data-catalog-method="battelle"] button').click();
   const panel=page.locator('[data-battelle]');await panel.waitFor();
   const original=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>!k.startsWith('ambienta-battelle-v1:'))));Object.assign(originalStores,original);
   const previous=await page.evaluate(id=>localStorage.getItem('ambienta-battelle-v1:'+id),c.doc.projectId);
   if(previous!==null)page.once('dialog',dialog=>dialog.accept());
   await panel.getByLabel('Importar JSON Battelle',{exact:true}).setInputFiles(path.join(out,c.file));
   await page.waitForFunction(({id,count})=>{const raw=localStorage.getItem('ambienta-battelle-v1:'+id);return raw&&Object.keys(JSON.parse(raw).entries).length===count;},{id:c.doc.projectId,count:c.expected.ready});
   assert.equal(await panel.locator('[data-bc-ready]').innerText(),c.expected.ready+' / 78');
   assert.equal(await panel.locator('[data-bc-total]').innerText(),fmt(c.expected.delta));
   const chosen=c.details.find(d=>d.id==='bc-27')||c.details[0];
   if(chosen){
    await panel.getByLabel('Filtrar categoría Battelle',{exact:true}).selectOption(chosen.category);
    await panel.getByRole('button',{name:new RegExp('^'+Number(chosen.id.slice(3))+'\\. ')}).click();
    assert.equal(await panel.locator('[data-bc-delta]').innerText(),fmt(chosen.expected.delta));
   }
   await page.screenshot({path:path.join(out,c.tag+'-'+width+'-full.png'),fullPage:true});
   await panel.locator('[data-bc-editor]').screenshot({path:path.join(out,c.tag+'-'+width+'-editor.png')});
   for(const format of ['JSON','CSV']){
    const event=page.waitForEvent('download');await panel.getByRole('button',{name:format,exact:true}).click();const d=await event;
    const target=path.join(out,c.tag+'-'+width+'-download.'+format.toLowerCase());await d.saveAs(target);const raw=await fs.readFile(target,'utf8');
    if(format==='JSON'){
     const downloaded=JSON.parse(raw);assert.equal(downloaded.projectId,c.doc.projectId);assert.equal(downloaded.results.ready,c.expected.ready);assert(Math.abs(downloaded.results.delta-c.expected.delta)<1e-9);assert.equal(downloaded.results.complete,c.tag==='CONTROL_78');
     assert.deepEqual(downloaded.entries,c.doc.entries);
    }else{
     const rows=csvRows(raw.replace(/^\uFEFF/,'')),header=rows[0],id=header.indexOf('ID'),delta=header.indexOf('ΔUIA');let sum=0,count=0;
     for(const row of rows.slice(1))if(/^bc-\d+$/.test(row[id]||'')&&row[delta]!==''){sum+=Number(row[delta].replace(/^'/,''));count++;}
     assert.equal(count,c.expected.ready);assert(Math.abs(sum-c.expected.delta)<1e-9);
    }
   }
   await page.reload();await page.locator('[data-catalog-method="battelle"] button').click();
   assert.equal(await panel.locator('[data-bc-ready]').innerText(),c.expected.ready+' / 78');assert.equal(await panel.locator('[data-bc-total]').innerText(),fmt(c.expected.delta));
   assert.equal(await page.evaluate(original=>Object.entries(original).every(([k,v])=>localStorage.getItem(k)===v),originalStores),true,'Source project and all other modules must stay unchanged');
   results.push({width,case:c.tag,projectId:c.doc.projectId,status:'PASS',ready:c.expected.ready,coveredWeight:c.expected.coveredWeight,delta:c.expected.delta,downloadsRead:2,sourcePreserved:true});
  }
  const backup=await page.evaluate(()=>Object.entries(localStorage).find(([k])=>k.startsWith('ambienta-battelle-v1:DEMO-001:backup:'))?.[1]);
  assert.equal(JSON.parse(backup).alternative,pack.cases[0].doc.alternative,'Full arithmetic control preserves the earlier partial training draft as backup');
  const diablillosStored=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-battelle-v1:DIAB-2026-DEMO')));
  assert.deepEqual(diablillosStored.entries,pack.cases[1].doc.entries,'Urbanization/control imports must not modify the other project');
  assert.deepEqual(errors,[]);await context.close();
 }
}finally{await browser.close();}
await fs.writeFile(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
