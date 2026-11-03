/**
 * Explicit, read-only provenance chain:
 * registered impact ID -> Conesa interaction (manual assignment) ->
 * PGA measure with that impactId -> unique inspections and evidence.
 *
 * A valid ID chain is NOT an environmental assessment, scientific
 * correspondence, field verification or proof of mitigation effectiveness.
 */
import {resolveConesaPgaLink} from './conesa-pga-link.mjs';

const result=(status,impact=null,link=null,warnings=[])=>({
 status,impact,measure:link?.measure??null,program:link?.program??null,
 trace:link?.trace??null,warnings,
 inspectionIds:link?.trace?.inspections?.map(i=>i.id)??[],
 evidenceIds:link?.trace?.evidence?.map(e=>e.record.id)??[],
 monitoring:link?.trace?.inspections?.length?'con-registros':'sin-inspecciones'
});

export function uniqueRegisteredImpacts(state,projectId){
 if(!state||state.project?.id!==projectId)return [];
 const count=new Map();
 for(const i of state.impacts??[]){
  if(typeof i?.id==='string')count.set(i.id,(count.get(i.id)||0)+1);
 }
 return (state.impacts??[])
  .filter(i=>typeof i?.id==='string'&&count.get(i.id)===1)
  .map(i=>({id:i.id,name:i.name,factor:i.factor,phase:i.phase,sign:i.sign}))
  .sort((a,b)=>a.id.localeCompare(b.id));
}

export function resolveConesaImpactChain(state,projectId,impactId,measureId){
 if(!impactId&&!measureId)return result('sin-referencias');
 if(!state||state.project?.id!==projectId)
  return result('proyecto-distinto',null,null,['El impacto y el PGA deben pertenecer al mismo expediente']);
 if(!impactId)return result('impacto-pendiente',null,null,[
  'Elegir un impacto registrado por ID para comprobar su correspondencia con la medida PGA'
 ]);
 if(typeof impactId!=='string'||impactId.length>220||!impactId.trim())
  return result('impacto-invalido',null,null,['Identificador de impacto inválido']);
 const matches=(state.impacts??[]).filter(i=>i?.id===impactId);
 if(matches.length>1)return result('impacto-ambiguo',null,null,[
  'El impacto tiene un ID duplicado y no se seleccionó arbitrariamente'
 ]);
 if(matches.length===0)return result('impacto-no-encontrado',null,null,[
  'El impacto referenciado no existe en este expediente'
 ]);
 const impact=matches[0];
 if(!measureId)return result('medida-pendiente',impact,null,[
  'Falta una medida PGA explícita asociada a este impacto'
 ]);
 const link=resolveConesaPgaLink(state,projectId,measureId);
 if(link.status!=='vinculado')return result('medida-'+link.status,impact,link,link.warnings);
 if(!Array.isArray(link.measure?.impactIds)||!link.measure.impactIds.includes(impactId)){
  return result('incompatible',impact,link,[
   'La medida PGA no declara este impacto en impactIds; revisar antes de aceptar el enlace',
   ...link.warnings
  ]);
 }
 if(link.warnings.length)return result('revisar-documentos',impact,link,link.warnings);
 return result('vinculado',impact,link,[]);
}
