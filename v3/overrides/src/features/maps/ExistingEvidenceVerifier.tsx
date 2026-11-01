import {useEffect,useMemo,useState,type ChangeEvent} from 'react';
import type {DemoState} from '../../lib/demo';
// @ts-ignore pure local integrity contract
import {eligibleInspectionEvidence,verifyExistingEvidence,matchesEvidenceContext} from './documentary-evidence.mjs';
type Match={schema:string;recordId:string;inspectionId:string;evidenceId:string;
 sha256:string;bytes:number;checkedAt:string};
type Row={recordId:string;recordType:string;status:string;zoneId:string|null};
type Props={data:DemoState;report:any;proposals:{entries:Row[]}|null};
function exportMatch(match:Match){
 const url=URL.createObjectURL(new Blob([JSON.stringify(match,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='ambienta-v37-cotejo-integridad-local.json';
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
}
export function ExistingEvidenceVerifier({data,report,proposals}:Props){
 const [recordId,setRecordId]=useState('');
 const [inspectionId,setInspectionId]=useState('');
 const [evidenceId,setEvidenceId]=useState('');
 const [match,setMatch]=useState<Match|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const records=proposals?.entries.filter(e=>e.status==='approved'&&e.recordType==='inspection')||[];
 const existing=useMemo(()=>data.inspections.filter(i=>
  eligibleInspectionEvidence(data,i.id).length>0),[data]);
 const choices=useMemo(()=>eligibleInspectionEvidence(data,inspectionId),[data,inspectionId]);
 useEffect(()=>{setRecordId('');setInspectionId('');setEvidenceId('');setMatch(null);setError('');},[proposals,report]);
 const validMatch=match&&proposals&&matchesEvidenceContext(match,proposals,report,data)?match:null;
 function resetProof(){setMatch(null);setError('');}
 async function checkFile(ev:ChangeEvent<HTMLInputElement>){
  const file=ev.target.files?.[0];ev.target.value='';
  resetProof();if(!file)return;
  if(!proposals||!recordId||!inspectionId||!evidenceId){
   setError('Seleccioná primero una propuesta, inspección y evidencia registradas.');return;
  }
  if(busy)return;
  setBusy(true);
  try{
   if(file.size<1||file.size>10485760)
    throw Error('El archivo debe tener entre 1 byte y 10 MiB.');
   const buffer=await file.arrayBuffer();
   const digest=await crypto.subtle.digest('SHA-256',buffer);
   const sha256=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
   const result=verifyExistingEvidence({proposals,report,entryId:recordId,inspectionId,
    evidenceId,data,fingerprint:{sha256,bytes:file.size},checkedAt:new Date().toISOString()}) as Match;
   setMatch(result);
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo cotejar el archivo.');}
  finally{setBusy(false);}
 }
 return <section className="sig-doc-evidence" aria-label="Cotejo SHA-256 con evidencia del expediente"
  data-evidence-bridge="v37">
  <div className="sig-doc-heading"><div><small>V3.7 · INTEGRIDAD DOCUMENTAL</small>
   <h3>Comparar archivo con una evidencia existente</h3></div><span>SOLO LECTURA</span></div>
  <p>El cotejo solo está disponible para una <strong>propuesta de inspección revisada</strong>,
   una inspección real del registro actual y una evidencia que la referencie expresamente.
   No registra automáticamente pruebas ni altera el expediente.</p>
  <div className="sig-doc-reviewer">
   <label>Propuesta espacial aceptada para QA
    <select aria-label="Propuesta espacial V3.7" value={recordId} onChange={e=>{setRecordId(e.target.value);resetProof();}}>
     <option value="">Seleccionar propuesta</option>
     {records.map(r=><option key={r.recordId} value={r.recordId}>{r.recordId} · Zona {r.zoneId}</option>)}
    </select></label>
   <label>Inspección existente
    <select aria-label="Inspección existente V3.7" value={inspectionId}
     onChange={e=>{setInspectionId(e.target.value);setEvidenceId('');resetProof();}}>
     <option value="">Seleccionar inspección</option>
     {existing.map(i=><option key={i.id} value={i.id}>{i.id} · medida {i.measureId}</option>)}
    </select></label>
   <label>Evidencia con SHA-256 y referencia a la inspección
    <select aria-label="Evidencia existente V3.7" value={evidenceId}
     onChange={e=>{setEvidenceId(e.target.value);resetProof();}}>
     <option value="">Seleccionar evidencia</option>
     {choices.map((e:{id:string;label:string})=><option key={e.id} value={e.id}>{e.id} · {e.label}</option>)}
    </select></label>
   <label>Archivo original a cotejar (procesado en memoria, máximo 10 MiB)
    <input aria-label="Archivo local para verificar SHA-256 V3.7" type="file"
     accept=".pdf,.csv,.json,.txt,.png,.jpg,.jpeg" disabled={!recordId||!inspectionId||!evidenceId||busy}
     onChange={e=>void checkFile(e)}/></label>
  </div>
  {!records.length&&<p className="sig-doc-context" data-v37-unavailable="unreviewed">
   No hay inspecciones con propuesta espacial aceptada para QA.
   Primero revisá una propuesta de tipo inspección.</p>}
  {!existing.length&&<p className="sig-doc-context" data-v37-unavailable="no-evidence">
   Este expediente no contiene evidencias con huella registrada y relación directa con una inspección.
   Podés registrarlas en Evidencias, sin modificar las ya existentes.</p>}
  {error&&<p role="alert" className="sig-doc-error" data-v37-mismatch="true">{error}</p>}
  {validMatch&&<div className="sig-doc-notice" role="status" data-v37-match="true">
   <strong>Coinciden el SHA-256 y el tamaño del archivo local.</strong>
   <p>Propuesta {validMatch.recordId} · inspección {validMatch.inspectionId}
    · evidencia {validMatch.evidenceId} · {validMatch.bytes} bytes.</p>
   <button type="button" onClick={()=>exportMatch(validMatch)}>
    Exportar acta local de coincidencia JSON</button>
  </div>}
  <p className="sig-doc-warning">Una coincidencia criptográfica identifica la igualdad de bytes respecto de una
   huella registrada. No verifica la autoría, cadena de custodia, medición, ubicación de la inspección,
   identidad del revisor ni cumplimiento ambiental. La comprobación se pierde al cambiar el contexto
   y el archivo original no se conserva.</p>
 </section>;
}
