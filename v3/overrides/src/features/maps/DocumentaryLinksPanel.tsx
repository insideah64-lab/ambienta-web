import {useEffect,useState,type ChangeEvent} from 'react';
import {Link} from 'react-router-dom';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
// @ts-ignore: pure Node/browser contract
import {proposeDocumentLinks,reviewDocumentLink,matchesDocumentContext,exportDocumentReview} from './documentary-links.mjs';
import './documentary-links.css';
type Entry={recordId:string;recordType:string;pointRef:string;zoneId:string|null;
 status:string;sourceId:string|null;observedAt:string|null;accuracyMeters:number|null;
 boundaryDistanceMeters:number|null;metadataComplete:boolean;review:null|{
 reviewer:string;reason:string;reviewedAt:string;decision:string}};
type Proposal={schema:string;origin:{inputSha256:string;scenarioSha256:string;scenarioCreatedAt:string;
 scenarioBbox:number[]};entries:Entry[]};
type Props={report:any;scenario:any};
export const DOC_REVIEW_KEY=IS_DIABLILLOS_CASE?
 'ambienta-documentary-review-diablillos-v36':'ambienta-documentary-review-demo-v36';
const labels:Record<string,string>={
 awaiting_review:'Pendiente de revisión humana',needs_metadata:'Metadatos incompletos',
 needs_spatial_review:'Revisar ubicación / precisión',approved:'Aceptado para vínculo de QA',
 rejected:'Rechazado por revisor'};
