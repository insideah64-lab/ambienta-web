import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import type {DemoState} from '../../lib/demo';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
// @ts-ignore shared study area and AOI validators
import {readPointAoi,aoiKey} from '../maps/aoi-model.mjs';
// @ts-ignore shared study area and AOI validators
import {restoreStudyScenario,studyAreaStorageKey} from '../maps/study-areas.mjs';
// @ts-ignore point classification, always recomputed when original is accessible
import {analyzePointsInStudyAreas} from '../maps/point-zone-analysis.mjs';
// @ts-ignore native registry and source contracts
import {readMeasurementBook,measurementsKey} from './measurements.mjs';
// @ts-ignore native source-bound station contracts
import {stationContext,stationLinksKey,readStationLinks,stationLinkSummary} from '../maps/station-links.mjs';
import '../maps/station-links.css';
const measurementKey=measurementsKey(IS_DIABLILLOS_CASE);
const stationKey=stationLinksKey(IS_DIABLILLOS_CASE);
const layerKey=IS_DIABLILLOS_CASE?'ambienta-gis-diablillos-working-v3':'ambienta-gis-demo-working-v3';
function readContext(data:DemoState){
 const book=readMeasurementBook(localStorage,measurementKey,data);
 if(!book.book)return {status:'blocked',reason:'El registro de mediciones no es válido.',summary:null,entries:[]};
 const bbox=readPointAoi(aoiKey(IS_DIABLILLOS_CASE))?.bbox;
 if(!bbox)return {status:'unverifiable',reason:'No está disponible la ventana territorial.',summary:null,entries:[]};
 let layer:any=null;
 try{
  const text=localStorage.getItem(layerKey);
  if(text&&text.length<=1400000)layer=JSON.parse(text);
 }catch{/* no source reuse */}
 if(!layer)return {status:'unverifiable',reason:'La capa puntual original no está accesible desde Monitoreo.',summary:null,entries:[]};
 const scenario=restoreStudyScenario(studyAreaStorageKey(IS_DIABLILLOS_CASE),bbox,layer.sha256||null);
 if(!scenario)return {status:'unverifiable',reason:'El polígono de estudio ya no coincide con las fuentes guardadas.',summary:null,entries:[]};
 try{
  const report=analyzePointsInStudyAreas({layer,scenario});
  const ctx=stationContext({book:book.book,data,report,layer,scenario});
  const found=readStationLinks(localStorage,stationKey,ctx);
  if(!found.book)return {status:found.status,reason:found.reason,summary:null,entries:[]};
  const summary=stationLinkSummary(found.book,ctx);
  return {status:found.status,reason:'',summary,entries:found.book.entries};
 }catch{
  return {status:'unverifiable',reason:'La capa de puntos no puede cotejarse aquí. Reimportá la fuente y recalculá en Mapas y SIG.',summary:null,entries:[]};
 }
}
export function StationLocationSummary({data}:{data:DemoState}){
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  const reload=()=>setRevision(x=>x+1);
  window.addEventListener('focus',reload);
  window.addEventListener('storage',reload);
  window.addEventListener('ambienta:stations-updated',reload);
  window.addEventListener('ambienta:measurements-updated',reload);
  return ()=>{
   window.removeEventListener('focus',reload);
   window.removeEventListener('storage',reload);
   window.removeEventListener('ambienta:stations-updated',reload);
   window.removeEventListener('ambienta:measurements-updated',reload);
  };
 },[]);
 const current=useMemo(()=>readContext(data),[data,revision]);
 return <section className="sig-station-panel sig-doc-panel" aria-label="Ubicación documental de estaciones"
  data-station-monitoring={current.status}>
  <div className="sig-doc-heading"><div><small>MONITOREO · V3.9 · SOLO LECTURA</small>
   <h3>Estaciones vinculadas a puntos SIG</h3></div><span>NO CERTIFICADO</span></div>
  <p>Solo muestra relaciones documentales explícitas que todavía pueden cotejarse con la capa puntual,
   las mediciones y el escenario territorial actual.</p>
  {current.status!=='ready'&&current.status!=='empty'&&<p role="alert">
   No se reutilizan ubicaciones sin comprobar la fuente vigente. {current.reason}
   <Link to="/mapas"> Revisar en Mapas y SIG</Link>.</p>}
  {(current.status==='ready'||current.status==='empty')&&<>
   <div className="sig-doc-stats" data-station-monitoring-summary="true">
    <span><strong>{current.summary?.accepted??0}</strong> aceptados QA</span>
    <span><strong>{current.summary?.pending??0}</strong> por revisar</span>
    <span><strong>{current.summary?.unlinked??0}</strong> sin asociación</span>
   </div>
   <div className="sig-station-list">{current.entries.slice(0,30).map((row:any)=>
    <article key={row.stationId} data-linked-station={row.stationId}
     data-linked-station-status={row.status}>
     <div><strong>{row.stationId}</strong><small>Punto {row.pointRef} · fuente {row.sourceId}</small></div>
     <div><b>{row.status==='accepted_qa'?'Vínculo aceptado para QA':
      row.status==='awaiting_review'?'Pendiente humano':row.status==='rejected'?'Rechazado':'Revisar geometría'}</b>
      <small>{row.zoneId?'Subárea '+row.zoneId:'No ubicable automáticamente'}</small></div>
    </article>)}</div>
   {!current.entries.length&&<p>No existen vínculos explícitos guardados.</p>}
   <p><Link to="/mapas">Abrir el análisis original en Mapas y SIG</Link>.</p>
  </>}
  <small className="sig-doc-warning">No se incorporan coordenadas al registro de mediciones, ni se reescribe
   evidencia o PGA. La ausencia de la capa original impide afirmar una ubicación vigente.</small>
 </section>;
}
