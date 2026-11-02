import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const output='qa/ambienta-original-icons';
await fs.mkdir(output,{recursive:true});
try{
 for(const width of [1366,1440,1800]){
  const ctx=await browser.newContext({
    viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'
  });
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/');
  await page.locator('.v2-sidebar .v2-logo [data-ambienta-icon="brand"]').waitFor();
  const original=await page.evaluate(()=>JSON.stringify({...localStorage}));
  const snapshot=await page.evaluate(()=>{
    const all=[...document.querySelectorAll('.v2-sidebar nav .v2-nav-item')];
    const icons=all.map(link=>link.querySelector('svg[data-ambienta-icon]'));
    const glyphs=icons.map(icon=>icon?.getAttribute('data-ambienta-icon'));
    const colors=icons.map(icon=>icon?getComputedStyle(icon).color:null);
    const shapes=icons.map(icon=>icon?.innerHTML);
    const metrics=[...document.querySelectorAll('.ref-metrics .v2-metric')];
    const indicators=[...document.querySelectorAll('.ref-indicator')];
    const commitments=[...document.querySelectorAll('.ref-commitment')];
    const first=icons[0];
    return {
      navCount:all.length,glyphs,colors,shapes,
      navAriaHidden:icons.every(icon=>icon?.getAttribute('aria-hidden')==='true'),
      navLabels:all.every(link=>Boolean(link.textContent?.trim())),
      metricKinds:metrics.map(m=>m.querySelector('svg[data-ambienta-icon]')?.getAttribute('data-ambienta-icon')),
      indicatorKinds:indicators.map(m=>m.querySelector('svg[data-ambienta-icon]')?.getAttribute('data-ambienta-icon')),
      commitmentIcons:commitments.filter(m=>m.querySelector('svg[data-ambienta-icon]')).length,
      reducedMotionDuration:first?getComputedStyle(first).transitionDuration:'',
      brand:document.querySelector('.v2-logo [data-ambienta-icon]')?.getAttribute('data-ambienta-icon'),
      overflow:document.documentElement.scrollWidth-innerWidth
    };
  });
  assert.equal(snapshot.navCount,15,'15 navigation destinations must remain');
  assert(snapshot.glyphs.every(Boolean),'No missing navigation icon');
  assert.equal(new Set(snapshot.glyphs).size,15,'Each destination has a distinct motif');
  assert.equal(new Set(snapshot.shapes).size,15,'Each icon is a distinct SVG drawing');
  assert(new Set(snapshot.colors).size>=5,'Icons must use differentiated, subtle module accents');
  assert.equal(snapshot.navAriaHidden,true);
  assert.equal(snapshot.navLabels,true);
  assert.equal(snapshot.brand,'brand');
  assert.deepEqual(snapshot.metricKinds,['pga','measures','inspections','evidence']);
  assert.deepEqual(snapshot.indicatorKinds,['vegetation','water','air','noise']);
  assert(snapshot.commitmentIcons>=2,'Live measure card glyphs required');
  assert(snapshot.reducedMotionDuration.split(',').every(x=>parseFloat(x)===0),'Reduced motion must disable animation');
  assert(snapshot.overflow<=6,'Horizontal overflow '+snapshot.overflow);
  assert.deepEqual(errors,[],'No JS errors on dashboard');
  await page.screenshot({path:output+'/dashboard-'+width+'.png',animations:'disabled'});

  await page.getByRole('link',{name:'Plan de Gestión',exact:true}).first().click();
  await page.waitForURL(/#\/pga/);
  assert.equal(await page.locator('.v2-sidebar a.is-active [data-ambienta-icon="pga"]').count(),1);
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),original,
    'Navigation/icon changes must not mutate expediente');
  await page.screenshot({path:output+'/pga-'+width+'.png',animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,result:'PASS',navIcons:15,metrics:4,
    environmentalIndicators:4,distinctColors:new Set(snapshot.colors).size,
    dataPreserved:true,reducedMotion:true,overflow:snapshot.overflow}));
  await ctx.close();
 }
}finally{await browser.close()}
