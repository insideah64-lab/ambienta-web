import {useEffect,useMemo,useState} from 'react';
import type {LeopoldReviewCell,LeopoldReviewAxis} from './LeopoldReview';
import {LEDGER_STORE,appendReview,emptyReviewLedger,isReviewLedger,reviewCurrency,snapshotReview,
 type ReviewLedger,type ReviewDecision} from './LeopoldReviewLedger';
import './LeopoldReviewLedgerPanel.css';

type Props={
 projectId:string;selectedKey:string|null;
 actions:readonly LeopoldReviewAxis[];factors:readonly LeopoldReviewAxis[];
 cells:Readonly<Record<string,LeopoldReviewCell>>;
};
type LedgerState={ledger:ReviewLedger;corruptRaw:string|null;storageError:boolean};
function loadLedger(projectId:string):LedgerState{
 const blank=emptyReviewLedger(projectId);
 try{
  const raw=localStorage.getItem(LEDGER_STORE+projectId);
  if(raw===null)return {ledger:blank,corruptRaw:null,storageError:false};
  try{
   const parsed:unknown=JSON.parse(raw);
   if(isReviewLedger(parsed,projectId))return {ledger:parsed,corruptRaw:null,storageError:false};
  }catch{/* Original content must remain recoverable. */}
  return {ledger:blank,corruptRaw:raw,storageError:false};
 }catch{
  return {ledger:blank,corruptRaw:null,storageError:true};
 }
}
function exportText(filename:string,content:string){
 const url=URL.createObjectURL(new Blob([content],{type:'application/json;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=filename;
 document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
export function LeopoldReviewLedgerPanel({projectId,selectedKey,actions,factors,cells}:Props){
 const [state,setState]=useState<LedgerState>(()=>loadLedger(projectId));
 const [reviewer,setReviewer]=useState('');
 const [decision,setDecision]=useState<ReviewDecision>('revisar');
 const [comment,setComment]=useState('');
 const [notice,setNotice]=useState('');
 useEffect(()=>{setState(loadLedger(projectId));setReviewer('');setComment('');setDecision('revisar');setNotice('');},[projectId]);
 const actionNames=useMemo(()=>new Map(actions.map(a=>[a.id,a.name])),[actions]);
 const factorNames=useMemo(()=>new Map(factors.map(f=>[f.id,f.name])),[factors]);
 const selected=useMemo(()=>{
  if(!selectedKey)return null;
  const [fid,aid]=selectedKey.split('::');
  const cell=cells[selectedKey],factorName=factorNames.get(fid),actionName=actionNames.get(aid);
  return cell&&factorName!==undefined&&actionName!==undefined
   ? {cell,fid,aid,factorName,actionName}:null;
 },[selectedKey,cells,factorNames,actionNames]);
 const entries=state.ledger.entries;
 const stale=entries.filter(e=>reviewCurrency(e,cells[e.key],
  factorNames.get(e.factorId),actionNames.get(e.actionId))!=='vigente').length;
 const onRecord=()=>{
  if(!selectedKey||!selected||!reviewer.trim()||!comment.trim()||
   state.corruptRaw!==null||state.storageError)return;
  // Re-read to avoid clobbering a separate tab; never overwrite corrupt data.
  const current=loadLedger(projectId);
  if(current.corruptRaw!==null||current.storageError){
   setState(current);setNotice('Registro no disponible: respaldá el contenido anterior antes de continuar.');
   return;
  }
  const record={
   id:(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'
    ?crypto.randomUUID():'review-'+Date.now()+'-'+Math.random().toString(36).slice(2)),
   projectId,key:selectedKey,factorId:selected.fid,actionId:selected.aid,
   reviewer:reviewer.trim().slice(0,160),decision,comment:comment.trim().slice(0,3000),
   recordedAt:new Date().toISOString(),snapshot:snapshotReview(
    selected.cell,selected.factorName,selected.actionName)
  };
  try{
   const next=appendReview(current.ledger,record);
   localStorage.setItem(LEDGER_STORE+projectId,JSON.stringify(next));
   setState({ledger:next,corruptRaw:null,storageError:false});setComment('');
   setNotice('Revisión registrada en este navegador, separada de la matriz original.');
  }catch{
   setNotice('No se pudo guardar la revisión. No se modificaron las valoraciones originales.');
  }
 };
 const exportLedger=()=>exportText('AMBIENTA-Leopold-revisiones-'+projectId+'.json',
  JSON.stringify(state.ledger,null,2));
 const exportCorrupt=()=>{if(state.corruptRaw!==null)exportText(
  'AMBIENTA-Leopold-revisiones-original-'+projectId+'.txt',state.corruptRaw);};
 return <section className="amb-leopold-ledger" data-leopold-ledger aria-label="Registro técnico independiente de Leopold">
  <div className="amb-leopold-ledger-head">
   <div><p className="amb-matrix-overline">LEOPOLD QA5 · TRAZABILIDAD LOCAL</p>
    <h4>Registro de revisión técnica</h4>
    <p>Guardá decisiones argumentadas y una copia de los valores M/I observados
     en cada revisión. Si cambia la celda, la anotación anterior aparecerá como desactualizada.</p>
   </div>
   <button type="button" onClick={exportLedger} disabled={state.corruptRaw!==null}
    data-leopold-ledger-export>Exportar registro JSON</button>
  </div>
  <div className="amb-leopold-ledger-metrics">
   <span><strong data-leopold-ledger-count>{entries.length}</strong><small>revisiones guardadas</small></span>
   <span><strong data-leopold-ledger-stale>{stale}</strong><small>revisiones que requieren actualización</small></span>
  </div>
  <p className="amb-leopold-ledger-warning" role="note">Historial local del navegador, <strong>no certificado, firmado ni inalterable</strong>.
   La hora depende del dispositivo. Cada entrada se añade sin cambiar la evaluación y no certifica
   cumplimiento legal ni la idoneidad ambiental del proyecto. Exportá el JSON para conservar una copia.</p>
  {state.corruptRaw!==null&&<p className="amb-leopold-ledger-alert" role="alert">
   Existe un registro previo que no supera la validación. Se mantiene intacto: el guardado está bloqueado.
   <button type="button" onClick={exportCorrupt}>Descargar contenido original sin modificar</button>
  </p>}
  {state.storageError&&<p className="amb-leopold-ledger-alert" role="alert">
   Este navegador no permite leer el almacenamiento local. No se pueden registrar decisiones.
  </p>}
  <div className="amb-leopold-ledger-form">
   <h5>Registrar nueva revisión</h5>
   {selected?<p data-leopold-ledger-selection>
    <strong>{selected.factorName}</strong> × {selected.actionName} ·
    {selected.cell.sign===-1?' adverso':selected.cell.sign===1?' beneficioso':' sin interacción'} ·
    M: {selected.cell.magnitude??'pendiente'} · I: {selected.cell.importance??'pendiente'}
   </p>:<p>Seleccioná una interacción registrada en la matriz para documentar una revisión.</p>}
   <div className="amb-leopold-ledger-fields">
    <label>Responsable de la revisión
     <input value={reviewer} onChange={e=>setReviewer(e.target.value)} maxLength={160}
      aria-label="Responsable de revisión Leopold" placeholder="Nombre o identificación del evaluador"/>
    </label>
    <label>Conclusión documental
     <select value={decision} onChange={e=>setDecision(e.target.value as ReviewDecision)}
      aria-label="Conclusión de revisión Leopold">
      <option value="revisar">Requiere revisión adicional</option>
      <option value="observaciones">Revisada con observaciones</option>
      <option value="sin-observaciones">Revisada sin observaciones documentales</option>
     </select>
    </label>
   </div>
   <label>Motivo y fundamentos de la revisión
    <textarea rows={3} maxLength={3000} value={comment} onChange={e=>setComment(e.target.value)}
     aria-label="Fundamento de revisión Leopold"
     placeholder="Indicar criterios, evidencia, límites y pasos siguientes…"/>
   </label>
   <button type="button" data-leopold-ledger-save onClick={onRecord}
    disabled={!selected||!reviewer.trim()||!comment.trim()||state.corruptRaw!==null||state.storageError}>
    Guardar revisión sin alterar M/I
   </button>
  </div>
  {notice&&<p role="status">{notice}</p>}
  <div className="amb-leopold-ledger-history">
   <h5>Historial por expediente</h5>
   {entries.length===0?<p>No hay revisiones documentales registradas.</p>
    :<div className="amb-leopold-ledger-scroll" tabIndex={0} role="region" aria-label="Historial de revisiones Leopold">
     {entries.slice(-100).reverse().map(e=>{
      const currency=reviewCurrency(e,cells[e.key],factorNames.get(e.factorId),actionNames.get(e.actionId));
      return <article key={e.id} data-leopold-ledger-entry>
       <div className="amb-leopold-ledger-entry-top">
        <strong>{e.snapshot.factorName} × {e.snapshot.actionName}</strong>
        <span data-leopold-ledger-currency={currency}>
         {currency==='vigente'?'Valores vigentes':currency==='modificada'?'Valoración modificada':'Interacción eliminada'}
        </span>
       </div>
       <p>{e.reviewer} · {e.recordedAt} · {e.decision==='revisar'?'Requiere revisión':
        e.decision==='observaciones'?'Con observaciones':'Sin observaciones documentales'}</p>
       <p>M {e.snapshot.magnitude??'—'} · I {e.snapshot.importance??'—'} ·
        {e.snapshot.sign===-1?' adverso':e.snapshot.sign===1?' beneficioso':' sin interacción'}</p>
       <p>{e.comment}</p>
      </article>;
     })}
     {entries.length>100&&<p>Se muestran las 100 anotaciones recientes.
      El archivo JSON exporta las {entries.length} revisiones.</p>}
    </div>}
  </div>
 </section>;
}
