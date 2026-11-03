/**
 * Conesa Fernández-Vítora, 3.ª ed. 1997/reimp. 2000:
 * 5.2.1–5.2.2 pp. 108–112, 5.3.1–5.3.2 pp. 113–116 (impresas).
 * F3a: calidad ambiental por factor SIN/CON proyecto, NO IA_j ni impacto global.
 * Magnitudes en unidades heterogéneas NUNCA se suman entre factores.
 */
export const F3_SCHEMA='ambienta.conesa-libro-1997.indicadores-ca.f3a' as const;
export const F3_METHOD='conesa-libro-1997-f3a' as const;
export const F3_STORAGE='ambienta-conesa-libro-1997-f3a:' as const;
export type ScenarioF3={
 value:number|null;date:string;source:string;kind:'medido'|'estimado'
};
export type LinearF3={
 kind:'lineal';min:number|null;max:number|null;
 orientation:'creciente'|'decreciente';source:string;scope:string
};
export type F3FactorRecord={
 indicator:string;unit:string;method:'directo'|'modelo';
 modelReference:string;composition:string;
 transformation:LinearF3;
 without:ScenarioF3;withProject:ScenarioF3
};
export type F3Doc={
 schema:typeof F3_SCHEMA;methodId:typeof F3_METHOD;
 projectId:string;projectName:string;updatedAt:string;
 records:Record<string,F3FactorRecord>
};
export type F3Quality={
 without:number;withProject:number;delta:number;rawDelta:number
};
const str=(x:unknown,max:number)=>typeof x==='string'&&x.length<=max;
const recordTypes=['directo','modelo'] as const;
const scenarioKinds=['medido','estimado'] as const;
const orientations=['creciente','decreciente'] as const;
const validNumber=(x:unknown)=>x===null||(typeof x==='number'&&Number.isFinite(x));
const trimAtLeast=(s:string,min:number)=>s.trim().length>=min;
export function dateOK(date:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const d=new Date(date+'T12:00:00Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date;
}
export function blankF3(projectId:string,projectName:string):F3Doc{
 return {schema:F3_SCHEMA,methodId:F3_METHOD,projectId,projectName,
  updatedAt:new Date().toISOString(),records:{}};
}
export function blankF3Factor():F3FactorRecord{
 return {indicator:'',unit:'',method:'directo',modelReference:'',composition:'',
  transformation:{kind:'lineal',min:null,max:null,orientation:'creciente',source:'',scope:''},
  without:{value:null,date:'',source:'',kind:'medido'},
  withProject:{value:null,date:'',source:'',kind:'estimado'}};
}
function validScenario(a:unknown):a is ScenarioF3{
 if(!a||typeof a!=='object'||Array.isArray(a))return false;
 const s=a as Partial<ScenarioF3>;
 return validNumber(s.value)&&str(s.date,10)&&str(s.source,1200)&&
  scenarioKinds.includes(s.kind as ScenarioF3['kind']);
}
function validFactor(a:unknown):a is F3FactorRecord{
 if(!a||typeof a!=='object'||Array.isArray(a))return false;
 const r=a as Partial<F3FactorRecord>,t=r.transformation;
 return str(r.indicator,350)&&str(r.unit,80)&&
  recordTypes.includes(r.method as F3FactorRecord['method'])&&
  str(r.modelReference,1200)&&str(r.composition,2500)&&
  !!t&&t.kind==='lineal'&&validNumber(t.min)&&validNumber(t.max)&&
  orientations.includes(t.orientation)&&str(t.source,1200)&&str(t.scope,2000)&&
  validScenario(r.without)&&validScenario(r.withProject);
}
export function validF3Document(value:unknown,projectId:string):value is F3Doc{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const d=value as Partial<F3Doc>;
 return d.schema===F3_SCHEMA&&d.methodId===F3_METHOD&&d.projectId===projectId&&
  str(d.projectName,350)&&str(d.updatedAt,80)&&
  !!d.records&&typeof d.records==='object'&&!Array.isArray(d.records)&&
  Object.keys(d.records).length<=150&&
  Object.entries(d.records).every(([id,r])=>id.length>0&&id.length<=100&&validFactor(r));
}
export function f3Problems(r:F3FactorRecord|undefined):string[]{
 if(!r)return ['Indicador y escenarios aún no registrados'];
 const p:string[]=[];
 if(!trimAtLeast(r.indicator,3))p.push('Identificar el indicador ambiental');
 if(!trimAtLeast(r.unit,1))p.push('Especificar la unidad de medida');
 if(r.method==='modelo'&&!trimAtLeast(r.modelReference,8))
  p.push('Identificar el modelo de medición indirecta y su referencia');
 if(!trimAtLeast(r.composition,12))
  p.push('Documentar cómo se obtuvo la magnitud total del factor y sus acciones');
 const f=r.transformation;
 if(f.min===null||f.max===null||!Number.isFinite(f.min)||!Number.isFinite(f.max)||
    f.min>=f.max)p.push('Indicar extremos ordenados y finitos de magnitud de la función lineal');
 if(!trimAtLeast(f.source,8))p.push('Citar fuente o acta que justifica la función de transformación');
 if(!trimAtLeast(f.scope,12))p.push('Describir ámbito y validez de la función lineal elegida');
 for(const [tag,s] of [['SIN',r.without],['CON',r.withProject]] as const){
  if(s.value===null||!Number.isFinite(s.value))p.push(tag+': falta magnitud numérica');
  else if(f.min!==null&&f.max!==null&&Number.isFinite(f.min)&&Number.isFinite(f.max)&&
    (s.value<f.min||s.value>f.max))
   p.push(tag+': magnitud fuera del dominio de transformación; no se extrapola');
  if(!dateOK(s.date))p.push(tag+': fecha de referencia inválida');
  if(!trimAtLeast(s.source,8))p.push(tag+': aportar fuente de medición o predicción');
 }
 return p;
}
/**
 * For an explicitly sourced LINEAR environmental-quality function:
 * CA = f(M) individually for both scenarios, CA_NET = CA_CON - CA_SIN.
 * Never f(M_CON - M_SIN). No default curve, invented weights or clamping.
 */
export function evaluateF3Factor(r:F3FactorRecord|undefined):F3Quality|null{
 if(!r||f3Problems(r).length)return null;
 const {min,max,orientation}=r.transformation;
 const scale=(v:number)=>orientation==='creciente'?
  (v-min!)/(max!-min!):(max!-v)/(max!-min!);
 const without=scale(r.without.value!);
 const withProject=scale(r.withProject.value!);
 const delta=withProject-without;
 if(![without,withProject,delta].every(Number.isFinite))return null;
 return {without,withProject,delta,rawDelta:r.withProject.value!-r.without.value!};
}
