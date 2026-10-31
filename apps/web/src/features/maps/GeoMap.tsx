import {useEffect,useMemo,useRef,useState,type ChangeEvent} from 'react';
import type {Map as MapLibreMap} from 'maplibre-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
// @ts-ignore: legacy pure JS parser intentionally shared with Node's native test runner
import {validateGeoJson} from './geojson-validate.mjs';
// @ts-ignore: hydrology validation is plain JS and unit-tested in Node
import {validateHydrologyImport} from './hydrology-validation.mjs';
import {WmsWorkbench} from './WmsWorkbench';
import type {BoundaryOverlay} from '../georef/GeorefTerritory';
import type {PointAoi} from '../georef/AoiWorkbench';
// @ts-ignore: browser/Node pure geometry engine
import {clipGeoJsonToBbox} from './aoi-clip.mjs';
// @ts-ignore: browser/Node AOI model
import {aoiRectangle,aoiKey,readPointAoi} from './aoi-model.mjs';
// @ts-ignore: validated administrative boundary import shared with Node tests
import {readAdminBoundary,adminBoundaryKey} from '../georef/admin-boundary.mjs';
// @ts-ignore: official IGN base source specs shared with native Node tests
import {IGN_MAPS,buildIgnRasterSource,IGN_DOCS} from './ign-basemap.mjs';

