import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Cloud, FolderOpen, LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
// @ts-ignore: Reuse the V1 cloud repository; this legacy ESM module has no TS declarations.
import { createEnvironmentalRepository } from '../../../../../web/cloud/repository.mjs';
import {CloudEvidencePilot} from './CloudEvidencePilot';
import './cloud.css';

type ProjectRow = { id:string; owner_id?:string; name:string; province:string; project_phase:string; status:string; created_at:string };
type MeasureRow = {id:string;title?:string};
type EvidenceRow = {id:string;measure_id?:string;label?:string;storage_path?:string|null;original_file_name?:string|null;file_size_bytes?:number|null;sha256_client?:string|null;status?:string};
type ProjectDetail = { project:ProjectRow; environmental_impacts:unknown[];
  management_programs:unknown[]; management_measures:MeasureRow[];
  monitoring_inspections:unknown[]; environmental_evidence:EvidenceRow[];
  audit_findings:unknown[]; corrective_actions:unknown[] };
type Reader = { listProjects:()=>Promise<ProjectRow[]>;loadProject:(id:string)=>Promise<ProjectDetail>;
  uploadEvidenceFile:(projectId:string,measureId:string,values:{label:string;file:File})=>Promise<unknown>;
  downloadEvidence:(row:EvidenceRow)=>Promise<{blob:Blob;name:string}> };
