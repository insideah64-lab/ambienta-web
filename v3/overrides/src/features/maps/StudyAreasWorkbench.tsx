import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import type {PointAoi} from '../georef/AoiWorkbench';
// @ts-ignore: pure JS area/validation contract shared by Node and Chromium
import {syntheticStudyPolygon,createStudyScenario,studyAreaStorageKey,
 restoreStudyScenario,scenarioMatchesAoi,studyScenarioExport} from './study-areas.mjs';
// @ts-ignore: canonical browser validation for source polygons
import {validateGeoJson} from './geojson-validate.mjs';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
import './study-areas.css';

type Scenario={
 kind:'study_area_demo';status:'SIMULADO_NO_OFICIAL';sourceKind:'synthetic'|'imported';
 sourceHash:string;bbox:number[];createdAt:string;
 parent:{type:'FeatureCollection';features:unknown[]};
 zones:{type:'FeatureCollection';features:unknown[]};
 summary:{parentHa:number;assignedHa:number;residualHa:number;
  areas:{id:string;label:string;color:string;areaHa:number;percent:number;status:string}[]};
};
type Candidate={geojson:{type:'FeatureCollection';features:unknown[]};sha256:string;label:string};
const KEY=studyAreaStorageKey(IS_DIABLILLOS_CASE);
const GIS_KEY=IS_DIABLILLOS_CASE?'ambienta-gis-diablillos-working-v3':'ambienta-gis-demo-working-v3';

