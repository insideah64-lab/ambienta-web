/** Read-only descriptive comparison: no environmental ranking or offsetting. */
import {summarizeLeopold,type LeopoldInteraction,type LeopoldSlice} from './LeopoldAnalytics';
export type AlternativeAxis={id:string;name:string;group?:string};
export type AlternativeMatrix={
 schema:'ambienta.impact-matrix.v1';projectId:string;projectName:string;
 actions:AlternativeAxis[];factors:AlternativeAxis[];
 cells:Record<string,LeopoldInteraction>;
};
type Counts=Pick<LeopoldSlice,'evaluated'|'pending'|'none'|'unassessed'|'positive'|'negative'>;
export type AlternativeRow={name:string;group:string;A:Counts;B:Counts};
export type AlternativeComparison={
 rows:AlternativeRow[];onlyA:string[];onlyB:string[];ambiguous:string[];
 summaryA:Counts;summaryB:Counts;
};
const txt=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;
const score=(v:unknown)=>v===null||(Number.isInteger(v)&&Number(v)>=1&&Number(v)<=10);
export function isAlternativeMatrix(raw:unknown):raw is AlternativeMatrix{
 if(!raw||typeof raw!=='object')return false;
 const x=raw as Partial<AlternativeMatrix>;
 if(x.schema!=='ambienta.impact-matrix.v1'||!txt(x.projectId,200)||!txt(x.projectName,350)||
  !Array.isArray(x.actions)||!Array.isArray(x.factors)||x.actions.length>150||x.factors.length>150||
  !x.actions.every(a=>a&&txt(a.id,100)&&!!a.id&&txt(a.name,350))||
  !x.factors.every(f=>f&&txt(f.id,100)&&!!f.id&&txt(f.name,350)&&txt(f.group,150))||
  !x.cells||typeof x.cells!=='object'||Array.isArray(x.cells)||
  Object.keys(x.cells).length>12000)return false;
 if(new Set(x.actions.map(a=>a.id)).size!==x.actions.length||
  new Set(x.factors.map(f=>f.id)).size!==x.factors.length)return false;
 return Object.entries(x.cells).every(([key,v])=>key.length<=210&&v&&
  (v.sign===-1||v.sign===0||v.sign===1)&&score(v.magnitude)&&score(v.importance));
}
const normalize=(s:string)=>s.trim().replace(/\s+/g,' ').normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
const identity=(x:AlternativeAxis)=>normalize(x.name)+'|'+normalize(x.group??'');
const counts=(x:LeopoldSlice):Counts=>({
 evaluated:x.evaluated,pending:x.pending,none:x.none,unassessed:x.unassessed,
 positive:x.positive,negative:x.negative
});
function index(items:AlternativeAxis[]){
 const out=new Map<string,AlternativeAxis[]>();
 for(const f of items){const id=identity(f);out.set(id,[...(out.get(id)??[]),f]);}
 return out;
}
export function compareLeopoldAlternatives(A:AlternativeMatrix,B:AlternativeMatrix):AlternativeComparison{
 if(!isAlternativeMatrix(A)||!isAlternativeMatrix(B))throw new Error('Matrices incompatibles');
 const ai=index(A.factors),bi=index(B.factors);
 const sa=summarizeLeopold(A.factors,A.actions,A.cells);
 const sb=summarizeLeopold(B.factors,B.actions,B.cells);
 const rows:AlternativeRow[]=[],onlyA:string[]=[],onlyB:string[]=[],ambiguous:string[]=[];
 for(const [id,fs] of ai){
  const other=bi.get(id);
  if(fs.length!==1||(other&&other.length!==1)){
   ambiguous.push(fs[0].name);continue;
  }
  if(!other){onlyA.push(fs[0].name);continue;}
  rows.push({name:fs[0].name,group:fs[0].group??'',
   A:counts(sa.byFactor[fs[0].id]),B:counts(sb.byFactor[other[0].id])});
 }
 for(const [id,fs] of bi){
  if(ai.has(id))continue;
  if(fs.length!==1){ambiguous.push(fs[0].name);continue;}
  onlyB.push(fs[0].name);
 }
 return {rows,onlyA,onlyB,ambiguous,summaryA:counts(sa.total),summaryB:counts(sb.total)};
}
