import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeGatewayUrl,requestOfficialPolygons} from '../../apps/web-v3/src/features/maps/sig-gateway-client.mjs';

const base='https://rqzeejnhszbbohaqdpgp.supabase.co/functions/v1/ambienta-sig-v31';
const bbox=[-66.22,-25.05,-66.18,-25.02];
test('Supabase Edge gateway URL is fixed and credentials cannot enter route',()=>{
 assert.equal(normalizeGatewayUrl(base),base);
 assert.throws(()=>normalizeGatewayUrl(base+'?url=https://evil.test'),/credenciales/);
 assert.throws(()=>normalizeGatewayUrl('http://example.org'),/HTTPS/);
 assert.throws(()=>normalizeGatewayUrl('https://rqzeejnhszbbohaqdpgp.supabase.co/functions/v1/wrong-function'),/Ruta/);
 assert.throws(()=>normalizeGatewayUrl('https://example.org/evil'),/Ruta/);
 assert.throws(()=>normalizeGatewayUrl('https://user:password@example.org'),/credenciales/);
});
test('client sends bounded JSON with explicitly scoped anon authorization',async()=>{
 const fixture={status:'complete',source:{type:'FeatureCollection',features:[{
  type:'Feature',geometry:{type:'Polygon',coordinates:[[[-66.22,-25.05],[-66.18,-25.05],[-66.18,-25.02],[-66.22,-25.02],[-66.22,-25.05]]]},properties:{name:'Cachi'}}]},
 clip:{type:'FeatureCollection',features:[{type:'Feature',properties:{name:'Cachi'},geometry:{type:'Polygon',
 coordinates:[[[-66.22,-25.05],[-66.18,-25.05],[-66.18,-25.02],[-66.22,-25.02],[-66.22,-25.05]]]}}]},
 provenance:{layer:'municipios',hashScope:'raw_upstream_wfs_response',sourceCount:1,selectedCount:1,
 queryIsProjectPerimeter:false,queryBbox:bbox,originalResponseSha256:'a'.repeat(64)}};
 const call=async(url,options)=>{
  assert.equal(url,base);
  assert.equal(options.method,'POST');
  assert.deepEqual(JSON.parse(options.body),{layer:'municipios',bbox});
  assert.equal(options.headers.authorization,'Bearer public-only-test');
  assert.equal(options.headers.apikey,'public-only-test');
  return new Response(JSON.stringify(fixture),{headers:{'content-type':'application/json'}});
 };
 const output=await requestOfficialPolygons(base,'municipios',bbox,{fetchImpl:call,token:'public-only-test'});
 assert.equal(output.status,'complete');
});
test('client rejects mismatched provenance or unapproved layer',async()=>{
 await assert.rejects(()=>requestOfficialPolygons(base,'malicious',bbox),/no está autorizada/);
 await assert.rejects(()=>requestOfficialPolygons(base,'municipios',bbox,{fetchImpl:async()=>new Response(
 JSON.stringify({status:'complete',source:{features:[]},clip:{features:[]},provenance:{}}),
 {headers:{'content-type':'application/json'}})}),/integridad/);
});
