// Shared Postgres budget for Supabase Edge. Only the Edge runtime reads
// SUPABASE_SERVICE_ROLE_KEY; this file is NEVER compiled into the public website.
export type Layer='municipios'|'otbn'|'vegetacion';
export type SharedBudget={allowed:true;policy:'global_shared';periodsSeconds:number[]};
export type QuotaError=Error&{status:number;code:string;retryAfterSeconds?:number};
const PROJECT_API='https://rqzeejnhszbbohaqdpgp.supabase.co';
const RPC_PATH='/rest/v1/rpc/ambienta_sig_reserve_quota';
function problem(status:number,code:string,message:string,retryAfterSeconds?:number):QuotaError{
 return Object.assign(new Error(message),{status,code,...(retryAfterSeconds?{retryAfterSeconds}:{})});
}
export async function reserveSharedQuota(layer:Layer,{
 fetchImpl=fetch,projectUrl=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
}:{
 fetchImpl?:typeof fetch;projectUrl?:string;serviceKey?:string
}={}):Promise<SharedBudget>{
 if(!['municipios','otbn','vegetacion'].includes(layer))
  throw problem(400,'UNKNOWN_LAYER','La capa solicitada no está autorizada.');
 if(projectUrl!==PROJECT_API||!serviceKey||serviceKey.length<30)
  throw problem(503,'QUOTA_UNAVAILABLE','El control central de consumo no está disponible.');
 let response:Response;
 try{
  response=await fetchImpl(PROJECT_API+RPC_PATH,{
   method:'POST',redirect:'error',headers:{
    'content-type':'application/json','accept':'application/json',
    'apikey':serviceKey,'authorization':'Bearer '+serviceKey
   },body:JSON.stringify({p_layer:layer}),signal:AbortSignal.timeout(3500)
  });
 }catch{throw problem(503,'QUOTA_UNAVAILABLE','El control central de consumo no respondió.');}
 if(!response.ok)
  throw problem(503,'QUOTA_UNAVAILABLE','El control central de consumo rechazó la solicitud.');
 let budget:unknown;
 try{budget=await response.json();}catch{
  throw problem(503,'QUOTA_UNAVAILABLE','El control de consumo devolvió datos inválidos.');
 }
 if(!budget||typeof budget!=='object'||Array.isArray(budget))
  throw problem(503,'QUOTA_UNAVAILABLE','El control de consumo devolvió un estado inválido.');
 const data=budget as Record<string,unknown>;
 if(data.allowed===true&&data.policy==='global_shared'&&Array.isArray(data.periodsSeconds))
  return data as SharedBudget;
 if(data.allowed===false&&data.reason==='GLOBAL_BUDGET_EXHAUSTED'&&
  Number.isInteger(data.retryAfterSeconds)&&Number(data.retryAfterSeconds)>=1&&
  Number(data.retryAfterSeconds)<=86400)
   throw problem(429,'SHARED_RATE_LIMIT',
    'Se alcanzó el cupo compartido de consultas SIG. Volvé a intentar más tarde.',
    Number(data.retryAfterSeconds));
 throw problem(503,'QUOTA_UNAVAILABLE','No se pudo comprobar el cupo SIG.');
}
