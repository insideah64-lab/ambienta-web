import {Link} from 'react-router-dom';
import {ArrowRight, ShieldCheck, X} from 'lucide-react';
import type {DemoState} from '../../lib/demo';
// @ts-ignore: V3-only pure JS selector with validated record types.
import {resolveRecordFocus} from './record-focus.mjs';

type Kind='inspection'|'evidence'|'finding'|'action';
const TITLES:Record<Kind,string>={
 inspection:'Ficha de inspección',evidence:'Ficha de evidencia',
 finding:'Ficha de hallazgo',action:'Ficha de acción correctiva'
};
type Props={data:DemoState;kind:Kind;id:string;onClose:()=>void};

export function RecordFocusPanel({data,kind,id,onClose}:Props){
 const detail=resolveRecordFocus(data,kind,id);
 if(!detail)return <section className="ref-record-focus" data-record-missing={kind} role="status">
   <h3>Registro no encontrado: {id}</h3>
   <p>No existe un registro de este tipo con ese identificador en el expediente actual.
    No se asignaron vínculos ni se creó documentación.</p>
   <button type="button" className="ref-record-dismiss" onClick={onClose}>Volver al listado</button>
  </section>;
 return <section className="ref-record-focus" data-record-focus={detail.id}
  data-record-kind={kind} aria-labelledby="ref-record-heading">
   <div className="ref-record-focus-header">
    <div><p className="ref-record-eyebrow">FICHA DE REGISTRO · SOLO LECTURA</p>
      <h3 id="ref-record-heading">{TITLES[kind]} · {detail.id}</h3>
    </div>
    <button type="button" className="ref-record-dismiss" onClick={onClose}>
      <X size={15} aria-hidden="true"/> Cerrar ficha
    </button>
   </div>
   <div className="ref-record-notice" role="note"><ShieldCheck size={18} aria-hidden="true"/>
    Datos declarados en el expediente de demostración. Los vínculos se siguen
    únicamente por identificadores. Esta ficha no certifica cumplimiento,
    autenticidad documental ni inspecciones de campo.
   </div>
   <dl className="ref-record-fields">
    {detail.fields.map(([label,value]:[string,string],i:number)=>
     <div key={label+'-'+i}><dt>{label}</dt><dd>{String(value)}</dd></div>)}
   </dl>
   <section className="ref-record-links" aria-label="Relaciones verificadas por ID">
    <h4>Registros relacionados por identificador</h4>
    {detail.relations.length?
     <div className="ref-record-links-list">
      {detail.relations.map((r:{kind:string;id:string;label:string;url:string})=>
       <Link to={r.url} key={r.kind+':'+r.id}>
        <span><strong>{r.id}</strong><small>{r.label}</small></span>
        <ArrowRight size={17} aria-hidden="true"/>
       </Link>)}
     </div>
      :<p className="ref-record-empty">Sin relaciones comprobables mediante IDs.</p>}
   </section>
   {detail.warnings.length>0&&<div className="ref-record-warnings" role="alert">
     <strong>Referencias para revisión</strong>
     {detail.warnings.map((w:string,i:number)=><p key={i}>{w}</p>)}
   </div>}
  </section>;
}
