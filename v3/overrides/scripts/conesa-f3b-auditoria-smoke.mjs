import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const out='qa/ambienta-conesa-auditoria-f3b';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const context=await browser.newContext({
   viewport:{width,height:900},acceptDownloads:true,reducedMotion:'reduce'
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const open=async()=>{
   await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
   await page.locator('[data-conesa-book]').waitFor();
  };
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices');
  await open();
  const f3=page.locator('[data-conesa-f3]');
  await f3.locator('[data-f3-factor]').first().click();
  const editor=f3.locator('[data-f3-editor]');
  await editor.getByRole('textbox',{name:'F3 indicador'}).fill('Concentración media diaria');
  await editor.getByRole('textbox',{name:'F3 unidad'}).fill('p.p.m.');
  await editor.getByRole('combobox',{name:'F3 tipo de función'}).selectOption('curva');
  const lib=editor.locator('[data-f3b-library]');
  await lib.locator('summary').click();
  await lib.locator('[data-annex4-id="atm-01-co-diario"]').click();
  await lib.getByRole('button',{name:'Cargar únicamente cita y página en F3b'}).click();
  await editor.getByRole('spinbutton',{name:'F3b magnitud nudo 1'}).fill('0');
  await editor.getByRole('spinbutton',{name:'F3b CA nudo 1'}).fill('0');
  await editor.getByRole('spinbutton',{name:'F3b magnitud nudo 2'}).fill('10');
  await editor.getByRole('spinbutton',{name:'F3b CA nudo 2'}).fill('0.5');
  await editor.getByRole('button',{name:'Añadir nudo'}).click();
  await editor.getByRole('spinbutton',{name:'F3b magnitud nudo 3'}).fill('20');
  await editor.getByRole('spinbutton',{name:'F3b CA nudo 3'}).fill('1');
  const f3bKey=await page.evaluate(()=>Object.keys(localStorage)
   .find(k=>k.startsWith('ambienta-conesa-libro-1997-f3b:')));
  assert(f3bKey);
  const originalCurve=await page.evaluate(k=>localStorage.getItem(k),f3bKey);
  const audit=editor.locator('[data-f3b-audit]');
  await audit.locator('summary').click();
  assert.equal(await audit.locator('[data-f3b-audit-issues]').count(),1);
  assert(await audit.getByRole('button',{name:'Registrar decisión de revisión interna'}).isDisabled());
  const fill=async(label,text)=>audit.getByLabel('Auditoría '+label,{exact:true}).fill(text);
  await audit.getByRole('combobox',{name:'Auditoría ficha Anejo 4'}).selectOption('atm-01-co-diario');
  await fill('Archivo / recorte del gráfico original','PDF Conesa página 245, recorte original QA');
  await fill('Píxel X · referencia 1','100');
  await fill('Magnitud X · referencia 1','0');
  await fill('Píxel X · referencia 2','500');
  await fill('Magnitud X · referencia 2','20');
  await fill('Píxel Y · referencia 1','500');
  await fill('CA Y · referencia 1','0');
  await fill('Píxel Y · referencia 2','100');
  await fill('CA Y · referencia 2','1');
  await fill('Lector independiente A','Técnico A de prueba');
  await fill('Lector independiente B','Técnico B de prueba');
  await fill('Tolerancia máxima de magnitud M','0.1');
  await fill('Tolerancia máxima de CA','0.02');
  await audit.getByLabel('Auditoría lectura A').fill('0;0\n10;0,5\n20;1');
  await audit.getByLabel('Auditoría lectura B').fill('0;0\n10;0.5\n20;1');
  await fill('justificación tolerancias','Resolución de 400 píxeles y medición doble fundamentan esta tolerancia');
  await fill('correspondencia','El indicador, la unidad y el ámbito se documentan en este ensayo didáctico');
  await fill('revisor','Tercera persona de revisión');
  await fill('fecha revisión','2026-11-04');
  await fill('dictamen','Lecturas cotejadas con el gráfico y con los nudos declarados en el ensayo');
  const metrics=await audit.locator('[data-f3b-audit-metrics]').innerText();
  assert(metrics.includes('ΔM 0.00000')&&metrics.includes('ΔCA 0.00000'),metrics);
  assert.equal(await audit.locator('[data-f3b-audit-issues]').count(),0);
  await audit.getByRole('button',{name:'Registrar decisión de revisión interna'}).click();
  assert.match(await audit.locator('[data-f3b-audit-status]').innerText(),/Revisión interna registrada/);
  const auditKey=await page.evaluate(()=>Object.keys(localStorage)
   .find(k=>k.startsWith('ambienta-conesa-1997-f3b-auditoria:')));
  assert(auditKey);
  const audited=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),auditKey));
  assert.equal(audited.catalogId,'atm-01-co-diario');
  assert(audited.approval?.fingerprint.startsWith('local-v1-'));
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),f3bKey),originalCurve,
   'Separate audit must not mutate numeric F3b curve');
  const [download]=await Promise.all([
   page.waitForEvent('download'),
   audit.getByRole('button',{name:'Exportar expediente JSON'}).click()
  ]);
  const exported=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  assert.equal(exported.schema,'ambienta.conesa-1997.f3b.auditoria-digitalizacion.v1');
  assert.equal(exported.readingA,'0;0\n10;0,5\n20;1');
  await page.screenshot({path:out+'/audit-'+width+'.png',fullPage:true,animations:'disabled'});
  await editor.getByRole('spinbutton',{name:'F3b CA nudo 2'}).fill('0.55');
  assert.match(await audit.locator('[data-f3b-audit-status]').innerText(),/no vigente/i);
  assert.match(await audit.getByRole('alert').last().innerText(),/decisión anterior/i);
  await page.reload();await open();await f3.locator('[data-f3-factor]').first().click();
  await editor.locator('[data-f3b-audit] summary').click();
  assert.match(await audit.locator('[data-f3b-audit-status]').innerText(),/no vigente/i);
  const f3bAfter=await page.evaluate(k=>localStorage.getItem(k),f3bKey);
  await page.evaluate(k=>localStorage.setItem(k,'{invalid audit record'),auditKey);
  await page.reload();await open();await f3.locator('[data-f3-factor]').first().click();
  await editor.locator('[data-f3b-audit] summary').click();
  assert.equal(await audit.locator('[data-f3b-audit-damaged]').count(),1);
  const [raw]=await Promise.all([
   page.waitForEvent('download'),
   audit.getByRole('button',{name:'Descargar original sin modificar'}).click()
  ]);
  assert.equal(await fs.readFile(await raw.path(),'utf8'),'{invalid audit record');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),auditKey),'{invalid audit record');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),f3bKey),f3bAfter);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',width,points:3,
   independentReaders:true,localReview:true,staleDetected:true,
   corruptRecovered:true,noF3bMutation:true}));
  await context.close();
 }
}finally{
 await browser.close();
}
