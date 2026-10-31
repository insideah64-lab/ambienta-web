import test from 'node:test';
import assert from 'node:assert/strict';
import {buildIdesaWfsUrl,WFS_FEATURE_LIMIT,IDESA_WFS_ENDPOINT} from '../../apps/web-v3/src/features/maps/idesa-wfs.mjs';
import {validateGeoJson} from '../../apps/web-v3/src/features/maps/geojson-validate.mjs';

const bbox=[-66.30,-25.12,-66.10,-24.96];
const polygon={type:'Feature',properties:{name:'Municipio QA',arbitrary:'no propagar'},
 geometry:{type:'Polygon',coordinates:[[[-66.2,-25.1],[-66.1,-25.1],[-66.1,-25.0],[-66.2,-25.0],[-66.2,-25.1]]]}};
test('URL oficial WFS por BBOX sin permitir endpoints ni capas arbitrarias',()=>{
 const input=[...bbox];
 const url=new URL(buildIdesaWfsUrl(bbox,'municipios'));
 assert.equal(url.origin,'https://geoportal.salta.gob.ar');
 assert.equal(url.pathname,'/geoserver/wfs');
 assert.equal(url.searchParams.get('request'),'GetFeature');
 assert.equal(url.searchParams.get('typeName'),'geonode:municipios');
 assert.equal(url.searchParams.get('bbox'),'-66.3,-25.12,-66.1,-24.96,EPSG:4326');
 assert.equal(url.searchParams.get('maxFeatures'),String(WFS_FEATURE_LIMIT));
 assert.equal(url.searchParams.get('srsName'),'EPSG:4326');
 assert.equal(url.origin+url.pathname,IDESA_WFS_ENDPOINT);
 assert.deepEqual(bbox,input);
});
test('WFS solo autoriza capas enumeradas y rechaza extensión errónea',()=>{
 for(const layer of ['../../private','x:y','',null])assert.throws(()=>buildIdesaWfsUrl(bbox,layer),/no autorizada/);
 for(const bb of [[10,10,0,0],[-181,-25,-60,-24],[0,0,Infinity,2],[0,0,0,1],[]])
  assert.throws(()=>buildIdesaWfsUrl(bb,'municipios'),/inválid/);
 assert.match(buildIdesaWfsUrl(bbox,'otbn'),/otbn_2009_ll/);
 assert.match(buildIdesaWfsUrl(bbox,'vegetacion'),/unid_veg/);
});
test('WFS parcial se rechaza: no se presenta como recorte definitivo',()=>{
 for(const count of [2,'2']){
  assert.throws(()=>validateGeoJson({type:'FeatureCollection',numberOfFeatures:count,features:[polygon]}),
   /consulta WFS incompleta/);
 }
 assert.throws(()=>validateGeoJson({type:'FeatureCollection',totalFeatures:5,features:[polygon]}),
   /consulta WFS incompleta/);
 assert.throws(()=>validateGeoJson({type:'FeatureCollection',numberMatched:'unknown',features:[polygon]}),
   /no informa cantidad total/);
});
test('WFS completo mantiene geometría y depura campos no aprobados',()=>{
 const input={type:'FeatureCollection',numberOfFeatures:1,numberReturned:1,features:[polygon]};
 const copy=JSON.stringify(input), result=validateGeoJson(input);
 assert.equal(result.featureCount,1);
 assert.equal(result.geojson.features[0].geometry.type,'Polygon');
 assert.deepEqual(result.geojson.features[0].properties,{name:'Municipio QA'});
 assert.equal(JSON.stringify(input),copy);
});
