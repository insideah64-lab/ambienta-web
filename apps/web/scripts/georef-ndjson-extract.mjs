// STREAMING tool for an operator-supplied Georef ETL NDJSON snapshot.
// It NEVER downloads, verifies institutional signatures or automatically certifies provenance.
// Usage: node scripts/georef-ndjson-extract.mjs <file.ndjson> <provincias|departamentos> <ID> <out.geojson>
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';
const ID_RULES={provincias:/^\d{2}$/,departamentos:/^\d{5}$/};
function ensureGeometry(geometry){
 if(!geometry||!['Polygon','MultiPolygon'].includes(geometry.type))throw Error('La entidad no contiene un polígono WGS84.');
 let count=0;
 function walkRing(ring){
  if(!Array.isArray(ring)||ring.length<4)throw Error('Anillo insuficiente.');
  const first=ring[0],last=ring.at(-1);
  if(!Array.isArray(first)||!Array.isArray(last)||first[0]!==last[0]||first[1]!==last[1])throw Error('Anillo abierto.');
  for(const c of ring){
   if(!Array.isArray(c)||c.length<2||!Number.isFinite(c[0])||!Number.isFinite(c[1])||
      c[0]<-180||c[0]>180||c[1]<-90||c[1]>90)throw Error('Coordenada no WGS84.');
   if(++count>3_000_000)throw Error('Demasiados vértices.');
  }
 }
 const polygon=poly=>{if(!Array.isArray(poly)||!poly.length)throw Error('Polígono vacío.');for(const ring of poly)walkRing(ring);};
 if(geometry.type==='Polygon')polygon(geometry.coordinates);
 else {if(!Array.isArray(geometry.coordinates)||!geometry.coordinates.length)throw Error('Multipolígono vacío.');for(const poly of geometry.coordinates)polygon(poly);}
 return count;
}
export async function extractGeorefBoundary(file,resource,id){
 if(!ID_RULES[resource]?.test(id))throw Error('Recurso o ID Georef inválido.');
 if(resource==='departamentos'&&!['66'].includes(id.slice(0,2)))throw Error('Esta etapa experimental procesa solo departamentos de Salta (66).');
 const st=await fs.promises.stat(file);
 if(!st.isFile()||st.size>2_000_000_000)throw Error('Archivo no válido o mayor de 2 GB.');
 const reader=createInterface({input:fs.createReadStream(file,{encoding:'utf8'}),crlfDelay:Infinity});
 let metadata=null,found=null,records=0;
 for await(const line of reader){
  if(!line.trim())continue;
  if(!metadata){
   metadata=JSON.parse(line);
   if(typeof metadata!=='object'||metadata===null||!metadata.version||!metadata.fecha_creacion)
     throw Error('La primera línea no contiene metadatos de ETL esperados.');
   continue;
  }
  records++;
  const entity=JSON.parse(line);
  if(String(entity.id)!==id)continue;
  if(found)throw Error('ID repetido en el archivo de origen.');
  const count=ensureGeometry(entity.geometria);
  const provinceId=resource==='provincias'?id:String(entity.provincia?.id||'');
  if(!/^\d{2}$/.test(provinceId))throw Error('Falta provincia oficial del departamento.');
  if(resource==='departamentos'&&provinceId!==id.slice(0,2))throw Error('El ID y la provincia del departamento no coinciden.');
  found={entity,count,provinceId};
 }
 if(!found)throw Error('No se encontró la unidad '+id+' en el archivo NDJSON.');
 // Second streaming pass hashes exact bytes without normalizing newline sequences.
 const digest=createHash('sha256');
 for await(const block of fs.createReadStream(file))digest.update(block);
 const inputSha256=digest.digest('hex');
 const feature={type:'Feature',properties:{
   id:String(found.entity.id),name:String(found.entity.nombre??'').slice(0,180),
   provincia:{id:found.provinceId},fuente_declarada:String(found.entity.fuente||'sin especificar').slice(0,160)
 },geometry:found.entity.geometria};
 const collection={type:'FeatureCollection',features:[feature]};
 const contents=JSON.stringify(collection);
 const bytes=Buffer.byteLength(contents);
 const outputSha256=createHash('sha256').update(contents).digest('hex');
 return {collection,contents,manifest:{
  resource,id,provinceId:found.provinceId,
  inputSha256,outputSha256,
  etlMetadata:{version:metadata.version,fecha_creacion:metadata.fecha_creacion,cantidad:metadata.cantidad??null},
  processedRecords:records,
  vertexCount:found.count,outputBytes:bytes,
  browserCompatible:bytes<=1048576&&found.count<=12000,
  sourceOrigin:'archivo NDJSON aportado por operador, autenticidad institucional NO comprobada',
  datasetDocumentation:'https://www.argentina.gob.ar/georef/estructura-de-archivos-ndjson',
  warnings:'No determina la localización ni área del proyecto ambiental. No es una aprobación ni perímetro catastral.'
 }};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [file,resource,id,out]=process.argv.slice(2);
 if(!file||!resource||!id||!out){console.error('Uso: node scripts/georef-ndjson-extract.mjs <input.ndjson> <provincias|departamentos> <id> <output.geojson>');process.exitCode=2;}
 else {
  try{
   const result=await extractGeorefBoundary(file,resource,id);
   await fs.promises.writeFile(out,result.contents,{flag:'wx'});
   await fs.promises.writeFile(out+'.manifest.json',JSON.stringify(result.manifest,null,2),{flag:'wx'});
   console.log(JSON.stringify({output:out,vertexCount:result.manifest.vertexCount,
    compatibleWithBrowser:result.manifest.browserCompatible,sha256:result.manifest.outputSha256},null,2));
  }catch(e){console.error('ERROR: '+e.message);process.exitCode=1;}
 }
}
