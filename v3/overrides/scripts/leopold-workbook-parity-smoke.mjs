import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

/** Values transcribed from the user's didactic tunnel matrix workbook,
 * Matriz-de-Leopold.xlsx, worksheet B, 2026-11-02.
 * No workbook binary/video is published and no Diablillos data is implied.
 */
const factorNames=[
 'Calidad del agua','Calidad del aire (gases, partículas)','Erosión',
 'Estabilidad de taludes (deslizamientos)','Microflora',
 'Animales terrestres, incluyendo reptiles','Diseño del paisaje',
 'Condiciones físicas únicas','Empleo','Red de transporte'
];
const actionNames=[
 'Estudios de factibilidad','Perforaciones','Revestimiento','Movilidad','Mantenimiento'
];
const magnitudes=[
 [-1,-5,-7,-2,-3],[-1,-9,-7,-4,-6],[-1,-5,2,-1,-1],[1,-5,2,-1,-1],
 [-1,-2,-3,-1,-3],[-1,-2,-4,-3,-3],[1,-5,2,1,-2],[1,-7,3,1,-1],
 [4,5,5,7,3],[1,3,3,7,-2]
];
const importance=[
 [2,1,2,1,2],[2,2,2,3,1],[2,2,2,1,1],[2,2,2,1,1],
 [1,1,2,1,1],[2,1,1,3,1],[1,1,2,1,1],[1,3,1,1,1],
 [1,5,5,6,1],[1,2,2,6,1]
];
const expectedByFactor=[-29,-52,-10,-6,-13,-20,-1,-17,99,53];
const expectedByAction=[0,-42,8,60,-22];
const source='Matriz-de-Leopold.xlsx · hoja B · ejercicio de túnel ≤500 m';
/* Verify copied workbook fixture independently of the React application.
 * A transcription error must not become an apparent engine defect. */
assert.deepEqual(magnitudes.map((row,i)=>
 row.reduce((total,m,j)=>total+m*importance[i][j],0)),expectedByFactor,
 'Numeric fixture rows must reproduce worksheet B before opening Chromium');
assert.deepEqual(actionNames.map((_,j)=>
 magnitudes.reduce((total,row,i)=>total+row[j]*importance[i][j],0)),expectedByAction,
 'Numeric fixture columns must reproduce worksheet B before opening Chromium');
