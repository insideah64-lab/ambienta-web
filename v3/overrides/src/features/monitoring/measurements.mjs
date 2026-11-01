// AMBIENTA V3.8 — independent append-only measurement register for V3 laboratory.
// Declared sampling values are NOT verified laboratory results or compliance findings.
// The V1/V2 domain, inspection status and evidence bytes are never mutated.
import {parseRegisteredFingerprint} from './documentary-evidence.mjs';
export const MEASUREMENT_SCHEMA='ambienta-measurements-local-v1';
export const MEASUREMENT_UNITS=Object.freeze(['mg/L','µg/L','mg/kg','µg/kg','µg/m³','mg/m³','dB(A)','pH','°C','NTU','µS/cm','%']);
export const MEASUREMENT_MATRICES=Object.freeze(['agua','suelo','aire','ruido','biota','otro']);
export const MEASUREMENT_QUALIFIERS=Object.freeze(['quantified','below_detection','below_quantification']);
export const measurementsKey=isDiablillos=>isDiablillos?'ambienta-v38-measurements-diablillos':'ambienta-v38-measurements-demo';
const MAX_ENTRIES=300,MAX_EVENTS=600;
const insist=(x,m)=>{if(!x)throw Error('Mediciones V3.8: '+m);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const label=x=>typeof x==='string'&&x.trim().length>0&&x.length<=180;
const iso=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(x)&&
 !Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,19)===x.slice(0,19);
