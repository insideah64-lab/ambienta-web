/**
 * Conesa Fernández-Vítora, Guía metodológica para la evaluación del impacto
 * ambiental, 3ª ed. (1997), reimp. 2000, pp. 96–100.
 *
 * F2 adds documented screening, manual warning flags and FACTOR weighting.
 * It never changes the F1 impact score or claims that a human expert panel
 * was independently verified. It does not calculate the later CA=f(M).
 */
import type {BookEntry,BookResult} from './ConesaLibroModel';
import {calculateBookConesa} from './ConesaLibroModel';

export const F2_SCHEMA='ambienta.conesa-libro-1997.dep-uip.f2' as const;
export const F2_METHOD='conesa-libro-1997-f2' as const;
export const F2_STORAGE='ambienta-conesa-libro-1997-f2:' as const;
export type Depuration='normal'|'tamiz'|'intangible'|'determinante';
export type F2Decision={treatment:Depuration;reason:string;evidence:string};
export type F2Alert={enabled:boolean;reason:string;evidence:string;alternative:string};
export type F2Screening={
 threshold:number|null;thresholdReason:string;thresholdEvidence:string;
 decisions:Record<string,F2Decision>;
 alerts:Record<string,F2Alert>;
};
export type UIPPanel={
 method:'pesos_1_10';
 panelReference:string;source:string;sessionDate:string;notes:string;
 coefficients:Record<string,number>;
};
export type F2Doc={
 schema:typeof F2_SCHEMA;methodId:typeof F2_METHOD;
 projectId:string;projectName:string;updatedAt:string;
 screening:F2Screening;
 uip:UIPPanel;
};
export type F2Factor={id:string;name:string;group:string};
export type F2Interaction={id:string;entry:BookEntry;factorId:string;actionId:string};
export type F2Allocation={factorId:string;coefficient:number;uip:number};
const textValid=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;
const allowed=['normal','tamiz','intangible','determinante'] as const;

export function blankF2(projectId:string,projectName:string):F2Doc{
 return {
  schema:F2_SCHEMA,methodId:F2_METHOD,projectId,projectName,updatedAt:new Date().toISOString(),
  screening:{threshold:null,thresholdReason:'',thresholdEvidence:'',decisions:{},alerts:{}},
  uip:{method:'pesos_1_10',panelReference:'',source:'',sessionDate:'',notes:'',coefficients:{}}
 };
}
export function validF2Document(data:unknown,projectId:string):data is F2Doc{
 if(!data||typeof data!=='object'||Array.isArray(data))return false;
 const d=data as Partial<F2Doc>;
 if(d.schema!==F2_SCHEMA||d.methodId!==F2_METHOD||d.projectId!==projectId
  ||!textValid(d.projectName,350)||!textValid(d.updatedAt,80))return false;
 const s=d.screening;
 if(!s||typeof s!=='object'||Array.isArray(s))return false;
 if(s.threshold!==null&&!(Number.isInteger(s.threshold)&&s.threshold>=13&&s.threshold<=100))return false;
 if(!textValid(s.thresholdReason,5000)||!textValid(s.thresholdEvidence,1000))return false;
 if(!s.decisions||typeof s.decisions!=='object'||Array.isArray(s.decisions)||Object.keys(s.decisions).length>12000)return false;
 if(!Object.entries(s.decisions).every(([key,val])=>key.length<=220&&
   !!val&&allowed.includes(val.treatment)&&textValid(val.reason,5000)&&textValid(val.evidence,1000)))return false;
 if(!s.alerts||typeof s.alerts!=='object'||Array.isArray(s.alerts)||Object.keys(s.alerts).length>12000)return false;
 if(!Object.entries(s.alerts).every(([key,val])=>key.length<=220&&!!val&&
  typeof val.enabled==='boolean'&&textValid(val.reason,5000)&&
  textValid(val.evidence,1000)&&textValid(val.alternative,1500)))return false;
 const p=d.uip;
 if(!p||typeof p!=='object'||Array.isArray(p)||p.method!=='pesos_1_10'
  ||!textValid(p.panelReference,350)||!textValid(p.source,1000)
  ||!textValid(p.sessionDate,10)||!textValid(p.notes,3000)
  ||!p.coefficients||typeof p.coefficients!=='object'||Array.isArray(p.coefficients)
  ||Object.keys(p.coefficients).length>150
  ||!Object.entries(p.coefficients).every(([id,n])=>id.length<=100&&Number.isInteger(n)&&n>=1&&n<=10))return false;
 return true;
}
function isCalendarDate(date:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const parsed=new Date(date+'T12:00:00Z');
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date;
}
export function uipProblems(factors:readonly F2Factor[],p:UIPPanel):string[]{
 const out:string[]=[];
 const ids=new Set(factors.map(f=>f.id));
 if(ids.size!==factors.length||factors.length===0)out.push('Catálogo de factores vacío o con IDs duplicados');
 if(!p||p.method!=='pesos_1_10')return [...out,'Método de ponderación no soportado'];
 if(!p.panelReference?.trim()||p.panelReference.trim().length<5)
  out.push('Indicar panel de consulta o persona responsable y su alcance');
 if(!p.source?.trim()||p.source.trim().length<8)
  out.push('Citar acta o evidencia del criterio de ponderación');
 if(!isCalendarDate(p.sessionDate||''))
  out.push('Fecha de consulta inválida');
 for(const f of factors)if(!Number.isInteger(p.coefficients?.[f.id])||
  p.coefficients[f.id]<1||p.coefficients[f.id]>10)
  out.push('Coeficiente pendiente o fuera de 1–10: '+f.name);
 for(const id of Object.keys(p.coefficients||{}))if(!ids.has(id))
  out.push('Coeficiente asociado a un factor ya no existente: '+id);
 return out;
}
/** Deterministic largest-remainder allocation to exactly 1000 integer UIP.
 * Allocation is a TRANSPARENT PROPOSAL from documented coefficients,
 * never a claim of expert consensus. No allocation on incomplete inputs. */
