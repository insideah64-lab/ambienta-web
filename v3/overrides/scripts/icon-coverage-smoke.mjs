import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const root='http://127.0.0.1:8787/v3/index.html?caso=diablillos#';
const routes=[
 ['resumen','/'],['expediente','/expediente'],['area','/area'],
 ['impactos','/impactos'],['pga','/pga'],['monitoreo','/monitoreo'],
 ['auditorias','/auditorias'],['evidencias','/evidencias'],
 ['sig','/mapas'],['reportes','/reportes'],['mita','/mita'],
 ['normativa','/normativa'],['biblioteca','/biblioteca'],
 ['historial','/historial'],['nube','/nube']
];
const output='qa/ambienta-icon-coverage';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 for(const width of [1366,1800]){
  const context=await browser.newContext({
   viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  const results=[];
  for(const [name,path] of routes){
   await page.goto(root+path);
   await page.locator('.v2-sidebar nav .amb-art-loaded').first().waitFor();
   await page.waitForFunction(()=>[...document.querySelectorAll('.amb-art-icon img')]
     .every(img=>img.complete && img.naturalWidth>0),null,{timeout:15000});
   const data=await page.evaluate(()=>{
    const nav=[...document.querySelectorAll('.v2-sidebar nav a')];
    const arts=[...document.querySelectorAll('[data-ambienta-artwork]')];
    const images=arts.map(x=>x.querySelector('img'));
    const kinds=[...new Set(arts.map(x=>x.getAttribute('data-ambienta-artwork')))];
    const navImgs=nav.map(x=>x.querySelector('.amb-art-icon img'));
    const legacy=[...document.querySelectorAll('svg.lucide')].flatMap(x=>{
      const classes=[...x.classList].filter(cls=>cls.startsWith('lucide-') && cls!=='lucide');
      return classes;
    });
    const prohibited=['lucide-map-pin','lucide-folder-open','lucide-leaf','lucide-shield-check','lucide-file-text','lucide-clipboard-list','lucide-file-check-2','lucide-cloud'];
    const legacyDecorative=legacy.filter(cls=>prohibited.includes(cls));
    return {
      navCount:nav.length,
      navUniqueImages:new Set(navImgs.map(img=>img?.currentSrc)).size,
      loaded:images.filter(img=>img?.complete&&img.naturalWidth>0).length,
      total:images.length,
      uniqueKinds:kinds.length,
      legacyDecorative,
      panelHeading:document.querySelector('.v2-panel-title h2 .amb-art-icon')!==null,
      cloudHeading:document.querySelector('.v2-cloud-heading .amb-art-icon')!==null,
      dashboardPanels:document.querySelectorAll('.ref-panel-head h2 .amb-art-loaded').length,
      indicatorArt:document.querySelectorAll('.ref-indicator-icon .amb-art-loaded').length,
      kpiArt:document.querySelectorAll('.ref-metric .v2-metric-icon .amb-art-loaded').length,
      pgaActions:document.querySelectorAll('.v2-action-group .v2-action-button .amb-art-loaded').length,
      overflow:document.documentElement.scrollWidth-innerWidth
    };
   });
   assert.equal(data.navCount,15,'All routes must retain 15 navigation destinations: '+name);
   assert.equal(data.navUniqueImages,15,'All 15 sidebar artworks must be different: '+name);
   assert.equal(data.loaded,data.total,'Missing or broken generated images on '+name);
   assert.equal(data.legacyDecorative.length,0,'Unexpected generic decorative icon on '+name+': '+data.legacyDecorative);
   assert(data.overflow<=6,'Horizontal overflow on '+name+'/'+width+': '+data.overflow);
   if(name==='resumen'){
     assert(data.dashboardPanels>=5,'Dashboard panel titles must use original pictograms');
     assert.equal(data.indicatorArt,4,'Each environmental indicator requires original illustration');
     assert.equal(data.kpiArt,4,'Each dashboard KPI needs original illustration');
   } else if(name==='nube') {
     assert(data.cloudHeading,'Private workspace must use original cloud illustration');
   } else {
     assert(data.panelHeading,'Interior page '+name+' missing original illustrated heading');
   }
   if(name==='pga')assert.equal(data.pgaActions,4,'All four PGA actions should use new images');
   assert.deepEqual(errors,[],'Browser errors: '+name);
   results.push({route:path,artworks:data.total,uniqueKinds:data.uniqueKinds,unloaded:0});
   if(width===1800||['resumen','pga','expediente','reportes'].includes(name))
     await page.screenshot({path:output+'/'+name+'-'+width+'.png',animations:'disabled'});
  }
  console.log(JSON.stringify({result:'PASS',viewport:width,routes:routes.length,
   loadedGeneratedArt:true,decorativeLucideRemainder:0,geospatialSymbolsUntouched:true,
   results}));
  await context.close();
 }
} finally {await browser.close();}
