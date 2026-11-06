// Explicitly published reference products. No arbitrary URL or private result fallback.
export const PUBLISHED_TEMPORAL=[{projectId:'DIAB-2026-DEMO',seriesId:'6ea60b7337eb52a9e9c51311f5796647',created:'2026-11-06T03:33:04.830901+00:00',index:'NDVI',sensor:'sentinel2',status:'ready',eligibleDates:3,request:{start:'2025-06-01',end:'2025-06-20',minValidFraction:.8,minCommonFraction:.5}}] as const;
export function publishedTemporal(project:string,id:string){return PUBLISHED_TEMPORAL.find(e=>e.projectId===project&&e.seriesId===id);}
export function publishedTemporalFile(project:string,id:string,kind:'report'|'csv'|'preview'){
 if(!publishedTemporal(project,id))throw Error('Este resultado no tiene una copia pública en este proyecto.');
 return './published-temporal/'+id+'/'+({report:'report.json',csv:'observations.csv',preview:'preview.png'}[kind]);
}
