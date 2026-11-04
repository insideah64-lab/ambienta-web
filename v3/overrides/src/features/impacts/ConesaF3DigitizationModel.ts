/**
 * F3b — expediente LOCAL de auditoría de digitalización.
 * No digitaliza imágenes ni habilita una biblioteca de curvas certificadas.
 * No modifica el motor CA=f(M) ni los borradores F1/F2/F3a/F3b.
 */
import type {F3BCurve,F3BCurvePoint} from './ConesaF3CurveModel';
import {f3bPointProblems} from './ConesaF3CurveModel';
import {ANNEX4_CATALOG,annex4Citation} from './ConesaAnnex4Catalog';

export const F3B_AUDIT_SCHEMA='ambienta.conesa-1997.f3b.auditoria-digitalizacion.v1' as const;
export const F3B_AUDIT_STORAGE='ambienta-conesa-1997-f3b-auditoria:' as const;
export type AuditApproval={fingerprint:string;recordedAt:string};
export type F3BAudit={
 schema:typeof F3B_AUDIT_SCHEMA;projectId:string;factorId:string;
 catalogId:string;scanReference:string;
 xPixelA:string;xValueA:string;xPixelB:string;xValueB:string;
 yPixelA:string;yValueA:string;yPixelB:string;yValueB:string;
 readerA:string;readerB:string;readingA:string;readingB:string;
 maxDeviationM:string;maxDeviationCA:string;toleranceBasis:string;
 correspondence:string;reviewer:string;reviewDate:string;reviewNotes:string;
 approval:AuditApproval|null
};
export const blankF3BAudit=(projectId:string,factorId:string):F3BAudit=>({
 schema:F3B_AUDIT_SCHEMA,projectId,factorId,catalogId:'',scanReference:'',
 xPixelA:'',xValueA:'',xPixelB:'',xValueB:'',
 yPixelA:'',yValueA:'',yPixelB:'',yValueB:'',
 readerA:'',readerB:'',readingA:'',readingB:'',
 maxDeviationM:'',maxDeviationCA:'',toleranceBasis:'',
 correspondence:'',reviewer:'',reviewDate:'',reviewNotes:'',approval:null
});
const fields=[
 'catalogId','scanReference','xPixelA','xValueA','xPixelB','xValueB',
 'yPixelA','yValueA','yPixelB','yValueB','readerA','readerB',
 'readingA','readingB','maxDeviationM','maxDeviationCA','toleranceBasis',
 'correspondence','reviewer','reviewDate','reviewNotes'
] as const;
export function validF3BAudit(obj:unknown,projectId:string,factorId:string):obj is F3BAudit{
 if(!obj||typeof obj!=='object'||Array.isArray(obj))return false;
 const a=obj as Partial<F3BAudit>;
 return a.schema===F3B_AUDIT_SCHEMA&&a.projectId===projectId&&a.factorId===factorId&&
 fields.every(k=>typeof a[k]==='string'&&a[k].length<=8000)&&
 (a.approval===null||(a.approval!==undefined&&typeof a.approval==='object'&&
 !Array.isArray(a.approval)&&typeof a.approval.fingerprint==='string'&&
 a.approval.fingerprint.length<=120&&typeof a.approval.recordedAt==='string'&&
 a.approval.recordedAt.length<=60));
}
export function auditNumber(v:string):number|null{
 const t=v.trim();
 if(!/^-?(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(t))return null;
 const n=Number(t.replace(',','.'));
 return Number.isFinite(n)?n:null;
}
export function parseIndependentReading(text:string):{
 points:F3BCurvePoint[];problems:string[]
}{
 const lines=text.trim().split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(lines.length<2||lines.length>24)
  return {points:[],problems:['Cada lectura debe contener entre 2 y 24 filas «magnitud;CA»']};
 const points:F3BCurvePoint[]=[];
 const problems:string[]=[];
 lines.forEach((line,i)=>{
  const parts=line.split(';').map(s=>s.trim());
  if(parts.length!==2){problems.push('Fila '+(i+1)+': usá «magnitud;CA»');return;}
  const m=auditNumber(parts[0]),ca=auditNumber(parts[1]);
  if(m===null||ca===null){problems.push('Fila '+(i+1)+': número inválido');return;}
  points.push({m,ca});
 });
 if(!problems.length)problems.push(...f3bPointProblems(points));
 return {points,problems};
}
const validISODate=(s:string)=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const d=new Date(s+'T00:00:00.000Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;
};
export type AuditComparison={
 maxDifferenceM:number;maxDifferenceCA:number;
 maxVersusCurveM:number;maxVersusCurveCA:number;
};
export function auditComparison(a:F3BAudit,curve:F3BCurve):AuditComparison|null{
 const left=parseIndependentReading(a.readingA);
 const right=parseIndependentReading(a.readingB);
 if(left.problems.length||right.problems.length||
  left.points.length!==right.points.length||
  left.points.length!==curve.points.length||f3bPointProblems(curve.points).length)return null;
 let maxDifferenceM=0,maxDifferenceCA=0,maxVersusCurveM=0,maxVersusCurveCA=0;
 left.points.forEach((p,i)=>{
  const q=right.points[i],v=curve.points[i];
  maxDifferenceM=Math.max(maxDifferenceM,Math.abs(p.m!-q.m!));
  maxDifferenceCA=Math.max(maxDifferenceCA,Math.abs(p.ca!-q.ca!));
  maxVersusCurveM=Math.max(maxVersusCurveM,Math.abs(p.m!-v.m!),Math.abs(q.m!-v.m!));
  maxVersusCurveCA=Math.max(maxVersusCurveCA,Math.abs(p.ca!-v.ca!),Math.abs(q.ca!-v.ca!));
 });
 return {maxDifferenceM,maxDifferenceCA,maxVersusCurveM,maxVersusCurveCA};
}
export function f3bAuditProblems(a:F3BAudit,curve:F3BCurve):string[]{
 const errors:string[]=[];
 const entry=ANNEX4_CATALOG.find(e=>e.id===a.catalogId);
 if(!entry)errors.push('Seleccionar una ficha verificada del catálogo');
 else{
  if(entry.graphForm!=='continua')
   errors.push('La ficha requiere un modelo no disponible: varias series, categorías o discontinuidad');
  if(curve.origin!=='anejo4'||curve.bookPage!==entry.printedPage||
   curve.source.trim()!==annex4Citation(entry))
   errors.push('La fuente/página de F3b no coincide exactamente con la ficha seleccionada');
  if(curve.unit!==entry.unit)errors.push('La unidad de F3b difiere de la ficha; no se convierten unidades');
  if(curve.indicator.trim().length<3)
   errors.push('Falta el indicador vinculado del factor');
 }
 if(a.scanReference.trim().length<8)errors.push('Identificar el recorte o archivo fuente del gráfico');
 const axis=(p1:string,v1:string,p2:string,v2:string,label:string)=>{
  const x1=auditNumber(p1),x2=auditNumber(p2),y1=auditNumber(v1),y2=auditNumber(v2);
  if(x1===null||x2===null||y1===null||y2===null||x1===x2||y1===y2){
   errors.push('Calibración '+label+': ingresar dos píxeles y dos valores distintos');
   return null;
  }
  return {min:Math.min(y1,y2),max:Math.max(y1,y2)};
 };
 const xAxis=axis(a.xPixelA,a.xValueA,a.xPixelB,a.xValueB,'X');
 const yAxis=axis(a.yPixelA,a.yValueA,a.yPixelB,a.yValueB,'Y');
 if(yAxis&&(yAxis.min<0||yAxis.max>1))
  errors.push('La calibración de CA debe estar dentro de 0 y 1');
 if(a.readerA.trim().length<3||a.readerB.trim().length<3||
  a.readerA.trim().toLowerCase()===a.readerB.trim().toLowerCase())
  errors.push('Identificar dos lectores independientes y diferentes');
 const left=parseIndependentReading(a.readingA);
 const right=parseIndependentReading(a.readingB);
 if(left.problems.length)errors.push('Lectura A: '+left.problems.join(', '));
 if(right.problems.length)errors.push('Lectura B: '+right.problems.join(', '));
 const pts=[...left.points,...right.points];
 if(xAxis&&pts.some(p=>p.m!<xAxis.min||p.m!>xAxis.max))
  errors.push('Hay magnitudes fuera del eje X calibrado');
 if(yAxis&&pts.some(p=>p.ca!<yAxis.min||p.ca!>yAxis.max))
  errors.push('Hay calidades fuera del eje Y calibrado');
 if(f3bPointProblems(curve.points).length)
  errors.push('Los nudos F3b aún no están completos y ordenados');
 const tM=auditNumber(a.maxDeviationM),tCA=auditNumber(a.maxDeviationCA);
 const domain=curve.points.length>=2&&
  curve.points.every(p=>p.m!==null)&&f3bPointProblems(curve.points).length===0?
  curve.points[curve.points.length-1].m!-curve.points[0].m!:null;
 if(tM===null||tM<0||(domain!==null&&tM>domain))
  errors.push('Tolerancia de magnitud inválida o superior al dominio');
 if(tCA===null||tCA<0||tCA>1)
  errors.push('Tolerancia CA inválida: entre 0 y 1');
 if(a.toleranceBasis.trim().length<16)
  errors.push('Justificar técnicamente las tolerancias de lectura');
 if(a.correspondence.trim().length<18)
  errors.push('Documentar equivalencia del indicador, unidad y ámbito local');
 const comparison=auditComparison(a,curve);
 if(!comparison)errors.push('Las dos lecturas y F3b deben tener el mismo número de nudos');
 else if(tM!==null&&tCA!==null&&tM>=0&&tCA>=0&&
  (comparison.maxDifferenceM>tM||comparison.maxDifferenceCA>tCA||
   comparison.maxVersusCurveM>tM||comparison.maxVersusCurveCA>tCA))
  errors.push('Las discrepancias exceden las tolerancias declaradas');
 if(a.reviewer.trim().length<3||[a.readerA,a.readerB].some(name=>
  a.reviewer.trim().toLowerCase()===name.trim().toLowerCase()))
  errors.push('Identificar una tercera persona revisora distinta de los lectores');
 if(!validISODate(a.reviewDate))errors.push('Indicar fecha de revisión válida');
 if(a.reviewNotes.trim().length<15)
  errors.push('Registrar el dictamen de revisión');
 return errors;
}
/**
 * Huella de coherencia LOCAL no criptográfica. No es firma digital,
 * certificado de origen ni defensa frente a manipulación de localStorage.
 */
export function f3bAuditFingerprint(a:F3BAudit,curve:F3BCurve):string{
 const {approval:_approval,...draft}=a;
 const content=JSON.stringify({draft,curve:{
  origin:curve.origin,source:curve.source,bookPage:curve.bookPage,
  indicator:curve.indicator,unit:curve.unit,points:curve.points
 }});
 let h=2166136261;
 for(let i=0;i<content.length;i++){
  h^=content.charCodeAt(i);
  h=Math.imul(h,16777619);
 }
 return 'local-v1-'+(h>>>0).toString(16).padStart(8,'0');
}
export function auditIsCurrent(a:F3BAudit,curve:F3BCurve):boolean{
 return a.approval!==null&&f3bAuditProblems(a,curve).length===0&&
 a.approval.fingerprint===f3bAuditFingerprint(a,curve);
}
