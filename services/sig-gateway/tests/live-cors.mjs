import assert from 'node:assert/strict';
const endpoint='https://rqzeejnhszbbohaqdpgp.supabase.co/functions/v1/ambienta-sig-v3';
const origin='https://insideah64-lab.github.io';
const response=await fetch(endpoint,{method:'OPTIONS',
 headers:{Origin:origin,'Access-Control-Request-Method':'POST',
 'Access-Control-Request-Headers':'authorization,apikey,content-type'},
 signal:AbortSignal.timeout(12000)});
const allowOrigin=response.headers.get('access-control-allow-origin');
const allowMethods=response.headers.get('access-control-allow-methods');
const allowHeaders=response.headers.get('access-control-allow-headers');
console.log(JSON.stringify({status:response.status,allowOrigin,allowMethods,allowHeaders}));
assert.equal(response.status,204,'Browser CORS preflight MUST be accessible before JWT auth');
assert.equal(allowOrigin,origin,'Browser Origin must be explicitly allowed');
assert.match(allowMethods||'',/POST/i);
assert.match(allowHeaders||'',/authorization/i);
