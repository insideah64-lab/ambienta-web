import {validateGeoJson} from './geojson-validate.mjs';
const KIND={'Point':'Punto de observación declarado','MultiPoint':'Puntos de observación declarados',
 'LineString':'Eje lineal declarado','MultiLineString':'Ejes lineales declarados',
 'Polygon':'Superficie hídrica declarada','MultiPolygon':'Superficies hídricas declaradas'};
function required(value,label,max){
 if(typeof value!=='string'||value.trim().length<4||value.length>max)throw Error(label+' es obligatorio (4–'+max+' caracteres).');
 return value.trim();
}
export function validateHydrologyImport(json,meta){
 const result=validateGeoJson(json);
 const institution=required(meta?.institution,'Organismo/fuente',120);
 const date=required(meta?.date,'Fecha de la fuente',20);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||
   new Date(date).toISOString().slice(0,10)!==date)throw Error('Fecha de fuente inválida.');
 const sourceUrl=required(meta?.url,'URL de origen',450);
 let url;
 try{url=new URL(sourceUrl);}catch{throw Error('URL de origen no válida.');}
 if(url.protocol!=='https:'||url.username||url.password||url.hostname==='localhost'||
   /^127\.|^10\.|^192\.168\.|^169\.254\./.test(url.hostname))throw Error('La fuente debe usar URL pública HTTPS.');
 const types=result.geometryTypes;
 if(types.some(t=>!Object.hasOwn(KIND,t)))throw Error('Geometría hídrica incompatible.');
 // Data import is NEVER a claim that this layer was independently authenticated.
 return {...result,metadata:{category:'hydrology',institution,date,sourceUrl:url.href,
  verification:'source_declared_unverified',description:'Geometría hidrográfica local; no acredita caudales, calidad ni el emplazamiento del proyecto.'},
  classes:types.map(t=>KIND[t])};
}
