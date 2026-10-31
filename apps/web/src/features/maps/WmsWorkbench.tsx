import {useEffect,useRef,useState,type FormEvent,type RefObject} from 'react';
import type {Map as MapLibreMap} from 'maplibre-gl';
// @ts-ignore pure JS WMS request validation shared with native Node tests
import {makeCapabilitiesUrl,makeWmsTileUrl,parseWmsCapabilities,normalizeWmsUrl} from './wms-service.mjs';

type Props={mapRef:RefObject<MapLibreMap|null>;disabled:boolean};
type Layer={name:string;title:string};
const SOURCE='ambienta-wms-remote';
const LAYER='ambienta-wms-remote-raster';
function clear(map:MapLibreMap|null){
 if(!map)return;
 try{if(map.getLayer(LAYER))map.removeLayer(LAYER);
 if(map.getSource(SOURCE))map.removeSource(SOURCE);}catch{/* map removed while changing route */}
}
export function WmsWorkbench({mapRef,disabled}:Props){
 const [endpoint,setEndpoint]=useState('');
 const [institution,setInstitution]=useState('');
 const [license,setLicense]=useState('');
 const [layers,setLayers]=useState<Layer[]>([]);
 const [selection,setSelection]=useState('');
 const [tested,setTested]=useState('');
 const [active,setActive]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const abort=useRef<AbortController|null>(null);
 useEffect(()=>()=>{abort.current?.abort();clear(mapRef.current);},[mapRef]);
 async function check(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError('');setLayers([]);setSelection('');setActive('');
  clear(mapRef.current);setBusy(true);
  const controller=new AbortController();abort.current=controller;
  const timer=window.setTimeout(()=>controller.abort(),10000);
  try{
   const url=normalizeWmsUrl(endpoint).href;
   if(institution.trim().length<4||institution.length>120)throw Error('Declarar organismo responsable (mínimo cuatro caracteres).');
   if(license.trim().length<4||license.length>180)throw Error('Declarar licencia o condiciones de uso antes de previsualizar.');
   const response=await fetch(makeCapabilitiesUrl(url),{
     method:'GET',mode:'cors',credentials:'omit',redirect:'error',
     referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal
   });
   if(!response.ok)throw Error('GetCapabilities HTTP '+response.status);
   if(Number(response.headers.get('content-length'))>1500000)throw Error('Capabilities demasiado grande.');
   const xml=await response.text();
   const parsed=parseWmsCapabilities(xml);
   setTested(url);setLayers(parsed.layers);setSelection(parsed.layers[0]?.name??'');
  }catch(cause){
   setTested('');
   setError(cause instanceof Error?cause.name==='AbortError'?'El WMS no respondió dentro del límite.':cause.message:'No se pudo verificar GetCapabilities (puede ser CORS o servicio inaccesible).');
  }finally{
   window.clearTimeout(timer);abort.current=null;setBusy(false);
  }
 }
 function show(){
  setError('');
  if(!tested||!layers.some(x=>x.name===selection))return;
  const map=mapRef.current;
  if(disabled||!map||!map.isStyleLoaded()){setError('El mapa no está listo para cargar la vista WMS.');return;}
  try{
   clear(map);
   const tile=makeWmsTileUrl(tested,selection);
   map.addSource(SOURCE,{type:'raster',tiles:[tile],tileSize:256,
     attribution:'WMS externo · proveedor y licencia declarados, NO VERIFICADOS'});
   map.addLayer({id:LAYER,type:'raster',source:SOURCE,paint:{'raster-opacity':0.72}});
   setActive(selection);
  }catch(cause){clear(map);setActive('');setError(cause instanceof Error?cause.message:'No se pudo añadir el WMS.');}
 }
 function hide(){clear(mapRef.current);setActive('');}
 return <section className="geo-wms-workbench" aria-label="Laboratorio de conexión WMS">
   <h3>Servicio WMS externo · laboratorio sin validación oficial</h3>
   <p>Conectá un endpoint HTTPS de <strong>tu elección</strong>. AMBIENTA consulta GetCapabilities y solo ofrece capas que anuncien EPSG:3857 e imágenes PNG. El catálogo no acredita que la fuente sea oficial ni certifica los datos ambientales.</p>
   <form onSubmit={event=>void check(event)}>
    <label>URL base WMS HTTPS<input aria-label="URL de servicio WMS" type="url" value={endpoint}
      maxLength={750} onChange={e=>{setEndpoint(e.target.value);setTested('');setLayers([]);hide();}}
      placeholder="https://servidor-del-organismo.example/wms" required /></label>
    <label>Entidad que declara la capa<input aria-label="Entidad declarada WMS" value={institution}
      onChange={e=>setInstitution(e.target.value)} maxLength={120} required
      placeholder="Nombre del organismo (aún no corroborado)"/></label>
    <label>Licencia y condiciones de uso declaradas<input aria-label="Licencia declarada WMS" value={license}
      onChange={e=>setLicense(e.target.value)} maxLength={180} required
      placeholder="Indicar fuente de licencia / derechos"/></label>
    <button type="submit" className="geo-wms-action" disabled={busy}>{busy?'Consultando servicio…':'Comprobar GetCapabilities'}</button>
   </form>
   {Boolean(layers.length)&&<div className="geo-wms-inspected" data-wms-capabilities="received">
     <strong>GetCapabilities leído · {layers.length} capas compatibles</strong>
     <label>Capa anunciada<select aria-label="Elegir capa WMS" value={selection} onChange={e=>{setSelection(e.target.value);hide();}}>
      {layers.map(x=><option key={x.name} value={x.name}>{x.title} ({x.name})</option>)}
     </select></label>
     <div className="geo-actions">
      <button type="button" disabled={disabled} onClick={show}>Previsualizar WMS en el mapa</button>
      {active&&<button type="button" onClick={hide}>Quitar WMS</button>}
     </div>
     {active&&<p role="status" className="geo-wms-active" data-wms-active="unverified">
      WMS externo PREVISUALIZADO: {active}. Procedencia, cobertura geográfica, licencia y calidad científica NO verificadas. La recepción de GetCapabilities no garantiza que GetMap entregue imágenes válidas.
     </p>}
   </div>}
   {error&&<p role="alert" className="geo-import-error">{error}</p>}
   <p className="geo-import-note">No se guardan credenciales, URL ni contenidos WMS. No utilices direcciones que incluyan tokens. Algunos servidores no permiten solicitudes CORS desde navegadores. La visualización depende de su disponibilidad.</p>
 </section>;
}
