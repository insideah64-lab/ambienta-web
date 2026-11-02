/**
 * AMBIENTA review variant — "Conesa simplificado", explicit critical modifiers.
 * Source material: user-provided CONESSA Excel (CRITERIOS-ALGORITMO and EJEMPLO),
 * checked against an official regional EIA (DREM San Martin 2024).
 * A workbook row with RV=3 is OUT OF SCALE for this precise variant.
 *
 * Never apply categories as Salta licensing decisions or mix with legacy
 * conesa-1997-2ex without a recorded variant conversion.
 */
export const METHOD_ID='conesa-simplificado-tutorial-v1' as const;
export type ConesaNature=-1|1|null;
export type ConesaCriteria=Record<string,number>;
export type ConesaEntry={sign:ConesaNature;criteria:ConesaCriteria;reason:string;evidence:string};
export type ConesaCategory='Irrelevante'|'Moderado'|'Severo'|'Crítico';
export type ConesaResult={absolute:number;signed:number;category:ConesaCategory};
export type ConesaDefinition={id:string;label:string;options:readonly [number,string][]};
export const CONESA_FIELDS:readonly ConesaDefinition[]=[
 {id:'IN',label:'Intensidad',options:[[1,'Baja'],[2,'Media'],[4,'Alta'],[8,'Muy alta'],[12,'Total']]},
 {id:'EX',label:'Extensión base',options:[[1,'Puntual'],[2,'Parcial'],[4,'Extensa'],[8,'Total']]},
 {id:'EX_CR',label:'Recargo de localización crítica',options:[[0,'No crítico (0)'],[4,'Crítico (+4)']]},
 {id:'MO',label:'Momento base',options:[[1,'Largo plazo'],[2,'Medio plazo'],[4,'Inmediato']]},
 {id:'MO_CR',label:'Recargo de momento crítico',options:[[0,'No crítico (0)'],[4,'Crítico (+4)']]},
 {id:'PE',label:'Persistencia',options:[[1,'Fugaz'],[2,'Temporal'],[4,'Permanente']]},
 {id:'RV',label:'Reversibilidad',options:[[1,'Corto plazo'],[2,'Medio plazo'],[4,'Irreversible']]},
 {id:'SI',label:'Sinergia',options:[[1,'Sin sinergismo'],[2,'Sinérgico'],[4,'Muy sinérgico']]},
 {id:'AC',label:'Acumulación',options:[[1,'Simple'],[4,'Acumulativo']]},
 {id:'EF',label:'Efecto',options:[[1,'Indirecto'],[4,'Directo']]},
 {id:'PR',label:'Periodicidad',options:[[1,'Irregular'],[2,'Periódico'],[4,'Continuo']]},
 {id:'MC',label:'Recuperabilidad',options:[[1,'Inmediata'],[2,'Mediano plazo'],[4,'Mitigable'],[8,'Irrecuperable']]}
];
export const BASE_FIELDS=['IN','EX','MO','PE','RV','SI','AC','EF','PR','MC'] as const;
export function conesaCategory(absolute:number):ConesaCategory|null{
 if(!Number.isFinite(absolute)||absolute<0)return null;
 if(absolute<25)return 'Irrelevante';
 if(absolute<50)return 'Moderado';
 if(absolute<75)return 'Severo';
 return 'Crítico';
}
export function conesaProblems(item:ConesaEntry|undefined):string[]{
 if(!item)return ['No evaluado'];
 const errors:string[]=[];
 if(item.sign!==-1&&item.sign!==1)errors.push('Naturaleza sin definir');
 for(const f of CONESA_FIELDS){
  const value=item.criteria?.[f.id];
  if(value===undefined)errors.push(f.label+': pendiente');
  else if(!f.options.some(([v])=>v===value))errors.push(f.label+': valor fuera de escala ('+String(value)+')');
 }
 if((item.criteria?.EX_CR===4||item.criteria?.MO_CR===4)&&(!item.reason.trim()||!item.evidence.trim()))
  errors.push('Recargo crítico: documentar justificación y evidencia');
 return errors;
}
export function calculateConesa(item:ConesaEntry|undefined):ConesaResult|null{
 if(!item||conesaProblems(item).length)return null;
 const v=item.criteria;
 const absolute=3*v.IN+2*(v.EX+v.EX_CR)+(v.MO+v.MO_CR)+v.PE+v.RV+v.SI+v.AC+v.EF+v.PR+v.MC;
 return {absolute,signed:absolute*(item.sign as -1|1),category:conesaCategory(absolute)!};
}
export function validatedConesaEntry(item:unknown):item is ConesaEntry{
 if(!item||typeof item!=='object')return false;
 const e=item as Partial<ConesaEntry>;
 if(e.sign!==null&&e.sign!==1&&e.sign!==-1)return false;
 if(!e.criteria||typeof e.criteria!=='object'||Array.isArray(e.criteria))return false;
 if(Object.entries(e.criteria).length>CONESA_FIELDS.length)return false;
 if(Object.entries(e.criteria).some(([id,value])=>
  !CONESA_FIELDS.some(f=>f.id===id&&f.options.some(([n])=>n===value))))return false;
 return typeof e.reason==='string'&&e.reason.length<=5000&&
  typeof e.evidence==='string'&&e.evidence.length<=1000;
}
