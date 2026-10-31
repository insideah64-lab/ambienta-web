// Verify completeness and geometry-size budget of one REAL IDESA WFS polygon query.
// This is a controlled test, not a browser download or a published dataset.
import {createHash} from 'node:crypto';
const base='https://geoportal.salta.gob.ar/geoserver/wfs';
const bbox=[-66.3,-25.12,-66.1,-24.96],maxFeatures=20;
const params=new URLSearchParams({service:'WFS',version:'1.0.0',request:'GetFeature',
 typeName:'geonode:municipios',outputFormat:'application/json',srsName:'EPSG:4326',
 maxFeatures:String(maxFeatures),bbox:bbox.join(',')+',EPSG:4326'});
const url=base+'?'+params.toString();
const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
let response,bufs=[],total=0;
try{
 response=await fetch(url,{signal:controller.signal,redirect:'error'});
 if(!response.ok)throw Error('WFS HTTP '+response.status);
 if(!response.headers.get('content-type')?.includes('json'))throw Error('WFS did not return JSON');
 const reader=response.body.getReader();
 while(true){const {done,value}=await reader.read();if(done)break;
  total+=value.byteLength;
  if(total>1024*1024){await reader.cancel();throw Error('WFS response exceeds 1 MiB limit');}
  bufs.push(value);
 }
}finally{clearTimeout(timer);}
const raw=Buffer.concat(bufs.map(x=>Buffer.from(x)));
const result=JSON.parse(raw.toString('utf8'));
if(result.type!=='FeatureCollection'||!Array.isArray(result.features))throw Error('Invalid WFS GeoJSON collection');
const count=result.numberOfFeatures??result.totalFeatures??null;
if(!Number.isSafeInteger(count)||count>maxFeatures||count!==result.features.length)
 throw Error('WFS count mismatch or truncated response: '+count+' vs '+result.features.length);
if(!result.features.length)throw Error('No features at bbox');
let vertices=0;const names=[];
for(const feature of result.features){
 if(!['Polygon','MultiPolygon'].includes(feature.geometry?.type))throw Error('Not polygon');
 const rings=feature.geometry.type==='Polygon'?feature.geometry.coordinates:feature.geometry.coordinates.flat();
 for(const ring of rings)for(const p of ring){
  vertices++;if(!Number.isFinite(p[0])||!Number.isFinite(p[1]))throw Error('Nonfinite coordinate');
 }
 names.push(feature.properties?.nombre??feature.properties?.name??feature.id??'unnamed');
}
const sha256=createHash('sha256').update(raw).digest('hex');
console.log(JSON.stringify({result:'PASS',service:base,layer:'geonode:municipios',bbox,maxFeatures,
 count,features:result.features.length,vertices,names,rawBytes:raw.length,sourceSha256:sha256,
 cors:response.headers.get('access-control-allow-origin'),
 caveat:'BBOX only selects intersecting source polygons, clipping is a separate operation.'}));
