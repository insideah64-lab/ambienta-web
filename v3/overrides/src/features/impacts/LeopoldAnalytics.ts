/**
 * Reproducible signed Leopold aggregates.
 * Basis: the 10-factor × 5-action teaching workbook "Matriz-de-Leopold.xlsx"
 * provided for review on 2026-11-02, sheet B. A product is counted ONLY
 * when both the magnitude and importance are entered. Sign=0 is an explicit
 * declaration of no interaction and is not equal to an unassessed cell.
 *
 * These algebraic totals summarize scored interactions; they NEVER establish
 * net environmental acceptability, environmental compliance or offsetting.
 * Factor weights from the experimental view are deliberately excluded.
 */
export type LeopoldInteraction = {
 sign:-1|0|1;
 magnitude:number|null;
 importance:number|null;
};
export type LeopoldAxis={id:string};
export type LeopoldSlice={
 positive:number;
 negative:number;
 beneficialProducts:number;
 adverseProducts:number;
 evaluated:number;
 pending:number;
 none:number;
 unassessed:number;
 signedSum:number;
};
export type LeopoldSummary={
 total:LeopoldSlice;
 byFactor:Record<string,LeopoldSlice>;
 byAction:Record<string,LeopoldSlice>;
};
const fresh=():LeopoldSlice=>({positive:0,negative:0,beneficialProducts:0,adverseProducts:0,evaluated:0,pending:0,none:0,unassessed:0,signedSum:0});
function accumulate(target:LeopoldSlice,item:LeopoldInteraction|undefined){
 if(!item){target.unassessed++;return;}
 if(item.sign===0){target.none++;return;}
 // A recorded sign without a complete score is pending, not a zero.
 if(!Number.isInteger(item.magnitude)||!Number.isInteger(item.importance)||
  item.magnitude===null||item.importance===null||
  item.magnitude<1||item.magnitude>10||item.importance<1||item.importance>10){
  target.pending++;return;
 }
 target.evaluated++;
 const product=item.magnitude*item.importance;
 if(item.sign===1){target.positive++;target.beneficialProducts+=product;}
 else{target.negative++;target.adverseProducts+=product;}
 target.signedSum+=item.sign*product;
}
export function summarizeLeopold(
 factors:readonly LeopoldAxis[],actions:readonly LeopoldAxis[],
 cells:Readonly<Record<string,LeopoldInteraction>>
):LeopoldSummary{
 const byFactor:Record<string,LeopoldSlice>={},byAction:Record<string,LeopoldSlice>={};
 const total=fresh();
 for(const factor of factors)byFactor[factor.id]=fresh();
 for(const action of actions)byAction[action.id]=fresh();
 for(const factor of factors)for(const action of actions){
  const item=cells[factor.id+'::'+action.id];
  accumulate(byFactor[factor.id],item);
  accumulate(byAction[action.id],item);
  accumulate(total,item);
 }
 return {total,byFactor,byAction};
}

/** Name collisions merit review, but are not proof of duplicate environmental effects. */
export function possibleLeopoldDuplicateNames(items:readonly {name:string}[]):string[]{
 const seen=new Set<string>(),repeated=new Map<string,string>();
 for(const item of items){
  const label=item.name.trim().replace(/\\s+/g,' ');
  const id=label.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLocaleLowerCase('es');
  if(!id)continue;
  if(seen.has(id))repeated.set(id,label);
  seen.add(id);
 }
 return [...repeated.values()];
}
