// Bounded WFS GetFeature QA for official IDESA Salta layers discovered on 2026-10-31.
// Maximum two features per query and at most 1.5 MiB of response bytes.
const ENDPOINT='https://geoportal.salta.gob.ar/geoserver/wfs';
const items=[
 {name:'geonode:municipios',bbox:[-66.30,-25.12,-66.10,-24.96]},
 {name:'geonode:pob2022_deptos',bbox:[-66.30,-25.12,-66.10,-24.96]},
 {name:'geonode:otbn_2009_ll',bbox:[-63.20,-22.95,-62.75,-22.55]},
 {name:'geonode:unid_veg_cabral_etal_2009',bbox:[-63.20,-22.95,-62.75,-22.55]},
 {name:'geonode:zona_vida_arg',bbox:[-66.30,-25.12,-66.10,-24.96]}
];
for(const item of items){
 const q=new URLSearchParams({service:'WFS',version:'1.0.0',request:'GetFeature',typeName:item.name,
  outputFormat:'application/json',srsName:'EPSG:4326',maxFeatures:'2',
  bbox:item.bbox.join(',')+',EPSG:4326'});
 const url=ENDPOINT+'?'+q.toString(),data={layer:item.name,bbox:item.bbox,url,http:null,contentType:null,
   cors:null,bytes:0,featureCount:null,types:[],names:[],err:null,featuresReported:null};
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(url,{signal:controller.signal});
  data.http=response.status;data.contentType=response.headers.get('content-type');
  data.cors=response.headers.get('access-control-allow-origin');
  let text='';const decoder=new TextDecoder();const reader=response.body?.getReader();if(!reader)throw Error('empty stream');
  while(true){
   const {done,value}=await reader.read();if(done)break;
   data.bytes+=value.byteLength;
   if(data.bytes>1500000){await reader.cancel();throw Error('response exceeds 1.5MB safety limit');}
   text+=decoder.decode(value,{stream:true});
  }
  if(!response.ok||!text.trimStart().startsWith('{'))throw Error('Invalid/non-GeoJSON response: '+text.slice(0,130));
  const json=JSON.parse(text);if(!Array.isArray(json.features))throw Error('Not FeatureCollection');
  data.featureCount=json.features.length;
  data.featuresReported=json.totalFeatures??json.numberOfFeatures??null;
  data.types=json.features.map(f=>f.geometry?.type);
  data.names=json.features.map(f=>f.properties?.nombre||f.properties?.name||f.id||'no-name').slice(0,3);
 }catch(e){data.err=String(e.message||e)+' '+String(e.cause?.message||'');}
 finally{clearTimeout(timer);}
 console.log(JSON.stringify(data));
}
