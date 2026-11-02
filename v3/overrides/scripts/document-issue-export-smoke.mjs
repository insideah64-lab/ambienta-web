import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createDiablillosState} from '../src/lib/diablillosDemo.mjs';
import {verifyDocumentIssueExport} from '../src/features/traceability/document-issue-export.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const out='qa/ambienta-v367-issues';
const storageKey='ambienta-v2-diablillos-2026-demo';
await fs.mkdir(out,{recursive:true});
try{
 for(const width of [1800,1440,1366]){
  const state=createDiablillosState();
  state.evidence[3].inspectionId='INSP-ORFANA';
  state.evidence.push({...state.evidence[4],reference:'DEMO:duplicado'});
  state.evidence[5].measureId=null;
  const original=JSON.stringify(state);
  const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
  await ctx.addInitScript(({key,value})=>localStorage.setItem(key,value),
   {key:storageKey,value:original});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/pga');
  const panel=page.locator('[data-link-audit="case"]');
  await panel.waitFor();
  const num=Number(await panel.getAttribute('data-link-audit-count'));
  assert(num>=3,'QA must expose multiple types of warning');
  await panel.locator('summary').click();
  const orphan=panel.locator('[data-audit-kind="missing_target"]').first();
  await orphan.waitFor();
  assert.match(await orphan.innerText(),/Origen: evidence/);
  assert.match(await orphan.innerText(),/inspectionId/);
  assert.match(await orphan.innerText(),/INSP-ORFANA/);
  const duplicate=panel.locator('[data-audit-kind="duplicate_id"]');
  await duplicate.waitFor();
  assert.match(await duplicate.innerText(),/EVID-D-005/);
  assert.equal(await duplicate.locator('a').count(),0);
  const promise=page.waitForEvent('download');
  await panel.locator('[data-issue-export="json"]').click();
  const download=await promise;
  assert.match(download.suggestedFilename(),/^ambienta-referencias-.*\.json$/);
  const file=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  assert.equal(file.summary.issuesFound,num);
  assert.equal(file.source.kind,'browser_local_demo_state');
  assert.equal(file.source.evidenceFilesIncluded,false);
  assert(await verifyDocumentIssueExport(file));
  const reportOrphan=file.issues.find(x=>x.origin.id==='EVID-D-004'&&x.code==='missing_target');
  assert.equal(reportOrphan.origin.field,'inspectionId');
  assert.equal(reportOrphan.reference,'INSP-ORFANA');
  const digest=await panel.locator('[data-issue-export-sha]').getAttribute('data-issue-export-sha');
  assert.equal(digest,file.integrity.report_sha256);
  const tampered=structuredClone(file);
  tampered.issues[0].origin.field='ALTERADO';
  assert.equal(await verifyDocumentIssueExport(tampered),false);
  await panel.screenshot({path:out+'/issue-report-'+width+'.png',animations:'disabled'});
  const preserved=await page.evaluate(key=>localStorage.getItem(key),storageKey);
  assert.equal(preserved,original,'Report download must not mutate the demo expediente');
  assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+6);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,result:'PASS',issues:num,hashVerified:true,
   tamperRejected:true,readOnly:true,screenshots:1}));
  await ctx.close();
 }
}finally{await browser.close()}
