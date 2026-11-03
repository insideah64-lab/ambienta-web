/**
 * Visualización F3 basada en el contrato de comparación de dos observaciones de Lumen UI.
 * React nativo de compatibilidad: AMBIENTA no instala @santi020k/lumen-react aún.
 * Solo muestra pares CA validables; la tabla semántica conserva números y procedencia.
 */
import type {CSSProperties} from 'react';
import './ConesaF3Comparison.css';
import type {F2Factor} from './ConesaF2Model';
import type {F3FactorRecord,F3Quality} from './ConesaF3Model';

export type F3ComparisonRow={
 factor:F2Factor;record:F3FactorRecord|undefined;result:F3Quality|null;issues:string[];
 methodDescription?:string;methodSource?:string
};
type Props={rows:readonly F3ComparisonRow[]};
const format=(v:number)=>v.toFixed(4);
const signed=(v:number)=>(v>0?'+':'')+format(v);
export function ConesaF3Comparison({rows}:Props){
 const valid=rows.filter((row):row is F3ComparisonRow&{record:F3FactorRecord;result:F3Quality}=>Boolean(row.record&&row.result));
 const incomplete=rows.filter(row=>row.record&&!row.result).length;
 return <section className="amb-f3-quality" data-f3-visual="pair" aria-label="Comparación de calidad ambiental F3">
  <header className="amb-f3-quality-head">
   <div>
    <p className="amb-f3-quality-eyebrow">LECTURA COMPARATIVA · CA 0–1</p>
    <h4>Calidad ambiental SIN y CON proyecto</h4>
    <p>Comparación por factor con la misma escala normalizada. No es una suma de impactos
     ni una clasificación de gravedad: cada valor proviene de la función declarada en ese factor.</p>
   </div>
   <span className="amb-f3-quality-count">{valid.length} de {rows.length} factores calculables</span>
  </header>
  {valid.length===0?
   <div className="amb-f3-quality-empty" data-f3-visual-empty role="status">
    <strong>Sin comparaciones cuantitativas todavía</strong>
    <p>Elegí un factor, completá ambos escenarios y justificá su función de transformación.
     Hasta entonces no se dibujan valores ni barras ficticias.</p>
   </div>:
   <>
    <div className="amb-f3-quality-legend" aria-label="Referencias de la visualización">
     <span><i className="amb-f3-dot amb-f3-dot-before"/> SIN proyecto</span>
     <span><i className="amb-f3-dot amb-f3-dot-after"/> CON proyecto</span>
     <span><i className="amb-f3-quality-link-key"/> Distancia entre escenarios</span>
    </div>
    <div className="amb-f3-quality-graph" aria-hidden="true">
     <div className="amb-f3-quality-axis">
      <span aria-hidden="true"/>
      <div className="amb-f3-quality-ticks"><span>0</span><span>0,25</span><span>0,50</span><span>0,75</span><span>1</span></div>
      <span aria-hidden="true"/>
     </div>
     {valid.map(({factor,record,result})=>{
      const before=100*result.without,after=100*result.withProject;
      const style={
       '--f3-before':before+'%','--f3-after':after+'%',
       '--f3-connector-start':Math.min(before,after)+'%',
       '--f3-connector-width':Math.abs(after-before)+'%'
      } as CSSProperties;
      return <div key={factor.id} className="amb-f3-quality-row" data-f3-chart-row={factor.id}>
       <div className="amb-f3-quality-name">
        <strong>{factor.name}</strong>
        <small>{record.indicator}</small>
        <small className="amb-f3-quality-kind">SIN {record.without.kind==='medido'?'medido':'estimado'} · CON {record.withProject.kind==='medido'?'medido':'estimado'}</small>
       </div>
       <div className="amb-f3-quality-track" style={style}>
        <span className="amb-f3-quality-connector"/>
        <i className="amb-f3-quality-marker amb-f3-quality-marker-before"/>
        <i className="amb-f3-quality-marker amb-f3-quality-marker-after"/>
       </div>
       <strong className="amb-f3-quality-delta">{signed(result.delta)}</strong>
      </div>;
     })}
    </div>
    <details className="amb-f3-quality-disclosure">
     <summary>Consultar tabla de valores exactos y procedencia</summary>
     <div className="amb-f3-quality-table-wrap">
      <table>
       <caption>Escenarios y diferencias de calidad ambiental por factor, datos declarados en F3a</caption>
       <thead><tr>
        <th scope="col">Factor e indicador</th>
        <th scope="col">CA SIN</th>
        <th scope="col">CA CON</th>
        <th scope="col">ΔCA</th>
        <th scope="col">Referencia SIN</th>
        <th scope="col">Referencia CON</th>
        <th scope="col">Función</th>
       </tr></thead>
       <tbody>{valid.map(({factor,record,result,methodDescription,methodSource})=><tr key={factor.id}>
        <th scope="row">{factor.name}<small>{record.indicator} · {record.unit}</small></th>
        <td>{format(result.without)}</td>
        <td>{format(result.withProject)}</td>
        <td>{signed(result.delta)}</td>
        <td>{record.without.kind==='medido'?'Medido':'Estimado'} · {record.without.date}<small>{record.without.source}</small></td>
        <td>{record.withProject.kind==='medido'?'Medido':'Estimado'} · {record.withProject.date}<small>{record.withProject.source}</small></td>
        <td>{methodDescription??'F3a · lineal'}<small>{methodSource??record.transformation.source}</small></td>
       </tr>)}</tbody>
      </table>
     </div>
    </details>
   </>
  }
  {incomplete>0&&<p className="amb-f3-quality-incomplete" role="note">
   {incomplete} registro(s) con datos pendientes o inválidos: no aparecen en el gráfico.
   Revisalos en el editor de cada factor.</p>}
  <p className="amb-f3-quality-footnote">Una ΔCA negativa expresa una disminución de la calidad
   ambiental calculada respecto del escenario SIN proyecto; no equivale a la categoría cualitativa F1.
   Los factores intangibles y determinantes de F2 se analizan en paralelo.</p>
 </section>;
}
