import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
// Desktop palette QA. All scenarios retain the previous V3 app state, routes and SIG.
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const out='qa/ambienta-desktop-balanced';
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
     panelBackground:style('.v2-panel, .ref-panel').backgroundImage,
     text:style('.v2-panel-title h2, .ref-panel-head h2').color,
     highlight:style('.v2-nav-item.is-active').backgroundImage,
     overflow:document.documentElement.scrollWidth-window.innerWidth,
     statusColors:[...document.querySelectorAll('.v2-badge-mint,.v2-badge-amber,.v2-badge-blue')]
      .slice(0,3).map(x=>getComputedStyle(x).backgroundColor),
     metricColors:[...document.querySelectorAll('.ref-metric .v2-metric-icon')]
      .map(x=>getComputedStyle(x).backgroundColor),
     statusMint:document.querySelector('.v2-badge-mint') ?
      getComputedStyle(document.querySelector('.v2-badge-mint')).backgroundColor : null,
     statusAmber:document.querySelector('.v2-badge-amber') ?
      getComputedStyle(document.querySelector('.v2-badge-amber')).backgroundColor : null
    };
   });
   assert.equal(appearance.accent,'#8bbde9');
   assert(appearance.desktopBackground.includes('rgb(36, 38, 43)'), 'appearance.desktopBackground must use the new palette');
   assert(appearance.mainBackground.includes('rgb(32, 34, 40)'), 'appearance.mainBackground must use the new palette');
   assert(appearance.panelBackground.includes('rgb(48, 52, 59)'), 'appearance.panelBackground must use the new palette');
   assert(appearance.highlight.includes('rgb(68, 75, 82)'), 'appearance.highlight must use the new palette');
   assert.equal(appearance.text,'rgb(247, 245, 240)');
   if(name==='inicio')assert(new Set(appearance.metricColors).size>=3,'KPIs need distinct, semantic accent families');
   if(name==='pga'){
    assert.equal(appearance.statusMint,'rgb(49, 89, 73)','Execution status must remain green');
    assert.equal(appearance.statusAmber,'rgb(102, 80, 57)','Review status must remain amber');
    assert.notEqual(appearance.statusMint,appearance.statusAmber);
   }
   assert(appearance.overflow<=6,'Horizontal overflow at '+width+' '+route);
   assert.equal(await baseline(),original,'Theme may not mutate DEMO data');
   assert.deepEqual(errors,[]);
   await page.screenshot({path:out+'/'+name+'-'+width+'.png',fullPage:false,
    animations:'disabled'});
   console.log(JSON.stringify({width,route,theme:'balanced-charcoal',result:'PASS',
    overflow:appearance.overflow,semanticTokensPreserved:true}));
  }
  await ctx.close();
 }
}finally{await browser.close()}
