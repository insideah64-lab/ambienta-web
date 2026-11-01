import {useEffect,useMemo,useState,type FormEvent} from 'react';
import type {DemoState} from '../../lib/demo';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
// @ts-ignore: native Node/browser measurement model
import {measurementsKey,readMeasurementBook} from '../monitoring/measurements.mjs';
// @ts-ignore: pure GIS-to-measurement source contracts
import {stationLinksKey,stationContext,readStationLinks,proposeStationLink,
 reviewStationLink,stationLinkSummary,exportStationLinks} from './station-links.mjs';
import './station-links.css';
type Props={data:DemoState;report:any;layer:any;scenario:any};
type Entry={stationId:string;pointRef:string;status:string;zoneId:string|null;
 sourceId:string;accuracyMeters:number;boundaryDistanceMeters:number|null;
 reason:string;proposer:string;review:null|{reviewer:string;reason:string;reviewedAt:string}};
type Book={entries:Entry[];origin:unknown;createdAt:string;updatedAt:string};
const key=stationLinksKey(IS_DIABLILLOS_CASE);
const measurementKey=measurementsKey(IS_DIABLILLOS_CASE);
function download(value:unknown){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.download='ambienta-v39-estaciones-vinculos-qa.json';a.href=url;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
}
const display:Record<string,string>={awaiting_review:'Pendiente de revisión humana',
 needs_spatial_review:'Requiere revisión SIG · no vinculable',accepted_qa:'Aceptado solo para QA',
 rejected:'Rechazado'};
