import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const folder='qa/ambienta-real-reference-design';
await fs.mkdir(folder,{recursive:true});
const routes=[['inicio','/'],['reportes','/reportes'],['impactos','/impactos'],['pga','/pga'],['sig','/mapas']];
try {
 for(const width of [1366,1440,1800]){
  const ctx=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  let initial=null;
  for(const [name,path] of routes){
   await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#'+path);
   await page.locator('.ref-shell .v2-sidebar').waitFor();
   if(name==='inicio')await page.locator('[data-reference-dashboard="true"]').waitFor();
   const check=await page.evaluate(()=>{
    const style=x=>getComputedStyle(document.querySelector(x));
    const shell=style('.ref-shell');
    const nav=style('.v2-nav-item.is-active');
    const panel=style('.v2-panel, .ref-panel');
    const hero=document.querySelector('.ref-hero');
    const grid=document.querySelector('.ref-reference-grid');
    return {
     accent:shell.getPropertyValue('--amb-positive').trim(),
     sidebar:style('.v2-sidebar').backgroundImage,
     main:style('.v2-main').backgroundImage,
     navBackground:nav.backgroundImage,
     panelBackground:panel.backgroundImage,
     heroImage:hero?getComputedStyle(hero).backgroundImage:null,
     kpis:[...document.querySelectorAll('.ref-metric .v2-metric-icon')].map(x=>getComputedStyle(x).backgroundColor),
     areas:grid?getComputedStyle(grid).gridTemplateAreas:null,
     mapCount:document.querySelectorAll('.ref-map-panel .geo-shell').length,
     overflow:document.documentElement.scrollWidth-window.innerWidth,
     badges:[...document.querySelectorAll('.v2-badge')].map(x=>({
       cls:x.className,color:getComputedStyle(x).backgroundColor
     }))
    };
   });
   assert.equal(check.accent,'#6be4a7');
   assert(check.sidebar.includes('rgb(6, 37, 42)'),'Dark forest navigation should render');
   assert(check.main.includes('rgb(10, 39, 48)'),'Petrol main background should render');
   assert(check.panelBackground.includes('rgb(16, 50, 60)'),'Panel color should render');
   if(name==='inicio'){
    assert(check.heroImage.includes('url(') && check.heroImage.includes('hero-puna'),'Hero must use the bundled generated photographic WebP asset, not the former SVG');
    assert(new Set(check.kpis).size>=3,'KPI icons must use distinct environmental accent families');
    assert.equal(check.mapCount,1,'Actual geographical map must be retained');
    assert(check.areas?.includes('commitments'),'Commitment panel must remain');
    assert(check.areas?.includes('activities'),'Activity panel must remain');
    assert(check.areas?.includes('attention'),'Document warnings must remain');
   }
   if(name==='pga'){
    const mint=check.badges.find(x=>x.cls.includes('v2-badge-mint'))?.color;
    const amber=check.badges.find(x=>x.cls.includes('v2-badge-amber'))?.color;
    if(mint&&amber)assert.notEqual(mint,amber,'Semantic statuses must remain distinguishable');
   }
   assert(check.overflow<=6,'Desktop horizontal overflow '+name+' '+width+' = '+check.overflow);
   assert.deepEqual(errors,[],'JS runtime errors');
   const current=await page.evaluate(()=>JSON.stringify({...localStorage}));
   if(initial===null)initial=current;
   else assert.equal(current,initial,'Visual styling may not modify local DEMO data');
   await page.screenshot({path:folder+'/'+name+'-'+width+'.png',animations:'disabled'});
   console.log(JSON.stringify({width,route:path,result:'PASS',theme:'reference-dark-env',
      overview3col:name==='inicio'&&width>1520,overflow:check.overflow,readOnly:true}));
  }
  await ctx.close();
 }
}finally{await browser.close()}
