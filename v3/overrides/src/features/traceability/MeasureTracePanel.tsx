import {Link} from 'react-router-dom';
import {ArrowRight, ClipboardList, FileText, ShieldCheck} from 'lucide-react';
import type {DemoState} from '../../lib/demo';
import {statusText} from '../../lib/demo';
// @ts-ignore: V3 pure URL construction for explicit record IDs
import {recordFocusUrl} from './record-focus.mjs';
// @ts-ignore: versioned read-only, pure JS selector; no domain mutations
import {measureDocumentTrace} from './measure-document-trace.mjs';

type Props={data:DemoState;measureId:string;onClear:()=>void};

export function MeasureTracePanel({data,measureId,onClear}:Props){
 const trace=measureDocumentTrace(data,measureId);
 if(!trace)return <section className="ref-trace-panel" data-trace-missing="true" role="status">
   <h3>Medida no encontrada</h3>
   <p>El identificador no existe en el expediente local. No se creó ningún vínculo nuevo.</p>
   <button type="button" className="v2-action-button" onClick={onClear}>Volver al listado</button>
  </section>;
 const {measure,program,inspections,findings,actions,evidence,warnings,counts}=trace;
 return <section className="ref-trace-panel" data-measure-trace={measure.id}
  aria-labelledby="ref-trace-heading">
   <div className="ref-trace-head">
    <div><p className="ref-trace-eyebrow">LECTURA DOCUMENTAL · IDENTIFICADORES EXPLÍCITOS</p>
     <h3 id="ref-trace-heading">Trazabilidad de {measure.id}</h3>
     <p>{measure.title}</p>
     <small>{program?.name??'Programa no localizado'} · Responsable: {measure.owner}</small>
    </div>
    <button type="button" className="ref-trace-close" onClick={onClear}>Cerrar detalle</button>
   </div>
   <p className="ref-trace-disclaimer" role="note">
    <ShieldCheck size={18} aria-hidden="true"/>
    Solo referencias del expediente de demostración; los vínculos se siguen por ID.
    Una revisión documental, evidencia validada o inspección conforme no certifica
    cumplimiento ambiental ni autentica archivos.
   </p>
   <div className="ref-trace-counts" aria-label="Registros relacionados">
    <span><strong>{counts.inspections}</strong> inspecciones</span>
    <span><strong>{counts.evidence}</strong> evidencias</span>
    <span><strong>{counts.findings}</strong> hallazgos</span>
    <span><strong>{counts.actions}</strong> acciones</span>
   </div>
   {warnings.length>0&&<div className="ref-trace-conflicts" role="alert">
     <strong>{warnings.length} vínculo(s) para revisión</strong>
     {warnings.map((w:{kind:string;id:string;message:string},i:number)=>
       <p key={w.id+'-'+i}>{w.id}: {w.message}</p>)}
   </div>}
   <div className="ref-trace-grid">
    <section data-trace-group="inspections">
     <h4><ClipboardList size={17} aria-hidden="true"/> Inspecciones <Link to="/monitoreo">Monitoreo <ArrowRight size={15}/></Link></h4>
     {inspections.length?inspections.map((i:DemoState['inspections'][number])=>
      <div className="ref-trace-record" key={i.id}>
       <strong>{i.id}</strong><span>{i.date} · {i.result}</span>
       <small>Por: {i.assignee}</small>
       <small>Relación: inspección.measureId → {measure.id}</small>
       <Link className="ref-trace-record-link" to={recordFocusUrl("inspection",i.id)!}>Abrir ficha {i.id} <ArrowRight size={15}/></Link>
      </div>):<p className="ref-trace-empty">Sin inspecciones vinculadas por ID.</p>}
    </section>
    <section data-trace-group="evidence">
     <h4><FileText size={17} aria-hidden="true"/> Evidencias <Link to="/evidencias">Evidencias <ArrowRight size={15}/></Link></h4>
     {evidence.length?evidence.map(({record:e,via}:{record:DemoState['evidence'][number];via:string})=>
      <div className="ref-trace-record" key={e.id}>
       <strong>{e.id} · {e.label}</strong><span>Estado documental: {e.status}</span>
       <small>{via==='medida'?'Vínculo directo measureId':'Vínculo indirecto mediante inspectionId'}</small>
       <small>Referencia declarada: {e.reference}</small>
       <Link className="ref-trace-record-link" to={recordFocusUrl("evidence",e.id)!}>Abrir ficha {e.id} <ArrowRight size={15}/></Link>
      </div>):<p className="ref-trace-empty">Sin evidencias vinculadas por ID.</p>}
    </section>
    <section data-trace-group="findings">
     <h4><ShieldCheck size={17} aria-hidden="true"/> Hallazgos <Link to="/auditorias">Auditorías <ArrowRight size={15}/></Link></h4>
     {findings.length?findings.map((f:DemoState['findings'][number])=>
      <div className="ref-trace-record" key={f.id}>
       <strong>{f.id} · {f.title}</strong><span>Estado: {f.status}</span>
       <small>Vía: {f.inspectionId} → {measure.id}</small>
       <Link className="ref-trace-record-link" to={recordFocusUrl("finding",f.id)!}>Abrir ficha {f.id} <ArrowRight size={15}/></Link>
      </div>):<p className="ref-trace-empty">Sin hallazgos asociados mediante inspecciones.</p>}
    </section>
    <section data-trace-group="actions">
     <h4><ClipboardList size={17} aria-hidden="true"/> Acciones correctivas <Link to="/auditorias">Auditorías <ArrowRight size={15}/></Link></h4>
     {actions.length?actions.map((a:DemoState['correctiveActions'][number])=>
      <div className="ref-trace-record" key={a.id}>
       <strong>{a.id} · {a.action}</strong><span>Estado: {a.status} · Vence: {a.due}</span>
       <small>Vía: {a.findingId} → inspección → medida</small>
       <Link className="ref-trace-record-link" to={recordFocusUrl("action",a.id)!}>Abrir ficha {a.id} <ArrowRight size={15}/></Link>
      </div>):<p className="ref-trace-empty">Sin acciones correctivas enlazadas por hallazgo.</p>}
    </section>
   </div>
   <p className="ref-trace-foot">Estado de la medida: {statusText(measure.status)}. La vista no modifica, fusiona ni certifica registros originales.</p>
  </section>;
}
