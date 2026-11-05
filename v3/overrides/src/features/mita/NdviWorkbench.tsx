import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
// @ts-ignore: existing project query window, never a verified perimeter.
import {aoiKey,readPointAoi} from '../maps/aoi-model.mjs';
import {emptyNdviForm,ndviQuery,ndviPolygon,ndviRequest,ndviFileUrl,type NdviGeometry,type NdviForm,type NdviSearch,type NdviJob,type NdviSummary} from './NdviClient';
// @ts-ignore: source record remains read-only; masks are snapshots per job.
import {readPerimeter,perimeterKey} from '../maps/perimeter-source.mjs';
import './NdviWorkbench.css';
import {NdviResultView} from './NdviResultView';
const labels={queued:'En cola',running:'Procesando',succeeded:'Completado',failed:'Fallido',cancelled:'Cancelado'};
const f=(n:number|null)=>n===null?'Sin datos':n.toLocaleString('es-AR',{minimumFractionDigits:4,maximumFractionDigits:4});
export function NdviWorkbench({project,onReport}:{project:string;onReport:(file:File)=>void}){
 const [available,setAvailable]=useState(false),[checked,setChecked]=useState(false),[form,setForm]=useState(emptyNdviForm),[search,setSearch]=useState<NdviSearch|null>(null),[scene,setScene]=useState('');
 const [geometry,setGeometry]=useState<NdviGeometry|null>(null),[maskName,setMaskName]=useState('');
 const [detail,setDetail]=useState<NdviJob|null>(null);
 const [jobs,setJobs]=useState<NdviJob[]>([]),[summary,setSummary]=useState<NdviSummary|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[serviceError,setServiceError]=useState('');
 const [params,setParams]=useSearchParams(),jobId=params.get('trabajo'),fromArea=params.get('area')==='guardada',listed=jobs.find(j=>j.id===jobId),job=detail?.id===jobId?{...detail,...listed,query:detail.query}:listed,pending=useRef(false);
 const select=(id:string,replace=false)=>setParams(prev=>{const p=new URLSearchParams(prev);p.delete('area');p.delete('vista');p.delete('zoom');p.set('trabajo',id);return p;},{replace});
 useEffect(()=>{if(!job?.query)return;setForm({west:String(job.bbox[0]),south:String(job.bbox[1]),east:String(job.bbox[2]),north:String(job.bbox[3]),start:job.query.start,end:job.query.end,maxCloud:String(job.query.maxCloud)});setGeometry(job.query.geometry||null);setMaskName(job.query.geometry?'Polígono conservado en el trabajo '+job.id:'');setSearch(null);setScene('');},[job?.id,detail?.id]);
 useEffect(()=>{if(fromArea&&!jobId)savedPolygon();},[fromArea,jobId,project]);
 useEffect(()=>{if(!available||!jobId||!/^[a-f0-9]{32}$/.test(jobId))return;const c=new AbortController();ndviRequest<NdviJob>('/jobs/'+jobId+'?project='+encodeURIComponent(project),undefined,c.signal).then(j=>{if(j.project!==project||j.id!==jobId)throw Error('El detalle no corresponde al proyecto.');setDetail(j);}).catch(e=>{if(!c.signal.aborted)setServiceError(String(e));});return()=>c.abort();},[available,jobId,project]);
 useEffect(()=>{if(document.querySelector('meta[name="ambienta-ndvi-service"]')?.getAttribute('content')!=='local-v1'){setChecked(true);return;}const c=new AbortController();ndviRequest<{mode:string;indices:string[]}>('/health',undefined,c.signal).then(h=>{setAvailable(h.mode==='local-only'&&h.indices?.includes('ndvi'));setChecked(true);}).catch(()=>{if(!c.signal.aborted){setAvailable(false);setChecked(true);}});return()=>c.abort();},[]);
 useEffect(()=>{
  if(!available)return;const c=new AbortController();let timer:ReturnType<typeof setTimeout>;
  async function refresh(){try{
   const r=await ndviRequest<{jobs:NdviJob[]}>('/jobs?project='+encodeURIComponent(project),undefined,c.signal);
   if(!Array.isArray(r.jobs)||r.jobs.some(j=>j.project!==project||!labels[j.status]||!/^[a-f0-9]{32}$/.test(j.id)))throw Error('El servicio devolvió un registro de trabajos incompatible.');
   setJobs(r.jobs);setServiceError('');
   if(!jobId&&!fromArea&&r.jobs.length)select(r.jobs[0].id,true);
  }catch(e){if(!c.signal.aborted)setServiceError(e instanceof Error?e.message:String(e));}
  if(!c.signal.aborted)timer=setTimeout(refresh,2000);}
  void refresh();return()=>{c.abort();clearTimeout(timer);};
 // URL is the source of truth for job selection; data live on the local service.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[available,project,jobId,fromArea]);
 useEffect(()=>{
  setSummary(null);if(job?.status!=='succeeded')return;const c=new AbortController();
  ndviRequest<NdviSummary>('/jobs/'+job.id+'/summary?project='+encodeURIComponent(project),undefined,c.signal).then(setSummary).catch(e=>{if(!c.signal.aborted)setServiceError(String(e));});return()=>c.abort();
 },[job?.id,job?.status,project]);
 function change(key:keyof NdviForm,value:string){setForm(p=>({...p,[key]:value}));setSearch(null);setScene('');}
 async function action(work:()=>Promise<void>){if(pending.current)return;pending.current=true;setBusy(true);setMessage('');try{await work();}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{pending.current=false;setBusy(false);}}
 async function findScenes(){await action(async()=>{const q=ndviQuery(form,geometry);setSearch(null);setScene('');const r=await ndviRequest<NdviSearch>('/scenes/search',q);if(!r.searchId||!Array.isArray(r.scenes))throw Error('Respuesta de búsqueda incompleta.');setSearch(r);if(!r.scenes.length)setMessage('No se encontraron escenas en esta primera página con los filtros indicados.');});}
 async function submit(){if(!search||!scene)return;await action(async()=>{const j=await ndviRequest<NdviJob>('/jobs',{project,search_id:search.searchId,scene_id:scene});setJobs(p=>[j,...p.filter(x=>x.id!==j.id)]);select(j.id);});}
 function pilot(){setGeometry(null);setForm({west:'-65.470',south:'-24.760',east:'-65.465',north:'-24.755',start:'2025-05-01',end:'2025-06-30',maxCloud:'80'});setSearch(null);setScene('');setMessage('Área piloto pública en Salta. No es el emplazamiento ni el perímetro del proyecto. Revisá los campos antes de buscar.');}
 function savedAoi(){const a=readPointAoi(aoiKey(IS_DIABLILLOS_CASE));if(!a){setMessage('Primero definí y guardá una ventana en Área de estudio.');return;}setGeometry(null);setForm(p=>({...p,west:String(a.bbox[0]),south:String(a.bbox[1]),east:String(a.bbox[2]),north:String(a.bbox[3])}));setSearch(null);setScene('');setMessage('Ventana guardada copiada. Revisá tamaño y período; no se acredita como perímetro del proyecto.');}
 function choosePolygon(input:unknown,name='GeoJSON seleccionado'){const p=ndviPolygon(input);setGeometry(p.geometry);setMaskName(name);setForm(f=>({...f,west:String(p.bbox[0]),south:String(p.bbox[1]),east:String(p.bbox[2]),north:String(p.bbox[3])}));setSearch(null);setScene('');setMessage('Polígono seleccionado sin modificar su fuente. Exterior y huecos quedarán sin datos; el contorno no se acredita como límite oficial.');}
 function savedPolygon(){try{const p=readPerimeter(localStorage,perimeterKey(IS_DIABLILLOS_CASE));if(!p)throw Error('No hay un polígono válido guardado en este navegador. Guardalo en Área de estudio o importá un GeoJSON aquí.');choosePolygon(p.geojson,p.sourceName);}catch(e){setMessage(e instanceof Error?e.message:String(e));}}
 return <section className="amb-ndvi" data-ndvi-workbench aria-label="Calcular NDVI">
  <header><div><p className="v2-kicker">PROCESAMIENTO · SOLO NDVI</p><h3>Buscar imágenes y calcular NDVI</h3></div><span>{available?'Servicio local disponible':checked?'Procesamiento no disponible':'Comprobando servicio…'}</span></header>
  <p>Elegí una ventana, un período y una escena Sentinel-2. El resultado conserva su fecha, calidad y archivos. Los contaminantes criterio se incorporarán en otra etapa.</p>
  {!available&&checked&&<p className="amb-mita-note">Esta instalación permite importar resultados, pero no ejecutar el cálculo. La versión asistida local habilita este recorrido; no se envían pedidos de procesamiento desde aquí.</p>}
  {available&&<p className="amb-mita-note">Piloto local, una escena por trabajo. Podés usar un polígono como máscara; su rectángulo envolvente solo sirve para leer la imagen. El cálculo sigue en el servicio aunque cierres esta pestaña.</p>}
  <div className="amb-ndvi-tools"><button disabled={!available||busy} onClick={savedAoi}>Usar ventana guardada</button><button disabled={!available||busy} onClick={pilot}>Cargar área piloto de Salta</button></div>
  <div className="amb-ndvi-tools"><button disabled={!available||busy} onClick={savedPolygon}>Usar polígono guardado</button><label>Importar polígono GeoJSON · hasta 180 KB<input data-ndvi-polygon type="file" accept=".geojson,.json" disabled={!available||busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void action(async()=>{if(file.size>180000)throw Error('El GeoJSON supera 180 KB.');choosePolygon(JSON.parse(await file.text()),file.name);});}}/></label>{geometry&&<button disabled={busy} onClick={()=>{setGeometry(null);setSearch(null);setScene('');}}>Usar solo ventana rectangular</button>}</div>
  {geometry&&<p data-ndvi-mask-name>Delimitación seleccionada: <strong>{maskName}</strong>. El NDVI se calculará dentro de este contorno.</p>}
  <p data-ndvi-mask={geometry?'polygon':'bbox'}>{geometry?'Recorte por polígono: incluye huecos y partes separadas. Estadísticas solo sobre sus píxeles; regla del centro del píxel.':'Recorte rectangular. Seleccioná un polígono para excluir el exterior.'}</p>
  <fieldset disabled={!available||busy}><legend>Extensión WGS84 y período</legend><div className="amb-ndvi-fields">{([['west','Oeste · longitud'],['south','Sur · latitud'],['east','Este · longitud'],['north','Norte · latitud']] as const).map(([key,label])=><label key={key}>{label}<input type="number" step="any" readOnly={!!geometry} value={form[key]} onChange={e=>change(key,e.target.value)} data-ndvi-field={key}/></label>)}
  <label>Desde<input type="date" value={form.start} onChange={e=>change('start',e.target.value)} data-ndvi-field="start"/></label><label>Hasta<input type="date" value={form.end} onChange={e=>change('end',e.target.value)} data-ndvi-field="end"/></label><label>Nubosidad máxima de escena · %<input type="number" min="0" max="100" value={form.maxCloud} onChange={e=>change('maxCloud',e.target.value)}/></label></div><button onClick={()=>void findScenes()} data-ndvi-search>Buscar escenas Sentinel-2</button></fieldset>
  <p role="status" aria-live="polite" data-ndvi-message>{busy?'Consultando el servicio…':message}</p>{serviceError&&<p role="alert">{serviceError} El historial anterior permanece guardado.</p>}
  {search&&<div className="amb-ndvi-scenes"><h4>Elegir escena</h4><p>{search.message}</p><div className="amb-ndvi-scene-list">{[...search.scenes].sort((a,b)=>a.cloud-b.cloud).map(s=><label key={s.id}><input type="radio" name={'ndvi-scene-'+project} value={s.id} disabled={!s.ready||busy} checked={scene===s.id} onChange={()=>setScene(s.id)}/><span><strong>{s.id}</strong><small>{s.date} · nubes de escena {s.cloud.toLocaleString('es-AR')} % · {s.coversWindow?s.ready?'cobertura de ventana disponible':'bandas no disponibles':'sin cobertura completa de la ventana'}</small></span></label>)}</div><button disabled={!scene||busy} onClick={()=>void submit()} data-ndvi-submit>Calcular NDVI de la escena elegida</button></div>}
  {available&&<div className="amb-ndvi-results"><aside><h4>Trabajos de {project}</h4>{!jobs.length&&<p>Todavía no hay trabajos.</p>}{jobs.map(j=><button key={j.id} aria-pressed={jobId===j.id} onClick={()=>select(j.id)}><strong>{labels[j.status]}</strong><small>{j.sceneId}</small><small>{new Date(j.created).toLocaleString('es-AR')}</small></button>)}</aside><article aria-label="Resultado del trabajo NDVI">
   {!job?<p>{jobId?'Este trabajo no está en el registro del proyecto de este servicio.':'Seleccioná un trabajo para revisar su resultado.'}</p>:<><h4 data-ndvi-job-status>{labels[job.status]} · NDVI</h4><p>{job.sceneId}</p><p>Ventana usada: {job.bbox.join(', ')} · EPSG:4326</p>{job.cancelRequested&&job.status==='running'&&<p>Cancelación solicitada: se confirmará al detenerse el proceso. No se publica el resultado mientras tanto.</p>}{job.error&&<p role="alert">{job.error}</p>}
   {['queued','running'].includes(job.status)&&<button disabled={busy||job.cancelRequested} onClick={()=>void action(async()=>{await ndviRequest('/jobs/'+job.id+'/cancel',{project});setMessage('Cancelación solicitada.');})}>Solicitar cancelación</button>}
   {job.status==='succeeded'&&summary&&<><p>Adquisición: {summary.acquiredAt} · {summary.width} × {summary.height} · {summary.crs}</p><div className="amb-mita-stats">{[['Mínimo',summary.min],['Promedio',summary.mean],['Máximo',summary.max]].map(([name,value])=><div key={String(name)}><small>NDVI {name}</small><strong>{f(value as number|null)}</strong></div>)}</div><p data-ndvi-quality>Válidos en {summary.aoiKind==='polygon'?'el polígono':'la ventana'}: {summary.validPixels.toLocaleString('es-AR')} / {summary.windowPixels.toLocaleString('es-AR')} ({(summary.validFraction*100).toLocaleString('es-AR',{maximumFractionDigits:2})} %). Ráster rectangular: {summary.rasterPixels.toLocaleString('es-AR')} píxeles.</p>
   {summary.validPixels===0?<p role="alert">Sin píxeles válidos: no hay NDVI interpretable.</p>:<NdviResultView job={job} summary={summary}/>}
   <div className="amb-ndvi-downloads"><a href={ndviFileUrl(job,'raster')} download>Descargar GeoTIFF</a><a href={ndviFileUrl(job,'report')} download>Descargar informe JSON</a><button disabled={busy} onClick={()=>void action(async()=>{const r=await fetch(ndviFileUrl(job,'report'));if(!r.ok)throw Error('No se pudo recuperar el informe.');const blob=await r.blob();if(blob.size>1048576)throw Error('El informe supera el límite de revisión.');onReport(new File([blob],'MITA-NDVI-'+job.id+'.json',{type:'application/json'}));setMessage('Informe enviado a la ficha de revisión de abajo. Revisá su vínculo antes de guardarlo.');})}>Revisar y vincular al proyecto</button></div></>}
   </>}
  </article></div>}
 </section>;
}