function sourceLayer():Candidate|null{
 try{
  const raw=localStorage.getItem(GIS_KEY);
  if(!raw||raw.length>1400000)return null;
  const record=JSON.parse(raw);
  if(typeof record.sha256!=='string'||!/^[a-f0-9]{64}$/.test(record.sha256))return null;
  const validated=validateGeoJson(record.geojson);
  if(validated.featureCount!==1||!['Polygon','MultiPolygon'].includes(validated.geojson.features[0]?.geometry?.type))
   return null;
  return {geojson:validated.geojson,sha256:record.sha256,label:record.fileName||'Polígono local'};
 }catch{return null;}
}
function download(part:'zones'|'parent',scenario:Scenario){
 const output=studyScenarioExport(scenario,part);
 const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/geo+json'}));
 const link=document.createElement('a');link.href=url;
 link.download=part==='zones'?'ambienta-subareas-simuladas.geojson':'ambienta-poligono-ensayo-no-oficial.geojson';
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),500);
}
export function StudyAreasWorkbench({aoi}:{aoi:PointAoi|null}){
 const [revision,setRevision]=useState(0);
 const [scenario,setScenario]=useState<Scenario|null>(null);
 const [imported,setImported]=useState<Candidate|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 useEffect(()=>{
  const update=()=>{setRevision(v=>v+1);};
  window.addEventListener('ambienta:spatial-updated',update);
  window.addEventListener('storage',update);
  window.addEventListener('focus',update);
  return ()=>{
   window.removeEventListener('ambienta:spatial-updated',update);
   window.removeEventListener('storage',update);
   window.removeEventListener('focus',update);
  };
 },[]);
 useEffect(()=>{
  const source=sourceLayer();
  setImported(source);
  setScenario(restoreStudyScenario(KEY,aoi?.bbox,source?.sha256||null) as Scenario|null);
  // A previous scenario is retained in storage for audit, but never displayed against another AOI.
 },[aoi?.bbox?.join(','),revision]);
 const valid=useMemo(()=>scenario&&aoi&&scenarioMatchesAoi(scenario,aoi.bbox)&&
  (scenario.sourceKind==='synthetic'||scenario.sourceHash===imported?.sha256)?scenario:null,
  [scenario,aoi,imported]);
 async function assign(kind:'synthetic'|'imported'){
  if(!aoi){setError('Definí primero una ventana de consulta en Área de estudio.');return;}
  if(busy)return;
  setBusy(true);setError('');setSuccess('');
  try{
   const parent=kind==='synthetic'?{type:'FeatureCollection',
    features:[syntheticStudyPolygon(aoi.bbox)]}:imported?.geojson;
   if(!parent)throw Error('Importá primero un único polígono GeoJSON en Mapas y SIG.');
   let sha=imported?.sha256||'';
   if(kind==='synthetic'){
    const bytes=new TextEncoder().encode(JSON.stringify(parent));
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    sha=Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('');
   }
   const created=createStudyScenario({
    bbox:aoi.bbox,geojson:parent,sourceHash:sha,sourceKind:kind,
    generatedAt:new Date().toISOString()
   }) as Scenario;
   localStorage.setItem(KEY,JSON.stringify(created));
   setScenario(created);
   setSuccess('Polígono y cuatro áreas de ensayo actualizados. Las capas originales no se modificaron.');
   window.dispatchEvent(new Event('ambienta:spatial-updated'));
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo delimitar el escenario.');}
  finally{setBusy(false);}
 }
 function clear(){
  try{
   localStorage.removeItem(KEY);setScenario(null);setSuccess('Escenario retirado; las capas SIG originales permanecen intactas.');
   window.dispatchEvent(new Event('ambienta:spatial-updated'));
  }catch{setError('No se pudo retirar el escenario local.');}
 }
 return <section className="geo-study-areas" data-study-area-panel="true"
   aria-label="Delimitación y subáreas del polígono de estudio">
   <div className="geo-study-heading">
    <div><small className="geo-study-kicker">ÁREA DE ESTUDIO · DEFINICIÓN DEL TERRITORIO</small>
     <strong>Perímetro y subáreas del caso de ensayo</strong></div>
    <span className="geo-study-warning">SIMULADO · NO OFICIAL</span>
   </div>
   <p>El territorio de ensayo se define aquí. Podés crear un polígono irregular con hueco o adoptar explícitamente una única geometría importada desde el laboratorio SIG. La ventana BBOX no se convierte en perímetro.</p>
   <div className="geo-study-buttons">
    <button type="button" disabled={!aoi||busy} onClick={()=>assign('synthetic')}>
     Crear polígono sintético y 4 áreas</button>
    <button type="button" disabled={!aoi||!imported||busy} onClick={()=>assign('imported')}>
     Asignar 4 áreas a un polígono importado</button>
    <Link className="v2-study-navlink" to="/mapas">Abrir Mapas y SIG para importar geometrías</Link>
   </div>
   {imported&&<small data-study-import-ready="true">Disponible desde SIG: {imported.label}. La procedencia declarada no acredita carácter oficial.</small>}
   {!aoi&&<p role="status">Primero completá las coordenadas y la distancia de consulta.</p>}
   {valid&&<div className="geo-study-results" data-study-areas-ready="true">
    <div className="geo-study-total">
     <div><small>Superficie del polígono de ensayo</small>
      <strong>{valid.summary.parentHa.toLocaleString('es-AR',{maximumFractionDigits:2})} ha</strong></div>
     <div><small>Distribución comprobada</small>
      <strong>{(valid.summary.assignedHa/valid.summary.parentHa*100).toLocaleString('es-AR',{maximumFractionDigits:2})}%</strong></div>
     <div><small>Superficie sin asignar</small>
      <strong>{Math.abs(valid.summary.residualHa).toLocaleString('es-AR',{maximumFractionDigits:4})} ha</strong></div>
    </div>
    <div className="geo-study-zones" aria-label="Zonas funcionales de ensayo">
     {valid.summary.areas.map(zone=><div className="geo-study-zone" key={zone.id} data-study-zone={zone.id}>
      <span className="geo-study-color" style={{backgroundColor:zone.color}} aria-hidden="true"/>
      <div><strong>{zone.label}</strong>
       <small>{zone.status==='empty'?'Sin intersección':zone.areaHa.toLocaleString('es-AR',{maximumFractionDigits:2})+' ha'}</small></div>
      <b>{zone.percent.toLocaleString('es-AR',{maximumFractionDigits:1})}%</b>
     </div>)}
    </div>
    <small className="geo-study-footnote">
     Superficie esférica WGS84 aproximada, no cálculo geodésico pericial.
     SHA-256 {valid.sourceHash.slice(0,14)}… · {valid.sourceKind==='synthetic'?'geometría sintética':'fuente importada explícitamente'}.
    </small>
    <div className="geo-study-buttons">
     <button type="button" onClick={()=>download('zones',valid)}>Descargar subáreas GeoJSON</button>
     <button type="button" onClick={()=>download('parent',valid)}>Descargar polígono base</button>
     <button type="button" onClick={clear}>Quitar ensayo</button>
    </div>
   </div>}
   {error&&<p role="alert" className="geo-import-error">{error}</p>}
   {success&&<p role="status">{success}</p>}
   <small>Las áreas A–D son asignaciones geográficas de prueba, no usos oficiales del suelo.
    Podés analizarlas como capas de solo lectura en <Link to="/mapas">el laboratorio cartográfico</Link>;
    los recortes WFS y la gestión de capas se realizan exclusivamente allí.</small>
  </section>;
}
