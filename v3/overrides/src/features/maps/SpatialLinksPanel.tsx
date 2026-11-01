import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import type {DemoState} from '../../lib/demo';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
// @ts-ignore: browser and Node pure contracts are shared for spatial links
import {assignRecordZones,blankSpatialLinks,displayName,exportSpatialLinks,readSpatialBrowserContext,
 recordList,seedDemoSpatialLinks,summarizeSpatialLinks} from './spatial-links.mjs';
import './spatial-links.css';

type Kind='impact'|'measure'|'inspection'|'evidence';
type Mode=Kind|'overview'|'report';
type Props={data:DemoState;mode:Mode};
type SpatialState={records:Record<Kind,Record<string,{zoneIds:string[];updatedAt:string}>>};
type ZoneTotals={id:string;label:string;color:string;impact:number;measure:number;inspection:number;evidence:number};
type SpatialSummary={totalLinked:number;totalRecords:number;
 counts:Record<Kind,{linked:number;total:number}>;
 byZone:ZoneTotals[];
 conflicts:{kind:string;id:string;relatedKind:string;relatedId:string}[]};
const kinds:Kind[]=['impact','measure','inspection','evidence'];
const titles:Record<Kind,string>={impact:'Impactos',measure:'Medidas PGA',
 inspection:'Inspecciones',evidence:'Evidencias'};
