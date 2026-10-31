import {assert,assertEquals,assertRejects} from 'jsr:@std/assert@1.0.15';
import {reserveSharedQuota} from './quota.ts';
const projectUrl='https://rqzeejnhszbbohaqdpgp.supabase.co';
const serviceKey='server-only-placeholder-never-commit-key';
const fake=(data:unknown,status=200)=>async(input:RequestInfo|URL,init?:RequestInit)=>{
 assertEquals(String(input),projectUrl+'/rest/v1/rpc/ambienta_sig_reserve_quota');
 assertEquals(init?.method,'POST');
 assertEquals(init?.redirect,'error');
 assertEquals(JSON.parse(String(init?.body)),{p_layer:'municipios'});
 assertEquals((init?.headers as Record<string,string>).apikey,serviceKey);
 return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
};
const options=(fetchImpl:typeof fetch)=>({fetchImpl,projectUrl,serviceKey});
Deno.test('accepts only a strict, verified global Postgres budget',async()=>{
 const result=await reserveSharedQuota('municipios',options(fake({
  allowed:true,policy:'global_shared',periodsSeconds:[60,3600,86400]
 }) as typeof fetch));
 assertEquals(result.policy,'global_shared');
});
Deno.test('refuses provider calls after shared minute/hour/day budget exhaustion',async()=>{
 try{await reserveSharedQuota('municipios',options(fake({
  allowed:false,reason:'GLOBAL_BUDGET_EXHAUSTED',retryAfterSeconds:58
 }) as typeof fetch));throw Error('Expected 429');}
 catch(e){assertEquals((e as {status:number}).status,429);
  assertEquals((e as {retryAfterSeconds:number}).retryAfterSeconds,58);}
});
Deno.test('rejects missing backend credentials, bogus project and unauthorized layer',async()=>{
 await assertRejects(()=>reserveSharedQuota('municipios',{projectUrl,serviceKey:''}),Error);
 await assertRejects(()=>reserveSharedQuota('municipios',{
  projectUrl:'https://evil.example',serviceKey
 }),Error);
 await assertRejects(()=>reserveSharedQuota('wrong' as 'municipios',options(fake({}) as typeof fetch)),Error);
});
Deno.test('fails closed for invalid or non-200 quota responses and network failure',async()=>{
 for(const response of [
  fake({allowed:true,policy:'unverified',periodsSeconds:[]}),
  fake({allowed:false,reason:'GLOBAL_BUDGET_EXHAUSTED',retryAfterSeconds:999999}),
  fake({message:'server error'},503),
  async()=>{throw Error('network down')}
 ])await assertRejects(()=>reserveSharedQuota('municipios',options(response as typeof fetch)),Error);
});
