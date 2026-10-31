// Diagnostic only: bounded official IGN WFS GetFeature probes (no base-wide download).
// No claimed availability until verified by live network output.
const ENDPOINTS=['https://wms.ign.gob.ar/geoserver/ows','https://wms.ign.gob.ar/geoserver/wfs'];
const TYPES=['ideign:DEPARTAMENTOS','idera:departamento'];
const BBOX='-66.30,-25.12,-66.10,-24.96,EPSG:4326';
const attempts=[];
for(const endpoint of ENDPOINTS)for(const typeName of TYPES){
 const p=new URLSearchParams({service:'WFS',version:'1.0.0',request:'GetFeature',
  typeName,outputFormat:'application/json',srsName:'EPSG:4326',
  maxFeatures:'1',bbox:BBOX});
 const url=endpoint+'?'+p.toString();
 const attempt={endpoint,typeName,url,status:null,contentType:null,cors:null,bytes:0,
  featureCount:null,geometry:null,issue:null};
 try{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),16000);
  try{
   const response=await fetch(url,{signal:controller.signal,redirect:'follow'});
   attempt.status=response.status;attempt.contentType=response.headers.get('content-type');
   attempt.cors=response.headers.get('access-control-allow-origin');
   let bytes=0,chunks=[];const reader=response.body?.getReader();
   if(!reader)throw Error('Sin cuerpo de respuesta');
   while(true){
    const {done,value}=await reader.read();if(done)break;
    bytes+=value.byteLength;
    if(bytes>1600000){await reader.cancel();throw Error('Respuesta mayor que 1,6 MB (bloqueada)');}
    chunks.push(value);
   }
   attempt.bytes=bytes;
   const body=new TextDecoder().decode(Uint8Array.from(chunks.flatMap(c=>[...c])));
   const start=body.slice(0,220);
   if(!response.ok){attempt.issue='HTTP '+response.status+' '+start;continue;}
   if(!body.trimStart().startsWith('{')){attempt.issue='No GeoJSON: '+start;continue;}
   const obj=JSON.parse(body);
   attempt.featureCount=obj.features?.length??null;
   attempt.geometry=obj.features?.[0]?.geometry?.type??null;
   if(!Array.isArray(obj.features))attempt.issue='Sin arreglo de features';
  }finally{clearTimeout(timer);}
 }catch(e){attempt.issue=String(e.message||e);}
 attempts.push(attempt);
}
console.log(JSON.stringify({source:'IGN WFS GetFeature with BBOX of Cachi centroid',attempts},null,2));
