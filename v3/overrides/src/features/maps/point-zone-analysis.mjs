// AMBIENTA V3.5 — LOCAL POINT/ZONE SPATIAL ANALYSIS.
// This is a derived GIS calculation. It neither alters the original layer
// nor changes the user's separate documentary impact/PGA/evidence links.
// A point on an outer/hole/zone boundary is REVIEW, never assigned by guess.
import {validateGeoJson} from './geojson-validate.mjs';
import {scenarioMatchesAoi,AREA_LABELS} from './study-areas.mjs';

const EPS=1e-9; // degrees at EPSG:4326, classification tolerance, not surveying accuracy
const MAX_RESULTS=1000;
const zoneIds=new Set(AREA_LABELS.map(z=>z.id));
const fail=message=>{throw Error('Análisis espacial bloqueado: '+message);};
const isPolygon=g=>g?.type==='Polygon'||g?.type==='MultiPolygon';

function pointOnSegment(p,a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],px=p[0]-a[0],py=p[1]-a[1];
 const length=Math.hypot(dx,dy);
 if(length<EPS)return Math.hypot(px,py)<=EPS;
 const signed=Math.abs(dx*py-dy*px)/length;
 if(signed>EPS)return false;
 const t=(px*dx+py*dy)/(length*length);
 return t>=-EPS/length&&t<=1+EPS/length;
}
function inRing(p,ring){
 let inside=false;
 for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i];
  if(pointOnSegment(p,a,b))return 'boundary';
  const crossing=(a[1]>p[1])!==(b[1]>p[1]);
  if(crossing&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])
   inside=!inside;
 }
 return inside?'inside':'outside';
}
function polygonRelation(p,rings){
 const exterior=inRing(p,rings[0]);
 if(exterior!=='inside')return exterior;
 for(const hole of rings.slice(1)){
  const relation=inRing(p,hole);
  if(relation==='boundary')return 'boundary';
  if(relation==='inside')return 'outside';
 }
 return 'inside';
}
/**
 * Classify a point against valid Polygon or MultiPolygon.
 * 'boundary' is reported regardless of whether other multipart shells overlap.
 */
export function pointRelation(p,geometry){
 if(!Array.isArray(p)||p.length<2||p.slice(0,2).some(n=>typeof n!=='number'||!Number.isFinite(n)))
  fail('coordenada puntual inválida.');
 if(!isPolygon(geometry))fail('solo se admiten polígonos para clasificar puntos.');
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 let inside=false;
 for(const rings of polygons){
  const relation=polygonRelation(p,rings);
  if(relation==='boundary')return 'boundary';
  if(relation==='inside')inside=true;
 }
 return inside?'inside':'outside';
}
function validatedScenario(scenario){
 if(scenario?.kind!=='study_area_demo'||scenario.status!=='SIMULADO_NO_OFICIAL'||
  !scenarioMatchesAoi(scenario,scenario.bbox)||!Array.isArray(scenario.parent?.features)||
  scenario.parent.features.length!==1||!isPolygon(scenario.parent.features[0]?.geometry)||
  !Array.isArray(scenario.zones?.features)||scenario.zones.features.length<1||
  scenario.zones.features.length>4||typeof scenario.sourceHash!=='string'||
  !/^[a-f0-9]{64}$/.test(scenario.sourceHash))
  fail('el polígono de ensayo no está disponible o no tiene procedencia consistente.');
 const ids=new Set();
 for(const zone of scenario.zones.features){
  const id=zone.properties?.zoneId;
  if(!zoneIds.has(id)||ids.has(id)||!isPolygon(zone.geometry))
   fail('las subáreas no contienen polígonos A–D válidos y únicos.');
  ids.add(id);
 }
 return scenario;
}
function validatedPoints(layer){
 if(!layer||typeof layer.sha256!=='string'||!/^[a-f0-9]{64}$/.test(layer.sha256)||
  typeof layer.source!=='string'||typeof layer.fileName!=='string')
  fail('falta una capa local con SHA-256 y origen declarado.');
 const parsed=validateGeoJson(layer.geojson);
 if(parsed.geometryTypes.some(type=>type!=='Point'&&type!=='MultiPoint'))
  fail('esta operación requiere únicamente Point o MultiPoint; las líneas y polígonos se analizan en otro procedimiento.');
 const points=[];
 for(const [index,feature] of parsed.geojson.features.entries()){
  const coordinates=feature.geometry.type==='Point'?[feature.geometry.coordinates]:
   feature.geometry.coordinates;
  for(const [part,coordinate] of coordinates.entries()){
   if(points.length>=MAX_RESULTS)fail('demasiados puntos de entrada.');
   points.push({ref:'F'+(index+1)+(feature.geometry.type==='MultiPoint'?':P'+(part+1):''),
    name:feature.properties.name,coordinate:[coordinate[0],coordinate[1]]});
  }
 }
 if(!points.length)fail('la capa no tiene coordenadas puntuales.');
 return points;
}
function classify(point,parent,zones){
 const p=point.coordinate;
 const relation=pointRelation(p,parent);
 if(relation==='outside')
  return {...point,status:'outside_perimeter',zoneId:null,reason:'Fuera del perímetro de ensayo'};
 if(relation==='boundary')
  return {...point,status:'review_boundary',zoneId:null,reason:'En el borde del perímetro o un hueco'};
 let matched=[];let boundary=false;
 for(const zone of zones){
  const where=pointRelation(p,zone.geometry);
  if(where==='boundary')boundary=true;
  if(where==='inside')matched.push(zone.properties.zoneId);
 }
 if(boundary)
  return {...point,status:'review_boundary',zoneId:null,
   reason:'El punto coincide con un límite de subárea: clasificación no unívoca'};
 if(matched.length!==1)
  return {...point,status:'review_topology',zoneId:null,
   reason:matched.length?'Solapamiento entre subáreas':'Posible hueco de cobertura espacial'};
 return {...point,status:'inside_zone',zoneId:matched[0],reason:'Intersección geométrica interior'};
}
/**
 * @param {object} options - original local layer and already validated study scenario
 * @returns {object} deterministic local derived report (no writes, no network)
 */
