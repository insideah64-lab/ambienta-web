/** Presentation states only. Does not calculate or change Leopold scores. */
type WorkflowCell={sign:-1|0|1;magnitude:number|null;importance:number|null;reason:string;evidence:string};
export function leopoldReadiness(cell:WorkflowCell|undefined){
 const scored=!!cell&&cell.sign!==0&&cell.magnitude!==null&&cell.importance!==null;
 return {scored,documented:scored&&!!cell.reason.trim()&&!!cell.evidence.trim()};
}
export function nextLeopoldCell(keys:readonly string[],cells:Readonly<Record<string,WorkflowCell>>,
 selected:string|null,kind:'valuation'|'documentation'):string|null{
 const start=selected?keys.indexOf(selected):-1;
 for(let offset=1;offset<=keys.length;offset++){
  const key=keys[(start+offset)%keys.length],cell=cells[key],state=leopoldReadiness(cell);
  if(kind==='documentation'?state.scored&&!state.documented:(!cell||(cell.sign!==0&&!state.scored)))return key;
 }
 return null;
}
