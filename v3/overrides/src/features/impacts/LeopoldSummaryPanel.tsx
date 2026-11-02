import {summarizeLeopold,type LeopoldAxis,type LeopoldInteraction,type LeopoldSlice} from './LeopoldAnalytics';
import './LeopoldSummaryPanel.css';

type NamedAxis=LeopoldAxis & {name:string};
type Props={
 projectId:string;
 actions:readonly NamedAxis[];
 factors:readonly NamedAxis[];
 visibleFactors:readonly NamedAxis[];
 cells:Readonly<Record<string,LeopoldInteraction>>;
};
const hasScore=(x:LeopoldSlice)=>x.evaluated>0;
const value=(x:LeopoldSlice)=>hasScore(x)?String(x.signedSum):'—';
const escaped=(x:unknown)=>{
 // Only user-authored strings are formula-injection risks: preserve computed negative numbers.
 if(typeof x==='number'&&Number.isFinite(x))return '"'+String(x)+'"';
 const raw=String(x??'');
 const safe=/^\s*[=+\-@\t\r]/.test(raw)?"'"+raw:raw;
 return '"'+safe.replaceAll('"','""')+'"';
};
export function LeopoldSummaryPanel({projectId,actions,factors,visibleFactors,cells}:Props){
 const all=summarizeLeopold(factors,actions,cells);
 const visible=summarizeLeopold(visibleFactors,actions,cells);
 const downloadCsv=()=>{
  const rows:(string|number)[][]=[['Eje','Elemento','Afectaciones positivas completas',
   'Afectaciones negativas completas','Valoraciones completas','Pendientes de valoración',
   'Sin interacción declarada','No evaluadas','Agregado con signo sin peso']];
  for(const f of factors){
   const x=all.byFactor[f.id];
   rows.push(['Factor',f.name,x.positive,x.negative,x.evaluated,x.pending,x.none,x.unassessed,
    hasScore(x)?x.signedSum:'']);
  }
  for(const a of actions){
   const x=all.byAction[a.id];
   rows.push(['Acción',a.name,x.positive,x.negative,x.evaluated,x.pending,x.none,x.unassessed,
    hasScore(x)?x.signedSum:'']);
  }
  const x=all.total;
  rows.push(['Todos','Agregado descriptivo',x.positive,x.negative,x.evaluated,x.pending,
   x.none,x.unassessed,hasScore(x)?x.signedSum:'']);
  const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(escaped).join(';')).join('\r\n')],
   {type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;
  link.download='AMBIENTA-Leopold-resumen-'+projectId+'.csv';
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
 };
 const renderRows=(items:readonly NamedAxis[],kind:'factor'|'action')=>items.map(axis=>{
  const x=kind==='factor'?all.byFactor[axis.id]:visible.byAction[axis.id];
  return <tr key={axis.id} data-leopold-axis={kind} data-leopold-id={axis.id}>
   <th scope="row">{axis.name}</th>
   <td data-leopold-positive>{x.positive}</td><td data-leopold-negative>{x.negative}</td>
   <td data-leopold-evaluated>{x.evaluated}</td><td data-leopold-pending>{x.pending}</td>
   <td data-leopold-unassessed>{x.unassessed}</td>
   <td data-leopold-sum>{value(x)}</td>
  </tr>;
 });
 return <section className="amb-leopold-analysis" aria-label="Agregados de Leopold" data-leopold-summary>
  <div className="amb-leopold-analysis-head">
   <div><p className="amb-matrix-overline">REPRODUCCIÓN DIDÁCTICA · LEOPOLD</p>
    <h4>Agregados por factor y por acción</h4>
    <p>Conteos y productos de magnitud con signo × importancia, <strong>sin pesos</strong>.
     Una celda pendiente o no evaluada nunca se suma como cero.</p></div>
   <button type="button" data-leopold-export="csv" onClick={downloadCsv}>Exportar resumen CSV</button>
  </div>
  <div className="amb-leopold-overview">
   <span><strong data-leopold-total-positive>{all.total.positive}</strong><small>positivas completas</small></span>
   <span><strong data-leopold-total-negative>{all.total.negative}</strong><small>negativas completas</small></span>
   <span><strong data-leopold-total-pending>{all.total.pending}</strong><small>pendientes</small></span>
   <span><strong data-leopold-total-unassessed>{all.total.unassessed}</strong><small>sin evaluar</small></span>
   <span><strong data-leopold-total-sum>{value(all.total)}</strong><small>agregado con signo</small></span>
  </div>
  <p className="amb-leopold-caveat" role="note">
   El agregado es descriptivo: <strong>no demuestra un saldo ambiental favorable ni autoriza compensar
   perjuicios en agua o biodiversidad con beneficios en empleo.</strong> No existen umbrales de clasificación
   universalmente certificados en esta vista. Los valores iniciales del expediente no son una evaluación de campo.
  </p>
  <div className="amb-leopold-analysis-grid">
   <div className="amb-leopold-table-wrap">
    <h5>Resultados por factor ambiental</h5>
    <div className="amb-leopold-table-scroll" tabIndex={0} role="region" aria-label="Totales por factor">
     <table><thead><tr><th>Factor</th><th>+</th><th>−</th><th>Valoradas</th><th>Pend.</th><th>Sin eval.</th><th>Σ sin peso</th></tr></thead>
      <tbody>{renderRows(factors,'factor')}</tbody>
     </table>
    </div>
   </div>
   <div className="amb-leopold-table-wrap">
    <h5>Resultados por acción del proyecto</h5>
    <div className="amb-leopold-table-scroll" tabIndex={0} role="region" aria-label="Totales por acción">
     <table><thead><tr><th>Acción</th><th>+</th><th>−</th><th>Valoradas</th><th>Pend.</th><th>Sin eval.</th><th>Σ sin peso</th></tr></thead>
      <tbody>{renderRows(actions,'action')}</tbody>
     </table>
    </div>
   </div>
  </div>
  {visibleFactors.length!==factors.length&&<p className="amb-leopold-filter-note">
   El filtro de la matriz muestra solo {visibleFactors.length} factores; los agregados
   por factor y el resumen general corresponden al catálogo completo.
   La tabla por acción refleja exclusivamente los factores visibles.
  </p>}
 </section>;
}
