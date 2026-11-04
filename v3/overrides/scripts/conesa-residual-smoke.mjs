import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

// Residual draft belongs to the retired simplified engine. Verify exact archival
// recovery instead of mounting another editable Conesa underneath the main one.
const out='qa/ambienta-conesa-residual';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,reducedMotion:'reduce'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/matrices');
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  await page.locator('[data-conesa-book]').waitFor();
  assert.equal(await page.locator('[data-conesa-residual]').count(),0,
   'Previous residual editor is not a second editable Conesa method');
  const projectId=(await page.locator('[data-conesa-book] .amb-matrix-footer span').first().innerText())
    .split('·').at(-1)?.trim();
  assert(projectId);
  const residualKey='ambienta-conesa-residual-v1:'+projectId;
  const initialKey='ambienta-conesa-simplificado-v1:'+projectId;
  const initial={sign:-1,criteria:{
   IN:2,EX:2,EX_CR:0,MO:4,MO_CR:0,PE:4,RV:1,SI:1,AC:1,EF:4,PR:1,MC:2},
   reason:'Ejercicio histórico',evidence:'DOC-I-01'};
  const stored={
   schema:'ambienta.conesa-residual.v1',projectId,method:'conesa-simplificado-residual-v1',
   updatedAt:'2026-11-03T00:00:00Z',entries:{'demo-f4::demo-a1':{
    initialFingerprint:'[-1,2,2,0,4,0,4,1,1,1,4,1,2]',
    outcome:'persiste',
    residual:{sign:-1,criteria:{IN:1,EX:1,EX_CR:0,MO:1,MO_CR:0,PE:1,RV:1,SI:1,AC:1,EF:1,PR:1,MC:1},
     reason:'Mitigación hipotética',evidence:'EVID-RES-01'},
    impactId:'IMP-D-AGU',impactLinkReason:'Vínculo documentado',
    measure:{hierarchy:'minimizar',description:'Medida histórica',reference:'PGA-M-01',pgaRef:'PGA-M01',
     pgaMeasureId:'MED-DIAB-001',responsible:'Equipo',indicator:'Partículas',
     frequency:'Mensual',uncertainty:'alta',quality:'declarada',
     assumptions:'Ensayo',execution:'prevista'}
   }}
  };
  await page.evaluate(({initialKey,residualKey,projectId,initial,stored})=>{
   localStorage.setItem(initialKey,JSON.stringify({
    schema:'ambienta.conesa-simplificado.v1',projectId,projectName:'ARCHIVO HISTÓRICO',
    updatedAt:'2026-11-03T00:00:00Z',entries:{'demo-f4::demo-a1':initial}
   }));
   localStorage.setItem(residualKey,JSON.stringify(stored));
  },{initialKey,residualKey,projectId,initial,stored});
  const before=await page.evaluate(({initialKey,residualKey})=>[
   localStorage.getItem(initialKey),localStorage.getItem(residualKey)
  ],{initialKey,residualKey});
  await page.reload();
  await page.locator('[data-catalog-method="conesa-simplificado-tutorial-v1"] button').click();
  const archive=page.locator('[data-conesa-residual-archive]');
  await archive.waitFor();
  assert.equal(await page.locator('[data-conesa-book]').count(),1);
  assert.equal(await page.locator('[data-conesa-residual]').count(),0);
  assert.equal(await page.locator('[data-conesa-simplificado]').count(),0);
  const [download]=await Promise.all([page.waitForEvent('download'),
   archive.getByRole('button',{name:'Exportar archivo residual original'}).click()]);
  const body=await fs.readFile(await download.path(),'utf8');
  assert.equal(body,before[1],'Residual archive must be exported byte for byte');
  assert(body.includes('IMP-D-AGU')&&body.includes('EVID-RES-01')&&body.includes('MED-DIAB-001'));
  await page.locator('[data-conesa-simplified-archive]').getByRole('button',
   {name:'Consultar y exportar archivo simplificado'}).click();
  const old=page.locator('[data-conesa-simplified-archive] [data-conesa-simplificado]');
  await old.waitFor();
  await old.locator('[data-conesa-cell]').last().click();
  assert.equal(await old.getByRole('combobox',{name:'Conesa IN'}).isDisabled(),true);
  assert.deepEqual(await page.evaluate(({initialKey,residualKey})=>[
   localStorage.getItem(initialKey),localStorage.getItem(residualKey)
  ],{initialKey,residualKey}),before,'Opening history must not rewrite original or residual');
  await page.screenshot({path:out+'/conesa-residual-archivo-'+width+'.png',animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',width,oldResidualRecoverable:true,
   noCompetingEditor:true,pgaLinksPreserved:true,errors:0}));
  await ctx.close();
 }
}finally{await browser.close()}
