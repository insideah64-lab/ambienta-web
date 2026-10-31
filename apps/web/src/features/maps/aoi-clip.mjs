// Conservative WGS84 bbox clip: exact Liang-Barsky line segments and convex
// Sutherland-Hodgman polygons. Reject complex polygons rather than corrupt topology.
// This local QA algorithm never changes the original stored GeoJSON.
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
function convex(ring){
 let sign=0;const pts=ring.slice(0,-1);
 if(pts.length<3)return false;
 for(let i=0;i<pts.length;i++){
  const a=pts[i],b=pts[(i+1)%pts.length],c=pts[(i+2)%pts.length];
  const cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
  if(Math.abs(cross)<EPS)continue;
  const next=Math.sign(cross);
  if(sign&&sign!==next)return false;
  sign=next;
 }
 return sign!==0;
}
function ringClip(ring,b){
 let pts=ring.slice(0,-1);
 const edges=[
  {axis:0,v:b[0],keep:p=>p[0]>=b[0]-EPS},
  {axis:0,v:b[2],keep:p=>p[0]<=b[2]+EPS},
  {axis:1,v:b[1],keep:p=>p[1]>=b[1]-EPS},
  {axis:1,v:b[3],keep:p=>p[1]<=b[3]+EPS}
 ];
 for(const edge of edges){
  if(!pts.length)break;
  const output=[];
  for(let i=0;i<pts.length;i++){
   const a=pts[(i+pts.length-1)%pts.length],c=pts[i];
   const inA=edge.keep(a),inC=edge.keep(c);
   function crossing(){
    const den=c[edge.axis]-a[edge.axis];
    if(Math.abs(den)<EPS)return null;
    const t=(edge.v-a[edge.axis])/den;
    return [a[0]+t*(c[0]-a[0]),a[1]+t*(c[1]-a[1])];
   }
   if(inC){if(!inA){const p=crossing();if(p)output.push(p);}output.push(c);}
   else if(inA){const p=crossing();if(p)output.push(p);}
  }
  pts=output.filter((p,i)=>i===0||!same(p,output[i-1]));
  if(pts.length>1&&same(pts[0],pts.at(-1)))pts.pop();
 }
 if(pts.length<3)return null;
 const area=pts.reduce((sum,p,i)=>sum+p[0]*pts[(i+1)%pts.length][1]-pts[(i+1)%pts.length][0]*p[1],0);
 if(Math.abs(area)<EPS)return null;
 return [...pts,pts[0]];
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
 if(type==='Polygon'||type==='MultiPolygon'){
  const polygons=type==='Polygon'?[c]:c;
  if(polygons.some(p=>p.length!==1||!convex(p[0])))
   return {unsupported:'Polígono cóncavo o con huecos: requiere motor SIG topológico.'};
  const kept=polygons.map(p=>ringClip(p[0],b)).filter(Boolean).map(r=>[r]);
  if(!kept.length)return null;
  return {geometry:kept.length===1?{type:'Polygon',coordinates:kept[0]}:{type:'MultiPolygon',coordinates:kept}};
 }
 return {unsupported:'Geometría no admitida por el recortador local.'};
}
export function clipGeoJsonToBbox(input,bbox){
 const b=check(bbox),parsed=validateGeoJson(input);
 const features=[];let outside=0,unsupported=0;
 for(const feature of parsed.geojson.features){
  const result=geometryClip(feature.geometry,b);
  if(result?.unsupported){unsupported++;continue;}
  if(!result){outside++;continue;}
  features.push({...feature,geometry:result.geometry});
 }
 return {geojson:{type:'FeatureCollection',features},sourceCount:parsed.featureCount,
  selectedCount:features.length,outsideCount:outside,unsupportedCount:unsupported,
  status:unsupported?'partial_requires_gis':'clipped_local',bbox:[...b],
  method:'EPSG:4326 bbox: líneas y polígonos convexos simples',
  caveat:'Recorte local preliminar, no certifica geometría, fuente ni área de impacto.'};
}
