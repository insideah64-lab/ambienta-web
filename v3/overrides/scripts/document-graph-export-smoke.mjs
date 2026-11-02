import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {verifyDocumentGraphExport} from '../src/features/traceability/document-graph-export.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const dir='qa/ambienta-v362-export';
await fs.mkdir(dir,{recursive:true});
const url='http://127.0.0.1:8787/v3/index.html?caso=diablillos&perimetro=referencia-qa';
try{
 for(const [width,height] of [[1800,950],[1440,900],[1366,850]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,acceptDownloads:true});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url+'#/pga?medida=MED-DIAB-002');
  const panel=page.locator('[data-measure-trace="MED-DIAB-002"]');
  await panel.waitFor();
  const initialStorage=await page.evaluate(()=>JSON.stringify({...localStorage}));
  assert.match(await panel.locator('[data-export-graph-info]').innerText(),/6 registros y 6 vínculos/);
  assert.match(await panel.locator('[data-export-graph-info]').innerText(),/SHA-256/);
  const button=panel.locator('[data-export-graph="MED-DIAB-002"]');
  const dlPromise=page.waitForEvent('download');
  await button.click();
  const download=await dlPromise;
  assert.equal(download.suggestedFilename(),'ambienta-trazabilidad-MED-DIAB-002.json');
  const payload=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  assert.equal(await verifyDocumentGraphExport(payload),true);
  assert.equal(payload.nodeCount,6);assert.equal(payload.edgeCount,6);
  assert.equal(payload.nodes.find(n=>n.kind==='evidence').data.status,'pendiente');
  assert.equal(payload.source.evidenceFilesIncluded,false);
  assert.equal(payload.source.externalSourcesIndependentlyVerified,false);
  assert(payload.edges.every(e=>e.kind==='direct'));
  assert.deepEqual(payload.warnings,[]);
  const hash=await panel.locator('[data-export-graph-hash]').innerText();
  assert.equal(hash,payload.integrity.graph_sha256);
  const dimensions=await panel.evaluate(el=>({
   viewport:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,
   buttonFont:parseFloat(getComputedStyle(el.querySelector('[data-export-graph]')).fontSize)
  }));
  assert(dimensions.scrollWidth<=width+6);
  assert(dimensions.buttonFont>=13);
  await panel.screenshot({path:dir+'/graph-'+width+'.png',animations:'disabled'});
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),initialStorage);
  await page.reload();await page.locator('[data-measure-trace="MED-DIAB-002"]').waitFor();
  await page.locator('[data-select-measure="MED-DIAB-001"]').click();
  await page.locator('[data-measure-trace="MED-DIAB-001"]').waitFor();
  assert.match(await page.locator('[data-export-graph-info]').innerText(),/6 registros y 8 vínculos/);
  const d2=page.waitForEvent('download');
  await page.locator('[data-export-graph="MED-DIAB-001"]').click();
  const second=await d2;
  const secondData=JSON.parse(await fs.readFile(await second.path(),'utf8'));
  assert.equal(await verifyDocumentGraphExport(secondData),true);
  assert.equal(secondData.measureId,'MED-DIAB-001');
  assert.equal(secondData.edgeCount,8);
  assert.deepEqual(errors,[]);
  await ctx.close();
  console.log(JSON.stringify({viewport:width,result:'PASS',download:true,sha256:true,noMutation:true}));
 }
 console.log(JSON.stringify({result:'PASS',desktopOnly:true,scopedGraph:true,
  immutableData:true,verifiedSHA:true,screenshots:3}));
}finally{await browser.close();}
