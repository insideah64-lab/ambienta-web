import type {DemoState} from '../../lib/demo';
import {readMatrixAxes} from '../impacts/ImpactMatrixBuilder';
import {calculateConesa,conesaProblems,CONESA_FIELDS,METHOD_ID,validatedConesaEntry,
 type ConesaEntry} from '../impacts/ConesaSimplificadoModel';
import {isResidualDocument,reviewResidual,RESIDUAL_METHOD_ID,
 type ResidualDocument} from '../impacts/ConesaResidualModel';
// @ts-ignore: pure read-only selector also covered by Node tests
import {resolveConesaImpactChain} from '../impacts/conesa-impact-chain.mjs';

export const CONESA_REPORT_ANNEX_SCHEMA='ambienta.conesa-report-annex.v1' as const;
type InitialDocument={schema:'ambienta.conesa-simplificado.v1';projectId:string;
 projectName:string;updatedAt:string;entries:Record<string,ConesaEntry>};
type ReadResult<T>={data:T|null;issue:string|null};
type ChainProjection={
 status:string;warnings:string[];
 inspectionIds:string[];evidenceIds:string[];
};
function readDraft<T>(storage:Storage,key:string,isValid:(value:unknown)=>value is T,
 label:string):ReadResult<T>{
 try{
  const raw=storage.getItem(key);
  if(raw===null)return {data:null,issue:null};
  const value:unknown=JSON.parse(raw);
  return isValid(value)?{data:value,issue:null}:
   {data:null,issue:label+': el borrador local no cumple el esquema esperado; no se interpretaron sus cifras'};
 }catch{
  return {data:null,issue:label+': no se pudo leer o interpretar el borrador del navegador'};
 }
}
function validInitial(v:unknown,projectId:string):v is InitialDocument{
 if(!v||typeof v!=='object'||Array.isArray(v))return false;
 const d=v as Partial<InitialDocument>;
 return d.schema==='ambienta.conesa-simplificado.v1'&&d.projectId===projectId&&
  typeof d.projectName==='string'&&d.projectName.length<=500&&
  typeof d.updatedAt==='string'&&d.updatedAt.length<=80&&
  !!d.entries&&typeof d.entries==='object'&&!Array.isArray(d.entries)&&
  Object.keys(d.entries).length<=12000&&Object.entries(d.entries).every(([id,entry])=>
    id.length<=220&&validatedConesaEntry(entry));
}
const criteriaText=(entry:ConesaEntry|undefined):string=>
 entry?CONESA_FIELDS.map(f=>f.id+'='+String(entry.criteria[f.id]??'—')).join('; '):'Sin valoración';
const normal=(v:string|undefined|null)=>v?.trim()||'No informado';

/**
 * Generates a NEW, ephemeral, read-only annex from the current browser's local
 * Conesa drafts. Nothing is seeded or modified. Scores come from the exact
 * Conesa engine used in the matrix; residuals use its validated review model.
 */
