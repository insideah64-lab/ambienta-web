import {publishedTemporalFile} from './PublishedTemporal';
import {ndviPolygon,type NdviGeometry} from './NdviClient';
import {VEGETATION_INDICES,type VegetationIndex} from './VegetationModel';
export const MAX_TEMPORAL_DATES=12;
export const DELTA_DOMAINS=[.1,.25,1,2] as const;
export type TemporalStats={pixels:number;mean:number|null;min:number|null;max:number|null;p25:number|null;p75:number|null};
export type TemporalObservation={analysisId:string;sceneId:string;date:string;nativePixels:number;nativeValidPixels:number;nativeValidFraction:number;nativeMean:number|null;eligible:boolean;reason:string|null;common:TemporalStats|null;sha256:string};
export type TemporalReport={schema:'mita.vegetation-series/1';seriesId:string;projectId:string;index:VegetationIndex;sensor:'sentinel2'|'landsat89';collection:string;geometry:NdviGeometry;created:string;request:{start:string;end:string;minValidFraction:number;minCommonFraction:number};status:'ready'|'insufficient_dates'|'insufficient_common_support';observations:TemporalObservation[];eligibleDates:number;commonPixels:number;commonFraction:number;grid:{width:number;height:number;crs:string;resolution:number;insidePixels:number;referenceAnalysisId:string};comparison:null|{baselineId:string;finalId:string;baselineDate:string;finalDate:string;statistics:TemporalStats;increasedPixels:number;decreasedPixels:number;equalPixels:number;sha256:string};formula:string;method:string;limitations:string[];batch?:{batchId:string;catalogueComplete:boolean;requestedAcquisitions:unknown[]}};
export type TemporalJob={id:string;projectId:string;created:string;updated:string;status:'queued'|'processing'|'succeeded'|'partial'|'cancelled'|'failed';cancelRequested:boolean;error:string|null;seriesId:string|null;geometry:NdviGeometry;query:{sensor:'sentinel2'|'landsat89';start:string;end:string;max_cloud:number};criteria:{start:string;end:string;index:VegetationIndex;min_valid:number;min_common:number};items:{sceneId:string;date:string;analysisId:string;reused:boolean;status:string;error:string|null}[]};
export type TemporalArchive={seriesId:string;created:string;index:VegetationIndex;sensor:string;status:string;request:TemporalReport['request'];eligibleDates:number};
export type TemporalCandidate={id:string;sceneId:string;date:string;validFraction:number;validPixels:number};
export const TEMPORAL_STATES:Record<string,string>={queued:'En cola',processing:'Procesando',succeeded:'Completado',partial:'Parcial',cancelled:'Cancelado',failed:'Fallido'};
const object=(x:unknown)=>!!x&&typeof x==='object'&&!Array.isArray(x);
const id=(x:unknown)=>typeof x==='string'&&/^[a-f0-9]{32}$/.test(x);
const finite=(x:unknown)=>typeof x==='number'&&Number.isFinite(x);
const fraction=(x:unknown)=>finite(x)&&Number(x)>=0&&Number(x)<=1;
const count=(x:unknown,max=2000000)=>Number.isInteger(x)&&Number(x)>=0&&Number(x)<=max;
const stamp=(x:unknown)=>typeof x==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x));
const hash=(x:unknown)=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function temporalPeriod(start:string,end:string){for(const s of [start,end])if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error('Completá fechas válidas.');const days=(Date.parse(end)-Date.parse(start))/86400000;if(days<0||days>366)throw Error('Seleccioná un período ordenado de hasta 366 días.');}
export function temporalSelection(ids:string[]){if(ids.length<2||ids.length>MAX_TEMPORAL_DATES||new Set(ids).size!==ids.length||!ids.every(id))throw Error('Elegí entre 2 y 12 adquisiciones distintas.');return ids;}
function stats(s:TemporalStats){if(!object(s)||!count(s.pixels))return false;const v=[s.mean,s.min,s.max,s.p25,s.p75];if(!s.pixels)return v.every(x=>x===null);return v.every(finite)&&s.min!<=s.mean!&&s.mean!<=s.max!&&s.min!<=s.p25!&&s.p25!<=s.p75!&&s.p75!<=s.max!;}
export function parseTemporal(value:unknown,project:string,seriesId:string):TemporalReport{
 const r=value as TemporalReport;
 if(!object(r)||r.schema!=='mita.vegetation-series/1'||r.projectId!==project||!id(r.seriesId)||r.seriesId!==seriesId||!VEGETATION_INDICES.includes(r.index)||!['sentinel2','landsat89'].includes(r.sensor)||!stamp(r.created)||!object(r.request)||!fraction(r.request.minValidFraction)||!fraction(r.request.minCommonFraction)||!['ready','insufficient_dates','insufficient_common_support'].includes(r.status)||!object(r.grid)||!count(r.grid.width)||!count(r.grid.height)||r.grid.width<1||r.grid.height<1||r.grid.width*r.grid.height>2000000||!count(r.grid.insidePixels,r.grid.width*r.grid.height)||r.grid.resolution!==(r.sensor==='sentinel2'?10:30)||typeof r.grid.crs!=='string'||!id(r.grid.referenceAnalysisId)||!count(r.commonPixels,r.grid.insidePixels)||!fraction(r.commonFraction)||!Array.isArray(r.observations)||r.observations.length<2||r.observations.length>12||!Array.isArray(r.limitations)||!r.limitations.every(x=>typeof x==='string')||typeof r.formula!=='string'||typeof r.method!=='string')throw Error('Informe temporal incompatible.');
 temporalPeriod(r.request.start,r.request.end);ndviPolygon(r.geometry);
 const seen=new Set<string>(),days=new Set<string>();let previous=-Infinity;
 for(const row of r.observations){const day=row.date?.slice(0,10),t=Date.parse(row.date);if(!id(row.analysisId)||seen.has(row.analysisId)||!stamp(row.date)||days.has(day)||t<=previous||day<r.request.start||day>r.request.end||typeof row.sceneId!=='string'||!count(row.nativePixels)||!count(row.nativeValidPixels,row.nativePixels)||!fraction(row.nativeValidFraction)||(row.nativeValidPixels? !finite(row.nativeMean):row.nativeMean!==null)||typeof row.eligible!=='boolean'||!hash(row.sha256)||(row.reason!==null&&typeof row.reason!=='string')||(row.eligible? !row.common||!stats(row.common)||row.common.pixels!==r.commonPixels:row.common!==null))throw Error('Observaciones temporales incompatibles.');seen.add(row.analysisId);days.add(day);previous=t;}
 if(r.eligibleDates!==r.observations.filter(x=>x.eligible).length||Math.abs(r.commonFraction-(r.grid.insidePixels?r.commonPixels/r.grid.insidePixels:0))>1e-6)throw Error('Soporte temporal inconsistente.');
 if(r.status==='ready'){
  const c=r.comparison,a=r.observations.find(x=>x.analysisId===c?.baselineId&&x.eligible),b=r.observations.find(x=>x.analysisId===c?.finalId&&x.eligible);
  if(r.eligibleDates<2||!r.commonPixels||r.commonFraction<r.request.minCommonFraction||!c||!a||!b||a.date!==c.baselineDate||b.date!==c.finalDate||Date.parse(a.date)>=Date.parse(b.date)||!stats(c.statistics)||c.statistics.pixels!==r.commonPixels||!count(c.increasedPixels)||!count(c.decreasedPixels)||!count(c.equalPixels)||c.increasedPixels+c.decreasedPixels+c.equalPixels!==r.commonPixels||!hash(c.sha256))throw Error('Comparación temporal incompatible.');
 }else if(r.comparison!==null)throw Error('No corresponde un mapa de cambio sin soporte suficiente.');
 return r;
}
export function parseTemporalJob(value:unknown,project:string,jobId?:string):TemporalJob{
 const r=value as TemporalJob;
 if(!object(r)||!id(r.id)||(jobId&&r.id!==jobId)||r.projectId!==project||!TEMPORAL_STATES[r.status]||!stamp(r.created)||!stamp(r.updated)||typeof r.cancelRequested!=='boolean'||(r.error!==null&&typeof r.error!=='string')||(r.seriesId!==null&&!id(r.seriesId))||!object(r.query)||!object(r.criteria)||!['sentinel2','landsat89'].includes(r.query.sensor)||!VEGETATION_INDICES.includes(r.criteria.index)||!fraction(r.criteria.min_valid)||!fraction(r.criteria.min_common)||!Array.isArray(r.items)||r.items.length<2||r.items.length>12)throw Error('Tanda temporal incompatible.');
 ndviPolygon(r.geometry);temporalPeriod(r.query.start,r.query.end);
 for(const x of r.items)if(!id(x.analysisId)||!stamp(x.date)||typeof x.sceneId!=='string'||typeof x.reused!=='boolean'||!TEMPORAL_STATES[x.status]||(x.error!==null&&typeof x.error!=='string'))throw Error('Estado de adquisición incompatible.');
 return r;
}
export async function temporalRequest(path:string,body?:unknown,signal?:AbortSignal){
 if(!/^\/(candidates|series(?:\/[a-f0-9]{32})?|batches(?:\/[a-f0-9]{32}(?:\/cancel)?)?)(\?project=[A-Za-z0-9_%.-]+)?$/.test(path))throw Error('Ruta temporal no autorizada.');
 const r=await fetch('/api/mita/vegetation/temporal'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json','x-mita-client':'ambienta-ndvi-v1'},...(body===undefined?{}:{body:JSON.stringify(body)}),credentials:'same-origin',signal:signal||AbortSignal.timeout(60000)});
 const raw=await r.text();if(raw.length>1000000)throw Error('Respuesta temporal demasiado grande.');let data;try{data=JSON.parse(raw);}catch{throw Error('El servicio no ofrece seguimiento temporal compatible.');}if(!r.ok)throw Error(typeof data.detail==='string'?data.detail:'No se pudo completar el seguimiento temporal.');return data;
}
export function temporalFile(r:TemporalReport,kind:'report'|'csv'|'delta'|'preview',domain=.25,published=false){if(published){if(kind==='delta')throw Error('GeoTIFF no publicado en esta copia de consulta.');return publishedTemporalFile(r.projectId,r.seriesId,kind);}return '/api/mita/vegetation/temporal/series/'+r.seriesId+'/files/'+kind+'?project='+encodeURIComponent(r.projectId)+(kind==='preview'?'&domain='+domain:'');}
export function temporalChart(r:TemporalReport,detail:boolean){
 const rows=r.observations.filter(x=>x.eligible&&x.common?.mean!==null&&x.common),times=rows.map(x=>Date.parse(x.date));if(rows.length<2)return null;
 const vals=rows.flatMap(x=>[x.common!.mean!,x.common!.p25!,x.common!.p75!]),low=Math.min(...vals),high=Math.max(...vals),pad=Math.max(.01,(high-low)*.1);
 const lo=detail?low-pad:Math.min(-1,low-pad),hi=detail?high+pad:Math.max(1,high+pad),x=(t:number)=>70+(t-times[0])/(times[times.length-1]-times[0])*850,y=(v:number)=>260-(v-lo)/(hi-lo)*220;
 const dateTicks=[0,.25,.5,.75,1].map(v=>{const t=times[0]+(times[times.length-1]-times[0])*v;return {x:x(t),label:new Date(t).toISOString().slice(0,10)};}).filter((t,i,all)=>all.findIndex(a=>a.label===t.label)===i);
 return {rows,lo,hi,dateTicks,points:rows.map((row,i)=>({row,x:x(times[i]),y:y(row.common!.mean!),p25:y(row.common!.p25!),p75:y(row.common!.p75!)})),ticks:[0,.25,.5,.75,1].map(v=>({value:lo+(hi-lo)*v,y:y(lo+(hi-lo)*v)}))};
}