assert.equal(expectedByFactor.reduce((a,b)=>a+b,0),4);
assert.equal(magnitudes.flat().filter(x=>x>0).length,18);
assert.equal(magnitudes.flat().filter(x=>x<0).length,32);

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const out='qa/ambienta-leopold-parity';
await fs.mkdir(out,{recursive:true});
try{
 for(const width of [1366,1800]){
  const ctx=await browser.newContext({
   viewport:{width,height:900},acceptDownloads:true,reducedMotion:'reduce'});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto((process.env.QA_BASE_URL||'http://127.0.0.1:8787/v3/')+'index.html#/matrices');
  await page.locator('[data-impact-matrix="v1"]').waitFor();
  const projectId=(await page.locator('[data-impact-matrix] .amb-matrix-footer span').first().innerText())
    .split('·').at(-1)?.trim();
  assert(projectId,'Need project-specific, not shared, workbook fixture key');
  const actions=actionNames.map((name,i)=>({
   id:'tunnel-a'+i,name,phase:i===0?'preparacion':i<3?'construccion':'operacion'
  }));
  const groups=['Agua','Atmósfera','Procesos','Procesos','Flora','Fauna',
   'Interés estético y humano','Interés estético y humano','Aspectos culturales',
   'Facilidades y actividades humanas'];
  const factors=factorNames.map((name,i)=>({
   id:'tunnel-f'+i,name,group:groups[i],weight:1
  }));
  const cells={};
  let positive=0,negative=0;
  for(let i=0;i<10;i++)for(let j=0;j<5;j++){
   const m=magnitudes[i][j],imp=importance[i][j];
   cells['tunnel-f'+i+'::tunnel-a'+j]={
    sign:m>0?1:-1,magnitude:Math.abs(m),importance:imp,
    reason:'EJERCICIO de túneles; no es un dato ambiental de Diablillos.',evidence:source
   };
   if(m>0)positive++;else negative++;
  }
  const draft={
   schema:'ambienta.impact-matrix.v1',projectId,
   projectName:'EJERCICIO - Túnel categoría III · no es Diablillos',
   updatedAt:new Date().toISOString(),actions,factors,cells
  };
  await page.evaluate(({projectId,draft})=>
    localStorage.setItem('ambienta-impact-matrix-v1:'+projectId,JSON.stringify(draft)),
    {projectId,draft});
  await page.reload();await page.locator('[data-impact-matrix="v1"]').waitFor();
  assert.equal(await page.locator('[data-leopold-unified="true"]').count(),1,
   'Workbook must load directly in the unified Leopold editor');
  const panel=page.locator('[data-leopold-summary]');
  await panel.waitFor();
  assert.equal(await panel.locator('[data-leopold-total-positive]').innerText(),'18');
  assert.equal(await panel.locator('[data-leopold-total-negative]').innerText(),'32');
  assert.equal(await panel.locator('[data-leopold-total-pending]').innerText(),'0');
  assert.equal(await panel.locator('[data-leopold-total-unassessed]').innerText(),'0');
  assert.equal(await panel.locator('[data-leopold-total-sum]').innerText(),'4');
  for(let i=0;i<10;i++){
   const row=panel.locator('[data-leopold-axis="factor"]').nth(i);
   assert.equal((await row.locator('[data-leopold-sum]').innerText()).trim(),
    String(expectedByFactor[i]),'Workbook row '+factorNames[i]);
  }
  for(let i=0;i<5;i++){
   const row=panel.locator('[data-leopold-axis="action"]').nth(i);
   assert.equal((await row.locator('[data-leopold-sum]').innerText()).trim(),
    String(expectedByAction[i]),'Workbook column '+actionNames[i]);
  }
  const auxiliaryBenefits=magnitudes.reduce((sum,row,i)=>sum+
   row.reduce((v,m,j)=>v+(m>0?m*importance[i][j]:0),0),0);
  const auxiliaryAdverse=magnitudes.reduce((sum,row,i)=>sum+
   row.reduce((v,m,j)=>v+(m<0?-m*importance[i][j]:0),0),0);
  assert.equal(auxiliaryBenefits-auxiliaryAdverse,4);
  assert.equal(Number(await panel.locator('[data-leopold-positive-products]').innerText()),auxiliaryBenefits);
  assert.equal(Number(await panel.locator('[data-leopold-negative-products]').innerText()),auxiliaryAdverse);
  assert.match(await panel.innerText(),/adaptación didáctica|planilla didáctica/);
  await page.screenshot({path:out+'/leopold-parity-'+width+'.png',animations:'disabled'});
  await page.locator('[data-leopold-diagonal-toggle]').check();
  const first=page.locator('.amb-matrix-grid .amb-matrix-cell').first();
  assert.equal(await first.locator('.amb-leopold-diagonal span').nth(0).innerText(),'−1');
  assert.equal(await first.locator('.amb-leopold-diagonal span').nth(1).innerText(),'2');
  await page.screenshot({path:out+'/leopold-diagonal-'+width+'.png',animations:'disabled'});
  const [dl]=await Promise.all([
   page.waitForEvent('download'),panel.locator('[data-leopold-export="csv"]').click()
  ]);
  const csv=await fs.readFile(await dl.path(),'utf8');
  assert(csv.includes('Calidad del agua')&&csv.includes('Estudios de factibilidad'));
  assert(csv.includes('"-29"')&&csv.includes('"-52"')&&csv.includes('"99"'));
  assert(csv.includes('"-42"')&&csv.includes('"60"')&&csv.includes('"-22"'));
  const initial=await page.locator('[data-leopold-total-sum]').innerText();
  assert.equal(initial,'4');
  // Partial interactions must not become numeric zero or be counted as evaluated.
  await first.click();
  await page.getByRole('combobox',{name:'Importancia del impacto'}).selectOption('');
  assert.equal(await page.locator('[data-leopold-total-pending]').innerText(),'1');
  assert.equal(await page.locator('[data-leopold-total-unassessed]').innerText(),'0');
  assert.equal(await page.locator('[data-leopold-total-negative]').innerText(),'31');
  assert.equal(await page.locator('[data-leopold-total-sum]').innerText(),'6',
   'Original signed −2 excluded when importance becomes pending');
  // Adding a row with no evaluations, then filtering it visually,
  // must not change ANY action's totals or completeness counts.
  await page.getByRole('textbox',{name:'Nombre de nuevo factor'}).fill('Factor sin evaluar');
  await page.getByRole('button',{name:'Factor',exact:true}).click();
  assert.equal(await panel.locator('[data-leopold-total-unassessed]').innerText(),'5');
  const firstAction=panel.locator('[data-leopold-axis="action"]').first();
  const beforeFilter={
   sum:await firstAction.locator('[data-leopold-sum]').innerText(),
   unassessed:await firstAction.locator('[data-leopold-unassessed]').innerText()
  };
  assert.equal(beforeFilter.unassessed,'1');
  await page.getByRole('checkbox',{name:'Solo factores con interacciones'}).check();
  assert.equal(await firstAction.locator('[data-leopold-unassessed]').innerText(),beforeFilter.unassessed);
  assert.equal(await firstAction.locator('[data-leopold-sum]').innerText(),beforeFilter.sum);
  assert.equal(await panel.locator('[data-leopold-total-unassessed]').innerText(),'5');
  assert.match(await panel.locator('.amb-leopold-filter-note').innerText(),/ambas tablas/i);
  await page.getByRole('textbox',{name:'Nombre de nueva acción'}).fill('MOVILIDAD');
  await page.getByRole('button',{name:'Acción',exact:true}).click();
  assert.match(await panel.locator('[data-leopold-possible-duplicates]').innerText(),/Movilidad/i);
  // QA4: visual review does not change the 50 workbook scores or persistent draft.
  const review=page.locator('[data-leopold-review]');
  await review.waitFor();
  const beforeReview=await page.evaluate(id=>localStorage.getItem('ambienta-impact-matrix-v1:'+id),projectId);
  assert.equal(Number(await review.locator('[data-leopold-review-count]').innerText())>0,true,
   'The tunnel workbook contains at least one high scoring interaction at default exploratory criteria');
  await review.locator('[data-leopold-review-magnitude]').selectOption('10');
  await review.locator('[data-leopold-review-importance]').selectOption('10');
  assert.equal(await review.locator('[data-leopold-review-count]').innerText(),'0');
  assert.match(await review.innerText(),/no significa que el proyecto carezca/i);
  await review.locator('[data-leopold-review-magnitude]').selectOption('1');
  await review.locator('[data-leopold-review-importance]').selectOption('1');
  assert.equal(await review.locator('[data-leopold-review-count]').innerText(),'49',
   'A pending cell must not appear in the 49 remaining scored workbook interactions');
  await review.locator('[data-leopold-review-logic]').selectOption('both');
  assert.equal(await review.locator('[data-leopold-review-count]').innerText(),'49');
  const afterReview=await page.evaluate(id=>localStorage.getItem('ambienta-impact-matrix-v1:'+id),projectId);
  assert.equal(afterReview,beforeReview,'Changing review criteria must never rewrite a draft');
  const openReview=review.locator('[data-leopold-review-open]').first();
  await openReview.click();
  assert.equal(await page.locator('[data-matrix-inspector] .amb-matrix-inspector-head').count(),1,
   'Review button opens the existing cell inspector');
  await page.screenshot({path:out+'/leopold-review-qa4-'+width+'.png',animations:'disabled'});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overflow<=6,'No page horizontal overflow at '+width+': '+overflow);
  assert.deepEqual(errors,[],'No browser errors');
  console.log(JSON.stringify({result:'PASS',viewport:width,source,interactions:50,
   factors:10,actions:5,positive,negative,
   byFactor:expectedByFactor,byAction:expectedByAction,aggregate:4,
   partialCellExcluded:true,diagonal:true,csv:true,errors:0}));
  await ctx.close();
 }
}finally{await browser.close();}
