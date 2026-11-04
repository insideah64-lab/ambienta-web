import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:8787/v3/';
const out=process.env.QA_OUTPUT||'qa/matrices-handoff/local-before';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 for(const width of [1366,1800]) {
  const ctx=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true,
   deviceScaleFactor:Number(process.env.QA_DPR||1)});
  const page=await ctx.newPage();
  const logs={console:[],pageerror:[],failed:[],responses:[],assets:[]};
  page.on('console',m=>logs.console.push({type:m.type(),text:m.text()}));
  page.on('pageerror',e=>logs.pageerror.push(String(e)));
  page.on('requestfailed',r=>logs.failed.push({url:r.url(),error:r.failure()}));
  page.on('response',r=>logs.responses.push({url:r.url(),status:r.status(),headers:r.headers()}));
  await page.goto(base+'index.html?qa=handoff#/matrices');
  await page.locator('[data-impact-matrix]').waitFor();
  const grid=page.locator('.amb-matrix-grid');
  assert.equal(await grid.locator('tbody tr').count(),7);
  assert.equal(await grid.locator('thead th').count(),5);
  const measurements=[];
  async function capture(tag) {
   measurements.push({tag,...await grid.evaluate(t=>{
    const th=t.querySelector('thead th'),label=t.querySelector('.amb-matrix-corner-label');
    const range=document.createRange();range.selectNodeContents(label);
    const box=e=>({x:e.x,y:e.y,width:e.width,height:e.height});
    const style=getComputedStyle(label),cell=getComputedStyle(th);
    return {cell:box(th.getBoundingClientRect()),label:box(label.getBoundingClientRect()),
     text:box(range.getBoundingClientRect()),css:{display:style.display,alignItems:style.alignItems,
      lineHeight:style.lineHeight,font:style.font,verticalAlign:cell.verticalAlign},
     dpr:devicePixelRatio,zoom:getComputedStyle(document.documentElement).zoom,
     assets:[...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(e=>e.src||e.href)};
   })});
   const m=measurements.at(-1);
   assert(Math.abs(m.cell.y+m.cell.height/2-m.text.y-m.text.height/2)<2,
    'Text layout has moved away from the vertical cell centre: '+JSON.stringify(m));
   assert.equal(m.css.display,'flex');assert.equal(m.css.alignItems,'center');
   await page.screenshot({path:`${out}/${width}-${tag}-full.png`,fullPage:true});
   await grid.locator('thead').screenshot({path:`${out}/${width}-${tag}-header.png`,scale:'css'});
   await grid.locator('thead th').first().screenshot({path:`${out}/${width}-${tag}-corner.png`});
  }
  await capture('initial');
  await grid.evaluate(t=>t.parentElement.scrollTop=80);
  await capture('scroll');
  await page.evaluate(()=>document.documentElement.style.zoom='1.25');
  await capture('zoom125');
  await page.evaluate(()=>document.documentElement.style.zoom='1');
  for(let i=0;i<4;i++) {
   await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
   for(const phase of ['f1','f2','f3a','f3b']) {
    await page.locator(`[data-conesa-phase-tab="${phase}"]`).click();
    await page.locator('[data-conesa-book]').waitFor();
   }
   await page.reload();
   await page.locator('[data-impact-matrix]').waitFor();
  }
  await capture('after-navigation');
  // Retain full 7x4 table evidence, including columns/rows clipped by its scroll viewport.
  const wrapper=grid.locator('..');
  const originalStyle=await wrapper.getAttribute('style');
  await wrapper.evaluate(e=>{e.style.overflow='visible';e.style.maxHeight='none';e.style.width='max-content';});
  await grid.screenshot({path:`${out}/${width}-table-complete.png`});
  await wrapper.evaluate((e,s)=>s===null?e.removeAttribute('style'):e.setAttribute('style',s),originalStyle);
  for(const url of measurements[0].assets) {
   const response=await ctx.request.get(url);
   logs.assets.push({url,status:response.status(),headers:response.headers(),
    sha256:createHash('sha256').update(await response.body()).digest('hex')});
  }
  await fs.writeFile(`${out}/${width}-dom.html`,await page.content());
  const storage=await page.evaluate(()=>({...localStorage}));
  assert.match(await page.locator('.v2-topbar').innerText(),/DEMO-001/);
  await fs.writeFile(`${out}/${width}-diagnostic.json`,JSON.stringify({base,width,measurements,logs,storage},null,2));
  assert.deepEqual(logs.pageerror,[]);
  console.log(JSON.stringify({width,pageerrors:logs.pageerror,failed:logs.failed,
   measurements:measurements.map(m=>({tag:m.tag,cell:m.cell,text:m.text,css:m.css}))}));
  await ctx.close();
 }
} finally {await browser.close();}
