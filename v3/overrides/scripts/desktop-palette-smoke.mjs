import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
// Desktop palette QA. All scenarios retain the previous V3 app state, routes and SIG.
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const out='qa/ambienta-desktop-slate-blue';
await fs.mkdir(out,{recursive:true});
const cases=[
 ['inicio','/'],['informes','/reportes'],['impactos','/impactos'],
 ['pga','/pga'],['sig','/mapas']
];
try{
 for(const width of [1366,1440,1800]){
  const ctx=await browser.newContext({viewport:{width,height:940},deviceScaleFactor:1});
  const page=await ctx.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const baseline=()=>page.evaluate(()=>JSON.stringify({...localStorage}));
  let original='';
  for(const [name,route] of cases){
   await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#'+route);
   await page.locator('.ref-shell .v2-sidebar').waitFor();
   if(!original)original=await baseline();
   const appearance=await page.evaluate(()=>{
    const style=selector=>getComputedStyle(document.querySelector(selector));
    const app=document.querySelector('.ref-shell');
    const theme=getComputedStyle(app);
    return {
     desktopBackground:style('.v2-sidebar').backgroundImage,
     mainBackground:style('.v2-main').backgroundImage,
     accent:theme.getPropertyValue('--amb-blue').trim(),
     panelBackground:style('.v2-panel').backgroundImage,
     text:style('.v2-panel-title h2').color,
     highlight:style('.v2-nav-item.is-active').backgroundImage,
     overflow:document.documentElement.scrollWidth-window.innerWidth,
     statusColors:[...document.querySelectorAll('.v2-badge-mint,.v2-badge-amber,.v2-badge-blue')]
      .slice(0,3).map(x=>getComputedStyle(x).color)
    };
   });
   assert.equal(appearance.accent,'#79beff');
   assert.match(appearance.desktopBackground,/rgb\\(12, 23, 44\\)/);
   assert.match(appearance.mainBackground,/rgb\\(14, 26, 47\\)/);
   assert.match(appearance.panelBackground,/rgb\\(26, 44, 66\\)/);
   assert.match(appearance.highlight,/rgb\\(49, 90, 147\\)/);
   assert.equal(appearance.text,'rgb(243, 248, 255)');
   assert(appearance.overflow<=6,'Horizontal overflow at '+width+' '+route);
   assert.equal(await baseline(),original,'Theme may not mutate DEMO data');
   assert.deepEqual(errors,[]);
   await page.screenshot({path:out+'/'+name+'-'+width+'.png',fullPage:false,
    animations:'disabled'});
   console.log(JSON.stringify({width,route,theme:'slate-blue',result:'PASS',
    overflow:appearance.overflow,semanticTokensPreserved:true}));
  }
  await ctx.close();
 }
}finally{await browser.close()}
