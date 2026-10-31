import {useState,type FormEvent} from 'react';
import {ShieldCheck,FileUp,Download} from 'lucide-react';
// @ts-ignore: reuse backend-bound V1 validation module
import {validateEvidenceFile} from '../../../../../web/cloud/file-evidence.mjs';
type Row={id:string;measure_id?:string;title?:string;label?:string;original_file_name?:string|null;storage_path?:string|null;file_size_bytes?:number|null;sha256_client?:string|null;status?:string};
type Repo={
 uploadEvidenceFile:(projectId:string,measureId:string,values:{label:string;file:File})=>Promise<unknown>;
 downloadEvidence:(record:Row)=>Promise<{blob:Blob;name:string}>;
};
type Props={projectId:string;measures:Row[];evidence:Row[];reader:Repo;onUploaded:()=>Promise<void>};
export const PRIVATE_EVIDENCE_ENABLED=import.meta.env.VITE_ENABLE_PRIVATE_EVIDENCE_UPLOAD==='true';
export function CloudEvidencePilot({projectId,measures,evidence,reader,onUploaded}:Props){
 const [measureId,setMeasureId]=useState(measures[0]?.id??'');
 const [description,setDescription]=useState('');
 const [file,setFile]=useState<File|null>(null);
 const [error,setError]=useState('');
 const [info,setInfo]=useState('');
 const [busy,setBusy]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!PRIVATE_EVIDENCE_ENABLED)return;
  setError('');setInfo('');
  try{
   if(!measures.some(m=>m.id===measureId))throw Error('Seleccioná una medida del expediente.');
   if(!file)throw Error('Seleccioná un archivo.');
   validateEvidenceFile(file);
   if(description.trim().length<3||description.length>320)throw Error('Descripción entre 3 y 320 caracteres.');
   setBusy(true);
   await reader.uploadEvidenceFile(projectId,measureId,{label:description.trim(),file});
   setInfo('Archivo cargado en almacenamiento privado como evidencia pendiente, sujeto a las políticas RLS del servidor. No fue aprobado.');
   setDescription('');setFile(null);
   await onUploaded();
  }catch(cause){setError(cause instanceof Error?cause.message:'Error al enviar evidencia.');}
  finally{setBusy(false);}
 }
 async function download(row:Row){
  if(!PRIVATE_EVIDENCE_ENABLED||!row.storage_path)return;
  setError('');setInfo('');setBusy(true);
  try{
   const data=await reader.downloadEvidence(row);
   const url=URL.createObjectURL(data.blob);
   const link=document.createElement('a');
   link.href=url;link.download=data.name.replace(/[/\\\u0000-\u001f]/g,'_').slice(0,120)||'evidencia';
   document.body.appendChild(link);link.click();link.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),30000);
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo descargar el archivo privado.');}
  finally{setBusy(false);}
 }
 return <section className="v2-private-evidence" aria-label="Evidencias privadas">
  <h3><ShieldCheck size={18}/> Evidencia privada · piloto autenticado</h3>
  <p>Solo para expedientes reales de tu cuenta, con acceso controlado por Supabase RLS. Los archivos se cargan como <strong>pendientes</strong>: nunca se aprueban automáticamente.</p>
  {!PRIVATE_EVIDENCE_ENABLED&&<p className="v2-private-hold" role="status">Carga privada bloqueada por seguridad en esta compilación. Falta habilitar el piloto y completar pruebas con dos usuarios reales.</p>}
  {PRIVATE_EVIDENCE_ENABLED&&<>
   {!measures.length?<p>Este expediente todavía no tiene medidas registradas: no se pueden adjuntar evidencias.</p>:<form onSubmit={event=>void submit(event)}>
    <label>Medida ambiental<select value={measureId} onChange={ev=>setMeasureId(ev.target.value)} required>
      {measures.map(m=><option key={m.id} value={m.id}>{m.title||m.id}</option>)}</select></label>
    <label>Descripción de la evidencia<input value={description} onChange={ev=>setDescription(ev.target.value)} required minLength={3} maxLength={320}/></label>
    <label>PDF, JPG o PNG (máximo 5 MiB)<input aria-label="Archivo privado" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={ev=>{setFile(ev.target.files?.[0]??null);setError('');}} required/></label>
    <button type="submit" className="v2-action-button" disabled={busy||!file||!measureId}><FileUp size={16}/> {busy?'Cargando…':'Subir como pendiente'}</button>
   </form>}
   <div className="v2-private-records">
    <strong>Adjuntos de este expediente</strong>
    {!evidence.some(e=>e.storage_path)&&<p>Aún no hay archivos privados.</p>}
    {evidence.filter(e=>e.storage_path).map(e=><div className="v2-private-file" key={e.id}>
      <span><strong>{e.label}</strong><small>{e.original_file_name??'Archivo'} · {e.status??'pendiente'} · {e.file_size_bytes??0} bytes</small></span>
      <button type="button" disabled={busy} onClick={()=>void download(e)}><Download size={16}/> Descargar</button>
    </div>)}
   </div>
  </>}
  {error&&<p role="alert" className="v2-cloud-error">{error}</p>}
  {info&&<p role="status" className="v2-cloud-info">{info}</p>}
  <p className="v2-cloud-readonly">Las pruebas de dos usuarios, autorización cruzada y recuperación de archivos están pendientes. La demo Diablillos y sus archivos locales no se suben a Supabase.</p>
 </section>;
}