const optionalNumber=x=>x===null||(typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e12);
const nonnegative=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e12;
function validDomain(data){
 insist(data?.demo===true&&label(data.project?.id)&&Array.isArray(data.measures)&&
  Array.isArray(data.inspections)&&Array.isArray(data.evidence),'expediente de ensayo no disponible');
 return data;
}
function references(entry,data){
 const measure=data.measures.find(x=>x.id===entry.measureId);
 insist(measure,'la medida del PGA no existe');
 if(entry.inspectionId!==null){
  const inspection=data.inspections.find(x=>x.id===entry.inspectionId);
  insist(inspection&&inspection.measureId===measure.id,'inspección ajena a la medida');
 }
 if(entry.evidenceId!==null){
  const evidence=data.evidence.find(x=>x.id===entry.evidenceId);
  insist(evidence&&evidence.measureId===measure.id,'evidencia ajena a la medida');
  insist(!evidence.inspectionId||evidence.inspectionId===entry.inspectionId,
   'evidencia pertenece a otra inspección');
 }
}
function validMeasurement(entry,data){
 insist(object(entry)&&label(entry.id)&&label(entry.sampleId)&&label(entry.stationId)&&
  label(entry.parameter)&&label(entry.method)&&label(entry.sourceId)&&label(entry.operator)&&
  MEASUREMENT_MATRICES.includes(entry.matrix)&&MEASUREMENT_UNITS.includes(entry.unit)&&
  MEASUREMENT_QUALIFIERS.includes(entry.qualifier)&&iso(entry.collectedAt)&&iso(entry.recordedAt),
  'campos mínimos, fecha, matriz, unidad o calificador inválidos');
 insist(entry.analyzedAt===null||iso(entry.analyzedAt),'fecha de análisis inválida');
 if(entry.analyzedAt!==null)insist(entry.analyzedAt>=entry.collectedAt,
   'el análisis no puede preceder la recolección');
 insist(typeof entry.measureId==='string'&&label(entry.measureId)&&
   (entry.inspectionId===null||label(entry.inspectionId))&&
   (entry.evidenceId===null||label(entry.evidenceId)),'referencia documental inválida');
 insist(optionalNumber(entry.detectionLimit)&&optionalNumber(entry.quantificationLimit)&&
  optionalNumber(entry.uncertainty),'límites o incertidumbre no válidos');
 if(entry.detectionLimit!==null&&entry.quantificationLimit!==null)
  insist(entry.detectionLimit<=entry.quantificationLimit,'LDM mayor que LCM');
 if(entry.qualifier==='quantified'){
  insist(typeof entry.value==='number'&&Number.isFinite(entry.value)&&
   entry.value>=-100&&entry.value<=1e12,'resultado numérico inválido');
  if(entry.unit==='pH')insist(entry.value>=0&&entry.value<=14,'pH fuera de intervalo físico');
  else if(entry.unit!=='°C')insist(entry.value>=0,'no se admiten concentraciones negativas');
 }else insist(entry.value===null,'una lectura censurada no lleva valor cuantificado');
 if(entry.qualifier==='below_detection')insist(nonnegative(entry.detectionLimit)&&entry.detectionLimit>0,
  'se requiere límite de detección positivo');
 if(entry.qualifier==='below_quantification')insist(nonnegative(entry.quantificationLimit)&&entry.quantificationLimit>0,
  'se requiere límite de cuantificación positivo');
 references(entry,data);
 return entry;
}
export function blankMeasurementBook(data,now=''){
 validDomain(data);
 insist(now===''||iso(now),'fecha de creación inválida');
 return {schema:MEASUREMENT_SCHEMA,version:1,status:'LABORATORY_DEMO_NOT_VERIFIED',
 projectId:data.project.id,createdAt:now,revision:0,nextId:1,entries:[],events:[]};
}
export function validateMeasurementBook(book,data){
 validDomain(data);
 insist(object(book)&&book.schema===MEASUREMENT_SCHEMA&&book.version===1&&
  book.status==='LABORATORY_DEMO_NOT_VERIFIED'&&book.projectId===data.project.id&&
  (book.createdAt===''||iso(book.createdAt))&&Number.isSafeInteger(book.revision)&&book.revision>=0&&
  Number.isSafeInteger(book.nextId)&&book.nextId>=1&&book.nextId<=MAX_ENTRIES+1&&
  Array.isArray(book.entries)&&book.entries.length<=MAX_ENTRIES&&
  Array.isArray(book.events)&&book.events.length<=MAX_EVENTS,'registro local o identidad corruptos');
 const ids=new Set(),sampleKeys=new Set();
 for(const entry of book.entries){
  validMeasurement(entry,data);
  insist(!ids.has(entry.id),'identificador de medición duplicado');
  ids.add(entry.id);
  const key=entry.sampleId+'\u0000'+entry.parameter+'\u0000'+entry.collectedAt;
  insist(!sampleKeys.has(key),'muestra, parámetro y fecha duplicados');
  sampleKeys.add(key);
 }
 const revoked=new Set(),created=new Set();
 for(const event of book.events){
  insist(object(event)&&['created','voided'].includes(event.kind)&&
    label(event.measurementId)&&ids.has(event.measurementId)&&iso(event.at)&&label(event.actor),
    'evento de auditoría inválido');
  if(event.kind==='created'){
   insist(!created.has(event.measurementId),'duplicado en historial de alta');
   created.add(event.measurementId);
  }else{
   insist(created.has(event.measurementId)&&!revoked.has(event.measurementId)&&label(event.reason),
    'anulación duplicada o sin justificación');
   revoked.add(event.measurementId);
  }
 }
 insist(ids.size===created.size&&book.events.length>=book.entries.length&&
  book.revision===book.events.length,'historial de mediciones incompleto');
 return book;
}
export function addMeasurement(book,data,input,at){
 validateMeasurementBook(book,data);
 insist(book.entries.length<MAX_ENTRIES,'límite de 300 mediciones por expediente');
 insist(iso(at),'fecha de registro inválida');
 const entry={
  id:'MUE-'+String(book.nextId).padStart(4,'0'),
  measureId:input.measureId,inspectionId:input.inspectionId||null,
  evidenceId:input.evidenceId||null,sampleId:input.sampleId?.trim(),
  stationId:input.stationId?.trim(),matrix:input.matrix,parameter:input.parameter?.trim(),
  qualifier:input.qualifier,unit:input.unit,
  value:input.qualifier==='quantified'?input.value:null,
  detectionLimit:input.detectionLimit??null,
  quantificationLimit:input.quantificationLimit??null,
  uncertainty:input.uncertainty??null,collectedAt:input.collectedAt,
  analyzedAt:input.analyzedAt||null,method:input.method?.trim(),
  sourceId:input.sourceId?.trim(),operator:input.operator?.trim(),
  recordedAt:at
 };
 validMeasurement(entry,data);
 const next=structuredClone(book);
 next.entries.push(entry);next.nextId++;next.revision++;
 next.events.push({kind:'created',measurementId:entry.id,at,actor:entry.operator});
 return validateMeasurementBook(next,data);
}
export function voidMeasurement(book,data,id,reason,actor,at){
 validateMeasurementBook(book,data);
 insist(label(reason)&&label(actor)&&iso(at),'motivo, actor o fecha de anulación inválidos');
 insist(book.entries.some(x=>x.id===id),'medición inexistente');
 insist(!book.events.some(x=>x.kind==='voided'&&x.measurementId===id),'ya se anuló el registro');
 insist(book.events.length<MAX_EVENTS,'historial de auditoría completo');
 const next=structuredClone(book);next.revision++;
 next.events.push({kind:'voided',measurementId:id,reason:reason.trim(),actor:actor.trim(),at});
 return validateMeasurementBook(next,data);
}
export function measurementStatus(entry,book,data){
 validateMeasurementBook(book,data);
 insist(book.entries.some(x=>x.id===entry?.id),'medición inexistente');
 if(book.events.some(e=>e.kind==='voided'&&e.measurementId===entry.id))return 'voided';
 const source=data.evidence.find(x=>x.id===entry.evidenceId);
 if(!source)return 'awaiting_evidence';
 return parseRegisteredFingerprint(source.reference)?'fingerprint_declared_unverified':'evidence_reference_unverified';
}
export function summarizeMeasurements(book,data){
 validateMeasurementBook(book,data);
 const result={total:book.entries.length,active:0,voided:0,awaitingEvidence:0,referenceOnly:0,
 fingerprintDeclared:0};
 for(const entry of book.entries){
  const s=measurementStatus(entry,book,data);
  if(s==='voided')result.voided++;
  else{
   result.active++;
   if(s==='awaiting_evidence')result.awaitingEvidence++;
   else if(s==='fingerprint_declared_unverified')result.fingerprintDeclared++;
   else result.referenceOnly++;
  }
 }
 return result;
}
export function readMeasurementBook(storage,key,data){
 const blank=blankMeasurementBook(data);
 try{
  const raw=storage.getItem(key);
  if(raw===null)return {status:'empty',book:blank,reason:''};
  if(raw.length>280000)return {status:'blocked',book:null,reason:'registro supera 280 KiB'};
  const book=validateMeasurementBook(JSON.parse(raw),data);
  return {status:'ready',book,reason:''};
 }catch(cause){return {status:'blocked',book:null,
  reason:'Registro local inválido o referencias eliminadas. Se conservó el archivo original sin sobrescribirlo.'};}
}
export function exportMeasurementBook(book,data){
 validateMeasurementBook(book,data);
 return {...structuredClone(book),exportedAt:null,
  caveat:'Resultados declarados en una sesión local DEMO, sin acreditación analítica, prueba de exactitud, comparación normativa ni conclusión de cumplimiento.'};
}
