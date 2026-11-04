/**
 * Exploratory review of high-scoring individual Leopold interactions.
 * Conesa (1997), pp. 60–61 asks for discussion of highlighted rows,
 * columns and isolated cells. It does NOT set a universal numeric cutoff.
 *
 * No environmental compensation, product-based ranking or legal approval
 * is inferred here. The user's criteria are temporary view settings.
 */
import type {LeopoldInteraction} from './LeopoldAnalytics';

export type LeopoldReviewCell=LeopoldInteraction&{reason?:string;evidence?:string};
export type LeopoldReviewAxis={id:string;name:string};
export type LeopoldReviewRule={minMagnitude:number;minImportance:number;logic:'either'|'both'};
export type LeopoldReviewHit={
 key:string;factorId:string;actionId:string;factorName:string;actionName:string;
 sign:-1|1;magnitude:number;importance:number;
 hasReason:boolean;hasEvidence:boolean;
 soleCompletedForFactor:boolean;soleCompletedForAction:boolean;
};
export type LeopoldReviewReport={
 reviewedComplete:number;pending:number;unassessed:number;noInteraction:number;
 hits:LeopoldReviewHit[];
 byFactor:Record<string,number>;
 byAction:Record<string,number>;
};
const inRange=(x:number|null)=>Number.isInteger(x)&&x!==null&&x>=1&&x<=10;

export function scanLeopoldHighlights(
 factors:readonly LeopoldReviewAxis[],actions:readonly LeopoldReviewAxis[],
 cells:Readonly<Record<string,LeopoldReviewCell>>,rule:LeopoldReviewRule
):LeopoldReviewReport{
 if(!inRange(rule.minMagnitude)||!inRange(rule.minImportance)||
  (rule.logic!=='either'&&rule.logic!=='both')){
  throw new RangeError('Los criterios exploratorios deben ser enteros entre 1 y 10.');
 }
 const byFactor:Record<string,number>=Object.create(null);
 const byAction:Record<string,number>=Object.create(null);
 const completedByFactor=new Map<string,number>(),completedByAction=new Map<string,number>();
 const eligible:LeopoldReviewHit[]=[];
 let reviewedComplete=0,pending=0,unassessed=0,noInteraction=0;
 for(const f of factors)for(const a of actions){
  const key=f.id+'::'+a.id;
  const item=cells[key];
  if(!item){unassessed++;continue;}
  if(item.sign===0){noInteraction++;continue;}
  if((item.sign!==-1&&item.sign!==1)||!inRange(item.magnitude)||!inRange(item.importance)){
   pending++;continue;
  }
  reviewedComplete++;
  completedByFactor.set(f.id,(completedByFactor.get(f.id)||0)+1);
  completedByAction.set(a.id,(completedByAction.get(a.id)||0)+1);
  const highM=item.magnitude!>=rule.minMagnitude;
  const highI=item.importance!>=rule.minImportance;
  if(rule.logic==='either' ? !(highM||highI) : !(highM&&highI))continue;
  eligible.push({
   key,factorId:f.id,actionId:a.id,factorName:f.name,actionName:a.name,
   sign:item.sign,magnitude:item.magnitude!,importance:item.importance!,
   hasReason:!!item.reason?.trim(),hasEvidence:!!item.evidence?.trim(),
   soleCompletedForFactor:false,soleCompletedForAction:false
  });
  byFactor[f.id]=(byFactor[f.id]||0)+1;
  byAction[a.id]=(byAction[a.id]||0)+1;
 }
 const hits=eligible.map(h=>({
  ...h,soleCompletedForFactor:completedByFactor.get(h.factorId)===1,
  soleCompletedForAction:completedByAction.get(h.actionId)===1
 }));
 // Adverse first for the reviewer's convenience; NOT an ecological priority ranking.
 hits.sort((a,b)=>Number(b.sign===-1)-Number(a.sign===-1)||
  b.magnitude-a.magnitude||b.importance-a.importance||a.key.localeCompare(b.key));
 return {reviewedComplete,pending,unassessed,noInteraction,hits,byFactor,byAction};
}
