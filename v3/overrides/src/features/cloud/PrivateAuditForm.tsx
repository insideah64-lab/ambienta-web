import {type FormEvent,useState} from 'react';
// @ts-ignore: pure cross-project validators reused by Node regression tests
import {validatePrivateFinding,validatePrivateCorrectiveAction} from './private-audit.mjs';

export type PrivateFindingValues={inspectionId:string;title:string;description:string;severity:string};
export type PrivateCorrectiveActionValues={findingId:string;action:string;owner:string;dueDate:string};
type Inspection={id:string;project_id:string;measure_id:string;result:string;scheduled_for?:string};
type Finding={id:string;project_id:string;title:string;status?:string};
type Props={
 kind:'finding'|'action';projectId:string;inspections:Inspection[];findings:Finding[];
 busy:boolean;
 onSave:(values:PrivateFindingValues|PrivateCorrectiveActionValues)=>Promise<void>;
 onCancel:()=>void;
};
const severities=[['observation','Observación'],['minor','Menor'],['major','Mayor']];
export function PrivateAuditForm({kind,projectId,inspections,findings,busy,onSave,onCancel}:Props){
 const [error,setError]=useState('');
 const availableInspections=inspections.filter(x=>x.project_id===projectId&&x.result==='observed');
 const availableFindings=findings.filter(x=>x.project_id===projectId);
 const options=kind==='finding'?availableInspections:availableFindings;
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy||!options.length)return;
  const raw=Object.fromEntries(new FormData(event.currentTarget).entries());
  try{
   const scope={projectId,inspections:availableInspections,findings:availableFindings};
   const values=kind==='finding'
    ?validatePrivateFinding(raw,scope):validatePrivateCorrectiveAction(raw,scope);
   setError('');
   await onSave(values);
  }catch(cause){setError(cause instanceof Error?cause.message:'Registro de auditoría inválido');}
 }
 return <form data-private-audit-form={kind} className="amb-private-intake"
  onSubmit={ev=>void submit(ev)}>
  <header>
   <h3>{kind==='finding'?'Registrar hallazgo de auditoría':'Registrar acción correctiva'}</h3>
   <p>{kind==='finding'
    ?'El hallazgo se asocia a una inspección con observaciones declaradas.'
    :'La acción correctiva se vincula a un hallazgo existente del mismo expediente.'}
    {' '}Son registros de trabajo, no dictámenes ni certificados de cierre.</p>
  </header>
  {!options.length&&<p className="amb-private-intake-scope" role="status">
   {kind==='finding'
    ?'Primero registrá una inspección con resultado «Con observaciones» en este expediente.'
    :'Primero registrá un hallazgo vinculado a una inspección de este expediente.'}
  </p>}
  <div className="amb-private-fields">
   {kind==='finding'?<>
    <label>Inspección de origen
     <select name="inspectionId" required defaultValue="" disabled={busy||!options.length}>
      <option value="">Seleccionar inspección observada</option>
      {availableInspections.map(i=><option key={i.id} value={i.id}>
       {i.scheduled_for||'Sin fecha'} · {i.id.slice(0,8)}
      </option>)}
     </select>
    </label>
    <label>Severidad declarada
     <select name="severity" defaultValue="observation" disabled={busy||!options.length}>
      {severities.map(([value,label])=><option value={value} key={value}>{label}</option>)}
     </select>
    </label>
    <label className="amb-private-wide">Título del hallazgo
     <input name="title" required minLength={3} maxLength={240} disabled={busy||!options.length}
      placeholder="Ej.: Drenaje insuficiente detectado"/></label>
    <label className="amb-private-wide">Descripción y fundamentos
     <textarea name="description" required minLength={3} maxLength={2000}
      rows={3} disabled={busy||!options.length}
      placeholder="Explicar observación, alcance, ubicación declarada y criterio de auditoría"/></label>
   </>:<>
    <label className="amb-private-wide">Hallazgo vinculado
     <select name="findingId" required defaultValue="" disabled={busy||!options.length}>
      <option value="">Seleccionar hallazgo registrado</option>
      {availableFindings.map(f=><option key={f.id} value={f.id}>{f.title} · {f.id.slice(0,8)}</option>)}
     </select>
    </label>
    <label className="amb-private-wide">Acción correctiva propuesta
     <textarea name="action" required minLength={3} maxLength={2000}
      rows={3} disabled={busy||!options.length} placeholder="Tarea concreta a ejecutar"/></label>
    <label>Responsable declarado
     <input name="owner" required minLength={2} maxLength={240}
      disabled={busy||!options.length} placeholder="Cargo o equipo"/></label>
    <label>Fecha objetivo (opcional)
     <input type="date" name="dueDate" disabled={busy||!options.length}/></label>
   </>}
  </div>
  <p className="amb-private-intake-scope">Se guardará en estado abierto. Ni el hallazgo ni
   la acción implican cumplimiento, corrección implementada, resolución profesional
   o aprobación de autoridad. Los vínculos se controlan también mediante RLS y
   claves foráneas del servidor.</p>
  {error&&<p role="alert" className="v2-cloud-error">{error}</p>}
  <div className="amb-private-actions">
   <button type="submit" className="v2-action-button" disabled={busy||!options.length}>
    {busy?'Guardando…':kind==='finding'?'Registrar hallazgo abierto':'Registrar acción abierta'}
   </button>
   <button type="button" className="v2-cloud-switch" disabled={busy} onClick={onCancel}>
    Cancelar</button>
  </div>
 </form>;
}
