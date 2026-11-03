import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {LogIn, LogOut, RefreshCw} from 'lucide-react';
import {ArtworkIcon} from '../iconography/ArtworkIcon';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
// @ts-ignore: Reuse the V1 cloud repository; this legacy ESM module has no TS declarations.
import { createEnvironmentalRepository } from '../../../../../web/cloud/repository.mjs';
import {CloudEvidencePilot} from './CloudEvidencePilot';
import {PrivateIntakeForm,type PrivateIntakeKind} from './PrivateIntakeForm';
import {PrivateMeasureForm,type PrivateMeasureValues} from './PrivateMeasureForm';
import {PrivateMonitoringForm,type PrivateInspectionValues,type PrivateEvidenceReferenceValues} from './PrivateMonitoringForm';
// @ts-ignore: pure documentary projection, tested by Node
import {privateMonitoringSummary,validatePrivateInspection,validatePrivateEvidenceReference} from './private-monitoring.mjs';
// @ts-ignore: pure documentary projection, tested natively
import {privateMeasureSummary} from './private-measure.mjs';
import './private-workspace.css';
import './cloud.css';

type ProjectRow = { id:string; owner_id?:string; name:string; province:string; project_phase:string; status:string; created_at:string };
type MeasureRow = {id:string;title?:string;project_id:string;program_id?:string;status?:string};
type InspectionRow={id:string;project_id:string;measure_id:string;recorded_by?:string;
 scheduled_for:string;result:string;note:string};
type MeasureImpactLinkRow={measure_id:string;impact_id:string;project_id:string};
type MeasureSummary={id:string;title:string;status:string;programLabel:string;
 impactLabels:string[];problems:string[]};
type ImpactRow = {id:string;code?:string;title?:string;factor?:string;sign?:string;project_phase?:string};
type ProgramRow = {id:string;code?:string;name?:string;category?:string};
type EvidenceRow = {id:string;project_id:string;measure_id:string;inspection_id?:string|null;
 label?:string;reference_label?:string;storage_path?:string|null;original_file_name?:string|null;
 file_size_bytes?:number|null;sha256_client?:string|null;status?:string};
type ProjectDetail = { project:ProjectRow; environmental_impacts:ImpactRow[];
  management_programs:ProgramRow[]; management_measures:MeasureRow[];
  measure_impact_links:MeasureImpactLinkRow[];
  monitoring_inspections:InspectionRow[]; environmental_evidence:EvidenceRow[];
  audit_findings:unknown[]; corrective_actions:unknown[] };
type Reader = { listProjects:()=>Promise<ProjectRow[]>;loadProject:(id:string)=>Promise<ProjectDetail>;
  createProject:(values:Record<string,string>)=>Promise<ProjectRow>;
  createImpact:(projectId:string,values:Record<string,string>)=>Promise<unknown>;
  createProgram:(projectId:string,values:Record<string,string>)=>Promise<unknown>;
  createMeasure:(projectId:string,values:PrivateMeasureValues)=>Promise<string>;
  createInspection:(projectId:string,measureId:string,values:Omit<PrivateInspectionValues,'measureId'>)=>Promise<InspectionRow>;
  registerEvidence:(projectId:string,measureId:string,values:Omit<PrivateEvidenceReferenceValues,'measureId'>)=>Promise<EvidenceRow>;
  uploadEvidenceFile:(projectId:string,measureId:string,values:{label:string;file:File})=>Promise<unknown>;
  downloadEvidence:(row:EvidenceRow)=>Promise<{blob:Blob;name:string}> };
