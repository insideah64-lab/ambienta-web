/**
 * Read-only, explicit-ID association between a Conesa scenario and a PGA measure.
 * This is documentary linkage, not proof that the measure mitigates that impact.
 * Never create PGA data, infer identifiers from names, or select a duplicate.
 */
import {measureDocumentTrace} from '../traceability/measure-document-trace.mjs';

export function resolveConesaPgaLink(state, projectId, measureId){
 if(!measureId)return {status:'sin-vinculo',measure:null,program:null,trace:null,warnings:[]};
 if(typeof measureId!=='string'||measureId.length>300)
  return {status:'referencia-invalida',measure:null,program:null,trace:null,
   warnings:['Identificador PGA inválido']};
 if(!state||state.project?.id!==projectId)
  return {status:'proyecto-distinto',measure:null,program:null,trace:null,
   warnings:['El expediente PGA no corresponde al proyecto de la matriz']};
 const candidates=(state.measures??[]).filter(m=>m.id===measureId);
 if(candidates.length>1)return {status:'ambiguo',measure:null,program:null,trace:null,
  warnings:['Identificador de medida PGA duplicado: no se selecciona un registro arbitrario']};
 if(candidates.length!==1)return {status:'no-encontrado',measure:null,program:null,trace:null,
  warnings:['La medida PGA referenciada no existe en el expediente actual']};
 const trace=measureDocumentTrace(state,measureId);
 if(!trace)return {status:'ambiguo',measure:null,program:null,trace:null,
  warnings:['El grafo documental no pudo resolver de manera inequívoca la medida']};
 return {status:'vinculado',measure:candidates[0],program:trace.program,trace,
  warnings:trace.warnings.map(w=>w.id+': '+w.message)};
}

export function uniquePgaMeasures(state,projectId){
 if(!state||state.project?.id!==projectId)return [];
 const counts=new Map();
 for(const m of state.measures??[]){
  if(typeof m?.id==='string')counts.set(m.id,(counts.get(m.id)??0)+1);
 }
 return (state.measures??[]).filter(m=>typeof m?.id==='string'&&counts.get(m.id)===1)
  .map(m=>({id:m.id,title:m.title,owner:m.owner,status:m.status}))
  .sort((a,b)=>a.id.localeCompare(b.id));
}
