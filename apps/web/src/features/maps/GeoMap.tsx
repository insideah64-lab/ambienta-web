import {useEffect,useRef,useState} from 'react';
import type {Map as MapLibreMap} from 'maplibre-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';

type Props={compact?:boolean;province:string};
const PUNA_CENTER:[number,number]=[-67.2,-24.7]; // Regional viewport, never a site location.
const SALTA_CENTER:[number,number]=[-65.45,-24.82]; // General province viewport, never a plot location.
const TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const BASE_STYLE:maplibregl.StyleSpecification={
  version:8,
  sources:{'osm-base':{type:'raster',tiles:[TILE_URL],tileSize:256,minzoom:0,maxzoom:19,attribution:'© OpenStreetMap contributors'}},
  layers:[{id:'osm-base-raster',type:'raster',source:'osm-base'}]
};
export function GeoMap({compact=false,province}:Props){
 const container=useRef<HTMLDivElement|null>(null);
 const mapRef=useRef<MapLibreMap|null>(null);
 const [state,setState]=useState<'loading'|'ready'|'unavailable'>('loading');
 const [cursor,setCursor]=useState('');
 const [tilesLoaded,setTilesLoaded]=useState(false);
 const center=IS_DIABLILLOS_CASE?PUNA_CENTER:SALTA_CENTER;
 useEffect(()=>{
   if(!container.current)return;
   let alive=true;
   let map:MapLibreMap;
   try{
     map=new maplibregl.Map({
       container:container.current,
       style:BASE_STYLE,
       center,zoom:compact?5.5:6.8,
       minZoom:3,maxZoom:17,
       pitch:0,bearing:0,dragRotate:false,touchPitch:false,
       attributionControl:false,
       cooperativeGestures:false
     });
     mapRef.current=map;
     map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
     map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
     map.on('load',()=>{if(alive)setState('ready');});
     map.on('idle',()=>{if(alive&&map.isStyleLoaded())setTilesLoaded(true);});
     map.on('error',e=>{
       // A tile/network failure does not create false "mapped" data.
       if(alive&&String(e.error?.message||'').match(/tile|failed|network|fetch|load/i)){
         setState('unavailable');
       }
     });
     map.on('mousemove',ev=>{if(alive&&!compact)setCursor(
       'Cursor: '+ev.lngLat.lat.toFixed(4)+'° lat, '+ev.lngLat.lng.toFixed(4)+'° lon'
     );});
     const observer=typeof ResizeObserver!=='undefined'?
       new ResizeObserver(()=>map.resize()):null;
     observer?.observe(container.current);
     return ()=>{alive=false;observer?.disconnect();map.remove();mapRef.current=null;};
   }catch{if(alive)setState('unavailable');return ()=>{alive=false;};}
 },[compact,IS_DIABLILLOS_CASE]);
 return <div className={'geo-shell '+(compact?'geo-compact':'geo-full')} data-map-engine="maplibre" data-georef="regional-only">
   <div className="geo-map" ref={container} role="region" aria-label={'Mapa base OpenStreetMap interactivo · '+province} />
   <div className="geo-mode"><span className="geo-live-dot"/> Base real · OpenStreetMap</div>
   <div className="geo-canvas-info">
     <strong>{IS_DIABLILLOS_CASE?'Puna de Salta · contexto regional':'Provincia de Salta · contexto regional'}</strong>
     <span>Vista regional orientativa, NO ubicación ni perímetro del proyecto.</span>
   </div>
   {state==='loading'&&<div className="geo-status" role="status">Preparando cartografía…</div>}
   {state==='unavailable'&&<div className="geo-status geo-error" role="status">No se pudieron cargar todas las teselas. Verificá conexión; nunca se sustituyen por geodatos simulados.</div>}
   <div className="geo-meta">
     <span>{cursor||'Mapa interactivo · acercá, alej á o desplazá'.replace('alej á','alejá')}</span>
     <button type="button" onClick={()=>mapRef.current?.flyTo({center,zoom:compact?5.5:6.8,essential:false})} disabled={state==='loading'}>Reiniciar vista</button>
   </div>
   <div className="geo-layers" aria-label="Capas disponibles y futuras">
     <strong>Capas</strong>
     <span className="geo-layer-active">Base OSM <small>Activa</small></span>
     <span className="geo-layer-disabled" title="Pendiente de integrar producto ambiental con procedencia y fecha">NDVI <small>Sin datos</small></span>
     <span className="geo-layer-disabled" title="Pendiente de integrar hidrografía oficial verificada">Hidrología <small>Sin datos</small></span>
   </div>
   <div className="geo-source">
     <a target="_blank" rel="noreferrer" href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> · Base cartográfica externa, no prueba ambiental
     {tilesLoaded&&<span className="geo-render-ok"> · Teselas procesadas</span>}
   </div>
 </div>;
}
