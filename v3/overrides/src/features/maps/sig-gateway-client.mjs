// Browser-side client for the narrowly scoped IDESA SIG gateway.
// The browser never supplies an arbitrary upstream URL or WFS typeName.
const LAYERS=new Set(['municipios','otbn','vegetacion']);
export function normalizeGatewayUrl(raw,{allowLocal=false}={}){
 if(typeof raw!=='string'||raw.length>200||!raw.trim())throw Error('No se configuró el servicio SIG.');
 let endpoint;
 try{endpoint=new URL(raw);}catch{throw Error('Dirección del servicio SIG inválida.');}
 const local=allowLocal&&endpoint.protocol==='http:'&&['localhost','127.0.0.1'].includes(endpoint.hostname);
 if(endpoint.protocol!=='https:'&&!local)throw Error('El servicio SIG requiere HTTPS.');
 if(endpoint.username||endpoint.password||endpoint.search||endpoint.hash)
  throw Error('La dirección del servicio SIG no debe contener credenciales ni parámetros.');
 const isSupabase=endpoint.hostname==='rqzeejnhszbbohaqdpgp.supabase.co'&&
  ['/functions/v1/ambienta-sig-v3','/functions/v1/ambienta-sig-v31'].includes(endpoint.pathname);
 if(!isSupabase&&endpoint.pathname!=='/')
  throw Error('Ruta del gateway SIG no autorizada.');
 return isSupabase?endpoint.origin+endpoint.pathname:endpoint.origin;
}
/** @param {string} base @param {string} layer @param {number[]} bbox
 * @param {{fetchImpl?: typeof fetch, signal?: AbortSignal, allowLocal?:boolean, token?:string}} [options] */
export async function requestOfficialPolygons(base,layer,bbox,{fetchImpl=fetch,signal,allowLocal=false,token=''}={}){
 if(!LAYERS.has(layer))throw Error('La capa solicitada no está autorizada.');
 if(!Array.isArray(bbox)||bbox.length!==4||bbox.some(x=>!Number.isFinite(x)))
  throw Error('La ventana BBOX debe tener cuatro valores válidos.');
 const endpoint=normalizeGatewayUrl(base,{allowLocal});
 const url=endpoint.includes('/functions/v1/')?endpoint:endpoint+'/v1/clip';
 const response=await fetchImpl(url,{method:'POST',
  headers:{'content-type':'application/json',...(token?{'authorization':'Bearer '+token,'apikey':token}:{})},
  body:JSON.stringify({layer,bbox}),
  signal});
 if(!response.ok){
  const data=await response.json().catch(()=>null);
  const reason=typeof data?.error?.message==='string'?data.error.message:'Error HTTP '+response.status+' del servicio SIG.';
  throw new Error(reason.slice(0,300));
 }
 const size=Number(response.headers.get('content-length')||0);
 if(size>1_600_000)throw Error('La respuesta SIG supera el límite de seguridad.');
 let bytes=0,parts=[];
 const reader=response.body?.getReader();
 if(!reader)throw Error('El servicio SIG devolvió una respuesta vacía.');
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   bytes+=value.byteLength;
   if(bytes>1_600_000){await reader.cancel();throw Error('La respuesta SIG supera el límite de seguridad.');}
   parts.push(value);
  }
 }finally{reader.releaseLock();}
 const output=new Uint8Array(bytes);let offset=0;
 for(const part of parts){output.set(part,offset);offset+=part.length;}
 const parsed=JSON.parse(new TextDecoder().decode(output));
 if(!['empty','complete'].includes(parsed.status)||!parsed.source||!parsed.clip)
  throw Error('El servicio SIG respondió con datos incompletos.');
 if(parsed.status==='complete'){
  const p=parsed.provenance;
  if(!Array.isArray(parsed.source.features)||!Array.isArray(parsed.clip.features)||
    !p||p.layer!==layer||p.hashScope!=='raw_upstream_wfs_response'||
    p.sourceCount!==parsed.source.features.length||
    p.selectedCount!==parsed.clip.features.length||
    p.queryIsProjectPerimeter!==false||
    !Array.isArray(p.queryBbox)||p.queryBbox.length!==4||
    p.queryBbox.some((x,i)=>x!==bbox[i])||
    !/^[a-f0-9]{64}$/.test(p.originalResponseSha256))
   throw Error('La respuesta SIG no superó la verificación de integridad.');
 }
 return parsed;
}
