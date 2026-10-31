import {createHash} from 'node:crypto';
import {clipGeoJsonToBbox} from './lib/aoi-clip.mjs';
import {validateGeoJson} from './lib/geojson-validate.mjs';

const SOURCE='https://geoportal.salta.gob.ar/geoserver/wfs';
const ORIGINS=new Set(['https://insideah64-lab.github.io']);
const ALLOWED=Object.freeze({
 municipios:'geonode:municipios',
 otbn:'geonode:otbn_2009_ll',
 vegetacion:'geonode:unid_veg_cabral_etal_2009'
});
const MAX_SOURCE_BYTES=1_048_576;
const MAX_RESPONSE_BYTES=1_600_000;
const MAX_UPSTREAM_ITEMS=20;
const MAX_BODY=512;

function fail(status,code,message){return Object.assign(new Error(message),{status,code});}
export function validateRequest(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw fail(400,'INVALID_REQUEST','Solicitud JSON inválida.');
 const names=Object.keys(input);
 if(names.some(n=>!['layer','bbox'].includes(n)))throw fail(400,'INVALID_REQUEST','Solo se aceptan capa y BBOX.');
 if(typeof input.layer!=='string'||!Object.hasOwn(ALLOWED,input.layer))
  throw fail(400,'UNKNOWN_LAYER','La capa solicitada no figura en la lista autorizada.');
 const bbox=input.bbox;
 if(!Array.isArray(bbox)||bbox.length!==4||bbox.some(n=>typeof n!=='number'||!Number.isFinite(n)))
  throw fail(400,'INVALID_BBOX','La ventana debe contener cuatro coordenadas numéricas finitas.');
 const [w,s,e,n]=bbox;
 if(w < -180||e >180||s < -90||n>90||w>=e||s>=n||e-w>0.7||n-s>0.7||(e-w)*(n-s)>0.12)
  throw fail(422,'BBOX_TOO_LARGE','La ventana es inválida o demasiado amplia para esta consulta pública. Reducí el radio.');
 return {layer:input.layer,bbox:[...bbox]};
}
export function upstreamUrl({layer,bbox}){
 const params=new URLSearchParams({service:'WFS',version:'1.0.0',request:'GetFeature',
  typeName:ALLOWED[layer],outputFormat:'application/json',srsName:'EPSG:4326',
  maxFeatures:String(MAX_UPSTREAM_ITEMS),bbox:bbox.join(',')+',EPSG:4326'});
 return SOURCE+'?'+params.toString();
}
function allowedOrigin(req){
 const origin=req.headers.origin;
 if(!origin)return null;
 if(!ORIGINS.has(origin))throw fail(403,'ORIGIN_DENIED','Origen web no autorizado.');
 return origin;
}
function responseHeaders(origin){
 return {'content-type':'application/json; charset=utf-8','cache-control':'no-store',
 'x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; frame-ancestors 'none'",
 'vary':'Origin',...(origin?{'access-control-allow-origin':origin}:{}),
 'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'Content-Type'};
}
function send(res,status,body,origin){
 const content=JSON.stringify(body);
 if(Buffer.byteLength(content)>MAX_RESPONSE_BYTES)
  return send(res,413,{status:'error',error:{code:'RESPONSE_TOO_LARGE',
  message:'La selección excede el tamaño máximo. Reducí la ventana de consulta.'}},origin);
 res.writeHead(status,responseHeaders(origin));res.end(content);
}
function readBody(req){
 return new Promise((resolve,reject)=>{
  let size=0,chunks=[];
  req.on('data',chunk=>{
   size+=chunk.length;
   if(size>MAX_BODY){reject(fail(413,'REQUEST_TOO_LARGE','La solicitud supera el tamaño máximo.'));req.destroy();return;}
   chunks.push(chunk);
  });
  req.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error',reject);
 });
}
async function streamLimited(response){
 if(!response.body)throw fail(502,'UPSTREAM_EMPTY','El servidor geográfico no devolvió información.');
 const reader=response.body.getReader();const chunks=[];let length=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   length+=value.byteLength;
   if(length>MAX_SOURCE_BYTES){await reader.cancel();throw fail(413,'SOURCE_TOO_LARGE',
    'La capa supera 1 MiB; reducí la ventana o consultá un SIG de escritorio.');}
   chunks.push(Buffer.from(value));
  }
 }finally{reader.releaseLock();}
 return Buffer.concat(chunks,length);
}
export async function retrieveAndClip(request,{fetchImpl=fetch,now=()=>new Date()}={}){
 const url=upstreamUrl(request);
 let upstream;
 try{
  upstream=await fetchImpl(url,{method:'GET',redirect:'error',
   headers:{Accept:'application/json'},signal:AbortSignal.timeout(12_000)});
 }catch{
  throw fail(502,'PROVIDER_UNAVAILABLE','IDESA no respondió. Reintentá más tarde o utilizá la descarga manual.');
 }
 if(!upstream.ok)throw fail(502,'PROVIDER_ERROR','IDESA respondió HTTP '+upstream.status+'.');
 if(!/\bjson\b|\/json[;\s]/i.test(upstream.headers.get('content-type')||''))
  throw fail(502,'INVALID_PROVIDER_FORMAT','El servicio no devolvió GeoJSON.');
 const raw=await streamLimited(upstream);
 let data;
 try{data=JSON.parse(raw.toString('utf8'));}catch{
  throw fail(502,'INVALID_PROVIDER_JSON','El servicio devolvió JSON mal formado.');
 }
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))
  throw fail(502,'NOT_FEATURE_COLLECTION','IDESA no devolvió una colección GeoJSON.');
 const number=data.totalFeatures??data.numberOfFeatures??data.numberMatched;
 if(!Number.isSafeInteger(number)||number<0)
  throw fail(409,'COUNT_UNKNOWN','El proveedor no declaró el total de entidades; no es seguro afirmar completitud.');
 if(number>MAX_UPSTREAM_ITEMS||number!==data.features.length)
  throw fail(409,'INCOMPLETE_SOURCE','El WFS informa '+number+' entidades y entregó '+data.features.length+
   '. Reducí la BBOX; no se exportarán datos parciales.');
 if(number===0)return {status:'empty',source:{type:'FeatureCollection',features:[]},
  clip:{type:'FeatureCollection',features:[]},provenance:{institution:'IDESA Salta',service:'WFS',
   layer:request.layer,typeName:ALLOWED[request.layer],sourceUrl:url,queryBbox:request.bbox,
   fetchedAt:now().toISOString(),originalResponseSha256:createHash('sha256').update(raw).digest('hex'),
   originalResponseBytes:raw.length,sourceCount:0,selectedCount:0,
   hashScope:'raw_upstream_wfs_response',queryIsProjectPerimeter:false}};
 let validated;
 try{validated=validateGeoJson(data);}catch(err){
  throw fail(422,'SOURCE_REQUIRES_REVIEW','IDESA devolvió geometrías que exceden los límites locales o tienen CRS no admitido: '+String(err.message).slice(0,230));
 }
 if(validated.geojson.features.some(f=>!['Polygon','MultiPolygon'].includes(f.geometry.type)))
  throw fail(422,'NOT_POLYGON_SOURCE','La capa del proveedor contiene geometrías que no son poligonales.');
 let result;
 try{result=clipGeoJsonToBbox(validated.geojson,request.bbox);}catch{
  throw fail(422,'CLIP_FAILED','No se pudo resolver el recorte topológico.');
 }
 if(result.unsupportedCount)throw fail(422,'TOPOLOGY_REVIEW',
   'Hay '+result.unsupportedCount+' geometrías pendientes de revisión SIG. No se exportó un resultado parcial.');
 if(result.sourceCount!==number)throw fail(409,'SOURCE_COUNT_MISMATCH','La cantidad de entidades cambió durante la validación.');
 return {status:'complete',source:validated.geojson,clip:result.geojson,
  provenance:{institution:'Infraestructura de Datos Espaciales de Salta (IDESA)',
   service:'WFS 1.0.0',layer:request.layer,typeName:ALLOWED[request.layer],
   sourceUrl:url,queryBbox:request.bbox,fetchedAt:now().toISOString(),
   originalResponseSha256:createHash('sha256').update(raw).digest('hex'),
   originalResponseBytes:raw.length,sourceCount:result.sourceCount,
   selectedCount:result.selectedCount,sourceVertices:validated.coordinateCount,
   hashScope:'raw_upstream_wfs_response',queryIsProjectPerimeter:false,
   method:result.method,license:'check_dataset_metadata_before_redistribution'}};
}
export function createHandler({fetchImpl=fetch,now=()=>Date.now(),maxActive=2}={}){
 const counters=new Map();let active=0,globalWindow=0,globalCount=0;
 return async(req,res)=>{
  let origin=null;
  try{
   origin=allowedOrigin(req);
   if(req.method==='OPTIONS'){
    if(req.url!=='/v1/clip')throw fail(404,'NOT_FOUND','Ruta no encontrada.');
    res.writeHead(204,responseHeaders(origin));res.end();return;
   }
   if(req.method==='GET'&&req.url==='/v1/health'){
    send(res,200,{status:'ok',service:'ambienta-sig-gateway',version:1,
     layers:Object.keys(ALLOWED),limits:{sourceBytes:MAX_SOURCE_BYTES,maxFeatures:MAX_UPSTREAM_ITEMS}},origin);
    return;
   }
   if(req.method!=='POST'||req.url!=='/v1/clip')
    throw fail(404,'NOT_FOUND','Ruta no encontrada.');
   if(!req.headers['content-type']?.startsWith('application/json'))
    throw fail(415,'CONTENT_TYPE','Se requiere Content-Type: application/json.');
   const raw=await readBody(req);
   let payload;
   try{payload=JSON.parse(raw);}catch{throw fail(400,'INVALID_JSON','La solicitud no contiene JSON válido.');}
   const request=validateRequest(payload);
   const instant=now(),ip=req.socket?.remoteAddress||'unknown';
   if(instant-globalWindow>60_000){globalWindow=instant;globalCount=0;}
   if(globalCount>=40)throw fail(429,'RATE_LIMIT','Se superó el límite temporal del servicio.');
   const stats=counters.get(ip)||{since:instant,count:0};
   if(instant-stats.since>60_000){stats.since=instant;stats.count=0;}
   if(stats.count>=8)throw fail(429,'RATE_LIMIT','Se alcanzó el límite de consultas. Intentá más tarde.');
   if(active>=maxActive)throw fail(429,'BUSY','El servicio está ocupado; reintentá más tarde.');
   if(counters.size>512)counters.clear();
   counters.set(ip,stats);stats.count++;globalCount++;active++;
   try{const result=await retrieveAndClip(request,{fetchImpl});send(res,200,result,origin);}
   finally{active--;}
  }catch(err){
   if(res.headersSent||res.destroyed)return;
   send(res,err.status||500,{status:'error',error:{code:err.code||'INTERNAL_ERROR',
    message:err.status?err.message:'El servicio SIG no pudo completar la solicitud.'}},origin);
  }
 };
}
