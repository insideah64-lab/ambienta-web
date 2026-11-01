import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base='http://127.0.0.1:8787/v3/index.html?caso=diablillos&perimetro=referencia-qa#';
const screenshots='qa/diablillos-v353/screenshots';
await fs.mkdir(screenshots,{recursive:true});
try{
 for(const viewport of [{width:1366,height:820,name:'desktop'},{width:390,height:844,name:'mobile'}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'/mapas');
  await page.locator('.geo-full [data-user-perimeter-visible=true]').waitFor();
  const view=page.locator('.geo-full');
  const map=view.locator('.geo-map');
  const label=view.locator('[data-user-perimeter-visible=true]');
  const mapBox=await map.boundingBox(),labelBox=await label.boundingBox();
  assert(mapBox&&labelBox,'Map and legend must exist');
  assert(labelBox.y>=mapBox.y+mapBox.height-1,
   'The legend must appear BELOW the map, never over polygon or controls');
  assert(labelBox.x>=mapBox.x-1&&labelBox.x+labelBox.width<=mapBox.x+mapBox.width+2,
   'The legend cannot extend outside the cartographic panel');
  assert.match(await label.innerText(),/NO OFICIAL/);
  assert.equal(await view.locator('.geo-user-perimeter-badge').count(),0);
  assert.equal(await view.locator('[data-map-study-zones="4"]').count(),0);
  await page.screenshot({path:screenshots+'/v354-sig-'+viewport.name+'.png',fullPage:true,animations:'disabled'});
  await page.goto(base+'/');
  await page.locator('.geo-compact [data-user-perimeter-visible=true]').waitFor();
  const small=page.locator('.geo-compact');
  const previewBox=await small.locator('.geo-map').boundingBox();
  const captionBox=await small.locator('[data-user-perimeter-visible=true]').boundingBox();
  assert(previewBox&&captionBox);
  assert(captionBox.y>=previewBox.y+previewBox.height-1,
   'Compact preview must not obscure map geometry');
  assert.match(await small.locator('[data-user-perimeter-visible=true]').innerText(),/NO OFICIAL/);
  await small.screenshot({path:screenshots+'/v354-compact-'+viewport.name+'.png',animations:'disabled'});
  assert.deepEqual(errors,[],'There must be no React or MapLibre page errors');
  await context.close();
 }
 const clean=await browser.newPage({viewport:{width:1024,height:768}});
 await clean.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/mapas');
 await clean.locator('.geo-full .geo-map').waitFor();
 assert.equal(await clean.locator('[data-user-perimeter-visible=true]').count(),0,
  'No fabricated perimeter caption when user has not chosen one');
 console.log(JSON.stringify({result:'PASS',desktop:true,mobile:true,compact:true,full:true,
  noMapOcclusion:true,qaDisclaimerVisible:true,unseededNoDisclaimer:true,screenshots:4}));
}finally{await browser.close();}
