import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const out='qa/ambienta-v364-link-audit';
await fs.mkdir(out,{recursive:true});
try{
 for(const [width,height] of [[1800,950],[1440,900],[1366,850]]){
  const ctx=await browser.newContext({viewport:{width,height}});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/pga');
  const audit=page.locator('[data-link-audit="case"]');
  await audit.waitFor();
  assert.equal(await audit.getAttribute('data-link-audit-count'),'0');
  const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
  await audit.locator('summary').click();
  assert.match(await audit.innerText(),/No se detectaron referencias rotas/i);
  assert.match(await audit.innerText(),/no implica evidencia auténtica/i);
  assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+6);
  await audit.screenshot({path:out+'/link-audit-'+width+'.png',animations:'disabled'});
  await page.reload();
  await page.locator('[data-link-audit="case"]').waitFor();
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before);
  assert.deepEqual(errors,[]);
  await ctx.close();
 }
 console.log(JSON.stringify({result:'PASS',desktopOnly:true,viewports:[1800,1440,1366],readOnly:true,screenshots:3}));
}finally{await browser.close();}
