// Geographic query window only; never a verified project perimeter.
export const AOI_KEY_DIABLILLOS='ambienta-aoi-diablillos-v1';
export const AOI_KEY_DEMO='ambienta-aoi-demo-v1';
export const aoiKey=diablillos=>diablillos?AOI_KEY_DIABLILLOS:AOI_KEY_DEMO;
export function createPointAoi(lat,lon,radiusKm){
 for(const [n,label] of [[lat,'Latitud'],[lon,'Longitud'],[radiusKm,'Radio']]){
  if(typeof n!=='number'||!Number.isFinite(n))throw Error(label+' debe ser numérico y finito.');
 }
 if(lat< -85||lat>85)throw Error('Latitud fuera de rango (-85 a 85).');
 if(lon< -180||lon>180)throw Error('Longitud fuera de rango (-180 a 180).');
 if(radiusKm<0.1||radiusKm>100)throw Error('Radio de consulta: entre 0,1 y 100 km.');
 const dy=radiusKm/111.195,dx=radiusKm/(111.195*Math.cos(lat*Math.PI/180));
 const bbox=[lon-dx,lat-dy,lon+dx,lat+dy].map(n=>Number(n.toFixed(9)));
 if(bbox[0]<-180||bbox[2]>180||bbox[1]<-90||bbox[3]>90)
  throw Error('La ventana cruza el antimeridiano o los polos: requiere SIG especializado.');
 return {kind:'point_bbox',center:{lat,lon},radiusKm,bbox,crs:'EPSG:4326',
  verification:'operator_declared_not_project_perimeter'};
}
export function readPointAoi(key){
 try{
  const raw=localStorage.getItem(key);
  if(!raw||raw.length>1400)return null;
  const v=JSON.parse(raw);
  if(v?.kind!=='point_bbox'||v?.verification!=='operator_declared_not_project_perimeter'||typeof v.savedAt!=='string')return null;
  const check=createPointAoi(v.center?.lat,v.center?.lon,v.radiusKm);
  if(!Array.isArray(v.bbox)||v.bbox.length!==4||check.bbox.some((n,i)=>Math.abs(n-v.bbox[i])>1e-7))return null;
  return {...check,savedAt:v.savedAt};
 }catch{return null;}
}
export function aoiRectangle(aoi){
 const [w,s,e,n]=aoi.bbox;
 return {type:'FeatureCollection',features:[{type:'Feature',
  properties:{name:'Ventana de consulta, NO perímetro del proyecto'},
  geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}}]};
}