export function proposeUIP(factors:readonly F2Factor[],panel:UIPPanel):{
 allocations:F2Allocation[];total:number
}|null{
 if(uipProblems(factors,panel).length)return null;
 const sum=factors.reduce((a,f)=>a+panel.coefficients[f.id],0);
 if(sum<=0)return null;
 const raw=factors.map((f,index)=>{
  const n=panel.coefficients[f.id];
  const quota=1000*n/sum;
  return {factorId:f.id,coefficient:n,rounded:Math.floor(quota),fraction:quota-Math.floor(quota),index};
 });
 const missing=1000-raw.reduce((a,r)=>a+r.rounded,0);
 for(const r of [...raw].sort((a,b)=>b.fraction-a.fraction||a.index-b.index).slice(0,missing))r.rounded+=1;
 return {allocations:raw.map(r=>({factorId:r.factorId,coefficient:r.coefficient,uip:r.rounded})),total:1000};
}
export function thresholdProblems(s:F2Screening):string[]{
 if(s.threshold===null)return [];
 const out:string[]=[];
 if(!Number.isInteger(s.threshold)||s.threshold<13||s.threshold>100)
  out.push('Tamiz: umbral inválido (13–100)');
 if(!s.thresholdReason.trim()||s.thresholdReason.trim().length<12)
  out.push('Tamiz: justificar la elección del umbral');
 if(!s.thresholdEvidence.trim())out.push('Tamiz: documento o evidencia obligatoria');
 return out;
}
export function treatmentProblems(
 decision:F2Decision|undefined,
 result:BookResult|null,
 screening:F2Screening
):string[]{
 if(!decision)return ['Tratamiento de depuración pendiente'];
 const out:string[]=[];
 if(!allowed.includes(decision.treatment))return ['Tratamiento de depuración desconocido'];
 if(decision.treatment==='normal'){
  if(!result||result.status!=='calculado')
   out.push('No incluir en cálculo normal si la valoración F1 está pendiente o tiene signo x');
  return out;
 }
 if(decision.reason.trim().length<12)out.push('Justificación técnica insuficiente');
 if(!decision.evidence.trim())out.push('Registrar fuente o evidencia del tratamiento');
 if(decision.treatment==='tamiz'){
  out.push(...thresholdProblems(screening));
  if(screening.threshold===null)out.push('No se ha definido un umbral de tamiz');
  if(!result||result.status!=='calculado')out.push('Tamiz: la importancia F1 debe estar calculada');
  else if(screening.threshold!==null&&result.absolute>=screening.threshold)
   out.push('Tamiz: la importancia no es menor que el umbral declarado');
 }
 return out;
}
export function alertProblems(alert:F2Alert|undefined,result:BookResult|null):string[]{
 if(!alert?.enabled)return [];
 const issues:string[]=[];
 if(!result||result.status!=='calculado'||result.signed===null||result.signed>=0)
  issues.push('Alerta roja: se requiere un impacto adverso valorado en F1');
 if((alert.reason||'').trim().length<12)
  issues.push('Alerta roja: justificar la criticidad o imposibilidad de corrección');
 if(!(alert.evidence||'').trim())issues.push('Alerta roja: indicar evidencia o referencia');
 // The proposed alternative may legitimately be pending; never invent one.
 return issues;
}
export function screeningReport(interactions:readonly F2Interaction[],screening:F2Screening){
 const used=new Set(interactions.map(i=>i.id));
 let normal=0,parallel=0,excluded=0,pending=0,alerts=0;
 const findings:{id:string;treatment:string;warnings:string[];redFlag:boolean}[]=[];
 for(const i of interactions){
  const result=calculateBookConesa(i.entry);
  const d=screening.decisions[i.id];
  const warnings=treatmentProblems(d,result,screening);
  const flagged=screening.alerts[i.id];
  warnings.push(...alertProblems(flagged,result));
  if(warnings.length)pending++;
  else if(d.treatment==='normal')normal++;
  else if(d.treatment==='tamiz')excluded++;
  else parallel++;
  if(flagged?.enabled)alerts++;
  findings.push({id:i.id,treatment:d?.treatment||'pendiente',
   warnings,redFlag:!!flagged?.enabled});
 }
 for(const id of new Set([...Object.keys(screening.decisions),...Object.keys(screening.alerts)]))
  if(!used.has(id))findings.push({id,treatment:screening.decisions[id]?.treatment||'pendiente',
   warnings:['Registro F2 desvinculado de la evaluación actual; se conserva para revisión'],
   redFlag:!!screening.alerts[id]?.enabled});
 return {normal,parallel,excluded,pending,alerts,findings};
}
