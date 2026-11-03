import {useState,type FormEvent} from 'react';
// @ts-ignore: pure validators are exercised by Node regression tests
import {validatePrivateMeasure} from './private-measure.mjs';

export type PrivateMeasureValues={
 programId:string; impactId:string; title:string; description:string;
 owner:string;indicator:string;criterion:string;frequency:string;dueDate:string
};
type Reference={id:string;code?:string;title?:string;name?:string;factor?:string};
type Props={projectId:string;programs:Reference[];impacts:Reference[];
 busy:boolean;onSave:(values:PrivateMeasureValues)=>Promise<void>;onCancel:()=>void};

export function PrivateMeasureForm({projectId,programs,impacts,busy,onSave,onCancel}:Props){
 const [error,setError]=useState('');
 const blocked=!programs.length||!impacts.length;
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy||blocked)return;
  const raw=Object.fromEntries(new FormData(event.currentTarget).entries());
  try{
   const values=validatePrivateMeasure(raw,{
    projectId,programIds:programs.map(p=>p.id),impactIds:impacts.map(i=>i.id)
   }) as PrivateMeasureValues;
   setError('');
   await onSave(values);
  }catch(cause){setError(cause instanceof Error?cause.message:'Medida inválida');}
 }
 return <form className="amb-private-intake" data-private-measure-form onSubmit={e=>void submit(e)}>
  <header>
   <h3>Nueva medida del Plan de Gestión Ambiental</h3>
   <p>Esta medida quedará vinculada a un impacto y programa existentes del expediente privado.
    Es una declaración en estado borrador; no acredita su implementación ni eficacia.</p>
  </header>
  {blocked&&<p role="status" className="amb-private-intake-scope" data-measure-preconditions>
    Antes de cargar una medida, registrá al menos un impacto y un programa del PGA
    en este expediente. No se crearán vinculaciones automáticas.</p>}
  <div className="amb-private-fields">
   <label>Programa del PGA
    <select name="programId" required defaultValue="" disabled={blocked||busy}
     aria-label="Programa PGA de la medida">
     <option value="" disabled>Seleccionar programa existente</option>
     {programs.map(p=><option key={p.id} value={p.id}>
      {p.code||p.name||p.id}{p.name&&p.code?' · '+p.name:''}
     </option>)}
    </select>
   </label>
   <label>Impacto ambiental
    <select name="impactId" required defaultValue="" disabled={blocked||busy}
     aria-label="Impacto de la medida">
     <option value="" disabled>Seleccionar impacto registrado</option>
     {impacts.map(i=><option key={i.id} value={i.id}>
      {i.code||i.title||i.id}{i.title&&i.code?' · '+i.title:''}
     </option>)}
    </select>
   </label>
   <label>Nombre de la medida
    <input name="title" required minLength={3} maxLength={240}
     placeholder="Ej.: Control de escorrentía" disabled={blocked||busy}/></label>
   <label>Responsable declarado
    <input name="owner" required minLength={2} maxLength={240}
     placeholder="Cargo o equipo responsable" disabled={blocked||busy}/></label>
   <label className="amb-private-wide">Descripción y alcance
    <textarea name="description" rows={3} required minLength={3} maxLength={2000}
     placeholder="Acciones concretas de manejo ambiental" disabled={blocked||busy}/></label>
   <label>Indicador de seguimiento
    <input name="indicator" required minLength={3} maxLength={500}
     placeholder="Indicador observable o medible" disabled={blocked||busy}/></label>
   <label>Criterio de evaluación
    <input name="criterion" required minLength={3} maxLength={500}
     placeholder="Valor de referencia o requisito declarado" disabled={blocked||busy}/></label>
   <label>Frecuencia
    <input name="frequency" required minLength={3} maxLength={80}
     placeholder="Ej.: Mensual" disabled={blocked||busy}/></label>
   <label>Fecha límite (opcional)
    <input name="dueDate" type="date" disabled={blocked||busy}/></label>
  </div>
  <p className="amb-private-intake-scope">La medida y su vínculo se guardarán mediante
   una sola transacción del servidor, con políticas RLS y claves foráneas de proyecto.
   Estado inicial: borrador. No se generará una inspección ni una evidencia automática.</p>
  {error&&<p role="alert" className="v2-cloud-error">{error}</p>}
  <div className="amb-private-actions">
   <button type="submit" className="v2-action-button" disabled={blocked||busy}>
    {busy?'Guardando…':'Registrar medida vinculada'}</button>
   <button type="button" className="v2-cloud-switch" disabled={busy} onClick={onCancel}>
    Cancelar</button>
  </div>
 </form>;
}
