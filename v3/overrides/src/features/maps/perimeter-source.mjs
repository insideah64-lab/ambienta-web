// AMBIENTA V3.5.2 — user-declared perimeter source; independent from AOI and GIS working layers.
// Imports/drawings are NOT certified land, mining, environmental or cadastral boundaries.
import {validateGeoJson} from './geojson-validate.mjs';
import {clipGeoJsonToBbox} from './aoi-clip.mjs';
import {createPointAoi} from './aoi-model.mjs';
export const perimeterKey=isDiablillos=>isDiablillos?'ambienta-perimeter-diablillos-v352':'ambienta-perimeter-demo-v352';
export const perimeterHistoryKey=isDiablillos=>isDiablillos?'ambienta-perimeter-backups-diablillos-v352':'ambienta-perimeter-backups-demo-v352';
const SHA=/^[a-f0-9]{64}$/;
const fail=m=>{throw Error('Perímetro: '+m);};
const isPolygon=g=>g?.type==='Polygon'||g?.type==='MultiPolygon';
const safeName=x=>typeof x==='string'&&x.trim().length>0&&x.length<=180;
const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
export function polygonFromVertices(vertices){
 if(!Array.isArray(vertices)||vertices.length<3||vertices.length>1000)fail('necesitás de 3 a 1.000 vértices.');
 const coords=vertices.map(p=>{
  if(!Array.isArray(p)||p.length!==2||p.some(x=>!Number.isFinite(x)))fail('coordenadas inválidas.');
  return [Number(p[0].toFixed(8)),Number(p[1].toFixed(8))];
 });
 if(same(coords[0],coords.at(-1)))coords.pop();
 if(new Set(coords.map(p=>p.join(','))).size!==coords.length)fail('hay vértices repetidos.');
 const closed=[...coords,[...coords[0]]];
 return {type:'FeatureCollection',features:[{type:'Feature',properties:{name:'Contorno dibujado por usuario · no verificado'},
  geometry:{type:'Polygon',coordinates:[closed]}}]};
}
export function parseKmlPolygon(text,parserFactory){
 if(typeof text!=='string'||text.length>700000||/<!DOCTYPE|<!ENTITY/i.test(text))
  fail('KML demasiado grande o contiene declaraciones XML no admitidas.');
 const parser=parserFactory?.();
 if(!parser)fail('la conversión KML requiere un analizador XML del navegador.');
 const doc=parser.parseFromString(text,'application/xml');
 if(doc.getElementsByTagName('parsererror').length||
    doc.getElementsByTagNameNS('*','parsererror').length)fail('XML KML inválido.');
 const children=(node,tag)=>Array.from(node.getElementsByTagNameNS('*',tag));
 const polygons=children(doc,'Polygon');
 if(polygons.length<1||polygons.length>60)fail('el KML debe incluir entre 1 y 60 polígonos.');
 function ring(boundary){
  const element=children(boundary,'coordinates')[0];
  if(!element)fail('falta un anillo de coordenadas KML.');
  const points=(element.textContent||'').trim().split(/\s+/).filter(Boolean).map(token=>{
   const pair=token.split(',');
   if(pair.length<2||pair.length>3)fail('coordenadas KML inválidas.');
   const lon=Number(pair[0]),lat=Number(pair[1]);
   if(!Number.isFinite(lon)||!Number.isFinite(lat))fail('coordenadas KML no numéricas.');
   return [lon,lat];
  });
  if(points.length<4||!same(points[0],points.at(-1)))fail('anillo KML sin cierre.');
  return points;
 }
 const components=polygons.map(poly=>{
  const outer=children(poly,'outerBoundaryIs');
  if(outer.length!==1)fail('cada polígono KML requiere un único contorno exterior.');
  const holes=children(poly,'innerBoundaryIs');
  return [ring(outer[0]),...holes.map(ring)];
 });
 const geometry=components.length===1?{type:'Polygon',coordinates:components[0]}:
  {type:'MultiPolygon',coordinates:components};
 return {type:'FeatureCollection',features:[{type:'Feature',
  properties:{name:'Geometría importada de KML · origen sin certificar'},geometry}]};
}
export function validatePerimeterGeoJson(input){
 const checked=validateGeoJson(input);
 if(checked.featureCount!==1||!isPolygon(checked.geojson.features[0].geometry))
  fail('seleccioná un único polígono o multipolígono (sin recortar ni unir entidades automáticamente).');
 const [w,s,e,n]=checked.bounds;
 if(e-w<1e-7||n-s<1e-7)fail('el contorno carece de extensión espacial.');
 const margin=Math.max(0.00001,(e-w),(n-s))*.02;
 const bbox=[Math.max(-180,w-margin),Math.max(-90,s-margin),
  Math.min(180,e+margin),Math.min(90,n+margin)];
 const verified=clipGeoJsonToBbox(checked.geojson,bbox);
 if(verified.unsupportedCount||verified.selectedCount!==1||verified.outsideCount)
  fail('geometría inválida, autointersecada o con huecos/topología que requieren revisión GIS.');
 return checked;
}
export function buildPerimeterRecord({geojson,sha256,sourceName,sourceType,description,createdAt,rawText=null}){
 const parsed=validatePerimeterGeoJson(geojson);
 if(!SHA.test(sha256||'')||!safeName(sourceName)||!safeName(description)||
  !['drawn','geojson','kml'].includes(sourceType)||
  typeof createdAt!=='string'||!Number.isFinite(Date.parse(createdAt)))fail('faltan procedencia, huella o fecha.');
 if(rawText!==null&&(typeof rawText!=='string'||rawText.length>700000))fail('fuente original demasiado grande.');
 return {schema:'ambienta-user-perimeter-v1',status:'DECLARED_NOT_VERIFIED',
  sourceType,sourceName,sourceDescription:description,sourceSha256:sha256,
  createdAt,crs:'EPSG:4326',bounds:[...parsed.bounds],geojson:parsed.geojson,
  rawText,caveat:'Perímetro declarado/dibujado/importado por operador; NO comprobado como límite oficial o área de influencia.'};
}
export function readPerimeter(storage,key){
 try{
  const raw=storage.getItem(key);if(!raw)return null;
  if(raw.length>1350000)return null;
  const item=JSON.parse(raw);
  if(item?.schema!=='ambienta-user-perimeter-v1'||item.status!=='DECLARED_NOT_VERIFIED'||
   !SHA.test(item.sourceSha256||'')||item.crs!=='EPSG:4326'||!safeName(item.sourceName))return null;
  const parsed=validatePerimeterGeoJson(item.geojson);
  if(JSON.stringify(parsed.bounds)!==JSON.stringify(item.bounds))return null;
  return item;
 }catch{return null;}
}
export function savePerimeter(storage,key,historyKey,record,{replace=false}={}){
 if(!record||readPerimeter({getItem:()=>JSON.stringify(record)},'x')===null)fail('fuente nueva no validada.');
 const previous=storage.getItem(key);
 if(previous!==null&&!replace)fail('ya existe un perímetro: descargalo o elegí reemplazar expresamente.');
 const historyRaw=storage.getItem(historyKey);
 let history=[];
 try{if(historyRaw)history=JSON.parse(historyRaw);if(!Array.isArray(history))history=[];}
 catch{history=[];}
 const retained=previous===null?history:history.concat([{savedAt:new Date().toISOString(),raw:previous}]);
 if(JSON.stringify(retained.slice(-5)).length>1700000)fail('el respaldo local está lleno; exportá el historial antes de reemplazar.');
 // Never discard the last source if local storage cannot preserve its backup.
 if(previous!==null)storage.setItem(historyKey,JSON.stringify(retained.slice(-5)));
 storage.setItem(key,JSON.stringify(record));
 return {status:'saved',replaced:previous!==null,historyCopies:retained.length};
}
export function suggestWindowForBounds(bounds){
 if(!Array.isArray(bounds)||bounds.length!==4)fail('extensión inválida.');
 const [w,s,e,n]=bounds,lat=(s+n)/2,lon=(w+e)/2;
 const width=(e-w)*111.195*Math.cos(lat*Math.PI/180),height=(n-s)*111.195;
 const radiusKm=Math.max(.2,Math.ceil(Math.max(width,height)*.65*10)/10);
 if(radiusKm>100)fail('el perímetro supera la ventana máxima de 100 km. Definí una consulta por partes.');
 const aoi=createPointAoi(lat,lon,radiusKm);
 if(bounds.some((x,i)=>i<2?x<aoi.bbox[i]:x>aoi.bbox[i]))
  fail('no se pudo contener el perímetro en la ventana automática.');
 return {...aoi,savedAt:new Date().toISOString()};
}
