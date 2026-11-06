import {assess,type Assessment} from './MatrixMethodData';
export const RIAM_CATEGORIES={PC:'Físico / químico',BE:'Biológico / ecológico',SC:'Sociocultural',EO:'Económico / operacional'} as const;
export type RiamCategory=keyof typeof RIAM_CATEGORIES;
export const RIAM_BAND_VERSION='Pastakia/Jensen 1998 · bandas ES A–E, N';
export const RIAM_SOURCES=['https://doi.org/10.1016/S0195-9255(98)00018-3','https://doi.org/10.1016/j.eiar.2007.06.004'];
export const RIAM_BANDS=[
 {letter:'A',min:1,max:9,label:'Cambio leve'},
 {letter:'B',min:10,max:18,label:'Cambio'},
 {letter:'C',min:19,max:35,label:'Cambio moderado'},
 {letter:'D',min:36,max:71,label:'Cambio significativo'},
 {letter:'E',min:72,max:108,label:'Cambio mayor'}
] as const;
export function riamBand(score:number|null|undefined){
 if(typeof score!=='number'||!Number.isInteger(score)||Math.abs(score)>108)return null;
 if(score===0)return {code:'N',description:'Sin cambio / estado de referencia / no aplicable',score:0};
 const band=RIAM_BANDS.find(b=>Math.abs(score)>=b.min&&Math.abs(score)<=b.max)!;
 return {code:(score<0?'-':'+')+band.letter,description:band.label+(score<0?' negativo':' positivo'),score};
}
export const RIAM_BAND_CODES=['-E','-D','-C','-B','-A','N','+A','+B','+C','+D','+E'];
export const RIAM_HELP:Record<string,string>={
 A1:'Importancia para los intereses afectados, considerando alcance y sensibilidad. Nivel 3: regional/nacional; nivel 4: nacional/internacional. Documentá la distinción del caso, sin deducirla solo de una distancia.',
 A2:'Cambio respecto de la situación de referencia: −3 a +3. El signo proviene de A2. Cero es una valoración explícita; un criterio pendiente se deja vacío.',
 B1:'Condición temporal o permanente. Una obra permanente puede tener efectos reversibles: B1 y B2 se juzgan por separado. El valor 1 significa sin cambio o no aplicable.',
 B2:'Posibilidad de revertir el efecto, distinta de cuánto dura la condición. Justificá el escenario de reversión; valor 1: sin cambio o no aplicable.',
 B3:'Efecto simple/no acumulativo, acumulativo en el tiempo o sinérgico con otras condiciones. No equivale a permanencia o irreversibilidad; valor 1: sin cambio o no aplicable.'
};
export type RiamMetadata={schema:'ambienta.riam-interpretation.v1';projectId:string;updatedAt:string;factorCategories:Record<string,RiamCategory>};
export const riamMetadataKey=(projectId:string)=>'ambienta-riam-interpretation-v1:'+projectId;
export const emptyRiamMetadata=(projectId:string):RiamMetadata=>({schema:'ambienta.riam-interpretation.v1',projectId,updatedAt:new Date().toISOString(),factorCategories:{}});
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
export function validRiamMetadata(x:unknown,projectId:string):x is RiamMetadata{
 return object(x)&&Object.keys(x).length===4&&x.schema==='ambienta.riam-interpretation.v1'&&x.projectId===projectId&&typeof x.updatedAt==='string'&&x.updatedAt.length<50&&Number.isFinite(Date.parse(x.updatedAt))&&object(x.factorCategories)&&Object.keys(x.factorCategories).length<=12000&&Object.entries(x.factorCategories).every(([id,c])=>id.trim().length>0&&id.length<=220&&typeof c==='string'&&Object.hasOwn(RIAM_CATEGORIES,c));
}
export function categoryAt(meta:RiamMetadata,factorId:string):RiamCategory|null{return Object.hasOwn(meta.factorCategories,factorId)?meta.factorCategories[factorId]:null;}
export function assignRiamCategory(meta:RiamMetadata,factorId:string,category:RiamCategory|'',now=new Date().toISOString()):RiamMetadata{
 const factorCategories={...meta.factorCategories};if(category)factorCategories[factorId]=category;else delete factorCategories[factorId];
 const next={...meta,updatedAt:now,factorCategories};if(!validRiamMetadata(next,meta.projectId))throw Error('Categoría o identificador RIAM inválido.');return next;
}
export type RiamAxes={factors:{id:string;name:string;group:string}[];actions:{id:string;name:string;phase:string}[]};
export type RiamRow={id:string;factorId:string;actionId:string;factor:string;action:string;phase:string;category:RiamCategory|null;score:number|null;band:ReturnType<typeof riamBand>;documented:boolean;inCatalog:boolean;entry:Assessment};
export function riamRows(axes:RiamAxes,entries:Record<string,Assessment>,meta:RiamMetadata):RiamRow[]{
 const factors=new Map(axes.factors.map(f=>[f.id,f])),actions=new Map(axes.actions.map(a=>[a.id,a]));
 return Object.entries(entries).map(([id,entry])=>{
  const split=id.indexOf('::'),factorId=split<0?id:id.slice(0,split),actionId=split<0?'':id.slice(split+2),factor=factors.get(factorId),action=actions.get(actionId),rawScore=assess('riam-1998',entry),score=rawScore===0?0:rawScore;
  return {id,factorId,actionId,factor:factor?.name||factorId,action:action?.name||actionId||'Sin acción identificable',phase:action?.phase||'',category:categoryAt(meta,factorId),score,band:riamBand(score),documented:score!==null&&!!entry.reason.trim()&&!!entry.evidence.trim(),inCatalog:!!factor&&!!action,entry};
 });
}
export function summarizeRiam(axes:RiamAxes,rows:RiamRow[],meta:RiamMetadata){
 const active=rows.filter(r=>r.inCatalog),ready=active.filter(r=>r.score!==null),documented=ready.filter(r=>r.documented).length;
 const bands=Object.fromEntries(RIAM_BAND_CODES.map(code=>[code,ready.filter(r=>r.band?.code===code).length]));
 const categories=[...Object.keys(RIAM_CATEGORIES),'unassigned'].map(code=>{
  const factorIds=new Set(axes.factors.filter(f=>(categoryAt(meta,f.id)||'unassigned')===code).map(f=>f.id));
  const subset=active.filter(r=>(r.category||'unassigned')===code),computed=subset.filter(r=>r.score!==null);
  return {code,ready:computed.length,documented:computed.filter(r=>r.documented).length,negative:computed.filter(r=>r.score!<0).length,neutral:computed.filter(r=>r.score===0).length,positive:computed.filter(r=>r.score!>0).length,pending:factorIds.size*axes.actions.length-computed.length};
 });
 return {total:axes.factors.length*axes.actions.length,ready:ready.length,documented,undocumented:ready.length-documented,pending:axes.factors.length*axes.actions.length-ready.length,orphaned:rows.length-active.length,bands,categories};
}
export function riamExport(axes:RiamAxes,entries:Record<string,Assessment>,meta:RiamMetadata){
 const rows=riamRows(axes,entries,meta);
 return {schema:'ambienta.riam-interpretation.export.v1',classificationVersion:RIAM_BAND_VERSION,sources:RIAM_SOURCES,metadata:meta,summary:summarizeRiam(axes,rows,meta),results:rows.map(({entry:_entry,...r})=>r),note:'Bandas metodológicas, sin umbrales legales. Fundamento y evidencia declarados no equivalen a revisión independiente. No se agregan ES ni se compensan efectos.'};
}
export function riamCsv(projectId:string,projectName:string,axes:RiamAxes,entries:Record<string,Assessment>,meta:RiamMetadata,version:string,metadataStatus="available"){
 const field=(v:unknown)=>{const s=String(v??'');return '"'+(/^\s*[=+\-@\t\r]/.test(s)?"'":'')+s.replaceAll('"','""')+'"';};
 const rows:unknown[][]=[['Proyecto','Método y versión','Acción','Etapa','Factor','Signo','A1','A2','B1','B2','B3','Resultado calculado','Fundamento','Evidencia','ID proyecto','ID interacción','ID factor','ID acción','Categoría RIAM','Banda RIAM','Descripción banda','Documentación','En catálogo','Versión bandas','Estado categorías']];
 for(const r of riamRows(axes,entries,meta))rows.push([projectName,version,r.action,r.phase,r.factor,r.entry.criteria.A2,...['A1','A2','B1','B2','B3'].map(k=>r.entry.criteria[k]),r.score,r.entry.reason,r.entry.evidence,projectId,r.id,r.factorId,r.actionId,r.category||'Sin clasificar',r.band?.code,r.band?.description,r.documented?'Fundamento y evidencia declarados':'Documentación pendiente',r.inCatalog?'Sí':'Fuera del catálogo; conservado',RIAM_BAND_VERSION,metadataStatus]);
 return '\uFEFF'+rows.map(row=>row.map(field).join(';')).join('\r\n');
}
