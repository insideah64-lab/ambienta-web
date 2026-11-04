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
   await page.getByRole('button',{name:'Según libro · Conesa 1997 (experimental)'}).click();
  };
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices');
  await open();
  const f3=page.locator('[data-conesa-f3]');
  await f3.locator('[data-f3-factor]').first().click();
  const editor=f3.locator('[data-f3-editor]');
  await editor.getByRole('textbox',{name:'F3 indicador'}).fill('Concentración media diaria');
  await editor.getByRole('textbox',{name:'F3 unidad'}).fill('p.p.m.');
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
  assert.equal(await audit.getByLabel('Auditoría Píxel X · referencia 1').inputValue(),'100');
  assert.equal(await audit.getByLabel('Auditoría Píxel X · referencia 2').inputValue(),'500');
  assert.equal(await audit.getByLabel('Auditoría Píxel Y · referencia 1').inputValue(),'350');
  assert.equal(await audit.getByLabel('Auditoría Píxel Y · referencia 2').inputValue(),'50');
  assert.match(await visual.locator('.amb-f3b-visual-calibration').innerText(),/completa/);
  await clickPoint(100,350);await clickPoint(300,200);await clickPoint(500,50);
  const preview=await visual.locator('[data-f3b-visual-preview]').innerText();
  assert(preview.includes('3 puntos seleccionados'),preview);
  assert(preview.includes('10.00000')&&preview.includes('0.50000'),preview);
  const f3bKey=await page.evaluate(()=>Object.keys(localStorage).find(k=>
   k.startsWith('ambienta-conesa-libro-1997-f3b:')));
  assert(f3bKey);
  const before=await page.evaluate(k=>localStorage.getItem(k),f3bKey);
  await visual.getByRole('button',{name:'Pasar puntos a lectura A (sin modificar F3b)'}).click();
  assert.equal(await audit.getByLabel('Auditoría lectura A').inputValue(),'0;0\n10;0.5\n20;1');
  assert.equal(await audit.getByLabel('Auditoría lectura B').inputValue(),'');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),f3bKey),before);
  await visual.getByRole('button',{name:'Lector B'}).click();
  await clickPoint(100,350);await clickPoint(300,200);await clickPoint(500,50);
  await visual.getByRole('button',{name:'Pasar puntos a lectura B (sin modificar F3b)'}).click();
  assert.equal(await audit.getByLabel('Auditoría lectura B').inputValue(),'0;0\n10;0.5\n20;1');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),f3bKey),before);
  const auditKey=await page.evaluate(()=>Object.keys(localStorage).find(k=>
   k.startsWith('ambienta-conesa-1997-f3b-auditoria:')));
  assert(auditKey);
  const record=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),auditKey));
  assert.equal(record.xPixelA,'100');
  assert.equal(record.readingA,record.readingB);
  assert.equal(record.approval,null);
  assert(!Object.values(localStorage).some(s=>typeof s==='string'&&s.includes('data:image/png;base64')));
  await page.screenshot({path:root+'/visual-f3b-'+width+'.png',fullPage:true,animations:'disabled'});
  await page.reload();await open();await f3.locator('[data-f3-factor]').first().click();
  await audit.locator('summary').click();
  assert.equal(await visual.locator('[data-f3b-visual-canvas]').count(),0,
   'Original raster must never be persisted in localStorage');
  assert.equal(await audit.getByLabel('Auditoría lectura A').inputValue(),'0;0\n10;0.5\n20;1');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',width,readerA:3,readerB:3,
   imageNotPersisted:true,F3bUnchanged:true}));
  await context.close();
 }
}finally{await browser.close();}