type Props={compact?:boolean;province:string;focus?:{lat:number;lon:number;zoom:number;seq:number}|null;boundary?:BoundaryOverlay|null;aoi?:PointAoi|null};
type WorkingLayer={
 label:string;source:string;fileName:string;sha256:string;savedAt:string;
 featureCount:number;coordinateCount:number;bounds:[number,number,number,number];
 geojson:{type:'FeatureCollection';features:unknown[]};
 metadata?:{category:'hydrology';institution:string;date:string;sourceUrl:string;verification:'source_declared_unverified';description:string};
};
const PUNA_CENTER:[number,number]=[-67.2,-24.7];
const SALTA_CENTER:[number,number]=[-65.45,-24.82];
const TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const BASE_STYLE:maplibregl.StyleSpecification={
 version:8,
 sources:{
  'osm-base':{type:'raster',tiles:[TILE_URL],tileSize:256,minzoom:0,maxzoom:19,attribution:'© OpenStreetMap contributors'},
  'ign-base':{...buildIgnRasterSource('ign'),type:'raster' as const,scheme:'tms' as const},
  'ign-topo':{...buildIgnRasterSource('ign-topo'),type:'raster' as const,scheme:'tms' as const}
 },
 layers:[
  {id:'osm-base-raster',type:'raster',source:'osm-base'},
  {id:'ign-raster-ign',type:'raster',source:'ign-base',layout:{visibility:'none'}},
  {id:'ign-raster-ign-topo',type:'raster',source:'ign-topo',layout:{visibility:'none'}}
 ]
};
export const WORKING_LAYER_KEY=IS_DIABLILLOS_CASE?'ambienta-gis-diablillos-working-v1':'ambienta-gis-demo-working-v1';
function stored():WorkingLayer|null{
 try{
  const value=localStorage.getItem(WORKING_LAYER_KEY);
  if(!value||value.length>1400000)return null;
  const candidate=JSON.parse(value);
  if(!candidate||typeof candidate.source!=='string'||typeof candidate.sha256!=='string')return null;
  const checked=candidate.metadata?.category==='hydrology'?
    validateHydrologyImport(candidate.geojson,{institution:candidate.metadata.institution,date:candidate.metadata.date,url:candidate.metadata.sourceUrl}):validateGeoJson(candidate.geojson);
  return {...candidate,...checked,geojson:checked.geojson};
 }catch{return null;}
}
const LAYERS=['qa-fill','qa-outline','qa-line','qa-points'];
function clearWorking(map:MapLibreMap){
 for(const id of LAYERS){if(map.getLayer(id))map.removeLayer(id);}
 if(map.getSource('qa-geojson'))map.removeSource('qa-geojson');
}
function mountWorking(map:MapLibreMap,layer:WorkingLayer|null,fit:boolean){
 if(!map.getLayer('osm-base-raster'))return;
 clearWorking(map);
 if(!layer)return;
 map.addSource('qa-geojson',{type:'geojson',data:layer.geojson as never});
 const isHydro=layer.metadata?.category==='hydrology';
 map.addLayer({id:'qa-fill',source:'qa-geojson',type:'fill',
  filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],
  paint:{'fill-color':isHydro?'#20a7db':'#f6be73','fill-opacity':0.28}});
 map.addLayer({id:'qa-outline',source:'qa-geojson',type:'line',
  filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],
  paint:{'line-color':isHydro?'#0a82bd':'#ffa342','line-width':2.5,'line-dasharray':[3,2]}});
 map.addLayer({id:'qa-line',source:'qa-geojson',type:'line',
  filter:['in',['geometry-type'],['literal',['LineString','MultiLineString']]],
  paint:{'line-color':isHydro?'#00b7ea':'#e36ca3','line-width':3}});
 map.addLayer({id:'qa-points',source:'qa-geojson',type:'circle',
  filter:['in',['geometry-type'],['literal',['Point','MultiPoint']]],
  paint:{'circle-radius':7,'circle-color':isHydro?'#00e4ec':'#ffe36e','circle-stroke-width':2,'circle-stroke-color':'#5d3c10'}});
 if(fit){
  const [west,south,east,north]=layer.bounds;
  if(west===east&&south===north)map.easeTo({center:[west,south],zoom:11,duration:0});
  else map.fitBounds([[west,south],[east,north]],{padding:45,maxZoom:12,duration:0});
 }
}
function drawAdministrativeBoundary(map:MapLibreMap,boundary:BoundaryOverlay|null){
 if(!map.getLayer('osm-base-raster'))return;
 for(const id of ['admin-border-fill','admin-border-line'])if(map.getLayer(id))map.removeLayer(id);
 if(map.getSource('admin-border-src'))map.removeSource('admin-border-src');
 if(!boundary)return;
 map.addSource('admin-border-src',{type:'geojson',data:boundary.geojson as never});
 map.addLayer({id:'admin-border-fill',type:'fill',source:'admin-border-src',
  paint:{'fill-color':'#b9e483','fill-opacity':0.14}});
 map.addLayer({id:'admin-border-line',type:'line',source:'admin-border-src',
  paint:{'line-color':'#f7f09a','line-width':2.5,'line-dasharray':[2.5,2]}});
}
function drawAoi(map:MapLibreMap,aoi:PointAoi|null){
 if(!map.getLayer('osm-base-raster'))return;
 for(const id of ['aoi-fill','aoi-outline'])if(map.getLayer(id))map.removeLayer(id);
 if(map.getSource('aoi-rectangle'))map.removeSource('aoi-rectangle');
 if(!aoi)return;
 map.addSource('aoi-rectangle',{type:'geojson',data:aoiRectangle(aoi) as never});
 map.addLayer({id:'aoi-fill',source:'aoi-rectangle',type:'fill',
  paint:{'fill-color':'#58ddc0','fill-opacity':0.12}});
 map.addLayer({id:'aoi-outline',source:'aoi-rectangle',type:'line',
  paint:{'line-color':'#53e6ca','line-width':3,'line-dasharray':[2,1.5]}});
}
export function GeoMap({compact=false,province,focus,boundary,aoi}:Props){
 const element=useRef<HTMLDivElement|null>(null);
 const mapRef=useRef<MapLibreMap|null>(null);
 const [status,setStatus]=useState<'loading'|'ready'|'unavailable'>('loading');
 const [cursor,setCursor]=useState('');
 const [tilesLoaded,setTilesLoaded]=useState(false);
 const [basemap,setBasemap]=useState<'osm'|'ign'|'ign-topo'>('osm');
 const [boundaryLocal,setBoundaryLocal]=useState<BoundaryOverlay|null>(()=>readAdminBoundary(adminBoundaryKey(IS_DIABLILLOS_CASE)));
 const [ignTiles,setIgnTiles]=useState(false);
 const [ignProblem,setIgnProblem]=useState('');
 const ignTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [layer,setLayer]=useState<WorkingLayer|null>(stored);
 const [aoiLocal,setAoiLocal]=useState<PointAoi|null>(()=>readPointAoi(aoiKey(IS_DIABLILLOS_CASE)) as PointAoi|null);
 const clipped=useMemo(()=>layer&&aoiLocal?clipGeoJsonToBbox(layer.geojson,aoiLocal.bbox):null,[layer,aoiLocal]);
 const displayed=useMemo<WorkingLayer|null>(()=>layer&&clipped?{...layer,geojson:clipped.geojson as WorkingLayer['geojson']}:layer,[layer,clipped]);
 const [source,setSource]=useState('');
 const [layerType,setLayerType]=useState<'general'|'hydrology'>(()=>stored()?.metadata?.category==='hydrology'?'hydrology':'general');
 const [institution,setInstitution]=useState('');
 const [sourceDate,setSourceDate]=useState('');
 const [hydroUrl,setHydroUrl]=useState('');
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
   map.on('load',()=>{if(alive){
     setStatus('ready');
     const initialAoi=readPointAoi(aoiKey(IS_DIABLILLOS_CASE)) as PointAoi|null;
     const initialLayer=stored();
     const derived=initialAoi&&initialLayer?clipGeoJsonToBbox(initialLayer.geojson,initialAoi.bbox):null;
     mountWorking(map,derived&&initialLayer?{...initialLayer,geojson:derived.geojson as WorkingLayer['geojson']}:initialLayer,!compact&&!initialAoi);
     drawAdministrativeBoundary(map,readAdminBoundary(adminBoundaryKey(IS_DIABLILLOS_CASE)));
     drawAoi(map,initialAoi);
     if(initialAoi)map.fitBounds([[initialAoi.bbox[0],initialAoi.bbox[1]],[initialAoi.bbox[2],initialAoi.bbox[3]]],{padding:55,maxZoom:13,duration:0});
   }});
   map.on('idle',()=>{if(alive&&map.isStyleLoaded())setTilesLoaded(true);});
   map.on('sourcedata',event=>{
     if(!alive)return;
     if((event.sourceId==='ign-base'||event.sourceId==='ign-topo')&&event.isSourceLoaded){
       setIgnTiles(true);
       if(ignTimer.current!==null){clearTimeout(ignTimer.current);ignTimer.current=null;}
     }
   });
   map.on('error',e=>{
    if(alive&&String(e.error?.message||'').match(/tile|failed|network|fetch|load/i))
      setStatus('unavailable');
   });
   map.on('mousemove',ev=>{if(alive&&!compact)
    setCursor('Cursor: '+ev.lngLat.lat.toFixed(4)+'° lat, '+ev.lngLat.lng.toFixed(4)+'° lon');
   });
   const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>map.resize()):null;
   observer?.observe(element.current);
   return ()=>{alive=false;if(ignTimer.current!==null)clearTimeout(ignTimer.current);observer?.disconnect();map.remove();mapRef.current=null;};
  }catch{if(alive)setStatus('unavailable');return ()=>{alive=false;};}
 },[compact]);
 useEffect(()=>{
  // Explicit boundary change on the area panel, independent from the working layer.
  if(boundary!==undefined){
    setBoundaryLocal(boundary);
    if(mapRef.current)drawAdministrativeBoundary(mapRef.current,boundary);
  }
 },[boundary]);
 useEffect(()=>{if(aoi!==undefined)setAoiLocal(aoi);},[aoi]);
 useEffect(()=>{
  const map=mapRef.current;
  if(!map||!map.getLayer('osm-base-raster'))return;
  mountWorking(map,displayed,!aoiLocal&&!compact);
  drawAoi(map,aoiLocal);
  if(aoiLocal)map.fitBounds([[aoiLocal.bbox[0],aoiLocal.bbox[1]],[aoiLocal.bbox[2],aoiLocal.bbox[3]]],
   {padding:55,maxZoom:13,duration:250});
 },[aoiLocal,displayed,compact]);
  useEffect(()=>{
   if(!focus||!Number.isFinite(focus.lat)||!Number.isFinite(focus.lon)||!mapRef.current)return;
   const map=mapRef.current;
   // Centroid is administrative reference only, never a claimed installation point.
   map.flyTo({center:[focus.lon,focus.lat],zoom:focus.zoom,essential:false,duration:500});
 },[focus?.seq]);
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
   const hydroInfo=layerType==='hydrology'?validateHydrologyImport(parsed,{institution,date:sourceDate,url:hydroUrl}):null;
   const result=hydroInfo??validateGeoJson(parsed);
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
   const sha256=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
   const next:WorkingLayer={...result,geojson:result.geojson as WorkingLayer['geojson'],bounds:result.bounds as [number,number,number,number],label:'Capa de trabajo NO VERIFICADA',
    source:source.trim().slice(0,180),fileName:file.name.slice(0,160),
    sha256,savedAt:new Date().toISOString(),
    ...(hydroInfo?{metadata:hydroInfo.metadata as WorkingLayer['metadata']}:{}),
   };
   // Browser-local only: do not send geometry to Supabase or claim ownership of a real project perimeter.
   localStorage.setItem(WORKING_LAYER_KEY,JSON.stringify(next));
   setLayer(next);
   if(mapRef.current){
    setTilesLoaded(false);
    if(!aoiLocal)mountWorking(mapRef.current,next,true);
   }
  }catch(cause){setError(cause instanceof Error?cause.message:'No fue posible validar o guardar el archivo.');}
  finally{setBusy(false);}
 }
 function selectBase(next:'osm'|'ign'|'ign-topo'){
  const map=mapRef.current;
  if(!map||!map.getLayer('ign-raster-ign'))return;
  setBasemap(next);setIgnTiles(false);setIgnProblem('');
  if(ignTimer.current!==null){clearTimeout(ignTimer.current);ignTimer.current=null;}
  map.setLayoutProperty('ign-raster-ign','visibility',next==='ign'?'visible':'none');
  map.setLayoutProperty('ign-raster-ign-topo','visibility',next==='ign-topo'?'visible':'none');
  if(next!=='osm'){
    ignTimer.current=setTimeout(()=>{
      if(mapRef.current!==map)return;
      // Failed external TMS is not silently misrepresented by OSM tiles.
      map.setLayoutProperty('ign-raster-ign','visibility','none');
      map.setLayoutProperty('ign-raster-ign-topo','visibility','none');
      setBasemap('osm');setIgnTiles(false);
      setIgnProblem('El servidor IGN no completó la carga de teselas. Se restauró OpenStreetMap. Esta disponibilidad externa aún no está garantizada.');
      ignTimer.current=null;
    },12000);
  }
 }
  function exportClip(){
  if(!clipped||!layer||clipped.unsupportedCount||!clipped.selectedCount)return;
  const manifest={status:'LOCAL_NO_VERIFICADO',inputSha256:layer.sha256,
   sourceDeclared:layer.source,sourceFile:layer.fileName,
   bbox:clipped.bbox,method:clipped.method,
   sourceCount:clipped.sourceCount,selectedCount:clipped.selectedCount,
   outsideCount:clipped.outsideCount,
   warning:'No es un área oficial de proyecto ni geometría validada por autoridad.'};
  const output={type:'FeatureCollection',features:clipped.geojson.features,
   properties:{ambientaClip:manifest}};
  const href=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/geo+json'}));
  const link=document.createElement('a');link.href=href;link.download='ambienta-recorte-local-no-verificado.geojson';
  link.click();setTimeout(()=>URL.revokeObjectURL(href),500);
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
   <div className="geo-map" ref={element} role="region" aria-label={'Mapa cartográfico interactivo de '+province}/>
   <div className="geo-mode"><span className="geo-live-dot"/> Base real · {basemap==='osm'?'OpenStreetMap':IGN_MAPS[basemap].label}</div>
   {!compact&&<div className="geo-basemap" role="group" aria-label="Elegir mapa base">
     <button type="button" aria-pressed={basemap==='osm'} onClick={()=>selectBase('osm')}>OSM</button>
     <button type="button" aria-pressed={basemap==='ign'} onClick={()=>selectBase('ign')}>IGN · Límites</button>
     <button type="button" aria-pressed={basemap==='ign-topo'} onClick={()=>selectBase('ign-topo')}>IGN · Topográfico</button>
   </div>}
   <div className="geo-canvas-info">
    <strong>{focus?'Centroide administrativo · Georef':IS_DIABLILLOS_CASE?'Puna de Salta · contexto regional':'Provincia de Salta · contexto regional'}</strong>
    <span>{layer?'Capa importada: NO VERIFICADA, sin asociación oficial al proyecto.':'Vista regional orientativa, NO ubicación ni perímetro del proyecto.'}</span>
   </div>
   {status==='loading'&&<div className="geo-status" role="status">Preparando cartografía…</div>}
   {!tilesLoaded&&status==='ready'&&<div className="geo-status" role="status">Cargando teselas para esta vista…</div>}
   {status==='unavailable'&&<div className="geo-status geo-error" role="status">Falló la carga de teselas. Verificá la conexión; no se utilizan mapas inventados.</div>}
   <div className="geo-meta">
    <span>{cursor||'Mapa interactivo · acercá, alejá o desplazá'}</span>
    <button type="button" onClick={()=>mapRef.current?.flyTo({center,zoom:compact?5.5:6.8,essential:false})} disabled={status==='loading'}>Reiniciar vista</button>
   </div>
   <div className="geo-layers" aria-label="Capas disponibles">
    <strong>Capas</strong>
    {aoiLocal&&<span className="geo-layer-working" data-aoi-map="active">Ventana AOI <small>Consulta local · no perímetro</small></span>}
     {boundaryLocal&&<span className="geo-layer-working" data-map-boundary="unverified">Límite administrativo <small>Local · No verificado</small></span>}
    <span className="geo-layer-active">{basemap==='osm'?'Base OSM':basemap==='ign'?'Argenmap IGN':'IGN topográfico'} <small>{basemap==='osm'?'Activa':ignTiles?'Teselas recibidas':'Solicitando teselas'}</small></span>
    {layer&&<span className="geo-layer-working">{layer.metadata?.category==='hydrology'?'Capa hídrica local':'GeoJSON local'} <small>No verificado</small></span>}
    <span className="geo-layer-disabled" title="No hay productos ambientales vinculados">NDVI <small>Sin datos</small></span>
    {layer?.metadata?.category==='hydrology'?<span className="geo-layer-working" data-hydro-active="unverified">Hidrología <small>Declarada · no validada</small></span>:<span className="geo-layer-disabled" title="Falta integrar capa hidrográfica oficial">Hidrología <small>Sin datos</small></span>}
   </div>
   {!compact&&aoiLocal&&<div className="geo-aoi-status" data-aoi-map-status="active">
     <strong>Recorte por coordenadas activo</strong>
     <span>Centro {aoiLocal.center.lat}°, {aoiLocal.center.lon}° · distancia nominal {aoiLocal.radiusKm} km · EPSG:4326</span>
     <small>El rectángulo verde es una ventana de consulta, no el límite ni área de influencia del proyecto. El límite administrativo contextual no se recorta.</small>
     {clipped&&<div data-aoi-clip={clipped.status}>
      <strong>{clipped.selectedCount} de {clipped.sourceCount} entidades locales intersectan el área</strong>
      <span>{clipped.outsideCount} fuera · {clipped.unsupportedCount} requieren motor SIG topológico</span>
      {clipped.unsupportedCount>0&&<p role="alert">Recorte incompleto: se omitieron polígonos complejos para evitar geometrías incorrectas. No exportar como resultado definitivo.</p>}
      {clipped.selectedCount===0&&clipped.unsupportedCount===0&&<p>La capa importada no tiene geometrías dentro de la ventana.</p>}
      <button type="button" onClick={exportClip} disabled={clipped.unsupportedCount>0||clipped.selectedCount===0}>Descargar recorte GeoJSON</button>
     </div>}
     {!layer&&<span>Importá una capa GeoJSON local para recortarla automáticamente.</span>}
    </div>}
    {!compact&&<div className="geo-import-panel">
    <strong>GeoJSON · Capa de trabajo local</strong>
    <label>Tipo de capa<select aria-label="Tipo de capa ambiental" value={layerType} onChange={ev=>setLayerType(ev.target.value as 'general'|'hydrology')}>
     <option value="general">Geometría general de trabajo</option>
     <option value="hydrology">Hidrología · trazado o puntos declarados</option>
    </select></label>
    <p>Importá geometrías WGS84/EPSG:4326 (hasta 1 MiB, 100 entidades y 12.000 vértices). No se convierten automáticamente en el área oficial del expediente.</p>
    <label>Procedencia o descripción<input value={source} onChange={e=>setSource(e.target.value)}
      maxLength={180} placeholder="Ej.: polígono sintético de QA, no perímetro minero"/></label>
    {layerType==='hydrology'&&<div className="geo-hydro-fields" data-hydro-form="true">
     <strong>Procedencia hídrica obligatoria</strong>
     <label>Organismo o entidad de origen<input aria-label="Organismo de origen hídrico" value={institution} onChange={e=>setInstitution(e.target.value)} placeholder="Organismo declarante (no verificado)" maxLength={120}/></label>
     <label>Fecha de la fuente<input type="date" aria-label="Fecha de fuente hídrica" value={sourceDate} onChange={e=>setSourceDate(e.target.value)}/></label>
     <label>URL de origen HTTPS<input type="url" aria-label="URL fuente hídrica" value={hydroUrl} onChange={e=>setHydroUrl(e.target.value)} placeholder="https://..." maxLength={450}/></label>
     <p>La URL y el organismo son declarados por el operador; no se verifican contra el organismo ni acreditan calidad del agua, caudales o permisos.</p>
    </div>}
    <label className="geo-file">Seleccionar GeoJSON<input type="file" accept=".geojson,.json,application/geo+json,application/json"
      disabled={busy} onChange={loadFile} aria-label="Importar GeoJSON"/></label>
    {busy&&<span role="status">Validando geometría y calculando SHA-256…</span>}
    {error&&<p role="alert" className="geo-import-error">{error}</p>}
    {layer&&<div className="geo-layer-details" data-geojson-loaded="true">
      {aoiLocal&&<small>Original preservado en el navegador; solo la vista y la exportación derivada se recortan.</small>}
     <strong>Capa local sin validar: {layer.fileName}</strong>
     <small>{layer.featureCount} entidades · {layer.coordinateCount} vértices · fuente declarada: {layer.source}</small>
     {layer.metadata?.category==='hydrology'&&<div className="geo-hydro-provenance" data-hydro-provenance="unverified"><strong>Hidrología NO VERIFICADA</strong><small>{layer.metadata.institution} · {layer.metadata.date}</small><small>Origen declarado: {layer.metadata.sourceUrl}</small><small>Este material NO acredita una cuenca, un cauce oficial ni la situación ambiental de Diablillos.</small></div>}
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
   {!compact&&<div className="geo-ign-provenance" data-official-base={basemap}>
    <strong>Cartografía base y límites administrativos visibles</strong>
    <span>{basemap==='osm'?'Vista OpenStreetMap (alternativa de referencia).':'Argenmap del Instituto Geográfico Nacional (IGN) · cartografía base raster publicada por TMS.'}</span>
    <span>Los trazos de divisiones administrativas impresos en la cartografía NO son polígonos vectoriales exportables ni delimitan el proyecto ambiental.</span>
    {ignProblem&&<span role="alert" className="geo-ign-issue">{ignProblem}</span>}
    <a href={IGN_DOCS} target="_blank" rel="noreferrer">Ver fuente IGN, TMS y geoservicios WFS</a>
    {basemap!=='osm'&&<span role="status" className="geo-ign-state">{ignTiles?'El proveedor IGN indicó carga completa; verificá visualmente el mapa.':'Solicitando cartografía del IGN; se volverá a OSM si no responde.'}</span>}
   </div>}
   {!compact&&<WmsWorkbench mapRef={mapRef} disabled={status!=='ready'}/>}
   <div className="geo-source">
    {basemap==='osm'?<a target="_blank" rel="noreferrer" href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>:<a target="_blank" rel="noreferrer" href={IGN_DOCS}>© Instituto Geográfico Nacional · Argenmap</a>} · Cartografía base externa
    {tilesLoaded&&<span className="geo-render-ok"> · Teselas procesadas</span>}
   </div>
 </div>;
}
