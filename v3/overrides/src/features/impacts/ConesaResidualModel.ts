import {calculateConesa,conesaProblems,CONESA_FIELDS,validatedConesaEntry,
 type ConesaEntry,type ConesaResult} from './ConesaSimplificadoModel';

/**
 * Residual scenarios belong to Conesa simplificado tutorial v1 only.
 * No conversion to legal impact significance, no automatic reduction in score.
 * The initial Conesa valuation remains authoritative in its separate store.
 */
export const RESIDUAL_METHOD_ID='conesa-simplificado-residual-v1' as const;
export type Hierarchy=''|'evitar'|'minimizar'|'restaurar'|'compensar';
export type Uncertainty=''|'alta'|'media'|'baja';
export type Quality=''|'declarada'|'documental'|'campo';
export type Execution='prevista'|'implementada'|'verificada';
export type Measure={
 hierarchy:Hierarchy;description:string;reference:string;pgaRef:string;
 responsible:string;indicator:string;frequency:string;
 uncertainty:Uncertainty;quality:Quality;assumptions:string;execution:Execution;
};
export type ResidualRecord={
 initialFingerprint:string;outcome:'persiste'|'evitado';
 residual:ConesaEntry;measure:Measure;
};
export type ResidualDocument={
 schema:'ambienta.conesa-residual.v1';method:typeof RESIDUAL_METHOD_ID;
 projectId:string;updatedAt:string;entries:Record<string,ResidualRecord>;
};
export const blankMeasure=():Measure=>({
 hierarchy:'',description:'',reference:'',pgaRef:'',responsible:'',indicator:'',
 frequency:'',uncertainty:'',quality:'',assumptions:'',execution:'prevista'
});
export const blankResidual=():ConesaEntry=>({sign:null,criteria:{},reason:'',evidence:''});
export const blankRecord=(source:ConesaEntry|undefined):ResidualRecord=>({
 initialFingerprint:fingerprint(source),outcome:'persiste',residual:blankResidual(),
 measure:blankMeasure()
});
export const fingerprint=(source:ConesaEntry|undefined):string=>{
 if(!source||!calculateConesa(source))return '';
 // Fixed field order; changes in the initial nature or any criterion invalidate consent.
 return JSON.stringify([source.sign,...CONESA_FIELDS.map(f=>source.criteria[f.id])]);
};
const hierarchies=['','evitar','minimizar','restaurar','compensar'];
const uncertainties=['','alta','media','baja'];
const qualities=['','declarada','documental','campo'];
const executions=['prevista','implementada','verificada'];
export function isResidualRecord(value:unknown):value is ResidualRecord{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const r=value as Partial<ResidualRecord>,m=r.measure as Partial<Measure>|undefined;
 if(typeof r.initialFingerprint!=='string'||r.initialFingerprint.length>300||
   !['persiste','evitado'].includes(r.outcome||'')||!validatedConesaEntry(r.residual)||!m)return false;
 if(!hierarchies.includes(m.hierarchy||'')||!uncertainties.includes(m.uncertainty||'')||
    !qualities.includes(m.quality||'')||!executions.includes(m.execution||''))return false;
 const sizes:Record<string,number>={description:5000,reference:1000,pgaRef:300,
  responsible:300,indicator:500,frequency:300,assumptions:3000};
 return Object.entries(sizes).every(([k,max])=>{
  const v=m[k as keyof Measure];return typeof v==='string'&&v.length<=max;
 });
}
export function isResidualDocument(value:unknown,projectId:string):value is ResidualDocument{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const d=value as Partial<ResidualDocument>;
 return d.schema==='ambienta.conesa-residual.v1'&&d.method===RESIDUAL_METHOD_ID&&
 d.projectId===projectId&&typeof d.updatedAt==='string'&&d.updatedAt.length<=80&&
 !!d.entries&&typeof d.entries==='object'&&!Array.isArray(d.entries)&&
 Object.entries(d.entries).length<=12000&&Object.entries(d.entries)
  .every(([id,rec])=>id.length<=220&&isResidualRecord(rec));
}
export type ResidualReview={
 initial:ConesaResult|null;residual:ConesaResult|null;avoided:boolean;
 delta:number|null;problems:string[];status:'sin-valoracion'|'pendiente'|'revisar'|'completo';
};
/** A completed scenario is not proof that the measures were effective. */
export function reviewResidual(initialEntry:ConesaEntry|undefined,
 rec:ResidualRecord|undefined):ResidualReview{
 const initial=calculateConesa(initialEntry);
 const problems:string[]=[];
 if(!rec)return {initial,residual:null,avoided:false,delta:null,problems:[],
  status:initial?'sin-valoracion':'pendiente'};
 if(!initial)problems.push('Falta valoración inicial completa');
 else if(rec.initialFingerprint!==fingerprint(initialEntry))
  problems.push('Cambió la valoración inicial: revisar y ratificar su referencia');
 if(!rec.measure.hierarchy)problems.push('Falta jerarquía de mitigación');
 if(!rec.measure.description.trim())problems.push('Falta descripción de la medida');
 if(!rec.measure.reference.trim())problems.push('Falta evidencia de la medida');
 if(!rec.measure.responsible.trim())problems.push('Falta responsable');
 if(!rec.measure.indicator.trim())problems.push('Falta indicador');
 if(!rec.measure.frequency.trim())problems.push('Falta frecuencia del seguimiento');
 if(!rec.measure.uncertainty)problems.push('Falta declarar incertidumbre');
 if(!rec.measure.quality)problems.push('Falta declarar calidad de evidencia');
 if(rec.outcome==='evitado'){
  if(rec.measure.hierarchy!=='evitar')problems.push('Impacto evitado requiere una medida de evitar');
  // Avoidance is a separate decision, never forced to numeric zero (outside Conesa scale).
  return {initial,residual:null,avoided:true,delta:null,problems,
   status:problems.length?'revisar':'completo'};
 }
 const residual=calculateConesa(rec.residual);
 problems.push(...conesaProblems(rec.residual));
 if(residual&&!rec.residual.reason.trim())problems.push('Falta fundamento de la valoración residual');
 if(residual&&!rec.residual.evidence.trim())problems.push('Falta evidencia de la valoración residual');
 if(initial&&residual&&initialEntry?.sign!==rec.residual.sign)
  problems.push('Cambió la naturaleza: requiere análisis distinto, no resta de importancias');
 const comparable=initial&&residual&&initialEntry?.sign===rec.residual.sign&&
  rec.initialFingerprint===fingerprint(initialEntry);
 return {initial,residual,avoided:false,
  delta:comparable?residual.absolute-initial.absolute:null,problems,
  status:problems.length?'revisar':'completo'};
}
