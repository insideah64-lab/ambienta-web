import {measureDocumentTrace} from './measure-document-trace.mjs';

/** V3.6.2: deterministic, read-only export of the IDs and declared records
 * needed to reconstruct ONE measure's documentary graph.
 * SHA-256 proves only byte integrity of this exported snapshot, NOT authenticity,
 * legal compliance, validity of the evidence, or existence of referenced files.
 */
export const GRAPH_SCHEMA='ambienta.document_trace.v1';
const clone=(x)=>JSON.parse(JSON.stringify(x));
const sorted=(rows)=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
function normalized(x){
 if(Array.isArray(x))return x.map(normalized);
 if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x)
  .filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b,'en'))
  .map(([k,v])=>[k,normalized(v)]));
 return x;
}
export const canonicalGraphJson=(obj)=>JSON.stringify(normalized(obj));
const node=(kind,record)=>({key:kind+':'+record.id,kind,id:record.id,data:clone(record)});
const edge=(from,to,kind,referenceField,declaredBy,via=[])=>({
 from,to,kind,referenceField,declaredBy,via:[...via]});
export function buildDocumentGraph(state,measureId){
 const t=measureDocumentTrace(state,measureId);
 if(!t)return null;
 const m=t.measure;
 const nodes=[node('measure',m)];
 if(t.program)nodes.push(node('program',t.program));
 nodes.push(...t.inspections.map(r=>node('inspection',r)));
 nodes.push(...t.evidence.map(({record})=>node('evidence',record)));
 nodes.push(...t.findings.map(r=>node('finding',r)));
 nodes.push(...t.actions.map(r=>node('action',r)));
 const edges=[];
 if(t.program)edges.push(edge('measure:'+m.id,'program:'+t.program.id,'direct','measure.programId','measure:'+m.id));
 for(const i of t.inspections)edges.push(edge('inspection:'+i.id,'measure:'+m.id,'direct','inspection.measureId','inspection:'+i.id));
 for(const {record:e,via} of t.evidence){
  if(via==='medida')edges.push(edge('evidence:'+e.id,'measure:'+m.id,'direct','evidence.measureId','evidence:'+e.id));
  else edges.push(edge('evidence:'+e.id,'measure:'+m.id,'indirect','evidence.inspectionId → inspection.measureId','evidence:'+e.id,
   [e.inspectionId]));
  if(e.inspectionId&&t.inspections.some(i=>i.id===e.inspectionId))
   edges.push(edge('evidence:'+e.id,'inspection:'+e.inspectionId,'direct','evidence.inspectionId','evidence:'+e.id));
 }
 for(const f of t.findings)edges.push(edge('finding:'+f.id,'inspection:'+f.inspectionId,'direct','finding.inspectionId','finding:'+f.id));
 for(const a of t.actions)edges.push(edge('action:'+a.id,'finding:'+a.findingId,'direct','action.findingId','action:'+a.id));
 const warnings=t.warnings.map(w=>clone(w)).sort((a,b)=>a.id.localeCompare(b.id)||a.kind.localeCompare(b.kind));
 const invalidEvidence=(state.evidence??[]).filter(e=>
  warnings.some(w=>w.id===e.id&&w.kind==='conflicting_evidence'))
  .map(e=>({id:e.id,reason:'conflicting_evidence'})).sort((a,b)=>a.id.localeCompare(b.id));
 return normalized({
  schema:GRAPH_SCHEMA,scope:'single_measure',source:{
   kind:'browser_local_demo_state',projectId:state.project?.id??null,
   caseDemo:state.demo===true,revision:state.revision??null,
   evidenceFilesIncluded:false,externalSourcesIndependentlyVerified:false},
  measureId,
  nodeCount:nodes.length,edgeCount:edges.length,
  nodes:sorted(nodes.map(n=>({...n,id:n.key}))).map(({key:unused,...n})=>({...n,key:n.id,id:n.id.split(':').slice(1).join(':')})),
  edges:edges.sort((a,b)=>
   (a.from+'|'+a.to+'|'+a.kind).localeCompare(b.from+'|'+b.to+'|'+b.kind)),
  warnings,excludedLinks:invalidEvidence,
  disclaimer:'Solo traza referencias declaradas del expediente local. SHA-256 comprueba integridad de bytes, no autenticidad, cumplimiento ambiental, inspección de campo ni existencia de archivos.'
 });
}
function hex(ab){return [...new Uint8Array(ab)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function sha256Text(content){
 if(!globalThis.crypto?.subtle)throw new Error('SHA-256 no está disponible en este contexto');
 return hex(await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(content)));
}
export async function prepareDocumentGraphExport(state,measureId){
 const graph=buildDocumentGraph(state,measureId);
 if(!graph)return null;
 const canonical=canonicalGraphJson(graph);
 const payload={...graph,integrity:{
  algorithm:'SHA-256',canonicalization:'sorted-object-keys/json-v1',
  graph_sha256:await sha256Text(canonical),
  scope:'canonical graph excluding this integrity property',
  interpretation:'Integridad del extracto generado, no autenticidad de los documentos ni cumplimiento ambiental'}};
 return {filename:'ambienta-trazabilidad-'+measureId.replace(/[^A-Za-z0-9_-]/g,'_')+'.json',
  data:payload,json:JSON.stringify(payload,null,2)+'\n'};
}
export async function verifyDocumentGraphExport(payload){
 if(!payload||payload.schema!==GRAPH_SCHEMA||!payload.integrity||
    payload.integrity.algorithm!=='SHA-256'||typeof payload.integrity.graph_sha256!=='string')return false;
 const {integrity,...graph}=payload;
 return (await sha256Text(canonicalGraphJson(graph)))===integrity.graph_sha256;
}
