import {ndviPolygon,type NdviGeometry} from './NdviClient';
export const VEGETATION_INDICES=['NDVI','SAVI','MSAVI2','EVI'] as const;
export type VegetationIndex=typeof VEGETATION_INDICES[number];
export const SENSOR_GUIDE={
 sentinel2:{label:'Sentinel-2 · 10 m',text:'Detalle espacial de vegetación. Reflectancia L2A; rojo B04, NIR B08 y azul B02. Máscara SCL 4, 5 y 6.'},
 landsat89:{label:'Landsat 8/9 · 30 m',text:'Seguimiento y comparación histórica. Reflectancia C2 L2 Tier 1; rojo B4, NIR B5 y azul B2. QA_PIXEL y QA_RADSAT; no se convierte a 10 m.'},
 modis:{label:'MODIS · 250 m · guía',text:'MOD13Q1 v6.1 ofrece NDVI y EVI compuestos de 16 días. Sirve para series regionales; mezcla coberturas pequeñas. Su descarga, QA y fecha de observación por píxel todavía no están integradas en este piloto.'},
} as const;
export type VegetationSensor=keyof typeof SENSOR_GUIDE;
export const INDEX_GUIDE:Record<VegetationIndex,string>={
 NDVI:'Referencia general: (NIR − rojo) / (NIR + rojo). El suelo influye cuando la cobertura es escasa; puede saturarse en doseles densos.',
 SAVI:'Reduce la influencia del suelo. L = 0,5 fijo, explícito en el informe; su pertinencia depende del suelo y de la cobertura.',
 MSAVI2:'Ajuste del suelo sin fijar L: alternativa para cobertura escasa. No convierte automáticamente el índice en clases de vegetación.',
 EVI:'Usa rojo, NIR y azul, con coeficientes 2,5; 6; 7,5; 1. Útil para estudiar doseles densos; exige revisar la calidad de la banda azul.',
};
export type IndexStats={validPixels:number;min:number|null;mean:number|null;max:number|null;outsideDisplayRange:number};
export type VegetationReport={schema:'mita.vegetation/1';analysisId:string;projectId:string;geometry:NdviGeometry;scene:{id:string;sensor:'sentinel2'|'landsat89';collection:string;date:string;cloud:number};grid:{width:number;height:number;crs:string;resolution:number;insidePixels:number};qualityMask:string;indices:Record<VegetationIndex,{statistics:IndexStats;sha256:string}>;formulas:Record<VegetationIndex,string>;calibration:Record<string,{scale:number;offset:number}>;limitations:string[]};
export type VegetationComparison={schema:'mita.vegetation-comparison/1';comparisonId:string;projectId:string;sentinel2:string;landsat89:string;dates:string[];daysApart:number;targetResolution:number;commonPixels:number;sentinel2Mean:number|null;landsatMean:number|null;biasLandsatMinusSentinel2:number|null;mae:number|null;correlation:number|null;method:string;limitations:string[]};
const id=(x:unknown)=>typeof x==='string'&&/^[a-f0-9]{32}$/.test(x);
const number=(x:unknown)=>typeof x==='number'&&Number.isFinite(x);
const nullable=(x:unknown)=>x===null||number(x);
const strings=(x:unknown)=>Array.isArray(x)&&x.length<30&&x.every(s=>typeof s==='string'&&s.length<2000);
export function vegetationIndex(value:string|null):VegetationIndex{return VEGETATION_INDICES.includes(value as VegetationIndex)?value as VegetationIndex:'NDVI';}
export function vegetationSensor(value:string|null):VegetationSensor{return value==='landsat89'||value==='modis'?value:'sentinel2';}
export function parseVegetation(value:unknown,project:string,analysisId:string):VegetationReport{
 const r=value as VegetationReport;
 if(!r||r.schema!=='mita.vegetation/1'||!id(r.analysisId)||r.analysisId!==analysisId||r.projectId!==project||!r.scene||!['sentinel2','landsat89'].includes(r.scene.sensor)||typeof r.scene.id!=='string'||typeof r.scene.collection!=='string'||!Number.isFinite(Date.parse(r.scene.date))||!number(r.scene.cloud)||r.scene.cloud<0||r.scene.cloud>100||!r.grid||!Number.isInteger(r.grid.width)||!Number.isInteger(r.grid.height)||r.grid.width<1||r.grid.height<1||r.grid.width*r.grid.height>2000000||!number(r.grid.resolution)||r.grid.resolution<=0||typeof r.grid.crs!=='string'||!Number.isInteger(r.grid.insidePixels)||r.grid.insidePixels<0||r.grid.insidePixels>r.grid.width*r.grid.height||typeof r.qualityMask!=='string'||!strings(r.limitations))throw Error('Informe de vegetación incompatible.');
 ndviPolygon(r.geometry);
 if(r.grid.resolution!==(r.scene.sensor==='sentinel2'?10:30))throw Error('Resolución incompatible con el sensor del perfil.');
 for(const k of VEGETATION_INDICES){const s=r.indices?.[k]?.statistics;if(!s||!Number.isInteger(s.validPixels)||s.validPixels<0||s.validPixels>r.grid.insidePixels||![s.min,s.mean,s.max].every(nullable)||!Number.isInteger(s.outsideDisplayRange)||s.outsideDisplayRange<0||s.outsideDisplayRange>s.validPixels||!((s.validPixels===0&&s.min===null&&s.mean===null&&s.max===null)||(s.validPixels>0&&number(s.min)&&number(s.mean)&&number(s.max)&&s.min!<=s.mean!&&s.mean!<=s.max!))||!/^[a-f0-9]{64}$/.test(r.indices[k].sha256)||typeof r.formulas?.[k]!=='string')throw Error('Estadísticas o fórmulas incompatibles.');}
 return r;
}
export function parseVegetationComparison(value:unknown,project:string):VegetationComparison{
 const r=value as VegetationComparison;
 if(!r||r.schema!=='mita.vegetation-comparison/1'||!id(r.comparisonId)||r.projectId!==project||!id(r.sentinel2)||!id(r.landsat89)||!Array.isArray(r.dates)||r.dates.length!==2||!r.dates.every(d=>typeof d==='string'&&Number.isFinite(Date.parse(d)))||!number(r.daysApart)||r.daysApart<0||r.daysApart>16||!number(r.targetResolution)||r.targetResolution!==30||!Number.isInteger(r.commonPixels)||r.commonPixels<0||r.commonPixels>2000000||![r.sentinel2Mean,r.landsatMean,r.biasLandsatMinusSentinel2,r.mae,r.correlation].every(nullable)||typeof r.method!=='string'||!strings(r.limitations))throw Error('Comparación incompatible.');
 if(r.commonPixels===0&&[r.sentinel2Mean,r.landsatMean,r.biasLandsatMinusSentinel2,r.mae,r.correlation].some(v=>v!==null))throw Error('Comparación sin soporte válido.');
 if(r.commonPixels>0&&(r.sentinel2Mean===null||r.landsatMean===null||r.biasLandsatMinusSentinel2===null||r.mae===null))throw Error('Comparación incompleta.');
 if((r.mae!==null&&r.mae<0)||(r.correlation!==null&&Math.abs(r.correlation)>1))throw Error('Métricas de comparación inválidas.');
 return r;
}
export async function vegetationRequest(path:string,body?:unknown,signal?:AbortSignal){
 if(!/^\/(search|analyses(?:\/[a-f0-9]{32})?|comparisons(?:\/[a-f0-9]{32})?)(\?project=[A-Za-z0-9_%.-]+)?$/.test(path))throw Error('Ruta de vegetación no autorizada.');
 const response=await fetch('/api/mita/vegetation'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json','x-mita-client':'ambienta-ndvi-v1'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:signal||AbortSignal.timeout(300000),credentials:'same-origin'});
 const raw=await response.text();if(raw.length>1000000)throw Error('Respuesta de vegetación demasiado grande.');
 let d;try{d=JSON.parse(raw);}catch{throw Error('Esta instalación no tiene el servicio de vegetación compatible.');}
 if(!response.ok)throw Error(typeof d.detail==='string'?d.detail:'El servicio rechazó la solicitud.');return d;
}
