import {useEffect,useState} from 'react';
// @ts-ignore: shared Node/browser geometry module
import {createPointAoi,aoiKey,readPointAoi} from '../maps/aoi-model.mjs';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
export type PointAoi={kind:'point_bbox';center:{lat:number;lon:number};radiusKm:number;
 bbox:[number,number,number,number];crs:'EPSG:4326';
 verification:'operator_declared_not_project_perimeter';savedAt?:string};
type Props={onChange:(aoi:PointAoi|null)=>void};
const key=aoiKey(IS_DIABLILLOS_CASE);
export function AoiWorkbench({onChange}:Props){
 const [initial]=useState<PointAoi|null>(()=>readPointAoi(key) as PointAoi|null);
 const [lat,setLat]=useState(initial?String(initial.center.lat):'');
 const [lon,setLon]=useState(initial?String(initial.center.lon):'');
 const [km,setKm]=useState(initial?String(initial.radiusKm):'5');
 const [active,setActive]=useState<PointAoi|null>(initial);
 const [error,setError]=useState('');
 useEffect(()=>{
  const fromPerimeter=()=>{
   const updated=readPointAoi(key) as PointAoi|null;
   if(!updated)return;
   setLat(String(updated.center.lat));setLon(String(updated.center.lon));setKm(String(updated.radiusKm));
   setActive(updated);
   onChange(updated);
  };
  window.addEventListener('ambienta:perimeter-aoi-updated',fromPerimeter);
  return ()=>window.removeEventListener('ambienta:perimeter-aoi-updated',fromPerimeter);
 },[onChange]);
 useEffect(()=>{
  if(!lat.trim()||!lon.trim()||!km.trim()){
   setError('');if(active){localStorage.removeItem(key);setActive(null);onChange(null);}return;
  }
  let next:PointAoi;
  try{
   if(![lat,lon,km].every(v=>/^[-+]?\d+(?:\.\d+)?$/.test(v.trim())))throw Error('Usá grados decimales y punto decimal.');
   next=createPointAoi(Number(lat),Number(lon),Number(km)) as PointAoi;
  }catch(e){
   setError(e instanceof Error?e.message:'Coordenadas inválidas.');
   if(active){localStorage.removeItem(key);setActive(null);onChange(null);}return;
  }
  setError('');
  // Apply synchronously after React commits the valid input; never expose a stale BBOX.
  const saved:PointAoi={...next,savedAt:new Date().toISOString()};
  try{localStorage.setItem(key,JSON.stringify(saved));}
  catch{setError('No se pudo guardar la ventana local.');return;}
  setActive(saved);onChange(saved);
  window.dispatchEvent(new Event('ambienta:spatial-updated'));
 },[lat,lon,km]);
 function clear(){
  localStorage.removeItem(key);setActive(null);onChange(null);
  setLat('');setLon('');setKm('5');setError('');
  window.dispatchEvent(new Event('ambienta:spatial-updated'));
 }
 return <section className="v2-aoi" aria-label="Recorte automático por coordenadas" data-aoi-workbench="true">
  <header><strong>Recorte automático por coordenadas</strong>
   <p>Ingresá coordenadas y distancia: se calcula una ventana y se recortan las capas GeoJSON locales disponibles.</p></header>
  <div className="v2-aoi-fields">
   <label>Latitud (°)<input aria-label="Latitud de consulta" value={lat} onChange={e=>setLat(e.target.value)} placeholder="-24.7000" inputMode="decimal"/></label>
   <label>Longitud (°)<input aria-label="Longitud de consulta" value={lon} onChange={e=>setLon(e.target.value)} placeholder="-67.2000" inputMode="decimal"/></label>
   <label>Distancia nominal (km)<input aria-label="Distancia de consulta" value={km} onChange={e=>setKm(e.target.value)} inputMode="decimal"/></label>
  </div>
  {error&&<p role="alert" className="v2-aoi-error">{error}</p>}
  {active&&Number(lat)===active.center.lat&&Number(lon)===active.center.lon&&Number(km)===active.radiusKm&&<div className="v2-aoi-ready" data-aoi-active="true">
   <strong>Ventana de consulta activa · NO es el perímetro del proyecto</strong>
   <code>BBOX EPSG:4326: {active.bbox.map(x=>x.toFixed(6)).join(', ')}</code>
   <button type="button" onClick={clear}>Quitar ventana</button>
  </div>}
  <p className="v2-aoi-warning">Rectángulo aproximado, no buffer geodésico ni área de influencia aprobada. No descarga bases oficiales; la intersección local admite polígonos complejos, pero rechaza topologías inválidas o demasiado extensas para revisión SIG.</p>
 </section>;
}
