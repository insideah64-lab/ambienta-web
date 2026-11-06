// @ts-ignore: reuse the existing topological perimeter validator, without saving/mutating it.
import {validatePerimeterGeoJson} from '../maps/perimeter-source.mjs';
export type NdviGeometry={type:'Polygon'|'MultiPolygon';coordinates:unknown};
export type NdviForm={west:string;south:string;east:string;north:string;start:string;end:string;maxCloud:string};
export type NdviScene={id:string;date:string;cloud:number;ready:boolean;coversWindow:boolean};
export type NdviSearch={searchId:string;scenes:NdviScene[];partial:boolean;message:string};
export type NdviJob={id:string;project:string;status:'queued'|'running'|'succeeded'|'failed'|'cancelled';phase:string;created:string;updated:string;error:string|null;cancelRequested:boolean;sceneId:string;bbox:number[];query:{start:string;end:string;maxCloud:number;geometry?:NdviGeometry|null};index:'ndvi';mode:'local-only'};
export type NdviSummary={sceneId:string;acquiredAt:string;min:number|null;mean:number|null;max:number|null;validPixels:number;rasterPixels:number;windowPixels:number;validFraction:number;aoiKind?:'polygon'|'bbox';crs:string;width:number;height:number;legend:{value:number;color:string}[]};
export const emptyNdviForm=():NdviForm=>({west:'',south:'',east:'',north:'',start:'',end:'',maxCloud:'30'});
// Conservative 10 m planning estimate; actual source-grid size is checked before reading bands.
export const ndviWindowPixels=(b:number[])=>(Math.ceil((b[2]-b[0])*111320/10)+4)*(Math.ceil((b[3]-b[1])*111700/10)+4);
export function ndviPolygon(input:unknown):{geometry:NdviGeometry;bbox:number[]}{
 const g=input as {type?:string};
 const parsed=validatePerimeterGeoJson(g?.type==='Polygon'||g?.type==='MultiPolygon'?{type:'Feature',properties:{},geometry:input}:input);
 const geometry=parsed.geojson.features[0].geometry as NdviGeometry;
 let positions=0;function count(v:unknown){if(!Array.isArray(v))return;if(typeof v[0]==='number'){positions++;return;}v.forEach(count);}count(geometry.coordinates);
 if(positions>2000)throw Error('Piloto NDVI: el polígono admite hasta 2.000 coordenadas. No se simplifica automáticamente.');
 return {geometry,bbox:[...parsed.bounds]};
}
export function ndviQuery(form:NdviForm,geometry?:NdviGeometry|null){
 const bbox=[form.west,form.south,form.east,form.north].map(v=>v.trim()===''?NaN:Number(v));
 if(bbox.some(v=>!Number.isFinite(v))||bbox[0]<-180||bbox[2]>180||bbox[1]<-90||bbox[3]>90||bbox[0]>=bbox[2]||bbox[1]>=bbox[3])throw Error('Ingresá una ventana válida: oeste < este y sur < norte, en grados WGS84.');
 if(ndviWindowPixels(bbox)>12000000)throw Error('La extensión supera el presupuesto del piloto de 12 millones de píxeles a 10 m. Usá una delimitación menor; no se sustituye por un rectángulo ni se simplifica automáticamente.');
 for(const value of [form.start,form.end])if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw Error('Indicá fechas válidas.');
 const days=(Date.parse(form.end)-Date.parse(form.start))/86400000;
 if(days<0||days>366)throw Error('El período debe estar ordenado y abarcar hasta 366 días.');
 const cloud=form.maxCloud.trim()===''?NaN:Number(form.maxCloud);
 if(!Number.isFinite(cloud)||cloud<0||cloud>100)throw Error('La nubosidad máxima debe estar entre 0 y 100 %.');
 if(geometry){const checked=ndviPolygon(geometry);if(checked.bbox.some((n,i)=>Math.abs(n-bbox[i])>1e-8))throw Error('La ventana no coincide con el polígono. Volvé a seleccionarlo.');}
 return {bbox,start:form.start,end:form.end,max_cloud:cloud,...(geometry?{geometry}: {})};
}
export const ndviFileUrl=(job:NdviJob,kind:'preview'|'report'|'raster'|'view-fixed'|'view-local'|'context'|'view-fixed-terreno'|'view-fixed-viridis'|'view-local-viridis'|'view-fixed-cividis'|'view-local-cividis')=>'/api/mita/jobs/'+encodeURIComponent(job.id)+'/files/'+kind+'?project='+encodeURIComponent(job.project);
export async function ndviRequest<T>(path:string,body?:unknown,signal?:AbortSignal):Promise<T>{
 if(!/^\/(health|scenes\/search|jobs(?:\/[a-f0-9]{32}(?:\/(?:cancel|summary|analysis))?)?)(\?project=[A-Za-z0-9_%.-]+)?$/.test(path)&&!/^\/jobs\/[a-f0-9]{32}\/pixel\?project=[A-Za-z0-9_%.-]+&row=\d{1,8}&col=\d{1,8}$/.test(path))throw Error('Ruta de procesamiento no autorizada.');
 const r=await fetch('/api/mita'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json','x-mita-client':'ambienta-ndvi-v1'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:signal||AbortSignal.timeout(25000),credentials:'same-origin'});
 const text=await r.text();if(text.length>1000000)throw Error('La respuesta del servicio es demasiado grande.');
 let data;try{data=JSON.parse(text);}catch{throw Error('Esta instalación no tiene un servicio NDVI compatible. Podés seguir importando informes.');}
 if(!r.ok)throw Error(typeof data.detail==='string'?data.detail:'El servicio NDVI rechazó la solicitud ('+r.status+').');
 return data as T;
}
export function ndviLegend(stops:NdviSummary['legend']){
 if(!Array.isArray(stops)||stops.length<2||stops.length>20||stops.some((s,i)=>!Number.isFinite(s.value)||s.value<-1||s.value>1||!/^#[a-f0-9]{8}$/i.test(s.color)||(i>0&&s.value<=stops[i-1].value)))return undefined;
 return 'linear-gradient(to right,'+stops.map(s=>s.color+' '+((s.value+1)*50)+'%').join(',')+')';
}