function download(name:string,value:unknown){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'}));
 const el=document.createElement('a');el.href=url;el.download=name;document.body.appendChild(el);el.click();el.remove();
 setTimeout(()=>URL.revokeObjectURL(url),500);
}
export function DocumentaryLinksPanel({report,scenario}:Props){
 const [records,setRecords]=useState<any[]|null>(null);
 const [proposals,setProposals]=useState<Proposal|null>(null);
 const [reviewer,setReviewer]=useState('');
 const [reason,setReason]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [active,setActive]=useState('all');
 useEffect(()=>{setRecords(null);setProposals(null);setError('');setNotice('');setActive('all');},[report]);
 const current=proposals&&matchesDocumentContext(proposals,report)?proposals:null;
 function rebuild(items:any[]){
  const result=proposeDocumentLinks(report,items,new Date().toISOString(),scenario) as Proposal;
  setRecords(items);setProposals(result);setError('');setNotice('Propuestas calculadas sin modificar las fichas ambientales.');
 }
 async function importRecords(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  setProposals(null);setRecords(null);setNotice('');setError('');
  try{
   if(file.size>262144)throw Error('El archivo supera el límite de 256 KiB.');
   const value=JSON.parse(await file.text());
   if(value?.schema!=='ambienta-monitoring-input-v1'||!Array.isArray(value.records))
    throw Error('Usá una plantilla JSON V3.6 con la colección records.');
   rebuild(value.records);
  }catch(cause){setError(cause instanceof Error?cause.message:'Archivo documental inválido.');}
 }
 function template(){
  download('ambienta-v36-plantilla-registros.json',{schema:'ambienta-monitoring-input-v1',
   note:'Plantilla para monitoreo/inspección. Completar con datos y respaldo REAL verificable; no es una medición.',
   records:report.points.slice(0,30).map((p:any,i:number)=>({
    id:'REG-'+String(i+1).padStart(3,'0'),pointRef:p.ref,
    recordType:'monitoring',observedAt:'',method:'',sourceUri:'',
    sourceId:'',accuracyMethod:'',accuracyMeters:null,evidenceSha256:''
   }))});
 }
 function qaFixture(){
  const rows=report.points.map((p:any,i:number)=>({
   id:'QA-V36-'+String(i+1).padStart(3,'0'),pointRef:p.ref,recordType:i%2?'inspection':'monitoring',
   observedAt:new Date().toISOString(),method:'Prueba sintética V3.6, sin salida de campo',
   sourceUri:'qa:geojson-puntos-de-ensayo',sourceId:'QA-V35-SOURCE',
   accuracyMethod:'Precisión simulada exclusivamente para QA',
   accuracyMeters:1,evidenceSha256:report.provenance.inputSha256
  }));
  try{rebuild(rows);setNotice('Registros FICTICIOS creados para probar el filtro y la revisión; SHA del archivo de puntos, no de mediciones.');}
  catch(cause){setError(cause instanceof Error?cause.message:'QA bloqueada.');}
 }
 function review(id:string,decision:'approve'|'reject'){
  if(!current)return;
  try{
   setProposals(reviewDocumentLink(current,report,id,decision,reviewer.trim(),reason.trim(),new Date().toISOString()));
   setError('');setNotice('Decisión humana registrada en esta sesión; NO acredita medición ni cumplimiento.');
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo revisar el registro.');}
 }
 function exportReport(){
  if(!current)return;
  try{download('ambienta-v36-revision-documental.json',exportDocumentReview(current,report));setError('');}
  catch(cause){setError(cause instanceof Error?cause.message:'Exportación bloqueada.');}
 }
 function saveSummary(){
  if(!current)return;
  try{
   const summary={schema:'ambienta-documentary-summary-v1',status:'LOCAL_QA_NOT_CERTIFIED',
    projectCase:IS_DIABLILLOS_CASE?'diablillos':'demo',savedAt:new Date().toISOString(),
    origin:structuredClone(current.origin),records:current.entries.map(e=>({
     recordId:e.recordId,recordType:e.recordType,pointRef:e.pointRef,
     zoneId:e.zoneId,status:e.status,review:e.review}))};
   const raw=JSON.stringify(summary);
   if(raw.length>140000)throw Error('Resumen demasiado extenso.');
   localStorage.setItem(DOC_REVIEW_KEY,raw);
   window.dispatchEvent(new Event('ambienta:document-review-updated'));
   setError('');setNotice('Resumen QA guardado localmente para su consulta desde Monitoreo. No se modificó el expediente.');
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo guardar el resumen.');}
 }
 const counts={ready:current?.entries.filter(e=>e.status==='awaiting_review').length||0,
  approved:current?.entries.filter(e=>e.status==='approved').length||0,
  blocked:current?.entries.filter(e=>e.status.startsWith('needs_')).length||0};
 const shown=current?.entries.filter(e=>active==='all'||e.status===active)||[];
 return <section className="sig-doc-panel" aria-label="Revisión documental de puntos" data-document-review="true">
  <div className="sig-doc-heading"><div><small>AMBIENTA · MAPAS Y SIG · V3.6 EXPERIMENTAL</small>
   <h3>De puntos geográficos a propuestas documentales</h3></div>
   <span>REVISIÓN OBLIGATORIA</span></div>
  <p>Importá metadatos de monitoreo o inspección con <strong>ID, fecha, método, precisión y respaldo declarado</strong>.
   Se comprueba si el margen de precisión alcanza algún límite territorial; las coincidencias no crean vínculos en el expediente.</p>
  <div className="sig-doc-actions">
   <button type="button" onClick={template}>Descargar plantilla JSON</button>
   <label>Importar registros JSON <input type="file" accept=".json,application/json"
    aria-label="Importar registros documentales V3.6" onChange={importRecords}/></label>
   <button type="button" onClick={qaFixture} data-doc-seed="true">Generar registros ficticios QA</button>
  </div>
  {records&&<p className="sig-doc-context" data-document-records={records.length}>
   {records.length} registros analizados · capa <code>{report.provenance.inputSha256.slice(0,12)}…</code>
   · escenario <code>{report.provenance.scenarioSha256.slice(0,12)}…</code></p>}
  {current&&<div className="sig-doc-results">
   <div className="sig-doc-stats">
    <span><strong data-doc-pending="true">{counts.ready}</strong> por revisar</span>
    <span><strong data-doc-approved="true">{counts.approved}</strong> aceptados QA</span>
    <span><strong data-doc-blocked="true">{counts.blocked}</strong> bloqueados</span>
   </div>
   <div className="sig-doc-reviewer">
    <label>Nombre del revisor <input value={reviewer} onChange={e=>setReviewer(e.target.value)}
     placeholder="Nombre de quien revisa" maxLength={120}/></label>
    <label>Motivo y respaldo de la decisión <input value={reason} onChange={e=>setReason(e.target.value)}
     placeholder="Explicar la verificación realizada" maxLength={500}/></label>
   </div>
   <label className="sig-doc-filter">Estado <select aria-label="Filtrar revisión V3.6" value={active}
    onChange={e=>setActive(e.target.value)}>
     <option value="all">Todos</option>
     {Object.entries(labels).map(([value,label])=><option value={value} key={value}>{label}</option>)}
    </select></label>
   <div className="sig-doc-records">{shown.slice(0,80).map(e=><article key={e.recordId}
    className="sig-doc-record" data-doc-record={e.recordId} data-doc-status={e.status}>
    <div><strong>{e.recordId}</strong> <small>{e.recordType} · punto {e.pointRef}</small></div>
    <div><b>{labels[e.status]||e.status}</b>
     <small>{e.zoneId?'Zona '+e.zoneId:'Sin zona documental asignable'} · Fuente: {e.sourceId||'no indicada'}</small>
     {e.accuracyMeters!==null&&<small>Precisión declarada: {e.accuracyMeters} m · distancia estimada al límite: {e.boundaryDistanceMeters===null?'no calculable':e.boundaryDistanceMeters+' m'}</small>}
     {e.review&&<small>Revisado por {e.review.reviewer} · {e.review.reason}</small>}
    </div>
    {e.status==='awaiting_review'&&<div className="sig-doc-decision">
     <button type="button" onClick={()=>review(e.recordId,'approve')}>Aceptar vínculo QA</button>
     <button type="button" onClick={()=>review(e.recordId,'reject')}>Rechazar</button>
    </div>}
   </article>)}</div>
   {shown.length>80&&<small>La lista presenta 80 entradas; el archivo exportado incluye todas.</small>}
   {!shown.length&&<p>Sin registros con ese estado.</p>}
   <div className="sig-doc-actions">
    <button type="button" onClick={exportReport}>Exportar auditoría JSON</button>
    <button type="button" onClick={saveSummary}>Guardar resumen QA para Monitoreo</button>
    <Link to="/monitoreo">Abrir Monitoreo</Link>
   </div>
  </div>}
  {error&&<p role="alert" className="sig-doc-error">{error}</p>}
  {notice&&<p role="status" className="sig-doc-notice">{notice}</p>}
  <small className="sig-doc-warning">V3.6 no verifica la autenticidad de archivos ni el sistema de referencia de un instrumento.
   La precisión se usa como filtro geométrico conservador, NO como garantía de exactitud. Toda aceptación es provisional
   y local, no una inspección, medición acreditada o dictamen ambiental. Los datos importados permanecen en memoria;
   solo un resumen sin coordenadas puede guardarse con autorización explícita.</small>
 </section>;
}
