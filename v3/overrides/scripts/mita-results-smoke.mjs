import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {chromium} from 'playwright';
import {mitaFixture,tiffFixture} from '../../../tests/fixtures/mita-fixture.mjs';
const out='qa/ambienta-mita';await fs.mkdir(out,{recursive:true});const root=process.env.QA_BASE_URL||'http://127.0.0.1:8787/v3/';
const bytes=tiffFixture(),hash=createHash('sha256').update(bytes).digest('hex'),raw=JSON.stringify(mitaFixture(hash),null,2)+'\n';
await fs.writeFile(path.join(out,'QA-synthetic-report.json'),raw);await fs.writeFile(path.join(out,'QA-hash-fixture.tif'),bytes);
const url=id=>root+'index.html'+(id==='DIAB-2026-DEMO'?'?caso=diablillos':'')+'#/mita',key=id=>'ambienta-mita-results-v1:'+id;
async function openHistory(page){const h=page.locator('[data-mita-history]');await h.waitFor();if(!await h.evaluate(e=>e.open))await h.locator(':scope > summary').click();}
const browser=await chromium.launch({headless:true}),results=[];
async function download(page,button,file){const event=page.waitForEvent('download');await button.click();await(await event).saveAs(path.join(out,file));return fs.readFile(path.join(out,file),'utf8');}
try{for(const width of [1366,1800])for(const project of ['DEMO-001','DIAB-2026-DEMO']){
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('example.invalid'))requests.push(r.url());});
 await page.goto(url(project));await openHistory(page);const p=page.locator('[data-mita-workspace]');await p.waitFor();
 const before=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 await p.locator('[data-mita-import]').setInputFiles({name:'mita-qa.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await p.locator('[data-mita-scene]').waitFor();assert.match(await p.innerText(),/0,5000/);assert.equal(await p.locator('[data-mita-register]').isDisabled(),true);assert.equal(await page.evaluate(k=>localStorage.getItem(k),key(project)),null);
 await p.locator('[data-mita-context]').fill('Informe QA sintético para probar la recepción; no es un dato del proyecto.');
 await p.locator('[data-mita-tiff]').setInputFiles({name:'qa-hash-fixture.tif',mimeType:'image/tiff',buffer:bytes});await page.waitForFunction(()=>document.querySelector('[data-mita-verification]')?.textContent.includes('Huella coincidente'));
 await p.locator('[data-mita-register]').click();await page.waitForFunction(()=>location.hash.includes('producto='));
 const stored=await page.evaluate(k=>localStorage.getItem(k),key(project));assert.equal(JSON.parse(stored).entries.length,1);assert.equal(JSON.parse(stored).entries[0].raw,raw);
 assert.equal(await download(page,p.locator('[data-mita-export-original]'),project+'-'+width+'-original.json'),raw);
 const exported=JSON.parse(await download(page,p.getByRole('button',{name:'Exportar registro del proyecto',exact:true}),project+'-'+width+'-registry.json'));assert.equal(exported.projectId,project);assert.equal(exported.entries[0].raw,raw);
 await page.reload();await p.waitFor();await p.locator('[data-mita-scene]').waitFor();assert.match(await p.locator('[data-mita-verification]').innerText(),/no comprobado/i);
 await p.locator('[data-mita-import]').setInputFiles({name:'same.json',mimeType:'application/json',buffer:Buffer.from(raw)});await page.waitForFunction(()=>document.querySelector('[data-mita-status]')?.textContent.includes('no se duplicó'));assert.equal(await page.evaluate(k=>localStorage.getItem(k),key(project)),stored);
 const bad=Buffer.from(bytes);bad[149]^=1;await p.locator('[data-mita-tiff]').setInputFiles({name:'wrong.tif',mimeType:'image/tiff',buffer:bad});await page.waitForFunction(()=>document.querySelector('[data-mita-status]')?.textContent.includes('no coincide'));
 await p.locator('[data-mita-import]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')});await page.waitForFunction(()=>document.querySelector('[data-mita-status]')?.textContent.includes('Se admite'));assert.equal(await page.evaluate(k=>localStorage.getItem(k),key(project)),stored);
 await p.locator('aside button').first().click();await p.locator('article details').evaluate(e=>e.open=true);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,project+'-'+width+'-full.png'),fullPage:true});await p.locator('.amb-mita-layout > article').screenshot({path:path.join(out,project+'-'+width+'-detail.png')});
 const after=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));for(const [k,v] of Object.entries(before))assert.equal(after[k],v);assert.equal(await page.evaluate(k=>localStorage.getItem(k),key(project==='DEMO-001'?'DIAB-2026-DEMO':'DEMO-001')),null);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);results.push({project,width,status:'PASS',originalBytesPreserved:true,reload:true,hashMatch:true,hashMismatchRejected:true,downloadsRead:true,otherStorageUnchanged:true});await context.close();
}
// Damaged local state must remain intact and exportable, never reset on open.
const c=await browser.newContext(),page=await c.newPage();await page.goto(url('DEMO-001'));await page.evaluate(k=>localStorage.setItem(k,'{damaged'),key('DEMO-001'));await page.reload();await page.getByRole('button',{name:'Descargar original local',exact:true}).waitFor();assert.equal(await download(page,page.getByRole('button',{name:'Descargar original local',exact:true}),'damaged-original.json'),'{damaged');assert.equal(await page.locator('[data-mita-import]').isDisabled(),true);await c.close();
const shared=await browser.newContext(),first=await shared.newPage(),second=await shared.newPage();
await Promise.all([first.goto(url('DEMO-001')),second.goto(url('DEMO-001'))]);
for(const p of [first,second]){await openHistory(p);await p.locator('[data-mita-import]').setInputFiles({name:'qa.json',mimeType:'application/json',buffer:Buffer.from(raw)});await p.locator('[data-mita-context]').fill('QA sintético de protección entre pestañas.');}
await first.locator('[data-mita-register]').click();await first.waitForFunction(()=>location.hash.includes('producto='));const kept=await first.evaluate(k=>localStorage.getItem(k),key('DEMO-001'));
await second.locator('[data-mita-register]').click();await second.waitForFunction(()=>document.querySelector('[data-mita-status]')?.textContent.includes('Otra pestaña'));assert.equal(await second.evaluate(k=>localStorage.getItem(k),key('DEMO-001')),kept);await shared.close();
const limited=await browser.newContext(),quota=await limited.newPage();await quota.goto(url('DEMO-001'));await openHistory(quota);await quota.locator('[data-mita-import]').setInputFiles({name:'qa.json',mimeType:'application/json',buffer:Buffer.from(raw)});await quota.locator('[data-mita-context]').fill('QA sintético de cuota de almacenamiento.');
await quota.evaluate(k=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===k)throw new DOMException('Cuota QA','QuotaExceededError');return original.call(this,key,value);};},key('DEMO-001'));
await quota.locator('[data-mita-register]').click();await quota.waitForFunction(()=>document.querySelector('[data-mita-status]')?.textContent.includes('no se confirmó'));assert.equal(await quota.evaluate(k=>localStorage.getItem(k),key('DEMO-001')),null);assert.equal(await download(quota,quota.locator('[data-mita-export-original]'),'quota-original.json'),raw);await limited.close();
await fs.writeFile(path.join(out,'results.json'),JSON.stringify({status:'PASS',fixture:'Synthetic adapter and TIFF hash control only; not a scientific GeoTIFF validation',results,damagedStorage:'PASS',staleTabs:'PASS',quota:'PASS'},null,2));console.log('MITA PASS: both demos, desktop widths, reload, original downloads, hash controls, stale tabs and quota.');
}finally{await browser.close();}
