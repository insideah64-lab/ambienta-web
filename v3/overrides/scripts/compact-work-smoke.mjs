import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const out='qa/ambienta-v357-compact-work';
await fs.mkdir(out,{recursive:true});
const url='http://127.0.0.1:8787/v3/index.html?caso=diablillos&perimetro=referencia-qa#/';
try{
 for(const [width,height] of [[1800,950],[1440,900],[1366,850]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(url);
  const work=page.locator('[data-work-attention=true]');
  await work.waitFor();
  const cards=work.locator('[data-attention-key]');
  assert.equal(await cards.count(),4,'No documentary task category was dropped');
  assert.equal(await work.locator('[data-work-follow-up=true]').innerText(),'2');
  assert.equal(await work.locator('[data-work-review=true]').innerText(),'4');
  const measures=await page.evaluate(()=>{
   const rect=sel=>document.querySelector(sel).getBoundingClientRect();
   const font=sel=>parseFloat(getComputedStyle(document.querySelector(sel)).fontSize);
   const cards=[...document.querySelectorAll('.ref-attention-item')].map(e=>{
    const b=e.getBoundingClientRect();
    return {x:b.x,y:b.y,width:b.width,height:b.height};
   });
   const main=rect('[data-work-attention=true]');
   const summary=[...document.querySelectorAll('.ref-attention-summary>span')].map(x=>{
    const r=x.getBoundingClientRect();return {width:r.width,height:r.height};
   });
   return {height:main.height,mainWidth:main.width,cards,summary,
    fonts:{title:font('.ref-attention-top h2'),card:font('.ref-attention-item>strong'),
      details:font('.ref-attention-description'),counter:font('.ref-attention-summary strong')},
    horizontal:document.documentElement.scrollWidth-window.innerWidth};
  });
  assert(measures.height<=420,'Work block too tall: '+JSON.stringify(measures));
  assert(measures.cards.every(x=>x.height>=95&&x.height<=145),
   'Cards too tall or compressed: '+JSON.stringify(measures.cards));
  assert.equal(measures.cards[0].y,measures.cards[1].y,'Two columns in first row');
  assert.equal(measures.cards[2].y,measures.cards[3].y,'Two columns in second row');
  assert(measures.cards[2].y>measures.cards[0].y,'Rows must be separate');
  assert(measures.summary.every(x=>x.height<=52),'Counters must remain small inline chips');
  assert(measures.fonts.title>=22&&measures.fonts.card>=17&&
   measures.fonts.details>=14&&measures.fonts.counter>=22,
   'Readability cannot be sacrificed for density');
  assert(measures.horizontal<=6,'No horizontal overflow');
  assert.match(await work.innerText(),/no alertas ambientales ni incumplimientos comprobados/);
  await page.screenshot({path:out+'/desktop-'+width+'-full.png',fullPage:true,animations:'disabled'});
  await work.screenshot({path:out+'/desktop-'+width+'-work.png',animations:'disabled'});
  const item=work.locator('[data-attention-key=findings]');
  await item.click();
  await page.locator('.v2-page-intro h1').waitFor();
  assert.equal(await page.locator('.v2-page-intro h1').innerText(),'Auditorías');
  assert.deepEqual(errors,[],'Runtime errors');
  console.log(JSON.stringify({viewport:width,workHeight:Math.round(measures.height),
   cardHeights:measures.cards.map(c=>Math.round(c.height)),
   counterHeights:measures.summary.map(s=>Math.round(s.height)),fonts:measures.fonts}));
  await context.close();
 }
 console.log(JSON.stringify({result:'PASS',desktopOnly:true,fontsPreserved:true,
  categoriesPreserved:4,linksFunctional:true,screenshots:6}));
}finally{await browser.close();}