function message(cause:unknown):string {
  return cause instanceof Error ? cause.message : 'No se pudo completar la operación.';
}
export function CloudWorkspace() {
  const client=useMemo(()=>getSupabaseClient(),[]);
  const reader=useMemo<Reader|null>(()=>client?createEnvironmentalRepository(client) as unknown as Reader:null,[client]);
  const authEpoch=useRef(0);
  const [user,setUser]=useState<User|null>(null);
  const [loading,setLoading]=useState(Boolean(client));
  const [busy,setBusy]=useState(false);
  const [projects,setProjects]=useState<ProjectRow[]>([]);
  const [selected,setSelected]=useState<ProjectDetail|null>(null);
  const [error,setError]=useState('');
  const [info,setInfo]=useState('');
  const [mode,setMode]=useState<'login'|'signup'>('login');
  const [createMode,setCreateMode]=useState<PrivateIntakeKind|'measure'|'inspection'|'reference'|null>(null);

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
      ++authEpoch.current;
      setUser(null);setProjects([]);setSelected(null);setCreateMode(null);
      setBusy(false);
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
    const epoch=authEpoch.current;
    setBusy(true);setProjects([]);setSelected(null);
    reader.listProjects().then(rows=>{if(active&&epoch===authEpoch.current)setProjects(rows);})
      .catch(cause=>{if(active&&epoch===authEpoch.current)setError(message(cause));})
      .finally(()=>{if(active&&epoch===authEpoch.current)setBusy(false);});
    return ()=>{active=false;};
  },[user?.id,reader]);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!client)return;
    const form=event.currentTarget;
    const values=new FormData(form);
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
      form.reset();
    } catch(cause){setError(message(cause));}
    finally {setBusy(false);}
  }
  async function logout() {
    if(!client)return;
    setBusy(true);setError('');setInfo('');
    try {
      const {error:authError}=await client.auth.signOut();
      if(authError)throw authError;
      setUser(null);setProjects([]);setSelected(null);setCreateMode(null);
    } catch(cause){setError(message(cause));}
    finally{setBusy(false);}
  }
  async function openProject(projectId:string) {
    if(!reader||!user)return;
    const epoch=authEpoch.current;
    setBusy(true);setError('');setSelected(null);setCreateMode(null);
    try{
      const result=await reader.loadProject(projectId);
      if(epoch===authEpoch.current)setSelected(result);
    }catch(cause){if(epoch===authEpoch.current)setError(message(cause));}
    finally{if(epoch===authEpoch.current)setBusy(false);}
  }
  async function savePrivateRecord(kind:PrivateIntakeKind,values:Record<string,string>){
   if(!reader||!user||busy)return;
   const epoch=authEpoch.current;
   const currentProject=selected?.project.id;
   setBusy(true);setError('');setInfo('');
   try{
    if(kind==='project'){
     const created=await reader.createProject(values);
     if(epoch!==authEpoch.current)return;
     setProjects(rows=>[created,...rows.filter(r=>r.id!==created.id)]);
     setCreateMode(null);
     setInfo('Expediente privado registrado como borrador. Los datos no están certificados.');
     // Creation already succeeded: do not retry on a failed follow-up SELECT.
     try{
      const fresh=await reader.loadProject(created.id);
      if(epoch===authEpoch.current)setSelected(fresh);
     }catch(cause){
      if(epoch===authEpoch.current)setError('Expediente creado; no se pudo abrir la ficha: '+message(cause));
     }
    }else{
     if(!currentProject)throw Error('Seleccioná un expediente privado.');
     if(kind==='impact')await reader.createImpact(currentProject,values);
     else await reader.createProgram(currentProject,values);
     if(epoch!==authEpoch.current)return;
     setCreateMode(null);
     setInfo(kind==='impact'?'Impacto registrado, sin valoración ambiental.':
       'Programa PGA registrado, sin medidas ni aprobación.');
     try{
      const fresh=await reader.loadProject(currentProject);
      if(epoch===authEpoch.current)setSelected(fresh);
     }catch(cause){
      if(epoch===authEpoch.current)setError('Registro creado; no se pudo actualizar la ficha: '+message(cause));
     }
    }
   }catch(cause){if(epoch===authEpoch.current)setError(message(cause));}
   finally{if(epoch===authEpoch.current)setBusy(false);}
  }
  async function savePrivateMeasure(values:PrivateMeasureValues){
   if(!reader||!user||!selected||busy)return;
   const epoch=authEpoch.current;
   const projectId=selected.project.id;
   // The form restricts both IDs to this project's loaded catalogs.
   if(!selected.management_programs.some(p=>p.id===values.programId)||
      !selected.environmental_impacts.some(i=>i.id===values.impactId)){
    setError('Programa o impacto fuera del expediente activo; actualizá los registros.');
    return;
   }
   setBusy(true);setError('');setInfo('');
   try{
    const newId=await reader.createMeasure(projectId,values);
    if(epoch!==authEpoch.current)return;
    setCreateMode(null);
    setInfo('Medida '+newId+' creada en borrador y vinculada al impacto declarado. No fue aprobada.');
    // The insert already happened; a subsequent read failure is NOT a failed creation.
    try{
     const fresh=await reader.loadProject(projectId);
     if(epoch===authEpoch.current)setSelected(fresh);
    }catch(cause){
     if(epoch===authEpoch.current)setError('Medida ya creada; no se pudo actualizar el expediente: '+message(cause));
    }
   }catch(cause){if(epoch===authEpoch.current)setError(message(cause));}
   finally{if(epoch===authEpoch.current)setBusy(false);}
  }
  async function savePrivateMonitoring(
   kind:'inspection'|'reference',
   values:PrivateInspectionValues|PrivateEvidenceReferenceValues
  ){
   if(!reader||!user||!selected||busy)return;
   const epoch=authEpoch.current,projectId=selected.project.id;
   // Recheck currently selected project: form options are not an auth boundary.
   const scope={projectId,measures:selected.management_measures,
    inspections:selected.monitoring_inspections};
   let inspection:PrivateInspectionValues|undefined;
   let reference:PrivateEvidenceReferenceValues|undefined;
   try{
    if(kind==='inspection')inspection=validatePrivateInspection(values,scope) as PrivateInspectionValues;
    else reference=validatePrivateEvidenceReference(values,scope) as PrivateEvidenceReferenceValues;
   }catch(cause){setError(message(cause));return;}
   setBusy(true);setError('');setInfo('');
   try{
    if(inspection){
     const {measureId,...entry}=inspection;
     await reader.createInspection(projectId,measureId,entry);
    }else if(reference){
     const {measureId,...entry}=reference;
     await reader.registerEvidence(projectId,measureId,entry);
    }
    if(epoch!==authEpoch.current)return;
    setCreateMode(null);
    setInfo(kind==='inspection'
     ?'Inspección registrada como declaración del usuario; no acredita cumplimiento.'
     :'Referencia documental creada en estado pendiente; no se adjuntó ningún archivo.');
    try{
     const fresh=await reader.loadProject(projectId);
     if(epoch===authEpoch.current)setSelected(fresh);
    }catch(cause){
     if(epoch===authEpoch.current)setError('Registro guardado; la ficha no pudo actualizarse: '+message(cause));
    }
   }catch(cause){if(epoch===authEpoch.current)setError(message(cause));}
   finally{if(epoch===authEpoch.current)setBusy(false);}
  }
  const monitoring=selected?privateMonitoringSummary(selected) as {
   inspections:Array<{id:string;measureName:string;date:string;result:string;note:string;warnings:string[]}>;
   references:Array<{id:string;measureName:string;inspectionId:string;label:string;
    reference:string;status:string;warnings:string[]}>
  }:null;
  return <div className="v2-cloud-workspace">
    <div className="v2-cloud-heading"><span className="v2-cloud-mark"><ArtworkIcon kind="cloud" size={29}/></span>
      <div><strong>Expedientes privados</strong><p>Conexión separada de los datos ficticios de la demostración.</p></div>
      {user&&<button type="button" className="v2-action-button v2-action-muted" disabled={busy} onClick={()=>void logout()}><LogOut size={16}/> Cerrar sesión</button>}
    </div>
    {!client&&<div className="v2-cloud-state" role="status"><ArtworkIcon kind="notice" size={27}/>
      <div><h2>Conexión privada aún no configurada</h2>
      <p>Esta compilación experimental no incluye las variables públicas de Supabase. La demostración local sigue funcionando; no se intentó acceder a ningún expediente.</p>
      <p>Configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY para habilitar el inicio de sesión. Nunca agregar una clave secreta.</p></div></div>}
    {client&&<div className="v2-cloud-note"><ArtworkIcon kind="notice" size={23}/>
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
      {!selected&&<div className="v2-cloud-list" data-private-project-list>
        <div className="amb-private-list-header">
         <div><h2>Mis expedientes</h2><p>Registros privados de esta cuenta, protegidos por las reglas RLS del servidor.</p></div>
         <button type="button" className="v2-action-button" disabled={busy}
          onClick={()=>{setCreateMode(createMode==='project'?null:'project');setError('');}}>
           {createMode==='project'?'Cerrar formulario':'Nuevo expediente privado'}</button>
        </div>
        {createMode==='project'&&<PrivateIntakeForm kind="project" busy={busy}
         onSave={values=>savePrivateRecord('project',values)}
         onCancel={()=>setCreateMode(null)}/>}
        {!busy&&!projects.length&&<p>Aún no hay expedientes disponibles para esta cuenta.</p>}
        {projects.map(p=><button type="button" key={p.id} disabled={busy}
          className="v2-cloud-project" onClick={()=>void openProject(p.id)}>
          <ArtworkIcon kind="folder" size={27}/><span><strong>{p.name}</strong><small>{p.province} · {p.project_phase} · {p.status}</small></span>
          <span aria-hidden="true">›</span>
        </button>)}
      </div>}
      {selected&&<div className="v2-cloud-detail">
        <button type="button" className="v2-cloud-switch" disabled={busy}
         onClick={()=>{setSelected(null);setCreateMode(null);}}>← Volver a mis expedientes</button>
        <h2>{selected.project.name}</h2>
        <p>{selected.project.province} · {selected.project.status}</p>
        <p className="amb-private-source" role="note">Fuente: expediente privado autenticado.
         Son declaraciones registradas, no mediciones verificadas, dictámenes
         ni documentos oficiales acreditados. No se mezclan con Diablillos DEMO.</p>
        <div className="v2-cloud-counts">
          {([['Impactos',selected.environmental_impacts.length],['Programas PGA',selected.management_programs.length],
            ['Medidas',selected.management_measures.length],['Inspecciones',selected.monitoring_inspections.length],
            ['Evidencias',selected.environmental_evidence.length],['Hallazgos',selected.audit_findings.length],
            ['Acciones correctivas',selected.corrective_actions.length]] as [string,number][]).map(([label,count])=>
              <div key={label}><span>{label}</span><strong>{count}</strong></div>)}
        </div>
        <section className="amb-private-bootstrap" data-private-records>
         <div className="amb-private-list-header">
          <div><h3>Identificación ambiental del expediente</h3>
           <p>Alta de impactos y programas PGA; evaluación y aprobación profesional pendientes.</p></div>
          <div className="amb-private-actions">
           <button type="button" disabled={busy} onClick={()=>setCreateMode(createMode==='impact'?null:'impact')}>Registrar impacto</button>
           <button type="button" disabled={busy} onClick={()=>setCreateMode(createMode==='program'?null:'program')}>Nuevo programa PGA</button>
           <button type="button" disabled={busy} onClick={()=>setCreateMode(createMode==='measure'?null:'measure')}>Nueva medida vinculada</button>
          </div>
         </div>
         {(createMode==='impact'||createMode==='program')&&
          <PrivateIntakeForm kind={createMode} busy={busy}
           onSave={values=>savePrivateRecord(createMode,values)}
           onCancel={()=>setCreateMode(null)}/>}
         {createMode==='measure'&&<PrivateMeasureForm
          projectId={selected.project.id}
          programs={selected.management_programs}
          impacts={selected.environmental_impacts}
          busy={busy} onSave={savePrivateMeasure}
          onCancel={()=>setCreateMode(null)}/>} 
         <div className="amb-private-record-grid">
          <div><h4>Impactos identificados · {selected.environmental_impacts.length}</h4>
           {!selected.environmental_impacts.length&&<p>Sin impactos registrados.</p>}
           {selected.environmental_impacts.map(i=><div key={i.id}>
            <strong>{i.code||i.id} · {i.title||'Impacto sin título'}</strong>
            <small>{i.factor||'Factor pendiente'} · {i.project_phase||'Sin etapa'} · {i.sign||'Sin naturaleza'}</small>
           </div>)}
          </div>
          <div><h4>Programas PGA · {selected.management_programs.length}</h4>
           {!selected.management_programs.length&&<p>Sin programas registrados.</p>}
           {selected.management_programs.map(p=><div key={p.id}>
            <strong>{p.code||p.id} · {p.name||'Programa sin nombre'}</strong>
            <small>{p.category||'Categoría pendiente'}</small>
           </div>)}
          </div>
         </div>
         <div className="amb-private-measure-register" data-private-measures>
          <h4>Medidas del PGA vinculadas · {selected.management_measures.length}</h4>
          {!selected.management_measures.length&&
           <p>No hay medidas registradas en este expediente. Elegí un programa y un impacto
            antes de añadir la primera.</p>}
          {(privateMeasureSummary(selected.management_measures,
            selected.measure_impact_links,selected.environmental_impacts,
            selected.management_programs,selected.project.id) as MeasureSummary[]).map(m=>
            <article key={m.id} data-private-measure={m.id}>
             <div><strong>{m.title}</strong>
              <small>ID: {m.id} · Programa: {m.programLabel}</small>
              <small>Impactos vinculados: {m.impactLabels.length?m.impactLabels.join(' · '):'Sin vínculos'}</small>
              {m.problems.length>0&&
               <p className="amb-private-measure-warning" role="status">{m.problems.join(' · ')}</p>}
             </div>
             <span className="amb-private-draft-state">{m.status==='draft'?'Borrador':m.status.replaceAll('_',' ')}</span>
            </article>)}
          <p>Los enlaces provienen de <code>measure_impact_links</code>; no se deducen
           por coincidencias de nombres ni constituyen acreditación de cumplimiento.</p>
         </div>
        </section>
        <CloudEvidencePilot projectId={selected.project.id} measures={selected.management_measures}
          evidence={selected.environmental_evidence} reader={reader!} onUploaded={async()=>{
           if(user&&reader){const latest=await reader.loadProject(selected.project.id);setSelected(latest);}
          }}/>
        <p className="v2-cloud-readonly">Los vínculos entre impactos, medidas, monitoreo y matrices profesionales
         aún no están conectados al expediente real. El rol de revisor independiente y
         las aprobaciones permanecen inhabilitados hasta diseñar políticas y comprobar
         acceso cruzado con dos usuarios autenticados distintos.</p>
      </div>}
    </div>}
  </div>;
}
