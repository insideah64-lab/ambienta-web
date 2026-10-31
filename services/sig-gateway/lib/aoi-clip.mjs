// WGS84 local AOI clip. Preserve the original validated layer; derive only a view.
// Topological polygon intersections via Turf, lines via Liang-Barsky.
import {intersect} from '@turf/intersect';
import {validateGeoJson} from './geojson-validate.mjs';
const EPS=1e-10;
const same=(a,b)=>Math.abs(a[0]-b[0])<EPS&&Math.abs(a[1]-b[1])<EPS;
const inside=(p,b)=>p[0]>=b[0]-EPS&&p[0]<=b[2]+EPS&&p[1]>=b[1]-EPS&&p[1]<=b[3]+EPS;
function check(b){
 if(!Array.isArray(b)||b.length!==4||b.some(x=>typeof x!=='number'||!Number.isFinite(x))||
 b[0]<-180||b[2]>180||b[1]<-90||b[3]>90||b[0]>=b[2]||b[1]>=b[3])
 throw Error('Extensión de consulta EPSG:4326 inválida.');
 return b;
}
function segment(a,c,b){
 const dx=c[0]-a[0],dy=c[1]-a[1],p=[-dx,dx,-dy,dy];
 const q=[a[0]-b[0],b[2]-a[0],a[1]-b[1],b[3]-a[1]];
 let t0=0,t1=1;
 for(let i=0;i<4;i++){
  if(Math.abs(p[i])<EPS){if(q[i]<-EPS)return null;continue;}
  const t=q[i]/p[i];
  if(p[i]<0)t0=Math.max(t0,t);else t1=Math.min(t1,t);
  if(t0>t1+EPS)return null;
 }
 const start=[a[0]+t0*dx,a[1]+t0*dy],end=[a[0]+t1*dx,a[1]+t1*dy];
 return same(start,end)?null:[start,end];
}
function lineClip(line,b){
 const parts=[];let current=[];
 function flush(){if(current.length>=2)parts.push(current);current=[];}
 for(let i=1;i<line.length;i++){
  const s=segment(line[i-1],line[i],b);
  if(!s){flush();continue;}
  if(current.length&&same(current.at(-1),s[0])){
   if(!same(current.at(-1),s[1]))current.push(s[1]);
  }else{flush();current=[...s];}
  if(!inside(line[i],b))flush();
 }
 flush();return parts;
}

