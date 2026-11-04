import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='qa/ambienta-conesa-anejo4-atmosfera';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
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
  const before=await page.evaluate(()=>Object.entries(localStorage)
   .filter(([k])=>k.startsWith('ambienta-conesa-libro-1997-f3a:')));
  await page.locator('[data-conesa-phase-tab="f3b"]').click();
  await editor.getByRole('combobox',{name:'F3 tipo de función'}).selectOption('curva');
  const library=editor.locator('[data-f3b-library]');
  await library.locator('summary').click();
  assert.equal(await library.locator('[data-annex4-id]').count(),27);
  assert.match(await library.locator('[data-annex4-coverage]').innerText(),/14[\s\S]*5[\s\S]*8/);
  const sections=library.getByRole('combobox',{name:'Sección Anejo 4'});
  await sections.selectOption('II. Suelo');
  assert.equal(await library.locator('[data-annex4-id]').count(),5);
  await library.locator('[data-annex4-id="soil-01-erosion-sedimentos"]').click();
  assert.match(await library.locator('[data-f3b-library-detail]').innerText(),/m³\/ha\/año/);
  await sections.selectOption('III. Agua');
  assert.equal(await library.locator('[data-annex4-id]').count(),8);
  await library.locator('[data-annex4-id="water-07-sustancias-toxicas"]').click();
  assert.match(await library.locator('[data-annex4-nonlinear-warning]').innerText(),/interpolador F3b/);
  await sections.selectOption('todas');
  await library.getByRole('textbox',{name:'Buscar fichas Anejo 4'}).fill('MONOXIDO');
  assert.equal(await library.locator('[data-annex4-id]').count(),2);
  await library.locator('[data-annex4-id="atm-01-co-diario"]').click();
  assert.match(await library.locator('[data-f3b-library-detail]').innerText(),/Concentración media diaria/);
  assert.match(await library.locator('[data-f3b-library-detail]').innerText(),/página 245 del PDF/);
  await library.getByRole('button',{name:'Cargar únicamente cita y página en F3b'}).click();
  assert.match(await editor.getByRole('textbox',{name:'F3b fuente'}).inputValue(),/ficha 1/);
  assert.equal(await editor.getByRole('spinbutton',{name:'F3b página'}).inputValue(),'254');
  for(const i of [1,2]){
   assert.equal(await editor.getByRole('spinbutton',{name:'F3b magnitud nudo '+i}).inputValue(),'');
   assert.equal(await editor.getByRole('spinbutton',{name:'F3b CA nudo '+i}).inputValue(),'');
  }
  assert.equal(await editor.locator('[data-f3-results]').count(),0);
  assert.equal(await editor.locator('[data-f3b-ready]').count(),0);
  const after=await page.evaluate(()=>Object.entries(localStorage)
   .filter(([k])=>k.startsWith('ambienta-conesa-libro-1997-f3a:')));
  assert.deepEqual(after,before,'A bibliography lookup must not change F3a');
  const raw=await page.evaluate(()=>Object.entries(localStorage)
   .filter(([k])=>k.startsWith('ambienta-conesa-libro-1997-f3b:')));
  assert.equal(raw.length,1);
  const doc=JSON.parse(raw[0][1]);
  const first=Object.values(doc.records)[0];
  assert.equal(first.bookPage,254);
  assert(first.points.every(p=>p.m===null&&p.ca===null));
  assert.equal(first.assessor,'');
  assert.equal(first.evidence,'');
  await library.getByRole('textbox',{name:'Buscar fichas Anejo 4'}).fill('ruido');
  await library.locator('[data-annex4-id="atm-11-ruido-presion"]').click();
  await editor.getByRole('spinbutton',{name:'F3b magnitud nudo 1'}).fill('5');
  assert.equal(await library.getByRole('button',{name:'Cargar únicamente cita y página en F3b'}).isDisabled(),true,
   'No debe atribuir nudos existentes a otra ficha sin revisión');
  const metrics=await library.evaluate(node=>({
   width:node.getBoundingClientRect().width,scrollWidth:node.scrollWidth
  }));
  assert(metrics.scrollWidth<=metrics.width+3,'Catalog card should fit desktop viewport');
  await page.screenshot({path:out+'/fichas-atmosfera-'+width+'.png',fullPage:true,animations:'disabled'});
  await page.reload();await open();await page.locator('[data-conesa-phase-tab="f3b"]').click();
  await f3.locator('[data-f3-factor]').first().click();
  assert.equal(await editor.getByRole('spinbutton',{name:'F3b página'}).inputValue(),'254');
  assert.match(await editor.getByRole('textbox',{name:'F3b fuente'}).inputValue(),/Monóxido de carbono/);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',width,records:10,numericalValuesLoaded:0,
   bibliographyOnly:true,persistence:true,independent:true}));
  await ctx.close();
 }
}finally{await browser.close();}
