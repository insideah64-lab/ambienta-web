import {useMemo,useState} from 'react';
import {scanLeopoldHighlights,type LeopoldReviewAxis,type LeopoldReviewCell,type LeopoldReviewRule} from './LeopoldReview';
import './LeopoldReviewPanel.css';

type Props={
 factors:readonly LeopoldReviewAxis[];
 actions:readonly LeopoldReviewAxis[];
 cells:Readonly<Record<string,LeopoldReviewCell>>;
 onReviewCell:(key:string)=>void;
};
const scale=Array.from({length:10},(_,i)=>i+1);

export function LeopoldReviewPanel({factors,actions,cells,onReviewCell}:Props){
 const [minMagnitude,setMinMagnitude]=useState(8);
 const [minImportance,setMinImportance]=useState(8);
 const [logic,setLogic]=useState<LeopoldReviewRule['logic']>('either');
 const report=useMemo(()=>scanLeopoldHighlights(factors,actions,cells,{
  minMagnitude,minImportance,logic
 }),[factors,actions,cells,minMagnitude,minImportance,logic]);
 const countUnjustified=report.hits.filter(h=>!h.hasReason||!h.hasEvidence).length;
 return <section className="amb-leopold-review" data-leopold-review aria-label="Revisión exploratoria de interacciones destacadas">
  <div className="amb-leopold-review-head">
   <div><p className="amb-matrix-overline">LEOPOLD · LECTURA CUALITATIVA</p>
    <h4>Interacciones que merecen discusión técnica</h4>
    <p>Detectá celdas con calificaciones elevadas, incluso cuando quedan aisladas de otras valoraciones.
     Las calificaciones se mantienen independientes: <strong>no se calcula un índice combinado</strong>.</p>
   </div>
  </div>
  <div className="amb-leopold-review-settings" role="group" aria-label="Criterios exploratorios de revisión">
   <label>Magnitud desde
    <select data-leopold-review-magnitude aria-label="Magnitud mínima exploratoria" value={minMagnitude}
     onChange={e=>setMinMagnitude(Number(e.target.value))}>
     {scale.map(n=><option key={n} value={n}>{n}</option>)}
    </select>
   </label>
   <label>Importancia desde
    <select data-leopold-review-importance aria-label="Importancia mínima exploratoria" value={minImportance}
     onChange={e=>setMinImportance(Number(e.target.value))}>
     {scale.map(n=><option key={n} value={n}>{n}</option>)}
    </select>
   </label>
   <label>Condición
    <select data-leopold-review-logic aria-label="Condición de revisión" value={logic}
     onChange={e=>setLogic(e.target.value as LeopoldReviewRule['logic'])}>
     <option value="either">Magnitud O importancia</option>
     <option value="both">Magnitud E importancia</option>
    </select>
   </label>
  </div>
  <p className="amb-leopold-review-disclaimer" role="note">
   <strong>Los valores 8/8 son un ejemplo editable, no umbrales de Leopold, Conesa ni de la legislación argentina.</strong>
   Esta búsqueda ayuda a organizar la discusión del equipo evaluador; no decide automáticamente
   qué impacto es significativo. Una celda omitida aquí puede seguir siendo relevante.
   Los cambios de estos controles no se guardan ni alteran las valoraciones.
  </p>
  <div className="amb-leopold-review-stats">
   <span><strong data-leopold-review-count>{report.hits.length}</strong><small>celdas a revisar</small></span>
   <span><strong data-leopold-review-adverse>{report.hits.filter(h=>h.sign===-1).length}</strong><small>adversas destacadas</small></span>
   <span><strong data-leopold-review-unjustified>{countUnjustified}</strong><small>sin fundamento o evidencia</small></span>
   <span><strong data-leopold-review-excluded>{report.pending+report.unassessed}</strong><small>pendientes o no evaluadas (fuera del análisis)</small></span>
  </div>
  {report.hits.length===0
   ?<p className="amb-leopold-review-empty">Ninguna celda completamente valorada cumple estos criterios.
     Esto <strong>no</strong> significa que el proyecto carezca de impactos relevantes.</p>
   :<>
    <div className="amb-leopold-review-axis">
     <div><h5>Factores con interacciones destacadas</h5>
      <ul data-leopold-review-factors>{factors.filter(f=>report.byFactor[f.id]).map(f=>
       <li key={f.id}>{f.name} <strong>{report.byFactor[f.id]}</strong></li>)}</ul>
     </div>
     <div><h5>Acciones con interacciones destacadas</h5>
      <ul data-leopold-review-actions>{actions.filter(a=>report.byAction[a.id]).map(a=>
       <li key={a.id}>{a.name} <strong>{report.byAction[a.id]}</strong></li>)}</ul>
     </div>
    </div>
    <div className="amb-leopold-review-table-scroll" role="region" tabIndex={0}
     aria-label="Interacciones destacadas, tabla desplazable">
     <table><thead><tr><th>Factor × acción</th><th>Signo</th><th>M</th><th>I</th>
      <th>Revisión documental</th><th>Inspección</th></tr></thead>
      <tbody>{report.hits.map(hit=><tr key={hit.key} data-leopold-review-hit={hit.key}>
       <th scope="row"><strong>{hit.factorName}</strong><small>{hit.actionName}</small>
        {(hit.soleCompletedForFactor||hit.soleCompletedForAction)&&
         <em>Valoración aislada {hit.soleCompletedForFactor?'en este factor':''}
          {hit.soleCompletedForFactor&&hit.soleCompletedForAction?' y ':''}
          {hit.soleCompletedForAction?'en esta acción':''}</em>}
       </th>
       <td>{hit.sign===-1?'Adverso':'Beneficioso'}</td>
       <td>{hit.magnitude}</td><td>{hit.importance}</td>
       <td>{hit.hasReason?'Fundamento':'Falta fundamento'} · {hit.hasEvidence?'Evidencia':'Falta evidencia'}</td>
       <td><button type="button" data-leopold-review-open={hit.key}
        onClick={()=>onReviewCell(hit.key)}
        aria-label={'Revisar '+hit.factorName+' por '+hit.actionName}>Revisar celda</button></td>
      </tr>)}</tbody>
     </table>
    </div>
   </>}
  <p className="amb-leopold-review-footer">Referencia: Conesa Fernández-Vítora (1997), §6.2.1.1,
   pp. impresas 60–61. La identificación de filas, columnas y celdas destacadas exige
   interpretación profesional, referencia documental y discusión de alternativas; no
   determina cumplimiento ambiental ni compensación entre factores.</p>
 </section>;
}
