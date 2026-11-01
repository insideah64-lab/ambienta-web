import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const out='qa/ambienta-v358-kpi';
await fs.mkdir(out,{recursive:true});
const url='http://127.0.0.1:8787/v3/index.html?caso=diablillos&perimetro=referencia-qa#/';
const expected=[
 {label:'PROGRAMAS DEL PGA',number:'4',text:'4 con medidas asociadas',href:'/pga'},
 {label:'MEDIDAS AMBIENTALES',number:'4',text:'0 verificadas · 1 en ejecución',href:'/pga'},
 {label:'INSPECCIONES',number:'2',text:'0 pendientes · registros documentales',href:'/monitoreo'},
 {label:'EVIDENCIAS',number:'6',text:'3 revisadas · 3 pendientes',href:'/evidencias'}
];
try{
 for(const [width,height] of [[1800,950],[1440,900],[1366,850]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url);
  const kpis=page.locator('.ref-metric-section');
  await kpis.waitFor();
  assert.equal(await kpis.locator('.ref-metric').count(),4);
  assert.equal(await kpis.locator('.ref-metric-track').count(),0,
   'Do not draw a progress bar from counts or confuse registrations with completion');
  assert.match(await kpis.innerText(),/no porcentajes de cumplimiento/);
  const stats=await kpis.evaluate(section=>{
   const dims=el=>{
    const r=el.getBoundingClientRect();
    return {x:r.x,y:r.y,width:r.width,height:r.height};
   };
   const items=[...section.querySelectorAll('.ref-metric')];
   const label=items[0].querySelector('.ref-metric-label');
   const subtitle=items[0].querySelector('.ref-metric-subtitle');
   const number=items[0].querySelector('.ref-metric-top strong');
   return {section:dims(section),cards:items.map(dims),
    labelFont:parseFloat(getComputedStyle(label).fontSize),
    subtitleFont:parseFloat(getComputedStyle(subtitle).fontSize),
    numberFont:parseFloat(getComputedStyle(number).fontSize),
    docWidth:document.documentElement.scrollWidth,viewport:window.innerWidth};
  });
  assert(stats.labelFont>=13&&stats.subtitleFont>=13&&stats.numberFont>=27);
  assert(stats.cards.every(c=>c.height<=120&&c.height>=72),
   'KPI cards must remain compact and readable: '+JSON.stringify(stats));
  assert(stats.docWidth<=width+6,'No horizontal overflow');
  if(width>=1400)assert(stats.cards.every(c=>Math.abs(c.y-stats.cards[0].y)<=1),
   'Four metrics should fit in one row for wide desktop');
  else assert(stats.cards[2].y>stats.cards[0].y,'Two rows allowed on narrower desktops');
  for(let i=0;i<expected.length;i++){
   const cell=kpis.locator('.ref-metric').nth(i),wanted=expected[i];
   assert.equal(await cell.locator('.ref-metric-label').innerText(),wanted.label);
   assert.equal(await cell.locator('.ref-metric-top strong').innerText(),wanted.number);
   assert.equal(await cell.locator('.ref-metric-subtitle').innerText(),wanted.text);
   assert((await cell.getAttribute('href'))?.endsWith(wanted.href),
    'KPI link must resolve to the intended document module even in HashRouter');
  }
  await kpis.screenshot({path:out+'/desktop-'+width+'-kpi.png',animations:'disabled'});
  await page.screenshot({path:out+'/desktop-'+width+'-dashboard.png',fullPage:true,animations:'disabled'});
  await page.locator('.ref-metric').nth(3).click();
  await page.locator('.v2-page-intro h1').waitFor();
  assert.equal(await page.locator('.v2-page-intro h1').innerText(),'Evidencias');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({viewport:width,sectionHeight:Math.round(stats.section.height),
   cardHeights:stats.cards.map(c=>Math.round(c.height)),fonts:{
    label:stats.labelFont,subtitle:stats.subtitleFont,count:stats.numberFont}}));
  await context.close();
 }
 console.log(JSON.stringify({result:'PASS',fourLinkedKPIs:true,progressBarsRemoved:true,
  documentarySemantics:true,noOverlap:true,desktopOnly:true,screenshots:6}));
}finally{await browser.close();}
