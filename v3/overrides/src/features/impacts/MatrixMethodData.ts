/**
 * AMBIENTA methodology registry. The numbers below belong to their
 * respective published methods; they cannot be reused interchangeably.
 *
 * Conesa: explicitly names the 3IN+2EX variant used in multiple ESIA and
 * in the Vidal/Regaldo teaching material. The tables/variant may differ
 * in other publications, so all exports must carry method ID + version.
 * RIAM: Pastakia/Jensen 1998, ES=(A1*A2)*(B1+B2+B3).
 */
export type MethodId='causa-leopold'|'conesa-1997-2ex'|'riam-1998'|'battelle';
export type ScoredMethodId=Extract<MethodId,'conesa-1997-2ex'|'riam-1998'>;
export type MethodCriterion={id:string;name:string;options:readonly {value:number;label:string}[]};
export type MethodDefinition={id:ScoredMethodId;shortName:string;version:string;formula:string;
  source:string;sourceUrl:string;fields:readonly MethodCriterion[]};

const opt=(items:readonly [number,string][])=>items.map(([value,label])=>({value,label}));
export const CONESA_CRITERIA:readonly MethodCriterion[]=[
 {id:'IN',name:'Intensidad',options:opt([[1,'Baja'],[2,'Media'],[4,'Alta'],[8,'Muy alta'],[12,'Total']])},
 {id:'EX',name:'Extensión',options:opt([[1,'Puntual'],[2,'Parcial'],[4,'Extensa'],[8,'Total'],[12,'Crítica (variante)']])},
 {id:'MO',name:'Momento de manifestación',options:opt([[1,'Largo plazo'],[2,'Medio plazo'],[4,'Inmediato'],[8,'Crítico (variante)']])},
 {id:'PE',name:'Persistencia',options:opt([[1,'Fugaz'],[2,'Temporal'],[4,'Permanente']])},
 {id:'RV',name:'Reversibilidad',options:opt([[1,'Corto plazo'],[2,'Medio plazo'],[4,'Irreversible']])},
 {id:'SI',name:'Sinergia',options:opt([[1,'Sin sinergismo'],[2,'Sinérgico'],[4,'Muy sinérgico']])},
 {id:'AC',name:'Acumulación',options:opt([[1,'Simple'],[4,'Acumulativo']])},
 {id:'EF',name:'Efecto',options:opt([[1,'Indirecto'],[4,'Directo']])},
 {id:'PR',name:'Periodicidad',options:opt([[1,'Irregular'],[2,'Periódico'],[4,'Continuo']])},
 {id:'MC',name:'Recuperabilidad',options:opt([[1,'Inmediata'],[2,'Mediano plazo'],[4,'Mitigable'],[8,'Irrecuperable']])}
];
export const RIAM_CRITERIA:readonly MethodCriterion[]=[
 {id:'A1',name:'Importancia de la condición',options:opt([[0,'Sin importancia'],[1,'Local'],[2,'Extralocal'],[3,'Regional/nacional'],[4,'Nacional/internacional']])},
 {id:'A2',name:'Magnitud del cambio',options:opt([[-3,'Adverso muy importante'],[-2,'Adverso significativo'],[-1,'Adverso menor'],[0,'Sin cambio'],[1,'Beneficio menor'],[2,'Beneficio significativo'],[3,'Beneficio muy importante']])},
 {id:'B1',name:'Permanencia',options:opt([[1,'Sin cambio / no aplicable'],[2,'Temporal'],[3,'Permanente']])},
 {id:'B2',name:'Reversibilidad',options:opt([[1,'Sin cambio / no aplicable'],[2,'Reversible'],[3,'Irreversible']])},
 {id:'B3',name:'Acumulación / sinergia',options:opt([[1,'Sin cambio / no aplicable'],[2,'No acumulativo'],[3,'Acumulativo/sinérgico']])}
];
export const METHOD_DEFINITIONS:Record<ScoredMethodId,MethodDefinition>={
 'conesa-1997-2ex':{
  id:'conesa-1997-2ex',shortName:'Conesa Fernández-Vítora',
  version:'Variante 3IN + 2EX, según aplicación publicada de Conesa 1997',
  formula:'I = signo × (3IN + 2EX + MO + PE + RV + SI + AC + EF + PR + MC)',
  source:'Estudio publicado por Ministerio de Ambiente de Buenos Aires',
  sourceUrl:'https://www.ambiente.gba.gob.ar/sites/default/files/ABSTRACT-SERVICIOS%20PORTUARIOS%20INTEGRADOS%20S.A.pdf',
  fields:CONESA_CRITERIA
 },
 'riam-1998':{
  id:'riam-1998',shortName:'RIAM (Pastakia)',
  version:'Pastakia y Jensen, 1998 · escala A1/A2/B1/B2/B3',
  formula:'ES = (A1 × A2) × (B1 + B2 + B3)',
  source:'Pastakia/Jensen (1998), Environmental Impact Assessment Review',
  sourceUrl:'https://www.sciencedirect.com/science/article/pii/S0195925598000183',
  fields:RIAM_CRITERIA
 }
};
export type Assessment={sign:null|-1|1;criteria:Record<string,number>;reason:string;evidence:string};
export function assess(method:ScoredMethodId,item:Assessment|null|undefined):number|null{
 if(!item)return null;
 const def=METHOD_DEFINITIONS[method],v=item.criteria;
 if(!v||!def.fields.every(f=>f.options.some(o=>o.value===v[f.id])))return null;
 if(method==='conesa-1997-2ex'){
  if(item.sign!==-1&&item.sign!==1)return null;
  return item.sign*(3*v.IN+2*v.EX+v.MO+v.PE+v.RV+v.SI+v.AC+v.EF+v.PR+v.MC);
 }
 return (v.A1*v.A2)*(v.B1+v.B2+v.B3);
}
export function validAssessment(method:ScoredMethodId,item:unknown):item is Assessment{
 if(!item||typeof item!=='object')return false;
 const a=item as Partial<Assessment>;
 if(a.sign!==null&&a.sign!==-1&&a.sign!==1)return false;
 if(!a.criteria||typeof a.criteria!=='object'||Array.isArray(a.criteria))return false;
 const fields=METHOD_DEFINITIONS[method].fields;
 if(Object.entries(a.criteria).some(([key,value])=>
  !fields.some(f=>f.id===key&&f.options.some(o=>o.value===value))))return false;
 return typeof a.reason==='string'&&a.reason.length<=5000&&
 typeof a.evidence==='string'&&a.evidence.length<=1000;
}
