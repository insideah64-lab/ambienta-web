import {Link} from 'react-router-dom';
import type {DemoState} from '../../lib/demo';
// @ts-ignore: pure V3.6.4 audit, never mutates or authenticates the source
import {auditDocumentLinks} from './document-link-audit.mjs';

type Props={data:DemoState};
type Issue={kind:string;id:string;code:string;message:string;url:string|null};
const names:Record<string,string>={
 measure:'Medida',inspection:'Inspección',evidence:'Evidencia',
 finding:'Hallazgo',action:'Acción',program:'Programa'
};
export function DocumentLinkAuditPanel({data}:Props){
 const report=auditDocumentLinks(data);
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
   {report.total>0?<div className="ref-audit-links-list">
    {report.issues.slice(0,30).map((item:Issue,i:number)=>
     <div key={item.kind+':'+item.id+':'+item.code+':'+i} data-audit-kind={item.code}>
      <div><strong>{names[item.kind]??item.kind} · {item.id}</strong>
       <p>{item.message}</p></div>
      {item.url?<Link to={item.url}>Abrir ficha</Link>:
       <small>Sin enlace inequívoco</small>}
     </div>)}
    {report.total>30&&<p>Se muestran 30 de {report.total} alertas.
     Revisar las referencias restantes en el expediente de origen.</p>}
   </div>:<p className="ref-audit-links-clear">
    No se detectaron referencias rotas o ambiguas entre los IDs declarados.</p>}
   <p className="ref-audit-links-note">{report.disclaimer}</p>
  </details>
 </section>;
}
