// RFC 7946 / WGS84 GeoJSON, constrained for client-only AMBIENTA QA.
// No automatic conversion of other CRSs. No GeoJSON feature is treated as an approved project perimeter.
const MAX_FEATURES=100, MAX_COORDINATES=12000;
const ALLOWED=new Set(['Point','MultiPoint','LineString','MultiLineString','Polygon','MultiPolygon']);
function fail(msg){throw new Error('GeoJSON rechazado: '+msg);}
function object(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
export function validateGeoJson(input){
 if(!object(input))fail('debe ser un objeto Feature o FeatureCollection.');
 if(input.crs){
   const name=input.crs?.properties?.name;
   if(!['EPSG:4326','urn:ogc:def:crs:OGC:1.3:CRS84','OGC:CRS84'].includes(name))
     fail('CRS distinto de WGS84/EPSG:4326; reproyectá previamente en un SIG.');
 }
 const features=input.type==='FeatureCollection'?input.features:
     input.type==='Feature'?[input]:null;
 if(!Array.isArray(features)||features.length===0||features.length>MAX_FEATURES)
   fail('se requieren entre 1 y '+MAX_FEATURES+' entidades tipo Feature.');
 // OGC GeoServer reports the full spatial match count, even if maxFeatures truncates.
 // A truncated official query is NOT a complete geographic selection.
 if(input.type==='FeatureCollection'){
  for(const key of ['numberOfFeatures','totalFeatures','numberMatched','numberReturned']){
   if(input[key]===undefined||input[key]===null)continue;
   const declared=input[key];
   if(key==='numberMatched'&&declared==='unknown')
    fail('el WFS no informa cantidad total; consultar en un SIG antes de exportar.');
   if(!(typeof declared==='number'&&Number.isSafeInteger(declared)&&declared>=0) &&
      !(typeof declared==='string'&&/^[0-9]+$/.test(declared)))
    fail('contador WFS inválido: '+key+'.');
   const number=Number(declared);
   if(!Number.isSafeInteger(number)||number!==features.length)
    fail('consulta WFS incompleta: '+key+'='+declared+
     ' y solo '+features.length+' entidades recibidas. Ajustá BBOX o usá un SIG.');
  }
 }

 const bounds=[180,90,-180,-90];let n=0;
 function point(p){
   if(!Array.isArray(p)||(p.length!==2&&p.length!==3)||p.slice(0,2).some(x=>typeof x!=='number'||!Number.isFinite(x)))
     fail('coordenada inválida; se esperan longitud y latitud numéricas.');
   const [lon,lat]=p;
   if(lon < -180||lon > 180||lat < -90||lat > 90)fail('coordenadas fuera de EPSG:4326 (lon/lat).');
   n++;if(n>MAX_COORDINATES)fail('demasiados vértices (máximo '+MAX_COORDINATES+').');
   bounds[0]=Math.min(bounds[0],lon);bounds[1]=Math.min(bounds[1],lat);
   bounds[2]=Math.max(bounds[2],lon);bounds[3]=Math.max(bounds[3],lat);
   return [lon,lat];
 }
 function line(a,ring=false){
   if(!Array.isArray(a)||a.length<(ring?4:2))fail('línea o anillo con insuficientes vértices.');
   const v=a.map(point);
   if(ring&&(v[0][0]!==v.at(-1)[0]||v[0][1]!==v.at(-1)[1]))
     fail('anillo de polígono no está cerrado.');
   return v;
 }
 function polygon(a){
   if(!Array.isArray(a)||a.length<1)fail('polígono sin anillos.');
   return a.map(r=>line(r,true));
 }
 function geometry(g){
   if(!object(g)||!ALLOWED.has(g.type))fail('tipo de geometría no permitido.');
   const a=g.coordinates;
   if(!Array.isArray(a))fail('geometría sin arreglo de coordenadas.');
   let coordinates;
   if(g.type==='Point')coordinates=point(a);
   else if(g.type==='MultiPoint')coordinates=a.map(point);
   else if(g.type==='LineString')coordinates=line(a);
   else if(g.type==='MultiLineString')coordinates=a.map(l=>line(l));
   else if(g.type==='Polygon')coordinates=polygon(a);
   else coordinates=a.map(polygon);
   if(!coordinates.length)fail('geometría vacía.');
   return {type:g.type,coordinates};
 }
 const clean=features.map((f,i)=>{
   if(!object(f)||f.type!=='Feature')fail('entidad '+(i+1)+' no es Feature.');
   const name=typeof f.properties?.name==='string'?f.properties.name.slice(0,100):
       'Entidad '+(i+1);
   return {type:'Feature',properties:{name},geometry:geometry(f.geometry)};
 });
 return {geojson:{type:'FeatureCollection',features:clean},
   bounds,featureCount:clean.length,coordinateCount:n,
   geometryTypes:[...new Set(clean.map(f=>f.geometry.type))]};
}
