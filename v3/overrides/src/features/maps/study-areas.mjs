// AMBIENTA V3.2 · explicit demonstration study perimeter and four derived functional zones.
// Never promote a query BBOX, administrative WFS or imported source to an official perimeter.
// Calculations are approximate spherical surface area (not a cadastral or environmental survey).
import {intersect} from '@turf/intersect';
import {validateGeoJson} from './geojson-validate.mjs';
import {clipGeoJsonToBbox} from './aoi-clip.mjs';

export const AREA_SCENARIO_VERSION=1;
export const AREA_LABELS=Object.freeze([
 {id:'A',label:'Área A · Operación simulada',short:'Operación',color:'#f4b466'},
 {id:'B',label:'Área B · Monitoreo simulado',short:'Monitoreo',color:'#63cddd'},
 {id:'C',label:'Área C · Restauración simulada',short:'Restauración',color:'#b8a2f6'},
 {id:'D',label:'Área D · Resguardo simulado',short:'Resguardo',color:'#8de0a7'}
]);
const R=6371008.8; // mean Earth radius in meters, consistent across all reported areas
const RAD=Math.PI/180;
const EPS=1e-9;
function polygonRingArea(ring){
 let sum=0;
 for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i];
  const delta=(b[0]-a[0])*RAD;
  if(Math.abs(delta)>Math.PI)throw Error('Antimeridiano: el cálculo de área requiere un SIG geodésico.');
  sum+=delta*(Math.sin(a[1]*RAD)+Math.sin(b[1]*RAD));
 }
 return Math.abs(sum*R*R/2);
}
export function approximateAreaHa(geometry){
 if(!geometry||!['Polygon','MultiPolygon'].includes(geometry.type))
  throw Error('El cálculo de superficie requiere Polygon o MultiPolygon.');
 const polys=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 let total=0;
 for(const rings of polys){
  if(!rings?.length)throw Error('El polígono no tiene contorno.');
  const outer=polygonRingArea(rings[0]);
  const holes=rings.slice(1).reduce((sum,ring)=>sum+polygonRingArea(ring),0);
  if(outer<=0||holes>=outer)throw Error('Anillos inválidos para calcular la superficie.');
  total+=outer-holes;
 }
 return total/10000;
}
function boxFeature(bbox){
 const [w,s,e,n]=bbox;
 return {type:'Feature',properties:{},geometry:{type:'Polygon',
  coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}};
}
function assertBbox(b){
 if(!Array.isArray(b)||b.length!==4||b.some(x=>typeof x!=='number'||!Number.isFinite(x))||
 b[0]<-180||b[2]>180||b[1]<-90||b[3]>90||b[0]>=b[2]||b[1]>=b[3])
  throw Error('La ventana WGS84 para las zonas es inválida.');
 return b;
}
export function syntheticStudyPolygon(bbox){
 const [w,s,e,n]=assertBbox(bbox);
 const x=f=>Number((w+(e-w)*f).toFixed(9));
 const y=f=>Number((s+(n-s)*f).toFixed(9));
 const shell=[[x(.08),y(.10)],[x(.92),y(.10)],[x(.92),y(.88)],
  [x(.77),y(.88)],[x(.77),y(.73)],[x(.61),y(.73)],
  [x(.61),y(.88)],[x(.08),y(.88)],[x(.08),y(.10)]];
 const hole=[[x(.15),y(.31)],[x(.22),y(.31)],[x(.22),y(.41)],
  [x(.15),y(.41)],[x(.15),y(.31)]];
 return {type:'Feature',properties:{name:'Polígono sintético de ensayo · NO perímetro Diablillos'},
  geometry:{type:'Polygon',coordinates:[shell,hole]}};
}
function polygonGeometry(g){return g?.type==='Polygon'||g?.type==='MultiPolygon';}
function insideBounds(bounds,bbox){
 return bounds[0]>=bbox[0]-EPS&&bounds[1]>=bbox[1]-EPS&&
   bounds[2]<=bbox[2]+EPS&&bounds[3]<=bbox[3]+EPS;
}
function topologicalSource(geojson,bbox){
 const check=validateGeoJson(geojson);
 if(check.featureCount!==1||!polygonGeometry(check.geojson.features[0].geometry))
  throw Error('Seleccioná exactamente un polígono o multipolígono para delimitar el escenario.');
 if(!insideBounds(check.bounds,bbox))
  throw Error('El polígono excede la ventana de consulta. No lo recortamos ni lo identificamos como perímetro oficial.');
 const self=clipGeoJsonToBbox(check.geojson,bbox);
 if(self.unsupportedCount||self.selectedCount!==1)
  throw Error('El polígono presenta topología que requiere revisión SIG; no se asignaron áreas.');
 return check.geojson.features[0];
}
function zoneIntersection(parent,strip){
 const result=intersect({type:'FeatureCollection',features:[parent,boxFeature(strip)]});
 if(!result)return null;
 if(!polygonGeometry(result.geometry))
  throw Error('El recorte de una zona no produjo geometría poligonal.');
 // Reject a Turf result that fails the shared topology contract.
 const check=clipGeoJsonToBbox({type:'FeatureCollection',features:[result]},strip);
 if(check.unsupportedCount||check.selectedCount!==1)
  throw Error('Una subárea necesita revisión topológica. No se guardó el escenario.');
 return check.geojson.features[0].geometry;
}
export function createStudyScenario({bbox,geojson,sourceHash,sourceKind,generatedAt}){
 const b=assertBbox(bbox);
 if(!['synthetic','imported'].includes(sourceKind))throw Error('Origen del polígono no reconocido.');
 if(typeof sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(sourceHash))
  throw Error('Falta la SHA-256 de procedencia del escenario.');
 const parent=topologicalSource(geojson,b);
 const areaHa=approximateAreaHa(parent.geometry);
 if(!(areaHa>0))throw Error('El perímetro de ensayo tiene superficie nula.');
 const bounds=validateGeoJson({type:'FeatureCollection',features:[parent]}).bounds;
 const span=bounds[2]-bounds[0];
 if(span<=1e-8)throw Error('El polígono es demasiado estrecho para cuatro áreas.');
 const zones=[];const details=[];
 for(const [i,zone] of AREA_LABELS.entries()){
  const west=i===0?bounds[0]:bounds[0]+span*i/4;
  const east=i===3?bounds[2]:bounds[0]+span*(i+1)/4;
  const strip=[west,b[1],east,b[3]];
  const geometry=zoneIntersection(parent,strip);
  const ha=geometry?approximateAreaHa(geometry):0;
  const percent=ha/areaHa*100;
  details.push({id:zone.id,label:zone.label,color:zone.color,areaHa:ha,percent,
   status:ha>0?'assigned':'empty',zoneBbox:strip});
  if(geometry)zones.push({type:'Feature',
   properties:{zoneId:zone.id,name:zone.label,color:zone.color,areaHa:ha,percent,
    verification:'synthetic_area_allocation_not_approved'},
   geometry});
 }
 const allocated=details.reduce((sum,z)=>sum+z.areaHa,0);
 const residual=areaHa-allocated;
 const relative=Math.abs(residual)/areaHa;
 if(relative>0.0005)throw Error('La distribución de superficies deja un área sin asignar; requiere revisión GIS.');
 // Ensure interiors are disjoint in the same spherical metric (boundaries may touch).
 for(let i=0;i<zones.length;i++)for(let j=0;j<i;j++){
  const contact=intersect({type:'FeatureCollection',features:[zones[i],zones[j]]});
  if(contact&&approximateAreaHa(contact.geometry)/areaHa>0.000005)
   throw Error('La asignación genera subáreas solapadas: bloqueada.');
 }
 return {
  version:AREA_SCENARIO_VERSION,kind:'study_area_demo',status:'SIMULADO_NO_OFICIAL',
  sourceKind,sourceHash,sourceHashScope:sourceKind==='imported'?'original_imported_file_or_wfs_response':'synthetic_generated_geojson',
  bbox:[...b],createdAt:generatedAt||new Date().toISOString(),
  crs:'EPSG:4326',areaMethod:'aproximacion_esferica_WGS84_R6371008.8m',
  parent:{type:'FeatureCollection',features:[parent]},
  zones:{type:'FeatureCollection',features:zones},
  summary:{parentHa:areaHa,assignedHa:allocated,residualHa:residual,relativeError:relative,
   zoneCount:details.length,nonEmptyZoneCount:zones.length,areas:details},
  caveat:'Polígono y zonificación de prueba. La BBOX NO es un perímetro ambiental oficial ni un estudio aprobado.'
 };
}
export function scenarioMatchesAoi(scenario,bbox){
 return scenario?.kind==='study_area_demo'&&scenario.version===AREA_SCENARIO_VERSION&&
  Array.isArray(scenario.bbox)&&Array.isArray(bbox)&&bbox.length===4&&
  scenario.bbox.length===4&&scenario.bbox.every((x,i)=>typeof x==='number'&&Math.abs(x-bbox[i])<1e-9);
}
export const studyAreaStorageKey=diablillos=>diablillos?'ambienta-study-areas-diablillos-v1':'ambienta-study-areas-demo-v1';
export function restoreStudyScenario(key,bbox,sourceHash=null){
 try{
  if(!bbox)return null;
  const raw=localStorage.getItem(key);
  if(!raw||raw.length>240000)return null;
  const candidate=JSON.parse(raw);
  if(!scenarioMatchesAoi(candidate,bbox)||typeof candidate.sourceHash!=='string')return null;
  if(candidate.sourceKind==='imported'&&candidate.sourceHash!==sourceHash)return null;
  // Re-derive zones and their areas, never trust user-modifiable stored geometries.
  const rebuilt=createStudyScenario({bbox,geojson:candidate.parent,
   sourceHash:candidate.sourceHash,sourceKind:candidate.sourceKind,generatedAt:candidate.createdAt});
  return rebuilt;
 }catch{return null;}
}
export function studyScenarioExport(scenario,part='zones'){
 if(!scenario||!['zones','parent'].includes(part)||!scenarioMatchesAoi(scenario,scenario.bbox))
  throw Error('Escenario de áreas inválido.');
 const features=part==='zones'?scenario.zones.features:scenario.parent.features;
 return {type:'FeatureCollection',features,
  properties:{ambientaStudyAreas:{
   version:scenario.version,status:scenario.status,kind:scenario.sourceKind,
   sourceSha256:scenario.sourceHash,hashScope:scenario.sourceHashScope,
   bbox:scenario.bbox,crs:scenario.crs,createdAt:scenario.createdAt,
   method:scenario.areaMethod,parentAreaHa:scenario.summary.parentHa,
   assignedAreaHa:scenario.summary.assignedHa,residualHa:scenario.summary.residualHa,
   areas:scenario.summary.areas.map(({id,label,areaHa,percent,status})=>({id,label,areaHa,percent,status})),
   warning:scenario.caveat,exportPart:part}}};
}
