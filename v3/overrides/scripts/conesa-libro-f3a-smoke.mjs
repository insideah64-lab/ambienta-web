import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const out='qa/ambienta-conesa-f3a';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,reducedMotion:'reduce'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices');
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  await page.getByRole('button',{name:'Según libro · Conesa 1997 (experimental)'}).click();
  const f3=page.locator('[data-conesa-f3]');await f3.waitFor();
  assert.equal(await page.locator('[data-catalog-method^="conesa"]').count(),1);
  assert.equal(await f3.locator('[data-f3-factor]').count(),7);
  assert.equal(await f3.locator('[data-f3-visual-empty]').count(),1,'Empty chart must not show fabricated values');
  assert.equal(await f3.locator('[data-f3-chart-row]').count(),0);
  // WCAG 2.2 SC 1.4.3: test *computed* foreground/background, not CSS declarations.
  // This catches accidental inheritance from the surrounding dark F3 editor.
  const contrast=await f3.locator('.amb-f3-quality').evaluate(root=>{
   const color=(css)=>{
    const n=css.match(/[0-9.]+/g)?.slice(0,3).map(Number);
    return n&&n.length===3?n:null;
   };
   const luminance=(rgb)=>{
    const [r,g,b]=rgb.map(n=>{
     const v=n/255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;
    });return 0.2126*r+0.7152*g+0.0722*b;
   };
   const ratio=(fg,bg)=>{
    const a=luminance(fg),b=luminance(bg);
    return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
   };
   return [
    ['título',root.querySelector('h4'),root],
    ['descripción',root.querySelector('.amb-f3-quality-head p:not(.amb-f3-quality-eyebrow)'),root],
    ['eyebrow',root.querySelector('.amb-f3-quality-eyebrow'),root],
    ['contador',root.querySelector('.amb-f3-quality-count'),root.querySelector('.amb-f3-quality-count')],
    ['estado vacío',root.querySelector('.amb-f3-quality-empty p'),root.querySelector('.amb-f3-quality-empty')],
    ['estado vacío título',root.querySelector('.amb-f3-quality-empty strong'),root.querySelector('.amb-f3-quality-empty')],
    ['nota al pie',root.querySelector('.amb-f3-quality-footnote'),root]
   ].map(([name,node,background])=>{
    if(!node||!background)return {name,ratio:0,reason:'missing'};
    const fg=color(getComputedStyle(node).color),bg=color(getComputedStyle(background).backgroundColor);
    return {name,ratio:fg&&bg?ratio(fg,bg):0,fg,bg};
   });
  });
  for(const testCase of contrast)assert(testCase.ratio>=4.5,
   'F3 contrast below WCAG AA: '+JSON.stringify(testCase));

  assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('ambienta-conesa-libro-1997-f3a:'))),[]);
  await f3.locator('[data-f3-factor]').first().click();
  const editor=f3.locator('[data-f3-editor]');
  assert.match(await editor.locator('[data-f3-issues]').innerText(),/indicador/i);
  await editor.getByRole('textbox',{name:'F3 indicador'}).fill('Parámetro ficticio QA');
  await editor.getByRole('textbox',{name:'F3 unidad'}).fill('mg/L');
  await editor.getByRole('textbox',{name:'F3 composición'}).fill('Composición individual del ensayo didáctico sin sinergia');
  await editor.getByRole('spinbutton',{name:'F3 mínimo'}).fill('0');
  await editor.getByRole('spinbutton',{name:'F3 máximo'}).fill('100');
  await editor.getByRole('combobox',{name:'F3 orientación'}).selectOption('decreciente');
  await editor.getByRole('textbox',{name:'F3 función fuente'}).fill('Acta técnica de transformación ficticia QA');
  await editor.getByRole('textbox',{name:'F3 función alcance'}).fill('Solo para prueba de regresión en dominio 0 a 100');
  await editor.getByRole('spinbutton',{name:'F3 without magnitud'}).fill('20');
  await editor.getByRole('spinbutton',{name:'F3 withProject magnitud'}).fill('50');
  await editor.getByLabel('F3 without fecha').fill('2026-10-01');
  await editor.getByLabel('F3 withProject fecha').fill('2026-10-02');
  await editor.getByRole('textbox',{name:'F3 without fuente'}).fill('Informe técnico de ensayo sin proyecto');
  await editor.getByRole('textbox',{name:'F3 withProject fuente'}).fill('Informe predictivo de ensayo con proyecto');
  assert.match(await editor.locator('[data-f3-results]').innerText(),/0,?8|0\.8000/);
  const v=await editor.locator('[data-f3-results]').innerText();
  assert(v.includes('-0.3000')||v.includes('−0.3000'),v);
  assert.equal(await f3.locator('[data-f3-visual-empty]').count(),0);
  assert.equal(await f3.locator('[data-f3-chart-row]').count(),1);
  assert.match(await f3.locator('[data-f3-chart-row]').first().innerText(),/SIN medido · CON estimado/);

  await f3.locator('.amb-f3-quality-disclosure summary').click();
  assert.equal(await f3.locator('.amb-f3-quality-disclosure tbody tr').count(),1);
  const exact=await f3.locator('.amb-f3-quality-disclosure tbody').innerText();
  assert(exact.includes('0.8000')&&exact.includes('0.5000')&&exact.includes('-0.3000'),exact);
  const chartGeometry=await f3.locator('.amb-f3-quality').evaluate(el=>({
   outer:el.getBoundingClientRect().width,
   content:el.scrollWidth,
   ticks:el.querySelectorAll('.amb-f3-quality-ticks span').length
  }));
  assert.equal(chartGeometry.ticks,5);
  assert(chartGeometry.content<=chartGeometry.outer+3,'Comparison chart must not clip at desktop widths');
  await page.screenshot({path:out+'/conesa-f3a-'+width+'.png',animations:'disabled',fullPage:true});
  const key=await page.evaluate(()=>Object.keys(localStorage).find(k=>k.startsWith('ambienta-conesa-libro-1997-f3a:')));
  assert(key,'F3a independent storage expected');
  const f1=await page.evaluate(()=>Object.keys(localStorage).find(k=>k.startsWith('ambienta-conesa-libro-1997-f1:')));
  const f1Data=f1?await page.evaluate(k=>localStorage.getItem(k),f1):null;
  const [dl]=await Promise.all([page.waitForEvent('download'),f3.getByRole('button',{name:'JSON F3a'}).click()]);
  const data=JSON.parse(await fs.readFile(await dl.path(),'utf8'));
  assert.equal(data.methodId,'conesa-libro-1997-f3a');
  const first=Object.values(data.records)[0];
  assert.equal(first.without.value,20);assert.equal(first.withProject.value,50);
  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  await page.getByRole('button',{name:'Según libro · Conesa 1997 (experimental)'}).click();
  await f3.locator('[data-f3-factor]').first().click();
  assert(await f3.locator('[data-f3-results]').count()===1,'F3 persists through reload');
  assert.equal(await f3.locator('[data-f3-chart-row]').count(),1,'Chart derives from persisted F3 data');
  if(f1)assert.equal(await page.evaluate(k=>localStorage.getItem(k),f1),f1Data);
  await page.evaluate(k=>localStorage.setItem(k,'{corrupt-F3a-json'),key);
  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  await page.getByRole('button',{name:'Según libro · Conesa 1997 (experimental)'}).click();
  assert.equal(await f3.locator('[role="alert"]').count(),1);
  const [raw]=await Promise.all([page.waitForEvent('download'),
   f3.getByRole('button',{name:'Descargar original sin modificar'}).click()]);
  assert.equal(await fs.readFile(await raw.path(),'utf8'),'{corrupt-F3a-json');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'{corrupt-F3a-json');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',width,deltaCA:-0.3,independent:true,corruptionPreserved:true}));
  await ctx.close();
 }
}finally{await browser.close();}