const zoneMeta=[
 {id:'A',name:'Operación',color:'#f4b466'},
 {id:'B',name:'Monitoreo',color:'#63cddd'},
 {id:'C',name:'Restauración',color:'#b8a2f6'},
 {id:'D',name:'Resguardo',color:'#8de0a7'}
];
function download(name:string,value:unknown){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=name;
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),500);
}
export function SpatialLinksPanel({data,mode}:Props){
 const [revision,setRevision]=useState(0);
 const [filter,setFilter]=useState('todos');
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 useEffect(()=>{
  const refresh=()=>{setRevision(x=>x+1);setError('');};
  window.addEventListener('storage',refresh);
  window.addEventListener('ambienta:spatial-updated',refresh);
  window.addEventListener('focus',refresh);
  return ()=>{window.removeEventListener('storage',refresh);
   window.removeEventListener('ambienta:spatial-updated',refresh);
   window.removeEventListener('focus',refresh);};
 },[]);
 const context=useMemo(()=>readSpatialBrowserContext(data,IS_DIABLILLOS_CASE),
  [data,revision]);
 const {scenario,status,reason,key}=context;
 const state=context.state as SpatialState|null;
 const summary=useMemo<SpatialSummary|null>(()=>scenario&&state&&status!=='blocked'?
  summarizeSpatialLinks(state,data,scenario) as SpatialSummary:null,[scenario,state,status,data]);
 function notify(){
  setRevision(n=>n+1);
  window.dispatchEvent(new Event('ambienta:spatial-updated'));
 }
 function save(kind:Kind,id:string,zone:string,checked:boolean){
  setError('');setSuccess('');
  if(!scenario||!state||status==='blocked'){
   setError('No se pueden modificar vínculos sin un escenario válido y registros consistentes.');return;
  }
  try{
   const previous=state.records[kind][id]?.zoneIds||[];
   const selected=checked?[...previous.filter((x:string)=>x!==zone),zone]:
    previous.filter((x:string)=>x!==zone);
   const next=assignRecordZones(state,data,scenario,kind,id,selected,new Date().toISOString());
   localStorage.setItem(key,JSON.stringify(next));notify();
   setSuccess('Asignación de ensayo guardada exclusivamente en este navegador.');
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo guardar la asignación.');}
 }
 function seed(){
  setError('');setSuccess('');
  if(!scenario||!state||status==='blocked'||summary?.totalLinked){
   setError('Necesitás un escenario válido sin asignaciones previas para cargar el caso QA.');return;
  }
  try{
   const next=seedDemoSpatialLinks(state,data,scenario,new Date().toISOString());
   localStorage.setItem(key,JSON.stringify(next));notify();
   setSuccess('Se cargaron 16 asignaciones DOCUMENTALES SIMULADAS de Diablillos.');
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo generar el caso de prueba.');}
 }
 function reset(){
  try{localStorage.removeItem(key);notify();setSuccess('Vínculos locales borrados; el polígono y los datos ambientales originales permanecen intactos.');}
  catch{setError('No se pudieron limpiar las asignaciones locales.');}
 }
 function exportLinks(){
  setError('');
  if(!scenario||!state||status==='blocked')return;
  try{download('ambienta-vinculos-espaciales-demo.json',exportSpatialLinks(state,data,scenario));}
  catch(cause){setError(cause instanceof Error?cause.message:'No fue posible exportar el registro.');}
 }
 const isTable=kinds.includes(mode as Kind);
 const category=isTable?mode as Kind:null;
 const rows=category?recordList(data,category):[];
 const filtered=rows.filter((r:{id:string})=>{
  const ids=state?.records?.[category!]?.[r.id]?.zoneIds||[];
  return filter==='todos'||(filter==='sin_asignar'?ids.length===0:ids.includes(filter));
 });
 return <section className="geo-links-panel" data-spatial-links={mode}
   aria-label="Vinculación espacial experimental">
   <div className="geo-links-header">
    <div><small>AMBIENTA · VINCULACIÓN SIG V3.3</small>
     <h3>{category?'Zonas para '+titles[category].toLowerCase():'Trazabilidad entre zonas y módulos'}</h3></div>
    <span>SIMULADO · NO OFICIAL</span>
   </div>
   <p>Asigná explícitamente registros documentales a zonas A–D del <b>polígono de ensayo</b>.
    Los vínculos no verifican la ubicación física de impactos, monitoreos ni evidencias.</p>
   {!scenario&&<div className="geo-links-empty" data-spatial-context="missing">
     <strong>No hay polígono de ensayo activo.</strong>
     <p>{reason}</p><Link to="/area">Ir a Área de estudio y generar zonas</Link>
    </div>}
   {scenario&&<div className="geo-links-context" data-spatial-context={status}>
     <span>Polígono: <b>{scenario.sourceKind==='synthetic'?'Sintético':'Importado (no verificado)'}</b></span>
     <span>SHA-256: <code>{scenario.sourceHash.slice(0,16)}…</code></span>
     <span>Superficie de ensayo: <b>{scenario.summary.parentHa.toLocaleString('es-AR',{maximumFractionDigits:2})} ha</b></span>
    </div>}
   {scenario&&status==='blocked'&&<div className="geo-links-alert" role="alert">
     <strong>Asignaciones anteriores bloqueadas.</strong><p>{reason}</p>
     <button type="button" onClick={reset}>Descartar vínculos obsoletos</button>
    </div>}
   {scenario&&state&&status!=='blocked'&&<>
    <div className="geo-links-toolbar">
     {data.project.id==='DIAB-2026-DEMO'&&<button type="button"
       onClick={seed} disabled={summary!.totalLinked>0}
       data-spatial-seed="qa">Cargar 16 vínculos simulados de prueba</button>}
     <button type="button" onClick={exportLinks} disabled={summary!.totalLinked===0}>
      Exportar vínculos JSON</button>
     <button type="button" onClick={reset} disabled={summary!.totalLinked===0}>Quitar vínculos</button>
    </div>
    <div className="geo-links-stats" data-spatial-counts="true">
     {kinds.map(k=><div key={k}><small>{titles[k]}</small>
      <strong>{summary!.counts[k].linked}<span> / {summary!.counts[k].total}</span></strong></div>)}
    </div>
    {category&&<div className="geo-links-list" data-spatial-records={category}>
      <label className="geo-links-filter">Filtrar registros por zona
       <select aria-label={'Filtrar '+titles[category]+' por zona'} value={filter}
        onChange={e=>setFilter(e.target.value)}>
        <option value="todos">Todos</option><option value="sin_asignar">Sin asignar</option>
        {zoneMeta.map(z=><option key={z.id} value={z.id}>Zona {z.id} · {z.name}</option>)}
       </select></label>
      {filtered.map((r:{id:string})=><div key={r.id} className="geo-links-record" data-spatial-record={r.id}>
       <div className="geo-links-record-title"><strong>{r.id}</strong>
        <span>{displayName(category,r)}</span></div>
       <div className="geo-links-zone-controls" role="group" aria-label={'Asignar zonas a '+r.id}>
        {zoneMeta.map(z=><label key={z.id} style={{'--zone-color':z.color} as React.CSSProperties}>
         <input type="checkbox" aria-label={'Zona '+z.id+' para '+r.id}
          checked={Boolean(state.records[category][r.id]?.zoneIds.includes(z.id))}
          onChange={e=>save(category,r.id,z.id,e.target.checked)}/>
         <span>{z.id}</span></label>)}
       </div>
      </div>)}
      {filtered.length===0&&<p>No hay registros para este filtro; no se han fabricado entidades nuevas.</p>}
     </div>}
    {!category&&<div className="geo-links-zones" data-spatial-zone-summary="true">
      {summary!.byZone.map((z:{id:string;label:string;color:string;impact:number;measure:number;inspection:number;evidence:number})=>
       <div key={z.id} className="geo-links-zone-card">
        <i style={{background:z.color}} aria-hidden="true"/>
        <strong>Zona {z.id}</strong><span>{z.label.replace(/^Área [A-D] · /,'')}</span>
        <small>{z.impact} impactos · {z.measure} medidas</small>
        <small>{z.inspection} inspecciones · {z.evidence} evidencias</small>
       </div>)}
     </div>}
    <div className="geo-links-checks">
     <strong>Coherencia documental entre módulos</strong>
     {summary!.conflicts.length?<>
       <p role="alert">Se detectaron {summary!.conflicts.length} asociaciones con zonas distintas
        entre registros vinculados. Revisarlas no modifica ni valida ningún documento.</p>
       <ul>{summary!.conflicts.slice(0,6).map((c:{kind:string;id:string;relatedKind:string;relatedId:string},i:number)=>
        <li key={c.kind+c.id+c.relatedId+i}>{c.kind} {c.id} ↔ {c.relatedKind} {c.relatedId}</li>)}</ul>
      </>:<p>Sin contradicciones entre las asociaciones actualmente asignadas.
        Esto <b>no acredita conformidad ambiental</b>.</p>}
    </div>
   </>}
   {error&&<p role="alert" className="geo-links-alert">{error}</p>}
   {success&&<p role="status" className="geo-links-success">{success}</p>}
   <small className="geo-links-note">Vinculación local de QA, separada del expediente ambiental original.
    No se cargan nuevas coordenadas a servidores; el JSON exportado sí puede contener la ventana BBOX.
    La asignación se invalida si cambia el polígono o su generación.</small>
  </section>;
}