const TOPO_EPS=1e-12;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function onSegment(a,p,b){
 return Math.abs(cross(a,b,p))<=TOPO_EPS &&
 p[0]>=Math.min(a[0],b[0])-TOPO_EPS&&p[0]<=Math.max(a[0],b[0])+TOPO_EPS&&
 p[1]>=Math.min(a[1],b[1])-TOPO_EPS&&p[1]<=Math.max(a[1],b[1])+TOPO_EPS;
}
function segmentTouch(a,b,c,d){
 const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);
 if(Math.abs(x)<=TOPO_EPS&&onSegment(a,c,b))return true;
 if(Math.abs(y)<=TOPO_EPS&&onSegment(a,d,b))return true;
 if(Math.abs(z)<=TOPO_EPS&&onSegment(c,a,d))return true;
 if(Math.abs(w)<=TOPO_EPS&&onSegment(c,b,d))return true;
 return (x>TOPO_EPS&&y< -TOPO_EPS||x< -TOPO_EPS&&y>TOPO_EPS)&&
        (z>TOPO_EPS&&w< -TOPO_EPS||z< -TOPO_EPS&&w>TOPO_EPS);
}
function ringArea(ring){
 const [ox,oy]=ring[0];let twice=0;
 for(let i=0;i<ring.length-1;i++){
  const a=ring[i],b=ring[i+1];
  twice+=(a[0]-ox)*(b[1]-oy)-(b[0]-ox)*(a[1]-oy);
 }
 return twice/2;
}
function ringProblem(ring){
 const n=ring.length-1;
 // Quadratic validation is deliberately bounded in the browser.
 if(n>3000)return 'Anillo demasiado complejo para verificación topológica local (3.000 segmentos).';
 if(n<3||Math.abs(ringArea(ring))<TOPO_EPS)return 'Anillo degenerado o de área nula.';
 for(let i=0;i<n;i++)if(same(ring[i],ring[i+1]))
  return 'Anillo con segmento de longitud nula.';
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
  if(j===i+1||(i===0&&j===n-1))continue;
  if(segmentTouch(ring[i],ring[i+1],ring[j],ring[j+1]))
   return 'Anillo con auto-intersección o contacto consigo mismo.';
 }
 return null;
}
// 1 = strictly inside, 0 = on boundary, -1 = outside.
function pointPosition(p,ring){
 let inside=false;
 for(let i=0;i<ring.length-1;i++){
  const a=ring[i],b=ring[i+1];
  if(onSegment(a,p,b))return 0;
  if((a[1]>p[1])!==(b[1]>p[1]) &&
    p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside?1:-1;
}
function ringsTouch(a,b){
 for(let i=1;i<a.length;i++)for(let j=1;j<b.length;j++)
  if(segmentTouch(a[i-1],a[i],b[j-1],b[j]))return true;
 return false;
}
function polygonProblem(polygons){
 for(const polygon of polygons){
  const [shell,...holes]=polygon;
  for(const ring of polygon){
   const problem=ringProblem(ring);
   if(problem)return problem;
  }
  for(let i=0;i<holes.length;i++){
   const hole=holes[i];
   if(pointPosition(hole[0],shell)!==1||ringsTouch(hole,shell))
    return 'Hueco fuera del contorno, tangente o cruzado con su borde.';
   for(let j=0;j<i;j++){
    if(ringsTouch(hole,holes[j])||pointPosition(hole[0],holes[j])!==-1||
       pointPosition(holes[j][0],hole)!==-1)
     return 'Huecos solapados, anidados o tangentes.';
   }
  }
 }
 // MultiPolygon components cannot overlap or contain each other.
 for(let i=0;i<polygons.length;i++)for(let j=0;j<i;j++){
  const a=polygons[i][0],b=polygons[j][0];
  if(ringsTouch(a,b)||pointPosition(a[0],b)!==-1||pointPosition(b[0],a)!==-1)
   return 'Partes de multipolígono solapadas, contenidas o tangentes.';
 }
 return null;
}
function bboxPolygon(b){
 return {type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[
  [b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]],[b[0],b[1]]
 ]]}};
}
function polygonClip(g,b){
 const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;
 const problem=polygonProblem(polygons);
 if(problem)return {unsupported:problem,kind:problem.startsWith('Anillo demasiado complejo')?'needs_review':'invalid'};
 try{
  const result=intersect({type:'FeatureCollection',features:[
   {type:'Feature',properties:{},geometry:g},bboxPolygon(b)
  ]});
  if(!result)return null;
  const out=result.geometry;
  if(!out||!['Polygon','MultiPolygon'].includes(out.type))
   return {unsupported:'Intersección sin geometría poligonal.',kind:'invalid'};
  const pieces=out.type==='Polygon'?[out.coordinates]:out.coordinates;
  if(!pieces.length||polygonProblem(pieces))
   return {unsupported:'La intersección produjo una topología que requiere revisión.',kind:'invalid'};
  for(const polygon of pieces)for(const ring of polygon)for(const point of ring)
   if(!inside(point,b))
    return {unsupported:'Intersección fuera de la ventana de consulta.',kind:'invalid'};
  return {geometry:out};
 }catch{
  return {unsupported:'No fue posible resolver la intersección poligonal topológica.',kind:'invalid'};
 }
}
function geometryClip(g,b){
 const {type,coordinates:c}=g;
 if(type==='Point')return inside(c,b)?{geometry:g}:null;
 if(type==='MultiPoint'){
  const kept=c.filter(p=>inside(p,b));
  return kept.length?{geometry:{type:'MultiPoint',coordinates:kept}}:null;
 }
 if(type==='LineString'||type==='MultiLineString'){
  const all=(type==='LineString'?[c]:c).flatMap(l=>lineClip(l,b));
  if(!all.length)return null;
  return {geometry:all.length===1?{type:'LineString',coordinates:all[0]}:{type:'MultiLineString',coordinates:all}};
 }
 if(type==='Polygon'||type==='MultiPolygon')return polygonClip(g,b);
 return {unsupported:'Geometría no admitida por el recortador local.'};
}
export function clipGeoJsonToBbox(input,bbox){
 const b=check(bbox),parsed=validateGeoJson(input);
 const features=[];let outside=0,unsupported=0,invalid=0;
 const issues=[];
 for(const [index,feature] of parsed.geojson.features.entries()){
  const result=geometryClip(feature.geometry,b);
  if(result?.unsupported){
   unsupported++;
   if(result.kind==='invalid')invalid++;
   issues.push({index,name:feature.properties.name,reason:result.unsupported,
    category:result.kind==='invalid'?'topology_review':'unsupported'});
   continue;
  }
  if(!result){outside++;continue;}
  features.push({...feature,geometry:result.geometry});
 }
 return {geojson:{type:'FeatureCollection',features},sourceCount:parsed.featureCount,
  selectedCount:features.length,outsideCount:outside,unsupportedCount:unsupported,
  invalidCount:invalid,issues,
  status:unsupported?'partial_requires_gis':'clipped_local',bbox:[...b],
  method:'EPSG:4326: intersección Turf para polígonos; Liang–Barsky para líneas',
  caveat:'Recorte local preliminar; topología no equivale a certificación de fuente ni área de influencia.'};
}
