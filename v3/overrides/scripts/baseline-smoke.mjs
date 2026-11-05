import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const out='qa/ambienta-baseline';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[];
const root=process.env.QA_BASE_URL||'http://127.0.0.1:8787/v3/';
const url=id=>root+'index.html'+(id==='DIAB-2026-DEMO'?'?caso=diablillos':'')+'#/linea-base';
const key=id=>'ambienta-baseline-v1:'+id;
async function storage(page,id){return page.evaluate(k=>localStorage.getItem(k),key(id));}
async function download(page,panel,name,file){const event=page.waitForEvent('download');await panel.getByRole('button',{name,exact:true}).click();const d=await event;await d.saveAs(file);return fs.readFile(file,'utf8');}
async function upload(panel,doc){await panel.getByLabel('Importar JSON de línea base',{exact:true}).setInputFiles({name:'registro.json',mimeType:'application/json',buffer:Buffer.from(typeof doc==='string'?doc:JSON.stringify(doc))});}
function csvRows(raw){const rows=[];let row=[],v='',q=false;for(let i=0;i<raw.length;i++){const c=raw[i];if(c==='"'){if(q&&raw[i+1]==='"'){v+='"';i++;}else q=!q;}else if(!q&&c===';'){row.push(v);v='';}else if(!q&&(c==='\r'||c==='\n')){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(v);rows.push(row);row=[];v='';}else v+=c;}if(row.length||v){row.push(v);rows.push(row);}return rows;}
try{
 for(const width of [1366,1800]){
  const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  for(const id of ['DEMO-001','DIAB-2026-DEMO']){
   await page.goto(url(id));const panel=page.locator('[data-baseline]');await panel.waitFor();
   assert.equal(await storage(page,id),null,'Opening must not seed records or storage');
   const others=await page.evaluate(()=>({...localStorage}));
   await panel.getByRole('button',{name:'Añadir ejemplo sintético',exact:true}).click();
   await page.waitForFunction(k=>!!localStorage.getItem(k),key(id));
   assert.equal(await panel.locator('[data-lb-active]').innerText(),'4');assert.equal(await panel.locator('[data-lb-indicators]').innerText(),'2');
   const sample=await storage(page,id);await panel.getByRole('button',{name:'Añadir ejemplo sintético',exact:true}).click();assert.equal(await storage(page,id),sample);
   await panel.getByRole('button',{name:'Nuevo indicador',exact:true}).click();const form=panel.locator('[data-lb-indicator-form]');
   await form.getByLabel('Nombre del indicador',{exact:true}).fill('Indicador QA de trazabilidad');await form.getByLabel('Factor ambiental',{exact:true}).fill('Agua');await form.getByLabel('Unidad del indicador',{exact:true}).fill('mg/L');await form.getByLabel('Método de obtención',{exact:true}).fill('Ensayo ficticio de regresión, sin campaña real');await form.getByLabel('Soporte temporal (por ejemplo, promedio de 24 h)',{exact:true}).fill('Muestra puntual hipotética');
   await form.getByRole('button',{name:'Registrar indicador',exact:true}).click();assert.equal(await panel.locator('[data-lb-indicators]').innerText(),'3');
   const beforeInvalid=await storage(page,id);await panel.getByRole('button',{name:'Registrar dato',exact:true}).click();let obs=panel.locator('[data-lb-observation-form]');
   await obs.getByRole('button',{name:'Guardar registro',exact:true}).click();assert.equal(await storage(page,id),beforeInvalid);assert.match(await panel.locator('.lb-error').innerText(),/período válido/);
   await obs.getByLabel('Procedencia del dato',{exact:true}).selectOption('synthetic');await obs.getByLabel('Tipo de dato',{exact:true}).selectOption('estimated');await obs.getByLabel('Valor en la unidad del indicador',{exact:true}).fill('0');await obs.getByLabel('Inicio del período',{exact:true}).fill('2026-11-01');await obs.getByLabel('Fin del período',{exact:true}).fill('2026-11-02');await obs.getByLabel('Punto o ámbito de referencia',{exact:true}).fill('Punto QA ficticio');await obs.getByLabel('Base de incertidumbre, cobertura o motivo de no cuantificación',{exact:true}).fill('No cuantificada; ejercicio de software');await obs.getByLabel('Fuente y localizador del dato',{exact:true}).fill('Informe QA ficticio, tabla 1');await obs.getByLabel('Responsable del registro',{exact:true}).fill('Equipo QA');
   await page.evaluate(()=>{window.scrollTo(0,0);});await page.evaluate(()=>new Promise(requestAnimationFrame));await page.screenshot({path:path.join(out,id+'-'+width+'-form-full.png'),fullPage:true});await obs.screenshot({path:path.join(out,id+'-'+width+'-form.png')});
   await obs.getByRole('button',{name:'Guardar registro',exact:true}).click();assert.equal(await panel.locator('[data-lb-active]').innerText(),'5');
   const initial=JSON.parse(await storage(page,id)),old=initial.observations.at(-1);assert.equal(old.value,0);
   await panel.getByRole('button',{name:'Corregir mediante nueva versión',exact:true}).click();obs=panel.locator('[data-lb-observation-form]');assert(await obs.getByLabel('Procedencia del dato',{exact:true}).isDisabled());assert(await obs.getByLabel('Indicador del dato',{exact:true}).isDisabled());
   await obs.getByLabel('Calificador del resultado',{exact:true}).selectOption('not-detected');assert.equal(await obs.getByLabel('Valor en la unidad del indicador',{exact:true}).inputValue(),'');assert(await obs.getByLabel('Valor en la unidad del indicador',{exact:true}).isDisabled());
   await obs.getByLabel('Motivo de la corrección',{exact:true}).fill('El informe decía no detectado, no cero');
   await obs.getByRole('button',{name:'Registrar nueva versión',exact:true}).click();assert.equal((JSON.parse(await storage(page,id))).observations.length,5,'ND without positive limit must not save');
   await obs.getByLabel('Límite de detección en la misma unidad',{exact:true}).fill('0.2');await obs.getByRole('button',{name:'Registrar nueva versión',exact:true}).click();
   const final=JSON.parse(await storage(page,id)),latest=final.observations.at(-1);assert.equal(final.observations.length,6);assert.deepEqual(final.observations.at(-2),old);assert.equal(latest.value,null);assert.equal(latest.detectionLimit,0.2);assert.equal(latest.supersedes,old.id);assert.equal(await panel.locator('[data-lb-active]').innerText(),'5');
   const bookmark=page.url();await page.reload();await panel.locator('[data-lb-detail]').waitFor();assert.equal(await storage(page,id),JSON.stringify(final));assert.match(await panel.locator('[data-lb-detail]').innerText(),/ND \(LD 0.2\)/);
   await panel.getByLabel('Mostrar versiones previas',{exact:true}).check();await page.waitForFunction(n=>document.querySelectorAll('[data-lb-observation]').length===n,2);
   await panel.getByLabel('Filtrar indicador',{exact:true}).selectOption('');await page.waitForFunction(n=>document.querySelectorAll('[data-lb-observation]').length===n,6);
   await panel.getByLabel('Filtrar procedencia',{exact:true}).selectOption('declared');await page.waitForFunction(n=>document.querySelectorAll('[data-lb-observation]').length===n,0);await panel.getByLabel('Filtrar procedencia',{exact:true}).selectOption('');
   await page.goto(bookmark);await panel.locator('[data-lb-detail]').waitFor();assert.match(await panel.locator('[data-lb-detail]').innerText(),/Informe QA ficticio/);
   await page.evaluate(()=>{window.scrollTo(0,0);});await page.evaluate(()=>new Promise(requestAnimationFrame));await page.screenshot({path:path.join(out,id+'-'+width+'-full.png'),fullPage:true});await panel.locator('[data-lb-detail]').screenshot({path:path.join(out,id+'-'+width+'-detail.png')});
   const jsonFile=path.join(out,id+'-'+width+'-download.json'),csvFile=path.join(out,id+'-'+width+'-download.csv');
   assert.deepEqual(JSON.parse(await download(page,panel,'JSON',jsonFile)),final);
   const csv=csvRows((await download(page,panel,'CSV',csvFile)).replace(/^\uFEFF/,'')),header=csv[0],at=n=>header.indexOf(n),byId=new Map(csv.slice(1).map(r=>[r[at('ID registro')],r]));assert.equal(csv.length,7);assert.equal(byId.get(old.id)[at('Valor')],'0');assert.equal(byId.get(latest.id)[at('Valor')],'');assert.equal(byId.get(latest.id)[at('Límite detección')],'0.2');assert.equal(byId.get(old.id)[at('Estado de versión')],'Corregido, conservado');assert.equal(byId.get(latest.id)[at('Fuente')],'Informe QA ficticio, tabla 1');
   const raw=await storage(page,id);await upload(panel,final);await panel.getByRole('status').filter({hasText:'ya existen'}).waitFor();assert.equal(await storage(page,id),raw);
   await upload(panel,{...final,projectId:'OTHER'});await panel.locator('.lb-error').waitFor();assert.equal(await storage(page,id),raw);
   const conflict=structuredClone(final);conflict.observations[0].value+=1;await upload(panel,conflict);await panel.locator('.lb-error').filter({hasText:'Conflicto'}).waitFor();assert.equal(await storage(page,id),raw);
   assert(await page.evaluate(original=>Object.entries(original).every(([k,v])=>localStorage.getItem(k)===v),others),'Other project/module data must remain unchanged');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+6),'No horizontal page overflow');assert.deepEqual(errors,[]);
   results.push({projectId:id,width,status:'PASS',indicators:3,active:5,previousVersions:1,downloadsRead:2,zeroPreserved:true,ndValue:null,ndLimit:0.2,bookmarkReload:true,otherStoragePreserved:true});
  }
  await context.close();
 }
 // A stale tab must not overwrite another tab's appended history.
 const concurrent=await browser.newContext({viewport:{width:1366,height:1000}});const a=await concurrent.newPage(),b=await concurrent.newPage();await a.goto(url('DEMO-001'));await b.goto(url('DEMO-001'));await a.locator('[data-baseline]').getByRole('button',{name:'Añadir ejemplo sintético',exact:true}).click();const current=await storage(a,'DEMO-001');await b.locator('[data-baseline]').getByRole('button',{name:'Añadir ejemplo sintético',exact:true}).click();await b.getByRole('alert').filter({hasText:'Otra pestaña'}).waitFor();assert.equal(await storage(b,'DEMO-001'),current);await concurrent.close();
 // Quota failures are visible and downloadable, never falsely marked saved.
 const context=await browser.newContext({viewport:{width:1366,height:1000},acceptDownloads:true});await context.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('QA quota','QuotaExceededError');};});const page=await context.newPage();await page.goto(url('DEMO-001'));const panel=page.locator('[data-baseline]');await panel.getByRole('button',{name:'Añadir ejemplo sintético',exact:true}).click();await panel.getByRole('alert').filter({hasText:'Datos solo en memoria'}).waitFor();assert.equal(await storage(page,'DEMO-001'),null);assert.equal(JSON.parse(await download(page,panel,'JSON',path.join(out,'quota-memory-backup.json'))).observations.length,4);await context.close();
 // Invalid existing storage is retained verbatim and never silently replaced.
 const damaged=await browser.newContext({viewport:{width:1366,height:1000},acceptDownloads:true});await damaged.addInitScript(()=>{if(!localStorage.getItem('qa-seeded')){localStorage.setItem('ambienta-baseline-v1:DEMO-001','{invalid original QA');localStorage.setItem('qa-seeded','yes');}});const pg=await damaged.newPage();await pg.goto(url('DEMO-001'));const p=pg.locator('[data-baseline]');await p.getByRole('alert').filter({hasText:'archivo local'}).waitFor();assert(await p.getByRole('button',{name:'Nuevo indicador',exact:true}).isDisabled());assert.equal(await download(pg,p,'Descargar archivo original',path.join(out,'damaged-original.txt')),'{invalid original QA');assert.equal(await storage(pg,'DEMO-001'),'{invalid original QA');
 const good=JSON.parse(await fs.readFile(path.join(out,'quota-memory-backup.json'),'utf8'));pg.once('dialog',d=>d.accept());await upload(p,good);await pg.waitForFunction(()=>JSON.parse(localStorage.getItem('ambienta-baseline-v1:DEMO-001')).observations.length===4);assert(await pg.evaluate(()=>Object.entries(localStorage).some(([k,v])=>k.startsWith('ambienta-baseline-v1:DEMO-001:backup:')&&v==='{invalid original QA')));await damaged.close();
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({status:'PASS',results,quotaRecovery:'PASS',damagedBackupRecovery:'PASS',staleTabPreservation:'PASS'},null,2));console.log(JSON.stringify({status:'PASS',results,quotaRecovery:'PASS',damagedBackupRecovery:'PASS',staleTabPreservation:'PASS'}));
}finally{await browser.close();}
