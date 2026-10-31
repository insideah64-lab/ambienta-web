// Official IDESA Salta WFS URLs generated from an operator-defined AOI.
// These links open the provider service: the browser cannot use CORS to read its GeoJSON.
// A returned WFS FeatureCollection must pass completeness checks before import/export.
export const IDESA_WFS_ENDPOINT='https://geoportal.salta.gob.ar/geoserver/wfs';
export const IDESA_WFS_CAPABILITIES=IDESA_WFS_ENDPOINT+'?service=WFS&version=1.1.0&request=GetCapabilities';
export const IDESA_LAYERS=Object.freeze({
 municipios:{typeName:'geonode:municipios',label:'Municipios · IDESA Salta'},
 otbn:{typeName:'geonode:otbn_2009_ll',label:'Ordenamiento territorial de bosques nativos · OTBN 2009'},
 vegetacion:{typeName:'geonode:unid_veg_cabral_etal_2009',label:'Unidades de vegetación · Cabral et al. 2009'}
});
export const WFS_FEATURE_LIMIT=20;
export function buildIdesaWfsUrl(bbox,layer='municipios'){
 if(!Object.hasOwn(IDESA_LAYERS,layer))throw Error('Capa IDESA no autorizada.');
 if(!Array.isArray(bbox)||bbox.length!==4||bbox.some(x=>typeof x!=='number'||!Number.isFinite(x)))
  throw Error('Ventana BBOX inválida.');
 const [west,south,east,north]=bbox;
 if(west< -180||east>180||south< -90||north>90||west>=east||south>=north)
  throw Error('Coordenadas de consulta WGS84 inválidas.');
 const q=new URLSearchParams({
  service:'WFS',version:'1.0.0',request:'GetFeature',
  typeName:IDESA_LAYERS[layer].typeName,outputFormat:'application/json',
  srsName:'EPSG:4326',maxFeatures:String(WFS_FEATURE_LIMIT),
  bbox:bbox.join(',')+',EPSG:4326'
 });
 return IDESA_WFS_ENDPOINT+'?'+q;
}
