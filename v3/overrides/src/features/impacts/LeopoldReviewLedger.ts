/**
 * Separate, user-authored review notes for Leopold matrix interactions.
 * Local browser history, NOT an authenticated, immutable or notarized audit trail.
 * Never mutates ambienta.impact-matrix.v1.
 */
import type {LeopoldReviewCell} from './LeopoldReview';

export const LEOPOLD_LEDGER_SCHEMA='ambienta.leopold.review.v1' as const;
export const LEDGER_STORE='ambienta-leopold-review-v1:';
export type ReviewDecision='revisar'|'observaciones'|'sin-observaciones';
export type ReviewSnapshot={
 sign:-1|0|1;magnitude:number|null;importance:number|null;
 reason:string;evidence:string;factorName:string;actionName:string;
};
export type ReviewEntry={
 id:string;projectId:string;key:string;factorId:string;actionId:string;
 reviewer:string;decision:ReviewDecision;comment:string;recordedAt:string;
 snapshot:ReviewSnapshot;
};
export type ReviewLedger={
 schema:typeof LEOPOLD_LEDGER_SCHEMA;projectId:string;entries:ReviewEntry[];
};
const isText=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;
const isScore=(v:unknown)=>v===null||(Number.isInteger(v)&&Number(v)>=1&&Number(v)<=10);
const isSnapshot=(x:unknown):x is ReviewSnapshot=>{
 if(!x||typeof x!=='object')return false;
 const a=x as Partial<ReviewSnapshot>;
 return (a.sign===-1||a.sign===0||a.sign===1)&&isScore(a.magnitude)&&
  isScore(a.importance)&&isText(a.reason,5000)&&isText(a.evidence,1000)&&
  isText(a.factorName,350)&&isText(a.actionName,350);
};
export const emptyReviewLedger=(projectId:string):ReviewLedger=>({
 schema:LEOPOLD_LEDGER_SCHEMA,projectId,entries:[]
});
export function isReviewLedger(raw:unknown,projectId:string):raw is ReviewLedger{
 if(!raw||typeof raw!=='object')return false;
 const x=raw as Partial<ReviewLedger>;
 if(x.schema!==LEOPOLD_LEDGER_SCHEMA||x.projectId!==projectId||
  !Array.isArray(x.entries)||x.entries.length>5000)return false;
 const ids=new Set<string>();
 for(const entry of x.entries){
  if(!entry||typeof entry!=='object'||!isText(entry.id,150)||!entry.id||
   ids.has(entry.id)||entry.projectId!==projectId||
   !isText(entry.key,210)||!isText(entry.factorId,100)||!isText(entry.actionId,100)||
   entry.key!==entry.factorId+'::'+entry.actionId||
   !isText(entry.reviewer,160)||!entry.reviewer.trim()||
   !isText(entry.comment,3000)||!entry.comment.trim()||
   !['revisar','observaciones','sin-observaciones'].includes(entry.decision)||
   !isText(entry.recordedAt,80)||!Number.isFinite(Date.parse(entry.recordedAt))||
   !isSnapshot(entry.snapshot))return false;
  ids.add(entry.id);
 }
 return true;
}
export function snapshotReview(
 item:LeopoldReviewCell, factorName:string,actionName:string
):ReviewSnapshot{
 return {
  sign:item.sign,magnitude:item.magnitude,importance:item.importance,
  reason:item.reason??'',evidence:item.evidence??'',factorName,actionName
 };
}
export function reviewCurrency(
 item:ReviewEntry,cell:LeopoldReviewCell|undefined,
 factorName:string|undefined,actionName:string|undefined
):'vigente'|'modificada'|'eliminada'{
 if(!cell||factorName===undefined||actionName===undefined)return 'eliminada';
 const now=snapshotReview(cell,factorName,actionName);
 return JSON.stringify(item.snapshot)===JSON.stringify(now)?'vigente':'modificada';
}
export function appendReview(ledger:ReviewLedger,entry:ReviewEntry):ReviewLedger{
 if(!isReviewLedger(ledger,ledger.projectId))throw Error('Registro de revisiones inválido');
 if(entry.projectId!==ledger.projectId||ledger.entries.some(x=>x.id===entry.id)||
  !isReviewLedger({...ledger,entries:[entry]},ledger.projectId))
  throw Error('Entrada de revisión inválida o duplicada');
 if(ledger.entries.length>=5000)throw Error('Límite de 5000 revisiones');
 return {...ledger,entries:[...ledger.entries,entry]};
}
