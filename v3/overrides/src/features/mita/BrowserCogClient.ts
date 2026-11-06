import {BaseClient,BaseResponse} from 'geotiff';
import {approvedBrowserAsset} from './BrowserNdviModel';

class CheckedResponse extends BaseResponse {
 constructor(private response:Response,private bytes:ArrayBuffer){super();}
 get status(){return this.response.status;}
 getHeader(name:string){return this.response.headers.get(name)||undefined;}
 async getData(){return this.bytes;}
}

/** Sentinel COG ranges only: never accept a full-scene response or retain a bad HTTP cache entry. */
export class BrowserCogClient extends BaseClient {
 constructor(url:string){super(approvedBrowserAsset(url));}
 async request({headers,signal}:RequestInit={}):Promise<BaseResponse>{
  const range=new Headers(headers).get('range'),match=range?.match(/^bytes=(\d+)-(\d+)$/);
  if(!match)throw Error('Se requiere un único rango COG.');
  const start=Number(match[1]),end=Number(match[2]),length=end-start+1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||length<1||length>8*1024**2)throw Error('Rango COG fuera del presupuesto.');
  let last:unknown;
  for(let attempt=0;attempt<2;attempt++){
   try{
    const timeout=AbortSignal.timeout(30000),r=await fetch(this.url,{headers,credentials:'omit',cache:'no-store',signal:signal?AbortSignal.any([signal,timeout]):timeout});
    if(r.status!==206){await r.body?.cancel();throw Error('La fuente no entregó un rango COG válido ('+r.status+').');}
    const bytes=await r.arrayBuffer(),contentRange=r.headers.get('content-range');
    // Content-Range is not always CORS-exposed by S3. Byte length remains independently checkable.
    if(bytes.byteLength!==length||(contentRange&&!contentRange.startsWith(`bytes ${start}-${end}/`)))throw Error('Respuesta COG incompleta o desplazada.');
    return new CheckedResponse(r,bytes);
   }catch(e){last=e;if(signal?.aborted)throw e;}
  }
  throw last;
 }
}

export async function readCogWithRecovery<T>(read:()=>Promise<T>,reopen:()=>Promise<void>,band:string,notice:()=>void):Promise<T>{
 try{return await read();}catch{notice();}
 try{await reopen();return await read();}catch(e){throw Error('No se pudo leer la banda '+band+' después del reintento. '+(e instanceof Error?e.message:String(e))+'. Podés volver a calcular; los resultados anteriores se conservan.');}
}
