/**
 * Conesa Fernández-Vítora — 3rd ed. 1997, reprint 2000, pp. 89–97.
 * F1 = VERSIONED QUALITATIVE IMPORTANCE ONLY, not the complete EsIA method.
 * Reference: pp. 89–90 (nature x, EX/MO critical), pp. 92–93 (RV and MC),
 * pp. 95–96 (table 11, formula and categories).
 * This DOES NOT consume or rewrite any prior CONESSA workbook draft.
 */
export const BOOK_METHOD_ID='conesa-libro-1997-cualitativo-f1' as const;
export const BOOK_SCHEMA='ambienta.conesa-libro-1997.cualitativo-f1' as const;
export const BOOK_STORAGE_PREFIX='ambienta-conesa-libro-1997-f1:' as const;
export type BookNature=-1|1|'x'|null;
export type BookRecovery='mitigable'|'compensable'|null;
export type BookEntry={
 sign:BookNature;criteria:Record<string,number>;recovery:BookRecovery;
 reason:string;evidence:string
};
export type BookCategory='Irrelevante'|'Moderado'|'Severo'|'Crítico'|'Beneficioso'|'Indeterminado';
export type BookResult={absolute:number;signed:number|null;category:BookCategory;status:'calculado'|'naturaleza-incierta'};
export type BookField={id:string;label:string;options:readonly (readonly [number,string])[];printedPage:number};
export const BOOK_FIELDS:readonly BookField[]=[
 {id:'IN',label:'Intensidad',printedPage:95,
  options:[[1,'Baja'],[2,'Media'],[4,'Alta'],[8,'Muy alta'],[12,'Total']]},
 {id:'EX',label:'Extensión',printedPage:95,
  options:[[1,'Puntual'],[2,'Parcial'],[4,'Extensa'],[8,'Total']]},
 {id:'EX_CR',label:'Extensión crítica (recargo)',printedPage:90,
  options:[[0,'No aplica'],[4,'Ubicación crítica (+4)']]},
 {id:'MO',label:'Momento',printedPage:95,
  options:[[1,'Largo plazo'],[2,'Medio plazo'],[4,'Inmediato / corto plazo']]},
 {id:'MO_CR',label:'Momento crítico (recargo)',printedPage:90,
  options:[[0,'No aplica'],[1,'Circunstancia crítica (+1)'],[4,'Circunstancia crítica (+4)']]},
 {id:'PE',label:'Persistencia',printedPage:95,
  options:[[1,'Fugaz'],[2,'Temporal'],[4,'Permanente']]},
 {id:'RV',label:'Reversibilidad',printedPage:95,
  options:[[1,'Corto plazo'],[2,'Medio plazo'],[4,'Irreversible']]},
 {id:'SI',label:'Sinergia',printedPage:95,
  options:[[1,'Sin sinergismo'],[2,'Sinérgico'],[4,'Muy sinérgico']]},
 {id:'AC',label:'Acumulación',printedPage:95,
  options:[[1,'Simple'],[4,'Acumulativo']]},
 {id:'EF',label:'Efecto',printedPage:95,
  options:[[1,'Indirecto'],[4,'Directo']]},
 {id:'PR',label:'Periodicidad',printedPage:95,
  options:[[1,'Irregular'],[2,'Periódico'],[4,'Continuo']]},
 {id:'MC',label:'Recuperabilidad',printedPage:93,
  options:[[1,'Recuperable inmediata'],[2,'Recuperable a medio plazo'],
   [4,'Mitigable o compensable (declarar cuál)'],[8,'Irrecuperable']]}
];
export const BOOK_BOUNDARY_POLICY='F1: I<25 irrelevante; 25<=I<50 moderado; 50<=I<=75 severo; I>75 crítico. El texto de 1997 solapa 50: se opta explícitamente por severo; el 75 permanece severo porque crítico es >75.' as const;
export const BOOK_SOURCE='Conesa Fernández-Vítora, Guía metodológica para la evaluación del impacto ambiental, 3.ª ed. (1997), reimp. 2000, pp. 89–97' as const;

