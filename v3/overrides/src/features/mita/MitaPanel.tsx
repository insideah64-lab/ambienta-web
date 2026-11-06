import {BrowserNdviWorkbench} from './BrowserNdviWorkbench';
import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import type {DemoState} from '../../lib/demo';
import {ArtworkIcon} from '../iconography/ArtworkIcon';
import {No2Workbench} from './No2Workbench';
import {VegetationWorkbench} from './VegetationWorkbench';
import {VegetationTimelineWorkbench} from './VegetationTimelineWorkbench';
import {NdviWorkbench} from './NdviWorkbench';
import {mitaKey,readMita,parseMitaReport,addMita,reportHash,verifyTiff,MAX_REPORT_BYTES,MAX_TIFF_BYTES,type MitaEntry} from './MitaModel';
import './MitaPanel.css';
function download(name:string,raw:string){const u=URL.createObjectURL(new Blob([raw],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
function load(id:string){try{const raw=localStorage.getItem(mitaKey(id));return {raw,doc:readMita(raw,id),error:''};}catch(e){return {raw:null,doc:null,error:String(e)};}}
const f=(n:number|null)=>n===null?'Sin datos':n.toLocaleString('es-AR',{minimumFractionDigits:4,maximumFractionDigits:6});
export function MitaPanel({data}:{data:DemoState}){
 const project=data.project.id,[saved,setSaved]=useState(()=>load(project)),[pending,setPending]=useState<{entry:MitaEntry;report:any}|null>(null);
 const [context,setContext]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[verified,setVerified]=useState<Record<string,string>>({});
 const [params,setParams]=useSearchParams(),source=useRef(saved.raw),operation=useRef(false);
 const historicalLink=params.get('historial')==='ndvi'||(params.get('modo')!=='temporal'&&!params.get('vegetacion')&&!!(params.get('trabajo')||params.get('producto')||params.get('area')==='guardada'));
 const [historyOpen,setHistoryOpen]=useState(historicalLink||!!saved.error);
 useEffect(()=>{if(historicalLink||saved.error)setHistoryOpen(true);},[historicalLink,saved.error]);
 const selected=saved.doc?.entries.find(e=>e.id===params.get('producto'));
 const entry=pending?.entry||selected,report=pending?.report||(selected?parseMitaReport(selected.raw):null);
 const choose=(id:string)=>{setPending(null);setNotice('');setParams(prev=>{const p=new URLSearchParams(prev);p.set('producto',id);return p;});};
 async function importReport(file?:File){if(!file||operation.current)return;operation.current=true;setBusy(true);setNotice('');try{
  if(file.size>MAX_REPORT_BYTES)throw Error('El informe supera 1 MiB.');
  const raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer()),report=parseMitaReport(raw),id=await reportHash(raw);
  const existing=saved.doc?.entries.find(e=>e.id===id);
  if(existing){choose(id);setNotice('Este informe ya está registrado; no se duplicó.');return;}
  setContext('');setPending({entry:{id,filename:file.name,raw,importedAt:new Date().toISOString(),context:''},report});
 }catch(e){setNotice(e instanceof Error?e.message:String(e));}finally{setBusy(false);operation.current=false;}}
 function register(){if(!pending||!saved.doc)return;try{
  if(context.trim().length<10)throw Error('Explicá la relación de este resultado con el proyecto (mínimo 10 caracteres).');
  const current=localStorage.getItem(mitaKey(project));
  if(current!==source.current)throw Error('Otra pestaña cambió los resultados. Recargá antes de registrar; el archivo nuevo se conserva.');
  const next=addMita(saved.doc,{...pending.entry,context:context.trim()});
  if(current!==null)localStorage.setItem(mitaKey(project)+':backup:'+crypto.randomUUID(),current);
  const raw=JSON.stringify(next);localStorage.setItem(mitaKey(project),raw);source.current=raw;setSaved({raw,doc:next,error:''});
  choose(pending.entry.id);setNotice('Informe vinculado al proyecto y guardado localmente.');
 }catch(e){setNotice((e instanceof Error?e.message:String(e))+' El informe original sigue disponible para descargar; no se confirmó el guardado.');}}
 async function checkTiff(file?:File){if(!file||!entry||!report||operation.current)return;const id=entry.id,expected=report.output_sha256;operation.current=true;setBusy(true);try{
  if(file.size>MAX_TIFF_BYTES)throw Error('El GeoTIFF supera 64 MiB.');
  await verifyTiff(await file.arrayBuffer(),expected);setVerified(v=>({...v,[id]:file.name}));setNotice('Huella coincidente. Los bytes del archivo coinciden con el hash declarado; esto no valida su contenido científico.');
 }catch(e){setVerified(v=>{const n={...v};delete n[id];return n;});setNotice(e instanceof Error?e.message:String(e));}finally{setBusy(false);operation.current=false;}}
 const isNo2=params.get('analisis')==='no2';
 const switcher=<nav className="amb-mita-analysis-switch" aria-label="Tipo de análisis satelital"><button aria-pressed={!isNo2} onClick={()=>setParams(prev=>{const p=new URLSearchParams(prev);p.set('analisis','vegetacion');return p;})}>Vegetación</button><button aria-pressed={isNo2} onClick={()=>setParams(prev=>{const p=new URLSearchParams(prev);p.set('analisis','no2');return p;})}>Atmósfera · NO₂</button></nav>;
 if(isNo2)return <section className="amb-mita" data-mita-workspace aria-label="Resultados satelitales MITA"><header><h2>MITA · análisis satelital</h2><p>Delimitaciones y resultados independientes para cada proyecto.</p></header>{switcher}<No2Workbench key={project} project={project}/></section>;
 return <section className="amb-mita" data-mita-workspace aria-label="Resultados satelitales MITA">
  {params.get('modo')!=='temporal'&&<header className="v2-panel-title"><div><h2><ArtworkIcon kind="satellite" size={25}/> Vegetación</h2><p>Elegí sensor e índice, calculá sobre la delimitación del proyecto y consultá sus resultados.</p></div></header>}
  <div className="amb-mita-navigation">{switcher}
  <label className="amb-mita-mode">Tipo de análisis<select data-mita-vegetation-mode value={params.get('modo')==='navegador'?'navegador':params.get('modo')==='temporal'?'temporal':'adquisicion'} onChange={e=>setParams(prev=>{const p=new URLSearchParams(prev);if(e.target.value==='adquisicion')p.delete('modo');else p.set('modo',e.target.value);return p;})}><option value="navegador">NDVI en esta PC · sin servidor</option><option value="adquisicion">Una adquisición · sensores e índices</option><option value="temporal">Seguimiento temporal de vegetación</option></select></label></div>
  {params.get('modo')==='navegador'?<BrowserNdviWorkbench key={project} project={project}/>:params.get('modo')==='temporal'?<VegetationTimelineWorkbench key={project} project={project}/>:<VegetationWorkbench key={project} project={project}/>}
  <details className="amb-mita-history" data-mita-history open={historyOpen} onToggle={e=>{const open=e.currentTarget.open;if(open===historyOpen)return;setHistoryOpen(open);setParams(prev=>{const p=new URLSearchParams(prev);if(open)p.set('historial','ndvi');else p.delete('historial');return p;},{replace:true});}}><summary>Resultados NDVI anteriores e informes importados</summary>
  {historyOpen&&<><p>Consultá los trabajos anteriores de Sentinel-2 y los informes vinculados a <strong>{project}</strong>. Para nuevos análisis usá los selectores de arriba.</p>
  <NdviWorkbench historyOnly project={project} onReport={file=>void importReport(file)}/>
  <p className="amb-mita-note">Los informes conservan el cálculo y la calibración del motor. El NDVI no es una medición de contaminación ni un dictamen de impacto ambiental.</p>
  {saved.error&&<div role="alert"><p>El archivo local no se puede abrir. No se sobrescribe: {saved.error}</p><button onClick={()=>{try{download('MITA-original-local.json',localStorage.getItem(mitaKey(project))||'');}catch{setNotice('No se pudo leer el almacenamiento.');}}}>Descargar original local</button></div>}
  <div className="amb-mita-toolbar"><label>Importar informe MITA 0.2.0 (JSON, hasta 1 MiB)<input data-mita-import type="file" accept=".json,application/json" disabled={busy||!!saved.error} onChange={e=>{void importReport(e.target.files?.[0]);e.target.value='';}}/></label>
  <button disabled={!saved.doc?.entries.length} onClick={()=>download('AMBIENTA-MITA-'+project+'.json',JSON.stringify({...saved.doc,note:'Archivo de resultados vinculados; no incluye GeoTIFF ni verificación científica.'},null,2))}>Exportar registro del proyecto</button></div>
  <p role="status" aria-live="polite" data-mita-status>{busy?'Leyendo y comprobando archivo…':notice}</p>
  <div className="amb-mita-layout"><aside aria-label="Productos registrados"><h3>Productos <span>({saved.doc?.entries.length||0}/20)</span></h3>
   {!saved.doc?.entries.length&&<p>No hay resultados vinculados. Importá un informe del motor para empezar.</p>}
   {saved.doc?.entries.map(e=>{const r=parseMitaReport(e.raw);return <button key={e.id} aria-pressed={selected?.id===e.id&&!pending} onClick={()=>choose(e.id)}><strong>{r.scene_id}</strong><small>{r.acquisition_datetime.slice(0,10)} · NDVI</small></button>;})}
  </aside><article aria-label="Ficha del producto">
   {!entry||!report?<div className="amb-mita-empty"><h3>Un resultado trazable empieza por su fuente</h3><p>El informe debe identificar escena, adquisición, BBOX, calibración, máscara SCL, estadísticas y hash del GeoTIFF. No se cargan valores simulados automáticamente.</p>{params.get('producto')&&!selected&&<p role="alert">El producto de este enlace no está en el registro local de este proyecto.</p>}</div>:<>
   <header><p>{pending?'VISTA PREVIA · SIN REGISTRAR':'REGISTRADO EN '+project}</p><h3 data-mita-scene>{report.scene_id}</h3><p>Adquisición: <time>{report.acquisition_datetime}</time> · {report.collection}</p></header>
   <div className="amb-mita-stats">{[['NDVI mínimo',report.statistics.ndvi_min],['NDVI promedio',report.statistics.ndvi_mean],['NDVI máximo',report.statistics.ndvi_max]].map(([label,n])=><div key={String(label)}><small>{label}</small><strong>{f(n as number|null)}</strong></div>)}</div>
   <div className="amb-mita-quality"><h4>Calidad y cobertura</h4><dl>
    {report.aoi?.kind==='polygon'&&<div><dt>Píxeles válidos del polígono · exterior y huecos excluidos</dt><dd>{report.quality.valid_pixels.toLocaleString('es-AR')} / {report.quality.inside_aoi_pixels.toLocaleString('es-AR')} ({f(report.quality.valid_fraction_inside_aoi*100)} %)</dd></div>}
    <div><dt>Píxeles válidos dentro de la BBOX</dt><dd>{report.quality.valid_pixels.toLocaleString('es-AR')} / {report.quality.inside_bbox_pixels.toLocaleString('es-AR')} ({f(report.quality.valid_fraction_inside_bbox*100)} %)</dd></div>
    <div><dt>Píxeles válidos del ráster rectangular</dt><dd>{report.statistics.valid_pixels.toLocaleString('es-AR')} / {report.statistics.pixels.toLocaleString('es-AR')} ({f(report.statistics.valid_fraction*100)} %)</dd></div>
    <div><dt>Nubosidad de la escena completa</dt><dd>{f(report.scene_cloud_percent)} % · no representa la nubosidad local</dd></div>
    <div><dt>SCL retenida</dt><dd>4 vegetación · 5 suelo sin vegetación · 6 agua</dd></div>
    <div><dt>BBOX EPSG:4326</dt><dd>{report.bbox_epsg4326.join(', ')} · ventana de cálculo, no perímetro acreditado</dd></div>
    <div><dt>Ráster</dt><dd>{report.raster.width} × {report.raster.height} · {report.raster.crs}</dd></div>
   </dl>{report.statistics.valid_pixels===0&&<p role="alert">Sin píxeles válidos: no hay un resultado NDVI interpretable.</p>}</div>
   <details><summary>Calibración, procedencia y huellas</summary><dl>{Object.entries(report.calibration).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}<div><dt>SHA-256 del GeoTIFF declarado</dt><dd>{report.output_sha256}</dd></div><div><dt>SHA-256 del JSON original</dt><dd>{entry.id}</dd></div><div><dt>Estado declarado por el motor</dt><dd>{report.validation_status}</dd></div><div><dt>Generación</dt><dd>{report.generated_at_utc}</dd></div></dl><p>Los enlaces del JSON se conservan como datos; no se ejecutan ni descargan automáticamente.</p></details>
   <div className="amb-mita-verification"><h4>Comprobar el archivo GeoTIFF</h4><p data-mita-verification>{verified[entry.id]?'Huella coincidente en esta sesión: '+verified[entry.id]:'Archivo no comprobado en esta sesión.'}</p><label>Seleccionar GeoTIFF local (hasta 64 MiB)<input data-mita-tiff type="file" accept=".tif,.tiff" disabled={busy} onChange={e=>{void checkTiff(e.target.files?.[0]);e.target.value='';}}/></label><small>Solo se comparan bytes mediante SHA-256. El ráster no se interpreta ni se guarda en el navegador; la comprobación se repite al recargar.</small></div>
   {pending?<div className="amb-mita-link"><label>Relación con el proyecto y alcance del resultado<textarea data-mita-context value={context} maxLength={2000} onChange={e=>setContext(e.target.value)} placeholder="Indicá el área estudiada, la fuente y por qué corresponde a este proyecto."/></label><button disabled={busy||context.trim().length<10} data-mita-register onClick={register}>Vincular informe a {project}</button><button onClick={()=>setPending(null)}>Cancelar vista previa</button></div>:<p><strong>Vínculo declarado:</strong> {entry.context}</p>}
   <button data-mita-export-original onClick={()=>download('MITA-'+entry.id.slice(0,12)+'-original.json',entry.raw)}>Descargar JSON original</button>
   </>}
  </article></div>
  <footer><p>Flujo: calcular NDVI o importar un resultado → revisar JSON y GeoTIFF → vincular al proyecto. La consulta de series publicadas está disponible en Seguimiento temporal. El modo NDVI en esta PC procesa nuevas imágenes Sentinel-2 en el navegador. Los demás sensores e índices requieren el servicio de cálculo conectado; la ejecución remota autenticada sigue pendiente.</p><a href="https://sentiwiki.copernicus.eu/web/s2-applications" target="_blank" rel="noreferrer">Referencia técnica Sentinel-2 · Copernicus</a></footer>
  </>}
  </details>
 </section>;
}
