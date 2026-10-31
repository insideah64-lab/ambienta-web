import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import type {Map as MapLibreMap} from 'maplibre-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
// @ts-ignore: legacy pure JS parser intentionally shared with Node's native test runner
import {validateGeoJson} from './geojson-validate.mjs';

type Props={compact?:boolean;province:string};
type WorkingLayer={
 label:string;source:string;fileName:string;sha256:string;savedAt:string;
 featureCount:number;coordinateCount:number;bounds:[number,number,number,number];
 geojson:{type:'FeatureCollection';features:unknown[]};
};
const PUNA_CENTER:[number,number]=[-67.2,-24.7];
const SALTA_CENTER:[number,number]=[-65.45,-24.82];
const TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const BASE_STYLE:maplibregl.StyleSpecification={
 version:8,
 sources:{'osm-base':{type:'raster',tiles:[TILE_URL],tileSize:256,minzoom:0,maxzoom:19,attribution:'© OpenStreetMap contributors'}},
 layers:[{id:'osm-base-raster',type:'raster',source:'osm-base'}]
};
export const WORKING_LAYER_KEY=IS_DIABLILLOS_CASE?'ambienta-gis-diablillos-working-v1':'ambienta-gis-demo-working-v1';
function stored():WorkingLayer|null{
 try{
  const value=localStorage.getItem(WORKING_LAYER_KEY);
  if(!value||value.length>1400000)return null;
  const candidate=JSON.parse(value);
  if(!candidate||typeof candidate.source!=='string'||typeof candidate.sha256!=='string')return null;
  const checked=validateGeoJson(candidate.geojson);
  return {...candidate,...checked};
 }catch{return null;}
}
const LAYERS=['qa-fill','qa-outline','qa-line','qa-points'];
function clearWorking(map:MapLibreMap){
 for(const id of LAYERS){if(map.getLayer(id))map.removeLayer(id);}
 if(map.getSource('qa-geojson'))map.removeSource('qa-geojson');
}
function mountWorking(map:MapLibreMap,layer:WorkingLayer|null,fit:boolean){
 if(!map.isStyleLoaded())return;
 clearWorking(map);
 if(!layer)return;
 map.addSource('qa-geojson',{type:'geojson',data:layer.geojson as never});
 map.addLayer({id:'qa-fill',source:'qa-geojson',type:'fill',
  filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],
  paint:{'fill-color':'#f6be73','fill-opacity':0.28}});
 map.addLayer({id:'qa-outline',source:'qa-geojson',type:'line',
  filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],
  paint:{'line-color':'#ffa342','line-width':2.5,'line-dasharray':[3,2]}});
 map.addLayer({id:'qa-line',source:'qa-geojson',type:'line',
  filter:['in',['geometry-type'],['literal',['LineString','MultiLineString']]],
  paint:{'line-color':'#e36ca3','line-width':3}});
 map.addLayer({id:'qa-points',source:'qa-geojson',type:'circle',
  filter:['in',['geometry-type'],['literal',['Point','MultiPoint']]],
  paint:{'circle-radius':7,'circle-color':'#ffe36e','circle-stroke-width':2,'circle-stroke-color':'#5d3c10'}});
 if(fit){
  const [west,south,east,north]=layer.bounds;
  if(west===east&&south===north)map.easeTo({center:[west,south],zoom:11,duration:0});
  else map.fitBounds([[west,south],[east,north]],{padding:45,maxZoom:12,duration:0});
 }
}
export function GeoMap({compact=false,province}:Props){
 const element=useRef<HTMLDivElement|null>(null);
 const mapRef=useRef<MapLibreMap|null>(null);
 const [status,setStatus]=useState<'loading'|'ready'|'unavailable'>('loading');
 const [cursor,setCursor]=useState('');
 const [tilesLoaded,setTilesLoaded]=useState(false);
 const [layer,setLayer]=useState<WorkingLayer|null>(stored);
 const [source,setSource]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const center=IS_DIABLILLOS_CASE?PUNA_CENTER:SALTA_CENTER;
 useEffect(()=>{
  if(!element.current)return;
  let alive=true;let map:MapLibreMap;
  try{
   map=new maplibregl.Map({container:element.current,style:BASE_STYLE,
    center,zoom:compact?5.5:6.8,minZoom:3,maxZoom:17,
    pitch:0,bearing:0,dragRotate:false,touchPitch:false,
    attributionControl:false,cooperativeGestures:false});
   mapRef.current=map;
   map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
   map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
   map.on('load',()=>{if(alive){setStatus('ready');mountWorking(map,stored(),!compact);}});
   map.on('idle',()=>{if(alive&&map.isStyleLoaded())setTilesLoaded(true);});
   map.on('error',e=>{
    if(alive&&String(e.error?.message||'').match(/tile|failed|network|fetch|load/i))
      setStatus('unavailable');
   });
   map.on('mousemove',ev=>{if(alive&&!compact)
    setCursor('Cursor: '+ev.lngLat.lat.toFixed(4)+'° lat, '+ev.lngLat.lng.toFixed(4)+'° lon');
   });
   const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>map.resize()):null;
   observer?.observe(element.current);
   return ()=>{alive=false;observer?.disconnect();map.remove();mapRef.current=null;};
  }catch{if(alive)setStatus('unavailable');return ()=>{alive=false;};}
 },[compact]);
 async function loadFile(ev:ChangeEvent<HTMLInputElement>){
  const file=ev.target.files?.[0];ev.target.value='';
  if(!file)return;
  setError('');
  if(!source.trim()||source.trim().length<5){setError('Indicá una fuente o descripción de la capa (mínimo 5 caracteres).');return;}
  if(file.size>1024*1024){setError('El GeoJSON supera 1 MiB. Simplificá el archivo antes de importarlo.');return;}
  if(!/\.geojson$|\.json$/i.test(file.name)){setError('Solo se admiten archivos .geojson o .json.');return;}
  setBusy(true);
  try{
   const text=await file.text();const parsed=JSON.parse(text);
   const result=validateGeoJson(parsed);
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
   const sha256=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
   const next:WorkingLayer={...result,geojson:result.geojson as WorkingLayer['geojson'],bounds:result.bounds as [number,number,number,number],label:'Capa de trabajo NO VERIFICADA',
    source:source.trim().slice(0,180),fileName:file.name.slice(0,160),
    sha256,savedAt:new Date().toISOString()};
   // Browser-local only: do not send geometry to Supabase or claim ownership of a real project perimeter.
   localStorage.setItem(WORKING_LAYER_KEY,JSON.stringify(next));
   setLayer(next);
   if(mapRef.current)mountWorking(mapRef.current,next,true);
  }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible validar o guardar el archivo.');}
  finally{setBusy(false);}
 }
 function removeLayer(){
  try{localStorage.removeItem(WORKING_LAYER_KEY);}catch{/* No remote mutation. */}
  setLayer(null);setError('');
  if(mapRef.current)clearWorking(mapRef.current);
  mapRef.current?.flyTo({center,zoom:compact?5.5:6.8,duration:0});
 }
 function exportLayer(){
  if(!layer)return;
  const blob=new Blob([JSON.stringify(layer.geojson,null,2)],{type:'application/geo+json'});
  const href=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=href;a.download='ambienta-capa-trabajo-no-verificada.geojson';
  a.click();URL.revokeObjectURL(href);
 }
 return <div className={'geo-shell '+(compact?'geo-compact':'geo-full')}
    data-map-engine="maplibre" data-georef={layer?'unverified-local-layer':'regional-only'}>
   <div className="geo-map" ref={element} role="region" aria-label={'Mapa base OpenStreetMap interactivo · '+province}/>
   <div className="geo-mode"><span className="geo-live-dot"/> Base real · OpenStreetMap</div>
   <div className="geo-canvas-info">
    <strong>{IS_DIABLILLOS_CASE?'Puna de Salta · contexto regional':'Provincia de Salta · contexto regional'}</strong>
    <span>{layer?'Capa importada: NO VERIFICADA, sin asociación oficial al proyecto.':'Vista regional orientativa, NO ubicación ni perímetro del proyecto.'}</span>
   </div>
   {status==='loading'&&<div className="geo-status" role="status">Preparando cartografía…</div>}
   {status==='unavailable'&&<div className="geo-status geo-error" role="status">Falló la carga de teselas. Verificá la conexión; no se utilizan mapas inventados.</div>}
   <div className="geo-meta">
    <span>{cursor||'Mapa interactivo · acercá, alejá o desplazá'}</span>
    <button type="button" onClick={()=>mapRef.current?.flyTo({center,zoom:compact?5.5:6.8,essential:false})} disabled={status==='loading'}>Reiniciar vista</button>
   </div>
   <div className="geo-layers" aria-label="Capas disponibles">
    <strong>Capas</strong>
    <span className="geo-layer-active">Base OSM <small>Activa</small></span>
    {layer&&<span className="geo-layer-working">GeoJSON local <small>No verificado</small></span>}
    <span className="geo-layer-disabled" title="No hay productos ambientales vinculados">NDVI <small>Sin datos</small></span>
    <span className="geo-layer-disabled" title="Falta integrar capa hidrográfica oficial">Hidrología <small>Sin datos</small></span>
   </div>
   {!compact&&<div className="geo-import-panel">
    <strong>GeoJSON · Capa de trabajo local</strong>
    <p>Importá geometrías WGS84/EPSG:4326 (hasta 1 MiB, 100 entidades y 12.000 vértices). No se convierten automáticamente en el área oficial del expediente.</p>
    <label>Procedencia o descripción<input value={source} onChange={e=>setSource(e.target.value)}
      maxLength={180} placeholder="Ej.: polígono sintético de QA, no perímetro minero"/></label>
    <label className="geo-file">Seleccionar GeoJSON<input type="file" accept=".geojson,.json,application/geo+json,application/json"
      disabled={busy} onChange={loadFile} aria-label="Importar GeoJSON"/></label>
    {busy&&<span role="status">Validando geometría y calculando SHA-256…</span>}
    {error&&<p role="alert" className="geo-import-error">{error}</p>}
    {layer&&<div className="geo-layer-details" data-geojson-loaded="true">
     <strong>Capa local sin validar: {layer.fileName}</strong>
     <small>{layer.featureCount} entidades · {layer.coordinateCount} vértices · fuente declarada: {layer.source}</small>
     <code>SHA-256 {layer.sha256}</code>
     <div className="geo-actions">
      <button type="button" onClick={exportLayer}>Exportar GeoJSON depurado</button>
      <button type="button" onClick={removeLayer}>Quitar capa local</button>
     </div>
    </div>}
    <div className="geo-catalogue"><strong>Fuentes oficiales para incorporar capas verificadas</strong>
     <a href="https://geoportal.salta.gob.ar/" target="_blank" rel="noreferrer">IDESA Salta · consultar servicios geográficos</a>
     <a href="https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/Geoservicios" target="_blank" rel="noreferrer">IGN Argentina · consultar geoservicios</a>
     <small>Enlaces al catálogo, no son capas activas. Aún no se comprobó un WMS/WFS hidrográfico para este caso.</small>
    </div>
    <p className="geo-import-note">Persistencia exclusiva en este navegador. No apto para información sensible ni almacenamiento probatorio; no sube archivos al servidor.</p>
   </div>}
   <div className="geo-source">
    <a target="_blank" rel="noreferrer" href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> · Cartografía base externa
    {tilesLoaded&&<span className="geo-render-ok"> · Teselas procesadas</span>}
   </div>
 </div>;
}
