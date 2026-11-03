import {useState,type FormEvent} from 'react';
// @ts-ignore: pure strict validators reused by Node regression tests
import {validatePrivateProject,validatePrivateImpact,validatePrivateProgram} from './private-intake.mjs';

export type PrivateIntakeKind='project'|'impact'|'program';
type Props={kind:PrivateIntakeKind;busy:boolean;
 onSave:(values:Record<string,string>)=>Promise<void>;onCancel:()=>void};
const phaseOptions=[
 ['planning','Planificación'],['construction','Construcción'],
 ['operation','Operación'],['closure','Cierre']
];
export function PrivateIntakeForm({kind,busy,onSave,onCancel}:Props){
 const [error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy)return;
  const data=Object.fromEntries(new FormData(e.currentTarget).entries());
  try{
   const values=kind==='project'?validatePrivateProject(data):
    kind==='impact'?validatePrivateImpact(data):validatePrivateProgram(data);
   setError('');
   await onSave(values as Record<string,string>);
  }catch(cause){setError(cause instanceof Error?cause.message:'Campos inválidos.');}
 }
 const label=kind==='project'?'Nuevo expediente ambiental privado':
  kind==='impact'?'Registrar impacto del expediente':'Nuevo programa del PGA';
 return <form className="amb-private-intake" data-private-intake={kind}
  onSubmit={e=>void submit(e)}>
  <header><h3>{label}</h3>
   <p>Registro real de la cuenta autenticada, separado de los ejemplos del sitio.
    Los campos son declaraciones del usuario; no constituyen verificación técnica.</p>
  </header>
  {kind==='project'&&<div className="amb-private-fields">
   <label>Nombre del expediente
    <input name="name" required minLength={3} maxLength={240}
     placeholder="Nombre y alcance del proyecto" autoComplete="off"/></label>
   <label>Provincia
    <input name="province" required minLength={2} maxLength={80} placeholder="Provincia declarada"/></label>
   <label>Actividad / sector (opcional)
    <input name="activity_type" maxLength={240} placeholder="Ej.: proyecto industrial"/></label>
   <label>Proponente (opcional)
    <input name="proponent" maxLength={240} placeholder="Razón social o titular declarado"/></label>
  </div>}
  {kind==='impact'&&<div className="amb-private-fields">
   <label>Código único del impacto
    <input name="code" required minLength={3} maxLength={70} placeholder="Ej.: IMP-AGU-001"/></label>
   <label>Descripción del impacto
    <input name="title" required minLength={3} maxLength={240} placeholder="Impacto a evaluar"/></label>
   <label>Factor ambiental
    <input name="factor" required minLength={3} maxLength={100} placeholder="Ej.: Agua superficial"/></label>
   <label>Etapa del proyecto
    <select name="project_phase" defaultValue="planning">
     {phaseOptions.map(([value,name])=><option key={value} value={value}>{name}</option>)}
    </select></label>
   <label>Naturaleza declarada
    <select name="sign" defaultValue="uncertain">
     <option value="uncertain">Por determinar</option>
     <option value="negative">Negativo</option>
     <option value="positive">Positivo</option>
    </select></label>
  </div>}
  {kind==='program'&&<div className="amb-private-fields">
   <label>Código del programa
    <input name="code" required minLength={3} maxLength={70} placeholder="Ej.: PGA-AGU-001"/></label>
   <label>Nombre del programa
    <input name="name" required minLength={3} maxLength={240} placeholder="Ej.: Monitoreo hídrico"/></label>
   <label>Categoría
    <input name="category" required minLength={3} maxLength={100} placeholder="Ej.: Agua"/></label>
   <label>Descripción (opcional)
    <textarea name="description" maxLength={2000} rows={2}/></label>
  </div>}
  <p className="amb-private-intake-scope">El registro se guardará únicamente mediante
   Supabase Auth y las políticas RLS del expediente. No copiará datos de Diablillos,
   no importará matrices locales y no se considerará aprobado ni revisado.</p>
  {error&&<p role="alert" className="v2-cloud-error">{error}</p>}
  <div className="amb-private-actions">
   <button type="submit" className="v2-action-button" disabled={busy}>
    {busy?'Guardando…':kind==='project'?'Crear expediente privado':
     kind==='impact'?'Registrar impacto':'Crear programa PGA'}</button>
   <button type="button" className="v2-cloud-switch" disabled={busy} onClick={onCancel}>Cancelar</button>
  </div>
 </form>;
}
