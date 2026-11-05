/** Project-scoped environmental data registry. No matrix score, unit conversion,
 * legal threshold or source authentication is inferred from a numeric record. */
export const BASELINE_SCHEMA='ambienta.baseline.v1';
export const baselineKey=(projectId:string)=>'ambienta-baseline-v1:'+projectId;
export type Indicator={id:string;name:string;factor:string;unit:string;method:string;temporalSupport:string;description:string;impactIds:string[];createdAt:string};
export type Observation={id:string;indicatorId:string;start:string;end:string;location:string;latitude:number|null;longitude:number|null;
 origin:'synthetic'|'declared';basis:'measured'|'estimated';scenario:'baseline'|'without'|'with'|'mitigated';horizon:string;
 qualifier:'exact'|'lt'|'gt'|'not-detected'|'missing';value:number|null;detectionLimit:number|null;
 uncertainty:number|null;uncertaintyNote:string;source:string;author:string;notes:string;
 supersedes:string|null;correctionReason:string;createdAt:string};
export type BaselineDocument={schema:typeof BASELINE_SCHEMA;projectId:string;projectName:string;updatedAt:string;indicators:Indicator[];observations:Observation[]};
export const ORIGINS={synthetic:'Sintético',declared:'Fuente declarada, sin verificar'};
export const BASES={measured:'Medido declarado',estimated:'Estimado'};
export const SCENARIOS={baseline:'Línea base observada',without:'SIN proyecto (escenario)',with:'CON proyecto (escenario)',mitigated:'CON medidas (escenario)'};
export const QUALIFIERS={exact:'Valor exacto declarado',lt:'Menor que (<)',gt:'Mayor que (>)','not-detected':'No detectado',missing:'Dato faltante'};
export const emptyBaseline=(projectId:string,projectName:string):BaselineDocument=>({schema:BASELINE_SCHEMA,projectId,projectName,updatedAt:new Date().toISOString(),indicators:[],observations:[]});
export const blankIndicator=():Omit<Indicator,'id'|'createdAt'>=>({name:'',factor:'',unit:'',method:'',temporalSupport:'',description:'',impactIds:[]});
export const blankObservation=(indicatorId=''):Omit<Observation,'id'|'createdAt'>=>({indicatorId,start:'',end:'',location:'',latitude:null,longitude:null,origin:'declared',basis:'measured',scenario:'baseline',horizon:'',qualifier:'exact',value:null,detectionLimit:null,uncertainty:null,uncertaintyNote:'',source:'',author:'',notes:'',supersedes:null,correctionReason:''});
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
const text=(x:unknown,max=5000):x is string=>typeof x==='string'&&x.length<=max;
const nonempty=(x:unknown,max=5000)=>text(x,max)&&x.trim().length>0;
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const keys=(x:Record<string,unknown>,list:string[])=>Object.keys(x).length===list.length&&list.every(k=>Object.hasOwn(x,k));
const identifier=(x:unknown)=>nonempty(x,160);
const stamp=(x:unknown)=>text(x,40)&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
export function baselineDate(x:unknown):x is string{return typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;}
function validIndicator(x:unknown):x is Indicator{
 return object(x)&&keys(x,['id','name','factor','unit','method','temporalSupport','description','impactIds','createdAt'])&&identifier(x.id)&&
 ['name','factor','unit','method','temporalSupport'].every(k=>nonempty(x[k],1000))&&text(x.description)&&stamp(x.createdAt)&&
 Array.isArray(x.impactIds)&&x.impactIds.length<=100&&x.impactIds.every(identifier)&&new Set(x.impactIds).size===x.impactIds.length;
}
export function observationProblems(o:Observation):string[]{
 const p:string[]=[];
 if(!identifier(o.indicatorId))p.push('Elegí un indicador.');
 if(!baselineDate(o.start)||!baselineDate(o.end)||o.start>o.end)p.push('Definí un período válido; el fin no puede preceder al inicio.');
 if(!nonempty(o.location))p.push('Indicá el punto o ámbito de referencia.');
 if((o.latitude===null)!==(o.longitude===null)||o.latitude!==null&&(!finite(o.latitude)||o.latitude< -90||o.latitude>90)||o.longitude!==null&&(!finite(o.longitude)||o.longitude< -180||o.longitude>180))p.push('Coordenadas WGS84 incompletas o fuera de rango. También podés dejar ambas vacías.');
 if(!Object.hasOwn(ORIGINS,o.origin)||!Object.hasOwn(BASES,o.basis)||!Object.hasOwn(SCENARIOS,o.scenario))p.push('Revisá procedencia, tipo y escenario.');
 if(o.scenario!=='baseline'&&!nonempty(o.horizon))p.push('Los escenarios requieren un horizonte y supuestos de comparación.');
 if(!Object.hasOwn(QUALIFIERS,o.qualifier))p.push('Elegí cómo se informa el resultado.');
 if(['exact','lt','gt'].includes(o.qualifier)){
  if(!finite(o.value))p.push('Ingresá un valor numérico finito. Cero es un valor válido.');
  if(o.detectionLimit!==null)p.push('El límite de detección se registra en la modalidad No detectado.');
 }else{
  if(o.value!==null)p.push('Un faltante o no detectado no debe contener un valor numérico.');
  if(o.qualifier==='not-detected'&&(!finite(o.detectionLimit)||o.detectionLimit<=0))p.push('No detectado requiere un límite de detección positivo, en la unidad del indicador.');
  if(o.qualifier==='missing'&&(!nonempty(o.notes)||o.detectionLimit!==null))p.push('Explicá el motivo del dato faltante; no le asignes un límite de detección.');
  if(o.uncertainty!==null)p.push('Sin valor puntual, documentá la incertidumbre en texto.');
 }
 if(o.uncertainty!==null&&(!finite(o.uncertainty)||o.uncertainty<0))p.push('La incertidumbre absoluta declarada no puede ser negativa.');
 if(!nonempty(o.uncertaintyNote))p.push('Documentá incertidumbre, cobertura o por qué no fue cuantificada.');
 if(!nonempty(o.source)||!nonempty(o.author))p.push('Fuente y responsable son obligatorios; no equivalen a validación independiente.');
 if(o.supersedes!==null&&!nonempty(o.correctionReason))p.push('Una corrección requiere motivo.');
 if(o.supersedes===null&&o.correctionReason!=='')p.push('El motivo de corrección solo corresponde a una nueva versión de otro registro.');
 return p;
}
function validObservation(x:unknown):x is Observation{
 if(!object(x)||!keys(x,['id','indicatorId','start','end','location','latitude','longitude','origin','basis','scenario','horizon','qualifier','value','detectionLimit','uncertainty','uncertaintyNote','source','author','notes','supersedes','correctionReason','createdAt']))return false;
 if(!identifier(x.id)||!stamp(x.createdAt)||!(x.supersedes===null||identifier(x.supersedes)))return false;
 if(!['start','end','location','horizon','uncertaintyNote','source','author','notes','correctionReason'].every(k=>text(x[k])))return false;
 return observationProblems(x as unknown as Observation).length===0;
}
export function validBaseline(raw:unknown,projectId:string):raw is BaselineDocument{
 if(!object(raw)||!keys(raw,['schema','projectId','projectName','updatedAt','indicators','observations'])||raw.schema!==BASELINE_SCHEMA||raw.projectId!==projectId||!identifier(raw.projectId)||!nonempty(raw.projectName,500)||!stamp(raw.updatedAt))return false;
 if(!Array.isArray(raw.indicators)||raw.indicators.length>200||!raw.indicators.every(validIndicator)||!Array.isArray(raw.observations)||raw.observations.length>2000||!raw.observations.every(validObservation))return false;
 const indicators=raw.indicators as Indicator[],observations=raw.observations as Observation[];
 if(new Set(indicators.map(i=>i.id)).size!==indicators.length||new Set(observations.map(o=>o.id)).size!==observations.length)return false;
 const ids=new Set(indicators.map(i=>i.id)),records=new Map(observations.map(o=>[o.id,o])),children=new Set<string>();
 for(const o of observations){
  if(!ids.has(o.indicatorId))return false;
  if(o.supersedes!==null){const old=records.get(o.supersedes);if(!old||old.indicatorId!==o.indicatorId||old.origin!==o.origin||children.has(old.id)||o.createdAt<old.createdAt)return false;children.add(old.id);}
  const chain=new Set<string>();let current:Observation|undefined=o;
  while(current){if(chain.has(current.id))return false;chain.add(current.id);current=current.supersedes===null?undefined:records.get(current.supersedes);}
 }
 return true;
}
export function activeObservations(doc:BaselineDocument){const replaced=new Set(doc.observations.map(o=>o.supersedes).filter(Boolean));return doc.observations.filter(o=>!replaced.has(o.id));}
export function baselineSummary(doc:BaselineDocument){const active=activeObservations(doc);return {indicators:doc.indicators.length,active:active.length,history:doc.observations.length-active.length,exact:active.filter(o=>o.qualifier==='exact').length,synthetic:active.filter(o=>o.origin==='synthetic').length,declared:active.filter(o=>o.origin==='declared').length,censored:active.filter(o=>['lt','gt','not-detected'].includes(o.qualifier)).length,missing:active.filter(o=>o.qualifier==='missing').length};}
function checked(doc:BaselineDocument){if(!validBaseline(doc,doc.projectId))throw Error('El documento no supera la validación de estructura, referencias o versiones.');return doc;}
const normalize=(x:string)=>x.trim().normalize('NFKC').toLocaleLowerCase('es');
export function registerIndicator(doc:BaselineDocument,input:Omit<Indicator,'id'|'createdAt'>,id:string=crypto.randomUUID(),now=new Date().toISOString()){
 const labels={name:'nombre',factor:'factor ambiental',unit:'unidad',method:'método',temporalSupport:'soporte temporal'};
 const missing=Object.entries(labels).filter(([key])=>!nonempty(input[key as keyof typeof labels],1000)).map(([,label])=>label);
 if(missing.length)throw Error('Completá la definición: '+missing.join(', ')+'.');
 const signature=(i:typeof input)=>[normalize(i.name),normalize(i.factor),i.unit.trim(),normalize(i.method),normalize(i.temporalSupport)].join('|');
 if(doc.indicators.some(i=>signature(i)===signature(input)))throw Error('Ya existe una definición idéntica; seleccioná el indicador registrado.');
 return checked({...doc,updatedAt:now,indicators:[...doc.indicators,{...input,id,createdAt:now}]});
}
export function registerObservation(doc:BaselineDocument,input:Omit<Observation,'id'|'createdAt'>,id:string=crypto.randomUUID(),now=new Date().toISOString()){
 const problems=observationProblems({...input,id,createdAt:now});if(problems.length)throw Error(problems.join(' '));
 if(input.supersedes&&doc.observations.some(o=>o.supersedes===input.supersedes))throw Error('Ese registro ya tiene una corrección. Abrí su última versión.');
 return checked({...doc,updatedAt:now,observations:[...doc.observations,{...input,id,createdAt:now}]});
}
export function mergeBaseline(current:BaselineDocument,incoming:unknown,now=new Date().toISOString()):{doc:BaselineDocument;changed:boolean}{
 if(!validBaseline(incoming,current.projectId))throw Error('JSON incompatible: revisá proyecto, esquema, campos y cadena de correcciones.');
 const canonical=(x:unknown):string=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':object(x)?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
 const merge=<T extends {id:string}>(a:T[],b:T[])=>{const map=new Map(a.map(x=>[x.id,x]));for(const x of b){const old=map.get(x.id);if(old&&canonical(old)!==canonical(x))throw Error('Conflicto de identificador '+x.id+'. Se conserva el documento actual; no se sobrescribe historia.');if(!old)map.set(x.id,x);}return [...map.values()];};
 const indicators=merge(current.indicators,incoming.indicators),observations=merge(current.observations,incoming.observations);
 const changed=indicators.length!==current.indicators.length||observations.length!==current.observations.length;
 return {doc:changed?checked({...current,updatedAt:now,indicators,observations}):current,changed};
}
export function baselineResult(o:Observation){
 if(o.qualifier==='missing')return 'Sin dato';
 if(o.qualifier==='not-detected')return 'ND (LD '+o.detectionLimit+')';
 return (o.qualifier==='lt'?'< ':o.qualifier==='gt'?'> ':'')+String(o.value);
}
export function baselineCsv(doc:BaselineDocument){
 const field=(v:unknown)=>{const s=String(v??'');return '"'+(/^\s*[=+\-@\t\r]/.test(s)?"'":'')+s.replaceAll('"','""')+'"';};
 const active=new Set(activeObservations(doc).map(o=>o.id));
 const rows:unknown[][]=[['Proyecto','ID indicador','Indicador','Factor','Unidad','Método','Soporte temporal','Impactos vinculados','ID registro','Inicio','Fin','Punto/ámbito','Latitud WGS84','Longitud WGS84','Origen declarado','Tipo de dato','Escenario','Horizonte','Calificador','Valor','Límite detección','Incertidumbre absoluta','Base de incertidumbre','Fuente','Responsable','Notas','Corrige a','Motivo corrección','Creado','Estado de versión','Verificación']];
 for(const o of doc.observations){const i=doc.indicators.find(i=>i.id===o.indicatorId)!;rows.push([doc.projectId,i.id,i.name,i.factor,i.unit,i.method,i.temporalSupport,i.impactIds.join(', '),o.id,o.start,o.end,o.location,o.latitude,o.longitude,ORIGINS[o.origin],BASES[o.basis],SCENARIOS[o.scenario],o.horizon,QUALIFIERS[o.qualifier],o.value,o.detectionLimit,o.uncertainty,o.uncertaintyNote,o.source,o.author,o.notes,o.supersedes,o.correctionReason,o.createdAt,active.has(o.id)?'Vigente':'Corregido, conservado','Fuente y calidad no verificadas por la aplicación']);}
 return '\uFEFF'+rows.map(row=>row.map(field).join(';')).join('\r\n');
}
