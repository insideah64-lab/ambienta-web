// Official Argenmap TMS endpoints as documented by Instituto Geográfico Nacional.
// TMS uses inverted Y, therefore MapLibre must use scheme:'tms' with {y} placeholder.
// These are visual raster basemaps, NOT usable topology or vector polygons.
export const IGN_DOCS='https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/ServiciosOGC';
export const IGN_WFS='https://wms.ign.gob.ar/geoserver/ows?service=wfs&version=1.1.0&request=GetCapabilities';
export const IGN_MAPS={
 'ign':{
  label:'IGN · Argenmap',attribution:'© Instituto Geográfico Nacional · Argenmap',
  template:'https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG%3A3857@png/{z}/{x}/{y}.png'
 },
 'ign-topo':{
  label:'IGN · Topográfico',attribution:'© Instituto Geográfico Nacional · Argenmap topográfico',
  template:'https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/mapabase_topo@EPSG%3A3857@png/{z}/{x}/{y}.png'
 }
};
export function buildIgnRasterSource(mode){
 const chosen=IGN_MAPS[mode];
 if(!chosen)throw Error('Mapa base IGN no reconocido.');
 return {type:'raster',tiles:[chosen.template],tileSize:256,scheme:'tms',
  attribution:chosen.attribution,minzoom:0,maxzoom:18};
}
export function ignLayerId(mode){
 if(!IGN_MAPS[mode])throw Error('Modo de mapa IGN inválido.');
 return 'ign-raster-'+mode;
}
