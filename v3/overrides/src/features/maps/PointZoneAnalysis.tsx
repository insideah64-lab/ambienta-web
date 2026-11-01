import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
// @ts-ignore: GIS point classification is shared with Node tests
import {analyzePointsInStudyAreas,analysisMatchesContext} from './point-zone-analysis.mjs';
// @ts-ignore: browser/Node study scenario contract
import {restoreStudyScenario,studyAreaStorageKey} from './study-areas.mjs';
// @ts-ignore: browser/Node AOI contract
import {readPointAoi,aoiKey} from './aoi-model.mjs';
import './point-zone-analysis.css';

type Row={ref:string;name:string;coordinate:number[];status:string;zoneId:string|null;reason:string};
type Report={schema:string;points:Row[];status:string;
 summary:{totalCount:number;insideCount:number;outsideCount:number;reviewCount:number;
  perZone:{id:string;label:string;color:string;count:number}[]};
 provenance:{inputSha256:string;scenarioSha256:string;scenarioCreatedAt:string;scenarioBbox:number[]}};
const GIS_KEY=IS_DIABLILLOS_CASE?'ambienta-gis-diablillos-working-v3':'ambienta-gis-demo-working-v3';
function readInputs(){
 const aoi=readPointAoi(aoiKey(IS_DIABLILLOS_CASE));
 let layer:any=null;
 try{const value=localStorage.getItem(GIS_KEY);if(value&&value.length<=1400000)layer=JSON.parse(value);}catch{}
 const scenario=aoi?restoreStudyScenario(studyAreaStorageKey(IS_DIABLILLOS_CASE),
  aoi.bbox,layer?.sha256||null):null;
 const types=layer?.geojson?.features?.map((f:any)=>f?.geometry?.type);
 const valid=Boolean(scenario&&layer&&Array.isArray(types)&&types.length&&
  types.every((x:string)=>x==='Point'||x==='MultiPoint'));
 const message=!aoi?'Definí primero coordenadas en Área de estudio.':
  !scenario?'Creá primero el perímetro de ensayo y las subáreas A–D en Área de estudio.':
  !layer?'Importá aquí una capa GeoJSON de puntos.':
  !valid?'La capa debe contener exclusivamente geometrías Point o MultiPoint.':'';
 return {layer,scenario,valid,message};
}
function exportResult(report:Report){
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
 const element=document.createElement('a');element.href=url;
 element.download='ambienta-analisis-puntos-zonas-demo.json';
 document.body.appendChild(element);element.click();element.remove();
 setTimeout(()=>URL.revokeObjectURL(url),500);
}
const mapEvent=(detail:unknown)=>window.dispatchEvent(new CustomEvent('ambienta:point-zone-map',{detail}));
export function PointZoneAnalysis(){
 const [revision,setRevision]=useState(0);
 const [report,setReport]=useState<Report|null>(null);
 const [filter,setFilter]=useState('all');
 const [error,setError]=useState('');
 useEffect(()=>{
  const refresh=()=>{setRevision(x=>x+1);setError('');mapEvent(null);};
  window.addEventListener('storage',refresh);
  window.addEventListener('ambienta:spatial-updated',refresh);
  window.addEventListener('focus',refresh);
  return ()=>{
   window.removeEventListener('storage',refresh);
   window.removeEventListener('ambienta:spatial-updated',refresh);
   window.removeEventListener('focus',refresh);
   mapEvent(null);
  };
 },[]);
 const context=useMemo(()=>readInputs(),[revision]);
 const result=report&&context.valid&&analysisMatchesContext(report,context.layer,context.scenario)?report:null;
 const visible=(result?.points||[]).filter(p=>filter==='all'||filter===p.zoneId||
  (filter==='review'&&p.status.startsWith('review_'))||
  (filter==='outside'&&p.status==='outside_perimeter'));
 function run(){
  if(!context.valid){setError(context.message);return;}
  try{
   const next=analyzePointsInStudyAreas({layer:context.layer,scenario:context.scenario,
    analyzedAt:new Date().toISOString()}) as Report;
   setReport(next);setFilter('all');setError('');mapEvent(next);
  }catch(cause){
   setReport(null);mapEvent(null);
   setError(cause instanceof Error?cause.message:'La clasificación requiere revisión.');
  }
 }
 return <section className="sig-point-analysis" data-point-zone-panel="true"
  aria-label="Análisis de puntos contra subáreas">
  <div className="sig-point-heading"><div><small>MAPAS Y SIG · ANÁLISIS VECTORIAL V3.5</small>
   <h3>¿En qué subárea cae cada punto?</h3></div>
   <span>SIMULADO · NO OFICIAL</span></div>
  <p>Clasificación espacial de puntos locales contra el polígono de ensayo. Conserva huecos,
   multipolígonos y bordes: los puntos en límites se envían a revisión, sin asignación automática.</p>
  <div className="sig-point-source" data-point-context={context.valid?'ready':'missing'}>
   <span><strong>Polígono:</strong> {context.scenario?'Escenario A–D':'Sin delimitar'}</span>
   <span><strong>Capa:</strong> {context.layer?.fileName||'Sin capa'}</span>
   {context.layer?.sha256&&<span>SHA-256: <code>{context.layer.sha256.slice(0,16)}…</code></span>}
  </div>
  {!context.valid&&<p className="sig-point-hint">{context.message} <Link to="/area">Definir territorio</Link></p>}
  <div className="sig-point-actions">
   <button type="button" disabled={!context.valid} onClick={run}>Analizar puntos contra las subáreas</button>
   {result&&<button type="button" onClick={()=>exportResult(result)}>Exportar resultado JSON</button>}
   {result&&<button type="button" onClick={()=>{setReport(null);mapEvent(null);}}>Limpiar análisis</button>}
  </div>
  {error&&<p role="alert" className="sig-point-error">{error}</p>}
  {result&&<div className="sig-point-result" data-point-analysis-ready="true">
   <div className="sig-point-stats">
    <div><small>Puntos</small><strong data-point-total="true">{result.summary.totalCount}</strong></div>
    <div><small>En subáreas</small><strong data-point-inside="true">{result.summary.insideCount}</strong></div>
    <div><small>Fuera del perímetro</small><strong data-point-outside="true">{result.summary.outsideCount}</strong></div>
    <div><small>Revisar</small><strong data-point-review="true">{result.summary.reviewCount}</strong></div>
   </div>
   <div className="sig-point-zones">{result.summary.perZone.map(z=>
    <div key={z.id} data-point-zone={z.id}>
     <i style={{backgroundColor:z.color}} aria-hidden="true"/>
     <span>{z.label}</span><strong>{z.count} puntos</strong>
    </div>)}</div>
   <label className="sig-point-filter">Filtrar resultados
    <select aria-label="Filtrar análisis puntual" value={filter} onChange={e=>setFilter(e.target.value)}>
     <option value="all">Todos</option>
     {result.summary.perZone.map(z=><option key={z.id} value={z.id}>Zona {z.id}</option>)}
     <option value="outside">Fuera del perímetro</option>
     <option value="review">Revisión</option>
    </select></label>
   <div className="sig-point-list" role="table" aria-label="Clasificación de puntos">
    <div className="sig-point-list-head" role="row"><span>Identificador</span><span>Resultado</span><span>Coordenadas</span></div>
    {visible.slice(0,80).map(p=><div key={p.ref} className="sig-point-row" role="row"
      data-point-ref={p.ref} data-point-status={p.status}>
     <span><strong>{p.ref}</strong><small>{p.name}</small></span>
     <span className={'sig-point-status '+p.status}>
      {p.status==='inside_zone'?'Zona '+p.zoneId:p.status==='outside_perimeter'?'Fuera':'Revisión'}
      <small>{p.reason}</small></span>
     <code>{p.coordinate[1].toFixed(5)}°, {p.coordinate[0].toFixed(5)}°</code>
    </div>)}
    {!visible.length&&<p>No hay puntos para este filtro.</p>}
   </div>
   {visible.length>80&&<small>Se muestran 80 filas; la exportación incluye todos los puntos.</small>}
   <p className="sig-point-caveat">Este resultado no verifica la precisión de las coordenadas, la existencia
    de estaciones ni el cumplimiento ambiental. No vincula automáticamente puntos a impactos, PGA
    o evidencias. El JSON contiene coordenadas que pueden ser sensibles.</p>
  </div>}
 </section>;
}
