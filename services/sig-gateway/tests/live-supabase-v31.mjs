import assert from 'node:assert/strict';
import {SIG_API_ANON} from '../../../v3/overrides/src/features/maps/sig-gateway-config.mjs';
const root='https://rqzeejnhszbbohaqdpgp.supabase.co';
const endpoint=root+'/functions/v1/ambienta-sig-v31';
const bbox=[-66.222472174,-25.056742206,-66.182768004,-25.020769366];
const origin='https://insideah64-lab.github.io';
const headers={apikey:SIG_API_ANON,authorization:'Bearer '+SIG_API_ANON,
 'content-type':'application/json',origin};
const health=await fetch(endpoint,{headers,signal:AbortSignal.timeout(12000)});
assert.equal(health.status,200,'v31 health requires valid JWT');
const descriptor=await health.json();
assert.equal(descriptor.budget,'postgres_shared');
const preflight=await fetch(endpoint,{method:'OPTIONS',headers:{
 origin,'Access-Control-Request-Method':'POST',
 'Access-Control-Request-Headers':'authorization,apikey,content-type'
},signal:AbortSignal.timeout(12000)});
assert.equal(preflight.status,204);
assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
const response=await fetch(endpoint,{method:'POST',headers,
 body:JSON.stringify({layer:'municipios',bbox}),signal:AbortSignal.timeout(22000)});
const output=await response.json();
if(response.status!==200)console.log('v31 error',JSON.stringify({status:response.status,error:output.error}));
assert.equal(response.status,200,'v31 authenticated gateway should reserve Postgres quota and clip');
assert.equal(output.status,'complete');
assert(output.provenance.sourceCount>=1);
assert(output.provenance.selectedCount>=1);
assert.equal(output.provenance.hashScope,'raw_upstream_wfs_response');
assert.equal(output.provenance.queryIsProjectPerimeter,false);
assert.deepEqual(output.provenance.queryBbox,bbox);
const forbidden=await fetch(root+'/rest/v1/rpc/ambienta_sig_reserve_quota',{
 method:'POST',headers,body:JSON.stringify({p_layer:'municipios'}),signal:AbortSignal.timeout(10000)});
assert(!forbidden.ok,'anon/public key must NOT be able to reserve server budget via PostgREST');
const unknown=await fetch(endpoint,{method:'POST',headers,
 body:JSON.stringify({layer:'arbitrary_url',bbox}),signal:AbortSignal.timeout(11000)});
assert.equal(unknown.status,400);
console.log(JSON.stringify({result:'PASS',backend:'Supabase Edge v3.1 with Postgres shared quotas',
 sharedBudget:descriptor.budget,sourceCount:output.provenance.sourceCount,
 selectedCount:output.provenance.selectedCount,anonDirectRpcBlocked:forbidden.status,
 wfsType:output.provenance.typeName}));
