import {summarizeLeopold,possibleLeopoldDuplicateNames,type LeopoldAxis,type LeopoldInteraction,type LeopoldSlice} from './LeopoldAnalytics';
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
 const duplicateFactors=possibleLeopoldDuplicateNames(factors);
 const duplicateActions=possibleLeopoldDuplicateNames(actions);
 const downloadCsv=()=>{
  const rows:(string|number)[][]=[['Eje','Elemento','Afectaciones positivas completas',
   'Afectaciones negativas completas','Valoraciones completas','Pendientes de valoración',
   'Sin interacción declarada','No evaluadas','Productos beneficiosos (auxiliar)','Productos adversos absolutos (auxiliar)','Σ productos con signo (auxiliar)']];
  for(const f of factors){
   const x=all.byFactor[f.id];
   rows.push(['Factor',f.name,x.positive,x.negative,x.evaluated,x.pending,x.none,x.unassessed,
    hasScore(x)?x.beneficialProducts:'',hasScore(x)?x.adverseProducts:'',hasScore(x)?x.signedSum:'']);
  }
  for(const a of actions){
   const x=all.byAction[a.id];
   rows.push(['Acción',a.name,x.positive,x.negative,x.evaluated,x.pending,x.none,x.unassessed,
    hasScore(x)?x.signedSum:'']);
  }
  const x=all.total;
  rows.push(['Todos','Agregado descriptivo',x.positive,x.negative,x.evaluated,x.pending,
   x.none,x.unassessed,hasScore(x)?x.beneficialProducts:'',
   hasScore(x)?x.adverseProducts:'',hasScore(x)?x.signedSum:'']);
  const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(escaped).join(';')).join('\r\n')],
   {type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;
  link.download='AMBIENTA-Leopold-resumen-'+projectId+'.csv';
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
 };
 const renderRows=(items:readonly NamedAxis[],kind:'factor'|'action')=>items.map(axis=>{
  const x=kind==='factor'?all.byFactor[axis.id]:all.byAction[axis.id];
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
     La multiplicación y sus sumas reproducen una planilla didáctica, <strong>no son una regla universal de Leopold establecida por Conesa</strong>.
     Una celda pendiente o no evaluada nunca se suma como cero.</p></div>
   <button type="button" data-leopold-export="csv" onClick={downloadCsv}>Exportar resumen CSV</button>
  </div>
  <div className="amb-leopold-overview">
   <span><strong data-leopold-total-positive>{all.total.positive}</strong><small>positivas completas</small></span>
   <span><strong data-leopold-total-negative>{all.total.negative}</strong><small>negativas completas</small></span>
   <span><strong data-leopold-total-pending>{all.total.pending}</strong><small>pendientes</small></span>
   <span><strong data-leopold-total-unassessed>{all.total.unassessed}</strong><small>sin evaluar</small></span>
   <span><strong data-leopold-total-sum>{value(all.total)}</strong><small>Σ M×I con signo · auxiliar</small></span>
   <span><strong data-leopold-positive-products>{value(all.total.evaluated?{...all.total,signedSum:all.total.beneficialProducts}:all.total)}</strong><small>productos beneficiosos · auxiliar</small></span>
   <span><strong data-leopold-negative-products>{value(all.total.evaluated?{...all.total,signedSum:all.total.adverseProducts}:all.total)}</strong><small>productos adversos absolutos · auxiliar</small></span>
  </div>
  <p className="amb-leopold-caveat" role="note">
   El agregado algebraico es un resumen <strong>auxiliar de la planilla didáctica</strong>, no una fórmula de aprobación ambiental definida por el texto de Conesa: <strong>no demuestra un saldo ambiental favorable ni autoriza compensar
   perjuicios en agua o biodiversidad con beneficios en empleo.</strong> No existen umbrales de clasificación
   universalmente certificados en esta vista. Los valores iniciales del expediente no son una evaluación de campo.
  </p>
  {(duplicateFactors.length>0||duplicateActions.length>0)&&<div className="amb-leopold-caveat" data-leopold-possible-duplicates role="note">
   <strong>Posibles duplicaciones para revisión:</strong> coincidencias en nombres del catálogo.
   {duplicateActions.length>0&&<span> Acciones: {duplicateActions.join('; ')}.</span>}
   {duplicateFactors.length>0&&<span> Factores: {duplicateFactors.join('; ')}.</span>}
   Coincidir en el nombre no prueba que el impacto se duplicó; verificá los alcances y no sumes dos veces el mismo efecto.
  </div>}
  <div className="amb-leopold-analysis-grid">
   <div className="amb-leopold-table-wrap">
    <h5>Resultados por factor ambiental</h5>
    <div className="amb-leopold-table-scroll" tabIndex={0} role="region" aria-label="Totales por factor">
     <table><thead><tr><th>Factor</th><th>+</th><th>−</th><th>Valoradas</th><th>Pend.</th><th>Sin eval.</th><th>Σ M×I auxiliar</th></tr></thead>
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
   El filtro visual muestra solo {visibleFactors.length} factores; <strong>ambas tablas y el resumen general</strong>
   siguen calculados sobre el catálogo completo. Filtrar no modifica los resultados.
  </p>}
 </section>;
}
