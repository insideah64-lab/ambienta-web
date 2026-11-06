import booleanWithin from '@turf/boolean-within';

import {ndviPolygon,type NdviGeometry} from './NdviClient';

export const BROWSER_ENGINE='browser-ndvi-s2-v1';

export const BROWSER_MAX_PIXELS=2_000_000;

export const BROWSER_NODATA=-9999;

export type BrowserAsset={href:string;scale:number;offset:number;nodata:number};

export type BrowserScene={id:string;date:string;cloud:number;ready:boolean;footprint:any;assets:Record<'red'|'nir'|'blue'|'scl',BrowserAsset>};

export type BrowserStats={validPixels:number;min:number|null;mean:number|null;max:number|null};

export type BrowserReport={schema:'mita.browser-ndvi/1';analysisId:string;projectId:string;engine:typeof BROWSER_ENGINE;fingerprint:string;generatedAt:string;geometry:NdviGeometry;scene:BrowserScene;grid:{width:number;height:number;crs:string;resolution:10;origin:number[];insidePixels:number};statistics:BrowserStats;outputSha256:string;formula:string;qualityMask:string;calibration:Record<string,{scale:number;offset:number}>;timing:{processingMs:number};limitations:string[]};

export type BrowserArtifacts={report:BrowserReport;files:Record<'report.json'|'ndvi.tif'|'preview.png'|'statistics.csv',Blob>};

export const BROWSER_FILES=['report.json','ndvi.tif','preview.png','statistics.csv'] as const;

export function approvedBrowserAsset(href:unknown){if(typeof href!=='string'||href.length>2048)throw Error('Activo Sentinel-2 inválido.');const u=new URL(href);if(u.protocol!=='https:'||u.hostname!=='e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com'||u.username||u.password||u.port||u.search||u.hash||!u.pathname.startsWith('/sentinel-2-c1-l2a/')||!u.pathname.endsWith('.tif'))throw Error('Activo fuera del catálogo Sentinel-2 aprobado.');return href;}

export function browserQuery(geometry:unknown,start:string,end:string,cloud:number){const g=ndviPolygon(geometry);for(const d of [start,end])if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)throw Error('Completá fechas válidas.');const days=(Date.parse(end)-Date.parse(start))/86400000;if(days<0||days>366||!Number.isFinite(cloud)||cloud<0||cloud>100)throw Error('Período máximo 366 días y nubosidad entre 0 y 100 %.');if((Math.ceil((g.bbox[2]-g.bbox[0])*111320/10)+4)*(Math.ceil((g.bbox[3]-g.bbox[1])*111700/10)+4)>BROWSER_MAX_PIXELS)throw Error('La delimitación supera el presupuesto de dos millones de píxeles; usá un área menor.');return g;}

export function browserScenes(data:any,geometry:NdviGeometry,maxCloud:number):BrowserScene[]{if(!Array.isArray(data?.features)||data.features.length>20)throw Error('Catálogo incompatible.');const parts=geometry.type==='Polygon'?[geometry]:((geometry.coordinates as any[]).map(coordinates=>({type:'Polygon',coordinates})));return data.features.flatMap((f:any)=>{try{const p=f.properties;if(!/^[A-Za-z0-9_-]{1,180}$/.test(f.id)||!Number.isFinite(Date.parse(p.datetime))||!Number.isFinite(p['eo:cloud_cover'])||p['eo:cloud_cover']<0||p['eo:cloud_cover']>maxCloud||f.collection!=='sentinel-2-c1-l2a')return [];const assets={} as BrowserScene['assets'];for(const key of ['red','nir','blue','scl'] as const){const a=f.assets[key],b=a['raster:bands']?.[0];approvedBrowserAsset(a.href);if(!Number.isFinite(b?.nodata))throw Error();if(key!=='scl'&&(!Number.isFinite(b.scale)||b.scale<=0||!Number.isFinite(b.offset)))throw Error();assets[key]={href:a.href,scale:key==='scl'?1:b.scale,offset:key==='scl'?0:b.offset,nodata:b.nodata};}const ready=f.geometry?.type==='Polygon'&&parts.every(g=>booleanWithin(g as any,f.geometry));return [{id:f.id,date:p.datetime,cloud:p['eo:cloud_cover'],ready,footprint:f.geometry,assets}];}catch{return [];}});}

