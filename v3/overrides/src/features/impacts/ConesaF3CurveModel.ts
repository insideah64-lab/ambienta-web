/**
 * Conesa Fernández-Vítora (1997, reimp. 2000), §5.3.1–5.3.2,
 * pp. 113–117; Anejo 4, desde p. 253.
 * F3b: representación técnica POR TRAMOS, no reproducción numérica
 * automática de curvas impresas. Los nudos se aportan con fuente.
 */
import type {F3FactorRecord,F3Quality} from './ConesaF3Model';

export const F3B_SCHEMA='ambienta.conesa-libro-1997.curvas-documentadas.f3b' as const;
export const F3B_METHOD='conesa-libro-1997-f3b' as const;
export const F3B_STORAGE='ambienta-conesa-libro-1997-f3b:' as const;
export type F3BCurvePoint={m:number|null;ca:number|null};
export type F3BCurve={
 enabled:boolean;indicator:string;unit:string;
 origin:'anejo4'|'estudio'|'expertos';
 source:string;bookPage:number|null;scope:string;assessor:string;
 evidence:string;interpolation:'tramos-lineales';
 points:F3BCurvePoint[];
};
export type F3BDoc={
 schema:typeof F3B_SCHEMA;methodId:typeof F3B_METHOD;
 projectId:string;projectName:string;updatedAt:string;
 records:Record<string,F3BCurve>
};
const isStr=(x:unknown,n:number)=>typeof x==='string'&&x.length<=n;
const nullableFinite=(x:unknown)=>x===null||(typeof x==='number'&&Number.isFinite(x));
const isDate=(v:string)=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const date=new Date(v+'T12:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===v;
};
export function blankF3BDoc(projectId:string,projectName:string):F3BDoc{
 return {schema:F3B_SCHEMA,methodId:F3B_METHOD,projectId,projectName,
  updatedAt:new Date().toISOString(),records:{}};
}
export function blankF3BCurve(base:F3FactorRecord):F3BCurve{
 return {enabled:true,indicator:base.indicator,unit:base.unit,origin:'anejo4',
  source:'',bookPage:null,scope:'',assessor:'',evidence:'',
  interpolation:'tramos-lineales',points:[{m:null,ca:null},{m:null,ca:null}]};
}
function validCurve(v:unknown):v is F3BCurve{
 if(!v||typeof v!=='object'||Array.isArray(v))return false;
 const a=v as Partial<F3BCurve>;
 return typeof a.enabled==='boolean'&&isStr(a.indicator,350)&&isStr(a.unit,80)&&
  ['anejo4','estudio','expertos'].includes(a.origin as string)&&
  isStr(a.source,1200)&&
  (a.bookPage===null||(typeof a.bookPage==='number'&&Number.isInteger(a.bookPage)&&a.bookPage>=1&&a.bookPage<=999))&&
  isStr(a.scope,2000)&&isStr(a.assessor,350)&&isStr(a.evidence,1500)&&
  a.interpolation==='tramos-lineales'&&Array.isArray(a.points)&&
  a.points.length>=2&&a.points.length<=24&&
  a.points.every(p=>p&&typeof p==='object'&&!Array.isArray(p)&&nullableFinite(p.m)&&nullableFinite(p.ca));
}
export function validF3BDoc(v:unknown,projectId:string):v is F3BDoc{
 if(!v||typeof v!=='object'||Array.isArray(v))return false;
 const a=v as Partial<F3BDoc>;
 return a.schema===F3B_SCHEMA&&a.methodId===F3B_METHOD&&
  a.projectId===projectId&&isStr(a.projectName,350)&&isStr(a.updatedAt,80)&&
  !!a.records&&typeof a.records==='object'&&!Array.isArray(a.records)&&
  Object.keys(a.records).length<=150&&
  Object.entries(a.records).every(([id,curve])=>id.length>0&&id.length<=100&&validCurve(curve));
}
export function f3bPointProblems(points:readonly F3BCurvePoint[]):string[]{
 const problems:string[]=[];
 if(points.length<2||points.length>24)problems.push('Deben existir de 2 a 24 nudos');
 points.forEach((p,i)=>{
  if(p.m===null||!Number.isFinite(p.m))problems.push('Nudo '+(i+1)+': falta magnitud finita');
  if(p.ca===null||!Number.isFinite(p.ca)||p.ca<0||p.ca>1)
   problems.push('Nudo '+(i+1)+': CA debe estar entre 0 y 1');
  if(i>0&&p.m!==null&&points[i-1].m!==null&&
   Number.isFinite(p.m)&&Number.isFinite(points[i-1].m)&&p.m<=points[i-1].m!)
   problems.push('Las magnitudes deben ser estrictamente crecientes, sin duplicados');
 });
 return problems;
}
export function f3bProblems(base:F3FactorRecord|undefined,curve:F3BCurve|undefined):string[]{
 if(!curve||!curve.enabled)return ['No hay función F3b activa'];
 const errors:string[]=[];
 if(!base)return ['El factor aún no tiene escenarios F3a'];
 if(base.indicator.trim().length<3)errors.push('Falta indicador ambiental F3a');
 if(!base.unit.trim())errors.push('Falta unidad de magnitud F3a');
 if(base.composition.trim().length<12)errors.push('Documentar composición de magnitudes F3a');
 if(base.method==='modelo'&&base.modelReference.trim().length<8)
  errors.push('Falta referencia del modelo indirecto');
 if(curve.indicator!==base.indicator||curve.unit!==base.unit)
  errors.push('Indicador o unidad cambiados: verificar y volver a vincular explícitamente');
 if(curve.source.trim().length<8)errors.push('Fuente de la curva incompleta');
 if(curve.scope.trim().length<12)errors.push('Explicar ámbito y validez de esta curva');
 if(curve.assessor.trim().length<3)errors.push('Identificar a quien adopta la función');
 if(curve.evidence.trim().length<8)errors.push('Registrar evidencia o procedimiento de construcción');
 if(curve.origin==='anejo4'&&
  (curve.bookPage===null||!Number.isInteger(curve.bookPage)||
   curve.bookPage<253||curve.bookPage>999))
  errors.push('Indicar página impresa del Anejo 4 (desde p. 253)');
 errors.push(...f3bPointProblems(curve.points));
 const validDomain=f3bPointProblems(curve.points).length===0;
 for(const [label,s] of [['SIN',base.without],['CON',base.withProject]] as const){
  if(s.value===null||!Number.isFinite(s.value))errors.push(label+': falta magnitud');
  else if(validDomain&&(s.value<curve.points[0].m!||
   s.value>curve.points[curve.points.length-1].m!))
   errors.push(label+': fuera del dominio de la curva; no se extrapola');
  if(!isDate(s.date))errors.push(label+': fecha inválida');
  if(s.source.trim().length<8)errors.push(label+': falta fuente verificable');
 }
 return errors;
}
/** Interpolación lineal SOLAMENTE entre nudos confirmados; sin extrapolación.
 * Una curva con saltos, umbrales discontinuos o trazos verticales requiere
 * otro tipo explícito de modelo: no se simula con abscisas duplicadas. */
export function interpolateF3BCurve(points:readonly F3BCurvePoint[],m:number):number|null{
 if(!Number.isFinite(m)||f3bPointProblems(points).length)return null;
 if(m<points[0].m!||m>points[points.length-1].m!)return null;
 if(m===points[points.length-1].m)return points[points.length-1].ca;
 for(let i=0;i<points.length-1;i++){
  const left=points[i],right=points[i+1];
  if(m>=left.m!&&m<=right.m!){
   const t=(m-left.m!)/(right.m!-left.m!);
   const out=left.ca!+(right.ca!-left.ca!)*t;
   return Number.isFinite(out)?out:null;
  }
 }
 return null;
}
export function evaluateF3BCurve(base:F3FactorRecord|undefined,
 curve:F3BCurve|undefined):F3Quality|null{
 if(!base||!curve||f3bProblems(base,curve).length)return null;
 const without=interpolateF3BCurve(curve.points,base.without.value!);
 const withProject=interpolateF3BCurve(curve.points,base.withProject.value!);
 if(without===null||withProject===null)return null;
 return {without,withProject,delta:withProject-without,
  rawDelta:base.withProject.value!-base.without.value!};
}