export function StationLinkPanel({data,report,layer,scenario}:Props){
 const [revision,setRevision]=useState(0);
 const [input,setInput]=useState({stationId:'',pointRef:'',sourceId:'',positionMethod:'',
  positionObservedAt:'',accuracyMeters:'',proposer:''});
 const [reviewer,setReviewer]=useState(''),[reason,setReason]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const source=useMemo(()=>{
  try{
   const measurements=readMeasurementBook(localStorage,measurementKey,data);
   if(!measurements.book)return {ctx:null,status:'measurements_blocked',reason:measurements.reason};
   const ctx=stationContext({book:measurements.book,data,report,layer,scenario});
   const found=readStationLinks(localStorage,key,ctx);
   return {ctx,...found};
  }catch(cause){return {ctx:null,status:'blocked',book:null,
   reason:cause instanceof Error?cause.message:'No se pudo validar el contexto de estación.'};}
 },[data,report,layer,scenario,revision]);
 useEffect(()=>{const refresh=()=>setRevision(x=>x+1);
  window.addEventListener('focus',refresh);window.addEventListener('storage',refresh);
  window.addEventListener('ambienta:measurements-updated',refresh);
  return ()=>{window.removeEventListener('focus',refresh);window.removeEventListener('storage',refresh);
   window.removeEventListener('ambienta:measurements-updated',refresh);};
 },[]);
 const ctx=source.ctx as any|null;
 const book=source.book as Book|null;
 const available=ctx?.stations.filter((id:string)=>!book?.entries.some(e=>e.stationId===id))||[];
 const stats=ctx&&book?stationLinkSummary(book,ctx):null;
 function persist(next:Book){
  if(!ctx||!book)return;
  const currentRaw=localStorage.getItem(key);
  if(currentRaw!==null){
   const existing=readStationLinks(localStorage,key,ctx);
   if(!existing.book||JSON.stringify(existing.book)!==JSON.stringify(book))
    throw Error('El registro cambió en otra pestaña. Revisá antes de guardar.');
  }else if(source.status!=='empty')throw Error('No se puede sustituir un registro inválido.');
  localStorage.setItem(key,JSON.stringify(next));
  setRevision(x=>x+1);
  window.dispatchEvent(new Event('ambienta:stations-updated'));
 }
 function propose(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');setNotice('');if(!ctx||!book)return;
  try{
   const observedAt=new Date(input.positionObservedAt);
   if(Number.isNaN(observedAt.getTime()))throw Error('Fecha de referencia espacial inválida.');
   const proposedAt=new Date().toISOString();
   const next=proposeStationLink(book,ctx,{stationId:input.stationId,pointRef:input.pointRef,
    sourceId:input.sourceId,positionMethod:input.positionMethod,
    accuracyMeters:input.accuracyMeters.trim()===''?NaN:Number(input.accuracyMeters),
    positionObservedAt:observedAt.toISOString(),proposer:input.proposer},proposedAt);
   persist(next);
   setInput({stationId:'',pointRef:'',sourceId:'',positionMethod:'',positionObservedAt:'',
    accuracyMeters:'',proposer:''});
   setNotice('Candidato SIG registrado; no se creó ninguna estación ni se alteraron mediciones.');
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo crear la propuesta.');}
 }
 function decide(id:string,decision:'accept'|'reject'){
  if(!ctx||!book)return;setError('');setNotice('');
  try{
   persist(reviewStationLink(book,ctx,id,decision,reviewer,reason,new Date().toISOString()));
   setNotice('Revisión QA documentada. No constituye ubicación certificada ni cumplimiento.');
  }catch(cause){setError(cause instanceof Error?cause.message:'Revisión no disponible.');}
 }
 return <section className="sig-station-panel sig-doc-panel" aria-label="Estaciones y puntos SIG"
  data-station-panel={source.status}>
  <div className="sig-doc-heading"><div><small>MAPAS Y SIG · V3.9 EXPERIMENTAL</small>
   <h3>Vincular estaciones de medición con puntos geográficos</h3></div>
   <span>NO AUTOMÁTICO</span></div>
  <p>Elegí un identificador de estación que ya exista en Monitoreo y un punto de la capa actual.
   Su coincidencia se propone manualmente: <strong>ningún nombre de estación se transforma en coordenadas</strong>.
   La precisión declarada se contrasta con límites y huecos; la aceptación requiere revisión independiente.</p>
  {!ctx&&<p role="alert" className="sig-doc-error">{source.reason}</p>}
  {ctx&&!ctx.stations.length&&<p data-station-empty="true">No existen estaciones con mediciones activas.
   Registrá primero una muestra en Monitoreo; no se crearán estaciones ficticias automáticamente.</p>}
  {ctx&&!book&&<p role="alert" className="sig-doc-error">Vínculos locales obsoletos o corruptos.
   No se sobrescribe el registro anterior. {source.reason}</p>}
  {ctx&&book&&<>
   <div className="sig-doc-stats" data-station-counts="true">
    <span><strong data-station-accepted="true">{stats?.accepted??0}</strong> aceptadas QA</span>
    <span><strong data-station-pending="true">{stats?.pending??0}</strong> pendientes</span>
    <span><strong data-station-blocked="true">{stats?.reviewSpatial??0}</strong> revisión SIG</span>
   </div>
   {!!available.length&&<form onSubmit={propose} className="sig-station-form">
    <h4>Proponer relación espacial con fuente declarada</h4>
    <div className="sig-station-fields">
     <label>Estación registrada
      <select aria-label="Estación de medición V3.9" required value={input.stationId}
       onChange={e=>setInput(x=>({...x,stationId:e.target.value}))}>
       <option value="">Seleccionar estación</option>
       {available.map((id:string)=><option key={id} value={id}>{id}</option>)}
      </select></label>
     <label>Punto GIS de la capa analizada
      <select aria-label="Punto GIS V3.9" required value={input.pointRef}
       onChange={e=>setInput(x=>({...x,pointRef:e.target.value}))}>
       <option value="">Seleccionar punto</option>
       {ctx.points.map((p:any)=><option key={p.ref} value={p.ref}>
        {p.ref} · {p.name||'Sin nombre'} · {p.status==='inside_zone'?'Zona '+p.zoneId:p.status==='outside_perimeter'?'Exterior':'Límite/revisión'}</option>)}
      </select></label>
     {([
      ['sourceId','Identificador de procedencia'],
      ['positionMethod','Método de geolocalización declarado'],
      ['proposer','Responsable que propone']
     ] as const).map(([name,title])=><label key={name}>{title}
      <input required maxLength={180} aria-label={title} value={input[name]}
       onChange={e=>setInput(x=>({...x,[name]:e.target.value}))}/></label>)}
     <label>Precisión declarada en metros
      <input required type="number" min="0" max="100000" step="any"
       aria-label="Precisión de estación en metros" value={input.accuracyMeters}
       onChange={e=>setInput(x=>({...x,accuracyMeters:e.target.value}))}/></label>
     <label>Fecha y hora de geolocalización
      <input required type="datetime-local" aria-label="Fecha de referencia espacial"
       value={input.positionObservedAt}
       onChange={e=>setInput(x=>({...x,positionObservedAt:e.target.value}))}/></label>
    </div>
    <button type="submit">Proponer enlace de estación</button>
   </form>}
   {book.entries.some(e=>e.status==='awaiting_review')&&<div className="sig-station-reviewer">
    <label>Nombre del revisor independiente
     <input aria-label="Revisor de estación" maxLength={180} value={reviewer}
      onChange={e=>setReviewer(e.target.value)}/></label>
    <label>Justificación documentada
     <input aria-label="Justificación de estación" maxLength={180} value={reason}
      onChange={e=>setReason(e.target.value)}/></label>
   </div>}
   <div className="sig-station-list">
    {book.entries.map(e=><article key={e.stationId} data-station-id={e.stationId}
     data-station-status={e.status}>
     <div><strong>{e.stationId}</strong><small>Punto {e.pointRef} · {e.sourceId}</small>
      <small>Precisión declarada: {e.accuracyMeters} m · distancia estimada al límite: {e.boundaryDistanceMeters??'No disponible'} m</small></div>
     <div><b>{display[e.status]}</b><small>{e.zoneId?'Zona '+e.zoneId:e.reason}</small>
      {e.review&&<small>Revisó {e.review.reviewer}: {e.review.reason}</small>}</div>
     {e.status==='awaiting_review'&&<div className="sig-station-actions">
      <button type="button" onClick={()=>decide(e.stationId,'accept')}>Aceptar enlace QA</button>
      <button type="button" onClick={()=>decide(e.stationId,'reject')}>Rechazar enlace</button>
     </div>}
    </article>)}
    {!book.entries.length&&<p>Sin vínculos propuestos. El análisis espacial de puntos no asigna estaciones por sí solo.</p>}
   </div>
   {!!book.entries.length&&<button type="button"
    onClick={()=>download(exportStationLinks(book,ctx))}>Exportar revisión de estaciones JSON</button>}
  </>}
  {error&&<p role="alert" className="sig-doc-error">{error}</p>}
  {notice&&<p role="status" className="sig-doc-notice">{notice}</p>}
  <small className="sig-doc-warning">V3.9 es una relación documental local sin certificación GPS ni de instrumentación.
   Cambiar capa, polígono, proyecto o mediciones invalida el registro anterior. La exportación no contiene
   coordenadas; para ellas debe consultarse el GeoJSON fuente de Mapas y SIG.</small>
 </section>;
}
