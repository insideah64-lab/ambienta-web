import {useEffect,useId,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowDownToLine,Plus,UploadCloud} from 'lucide-react';
import {ArtworkIcon} from '../iconography/ArtworkIcon';
import type {DemoState} from '../../lib/demo';
import {BASELINE_SCHEMA,ORIGINS,BASES,SCENARIOS,QUALIFIERS,baselineKey,emptyBaseline,blankIndicator,blankObservation,validBaseline,registerIndicator,registerObservation,mergeBaseline,activeObservations,baselineSummary,baselineResult,baselineCsv,type BaselineDocument,type Observation} from './BaselineModel';
import {baselineTraining} from './BaselineTraining';
import './BaselinePanel.css';
function load(id:string,name:string){
 try{const raw=localStorage.getItem(baselineKey(id));if(raw!==null){const parsed:unknown=JSON.parse(raw);return validBaseline(parsed,id)?{doc:parsed,damaged:false,raw}:{doc:emptyBaseline(id,name),damaged:true,raw};}}
 catch{return {doc:emptyBaseline(id,name),damaged:true,raw:null};}
 return {doc:emptyBaseline(id,name),damaged:false,raw:null};
}
function download(name:string,type:string,body:string){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function BaselinePanel({data}:{data:DemoState}){
 const id=data.project.id,[initial]=useState(()=>load(id,data.project.name));
 const [doc,setDoc]=useState<BaselineDocument>(initial.doc),[damaged,setDamaged]=useState(initial.damaged);
 const lastStored=useRef(initial.raw);
 const [persistent,setPersistent]=useState(true),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [form,setForm]=useState<'indicator'|'observation'|null>(null),[indicator,setIndicator]=useState(blankIndicator),[observation,setObservation]=useState(()=>blankObservation());
 const [history,setHistory]=useState(false),[origin,setOrigin]=useState('');
 const [params,setParams]=useSearchParams(),uid=useId();
 const formRef=useRef<HTMLFormElement>(null);
 useEffect(()=>{if(form){formRef.current?.scrollIntoView({block:'start'});formRef.current?.querySelector<HTMLElement>('input:not(:disabled),select:not(:disabled)')?.focus({preventScroll:true});}},[form]);
 const selectedRecord=doc.observations.find(o=>o.id===params.get('registro'));
 const selectedId=selectedRecord?.indicatorId||(doc.indicators.some(i=>i.id===params.get('indicador'))?params.get('indicador')!:'');
 const summary=baselineSummary(doc),active=activeObservations(doc),activeIds=new Set(active.map(o=>o.id));
 const rows=(history?doc.observations:active).filter(o=>(!selectedId||o.indicatorId===selectedId)&&(!origin||o.origin===origin)).slice().reverse();
 const selectedIndicator=doc.indicators.find(i=>i.id===selectedRecord?.indicatorId);
 function persist(next:BaselineDocument){
  try{if(localStorage.getItem(baselineKey(id))!==lastStored.current){setError('Otra pestaña cambió este registro. Exportá tu trabajo actual y recargá antes de añadir datos; no se sobrescribió el archivo local.');return false;}const raw=JSON.stringify(next);localStorage.setItem(baselineKey(id),raw);lastStored.current=raw;setPersistent(true);setNotice('Cambios guardados en este navegador.');}
  catch{setPersistent(false);setNotice('Guardado no disponible: el trabajo permanece en memoria. Exportá JSON antes de salir o recargar.');}
  setDoc(next);setError('');return true;
 }
 function merge(incoming:unknown){const result=mergeBaseline(doc,incoming);if(result.changed)persist(result.doc);else setNotice('Los registros ya existen; no se reescribieron datos.');}
 function selectIndicator(value:string){setParams(value?{indicador:value}:{});}
 function openObservation(old?:Observation){
  setError('');setForm('observation');if(old){const {id:oldId,createdAt:_created,...values}=old;setObservation({...values,supersedes:oldId,correctionReason:''});}else setObservation(blankObservation(selectedId||doc.indicators[0]?.id||''));
 }
 const observationPatch=(patch:Partial<typeof observation>)=>setObservation(current=>({...current,...patch}));
 function input(field:keyof typeof indicator,label:string,area=false){
  const props={id:uid+'-indicator-'+field,'aria-label':label,value:String(indicator[field]),maxLength:field==='description'?5000:1000,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setIndicator(current=>({...current,[field]:e.target.value}))};
  return <label key={field} htmlFor={props.id}>{label}{area?<textarea {...props} rows={2}/>:<input {...props}/>}</label>;
 }
 function obsText(field:'location'|'horizon'|'uncertaintyNote'|'source'|'author'|'notes'|'correctionReason',label:string,area=false){
  const props={id:uid+'-observation-'+field,'aria-label':label,value:observation[field],maxLength:5000,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>observationPatch({[field]:e.target.value})};
  return <label key={field} htmlFor={props.id}>{label}{area?<textarea {...props} rows={2}/>:<input {...props}/>}</label>;
 }
 function obsNumber(field:'value'|'detectionLimit'|'latitude'|'longitude'|'uncertainty',label:string,disabled=false){return <label>{label}<input aria-label={label} type="number" step="any" disabled={disabled} value={observation[field]??''} onChange={e=>observationPatch({[field]:Number.isFinite(e.target.valueAsNumber)?e.target.valueAsNumber:null})}/></label>;}
 const pointValue=['exact','lt','gt'].includes(observation.qualifier);
 return <section className="v2-panel amb-baseline" data-baseline>
  <header className="v2-panel-title"><div><p className="v2-kicker">DATOS DEL MEDIO · REGISTRO LOCAL POR PROYECTO</p><h2><ArtworkIcon kind="inspections" size={25}/> Indicadores y registros ambientales</h2></div>
   <div className="lb-actions">
    <button type="button" disabled={damaged} onClick={()=>download('AMBIENTA-LineaBase-'+id+'.json','application/json',JSON.stringify(doc,null,2))}><ArrowDownToLine size={16}/> JSON</button>
    <button type="button" disabled={damaged} onClick={()=>download('AMBIENTA-LineaBase-'+id+'.csv','text/csv;charset=utf-8',baselineCsv(doc))}><ArrowDownToLine size={16}/> CSV</button>
    <label className="lb-file"><UploadCloud size={16}/> Importar JSON<input aria-label="Importar JSON de línea base" type="file" accept=".json,application/json" onChange={async event=>{
     const file=event.target.files?.[0];event.target.value='';if(!file)return;
     try{
      if(file.size>10000000)throw Error('El archivo supera 10 MB.');const parsed:unknown=JSON.parse(await file.text());
      if(!validBaseline(parsed,id))throw Error('Archivo incompatible con el proyecto, esquema o cadena de versiones. Los datos actuales se conservan.');
      if(damaged){if(!window.confirm('¿Restaurar este documento válido conservando una copia local del archivo dañado?'))return;const raw=localStorage.getItem(baselineKey(id));if(raw!==null)localStorage.setItem(baselineKey(id)+':backup:'+Date.now(),raw);lastStored.current=raw;if(persist(parsed))setDamaged(false);}
      else merge(parsed);
     }catch(e){setError(e instanceof Error?e.message:'No se pudo importar el archivo.');}
    }}/></label>
   </div></header>
  <p className="lb-intro">Definí qué se observa, cómo se obtiene el dato y de dónde proviene. Las magnitudes no son puntuaciones de impacto ni acreditan calidad o cumplimiento por sí solas.</p>
  <div className="lb-links"><Link to="/area">Consultar área de estudio</Link><Link to="/matrices">Abrir matrices ambientales</Link><span>Proyecto {id} · {BASELINE_SCHEMA}</span></div>
  {damaged&&<div role="alert" className="lb-warning">El archivo local no supera la validación. Se conserva intacto; la edición está bloqueada. <button type="button" onClick={()=>{try{download('LineaBase-original-'+id+'.txt','text/plain',localStorage.getItem(baselineKey(id))??'');}catch{setError('No se pudo leer el respaldo original.');}}}>Descargar archivo original</button></div>}
  {!persistent&&<p role="alert" className="lb-warning">Datos solo en memoria: descargá el JSON para conservarlos.</p>}
  {error&&!form&&<p role="alert" className="lb-error">{error}</p>}{notice&&<p role="status" className="lb-status">{notice}</p>}
  <div className="lb-summary" aria-label="Resumen de línea base"><span><strong data-lb-indicators>{summary.indicators}</strong>indicadores definidos</span><span><strong data-lb-active>{summary.active}</strong>registros vigentes · {summary.history} versiones previas</span><span><strong>{summary.synthetic} / {summary.declared}</strong>sintéticos / de fuente declarada</span><span><strong data-lb-exact>{summary.exact}</strong>valores puntuales · {summary.censored} censurados · {summary.missing} faltantes</span></div>
  <p className="lb-note">“Fuente declarada” y “medido declarado” describen lo informado por el responsable. La aplicación no autentica archivos ni valida mediciones. Los límites y no detectados no se convierten en cero.</p>
  <div className="lb-toolbar"><h3>Catálogo de indicadores</h3><div className="lb-actions"><button disabled={damaged} type="button" onClick={()=>{setIndicator(blankIndicator());setForm('indicator');setError('');}}><Plus size={16}/> Nuevo indicador</button>
   <button disabled={damaged} type="button" onClick={()=>{try{merge(baselineTraining(id,data.project.name));selectIndicator('');}catch(e){setError(String(e instanceof Error?e.message:e));}}}>Añadir ejemplo sintético</button></div></div>
  {doc.indicators.length?<div className="lb-scroll lb-catalog"><table><caption>Definiciones conservadas: otra unidad o método requiere otro indicador, sin reetiquetar datos anteriores.</caption><thead><tr><th>Indicador</th><th>Factor / unidad</th><th>Método y soporte temporal</th><th>Vínculos declarados</th></tr></thead><tbody>{doc.indicators.map(i=><tr key={i.id} data-lb-indicator={i.id}><th scope="row"><button type="button" aria-pressed={selectedId===i.id} onClick={()=>selectIndicator(i.id)}>{i.name}</button><small>{i.id}</small></th><td>{i.factor}<small>{i.unit}</small></td><td>{i.method}<small>{i.temporalSupport}</small></td><td>{i.impactIds.length?i.impactIds.map(impact=>data.impacts.some(x=>x.id===impact)?impact:impact+' (fuera del registro actual)').join(', '):'Sin vínculo a impacto; dato de inventario'}{i.description&&<small>{i.description}</small>}</td></tr>)}</tbody></table></div>:<p className="lb-empty">Todavía no hay indicadores. Registrá una definición o añadí el ejemplo sintético de capacitación. Abrir esta página no crea mediciones.</p>}
  <div className="lb-toolbar"><h3>Registros y trazabilidad</h3><button type="button" disabled={damaged||!doc.indicators.length} onClick={()=>openObservation()}><Plus size={16}/> Registrar dato</button></div>
  <div className="lb-filters"><label>Indicador<select aria-label="Filtrar indicador" value={selectedId} onChange={e=>selectIndicator(e.target.value)}><option value="">Todos los indicadores</option>{doc.indicators.map(i=><option key={i.id} value={i.id}>{i.name} · {i.unit}</option>)}</select></label><label>Procedencia<select aria-label="Filtrar procedencia" value={origin} onChange={e=>setOrigin(e.target.value)}><option value="">Todas</option>{Object.entries(ORIGINS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label className="lb-checkbox"><input type="checkbox" checked={history} onChange={e=>setHistory(e.target.checked)}/> Mostrar versiones previas</label></div>
  <div className="lb-scroll" tabIndex={0} role="region" aria-label="Registro ambiental con desplazamiento"><table><caption>{rows.length} registros visibles. Los escenarios SIN/CON no son una serie temporal observada.</caption><thead><tr><th>Indicador / período</th><th>Resultado / unidad</th><th>Procedencia</th><th>Escenario / ámbito</th><th>Versión / ficha</th></tr></thead><tbody>{rows.map(o=>{const i=doc.indicators.find(i=>i.id===o.indicatorId)!;return <tr key={o.id} data-lb-observation={o.id}><th scope="row">{i.name}<small>{o.start} → {o.end}</small></th><td>{baselineResult(o)}<small>{i.unit}</small></td><td><b>{ORIGINS[o.origin]}</b><small>{BASES[o.basis]}</small></td><td>{SCENARIOS[o.scenario]}<small>{o.location}</small></td><td>{activeIds.has(o.id)?'Vigente':'Corregido, conservado'}<button type="button" onClick={()=>setParams({indicador:o.indicatorId,registro:o.id})}>Ver registro</button></td></tr>;})}</tbody></table>{!rows.length&&<p className="lb-empty">Sin registros para esta selección. Un dato ausente no equivale a cero.</p>}</div>
  {params.get('registro')&&!selectedRecord&&<p role="status">El registro del enlace no existe en este proyecto.</p>}
  {selectedRecord&&selectedIndicator&&<section className="lb-detail" data-lb-detail><header className="lb-toolbar"><h3>Ficha del registro · {selectedIndicator.name}</h3><button type="button" disabled={damaged||!activeIds.has(selectedRecord.id)} onClick={()=>openObservation(selectedRecord)}>Corregir mediante nueva versión</button></header>
   <dl>{Object.entries({'ID':selectedRecord.id,'Resultado':baselineResult(selectedRecord)+' '+selectedIndicator.unit,'Período':selectedRecord.start+' → '+selectedRecord.end,'Escenario':SCENARIOS[selectedRecord.scenario],'Horizonte':selectedRecord.horizon||'No corresponde a escenario estimado','Ámbito/punto':selectedRecord.location,'Coordenadas WGS84':selectedRecord.latitude===null?'No informadas':selectedRecord.latitude+', '+selectedRecord.longitude+' (declaradas, sin verificar)','Procedencia':ORIGINS[selectedRecord.origin]+' · '+BASES[selectedRecord.basis],'Incertidumbre':selectedRecord.uncertainty===null?'No cuantificada':'± '+selectedRecord.uncertainty+' '+selectedIndicator.unit,'Base de incertidumbre':selectedRecord.uncertaintyNote,'Fuente':selectedRecord.source,'Responsable':selectedRecord.author,'Notas':selectedRecord.notes||'Sin notas','Registro anterior':selectedRecord.supersedes||'Versión inicial','Motivo de corrección':selectedRecord.correctionReason||'No corresponde','Creado':selectedRecord.createdAt}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
   {doc.observations.filter(o=>o.supersedes===selectedRecord.id).map(o=><button type="button" key={o.id} onClick={()=>setParams({indicador:o.indicatorId,registro:o.id})}>Abrir versión posterior {o.id}</button>)}
  </section>}
  {form==='indicator'&&<form ref={formRef} noValidate className="lb-form" data-lb-indicator-form onSubmit={e=>{e.preventDefault();try{const next=registerIndicator(doc,indicator);if(persist(next)){setForm(null);selectIndicator(next.indicators.at(-1)!.id);}}catch(e){setError(e instanceof Error?e.message:'No se pudo registrar.');}}}>
   <h3>Registrar definición de indicador</h3>{error&&<p role="alert" className="lb-error">{error}</p>}<p className="lb-note">La definición se conserva con su identificador. No se cambian unidades o métodos de mediciones ya registradas.</p>
   <fieldset disabled={damaged}><legend>Identidad y método</legend><div className="lb-fields">{input('name','Nombre del indicador')}{input('factor','Factor ambiental')}{input('unit','Unidad del indicador')}{input('method','Método de obtención',true)}{input('temporalSupport','Soporte temporal (por ejemplo, promedio de 24 h)')}{input('description','Descripción y alcance',true)}</div></fieldset>
   <fieldset disabled={damaged}><legend>Impactos del expediente vinculados, opcional</legend><div className="lb-impacts">{data.impacts.map(i=><label className="lb-checkbox" key={i.id}><input type="checkbox" checked={indicator.impactIds.includes(i.id)} onChange={e=>setIndicator(current=>({...current,impactIds:e.target.checked?[...current.impactIds,i.id]:current.impactIds.filter(x=>x!==i.id)}))}/>{i.name} · {i.id}</label>)}</div></fieldset>
   <div className="lb-actions"><button type="submit" disabled={damaged}>Registrar indicador</button><button type="button" onClick={()=>setForm(null)}>Cancelar</button></div>
  </form>}
  {form==='observation'&&<form ref={formRef} noValidate className="lb-form" data-lb-observation-form onSubmit={e=>{e.preventDefault();try{const next=registerObservation(doc,observation);if(persist(next)){setForm(null);const o=next.observations.at(-1)!;setParams({indicador:o.indicatorId,registro:o.id});}}catch(e){setError(e instanceof Error?e.message:'No se pudo registrar.');}}}>
   <h3>{observation.supersedes?'Nueva versión del registro':'Registrar dato ambiental'}</h3>{error&&<p role="alert" className="lb-error">{error}</p>}
   <fieldset disabled={damaged}><legend>Identidad, procedencia y resultado</legend><div className="lb-fields">
    <label>Indicador<select aria-label="Indicador del dato" disabled={!!observation.supersedes} value={observation.indicatorId} onChange={e=>observationPatch({indicatorId:e.target.value})}><option value="">Seleccionar</option>{doc.indicators.map(i=><option key={i.id} value={i.id}>{i.name} · {i.unit}</option>)}</select></label>
    <label>Procedencia<select aria-label="Procedencia del dato" disabled={!!observation.supersedes} value={observation.origin} onChange={e=>observationPatch({origin:e.target.value as Observation['origin']})}>{Object.entries(ORIGINS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label>Tipo de dato<select aria-label="Tipo de dato" value={observation.basis} onChange={e=>observationPatch({basis:e.target.value as Observation['basis']})}>{Object.entries(BASES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label>Escenario<select aria-label="Escenario del dato" value={observation.scenario} onChange={e=>observationPatch({scenario:e.target.value as Observation['scenario']})}>{Object.entries(SCENARIOS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label>Cómo se informa el resultado<select aria-label="Calificador del resultado" value={observation.qualifier} onChange={e=>{const qualifier=e.target.value as Observation['qualifier'];observationPatch({qualifier,value:['exact','lt','gt'].includes(qualifier)?observation.value:null,detectionLimit:qualifier==='not-detected'?observation.detectionLimit:null,uncertainty:['exact','lt','gt'].includes(qualifier)?observation.uncertainty:null});}}>{Object.entries(QUALIFIERS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    {obsNumber('value','Valor en la unidad del indicador',!pointValue)}{obsNumber('detectionLimit','Límite de detección en la misma unidad',observation.qualifier!=='not-detected')}{obsNumber('uncertainty','Incertidumbre absoluta declarada (±)',!pointValue)}{obsText('uncertaintyNote','Base de incertidumbre, cobertura o motivo de no cuantificación',true)}
   </div></fieldset>
   <fieldset disabled={damaged}><legend>Tiempo y lugar</legend><div className="lb-fields"><label>Inicio del período<input aria-label="Inicio del período" type="date" value={observation.start} onChange={e=>observationPatch({start:e.target.value})}/></label><label>Fin del período<input aria-label="Fin del período" type="date" value={observation.end} onChange={e=>observationPatch({end:e.target.value})}/></label>{obsText('horizon','Horizonte y supuestos del escenario',true)}{obsText('location','Punto o ámbito de referencia')}{obsNumber('latitude','Latitud WGS84 (opcional)')}{obsNumber('longitude','Longitud WGS84 (opcional)')}</div><p className="lb-note">Fechas con precisión de día. Detallá hora, zona horaria o período de integración en la fuente cuando corresponda. Las coordenadas son declaradas; no redefinen el perímetro del SIG.</p></fieldset>
   <fieldset disabled={damaged}><legend>Fuente y responsable</legend><div className="lb-fields">{obsText('source','Fuente y localizador del dato',true)}{obsText('author','Responsable del registro')}{obsText('notes','Notas o motivo del dato faltante',true)}{observation.supersedes&&obsText('correctionReason','Motivo de la corrección',true)}</div></fieldset>
   {observation.supersedes&&<p className="lb-note">Se conserva {observation.supersedes}. Su procedencia no puede cambiar de sintética a fuente declarada mediante una corrección.</p>}
   <div className="lb-actions"><button type="submit" disabled={damaged}>{observation.supersedes?'Registrar nueva versión':'Guardar registro'}</button><button type="button" onClick={()=>setForm(null)}>Cancelar</button></div>
  </form>}
  <footer className="lb-footer">Registro documental con fechas, fuentes y supuestos declarados. No calcula CA, UIA, importancia ni umbrales legales; cualquier uso en una matriz requiere selección y revisión metodológica explícitas. JSON y CSV incluyen todas las versiones.</footer>
 </section>;
}
