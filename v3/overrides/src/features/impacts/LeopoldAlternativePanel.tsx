import {useMemo,useState} from 'react';
import {compareLeopoldAlternatives,isAlternativeMatrix,type AlternativeMatrix} from './LeopoldAlternativeComparison';
import './LeopoldAlternativePanel.css';

type Props={active:AlternativeMatrix};
const escapeCsv=(v:string|number)=>{
 const raw=String(v);
 const guarded=/^\s*[=+\-@\t\r]/.test(raw)?"'"+raw:raw;
 return '"'+guarded.replaceAll('"','""')+'"';
};
function downloadCsv(content:string){
 const url=URL.createObjectURL(new Blob(['\uFEFF'+content],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='AMBIENTA-Leopold-comparacion-descriptiva.csv';
 document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
export function LeopoldAlternativePanel({active}:Props){
 const [alternative,setAlternative]=useState<AlternativeMatrix|null>(null);
 const [notice,setNotice]=useState('');
 const report=useMemo(()=>alternative?compareLeopoldAlternatives(active,alternative):null,[active,alternative]);
 const importJson=async(file:File|undefined)=>{
  if(!file)return;
  if(file.size>1_500_000){setNotice('Archivo demasiado grande: máximo 1,5 MB.');return;}
  try{
   const candidate:unknown=JSON.parse(await file.text());
   if(!isAlternativeMatrix(candidate)){
    setNotice('No es una matriz Leopold compatible. La alternativa anterior no se modificó.');return;
   }
   setAlternative(candidate);
   setNotice('Alternativa cargada solo en memoria. No se modificó ni reemplazó ningún expediente.');
  }catch{setNotice('No se pudo leer el JSON. La alternativa anterior permanece intacta.');}
 };
 const exportComparison=()=>{
  if(!report||!alternative)return;
  const rows:(string|number)[][]=[['Factor común','Grupo','Alternativa A','A completas','A adversas','A beneficiosas',
   'A pendientes','A sin evaluar','Alternativa B','B completas','B adversas','B beneficiosas','B pendientes','B sin evaluar']];
  for(const row of report.rows)rows.push([
   row.name,row.group,active.projectName,row.A.evaluated,row.A.negative,row.A.positive,row.A.pending,row.A.unassessed,
   alternative.projectName,row.B.evaluated,row.B.negative,row.B.positive,row.B.pending,row.B.unassessed]);
  downloadCsv(rows.map(row=>row.map(escapeCsv).join(';')).join('\r\n'));
 };
 return <section className="amb-leopold-compare" data-leopold-compare aria-label="Comparación descriptiva entre matrices Leopold">
  <div className="amb-leopold-compare-head">
   <div><p className="amb-matrix-overline">LEOPOLD QA5 · ALTERNATIVAS</p>
    <h4>Comparar matrices sin compensar impactos</h4>
    <p>Usá la matriz abierta como alternativa A y cargá un JSON exportado desde otra matriz
     como alternativa B. Los datos importados son <strong>solo lectura</strong> y no se guardan automáticamente.</p>
   </div>
   <label className="amb-leopold-compare-upload">Cargar alternativa B (JSON)
    <input data-leopold-compare-import type="file" accept=".json,application/json"
     onChange={e=>{void importJson(e.target.files?.[0]);e.currentTarget.value='';}}/>
   </label>
  </div>
  <p className="amb-leopold-compare-warning" role="note"><strong>Comparación descriptiva, no puntuación de opciones.</strong>
   Se emparejan únicamente factores con el mismo nombre y grupo normalizados, una sola vez en cada matriz.
   Esto no prueba equivalencia ecológica: deben verificarse línea de base, alcance, unidad,
   acciones, fecha y criterios de especialistas. Los recuentos dependen de la cobertura de evaluación,
   no miden gravedad ambiental; no se calcula un ganador ni un saldo compensable.</p>
  {notice&&<p role="status">{notice}</p>}
  {alternative&&report&&<>
   <div className="amb-leopold-compare-metrics">
    <span><strong>Alternativa A</strong><small>{active.projectName}</small>
     <b>{report.summaryA.evaluated} completas · {report.summaryA.pending} pendientes · {report.summaryA.unassessed} sin evaluar</b></span>
    <span><strong>Alternativa B</strong><small>{alternative.projectName}</small>
     <b>{report.summaryB.evaluated} completas · {report.summaryB.pending} pendientes · {report.summaryB.unassessed} sin evaluar</b></span>
    <span><strong data-leopold-compare-shared>{report.rows.length}</strong>
     <small>factores emparejados provisionalmente</small></span>
   </div>
   {active.projectId===alternative.projectId&&<p className="amb-leopold-compare-warning">
    Ambas matrices indican el mismo ID de expediente; verificá que sean alternativas realmente diferentes.</p>}
   {(report.onlyA.length>0||report.onlyB.length>0||report.ambiguous.length>0)&&
    <p className="amb-leopold-compare-warning" data-leopold-compare-gaps>
     Fuera de comparación: solo A ({report.onlyA.length}), solo B ({report.onlyB.length}),
     nombres/grupos duplicados ambiguos ({report.ambiguous.length}).
     No se presume equivalencia ni se inventan valores faltantes.
    </p>}
   {report.rows.length===0?<p>No hay factores con nombres y grupos únicos coincidentes.
    Revisá el catálogo manualmente; no se puede comparar automáticamente.</p>
    :<div className="amb-leopold-compare-scroll" role="region" tabIndex={0} aria-label="Tabla descriptiva de alternativas">
     <table><thead><tr>
      <th>Factor coincidente</th><th>Alternativa A · completas</th><th>A · adversas/beneficiosas</th>
      <th>A · pendientes / sin evaluar</th><th>Alternativa B · completas</th>
      <th>B · adversas/beneficiosas</th><th>B · pendientes / sin evaluar</th>
     </tr></thead><tbody>{report.rows.map(row=><tr key={row.name+'::'+row.group}>
      <th scope="row">{row.name}<small>{row.group}</small></th>
      <td>{row.A.evaluated}</td><td>{row.A.negative} / {row.A.positive}</td>
      <td>{row.A.pending} / {row.A.unassessed}</td>
      <td>{row.B.evaluated}</td><td>{row.B.negative} / {row.B.positive}</td>
      <td>{row.B.pending} / {row.B.unassessed}</td>
     </tr>)}</tbody></table></div>}
   <button type="button" data-leopold-compare-export onClick={exportComparison}
    disabled={report.rows.length===0}>Exportar tabla descriptiva CSV</button>
  </>}
 </section>;
}
