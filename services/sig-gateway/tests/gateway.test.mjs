import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {createHandler,validateRequest,upstreamUrl,retrieveAndClip} from '../gateway.mjs';
const BBOX=[0,0,3,3];
const closed=[[-1,-1],[4,-1],[4,4],[-1,4],[-1,-1]];
const feature=(geometry,properties={nombre:'Polígono oficial de laboratorio',secretField:'no propagar'})=>({
 type:'Feature',properties,geometry});
const polygon=feature({type:'Polygon',coordinates:[closed]});
const source=(features=[polygon],extra={})=>({type:'FeatureCollection',totalFeatures:features.length,features,...extra});
const mock=(obj,opts={})=>async(url,request)=>{
 assert(url.startsWith('https://geoportal.salta.gob.ar/geoserver/wfs?'),'Allowlisted WFS only');
 assert.equal(request.redirect,'error');
 assert.equal(request.method,'GET');
 return new Response(opts.raw??JSON.stringify(obj),{status:opts.status??200,headers:{'content-type':opts.contentType??'application/json'}});
};
const req={layer:'municipios',bbox:BBOX};
async function serverFor(fetchImpl){
 const server=createServer(createHandler({fetchImpl}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(resolve=>server.close(resolve))};
}
async function post(base,data,headers={}){
 const response=await fetch(base+'/v1/clip',{method:'POST',
  headers:{'content-type':'application/json',origin:'https://insideah64-lab.github.io',...headers},
  body:JSON.stringify(data)});
 return {status:response.status,json:await response.json(),headers:response.headers};
}
test('only exact named IDESA layers and bounded finite BBOX accepted',()=>{
 assert.deepEqual(validateRequest(req),req);
 for(const layer of ['../../etc/passwd','https://example.org','__proto__','Municipios',null])
  assert.throws(()=>validateRequest({layer,bbox:BBOX}),/capa/i);
 for(const bbox of [[1,1,0,2],[0,0,1,1],[0,0,Infinity,3],[0,0,0,1],[0,0,1],['0',0,1,2]])
  assert.throws(()=>validateRequest({layer:'municipios',bbox}),/ventana/i);
 assert.throws(()=>validateRequest({...req,url:'https://evil.com'}),/Solo se aceptan/);
 assert.match(upstreamUrl(req),/maxFeatures=20/);
 assert.match(upstreamUrl(req),/typeName=geonode%3Amunicipios/);
 assert(!upstreamUrl(req).includes('localhost'));
});
test('fully reported Polygon intersects BBOX, preserves raw SHA and sanitizes source',async()=>{
 const s=source(),raw=JSON.stringify(s);
 const result=await retrieveAndClip(req,{fetchImpl:mock(s),now:()=>new Date('2026-10-31T20:00:00Z')});
 assert.equal(result.status,'complete');
 assert.equal(result.provenance.sourceCount,1);
 assert.equal(result.provenance.selectedCount,1);
 assert.equal(result.provenance.originalResponseSha256,createHash('sha256').update(raw).digest('hex'));
 assert.equal(result.provenance.hashScope,'raw_upstream_wfs_response');
 assert.equal(result.provenance.queryIsProjectPerimeter,false);
 assert.equal(result.provenance.fetchedAt,'2026-10-31T20:00:00.000Z');
 assert.deepEqual(result.source.features[0].properties,{name:'Polígono oficial de laboratorio'});
 assert.equal(result.clip.features[0].geometry.type,'Polygon');
 for(const ring of result.clip.features[0].geometry.coordinates)for(const [x,y] of ring)
  assert(x>=0&&x<=3&&y>=0&&y<=3);
});
test('hole clipping retains ring and yields correct planar area',async()=>{
 const outer=[[-2,-2],[5,-2],[5,5],[-2,5],[-2,-2]];
 const hole=[[1,1],[2,1],[2,2],[1,2],[1,1]];
 const result=await retrieveAndClip(req,{fetchImpl:mock(source([
  feature({type:'Polygon',coordinates:[outer,hole]})
 ]))});
 assert.equal(result.clip.features[0].geometry.coordinates.length,2);
});
test('truncated, missing and inconsistent count never return a clipped result',async()=>{
 for(const invalid of [
  source([polygon],{totalFeatures:2}),
  source([polygon],{totalFeatures:21}),
  {type:'FeatureCollection',features:[polygon]},
  source([polygon],{totalFeatures:'unknown'})
 ]){
  await assert.rejects(()=>retrieveAndClip(req,{fetchImpl:mock(invalid)}),e=>[409].includes(e.status));
 }
});
test('source >1MiB blocked before geometry JSON parse',async()=>{
 const response=new Response('x'.repeat(1_048_600),{headers:{'content-type':'application/json'}});
 await assert.rejects(()=>retrieveAndClip(req,{fetchImpl:async()=>response}),e=>e.code==='SOURCE_TOO_LARGE');
});
test('topology failure rejects instead of silently excluding an invalid source',async()=>{
 const bowtie=[[-1,-1],[4,4],[-1,4],[4,-1],[-1,-1]];
 await assert.rejects(()=>retrieveAndClip(req,{fetchImpl:mock(source([
  feature({type:'Polygon',coordinates:[bowtie]})
 ]))}),e=>e.code==='TOPOLOGY_REVIEW');
});
test('GeoServer redirects, service errors and XML fail closed',async()=>{
 await assert.rejects(()=>retrieveAndClip(req,{fetchImpl:async()=>{throw Error('redirect');}}),e=>e.code==='PROVIDER_UNAVAILABLE');
 await assert.rejects(()=>retrieveAndClip(req,{fetchImpl:mock({}, {status:500})}),e=>e.code==='PROVIDER_ERROR');
 await assert.rejects(()=>retrieveAndClip(req,{fetchImpl:mock({}, {contentType:'application/xml'})}),e=>e.code==='INVALID_PROVIDER_FORMAT');
});
test('public HTTP gateway CORS restricted and /health exposed safely',async()=>{
 const service=await serverFor(mock(source()));
 try{
  const health=await fetch(service.url+'/v1/health');
  assert.equal(health.status,200);
  assert.equal((await health.json()).status,'ok');
  const unauthorized=await post(service.url,req,{origin:'https://evil.example'});
  assert.equal(unauthorized.status,403);
  assert.equal(unauthorized.headers.get('access-control-allow-origin'),null);
  const options=await fetch(service.url+'/v1/clip',{method:'OPTIONS',headers:{origin:'https://insideah64-lab.github.io'}});
  assert.equal(options.status,204);
  assert.equal(options.headers.get('access-control-allow-origin'),'https://insideah64-lab.github.io');
  const good=await post(service.url,req);
  assert.equal(good.status,200);
  assert.equal(good.json.status,'complete');
  assert.equal(good.headers.get('cache-control'),'no-store');
 }finally{await service.close();}
});
test('public HTTP gateway returns clear 409 for incomplete WFS selection',async()=>{
 const service=await serverFor(mock(source([polygon],{totalFeatures:4})));
 try{
  const result=await post(service.url,req);
  assert.equal(result.status,409);
  assert.equal(result.json.error.code,'INCOMPLETE_SOURCE');
  assert(!result.json.clip);
 }finally{await service.close();}
});
test('empty provider selection has provenance and no invented geometries',async()=>{
 const result=await retrieveAndClip(req,{fetchImpl:mock(source([]))});
 assert.equal(result.status,'empty');
 assert.equal(result.source.features.length,0);
 assert.equal(result.clip.features.length,0);
});
