// Public Georef v2.1 administrative references. No exact project position is inferred.
// Source: https://www.argentina.gob.ar/georef/ (CC BY 4.0; attribute Georef).
export const GEOREF_API='https://apis.datos.gob.ar/georef/api/v2.1';
export const GEOREF_LICENSE='https://www.argentina.gob.ar/georef/condiciones-de-uso-y-licencia';
export const GEOREF_CITATION='Servicio Georef – argentina.gob.ar/georef';
export const GEOREF_KEY_DIABLILLOS='ambienta-georef-diablillos-reference-v1';
export const GEOREF_KEY_GENERIC='ambienta-georef-demo-reference-v1';
export const GEOREF_ALLOWED=new Set(['provincias','departamentos','municipios','localidades']);
const cache=new Map(), TTL=15*60*1000,MAX_CACHE=70;
function error(s){throw Error('Georef: '+s);}
export function georefUrl(resource,{provincia='',departamento='',nombre='',max=50,inicio=0}={}){
 if(!GEOREF_ALLOWED.has(resource))error('recurso no admitido.');
 if(!Number.isInteger(max)||max<1||max>100||!Number.isInteger(inicio)||inicio<0||inicio>5000)error('paginación inválida.');
 if(provincia&&!/^\d{2}$/.test(provincia))error('ID de provincia inválido.');
 if(departamento&&!/^\d{5}$/.test(departamento))error('ID de departamento inválido.');
 if(nombre&&(typeof nombre!=='string'||nombre.length>90))error('búsqueda demasiado extensa.');
 const q=new URLSearchParams({max:String(max)});
 if(inicio)q.set('inicio',String(inicio));
 if(provincia)q.set('provincia',provincia);
 if(departamento)q.set('departamento',departamento);
 if(nombre.trim())q.set('nombre',nombre.trim());
 return GEOREF_API+'/'+resource+'?'+q.toString();
}
export function normalizeGeoref(data,resource){
 if(!GEOREF_ALLOWED.has(resource))error('recurso no admitido.');
 const values=data?.[resource];
 if(!Array.isArray(values)||typeof data?.total!=='number'||data.total<0)error('respuesta incompatible de la API.');
 const items=values.map(v=>{
  const id=String(v?.id??'');
  const name=String(v?.nombre??'').trim();
  const lat=Number(v?.centroide?.lat),lon=Number(v?.centroide?.lon);
  if(!/^\d{2,12}$/.test(id)||!name||name.length>180||
     !Number.isFinite(lat)||!Number.isFinite(lon)||
     lat < -90||lat>90||lon < -180||lon>180)return null;
  return {id,name,lat,lon,provinciaId:String(v?.provincia?.id??''),
   departamentoId:String(v?.departamento?.id??''),source:String(v?.fuente??'')};
 }).filter(Boolean);
 return {items,total:data.total};
}
export async function queryGeoref(resource,params={},options={}){
 const url=georefUrl(resource,params);
 const current=cache.get(url);
 if(current&&Date.now()-current.at<TTL)return {...current.data,fromCache:true};
 const c=new AbortController();
 const timeout=setTimeout(()=>c.abort(),10000);
 const abort=()=>c.abort();
 options.signal?.addEventListener('abort',abort,{once:true});
 try{
  const r=await fetch(url,{method:'GET',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',signal:c.signal});
  if(r.status===429)error('servicio temporalmente limitado por cuota. Reintentá más tarde.');
  if(!r.ok)error('HTTP '+r.status+'.');
  if(Number(r.headers.get('content-length'))>320000)error('respuesta excesiva.');
  const text=await r.text();
  if(text.length>320000)error('respuesta demasiado grande.');
  const obj=normalizeGeoref(JSON.parse(text),resource);
  if(cache.size>=MAX_CACHE)cache.delete(cache.keys().next().value);
  cache.set(url,{at:Date.now(),data:obj});
  return {...obj,fromCache:false};
 }finally{
  clearTimeout(timeout);
  options.signal?.removeEventListener('abort',abort);
 }
}
export function cleanTerritorialSelection(value){
 if(!value||typeof value!=='object')return null;
 const n=value;
 if(n.province==null||!/^\d{2}$/.test(n.province.id)||!n.province.name)return null;
 const kinds=['department','municipality','locality'];
 for(const k of kinds){
  const v=n[k];
  if(v!=null&&(!/^\d{2,12}$/.test(v.id)||!v.name||v.name.length>180||
   !Number.isFinite(v.lat)||!Number.isFinite(v.lon)))return null;
 }
 return {
  province:{id:n.province.id,name:String(n.province.name).slice(0,180),lat:n.province.lat,lon:n.province.lon},
  department:n.department?{id:n.department.id,name:n.department.name,lat:n.department.lat,lon:n.department.lon}:null,
  municipality:n.municipality?{id:n.municipality.id,name:n.municipality.name,lat:n.municipality.lat,lon:n.municipality.lon}:null,
  locality:n.locality?{id:n.locality.id,name:n.locality.name,lat:n.locality.lat,lon:n.locality.lon}:null,
  selectedAt:typeof n.selectedAt==='string'?n.selectedAt:'',
  license:'CC BY 4.0',referenceType:'admin_only_no_project_geolocation',apiVersion:'v2.1'
 };
}
export function georefStorageKey(isDiablillos){
 return isDiablillos?GEOREF_KEY_DIABLILLOS:GEOREF_KEY_GENERIC;
}
export function readTerritory(key){
 try{const v=localStorage.getItem(key);return v&&v.length<3500?cleanTerritorialSelection(JSON.parse(v)):null;}
 catch{return null;}
}
