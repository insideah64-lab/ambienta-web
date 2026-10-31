import {useState,type ChangeEvent,type FormEvent} from 'react';
import type {DemoState} from '../../lib/demo';
import type {Transaction} from '../../lib/transactions';
import {registerEvidence} from '../../lib/transactions';
// @ts-ignore: pure JS helper shared with Node native tests
import {formatFingerprintReference,parseFingerprintReference} from './fingerprint.mjs';
type Props={data:DemoState;onApply:(transaction:Transaction,message:string)=>void};
type Fingerprint={name:string;bytes:number;sha256:string};
async function digestFile(file:File):Promise<Fingerprint>{
 if(!/\.(pdf|csv|json|txt|png|jpe?g)$/i.test(file.name))throw new Error('Formato no admitido: PDF, CSV, JSON, TXT, PNG y JPG.');
 if(file.size>10485760||file.size===0)throw new Error('Elegí un archivo entre 1 byte y 10 MiB.');
 const buffer=await file.arrayBuffer();
 const digest=await crypto.subtle.digest('SHA-256',buffer);
 const sha256=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
 return {name:file.name,bytes:file.size,sha256};
}
export function EvidenceIntegrityLab({data,onApply}:Props){
 const [current,setCurrent]=useState<Fingerprint|null>(null);
 const [compare,setCompare]=useState<Fingerprint|null>(null);
 const [measureId,setMeasureId]=useState(data.measures[0]?.id||'');
 const [actor,setActor]=useState('Responsable Ambiental DEMO');
 const [selected,setSelected]=useState('');
 const [label,setLabel]=useState('Archivo de prueba con huella SHA-256');
 const [error,setError]=useState('');
 const [working,setWorking]=useState(false);
 const hashed=data.evidence.filter(e=>parseFingerprintReference(e.reference));
 async function read(ev:ChangeEvent<HTMLInputElement>,mode:'new'|'compare'){
  const file=ev.target.files?.[0];ev.target.value='';if(!file)return;
  setError('');setWorking(true);
  try{const fp=await digestFile(file);if(mode==='new')setCurrent(fp);else setCompare(fp);}
  catch(cause){setError(cause instanceof Error?cause.message:'No se pudo leer el archivo.');}
  finally{setWorking(false);}
 }
 function submit(ev:FormEvent<HTMLFormElement>){
  ev.preventDefault();setError('');
  if(!current||!measureId||!actor.trim()||!label.trim()){setError('Completá el archivo, medida, autor y descripción.');return;}
  try{
   onApply(registerEvidence({measureId,inspectionId:'',label:label.trim(),
    reference:formatFingerprintReference(current.name,current.bytes,current.sha256)},actor.trim()),
    'Huella documental SHA-256 registrada como metadato DEMO, sin almacenar el archivo.');
   setCurrent(null);
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo registrar la referencia.');}
 }
 const record=hashed.find(e=>e.id===selected);
 const expected=record?parseFingerprintReference(record.reference):null;
 const matches=expected&&compare?expected.sha256===compare.sha256&&expected.bytes===compare.bytes:null;
 return <section className="v2-integrity-lab" aria-label="Laboratorio de integridad documental local">
  <h3>Laboratorio SHA-256 · solo metadatos</h3>
  <p>Calculá una huella del archivo original en este navegador. AMBIENTA guarda únicamente nombre, tamaño y hash vinculados a una medida; <strong>NO almacena el archivo, no certifica su autenticidad ni controla permisos de servidor.</strong></p>
  <form onSubmit={submit}>
   <label>Archivo para registrar huella
    <input aria-label="Archivo para calcular huella" type="file" accept=".pdf,.csv,.json,.txt,.png,.jpg,.jpeg"
      disabled={working} onChange={e=>void read(e,'new')}/></label>
   <label>Medida relacionada<select aria-label="Medida vinculada a huella" value={measureId} onChange={e=>setMeasureId(e.target.value)}>
    {data.measures.map(m=><option value={m.id} key={m.id}>{m.id} · {m.title}</option>)}</select></label>
   <label>Autor declarado<input aria-label="Autor de huella" value={actor} onChange={e=>setActor(e.target.value)} maxLength={120}/></label>
   <label>Descripción<input aria-label="Descripción de huella" value={label} onChange={e=>setLabel(e.target.value)} maxLength={300}/></label>
   {current&&<div className="v2-hash-summary" data-file-hash="computed">
    <strong>{current.name} · {current.bytes} bytes</strong><code>SHA-256: {current.sha256}</code></div>}
   <button type="submit" className="v2-action-button" disabled={!current||working}>Registrar solo huella y metadatos</button>
  </form>
  <div className="v2-verify-form">
   <h4>Comparar un archivo local con una huella registrada</h4>
   <label>Referencia registrada<select aria-label="Huella registrada" value={selected} onChange={e=>{setSelected(e.target.value);setCompare(null);}}>
     <option value="">Seleccionar referencia</option>{hashed.map(e=><option key={e.id} value={e.id}>{e.id} · {e.label}</option>)}</select></label>
   <label>Archivo a comparar<input aria-label="Archivo para comparar huella" type="file"
     accept=".pdf,.csv,.json,.txt,.png,.jpg,.jpeg" disabled={!selected||working} onChange={e=>void read(e,'compare')}/></label>
   {matches!==null&&<div className={matches?'v2-hash-match':'v2-hash-mismatch'} role="status">
     {matches?'Coincide la huella y el tamaño registrados.':'NO COINCIDE la huella o el tamaño con el archivo registrado.'}
   </div>}
  </div>
  {error&&<p className="v2-integrity-error" role="alert">{error}</p>}
  <p className="v2-integrity-warning">El nombre del autor es declarativo; una prueba RLS/Storage y la custodia de bytes originales siguen pendientes.</p>
 </section>;
}
