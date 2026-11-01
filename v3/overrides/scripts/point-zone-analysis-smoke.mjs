import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/area');
 for(const [name,value] of [['Latitud de consulta','-24.70'],['Longitud de consulta','-67.20'],['Distancia de consulta','5']])
  await page.getByRole('textbox',{name}).fill(value);
 await page.locator('[data-aoi-active=true]').waitFor();
 await page.getByRole('button',{name:'Crear polígono sintético y 4 áreas'}).click();
 await page.locator('[data-study-areas-ready=true]').waitFor();
 assert.equal(await page.locator('[data-point-zone-panel=true]').count(),0);
 const bbox=await page.evaluate(()=>JSON.parse(localStorage.getItem('ambienta-aoi-diablillos-v3')).bbox);
 const xy=(x,y)=>[Number((bbox[0]+(bbox[2]-bbox[0])*x).toFixed(9)),
   Number((bbox[1]+(bbox[3]-bbox[1])*y).toFixed(9))];
 const p=(n,x,y)=>({type:'Feature',properties:{name:n},geometry:{type:'Point',coordinates:xy(x,y)}});
 const features=[
  {type:'Feature',properties:{name:'Doble'} ,geometry:{type:'MultiPoint',coordinates:[xy(.26,.5),xy(.36,.5)]}},
  p('C',.55,.5),p('D',.85,.5),p('Hueco',.18,.36),p('Muesca',.65,.82),
  p('Fuera',.02,.5),p('Exterior',.08,.5),p('Divisor',.29,.5),p('Borde hueco',.15,.35)
 ];
 const raw=JSON.stringify({type:'FeatureCollection',features});
 const sha=createHash('sha256').update(raw).digest('hex');
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 const gis=page.locator('[data-page-role=gis-analysis]');await gis.waitFor();
 assert.equal(await gis.locator('[data-study-area-panel]').count(),0);
 await gis.getByRole('textbox',{name:'Procedencia o descripción'}).fill('Puntos ficticios de ensayo SIG');
 await gis.getByLabel('Importar GeoJSON').setInputFiles({
  name:'puntos-demo.geojson',mimeType:'application/geo+json',buffer:Buffer.from(raw)});
 await gis.locator('[data-point-context=ready]').waitFor();
 const before=await page.evaluate(()=>localStorage.getItem('ambienta-gis-diablillos-working-v3'));
 await gis.getByRole('button',{name:'Analizar puntos contra las subáreas'}).click();
 const result=gis.locator('[data-point-analysis-ready=true]');await result.waitFor();
 for(const [key,n] of [['total','10'],['inside','4'],['outside','3'],['review','3']])
  assert.equal(await result.locator('[data-point-'+key+'=true]').innerText(),n);
 await gis.locator('[data-map-point-analysis=active]').waitFor();
 assert.equal(await result.locator('[data-point-status=review_boundary]').count(),3);
 const download=page.waitForEvent('download');
 await gis.getByRole('button',{name:'Exportar resultado JSON'}).click();
 const report=JSON.parse(fs.readFileSync(await (await download).path(),'utf8'));
 assert.equal(report.provenance.inputSha256,sha);
 assert.equal(report.summary.insideCount,4);
 assert.deepEqual(report.summary.perZone.map(z=>z.count),[1,1,1,1]);
 assert.equal(report.provenance.sourceOfficiallyVerified,false);
 assert.equal(report.points[0].ref,'F1:P1');
 assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-gis-diablillos-working-v3')),before);
 await page.getByRole('link',{name:'Área de estudio',exact:true}).click();
 await page.getByRole('textbox',{name:'Distancia de consulta'}).fill('7');
 await page.locator('[data-aoi-active=true]').waitFor();
 await page.getByRole('link',{name:'Mapas y SIG',exact:true}).click();
 await gis.locator('[data-point-context=missing]').waitFor();
 assert.equal(await gis.locator('[data-map-point-analysis=active]').count(),0);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',total:10,inside:4,outside:3,review:3,sourceUnchanged:true,staleScenarioBlocked:true,jsErrors:0}));
}finally{await browser.close();}