function message(cause:unknown):string {
  return cause instanceof Error ? cause.message : 'No se pudo completar la operación.';
}
export function CloudWorkspace() {
  const client=useMemo(()=>getSupabaseClient(),[]);
  const reader=useMemo<Reader|null>(()=>client?createEnvironmentalRepository(client) as unknown as Reader:null,[client]);
  const [user,setUser]=useState<User|null>(null);
  const [loading,setLoading]=useState(Boolean(client));
  const [busy,setBusy]=useState(false);
  const [projects,setProjects]=useState<ProjectRow[]>([]);
  const [selected,setSelected]=useState<ProjectDetail|null>(null);
  const [error,setError]=useState('');
  const [info,setInfo]=useState('');
  const [mode,setMode]=useState<'login'|'signup'>('login');

  useEffect(()=>{
    if(!client)return;
    let alive=true, generation=0;
    async function check() {
      const sequence=++generation;
      try {
        const {data,error:authError}=await client!.auth.getUser();
        if(!alive||sequence!==generation)return;
        if(authError)throw authError;
        setUser(data.user??null);
        setError('');
      } catch(cause) {
        if(alive&&sequence===generation){setUser(null);setError(message(cause));}
      } finally {
        if(alive&&sequence===generation)setLoading(false);
      }
    }
    const {data:subscription}=client.auth.onAuthStateChange((_event,session)=>{
      ++generation;
      setUser(null);setProjects([]);setSelected(null);
      if(!session){setLoading(false);return;}
      setLoading(true);
      // Avoid calling other Supabase APIs synchronously inside the Auth callback.
      window.setTimeout(()=>{if(alive)void check();},0);
    });
    void check();
    return ()=>{alive=false;++generation;subscription.subscription.unsubscribe();};
  },[client]);

  useEffect(()=>{
    if(!user||!reader){setProjects([]);setSelected(null);return;}
    let active=true;
    setBusy(true);setProjects([]);setSelected(null);
    reader.listProjects().then(rows=>{if(active)setProjects(rows);})
      .catch(cause=>{if(active)setError(message(cause));})
      .finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[user?.id,reader]);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!client)return;
    const values=new FormData(event.currentTarget);
    const email=String(values.get('email')??'').trim();
    const password=String(values.get('password')??'');
    setBusy(true);setError('');setInfo('');
    try {
      if(mode==='signup') {
        const {data,error:authError}=await client.auth.signUp({email,password});
        if(authError)throw authError;
        setInfo(data.session?'Cuenta autenticada. Cargando expedientes.':'Revisá tu correo para confirmar la cuenta, si el servicio exige confirmación.');
      } else {
        const {error:authError}=await client.auth.signInWithPassword({email,password});
        if(authError)throw authError;
        setInfo('Sesión iniciada. Consultando expedientes privados.');
      }
      (event.currentTarget as HTMLFormElement).reset();
    } catch(cause){setError(message(cause));}
    finally {setBusy(false);}
  }
  async function logout() {
    if(!client)return;
    setBusy(true);setError('');setInfo('');
    try {
      const {error:authError}=await client.auth.signOut();
      if(authError)throw authError;
      setUser(null);setProjects([]);setSelected(null);
    } catch(cause){setError(message(cause));}
    finally{setBusy(false);}
  }
  async function openProject(projectId:string) {
    if(!reader||!user)return;
    setBusy(true);setError('');setSelected(null);
    try{setSelected(await reader.loadProject(projectId));}
    catch(cause){setError(message(cause));}
    finally{setBusy(false);}
  }
  return <div className="v2-cloud-workspace">
    <div className="v2-cloud-heading"><span className="v2-cloud-mark"><Cloud size={23}/></span>
      <div><strong>Expedientes privados</strong><p>Conexión separada de los datos ficticios de la demostración.</p></div>
      {user&&<button type="button" className="v2-action-button v2-action-muted" disabled={busy} onClick={()=>void logout()}><LogOut size={16}/> Cerrar sesión</button>}
    </div>
    {!client&&<div className="v2-cloud-state" role="status"><ShieldCheck size={22}/>
      <div><h2>Conexión privada aún no configurada</h2>
      <p>Esta compilación experimental no incluye las variables públicas de Supabase. La demostración local sigue funcionando; no se intentó acceder a ningún expediente.</p>
      <p>Configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY para habilitar el inicio de sesión. Nunca agregar una clave secreta.</p></div></div>}
    {client&&<div className="v2-cloud-note"><ShieldCheck size={18}/>
      <span>El acceso lo controla Supabase Auth y las políticas RLS del servidor. El piloto de carga privada está <strong>desactivado por defecto</strong> y no aprueba medidas ni evidencias.</span></div>}
    {error&&<p className="v2-cloud-error" role="alert">{error}</p>}
    {info&&<p className="v2-cloud-info" role="status">{info}</p>}
    {client&&loading&&<p className="v2-cloud-state" role="status"><RefreshCw size={18}/> Verificando sesión…</p>}
    {client&&!loading&&!user&&<form className="v2-cloud-form" onSubmit={event=>void submit(event)}>
      <h2>{mode==='login'?'Ingresar a mis expedientes':'Crear acceso privado'}</h2>
      <p>Los datos privados no se copian al almacenamiento local de la demo.</p>
      <label>Correo electrónico<input type="email" name="email" autoComplete="email" required maxLength={254}/></label>
      <label>Contraseña<input type="password" name="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={6}/></label>
      <div className="v2-cloud-form-actions">
        <button className="v2-action-button" disabled={busy} type="submit"><LogIn size={17}/>{busy?'Procesando…':mode==='login'?'Iniciar sesión':'Registrarme'}</button>
        <button className="v2-cloud-switch" type="button" disabled={busy} onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');setInfo('');}}>
          {mode==='login'?'Crear una cuenta':'Ya tengo cuenta'}</button>
      </div>
    </form>}
    {client&&!loading&&user&&<div className="v2-cloud-private">
      <p className="v2-cloud-identity">Sesión verificada: <strong>{user.email??'Usuario autenticado'}</strong></p>
      {busy&&<p role="status">Consultando registros…</p>}
      {!selected&&<div className="v2-cloud-list">
        <h2>Mis expedientes</h2>
        {!busy&&!projects.length&&<p>Aún no hay expedientes disponibles para esta cuenta.</p>}
        {projects.map(p=><button type="button" key={p.id} disabled={busy}
          className="v2-cloud-project" onClick={()=>void openProject(p.id)}>
          <FolderOpen size={22}/><span><strong>{p.name}</strong><small>{p.province} · {p.project_phase} · {p.status}</small></span>
          <span aria-hidden="true">›</span>
        </button>)}
      </div>}
      {selected&&<div className="v2-cloud-detail">
        <button type="button" className="v2-cloud-switch" onClick={()=>setSelected(null)}>← Volver a mis expedientes</button>
        <h2>{selected.project.name}</h2>
        <p>{selected.project.province} · {selected.project.status}</p>
        <div className="v2-cloud-counts">
          {([['Impactos',selected.environmental_impacts.length],['Programas PGA',selected.management_programs.length],
            ['Medidas',selected.management_measures.length],['Inspecciones',selected.monitoring_inspections.length],
            ['Evidencias',selected.environmental_evidence.length],['Hallazgos',selected.audit_findings.length],
            ['Acciones correctivas',selected.corrective_actions.length]] as [string,number][]).map(([label,count])=>
              <div key={label}><span>{label}</span><strong>{count}</strong></div>)}
        </div>
        <CloudEvidencePilot projectId={selected.project.id} measures={selected.management_measures}
          evidence={selected.environmental_evidence} reader={reader!} onUploaded={async()=>{
           if(user&&reader){const latest=await reader.loadProject(selected.project.id);setSelected(latest);}
          }}/>
        <p className="v2-cloud-readonly">Los demás formularios de edición y las aprobaciones siguen fuera de esta V2 experimental. No se certificó autorización cruzada con dos usuarios.</p>
      </div>}
    </div>}
  </div>;
}
