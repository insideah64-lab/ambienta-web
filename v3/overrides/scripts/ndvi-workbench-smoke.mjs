import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {chromium} from 'playwright';
import {mitaFixture,tiffFixture} from '../../../tests/fixtures/mita-fixture.mjs';
import {createServer} from 'node:http';
import {buildPerimeterRecord,perimeterKey} from '../src/features/maps/perimeter-source.mjs';
import {DIABLILLOS_QA_GEOJSON} from '../src/features/maps/diablillos-reference-qa.mjs';
const out='qa/ambienta-ndvi';await fs.mkdir(out,{recursive:true});const base=process.env.QA_BASE_URL||'http://127.0.0.1:8787/v3/';
const bytes=tiffFixture(),raw=JSON.stringify(mitaFixture(createHash('sha256').update(bytes).digest('hex'))),png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1cAAAAASUVORK5CYII=','base64');
const browser=await chromium.launch({headless:true}),results=[],servers=[];
try{for(const width of [1366,1800])for(const project of ['DEMO-001','DIAB-2026-DEMO']){
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let job=null,submits=0,polls=0,lastQuery=null;
 // Native HTTP fixtures exercise actual Chromium downloads, not intercepted responses.
 const server=createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://localhost'),p=u.pathname.replace('/api/mita',''),method=req.method;let data;
  if(!u.pathname.startsWith('/api/mita/')){
   const root=path.resolve('dist'),file=path.resolve(root,'.'+u.pathname);
   if(!file.startsWith(root+path.sep))throw Error('Invalid static fixture path');
   let content=await fs.readFile(file);const ext=path.extname(file);
   if(ext==='.html')content=Buffer.from(content.toString('utf8').replace('</head>','<meta name="ambienta-ndvi-service" content="local-v1"></head>'));
   res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'}[ext]||'application/octet-stream'});res.end(content);return;
  }
  if(p==='/health')data={mode:'local-only',indices:['ndvi']};
  else if(p==='/scenes/search'){const chunks=[];for await(const chunk of req)chunks.push(chunk);lastQuery=JSON.parse(Buffer.concat(chunks));data={searchId:'c'.repeat(32),partial:true,message:'QA sintético: primera página no exhaustiva.',scenes:[{id:'QA_SYNTHETIC',date:'2025-05-29T00:00:00Z',cloud:3,ready:true,coversWindow:true}]};}
  else if(p==='/jobs'&&method==='POST'){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const b=JSON.parse(Buffer.concat(chunks));assert.equal(b.project,project);submits++;await new Promise(r=>setTimeout(r,150));
   job={id:(submits===1?'a':'b').repeat(32),project,status:'queued',phase:'queued',created:'2026-11-05T00:00:00Z',updated:'2026-11-05T00:00:00Z',error:null,cancelRequested:false,sceneId:'QA_SYNTHETIC',bbox:lastQuery.bbox,query:{start:lastQuery.start,end:lastQuery.end,maxCloud:lastQuery.max_cloud,...(lastQuery.geometry?{geometry:lastQuery.geometry}:{})},index:'ndvi',mode:'local-only'};data=job;
  }else if(p==='/jobs'){
   assert.equal(u.searchParams.get('project'),project);if(job&&++polls>1)job={...job,status:'succeeded',phase:'completed'};data={jobs:job?[job]:[]};
  }else if(/^\/jobs\/[a-f0-9]{32}$/.test(p))data=job;
  else if(p.endsWith('/summary'))data={sceneId:'QA_SYNTHETIC',acquiredAt:'2025-05-29T00:00:00Z',min:.2,mean:.5,max:.8,validPixels:4,rasterPixels:4,windowPixels:4,validFraction:1,crs:'EPSG:4326',width:2,height:2,legend:[{value:-1,color:'#654321d0'},{value:1,color:'#123456d0'}]};
  else if(p.endsWith('/files/preview')){res.writeHead(200,{'content-type':'image/png'});res.end(png);return;}
  else if(p.endsWith('/files/raster')){res.writeHead(200,{'content-type':'image/tiff','content-length':bytes.length,'content-disposition':'attachment; filename="qa.tif"'});res.end(bytes);return;}
  else if(p.endsWith('/files/report')){res.writeHead(200,{'content-type':'application/json','content-length':Buffer.byteLength(raw),'content-disposition':'attachment; filename="qa.json"'});res.end(raw);return;}
  else throw Error('Unexpected API request '+p);
  res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(data));
 }catch(e){res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({detail:e.message}));}});
 servers.push(server);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 await page.goto('http://127.0.0.1:'+server.address().port+'/v3/index.html'+(project==='DIAB-2026-DEMO'?'?caso=diablillos':'')+'#/mita');const p=page.locator('[data-ndvi-workbench]');await p.getByText('Servicio local disponible',{exact:true}).waitFor();
 const before=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 await p.locator('[data-ndvi-search]').click();await page.waitForFunction(()=>document.querySelector('[data-ndvi-message]')?.textContent.includes('ventana válida'));assert.equal(submits,0);
 await p.getByRole('button',{name:'Cargar área piloto de Salta',exact:true}).click();await p.locator('[data-ndvi-search]').click();await p.getByRole('radio').check();await p.locator('[data-ndvi-submit]').dblclick();
 await p.locator('[data-ndvi-job-status]').filter({hasText:'Completado'}).waitFor({timeout:15000});assert.equal(submits,1);await page.waitForFunction(()=>document.querySelector('[data-ndvi-preview]')?.naturalWidth>0);
 for(const [label,ext] of [['Descargar GeoTIFF','tif'],['Descargar informe JSON','json']]){const e=page.waitForEvent('download');await p.getByRole('link',{name:label,exact:true}).click();const d=await e;try{await d.saveAs(path.join(out,project+'-'+width+'-qa.'+ext));}catch(error){console.error('Download failure',d.url(),await d.failure());throw error;}}
 const report=JSON.parse(await fs.readFile(path.join(out,project+'-'+width+'-qa.json'),'utf8'));assert.equal(report.output_sha256,createHash('sha256').update(await fs.readFile(path.join(out,project+'-'+width+'-qa.tif'))).digest('hex'));
 const link=page.url();await page.reload();await p.locator('[data-ndvi-job-status]').filter({hasText:'Completado'}).waitFor();assert.equal(page.url(),link);await page.waitForFunction(()=>document.querySelector('[data-ndvi-field=west]')?.value==='-65.47');assert.equal(await p.locator('[data-ndvi-field=start]').inputValue(),'2025-05-01');
 await p.getByRole('button',{name:'Revisar y vincular al proyecto',exact:true}).click();await page.locator('[data-mita-scene]').waitFor();assert.equal(await page.evaluate(id=>localStorage.getItem('ambienta-mita-results-v1:'+id),project),null);
 await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,project+'-'+width+'-full.png'),fullPage:true});await p.screenshot({path:path.join(out,project+'-'+width+'-workbench.png')});
 for(const [k,v] of Object.entries(before))assert.equal(await page.evaluate(k=>localStorage.getItem(k),k),v);
 await p.locator('[data-ndvi-field=west]').fill('-65.471');assert.equal(await p.locator('[data-ndvi-submit]').count(),0);
 const polygon={type:'Polygon',coordinates:[[[-65.47,-24.76],[-65.465,-24.76],[-65.465,-24.758],[-65.467,-24.755],[-65.47,-24.755],[-65.47,-24.76]],[[-65.4695,-24.7595],[-65.4685,-24.7595],[-65.4685,-24.7585],[-65.4695,-24.7585],[-65.4695,-24.7595]]]};
 await p.locator('[data-ndvi-polygon]').setInputFiles({name:'QA-polygon.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify(polygon))});await p.locator('[data-ndvi-mask=polygon]').waitFor();assert.equal(await p.locator('[data-ndvi-field=west]').inputValue(),'-65.47');assert.equal(await p.locator('[data-ndvi-field=west]').getAttribute('readonly'),'');
 await p.locator('[data-ndvi-search]').click();await p.getByRole('radio').check();await p.locator('[data-ndvi-field=end]').fill('2025-06-29');assert.equal(await p.locator('[data-ndvi-submit]').count(),0);await p.locator('[data-ndvi-mask=polygon]').waitFor();
 await p.getByRole('button',{name:'Usar solo ventana rectangular',exact:true}).click();await p.locator('[data-ndvi-mask=bbox]').waitFor();assert.equal(await p.locator('[data-ndvi-field=west]').getAttribute('readonly'),null);
 await p.locator('[data-ndvi-polygon]').setInputFiles({name:'invalid.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify({type:'Point',coordinates:[0,0]}))});await page.waitForFunction(()=>/GeoJSON|Perímetro/.test(document.querySelector('[data-ndvi-message]')?.textContent||''));await p.locator('[data-ndvi-mask=bbox]').waitFor();
 for(const [k,v] of Object.entries(before))assert.equal(await page.evaluate(k=>localStorage.getItem(k),k),v);
 const selected=project==='DIAB-2026-DEMO'?DIABLILLOS_QA_GEOJSON:{type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:polygon}]};
 const sourceName='QA-generic-'+project+'.geojson',record=buildPerimeterRecord({geojson:selected,sha256:createHash('sha256').update(JSON.stringify(selected)).digest('hex'),sourceName,sourceType:'geojson',description:'Synthetic regression source; never an official perimeter',createdAt:'2026-11-05T00:00:00Z'}),key=perimeterKey(project==='DIAB-2026-DEMO');
 await page.evaluate(({key,record})=>localStorage.setItem(key,JSON.stringify(record)),{key,record});
 await page.goto(page.url().split('#')[0]+'#/area');await page.locator('[data-perimeter-saved]').filter({hasText:sourceName}).waitFor();
 const areaSnapshot=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 await page.locator('[data-perimeter-ndvi]').click();await p.locator('[data-ndvi-mask=polygon]').waitFor();await p.locator('[data-ndvi-mask-name]').filter({hasText:sourceName}).waitFor();
 await p.getByText('Servicio local disponible',{exact:true}).waitFor();
 await p.locator('[data-ndvi-field=start]').fill('2025-05-01');await p.locator('[data-ndvi-field=end]').fill('2025-06-30');
 await p.locator('[data-ndvi-search]').click();await p.getByRole('radio').check();assert.deepEqual(lastQuery.geometry,selected.features[0].geometry);assert.deepEqual(lastQuery.bbox,record.bounds);
 assert(!page.url().includes('trabajo='));assert(page.url().includes('area=guardada'));
 await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,project+'-'+width+'-area-to-ndvi-full.png'),fullPage:true});await p.screenshot({path:path.join(out,project+'-'+width+'-area-to-ndvi-panel.png')});
 await p.locator('[data-ndvi-submit]').click();await page.waitForURL(url=>url.hash.includes('trabajo='+ 'b'.repeat(32)));await p.locator('[data-ndvi-job-status]').filter({hasText:'Completado'}).waitFor();await page.reload();await p.locator('[data-ndvi-mask=polygon]').waitFor();
 assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),areaSnapshot);
 assert.deepEqual(errors,[]);results.push({project,width,status:'PASS',submits,downloads:true,reload:true,parametersRestored:true,polygonImport:true,polygonSearchInvalidatedOnDateChange:true,invalidGeometryRejected:true,areaToNdviExactGeometry:true,previousJobDidNotReplaceSelection:true,maskRestored:true,reviewBeforeSave:true,oldStorageUnchanged:true});await context.close();
}
const c=await browser.newContext(),page=await c.newPage();let calls=0;page.on('request',r=>{if(r.url().includes('/api/mita'))calls++;});await page.goto(base+'index.html#/mita');await page.getByText('Procesamiento no disponible',{exact:true}).waitFor();assert.equal(await page.locator('[data-ndvi-search]').isDisabled(),true);assert.equal(calls,0);await c.close();
await fs.writeFile(path.join(out,'results.json'),JSON.stringify({status:'PASS',scope:'Synthetic API transport/interaction regression; real satellite test is separate',results,staticInstallNoApiCalls:true},null,2));console.log('NDVI workbench PASS: both demos, 1366/1800, downloads, reload, explicit review and static fallback.');
}finally{await browser.close();for(const server of servers){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
