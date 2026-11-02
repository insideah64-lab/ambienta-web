import {useState} from 'react';
import {Link} from 'react-router-dom';
import type {DemoState} from '../../lib/demo';
// @ts-ignore: V3-only, read-only selectors for the documentary demo
import {auditDocumentLinks} from './document-link-audit.mjs';
// @ts-ignore: V3-only canonical export; SHA verifies the generated JSON only
import {prepareDocumentIssueExport} from './document-issue-export.mjs';

type Props={data:DemoState};
type Issue={kind:string;id:string;code:string;message:string;url:string|null;
 field:string;reference:string|null;sourceCollection:string|null;targetKind:string|null};
const names:Record<string,string>={
 measure:'Medida',inspection:'Inspección',evidence:'Evidencia',
 finding:'Hallazgo',action:'Acción',program:'Programa'
};
export function DocumentLinkAuditPanel({data}:Props){
 const report=auditDocumentLinks(data);
 const [exporting,setExporting]=useState(false);
 const [exportResult,setExportResult]=useState('');
 const [exportHash,setExportHash]=useState('');
 const download=async()=>{
  if(exporting)return;
  setExporting(true);setExportResult('');setExportHash('');
  try{
   const file=await prepareDocumentIssueExport(data);
   const url=URL.createObjectURL(new Blob([file.json],{type:'application/json;charset=utf-8'}));
   const anchor=document.createElement('a');
   anchor.href=url;anchor.download=file.filename;document.body.appendChild(anchor);
   anchor.click();anchor.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   setExportHash(file.data.integrity.report_sha256);
   setExportResult('Reporte de referencias preparado para descarga');
  }catch(error){
   setExportResult('No fue posible exportar: '+(error instanceof Error?error.message:String(error)));
  }finally{setExporting(false)}
 };
 return <section className="ref-audit-links" data-link-audit="case"
  data-link-audit-count={report.total} aria-label="Revisión de referencias del expediente">
  <details>
   <summary>
    <span><strong>Integridad de vínculos del expediente</strong>
     <small>{report.checked} registros revisados · {report.total} referencias para revisar</small></span>
    <span className="ref-audit-links-toggle">Ver detalle</span>
   </summary>
   <p className="ref-audit-links-note">Se contrastan IDs entre medidas, programas,
    inspecciones, evidencias, hallazgos y acciones, sin alterar datos.</p>
   <div className="ref-audit-export-bar">
    <button type="button" className="ref-trace-export" data-issue-export="json"
     onClick={download} disabled={exporting}>
     {exporting?'Preparando SHA-256…':'Exportar reporte de referencias (JSON)'}
    </button>
    <small>Incluye campo, ID de origen y referencia declarada.
     El SHA-256 verifica únicamente el reporte generado, no los archivos de evidencia.</small>
   </div>
   {exportResult&&<div className="ref-audit-export-result" role="status">
    <strong>{exportResult}</strong>
    {exportHash&&<code data-issue-export-sha={exportHash}>SHA-256 del reporte: {exportHash}</code>}
   </div>}
   {report.total>0?<div className="ref-audit-links-list">
    {report.issues.slice(0,30).map((item:Issue,i:number)=>
     <div key={item.kind+':'+item.id+':'+item.code+':'+i} data-audit-kind={item.code}>
      <div><strong>{names[item.kind]??item.kind} · {item.id}</strong>
       <small className="ref-audit-origin">Origen: {item.sourceCollection ?? item.kind}
        · campo <code>{item.field}</code>
        {item.reference!==null&&<> · referencia <code>{item.reference}</code></>}
       </small>
       <p>{item.message}</p></div>
      {item.url?<Link to={item.url}>Abrir ficha</Link>:
       <small>Sin enlace inequívoco</small>}
     </div>)}
    {report.total>30&&<p>Se muestran 30 de {report.total} alertas.
     El JSON descargado contiene todas las alertas del expediente local.</p>}
   </div>:<p className="ref-audit-links-clear">
    No se detectaron referencias rotas o ambiguas entre los IDs declarados.</p>}
   <p className="ref-audit-links-note">{report.disclaimer}</p>
  </details>
 </section>;
}
