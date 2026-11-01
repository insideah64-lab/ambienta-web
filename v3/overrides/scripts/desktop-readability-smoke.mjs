import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const root='qa/ambienta-v355-desktop';
await fs.mkdir(root,{recursive:true});
const address='http://127.0.0.1:8787/v3/index.html?caso=diablillos&perimetro=referencia-qa';
const problems=[];
const measure=async(page,selector)=>{
 const loc=page.locator(selector).first();
 await loc.waitFor();
 return loc.evaluate(el=>{
  const s=getComputedStyle(el),r=el.getBoundingClientRect();
  return {fontSize:parseFloat(s.fontSize),lineHeight:parseFloat(s.lineHeight)||0,
    width:r.width,height:r.height,x:r.x,y:r.y};
 });
};
try{
 for(const [label,width,height] of [
  ['desktop-1800',1800,950],
  ['desktop-1440',1440,900],
  ['desktop-1366',1366,850]
 ]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  await page.goto(address+'#/');
  await page.locator('.ref-dashboard-columns .ref-map-panel').waitFor();
  await page.locator('.geo-compact .geo-map canvas').waitFor();
  await page.screenshot({path:root+'/'+label+'-overview.png',fullPage:true,animations:'disabled'});
  const selectors={
   nav:'.ref-shell .v2-sidebar .v2-nav-item',
   heading:'.ref-shell .ref-hero h1',
   metricLabel:'.ref-shell .ref-metric .ref-metric-label',
   metricNumber:'.ref-shell .ref-metric .ref-metric-top>strong',
   metricDescription:'.ref-shell .ref-metric .ref-metric-subtitle',
   panelHeading:'.ref-shell .ref-panel-head h2',
   commitment:'.ref-shell .ref-commitment-title strong',
   schedule:'.ref-shell .ref-schedule-row>span',
   caption:'.ref-shell .geo-shell>.geo-canvas-info span',
   mapHeading:'.ref-shell .geo-mode'
  };
  const values=Object.fromEntries(await Promise.all(Object.entries(selectors).map(async ([k,v])=>[k,await measure(page,v)])));
  const min={nav:15,heading:32,metricLabel:13,metricNumber:27,metricDescription:13,
   panelHeading:18,commitment:15,schedule:13,caption:12,mapHeading:13};
  for(const [k,minimum] of Object.entries(min)){
   assert(values[k].fontSize>=minimum, k+' too small '+values[k].fontSize+'px, target '+minimum+'px');
  }
  const layout=await page.evaluate(()=>{
   const el=document.querySelector('.ref-dashboard-columns');
   const cs=getComputedStyle(el),cols=cs.gridTemplateColumns.split(' ').filter(Boolean);
   return {columns:cols.length,
    bodyScrollWidth:document.body.scrollWidth,
    documentWidth:document.documentElement.scrollWidth,
    viewport:window.innerWidth};
  });
  assert.equal(layout.columns,width>=1400?2:1,'Desktop dashboard must not squeeze into 3 narrow columns');
  assert(layout.documentWidth<=width+6,'Unexpected horizontal scroll '+JSON.stringify(layout));
  const map=await page.locator('.ref-map-panel .geo-map').boundingBox();
  assert(map&&map.width>=390,'Map is too narrow to read');
  assert.deepEqual(errors,[],'Runtime errors');
  // Verify specialist pages remain accessible with desktop typography.
  await page.getByRole('link',{name:'Área de estudio',exact:true}).click();
  await page.locator('[data-perimeter-editor=true]').waitFor();
  const intro=await measure(page,'.v2-page-intro p:not(.v2-kicker)');
  assert(intro.fontSize>=16);
  await page.screenshot({path:root+'/'+label+'-area.png',fullPage:false,animations:'disabled'});
  await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
  await page.locator('[data-user-perimeter-visible=true]').waitFor();
  await page.screenshot({path:root+'/'+label+'-sig.png',fullPage:false,animations:'disabled'});
  assert.deepEqual(errors,[]);
  problems.push({label,columns:layout.columns,fonts:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v.fontSize])),mapWidth:Math.round(map.width)});
  await ctx.close();
 }
 console.log(JSON.stringify({result:'PASS',desktopOnly:true,layouts:problems,screenshots:9}));
}finally{await browser.close();}
