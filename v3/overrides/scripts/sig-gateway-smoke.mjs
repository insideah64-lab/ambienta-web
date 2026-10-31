import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
 const problems=[];page.on('pageerror',e=>problems.push(String(e)));
 // Preview runs at localhost, while Edge intentionally allows only the production
 // github.io Origin. Relay only the fixed real Edge endpoint from Node and translate
 // CORS headers for this local browser QA; production CORS is tested separately.
 await page.route('https://rqzeejnhszbbohaqdpgp.supabase.co/functions/v1/ambienta-sig-v31',async route=>{
  const req=route.request();
  const cors={'access-control-allow-origin':'http://127.0.0.1:8787',
   'access-control-allow-methods':'POST, OPTIONS',
   'access-control-allow-headers':'authorization,apikey,content-type,x-client-info'};
  if(req.method()==='OPTIONS'){
   await route.fulfill({status:204,headers:cors,body:''});return;
  }
  const response=await fetch(req.url(),{method:req.method(),headers:{...req.headers(),
   origin:'https://insideah64-lab.github.io'},body:req.postData()||undefined,
   signal:AbortSignal.timeout(17000)});
  await route.fulfill({status:response.status,headers:{...cors,'content-type':'application/json'},
   body:await response.text()});
 });
 await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/area');
 await page.getByRole('textbox',{name:'Latitud de consulta'}).fill('-25.038755786');
 await page.getByRole('textbox',{name:'Longitud de consulta'}).fill('-66.202620089');
 await page.getByRole('textbox',{name:'Distancia de consulta'}).fill('2');
 await page.locator('[data-aoi-active="true"]').waitFor();
 await page.locator('[data-sig-gateway="configured"]').waitFor();
 const btn=page.getByRole('button',{name:'Consultar y recortar municipios automáticamente'});
 assert(await btn.isEnabled(),'Gateway action should be available');
 await btn.click();
 try{await page.locator('[data-idesa-source="official-wfs"]').waitFor({timeout:25000});}
 catch(error){console.log('Gateway UI alert:',await page.getByRole('alert').allInnerTexts());
  console.log('Page errors:',problems);throw error;}
 await page.locator('[data-aoi-clip="clipped_local"]').waitFor({timeout:8000});
 const srcText=await page.locator('[data-idesa-source]').innerText();
 assert(srcText.includes('IDESA Salta'));
 assert(srcText.includes('NO perímetro'));
 const details=await page.locator('[data-geojson-loaded]').innerText();
 assert.match(details,/SHA-256/i);
 assert.match(details,/[a-f0-9]{64}/);
 const d1=page.waitForEvent('download');
 await page.getByRole('button',{name:'Descargar recorte GeoJSON'}).click();
 const download=await d1;
 const output=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
 assert.equal(output.properties.ambientaClip.hashScope,'raw_upstream_wfs_response');
 assert(output.features.length>=1);
 assert(output.features.every(f=>['Polygon','MultiPolygon'].includes(f.geometry.type)));
 const d2=page.waitForEvent('download');
 await page.getByRole('button',{name:'Exportar GeoJSON depurado'}).click();
 const raw=JSON.parse(fs.readFileSync(await (await d2).path(),'utf8'));
 assert(raw.features.length>=output.features.length);
 assert(raw.features.length>0);
 await page.reload();
 await page.locator('[data-idesa-source="official-wfs"]').waitFor({timeout:10000});
 assert.equal(await page.evaluate(()=>localStorage.getItem('ambienta-gis-diablillos-working-v1')),null);
 assert.equal(problems.length,0,'No browser JavaScript exceptions');
 console.log(JSON.stringify({result:'PASS',workflow:'one-click IDESA via Supabase Edge',sourceCount:raw.features.length,
  selectedCount:output.features.length,originalUncut:true,sourceShaSaved:true,clientErrors:problems.length}));
}finally{await browser.close();}