export function bookCategory(absolute:number):BookCategory|null{
 if(!Number.isInteger(absolute)||absolute<0)return null;
 if(absolute<25)return 'Irrelevante';
 if(absolute<50)return 'Moderado';
 if(absolute<=75)return 'Severo';
 return 'Crítico';
}
export function bookProblems(e:BookEntry|undefined):string[]{
 if(!e)return ['Interacción sin evaluar'];
 const problems:string[]=[];
 if(e.sign!==1&&e.sign!==-1&&e.sign!=='x')problems.push('Naturaleza pendiente (positiva, negativa o x)');
 if(!e.criteria||typeof e.criteria!=='object'||Array.isArray(e.criteria)){
  problems.push('Criterios inexistentes');
  return problems;
 }
 for(const f of BOOK_FIELDS){
  const n=e.criteria[f.id];
  if(n===undefined)problems.push(f.id+': sin valorar');
  else if(!f.options.some(([allowed])=>allowed===n))
   problems.push(f.id+': fuera de escala ('+String(n)+')');
 }
 if(Object.keys(e.criteria).some(id=>!BOOK_FIELDS.some(f=>f.id===id)))
  problems.push('Criterio no reconocido');
 if(e.criteria.EX_CR===4&&e.criteria.EX!==1)
  problems.push('EX crítica: la excepción documentada en p. 90 corresponde a una afección puntual');
 if(e.criteria.MC===4&&e.recovery!=='mitigable'&&e.recovery!=='compensable')
  problems.push('MC=4: identificar mitigación o compensación');
 if(e.criteria.MC!==4&&e.recovery!==null)
  problems.push('Detalle de recuperabilidad incompatible con MC');
 if((e.criteria.EX_CR===4||e.criteria.MO_CR===1||e.criteria.MO_CR===4
   ||e.recovery==='compensable')&&(!e.reason?.trim()||!e.evidence?.trim()))
  problems.push('Excepción: fundamentar criterio y registrar evidencia verificable');
 if(typeof e.reason!=='string'||e.reason.length>5000)
  problems.push('Fundamento inválido');
 if(typeof e.evidence!=='string'||e.evidence.length>1000)
  problems.push('Evidencia inválida');
 return problems;
}
export function calculateBookConesa(e:BookEntry|undefined):BookResult|null{
 if(!e||bookProblems(e).length)return null;
 const v=e.criteria;
 const absolute=3*v.IN+2*(v.EX+v.EX_CR)+(v.MO+v.MO_CR)+v.PE+v.RV+v.SI+v.AC+v.EF+v.PR+v.MC;
 if(e.sign==='x')return {absolute,signed:null,category:'Indeterminado',status:'naturaleza-incierta'};
 return {absolute,signed:absolute*(e.sign as -1|1),
  category:e.sign===1?'Beneficioso':bookCategory(absolute)!,status:'calculado'};
}
export function validBookEntry(value:unknown):value is BookEntry{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const e=value as Partial<BookEntry>;
 if(e.sign!==null&&e.sign!==1&&e.sign!==-1&&e.sign!=='x')return false;
 if(e.recovery!==null&&e.recovery!=='mitigable'&&e.recovery!=='compensable')return false;
 if(!e.criteria||typeof e.criteria!=='object'||Array.isArray(e.criteria))return false;
 if(Object.keys(e.criteria).length>BOOK_FIELDS.length)return false;
 if(Object.entries(e.criteria).some(([id,n])=>!BOOK_FIELDS.some(f=>f.id===id&&f.options.some(([v])=>v===n))))return false;
 return typeof e.reason==='string'&&e.reason.length<=5000
  &&typeof e.evidence==='string'&&e.evidence.length<=1000;
}
