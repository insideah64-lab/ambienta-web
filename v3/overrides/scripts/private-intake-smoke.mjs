import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const out='qa/ambienta-private-intake';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,1800]){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8787/v3/index.html?caso=diablillos#/nube');
  const privateUI=page.locator('.v2-cloud-workspace');
  await privateUI.waitFor();
  assert((await privateUI.innerText()).includes('Expedientes privados'));
  assert.equal(await privateUI.locator('[data-private-measure-form]').count(),0,
   'PGA measure form cannot be available before authentication');
  assert.equal(await privateUI.locator('[data-private-monitoring-form]').count(),0,
   'Una inspección o evidencia no puede registrarse sin sesión');
  assert.equal(await privateUI.getByRole('button',{name:'Nueva inspección'}).count(),0,
   'Los visitantes no pueden registrar inspecciones del PGA');
  assert.equal(await privateUI.getByRole('button',{name:'Nueva referencia documental'}).count(),0,
   'Los visitantes no pueden registrar evidencias sin autenticar');

  assert.equal(await privateUI.getByRole('button',{name:'Nueva medida vinculada'}).count(),0,
   'PGA measure registration cannot be offered to a guest');
  const configMissing=await privateUI.getByRole('heading',{name:'Conexión privada aún no configurada'}).count()===1;
  if(configMissing){
   assert.equal(await privateUI.locator('[data-private-intake]').count(),0);
   assert.equal(await privateUI.getByRole('button',{name:'Nuevo expediente privado'}).count(),0);
   assert((await privateUI.innerText()).includes('Nunca agregar una clave secreta'));
  } else {
   const login=privateUI.getByRole('heading',{name:'Ingresar a mis expedientes'});
   await login.waitFor();
   assert.equal(await privateUI.locator('[data-private-intake]').count(),0,
    'Una sesión no autenticada nunca ve formularios de creación');
  }
  const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
  await page.reload();
  await privateUI.waitFor();
  const after=await page.evaluate(()=>JSON.stringify({...localStorage}));
  assert.equal(after,before,'Visitar el espacio privado sin sesión no altera expedientes locales');
  assert.deepEqual(errors,[]);
  assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+6);
  await privateUI.screenshot({path:out+'/private-unconfigured-'+width+'.png',animations:'disabled'});
  console.log(JSON.stringify({result:'PASS',width,authRequired:true,
    disabledWithoutConfig:configMissing,localStorageUnchanged:true,pageErrors:0}));
  await ctx.close();
 }
}finally{await browser.close();}