export function readConesaReportAnnex(state:DemoState,storage:Storage){
 const projectId=state.project.id;
 const original=readDraft(storage,'ambienta-conesa-simplificado-v1:'+projectId,
  (v):v is InitialDocument=>validInitial(v,projectId),'Matriz Conesa inicial');
 const residual=readDraft(storage,'ambienta-conesa-residual-v1:'+projectId,
  (v):v is ResidualDocument=>isResidualDocument(v,projectId),'Escenarios Conesa residuales');
 const issues=[original.issue,residual.issue].filter((x):x is string=>Boolean(x));
 const axes=readMatrixAxes(projectId,state.project.name);
 const factors=new Map(axes.factors.map(x=>[x.id,x]));
 const actions=new Map(axes.actions.map(x=>[x.id,x]));
 const ids=new Set([...Object.keys(original.data?.entries||{}),
  ...Object.keys(residual.data?.entries||{})]);
 const rows=[...ids].sort().map(id=>{
  const sep=id.indexOf('::'),fid=sep<0?id:id.slice(0,sep);
  const aid=sep<0?'':id.slice(sep+2),factor=factors.get(fid),action=actions.get(aid);
  const initial=original.data?.entries[id],record=residual.data?.entries[id];
  const initialResult=calculateConesa(initial),review=reviewResidual(initial,record);
  const chain=resolveConesaImpactChain(state,projectId,record?.impactId||'',
    record?.measure.pgaMeasureId||'') as unknown as ChainProjection;
  const orphan=!factor||!action;
  const associationClaim=Boolean(record?.impactId||record?.measure.pgaMeasureId);
  const chainIssue=associationClaim&&chain.status!=='vinculado';
  const lackReason=associationClaim&&!record?.impactLinkReason?.trim();
  const warnings=[
   ...(orphan?['Acción o factor fuera del catálogo actual']:[]),
   ...conesaProblems(initial).filter(x=>x!=='No evaluado'),
   ...(record?review.problems:[]),
   ...(chain.warnings||[]),
   ...(lackReason?['Correspondencia impacto-medida sin fundamento técnico']:[])
  ];
  const clean=[...new Set(warnings)];
  const status=orphan||chainIssue||lackReason||review.status==='revisar'||
   (!initialResult&&Boolean(record))?'Revisar':
   record&&review.status==='completo'?'Completo documental':
   initialResult?'Inicial calculada; residual pendiente':'Incompleto';
  return {
   id,factor:factor?.name||fid,action:action?.name||aid,
   phase:action?.phase||'No identificada',catalogStatus:orphan?'Desvinculado':'Vinculado',
   initialNature:initial?.sign===-1?'Negativo':initial?.sign===1?'Positivo':'Sin definir',
   initialAbsolute:initialResult?.absolute??null,initialSigned:initialResult?.signed??null,
   initialCategory:initialResult?.category??null,initialCriteria:criteriaText(initial),
   initialReason:normal(initial?.reason),initialEvidence:normal(initial?.evidence),
   residualOutcome:record?.outcome==='evitado'?'Evitado (sin I=0)':record?'Persiste':'Sin evaluar',
   residualAbsolute:review.residual?.absolute??null,
   residualSigned:review.residual?.signed??null,
   residualCategory:review.residual?.category??null,
   residualCriteria:record?.outcome==='evitado'?'No aplicable: evitado':
    criteriaText(record?.residual),
   residualReason:normal(record?.residual.reason),residualEvidence:normal(record?.residual.evidence),
   delta:review.delta,reviewStatus:status,
   hierarchy:normal(record?.measure.hierarchy),measureDescription:normal(record?.measure.description),
   measureReference:normal(record?.measure.reference),
   measureId:normal(record?.measure.pgaMeasureId),
   impactId:normal(record?.impactId),
   impactLinkReason:normal(record?.impactLinkReason),
   pgaReference:normal(record?.measure.pgaRef),
   indicator:normal(record?.measure.indicator),
   frequency:normal(record?.measure.frequency),
   responsible:normal(record?.measure.responsible),
   uncertainty:normal(record?.measure.uncertainty),
   evidenceQuality:normal(record?.measure.quality),
   declaredExecution:normal(record?.measure.execution),
   assumptions:normal(record?.measure.assumptions),
   chainStatus:chain.status,
   inspectionIds:chain.inspectionIds??[],
   evidenceIds:chain.evidenceIds??[],
   warnings:clean
  };
 });
 return {
  schema:CONESA_REPORT_ANNEX_SCHEMA,projectId,
  methods:{initial:METHOD_ID,residual:RESIDUAL_METHOD_ID},
  source:{initial:'Borrador local del navegador',
   residual:'Escenario residual local del navegador',
   initialUpdatedAt:original.data?.updatedAt??null,
   residualUpdatedAt:residual.data?.updatedAt??null},
  counts:{initialEntries:Object.keys(original.data?.entries||{}).length,
   initialCalculated:rows.filter(x=>x.initialAbsolute!==null&&!x.warnings.includes('Acción o factor fuera del catálogo actual')).length,
   residualEntries:Object.keys(residual.data?.entries||{}).length,
   reviewRequired:rows.filter(x=>x.reviewStatus==='Revisar'||x.reviewStatus==='Incompleto').length,
   documentedChains:rows.filter(x=>x.chainStatus==='vinculado'&&x.impactLinkReason!=='No informado').length},
  rows,issues,
  disclaimer:'Valoraciones experimentales del método Conesa simplificado, no homologación normativa. '+
   'Los valores son borradores del evaluador, no mediciones ni acreditación de eficacia ambiental.'
 };
}
