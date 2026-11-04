import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const output='qa/ambienta-matrix-builder';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 for(const width of [1366,1800]){
  const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,reducedMotion:'reduce'});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/impactos');
  await page.locator('.v2-table').first().waitFor();
  assert.equal(await page.locator('[data-impact-matrix]').count(),0,
    'Impactos must be a documentary register, not the editing workbench');
  assert.equal(await page.getByText(/Este registro no calcula automáticamente la significancia ambiental/).count(),1,
    'Project Impactos explicitly distinguishes its documentary record from valuation');
  assert.equal(await page.locator('.v2-sidebar nav[aria-label="Herramientas"] a[href="#/matrices"]').count(),1,
    'The matrix constructor belongs in the Tools navigation');
  await page.locator('[data-open-matrix-tool]').click();
  assert.equal(new URL(page.url()).hash,'#/matrices');
  await page.locator('[data-impact-matrix="v1"]').waitFor();
  assert.equal(await page.locator('[data-page-role="environmental-matrices-tool"]').count(),1);
  const grid=page.locator('.amb-matrix-grid');
  assert.equal(await page.locator('[data-matrix-inline-builder]').count(),1,
   'Create rows/columns directly next to the grid');
  assert.equal(await page.locator('[data-matrix-canvas] [data-matrix-inspector]').count(),1,
   'Cell evaluation belongs alongside the matrix, not below it');
  assert.equal(await grid.locator('thead th').count(),5,'4 action examples plus factor header');
  const headingGeometry=await grid.evaluate(table=>{
   const header=table.querySelector('thead tr');
   const corner=table.querySelector('thead .amb-matrix-sticky');
   const label=table.querySelector('.amb-matrix-corner-label');
   if(!header||!corner||!label)throw Error('Missing compact matrix header');
   const h=header.getBoundingClientRect(),c=corner.getBoundingClientRect(),l=label.getBoundingClientRect();
   const range=document.createRange();
   range.selectNodeContents(label);
   const glyph=range.getBoundingClientRect();
   const glyphCenter=glyph.top+glyph.height/2;
   const cornerCenter=c.top+c.height/2;
   return {height:h.height,cornerCenter,labelCenter:l.top+l.height/2,
    glyphCenter,glyphHeight:glyph.height,glyphCenterError:Math.abs(cornerCenter-glyphCenter),
    labelDisplay:getComputedStyle(label).display,
    actions:table.querySelectorAll('.amb-matrix-column-head').length};
  });
  assert(headingGeometry.height<=88,
   'Column header must be compact; screenshot regression: '+JSON.stringify(headingGeometry));
  assert.equal(headingGeometry.labelDisplay,'grid',
   'Corner label must use CSS grid; generic thead th span rule previously forced display:block');
  assert(headingGeometry.glyphHeight>9,
   'Actual text glyph must be measurable, not just the empty wrapper');
  assert(headingGeometry.glyphCenterError<=5,
   'Actual text glyph must be visually centered within the header cell: '+JSON.stringify(headingGeometry));
  assert.equal(headingGeometry.actions,4,'All action labels keep an inline control row');
  await grid.locator('thead').screenshot({path:output+'/matrix-header-compact-'+width+'.png',
   animations:'disabled'});
  await page.screenshot({path:output+'/matrix-header-visual-context-'+width+'.png',
   animations:'disabled'});
  assert.equal(await grid.locator('tbody tr').count(),7,'7 factors, no fake evaluations');
  assert.equal(await page.locator('.amb-matrix-kpis>span').nth(1).locator('strong').innerText(),'0');
  assert.equal(await page.locator('.amb-matrix-cell--negative,.amb-matrix-cell--positive').count(),0);
  assert.equal(await page.locator('[data-page-role="environmental-matrices-tool"]').count(),1,
    'The evaluation workbench lives on its own tools page');
  assert.equal(await page.locator('[data-leopold-unified="true"]').count(),1,
   'One matrix must contain both identification and valuation');
  assert.equal(await page.locator('.amb-matrix-modes button').count(),0,
   'No separate identification versus Leopold view buttons');
  assert.equal(await page.locator('[data-leopold-summary]').count(),1,
   'Leopold summary must remain available from the same matrix');
  assert.equal(await page.locator('[data-matrix-leopold-empty]').count(),1,
   'Explain how to begin when there are no assessed cells');
  assert.equal(await page.locator('[data-matrix-weighted-report]').count(),0);
  await page.screenshot({path:output+'/matrix-unified-empty-'+width+'.png',animations:'disabled'});
  await page.locator('.amb-matrix-cell').first().click();
  assert.equal(await page.locator('[data-matrix-inspector]').isVisible(),true);
  await page.getByRole('button',{name:'− Adverso'}).click();
  assert.equal(await page.locator('.amb-matrix-cell--negative').count(),1);
  assert.equal((await page.locator('.amb-matrix-cell--negative').innerText()).trim(),'− · por valorar',
   'Identify sign without inventing either score');
  const nature=page.getByRole('combobox',{name:'Naturaleza de la interacción'});
  await nature.selectOption('-1');
  await page.getByRole('combobox',{name:'Magnitud del impacto'}).selectOption('7');
  assert.equal((await page.locator('.amb-matrix-cell--negative').innerText()).trim(),'−7/—',
   'Partial valuation is visible in the same cell');
  await page.getByRole('combobox',{name:'Importancia del impacto'}).selectOption('5');
  await page.getByPlaceholder('Describir relación causal, escenario, temporalidad e incertidumbre…').fill('Hipótesis de laboratorio, sin mediciones ni observaciones de campo.');
  await page.getByPlaceholder('Código, página, enlace o informe verificable…').fill('Fuente pendiente de verificación');
  assert.equal((await page.locator('.amb-matrix-cell--negative').innerText()).trim(),'−7/5');
  assert.equal(await page.locator('[data-matrix-leopold-ready]').count(),1);
  assert.equal(await page.locator('[data-leopold-total-negative]').innerText(),'1');
  assert.equal(await page.locator('[data-leopold-total-pending]').innerText(),'0');
  assert.equal(await page.locator('[data-impact-mode]').getAttribute('data-impact-mode'),'leopold');
  await page.locator('[data-leopold-unified-toolbar]').evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:output+'/matrix-unified-scored-'+width+'.png',animations:'disabled'});
  await page.locator('[data-matrix-optional] summary').click();
  assert.equal(await page.locator('[data-matrix-weighted-report]').count(),0);
  await page.locator('[data-matrix-weighted-toggle]').click();
  const weighted=page.locator('[data-matrix-weighted-report]');
  await weighted.waitFor();
  assert.match(await weighted.innerText(),/35\.00/);
  assert.match(await weighted.innerText(),/0\.00/);
  assert.equal((await page.locator('.amb-matrix-cell--negative').innerText()).trim(),'−7/5',
   'Optional weighting must never replace the Leopold values in the grid');
  await page.locator('[data-leopold-unified-toolbar]').evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:output+'/matrix-unified-weighting-report-'+width+'.png',animations:'disabled'});
  await weighted.getByRole('button',{name:'Cerrar análisis'}).click();
  assert.equal(await page.locator('[data-matrix-weighted-report]').count(),0);
  await page.locator('[data-leopold-diagonal-toggle]').check();
  assert.equal(await page.locator('.amb-leopold-diagonal').count(),1);
  await page.locator('[data-leopold-diagonal-toggle]').uncheck();
  assert.equal((await page.locator('.amb-matrix-cell--negative').innerText()).trim(),'−7/5');
  const before=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('ambienta-impact-matrix-v1:')));
  assert.equal(before.length,1,'Project scoped storage only');
  await page.reload();await page.locator('[data-impact-matrix]').waitFor();
  assert.equal(await page.locator('.amb-matrix-cell--negative').count(),1,'Draft must persist across reload');
  assert.equal(await page.locator('.amb-matrix-kpis>span').nth(2).locator('strong').innerText(),'1');

  await page.getByRole('button',{name:'Incorporar factores existentes del expediente'}).click();
  assert(await grid.locator('tbody tr').count()>=7,'Existing impact factors imported by name only');
  assert.equal(await page.locator('[data-matrix-inline-builder] [aria-label="Nombre de nueva acción"]').count(),1);
  await page.getByRole('textbox',{name:'Nombre de nueva acción'}).fill('Obra piloto de ejemplo');
  await page.getByRole('combobox',{name:'Etapa de nueva acción'}).selectOption('cierre');
  await page.getByRole('button',{name:'Acción',exact:true}).click();
  assert.equal(await grid.locator('thead th').last().locator('small').innerText(),'Cierre');
  assert.equal(await grid.locator('thead th').count(),6,'Add action');
  await page.getByRole('textbox',{name:'Nombre de nuevo factor'}).fill('Humedales de referencia');
  await page.getByRole('button',{name:'Factor',exact:true}).click();
  assert(await grid.getByRole('rowheader',{name:/Humedales de referencia/}).count()===1,'Add factor');
  await page.getByRole('button',{name:'Editar columna Obra piloto de ejemplo'}).click();
  const actionEditor=page.locator('[data-matrix-edit-action]');
  assert.equal(await actionEditor.count(),1);
  await actionEditor.getByRole('textbox',{name:'Editar nombre de acción en matriz'}).fill('Restauración de humedales');
  await actionEditor.getByRole('combobox',{name:'Editar etapa de acción en matriz'}).selectOption('operacion');
  await actionEditor.getByRole('button',{name:'Guardar cambios de acción'}).click();
  assert.equal(await grid.getByRole('columnheader',{name:/Restauración de humedales/}).count(),1);
  assert.equal(await grid.getByRole('columnheader',{name:/Operación.*Restauración de humedales/}).count(),1);
  await page.getByRole('button',{name:'Editar fila Humedales de referencia'}).click();
  const factorEditor=page.locator('[data-matrix-edit-factor]');
  await factorEditor.getByRole('textbox',{name:'Editar nombre de factor en matriz'}).fill('Humedales de altura');
  await factorEditor.getByRole('textbox',{name:'Editar grupo ambiental en matriz'}).fill('Medio biótico');
  await factorEditor.getByRole('spinbutton',{name:'Editar peso de factor en matriz'}).fill('1.5');
  await factorEditor.getByRole('button',{name:'Guardar cambios de factor'}).click();
  assert.equal(await grid.getByRole('rowheader',{name:/Humedales de altura/}).count(),1);
  assert.equal(await page.locator('.amb-matrix-cell--negative').count(),1,
   'Renaming axes by stable IDs must not delete an assessed cell');
  await page.screenshot({path:output+'/matrix-build-inline-'+width+'.png',animations:'disabled'});
  const [csvDownload]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'CSV',exact:true}).click()
  ]);
  assert(csvDownload.suggestedFilename().endsWith('.csv'));
  const csv=await fs.readFile(await csvDownload.path(),'utf8');
  assert(csv.includes('Hipótesis de laboratorio')&&csv.includes('Fuente pendiente de verificación'),'CSV preserves source and justification');
  const [jsonDownload]=await Promise.all([
    page.waitForEvent('download'),page.getByRole('button',{name:'JSON',exact:true}).click()
  ]);
  const imported=JSON.parse(await fs.readFile(await jsonDownload.path(),'utf8'));
  assert.equal(imported.schema,'ambienta.impact-matrix.v1');
  assert(imported.actions.some(x=>x.name==='Restauración de humedales'&&x.phase==='operacion'));
  assert(imported.factors.some(x=>x.name==='Humedales de altura'&&x.group==='Medio biótico'&&x.weight===1.5));
  assert.equal(Object.values(imported.cells).filter(c=>c.sign!==0).length,1);
  page.once('dialog',d=>{void d.accept();});
  await page.getByRole('button',{name:'Eliminar columna Restauración de humedales'}).click();
  assert.equal(await grid.locator('thead th').count(),5,'Column deletion only on explicit confirmation');
  page.once('dialog',d=>{void d.accept();});
  await page.getByRole('button',{name:'Eliminar fila Humedales de altura'}).click();
  assert.equal(await grid.getByRole('rowheader',{name:/Humedales de altura/}).count(),0);
  assert.equal(await page.locator('.amb-matrix-cell--negative').count(),1,
   'Deleting an unrelated new axis must retain the original evaluated interaction');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overflow<=6,'No page-wide horizontal overflow at width '+width+' ('+overflow+')');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',width,actions:imported.actions.length,factors:imported.factors.length,
    valued:1,workflow:'screening→Leopold→weighted→reload→add→CSV→JSON',
    originalExpedientePreserved:true,errors:0}));
  await ctx.close();
 }
} finally {await browser.close();}
