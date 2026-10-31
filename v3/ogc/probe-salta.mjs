// Bounded experimental discovery of an official IDESA Salta WFS catalogue.
// Inspect only metadata, not bulk feature collections. Never mark a layer verified until tested.
const endpoints=[
 'https://geoportal.salta.gob.ar/geoserver/wfs',
 'https://geoportal.salta.gob.ar/geoserver/ows'
];
for(const endpoint of endpoints){
 const url=endpoint+'?'+new URLSearchParams({service:'WFS',version:'1.1.0',request:'GetCapabilities'});
 const item={endpoint,url,http:null,mime:null,bytes:0,cors:null,matchingNames:[],error:null};
 const aborter=new AbortController();
 const timer=setTimeout(()=>aborter.abort(),14000);
 try{
  const r=await fetch(url,{signal:aborter.signal});
  item.http=r.status;item.mime=r.headers.get('content-type');
  item.cors=r.headers.get('access-control-allow-origin');
  if(!r.body)throw Error('No response stream');
  const reader=r.body.getReader();const decoder=new TextDecoder();let raw='';
  while(true){
   const {done,value}=await reader.read();if(done)break;
   item.bytes+=value.byteLength;
   if(item.bytes>2500000){await reader.cancel();throw Error('Capabilities >2.5 MB: scan denied');}
   raw+=decoder.decode(value,{stream:true});
  }
  // Extract a bounded list of advertised WFS FeatureType identifiers.
  const ids=[...raw.matchAll(/<(?:(?:[a-zA-Z0-9]+):)?FeatureType\b[\s\S]*?<(?:(?:[a-zA-Z0-9]+):)?Name>([^<]+)<\/(?:(?:[a-zA-Z0-9]+):)?Name>/g)]
    .map(m=>m[1]).filter(n=>/depart|limite|cuenca|rio|agua|hidro|provincia/i.test(n));
  item.matchingNames=ids.slice(0,45);
  if(!r.ok)item.error='HTTP '+r.status+' '+raw.slice(0,140);
  else if(!/<(?:[a-zA-Z0-9]+:)?WFS_Capabilities/.test(raw))item.error='Not WFS XML: '+raw.slice(0,170);
 }catch(e){item.error=String(e.message||e)+' | '+String(e.cause?.message||'');}
 finally{clearTimeout(timer);}
 console.log(JSON.stringify(item,null,2));
}
