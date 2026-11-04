import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const root='qa/ambienta-conesa-visual-f3b';
await fs.mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const context=await browser.newContext({
   viewport:{width,height:900},acceptDownloads:true,reducedMotion:'reduce'
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  const open=async()=>{
   await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
   await page.locator('[data-conesa-book]').waitFor();
  };
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices');
  await open();
  await page.locator('[data-conesa-phase-tab="f3a"]').click();
  const f3=page.locator('[data-conesa-f3]');
  await f3.locator('[data-f3-factor]').first().click();
  const editor=f3.locator('[data-f3-editor]');
  await editor.getByRole('textbox',{name:'F3 indicador'}).fill('Concentración media diaria');
  await editor.getByRole('textbox',{name:'F3 unidad'}).fill('p.p.m.');
  await page.locator('[data-conesa-phase-tab="f3b"]').click();
  await editor.getByRole('combobox',{name:'F3 tipo de función'}).selectOption('curva');
  const library=editor.locator('[data-f3b-library]');
  await library.locator('summary').click();
  await library.locator('[data-annex4-id="atm-01-co-diario"]').click();
  await library.getByRole('button',{name:'Cargar únicamente cita y página en F3b'}).click();
  const audit=editor.locator('[data-f3b-audit]');
  await audit.locator('summary').click();
  const visual=audit.locator('[data-f3b-visual]');
  const img=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=600;c.height=400;
   const x=c.getContext('2d');if(!x)throw Error('no canvas');
   x.fillStyle='#ffffff';x.fillRect(0,0,600,400);
   x.strokeStyle='#222222';x.lineWidth=3;
   x.beginPath();x.moveTo(100,350);x.lineTo(500,350);x.moveTo(100,350);x.lineTo(100,50);x.stroke();
   x.strokeStyle='#146d71';x.beginPath();x.moveTo(100,350);
   x.lineTo(300,200);x.lineTo(500,50);x.stroke();
   return c.toDataURL('image/png').split(',')[1];
  });
  await visual.getByLabel('Imagen del gráfico para digitalizar').setInputFiles({
   name:'qa-conesa-continuo.png',mimeType:'image/png',buffer:Buffer.from(img,'base64')
  });
  const svg=visual.locator('[data-f3b-visual-canvas]');
  await svg.waitFor();
  assert.match(await visual.locator('[data-f3b-visual-size]').innerText(),/600 × 400 px/);
  await audit.getByLabel('Auditoría Magnitud X · referencia 1').fill('0');
  await audit.getByLabel('Auditoría Magnitud X · referencia 2').fill('20');
  await audit.getByLabel('Auditoría CA Y · referencia 1').fill('0');
  await audit.getByLabel('Auditoría CA Y · referencia 2').fill('1');
  const clickPoint=async(x,y)=>{
   await svg.scrollIntoViewIfNeeded();
   const p=await svg.evaluate((el,pos)=>{
    const point=el.createSVGPoint();point.x=pos.x;point.y=pos.y;
    const mapped=point.matrixTransform(el.getScreenCTM());
    return {x:mapped.x,y:mapped.y};
   },{x,y});
   await page.mouse.click(p.x,p.y);
  };
  await clickPoint(100,350);await clickPoint(500,350);
  await clickPoint(100,350);await clickPoint(100,50);
  const near=async(label,expected,tolerance=1)=>{
   const raw=await audit.getByLabel('Auditoría '+label).inputValue();
   assert(Math.abs(Number(raw)-expected)<=tolerance,
    'Expected '+label+' ≈ '+expected+', got '+raw);
  };
  await near('Píxel X · referencia 1',100);
  await near('Píxel X · referencia 2',500);
  await near('Píxel Y · referencia 1',350);
  await near('Píxel Y · referencia 2',50);
  assert.match(await visual.locator('.amb-f3b-visual-calibration').innerText(),/completa/);
  await clickPoint(100,350);await clickPoint(300,200);await clickPoint(500,50);
  const preview=await visual.locator('[data-f3b-visual-preview]').innerText();
  assert(preview.includes('3 puntos seleccionados'),preview);
  const previewRows=await visual.locator('[data-f3b-visual-preview] tbody tr').allInnerTexts();
  assert.equal(previewRows.length,3);
  const [middleM,middleCA]=previewRows[1].split('\t').slice(1,3).map(Number);
  assert(Math.abs(middleM-10)<.12,'Origen M alterado por presentación SVG');
  assert(Math.abs(middleCA-.5)<.012,'Origen CA alterado por presentación SVG');
  const f3bKey=await page.evaluate(()=>Object.keys(localStorage).find(k=>
   k.startsWith('ambienta-conesa-libro-1997-f3b:')));
  assert(f3bKey);
  const before=await page.evaluate(k=>localStorage.getItem(k),f3bKey);
  await visual.getByRole('button',{name:'Pasar puntos a lectura A (sin modificar F3b)'}).click();
  const firstReading=await audit.getByLabel('Auditoría lectura A').inputValue();
  const rows=firstReading.trim().split('\n').map(row=>row.split(';').map(Number));
  assert.equal(rows.length,3);
  for(const [i,[expectedM,expectedCA]] of [[0,0],[10,.5],[20,1]].entries()){
   assert(Math.abs(rows[i][0]-expectedM)<.12,'Magnitud medida fuera de tolerancia de clic');
   assert(Math.abs(rows[i][1]-expectedCA)<.012,'CA medida fuera de tolerancia de clic');
  }
  assert.equal(await audit.getByLabel('Auditoría lectura B').inputValue(),'');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),f3bKey),before);
  await visual.getByRole('button',{name:'Lector B'}).click();
  await clickPoint(100,350);await clickPoint(300,200);await clickPoint(500,50);
  await visual.getByRole('button',{name:'Pasar puntos a lectura B (sin modificar F3b)'}).click();
  const secondReading=await audit.getByLabel('Auditoría lectura B').inputValue();
  assert.equal(secondReading,firstReading,'Both independent passes over identical click positions should agree');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),f3bKey),before);
  const auditKey=await page.evaluate(()=>Object.keys(localStorage).find(k=>
   k.startsWith('ambienta-conesa-1997-f3b-auditoria:')));
  assert(auditKey);
  const record=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),auditKey));
  assert(Math.abs(Number(record.xPixelA)-100)<1);
  assert.equal(record.readingA,record.readingB);
  assert.equal(record.approval,null);
  // QA3 — zoom changes the SVG view only, never source-pixel coordinates.
  await visual.getByRole('button',{name:'Ampliar a 2x'}).click();
  assert.match(await visual.locator('[data-f3b-viewport]').innerText(),/2×/);
  await visual.getByRole('button',{name:'Desplazar a la derecha'}).click();
  assert.match(await visual.locator('[data-f3b-viewport]').innerText(),/225\.0/);
  await visual.getByLabel('Radio de selección en píxeles').selectOption('2');
  assert.match(await visual.locator('[data-f3b-pixel-sensitivity]').innerText(),
   /Sensibilidad estimada/);
  // In a multi-curve figure, QA1 transfer is intentionally unavailable.
  await visual.getByRole('radio',{name:/Varias series/}).check();
  assert.equal(await visual.locator('[data-f3b-visual-apply]').count(),0);
  await visual.getByLabel('Nombre de serie en el gráfico').fill('Corriente lenta');
  await clickPoint(260,200);await clickPoint(360,200);
  await visual.getByRole('button',{name:'Conservar serie en esta sesión'}).click();
  assert.match(await visual.locator('[data-f3b-series-count]').innerText(),/1 series separadas/);
  await visual.getByLabel('Nombre de serie en el gráfico').fill('Corriente rápida');
  await clickPoint(300,170);await clickPoint(400,140);
  await visual.getByRole('button',{name:'Conservar serie en esta sesión'}).click();
  assert.match(await visual.locator('[data-f3b-series-count]').innerText(),/2 series separadas/);
  const [multiDownload]=await Promise.all([
   page.waitForEvent('download'),
   visual.getByRole('button',{name:'Exportar series JSON (sin certificar)'}).click()
  ]);
  const series=JSON.parse(await fs.readFile(await multiDownload.path(),'utf8'));
  assert.equal(series.schema,'ambienta.conesa.f3b.qa3.multiserie-sesion.v1');
  assert.deepEqual(series.series.map(s=>s.label),['Corriente lenta','Corriente rápida']);
  assert.equal(series.series[0].points.length,2);
  assert.equal(series.series[1].points.length,2);
  assert.equal(series.series[1].assumedClickRadiusPx,2);
  assert(!Object.hasOwn(series,'image'));
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),f3bKey),before);
  assert.equal(await audit.getByLabel('Auditoría lectura A').inputValue(),firstReading);
  assert.equal(await audit.getByLabel('Auditoría lectura B').inputValue(),secondReading);
  await page.screenshot({path:root+'/visual-f3b-qa3-'+width+'.png',
   fullPage:true,animations:'disabled'});
  // A new axis calibration invalidates all unsaved series in the session.
  await audit.getByLabel('Auditoría Magnitud X · referencia 2').fill('30');
  assert.match(await visual.locator('[data-f3b-series-count]').innerText(),/0 series separadas/);
  assert(await page.evaluate(()=>Object.values(localStorage).every(s=>
   typeof s!=='string'||!s.includes('data:image/png;base64'))));
  await page.screenshot({path:root+'/visual-f3b-'+width+'.png',fullPage:true,animations:'disabled'});
  await page.reload();await open();await page.locator('[data-conesa-phase-tab="f3b"]').click();await f3.locator('[data-f3-factor]').first().click();
  await audit.locator('summary').click();
  assert.equal(await visual.locator('[data-f3b-visual-canvas]').count(),0,
   'Original raster must never be persisted in localStorage');
  assert.equal(await audit.getByLabel('Auditoría lectura A').inputValue(),firstReading);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',width,readerA:3,readerB:3,
   imageNotPersisted:true,F3bUnchanged:true}));
  await context.close();
 }
}finally{await browser.close();}
