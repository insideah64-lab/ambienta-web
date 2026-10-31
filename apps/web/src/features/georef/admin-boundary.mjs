// Administrative polygon import is a local QA aid. A declared institution is not proof.
// Matches IDs from Georef, not Diablillos' geographic area. WGS84/EPSG4326 only.
import {validateGeoJson} from '../maps/geojson-validate.mjs';
export const ADMIN_BOUNDARY_KEY_DIABLILLOS='ambienta-georef-boundary-diablillos-v1';
export const ADMIN_BOUNDARY_KEY_NORMAL='ambienta-georef-boundary-demo-v1';
export function adminBoundaryKey(isCase){return isCase?ADMIN_BOUNDARY_KEY_DIABLILLOS:ADMIN_BOUNDARY_KEY_NORMAL;}
export function validateAdminBoundary(input,{type,id,provinceId}={}){
 if(!['provincias','departamentos'].includes(type))throw Error('Tipo administrativo inválido.');
 if(typeof provinceId!=='string'||!/^\d{2}$/.test(provinceId))throw Error('Provincia Georef inválida.');
 if(!new RegExp(type==='provincias'?'^\\d{2}$':'^\\d{5}$').test(id))throw Error('ID administrativo inválido.');
 const parsed=validateGeoJson(input);
 const originals=input.type==='Feature'?[input]:input.features;
 if(parsed.featureCount!==1)throw Error('Importá un límite individual, no una colección de unidades.');
 const geom=parsed.geojson.features[0].geometry.type;
 if(!['Polygon','MultiPolygon'].includes(geom))throw Error('Se requiere polígono territorial, no centroide Point ni línea.');
 const first=originals[0];
 const featureId=String(first.properties?.id??first.id??'');
 if(featureId!==id)throw Error('El ID del archivo no coincide con el seleccionado en Georef.');
 const reportedProvince=String(first.properties?.provincia?.id??first.properties?.provincia_id??'');
 if(type==='departamentos'&&reportedProvince&&reportedProvince!==provinceId)throw Error('El límite se declara de otra provincia.');
 if(type==='provincias'&&id!==provinceId)throw Error('El polígono no coincide con la provincia seleccionada.');
 const normalized={...parsed.geojson,features:[{...parsed.geojson.features[0],properties:{
  ...parsed.geojson.features[0].properties,id,provincia:{id:provinceId}
 }}]};
 return {geojson:normalized,bounds:parsed.bounds,featureCount:1,coordinateCount:parsed.coordinateCount,
  admin:{type,id,provinceId},verification:'operator_declared_unverified'};
}
export function readAdminBoundary(key){
 try{
  const v=localStorage.getItem(key);
  if(!v||v.length>1400000)return null;
  const r=JSON.parse(v);
  if(!/^[0-9a-f]{64}$/.test(r.sha256)||!r.sourceUrl||!r.savedAt)return null;
  const checked=validateAdminBoundary(r.geojson,r.admin);
  return {...r,...checked};
 }catch{return null;}
}
