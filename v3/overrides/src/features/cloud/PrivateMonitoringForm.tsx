import {useState,type FormEvent} from 'react';
// @ts-ignore: pure validators have standalone Node coverage
import {validatePrivateInspection,validatePrivateEvidenceReference} from './private-monitoring.mjs';

type Measure={id:string;project_id:string;title?:string};
type Inspection={id:string;project_id:string;measure_id:string;scheduled_for?:string};
export type PrivateInspectionValues={measureId:string;date:string;result:string;note:string};
export type PrivateEvidenceReferenceValues={
 measureId:string;inspectionId:string;label:string;reference:string
};
type Props={
 kind:'inspection'|'reference';projectId:string;busy:boolean;
 measures:Measure[];inspections:Inspection[];
 onSave:(values:PrivateInspectionValues|PrivateEvidenceReferenceValues)=>Promise<void>;
 onCancel:()=>void
};
const resultOptions=[
 ['pending','Pendiente / programada'],
 ['conformant','Conforme (declarado por usuario)'],
 ['observed','Con observaciones (declarado)'],
 ['not_applicable','No aplica (declarado)']
];
export function PrivateMonitoringForm({
 kind,projectId,busy,measures,inspections,onSave,onCancel
}:Props){
 const [measureId,setMeasureId]=useState('');
 const [inspectionId,setInspectionId]=useState('');
 const [error,setError]=useState('');
 const available=measures.filter(m=>m.project_id===projectId);
 const compatible=inspections.filter(i=>
  i.project_id===projectId&&i.measure_id===measureId);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy||!available.length)return;
  const raw=Object.fromEntries(new FormData(event.currentTarget).entries());
  try{
   const scope={projectId,measures:available,inspections:compatible};
   const values=kind==='inspection'
    ?validatePrivateInspection(raw,scope)
    :validatePrivateEvidenceReference(raw,scope);
   setError('');
   await onSave(values);
  }catch(cause){setError(cause instanceof Error?cause.message:'Registro inválido');}
 }
 return <form className="amb-private-intake" data-private-monitoring-form={kind}
  onSubmit={e=>void submit(e)}>
  <header>
   <h3>{kind==='inspection'?'Nueva inspección de seguimiento':'Nueva referencia documental'}</h3>
   <p>{kind==='inspection'
    ?'Registrar el seguimiento declarado de una medida ambiental del expediente.'
    :'Registrar una referencia documental sin cargar archivos ni verificar su contenido.'}</p>
  </header>
  {!available.length&&<p className="amb-private-intake-scope" role="status">
   Registrá primero una medida del PGA vinculada a un impacto y programa.</p>}
  <div className="amb-private-fields">
   <label>Medida del PGA
    <select name="measureId" required value={measureId}
     onChange={e=>{setMeasureId(e.target.value);setInspectionId('');}}
     disabled={busy||!available.length} aria-label="Medida PGA para monitoreo">
     <option value="">Seleccionar medida existente</option>
     {available.map(m=><option key={m.id} value={m.id}>
      {m.title||'Medida sin título'} · {m.id.slice(0,8)}
     </option>)}
    </select>
   </label>
   {kind==='inspection'?<>
    <label>Fecha programada / declarada
     <input name="date" type="date" required disabled={busy||!available.length}/></label>
    <label>Resultado declarado
     <select name="result" defaultValue="pending" disabled={busy||!available.length}>
      {resultOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}
     </select>
    </label>
    <label className="amb-private-wide">Observaciones del registro
     <textarea name="note" required rows={3} minLength={3} maxLength={2000}
      disabled={busy||!available.length}
      placeholder="Indicar observaciones, alcance, fuente y si la inspección se realizó o está prevista."/>
    </label>
   </>:<>
    <label>Inspección relacionada (opcional)
     <select name="inspectionId" value={inspectionId}
      onChange={e=>setInspectionId(e.target.value)}
      disabled={busy||!available.length||!measureId}
      aria-label="Inspección asociada a la referencia">
      <option value="">Referencia directa a la medida, sin inspección</option>
      {compatible.map(i=><option key={i.id} value={i.id}>
       {i.scheduled_for||'Sin fecha'} · {i.id.slice(0,8)}
      </option>)}
     </select>
    </label>
    <label>Descripción documental
     <input name="label" required minLength={3} maxLength={320}
      disabled={busy||!available.length}
      placeholder="Ej.: Registro fotográfico de drenajes"/></label>
    <label className="amb-private-wide">Fuente / localización de referencia
     <input name="reference" required minLength={3} maxLength={350}
      disabled={busy||!available.length}
      placeholder="Código de acta, expediente o referencia consultable"/></label>
   </>}
  </div>
  <p className="amb-private-intake-scope">
   {kind==='inspection'
    ?'El resultado es una declaración del usuario y no certifica cumplimiento ambiental, visita de campo ni eficacia.'
    :'Se guardará solo la referencia de texto en estado pendiente. No se subirá un documento ni se validará su autenticidad.'}
   {' '}RLS y las claves foráneas de Supabase controlan el expediente de destino.
  </p>
  {error&&<p className="v2-cloud-error" role="alert">{error}</p>}
  <div className="amb-private-actions">
   <button type="submit" className="v2-action-button" disabled={busy||!available.length}>
    {busy?'Guardando…':kind==='inspection'?'Registrar inspección':'Registrar referencia pendiente'}
   </button>
   <button type="button" className="v2-cloud-switch" onClick={onCancel} disabled={busy}>Cancelar</button>
  </div>
 </form>;
}
