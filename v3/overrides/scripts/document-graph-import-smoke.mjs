import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createDiablillosState} from '../src/lib/diablillosDemo.mjs';
import {prepareDocumentGraphExport} from '../src/features/traceability/document-graph-export.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const output='qa/ambienta-v363-import';
await fs.mkdir(output,{recursive:true});
const source=createDiablillosState();
const original=(await prepareDocumentGraphExport(source,'MED-DIAB-002')).json;
const altered=JSON.parse(original);altered.nodes.find(n=>n.kind==='evidence').data.status='validada';
const stale=createDiablillosState();stale.evidence[3].status='validada';
const old=(await prepareDocumentGraphExport(stale,'MED-DIAB-002')).json;
const unrelated=(await prepareDocumentGraphExport(source,'MED-DIAB-001')).json;
const base='http://127.0.0.1:8787/v3/index.html?caso=diablillos&perimetro=referencia-qa';
try{
 for(const [width,height] of [[1800,950],[1440,900],[1366,850]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'#/pga?medida=MED-DIAB-002');
  let panel=page.locator('[data-graph-import=MED-DIAB-002]');
  await panel.waitFor();
  const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
  const load=async(text,expected)=>{
   await panel.locator('[data-graph-import-input=true]').setInputFiles({
    name:'grafo-revision.json',mimeType:'application/json',buffer:Buffer.from(text)});
   await panel.locator('[data-graph-import-result='+expected+']').waitFor();
  };
  await load(original,'matching_snapshot');
  assert.match(await panel.innerText(),/Huella válida · Sin diferencias/);
  assert.match(await panel.innerText(),/6 registros · 6 vínculos/);
  const first=await panel.evaluate(el=>({
   scroll:document.documentElement.scrollWidth,viewport:window.innerWidth,
   title:parseFloat(getComputedStyle(el.querySelector('#ref-import-title')).fontSize),
   control:parseFloat(getComputedStyle(el.querySelector('.ref-import-picker')).fontSize)}));
  assert(first.scroll<=width+6&&first.title>=18&&first.control>=13,'Desktop readability');
  await panel.screenshot({path:output+'/matching-'+width+'.png',animations:'disabled'});
  await load(old,'documentary_differences');
  assert.match(await panel.innerText(),/Existen diferencias/);
  assert.match(await panel.innerText(),/evidence:EVID-D-004/);
  assert.match(await panel.innerText(),/status/);
  await panel.screenshot({path:output+'/differences-'+width+'.png',animations:'disabled'});
  await load(JSON.stringify(altered),'checksum_mismatch');
  assert.match(await panel.innerText(),/huella SHA-256 no coincide/i);
  await load(unrelated,'different_measure');
  assert.match(await panel.innerText(),/otra medida/i);
  await load('{','parse_error');
  await load(' '.repeat(1024*1024+1),'too_large');
  await page.locator('[data-select-measure="MED-DIAB-001"]').click();
  panel=page.locator('[data-graph-import=MED-DIAB-001]');
  await panel.waitFor();
  assert.equal(await panel.locator('[data-graph-import-result]').count(),0,
   'A change of selected measure must clear prior report');
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before,
   'File inspections must not write any browser storage');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(JSON.stringify({viewport:width,result:'PASS',checksum:true,drift:true,
   tamperingRejected:true,foreignMeasureRejected:true,readOnly:true}));
 }
 console.log(JSON.stringify({result:'PASS',desktopOnly:true,screenshots:6,
  supportedFiles:1,localRecordsUntouched:true}));
}finally{await browser.close();}
