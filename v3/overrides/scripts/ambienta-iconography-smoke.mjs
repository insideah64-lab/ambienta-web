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
  await page.locator('.v2-sidebar nav .amb-art-loaded').first().waitFor();
  const raster=await page.evaluate(()=>{
    const nav=[...document.querySelectorAll('.v2-sidebar nav .v2-nav-item')];
    const icons=nav.map(n=>n.querySelector('.amb-art-icon'));
    const photo=getComputedStyle(document.querySelector('.ref-hero')).backgroundImage;
    return {
      ready:icons.filter(x=>x?.classList.contains('amb-art-loaded')).length,
      kinds:icons.map(x=>x?.getAttribute('data-ambienta-artwork')),
      imageWidths:icons.map(x=>x?.querySelector('img')?.naturalWidth),
      imageSources:icons.map(x=>x?.querySelector('img')?.currentSrc),
      background:photo,
      heroBytes:performance.getEntriesByType('resource').filter(e=>e.name.includes('hero-puna')).length,
    };
  });
  assert.equal(raster.ready,15,'All 15 navigation art images must load');
  assert.equal(new Set(raster.imageSources).size,15,'All 15 modules need different generated image files');
  assert(raster.imageWidths.every(x=>x>0),'Actual WebP pixel data required, not just SVG placeholders');
  assert(raster.background.includes('hero-puna'),'Generated photo must replace prior vector background');
  assert(!raster.background.includes('ambienta-landscape.svg'),'Old scenic SVG must not be active');
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
      commitmentIcons:commitments.filter(m=>m.querySelector('svg[data-ambienta-icon], [data-commitment-art]')).length,
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
  assert(snapshot.commitmentIcons>=4,'Every visible commitment requires an illustration');
  const commitments=await page.evaluate(async ()=>{
    const icons=[...document.querySelectorAll('.ref-commitment [data-commitment-art]')];
    const kinds=icons.map(el=>el.getAttribute('data-commitment-art'));
    const backgrounds=icons.map(el=>getComputedStyle(el).backgroundImage);
    const first=backgrounds[0]||'';
    const url=first.startsWith('url("')?first.slice(5,-2):'';
    let image=null;
    if(url){
      const response=await fetch(url);
      if(response.ok){
        const bitmap=await createImageBitmap(await response.blob());
        image={width:bitmap.width,height:bitmap.height};
        bitmap.close();
      }
    }
    return {kinds,backgrounds,image};
  });
  assert.deepEqual(commitments.kinds,['hydric','effluent','waste','participation'],
    'Each Diablillos commitment must use its own visual subject, not a repeated leaf');
  assert(commitments.backgrounds.every(x=>x.includes('commitment-pictograms')||x.includes('data:image/webp')),
    'Approved WebP artwork must load either as bundled V3 asset or Vite-inlined data URI');
  assert.deepEqual(commitments.image,{width:256,height:64},
    'Four-image sprite must decode at 256 by 64 pixels');
  assert(snapshot.reducedMotionDuration.split(',').every(x=>parseFloat(x)===0),'Reduced motion must disable animation');
  assert(snapshot.overflow<=6,'Horizontal overflow '+snapshot.overflow);
  assert.deepEqual(errors,[],'No JS errors on dashboard');
  const hero=await page.locator('[data-hero-illustrated=true]').evaluate(el=>{
    const vectors=[...el.querySelectorAll('svg[data-ambienta-illustration]')];
    const artworks=[...el.querySelectorAll('[data-ambienta-artwork]')];
    const tags=[...el.querySelectorAll('.ref-hero-tag')];
    const allKinds=[
      ...vectors.map(svg=>'vector:'+svg.getAttribute('data-ambienta-illustration')),
      ...artworks.map(span=>'raster:'+span.getAttribute('data-ambienta-artwork'))
    ];
    const imageSources=artworks.map(span=>span.querySelector('img')?.currentSrc);
    return {
      icons:vectors.length+artworks.length,distinctKinds:[...new Set(allKinds)],
      svgShapes:[...new Set(vectors.map(x=>x.innerHTML))].length,
      uniquePhotos:[...new Set(imageSources)].length,
      decodedRaster:artworks.every(span=>span.classList.contains('amb-art-loaded')&&span.querySelector('img')?.naturalWidth>0),
      decorative:vectors.every(svg=>svg.getAttribute('aria-hidden')==='true')&&
        artworks.every(span=>span.getAttribute('aria-hidden')==='true'),
      tags:tags.length,colors:[...new Set(tags.map(t=>getComputedStyle(t).backgroundImage))].length,
      header:el.querySelector('h1')?.textContent,
      coordinates:el.textContent.includes('Coordenadas no declaradas'),
      width:el.getBoundingClientRect().width,overflow:el.scrollWidth-el.clientWidth
    };
  });
  assert(hero.distinctKinds.length>=8,'Hero must have >=8 distinctly illustrated motifs, SVG and WebP combined');
  assert(hero.icons>=10,'Hero pictograms should appear in heading, metadata, badges and location');
  assert(hero.uniquePhotos>=7,'Hero must actually decode >=7 distinct generated illustration assets');
  assert.equal(hero.decodedRaster,true,'No missing or broken generated artwork in the hero');
  assert.equal(hero.decorative,true,'Illustrations must be hidden from assistive technology');
  assert.equal(hero.tags,4,'Four live project labels retained');
  assert(hero.colors>=4,'Tags need distinct color palettes, not all green');
  assert(hero.header?.includes('Diablillos'));
  assert.equal(hero.coordinates,true,'No fake geolocation');
  assert(hero.overflow<=6,'Hero must not overflow its box: '+JSON.stringify(hero));
  assert.equal(await page.locator('.ref-map-panel h2 [data-ambienta-icon="territory"]').count(),1);
  assert.equal(await page.locator('.ref-schedule h2 [data-ambienta-icon="calendar"]').count(),1);
  assert.equal(await page.locator('.ref-activities h2 [data-ambienta-icon="history"]').count(),1);
  assert.equal(await page.locator('.ref-indicators h2 [data-ambienta-icon="monitoring"]').count(),1);
  assert.equal(await page.locator('.ref-activity-icon [data-ambienta-icon]').count()>=1,true);
  assert.equal(await page.locator('.v2-case-banner [data-ambienta-icon="notice"]').count(),1);
    await page.screenshot({path:output+'/dashboard-'+width+'.png',animations:'disabled'});

  await page.getByRole('link',{name:'Plan de Gestión',exact:true}).first().click();
  await page.waitForURL(/#\/pga/);
  await page.locator('.v2-sidebar a.is-active [data-ambienta-icon="pga"]').waitFor();
  assert.equal(await page.locator('.v2-sidebar a.is-active [data-ambienta-icon="pga"]').count(),1);
  for(const kind of ['measures','calendar','evidence','review']){
    assert.equal(await page.locator('.v2-action-group .v2-action-button [data-ambienta-icon="'+kind+'"]').count(),1,
      'PGA action needs original icon '+kind);
  }
  assert.equal(await page.locator('.v2-panel-title h2 [data-ambienta-icon="pga"]').count(),1);
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
