// AMBIENTA V3 · Supabase Edge runtime for the already-tested official WFS core.
// This function has no database permissions, dynamic upstream URLs or project geometry.
import {clipGeoJsonToBbox} from './lib/aoi-clip.mjs';
import {validateGeoJson} from './lib/geojson-validate.mjs';
import {reserveSharedQuota} from './quota.ts';

type SourceRequest={layer:'municipios'|'otbn'|'vegetacion';bbox:number[]};
const FIXED_WFS='https://geoportal.salta.gob.ar/geoserver/wfs';
const TYPES:Record<SourceRequest['layer'],string>={
 municipios:'geonode:municipios',
 otbn:'geonode:otbn_2009_ll',
 vegetacion:'geonode:unid_veg_cabral_etal_2009'
};
const SITE='https://insideah64-lab.github.io';
const MAX_BYTES=1_048_576;
// Cross-instance minute/hour/day budgets are now atomic in Postgres.
// This instance-local counter only prevents its own concurrent overload.
let active=0;
function error(status:number,code:string,message:string){
 return Object.assign(new Error(message),{status,code});
}
function headers(origin:string|null){
 return {'content-type':'application/json;charset=utf-8',
  'cache-control':'no-store','x-content-type-options':'nosniff','vary':'Origin',
  'content-security-policy':"default-src 'none'; frame-ancestors 'none'",
  'access-control-allow-methods':'POST, OPTIONS',
  'access-control-allow-headers':'Authorization, apikey, Content-Type, x-client-info',
  'access-control-expose-headers':'Retry-After',
  ...(origin?{'access-control-allow-origin':origin}:{})};
}
function json(status:number,body:unknown,origin:string|null,retryAfterSeconds=0):Response{
 const content=JSON.stringify(body);
 if(content.length>1_600_000)return json(413,{status:'error',error:{
  code:'RESPONSE_TOO_LARGE',message:'La respuesta supera el límite, reducí la ventana.'}},origin);
 return new Response(content,{status,headers:{...headers(origin),...(retryAfterSeconds?{'retry-after':String(retryAfterSeconds)}:{})}});
}
function validate(v:unknown):SourceRequest{
 if(!v||typeof v!=='object'||Array.isArray(v))throw error(400,'INVALID_REQUEST','Solicitud JSON inválida.');
 const obj=v as Record<string,unknown>;
 if(Object.keys(obj).some(x=>!['bbox','layer'].includes(x)))throw error(400,'INVALID_REQUEST','Parámetros no permitidos.');
 if(typeof obj.layer!=='string'||!Object.hasOwn(TYPES,obj.layer))
  throw error(400,'UNKNOWN_LAYER','Capa no autorizada.');
 const b=obj.bbox;
 if(!Array.isArray(b)||b.length!==4||b.some(x=>typeof x!=='number'||!Number.isFinite(x)))
  throw error(400,'INVALID_BBOX','BBOX inválida.');
 const [w,s,e,n]=b;
 if(w< -180||e>180||s< -90||n>90||w>=e||s>=n||e-w>0.7||n-s>0.7||(e-w)*(n-s)>0.12)
  throw error(422,'BBOX_TOO_LARGE','La ventana de consulta es demasiado grande o inválida.');
 return {layer:obj.layer as SourceRequest['layer'],bbox:[...b]};
}
async function sha256(bytes:Uint8Array){
 const digest=await crypto.subtle.digest('SHA-256',bytes.buffer as ArrayBuffer);
 return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function fromWfs(request:SourceRequest){
 const p=new URLSearchParams({service:'WFS',version:'1.0.0',request:'GetFeature',
  typeName:TYPES[request.layer],outputFormat:'application/json',srsName:'EPSG:4326',
  maxFeatures:'20',bbox:request.bbox.join(',')+',EPSG:4326'});
 const url=FIXED_WFS+'?'+p.toString();
 let upstream:Response;
 try{upstream=await fetch(url,{redirect:'error',headers:{Accept:'application/json'},
  signal:AbortSignal.timeout(12000)});}
 catch{throw error(502,'PROVIDER_UNAVAILABLE','IDESA no respondió. Usá el enlace WFS manual o intentá más tarde.');}
 if(!upstream.ok)throw error(502,'PROVIDER_ERROR','IDESA devolvió HTTP '+upstream.status+'.');
 if(!/json/i.test(upstream.headers.get('content-type')||''))
  throw error(502,'INVALID_PROVIDER_FORMAT','IDESA no devolvió GeoJSON.');
 const reader=upstream.body?.getReader();
 if(!reader)throw error(502,'EMPTY_PROVIDER','IDESA no devolvió contenido.');
 const chunks:Uint8Array[]=[];let size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;
   if(size>MAX_BYTES){await reader.cancel();
    throw error(413,'SOURCE_TOO_LARGE','El WFS excede 1 MiB. Reducí la BBOX o usá SIG de escritorio.');}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const raw=new Uint8Array(size);let offset=0;
 for(const c of chunks){raw.set(c,offset);offset+=c.length;}
 let body:unknown;
 try{body=JSON.parse(new TextDecoder().decode(raw));}
 catch{throw error(502,'INVALID_PROVIDER_JSON','El WFS devolvió JSON inválido.');}
 const document=body as Record<string,unknown>;
 if(!document||document.type!=='FeatureCollection'||!Array.isArray(document.features))
  throw error(502,'INVALID_PROVIDER_DATA','La respuesta no es una colección GeoJSON.');
 const number=document.totalFeatures??document.numberOfFeatures??document.numberMatched;
 if(!Number.isSafeInteger(number)||Number(number)<0)
  throw error(409,'COUNT_UNKNOWN','No es posible acreditar la completitud del WFS.');
 if(number!==document.features.length||Number(number)>20)
  throw error(409,'INCOMPLETE_SOURCE','El WFS declara '+number+' entidades y devolvió '+
   document.features.length+'. Reducí la ventana; no se admite un recorte incompleto.');
 const fetchedAt=new Date().toISOString();
 const sourceSha=await sha256(raw);
 const common={institution:'Infraestructura de Datos Espaciales de Salta (IDESA)',service:'WFS 1.0.0',
  layer:request.layer,typeName:TYPES[request.layer],sourceUrl:url,
  queryBbox:request.bbox,fetchedAt,originalResponseSha256:sourceSha,
  originalResponseBytes:size,hashScope:'raw_upstream_wfs_response',
  queryIsProjectPerimeter:false,license:'check_dataset_metadata_before_redistribution'};
 if(number===0)return {status:'empty',source:{type:'FeatureCollection',features:[]},
  clip:{type:'FeatureCollection',features:[]},provenance:{...common,sourceCount:0,selectedCount:0}};
 let valid:ReturnType<typeof validateGeoJson>;
 try{valid=validateGeoJson(document);}
 catch(e){throw error(422,'SOURCE_REQUIRES_REVIEW',
  'La geometría requiere revisión: '+String((e as Error).message).slice(0,180));}
 if(valid.geojson.features.some((x:{geometry:{type:string}})=>
  !['Polygon','MultiPolygon'].includes(x.geometry.type)))
  throw error(422,'NOT_POLYGON_SOURCE','El servicio devolvió entidades que no son polígonos.');
 let cut:ReturnType<typeof clipGeoJsonToBbox>;
 try{cut=clipGeoJsonToBbox(valid.geojson,request.bbox);}
 catch{throw error(422,'CLIP_FAILED','El recorte topológico no pudo resolverse.');}
 if(cut.unsupportedCount)
  throw error(422,'TOPOLOGY_REVIEW','Hay '+cut.unsupportedCount+' geometrías que requieren revisión SIG.');
 if(cut.sourceCount!==number)throw error(409,'SOURCE_COUNT_MISMATCH','Inconsistencia entre el origen y el recorte.');
 return {status:'complete',source:valid.geojson,clip:cut.geojson,
  provenance:{...common,sourceCount:cut.sourceCount,selectedCount:cut.selectedCount,
   sourceVertices:valid.coordinateCount,method:cut.method}};
}
Deno.serve(async(req:Request)=>{
 const incoming=req.headers.get('origin');
 const origin=incoming===SITE?SITE:null;
 const started=performance.now();
 let layerTag='none';
 try{
  if(incoming&&incoming!==SITE)throw error(403,'ORIGIN_DENIED','Origen web no autorizado.');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
  if(req.method==='GET')return json(200,{status:'ok',service:'ambienta-sig-edge',version:'3.1',budget:'postgres_shared',storage:'bounded_and_private'},origin);
  if(req.method!=='POST')throw error(405,'METHOD_NOT_ALLOWED','Solo se admite POST.');
  if(!req.headers.get('content-type')?.startsWith('application/json'))
   throw error(415,'CONTENT_TYPE','Se requiere Content-Type: application/json.');
  if(Number(req.headers.get('content-length')||'0')>512)
   throw error(413,'REQUEST_TOO_LARGE','La solicitud es demasiado grande.');
  const body=await req.text();
  if(body.length>512)throw error(413,'REQUEST_TOO_LARGE','La solicitud es demasiado grande.');
  let data:unknown;
  try{data=JSON.parse(body);}catch{throw error(400,'INVALID_JSON','JSON inválido.');}
  const parsed=validate(data);
  layerTag=parsed.layer;
  if(active>=2)throw error(429,'BUSY','El servicio SIG está ocupado.');
  active++;
  try{
   // Reserve a fixed shared budget BEFORE contacting the official WFS.
   // A database outage is a hard 503 (manual WFS links remain in the website).
   await reserveSharedQuota(parsed.layer);
   const result=await fromWfs(parsed);
   console.log(JSON.stringify({component:'ambienta-sig-v31',event:'query',
    layer:layerTag,outcome:result.status,code:'OK',
    durationMs:Math.round(performance.now()-started),
    sourceCount:result.provenance.sourceCount,
    selectedCount:result.provenance.selectedCount,
    sourceBytes:result.provenance.originalResponseBytes}));
   return json(200,result,origin);
  }finally{active--;}
 }catch(e){
  const x=e as Error & {status?:number;code?:string;retryAfterSeconds?:number};
  // Aggregate-safe telemetry: never log IP, BBOX, full provider URL or project details.
  console.log(JSON.stringify({component:'ambienta-sig-v31',event:'query',
   layer:layerTag,outcome:'error',code:x.code||'INTERNAL_ERROR',
   status:x.status||500,durationMs:Math.round(performance.now()-started)}));
  return json(x.status||500,{status:'error',error:{
   code:x.code||'INTERNAL_ERROR',message:x.status?x.message:'El servicio SIG no pudo completar la solicitud.'}},
   origin,x.retryAfterSeconds||0);
 }
});
