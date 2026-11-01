import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import type {DemoState} from '../../lib/demo';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
// @ts-ignore: local spatial linkage contract
import {readSpatialBrowserContext} from './spatial-links.mjs';
// @ts-ignore: native Node/browser summary checks
import {validateDocumentSummary,countDocumentStatuses} from './documentary-summary.mjs';
import {DOC_REVIEW_KEY} from './DocumentaryLinksPanel';
import './documentary-links.css';
export function DocumentaryReviewSummary({data}:{data:DemoState}){
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  const reload=()=>setRefresh(v=>v+1);
  window.addEventListener('ambienta:document-review-updated',reload);
  window.addEventListener('storage',reload);
  window.addEventListener('focus',reload);
  return ()=>{window.removeEventListener('ambienta:document-review-updated',reload);
   window.removeEventListener('storage',reload);window.removeEventListener('focus',reload);};
 },[]);
 const state=useMemo(()=>{
  let raw=null;
  try{const value=localStorage.getItem(DOC_REVIEW_KEY);
   if(!value)return {status:'empty',summary:null};
   if(value.length>140000)return {status:'blocked',summary:null};
   raw=JSON.parse(value);
  }catch{return {status:'blocked',summary:null};}
  const {scenario}=readSpatialBrowserContext(data,IS_DIABLILLOS_CASE);
  return validateDocumentSummary(raw,scenario,IS_DIABLILLOS_CASE?'diablillos':'demo');
 },[data,refresh]);
 const summary=state.summary;
 const counts=countDocumentStatuses(summary);
 return <section className="sig-doc-panel" aria-label="Resumen de revisión espacial de registros"
  data-document-monitoring={state.status}>
  <div className="sig-doc-heading"><div><small>MONITOREO · TRAZABILIDAD EXPERIMENTAL V3.6</small>
   <h3>Revisión espacial de registros externos</h3></div><span>NO CERTIFICADO</span></div>
  {state.status==='empty'&&<p>Todavía no existe un resumen documental de SIG.
   <Link to="/mapas"> Analizar puntos y preparar registros en Mapas y SIG.</Link></p>}
  {state.status==='stale'&&<p role="alert">El resumen guardado corresponde a otro perímetro o generación de ensayo.
   Queda invalidado y no se muestran vínculos anteriores.</p>}
  {state.status==='blocked'&&<p role="alert">El resumen local no supera la comprobación de integridad
   y no se utiliza en Monitoreo.</p>}
  {state.status==='ready'&&summary&&<>
   <p>Resumen local de propuestas de vinculación (sin coordenadas), guardado el {summary.savedAt}.
    El archivo original de puntos y los respaldos NO se revalidan desde esta pantalla.</p>
   <div className="sig-doc-stats" data-doc-summary="true">
    <span><strong>{counts.total}</strong> registros</span>
    <span><strong>{counts.approved}</strong> aceptados QA</span>
    <span><strong>{counts.blocked+counts.pending}</strong> sin aceptación</span>
   </div>
   <p className="sig-doc-context">Origen puntual: <code>{summary.origin.inputSha256.slice(0,16)}…</code></p>
   <div className="sig-doc-records">{summary.records.slice(0,20).map((r:any)=>
    <article key={r.recordId} className="sig-doc-record" data-monitored-record={r.recordId}>
     <strong>{r.recordId}</strong>
     <div><b>{r.recordType==='inspection'?'Inspección':'Monitoreo'} · {r.status}</b>
      <small>Punto {r.pointRef} · {r.zoneId?'Zona '+r.zoneId:'Sin zona aceptada'}</small></div>
     <small>{r.review?'Revisor declarado: '+r.review.reviewer:'Sin revisión humana'}</small>
    </article>)}</div>
   {summary.records.length>20&&<small>Se muestran los primeros 20 registros del resumen.</small>}
   <p><Link to="/mapas">Regresar a Mapas y SIG para analizar o exportar la auditoría.</Link></p>
  </>}
  <small className="sig-doc-warning">Este panel no edita los registros propios del expediente.
   Un vínculo aceptado para ensayo no certifica una inspección real, el archivo de respaldo
   ni una obligación ambiental.</small>
 </section>;
}
