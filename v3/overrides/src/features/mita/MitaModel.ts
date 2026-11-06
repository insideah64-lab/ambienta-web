// Public result contract only. The private Python engine is not embedded here.
import {ndviPolygon} from './NdviClient';
export const MITA_SCHEMA='ambienta.mita-results.v1';
export const MAX_REPORT_BYTES=1024*1024;
export const MAX_TIFF_BYTES=64*1024*1024;
export const mitaKey=(project:string)=>'ambienta-mita-results-v1:'+project;
export type Report=Record<string,any>;
export type MitaEntry={id:string;filename:string;raw:string;importedAt:string;context:string};
export type MitaDocument={schema:typeof MITA_SCHEMA;projectId:string;entries:MitaEntry[]};
export const emptyMita=(projectId:string):MitaDocument=>({schema:MITA_SCHEMA,projectId,entries:[]});
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const integer=(n:unknown)=>finite(n)&&Number.isSafeInteger(n)&&n>=0;
const text=(s:unknown)=>typeof s==='string'&&s.trim().length>0;
const date=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)===s.slice(0,10);
const ensure=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
export function parseMitaReport(raw:string):Report{
 ensure(new TextEncoder().encode(raw).length<=MAX_REPORT_BYTES,'El informe supera 1 MiB.');
 let r:Report;try{r=JSON.parse(raw);}catch{throw Error('El archivo no contiene JSON válido.');}
 ensure(r&&r.engine==='MITA'&&r.version==='0.2.0'&&r.index==='NDVI','Se admite el JSON nativo MITA 0.2.0 de scene-ndvi (NDVI). Otros formatos requieren un adaptador.');
 ensure(r.provider==='earthsearch'&&text(r.collection)&&text(r.scene_id),'Faltan proveedor, colección o identificador de escena.');
 ensure(r.assets&&['red','nir','scl'].every(k=>text(r.assets[k]))&&text(r.stac_catalog),'Faltan las fuentes B04/B08/SCL o el catálogo STAC.');
 ensure(date(r.acquisition_datetime)&&date(r.generated_at_utc),'Las fechas de adquisición y generación deben ser ISO con hora.');
 ensure(Date.parse(r.generated_at_utc)>=Date.parse(r.acquisition_datetime),'La generación es anterior a la adquisición.');
 ensure(finite(r.scene_cloud_percent)&&r.scene_cloud_percent>=0&&r.scene_cloud_percent<=100,'Nubosidad de escena inválida.');
 const b=r.bbox_epsg4326;
 ensure(Array.isArray(b)&&b.length===4&&b.every(finite)&&b[0]>=-180&&b[2]<=180&&b[1]>=-90&&b[3]<=90&&b[0]<b[2]&&b[1]<b[3],'BBOX EPSG:4326 inválida o cruzada.');
 const a=r.raster,s=r.statistics,q=r.quality,c=r.calibration;
 ensure(a&&integer(a.width)&&integer(a.height)&&a.width>0&&a.height>0&&a.width*a.height<=12000000&&text(a.crs),'Dimensiones o CRS del ráster inválidos (máximo 12 millones de píxeles).');
 ensure(s&&integer(s.pixels)&&s.pixels===a.width*a.height&&integer(s.valid_pixels)&&s.valid_pixels<=s.pixels,'Recuento de píxeles inconsistente con el ráster.');
 ensure(finite(s.valid_fraction)&&Math.abs(s.valid_fraction-s.valid_pixels/s.pixels)<=0.0000011,'Fracción válida del ráster inconsistente.');
 ensure(q&&integer(q.inside_bbox_pixels)&&q.inside_bbox_pixels>0&&q.inside_bbox_pixels<=s.pixels&&q.valid_pixels===s.valid_pixels&&q.valid_pixels<=q.inside_bbox_pixels,'Recuento de calidad dentro de BBOX inconsistente.');
 ensure(finite(q.valid_fraction_inside_bbox)&&Math.abs(q.valid_fraction_inside_bbox-q.valid_pixels/q.inside_bbox_pixels)<=0.0000011,'Fracción válida local inconsistente.');
 if(r.aoi!==undefined){
  ensure(r.aoi?.kind==='polygon'&&r.aoi.crs==='EPSG:4326','Máscara de recorte no compatible.');
  const p=ndviPolygon(r.aoi.geometry);
  ensure(p.bbox.every((n,i)=>Math.abs(n-b[i])<=1e-8)&&/^[a-f0-9]{64}$/i.test(r.aoi.sha256||''),'Extensión o huella de la máscara inválida.');
  ensure(integer(q.inside_aoi_pixels)&&q.inside_aoi_pixels>0&&q.inside_aoi_pixels<=q.inside_bbox_pixels&&s.valid_pixels<=q.inside_aoi_pixels,'Recuento del polígono inconsistente.');
  ensure(finite(q.valid_fraction_inside_aoi)&&Math.abs(q.valid_fraction_inside_aoi-s.valid_pixels/q.inside_aoi_pixels)<=0.0000011,'Fracción válida del polígono inconsistente.');
 }
 ensure(JSON.stringify(q.scl_valid_classes)==='[4,5,6]'&&q.resampling_nir==='bilinear'&&q.resampling_scl==='nearest','La máscara SCL o el remuestreo no corresponden al perfil MITA 0.2.0.');
 if(s.valid_pixels===0)ensure(s.ndvi_min===null&&s.ndvi_max===null&&s.ndvi_mean===null,'Sin píxeles válidos, las estadísticas NDVI deben ser null.');
 else ensure([s.ndvi_min,s.ndvi_max,s.ndvi_mean].every(finite)&&s.ndvi_min>=-1.00001&&s.ndvi_max<=1.00001&&s.ndvi_min<=s.ndvi_mean&&s.ndvi_mean<=s.ndvi_max,'Estadísticas NDVI fuera de rango u orden.');
 ensure(c&&finite(c.red_scale)&&c.red_scale>0&&finite(c.nir_scale)&&c.nir_scale>0&&finite(c.red_offset)&&finite(c.nir_offset),'Falta calibración radiométrica explícita.');
 ensure(typeof r.output_sha256==='string'&&/^[a-f0-9]{64}$/i.test(r.output_sha256),'Falta SHA-256 del GeoTIFF de salida.');
 ensure(text(r.validation_status),'Falta el estado de validación declarado por el motor.');
 return r;
}
export const sha256=async(bytes:BufferSource)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
export const reportHash=(raw:string)=>sha256(new TextEncoder().encode(raw));
export function readMita(raw:string|null,projectId:string):MitaDocument{
 if(raw===null)return emptyMita(projectId);
 const d=JSON.parse(raw);
 ensure(d?.schema===MITA_SCHEMA&&d.projectId===projectId&&Array.isArray(d.entries)&&d.entries.length<=20,'Archivo local MITA incompatible; se conserva sin sobrescribir.');
 const ids=new Set();
 for(const e of d.entries){
  ensure(e&&/^[a-f0-9]{64}$/.test(e.id)&&!ids.has(e.id)&&text(e.filename)&&date(e.importedAt)&&text(e.context)&&e.context.trim().length>=10&&typeof e.raw==='string','Registro local MITA inválido.');
  parseMitaReport(e.raw);ids.add(e.id);
 }
 return d;
}
export function addMita(d:MitaDocument,e:MitaEntry):MitaDocument{
 if(d.entries.some(x=>x.id===e.id))return d;
 ensure(d.entries.length<20,'Máximo de 20 informes por proyecto. Exportá el archivo antes de continuar.');
 const next={...d,entries:[...d.entries,e]};readMita(JSON.stringify(next),d.projectId);return next;
}
export async function verifyTiff(bytes:ArrayBuffer,expected:string){
 ensure(bytes.byteLength>8&&bytes.byteLength<=MAX_TIFF_BYTES,'GeoTIFF: tamaño admitido entre 9 bytes y 64 MiB.');
 const b=new Uint8Array(bytes),le=b[0]===73&&b[1]===73,be=b[0]===77&&b[1]===77;
 ensure((le&&(b[2]===42||b[2]===43)&&b[3]===0)||(be&&b[2]===0&&(b[3]===42||b[3]===43)),'El archivo no tiene cabecera TIFF.');
 const hash=await sha256(bytes);ensure(hash===expected.toLowerCase(),'El SHA-256 no coincide con el GeoTIFF declarado. El archivo no se vincula.');
 return hash;
}