export function analyzePointsInStudyAreas({layer,scenario,analyzedAt}){
 const approved=validatedScenario(scenario);
 const points=validatedPoints(layer);
 const output=points.map(p=>classify(p,approved.parent.features[0].geometry,approved.zones.features));
 const perZone=AREA_LABELS.map(z=>({
  id:z.id,label:z.label,color:z.color,
  count:output.filter(row=>row.zoneId===z.id&&row.status==='inside_zone').length
 }));
 const insideCount=output.filter(p=>p.status==='inside_zone').length;
 const outsideCount=output.filter(p=>p.status==='outside_perimeter').length;
 const reviewCount=output.filter(p=>p.status.startsWith('review_')).length;
 if(insideCount+outsideCount+reviewCount!==output.length)
  fail('la clasificación no incluye todos los puntos.');
 const scope=layer.metadata?.category==='idesa-wfs'?'raw_upstream_wfs_response':
  layer.metadata?.category==='georef-centroids'?'normalized_georef_geojson':
  layer.metadata?.category==='hydrology'?'original_hydrology_import':'original_imported_file';
 return {schema:'ambienta-point-zones-v1',status:'SIMULADO_NO_OFICIAL',
  analyzedAt:analyzedAt||new Date().toISOString(),
  crs:'EPSG:4326',method:'point_in_polygon_with_holes_boundary_review',
  provenance:{
   inputSha256:layer.sha256,inputHashScope:scope,
   inputFile:layer.fileName,inputSourceDeclared:layer.source,
   scenarioSha256:approved.sourceHash,scenarioHashScope:approved.sourceHashScope,
   scenarioCreatedAt:approved.createdAt,scenarioBbox:[...approved.bbox],
   sourceOfficiallyVerified:false
  },
  summary:{totalCount:output.length,insideCount,outsideCount,reviewCount,perZone},
  points:output,
  caveat:'Puntos geográficos locales y polígonos de ENSAYO, no mediciones verificadas, ni geolocalización de impactos, PGA o evidencias. Los límites ambiguos requieren revisión SIG. No se modifica el expediente.'
 };
}
export function analysisMatchesContext(analysis,layer,scenario){
 return analysis?.schema==='ambienta-point-zones-v1'&&layer&&scenario&&
  analysis.provenance?.inputSha256===layer.sha256&&
  analysis.provenance?.scenarioSha256===scenario.sourceHash&&
  analysis.provenance?.scenarioCreatedAt===scenario.createdAt&&
  Array.isArray(analysis.provenance?.scenarioBbox)&&
  analysis.provenance.scenarioBbox.length===4&&
  analysis.provenance.scenarioBbox.every((x,i)=>x===scenario.bbox[i]);
}