export async function searchBrowserScenes(geometry:NdviGeometry,start:string,end:string,cloud:number,signal?:AbortSignal){const g=browserQuery(geometry,start,end,cloud);const r=await fetch('https://earth-search.aws.element84.com/v1/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({collections:['sentinel-2-c1-l2a'],bbox:g.bbox,datetime:start+'T00:00:00Z/'+end+'T23:59:59Z',limit:20}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(45000)]):AbortSignal.timeout(45000)});if(!r.ok)throw Error('El catálogo no respondió ('+r.status+').');const text=await r.text();if(text.length>8_000_000)throw Error('Catálogo demasiado grande.');return browserScenes(JSON.parse(text),g.geometry,cloud);}

export function canonical(value:any):string{if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}

export async function digest(value:BufferSource){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',value))].map(n=>n.toString(16).padStart(2,'0')).join('');}

export async function browserFingerprint(geometry:NdviGeometry,scene:BrowserScene){return digest(new TextEncoder().encode(canonical({engine:BROWSER_ENGINE,geometry,scene})));}

export function browserNdvi(red:number,nir:number){const r=Math.fround(red),n=Math.fround(nir),d=Math.fround(r+n);if(!Number.isFinite(r)||!Number.isFinite(n)||d<=Math.fround(1e-6))return BROWSER_NODATA;const v=Math.fround(Math.fround(n-r)/d);return Number.isFinite(v)&&v>=Math.fround(-1.00001)&&v<=Math.fround(1.00001)?v:BROWSER_NODATA;}

export function ringContains(x:number,y:number,ring:number[][]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}

export function polygonContains(x:number,y:number,polygons:number[][][][]){return polygons.some(p=>ringContains(x,y,p[0])&&!p.slice(1).some(h=>ringContains(x,y,h)));}

export function parseBrowserReport(value:unknown,project?:string):BrowserReport{const r=value as BrowserReport,s=r?.statistics;if(r?.schema!=='mita.browser-ndvi/1'||r.engine!==BROWSER_ENGINE||!/^\w[\w-]{0,79}$/.test(r.projectId)||(project&&r.projectId!==project)||!/^([a-f0-9]{32})$/.test(r.analysisId)||![r.fingerprint,r.outputSha256].every(x=>/^[a-f0-9]{64}$/.test(x))||!Number.isFinite(Date.parse(r.generatedAt))||!r.grid||!Number.isInteger(r.grid.width)||!Number.isInteger(r.grid.height)||r.grid.width<1||r.grid.height<1||r.grid.width*r.grid.height>BROWSER_MAX_PIXELS||!/^EPSG:32[67](0[1-9]|[1-5][0-9]|60)$/.test(r.grid.crs)||r.grid.resolution!==10||!Number.isInteger(r.grid.insidePixels)||r.grid.insidePixels<0||r.grid.insidePixels>r.grid.width*r.grid.height||!Array.isArray(r.grid.origin)||r.grid.origin.length!==2||!r.grid.origin.every(Number.isFinite)||!s||!Number.isInteger(s.validPixels)||s.validPixels<0||s.validPixels>r.grid.insidePixels||(s.validPixels?![s.min,s.mean,s.max].every(x=>typeof x==='number'&&Number.isFinite(x))||s.min!>s.mean!||s.mean!>s.max!:[s.min,s.mean,s.max].some(x=>x!==null)))throw Error('Informe de cálculo local incompatible.');if(!r.timing||!Number.isFinite(r.timing.processingMs)||r.timing.processingMs<0||typeof r.formula!=='string'||typeof r.qualityMask!=='string'||!Array.isArray(r.limitations)||!r.limitations.every(x=>typeof x==='string')||(s.validPixels&&(s.min! < -1.00001||s.max! > 1.00001)))throw Error('Metadatos del informe incompatibles.');ndviPolygon(r.geometry);if(!r.scene?.ready||!Number.isFinite(Date.parse(r.scene.date)))throw Error('Escena del informe inválida.');for(const k of ['red','nir','blue','scl'] as const){const a=r.scene.assets[k];approvedBrowserAsset(a.href);if(!Number.isFinite(a.scale)||a.scale<=0||!Number.isFinite(a.offset)||!Number.isFinite(a.nodata))throw Error('Calibración del informe inválida.');}return r;}

