import {buildDocumentGraph,canonicalGraphJson,GRAPH_SCHEMA,verifyDocumentGraphExport} from './document-graph-export.mjs';

/** V3.6.3. Never trust a checksum as authenticity or silently merge imports.
 * Imported JSON is parsed and inspected entirely in memory; no persistence.
 */
export const MAX_GRAPH_IMPORT_BYTES=1024*1024;
const allowedKinds=new Set(['program','measure','inspection','evidence','finding','action']);
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const idText=x=>typeof x==='string'&&x.length>0&&x.length<=180&&!/[\u0000-\u001f\u007f]/.test(x);
const same=(a,b)=>canonicalGraphJson(a)===canonicalGraphJson(b);
const fail=(code,message)=>({status:'invalid',code,message,checksumVerified:false,comparable:false,
  changes:null,details:[]});
function structuralErrors(value){
 if(!isObject(value))return 'La raíz del archivo no es un objeto JSON.';
 // Structural limits matter even when under one megabyte.
 const pending=[[value,0]];let visited=0;
 while(pending.length){
  const [item,depth]=pending.pop();
  if(++visited>50000||depth>22)return 'El JSON excede los límites de estructura permitidos.';
  if(!item||typeof item!=='object')continue;
  for(const [k,v] of Object.entries(item)){
   if(k==='__proto__'||k==='constructor'||k==='prototype')return 'Clave potencialmente insegura.';
   if(typeof v==='object'&&v!==null)pending.push([v,depth+1]);
  }
 }
 if(value.schema!==GRAPH_SCHEMA||value.scope!=='single_measure')return 'Esquema o alcance de grafo incompatible.';
 if(!idText(value.measureId))return 'Identificador de medida inválido.';
 if(!isObject(value.source)||!idText(value.source.projectId)||value.source.kind!=='browser_local_demo_state'||
    typeof value.source.revision!=='number'||!Number.isSafeInteger(value.source.revision)||
    typeof value.source.caseDemo!=='boolean'||value.source.evidenceFilesIncluded!==false||
    value.source.externalSourcesIndependentlyVerified!==false)
   return 'Metadatos de origen incompatibles o sin garantías de demostración.';
 if(!Array.isArray(value.nodes)||!Array.isArray(value.edges)||
    !Array.isArray(value.warnings)||!Array.isArray(value.excludedLinks)||
    value.nodes.length>5000||value.edges.length>20000||
    value.warnings.length>5000||value.excludedLinks.length>5000)
   return 'Colecciones de nodos, vínculos o advertencias inválidas.';
 if(value.nodeCount!==value.nodes.length||value.edgeCount!==value.edges.length)
   return 'Los contadores no corresponden al contenido.';
 if(!isObject(value.integrity)||value.integrity.algorithm!=='SHA-256'||
    value.integrity.canonicalization!=='sorted-object-keys/json-v1'||
    !/^[a-f0-9]{64}$/.test(value.integrity.graph_sha256??''))
   return 'La sección de integridad está incompleta o no es compatible.';
 const keys=new Set();
 for(const n of value.nodes){
  if(!isObject(n)||!allowedKinds.has(n.kind)||!idText(n.id)||
     n.key!==n.kind+':'+n.id||!isObject(n.data)||n.data.id!==n.id)
   return 'Un nodo tiene identificador, categoría o registro incompatible.';
  if(keys.has(n.key))return 'El grafo contiene identificadores de nodo duplicados.';
  keys.add(n.key);
 }
 if(!keys.has('measure:'+value.measureId))return 'El nodo principal de medida está ausente.';
 for(const e of value.edges){
  if(!isObject(e)||!keys.has(e.from)||!keys.has(e.to)||
     !['direct','indirect'].includes(e.kind)||!idText(e.declaredBy)||
     !idText(e.referenceField)||!Array.isArray(e.via)||
     e.via.length>30||e.via.some(x=>!idText(x)))
   return 'Un vínculo referencia nodos inexistentes o contiene una estructura inválida.';
 }
 for(const w of value.warnings){
  if(!isObject(w)||!idText(w.id)||!idText(w.kind)||typeof w.message!=='string')
   return 'Advertencia documental malformada.';
 }
 for(const x of value.excludedLinks){
  if(!isObject(x)||!idText(x.id)||!idText(x.reason))return 'Registro de exclusión malformado.';
 }
 return null;
}
const keyed=(arr,field)=>new Map(arr.map(row=>[field(row),row]));
const changedFields=(previous,next)=>{
 const a=previous?.data??{},b=next?.data??{};
 return [...new Set([...Object.keys(a),...Object.keys(b)])].sort().filter(k=>!same(a[k]??null,b[k]??null)).slice(0,12);
};
function compareGraph(imported,current){
 const oldNodes=keyed(imported.nodes,n=>n.key);
 const nowNodes=keyed(current.nodes,n=>n.key);
 const additions=[],removals=[],modifications=[];
 for(const [key,n] of nowNodes)if(!oldNodes.has(key))additions.push(key);
 else if(!same(n,oldNodes.get(key)))modifications.push({
  id:key,fields:changedFields(oldNodes.get(key),n)});
 for(const key of oldNodes.keys())if(!nowNodes.has(key))removals.push(key);
 const oldEdges=keyed(imported.edges,canonicalGraphJson);
 const nowEdges=keyed(current.edges,canonicalGraphJson);
 const addedEdges=[...nowEdges.keys()].filter(x=>!oldEdges.has(x));
 const removedEdges=[...oldEdges.keys()].filter(x=>!nowEdges.has(x));
 const warningsChanged=!same(imported.warnings,current.warnings)||
   !same(imported.excludedLinks,current.excludedLinks);
 const metadataChanged=!same(imported.source,current.source);
 const structureChanged=additions.length>0||removals.length>0||
  modifications.length>0||addedEdges.length>0||removedEdges.length>0||
  warningsChanged||metadataChanged;
 return {identical:!structureChanged,
  changes:{addedNodes:additions.length,removedNodes:removals.length,
   changedNodes:modifications.length,addedEdges:addedEdges.length,
   removedEdges:removedEdges.length,warningsChanged,metadataChanged},
  details:[
   ...additions.sort().slice(0,10).map(id=>({kind:'added',id,fields:[]})),
   ...removals.sort().slice(0,10).map(id=>({kind:'removed',id,fields:[]})),
   ...modifications.sort((a,b)=>a.id.localeCompare(b.id)).slice(0,10)
    .map(x=>({kind:'changed',...x}))
  ].slice(0,20)};
}
/** Accept only plain-text JSON with the V3.6.2 schema. Do not store it. */
export async function inspectDocumentGraphImport(json,state,selectedMeasureId){
 if(typeof json!=='string')return fail('not_text','Seleccioná un archivo JSON de trazabilidad.');
 if(new TextEncoder().encode(json).length>MAX_GRAPH_IMPORT_BYTES)return fail('too_large','El archivo supera 1 MiB.');
 let imported;
 try{imported=JSON.parse(json)}catch{return fail('parse_error','El archivo no contiene JSON válido.')}
 const error=structuralErrors(imported);
 if(error)return fail('invalid_schema',error);
 let verified=false;
 try{verified=await verifyDocumentGraphExport(imported)}
 catch{return fail('hash_unavailable','No fue posible calcular SHA-256 en este navegador.')}
 if(!verified)return fail('checksum_mismatch','La huella SHA-256 no coincide con el contenido del extracto.');
 if(!state||!isObject(state.project)||!idText(state.project.id))
   return fail('invalid_local','El expediente local no está disponible.');
 if(imported.source.projectId!==state.project.id)return {
  ...fail('foreign_project','El extracto corresponde a otro proyecto. No se compara ni importa.'),checksumVerified:true};
 if(imported.measureId!==selectedMeasureId)return {
  ...fail('different_measure','El archivo pertenece a otra medida; seleccioná la medida correspondiente.'),checksumVerified:true};
 const current=buildDocumentGraph(state,selectedMeasureId);
 if(!current)return {...fail('measure_missing','La medida no existe en el expediente actual.'),checksumVerified:true};
 const result=compareGraph(imported,current);
 return {status:result.identical?'identical':'different',
  code:result.identical?'matching_snapshot':'documentary_differences',
  message:result.identical
   ?'La exportación coincide con la proyección actual del expediente.'
   :'La exportación tiene diferencias con la proyección actual; revisar sin sobrescribir.',
  checksumVerified:true,comparable:true,changes:result.changes,details:result.details,
  imported:{projectId:imported.source.projectId,measureId:imported.measureId,
   revision:imported.source.revision,nodes:imported.nodeCount,edges:imported.edgeCount,
   warnings:imported.warnings.length,sha256:imported.integrity.graph_sha256},
  current:{revision:current.source.revision,nodes:current.nodeCount,edges:current.edgeCount,
   warnings:current.warnings.length},
  disclaimer:'Un hash correcto solo confirma coherencia del extracto con su huella; cualquiera puede generar un nuevo hash. No autentica su origen, firmas, evidencias ni cumplimiento ambiental.'
 };
}
