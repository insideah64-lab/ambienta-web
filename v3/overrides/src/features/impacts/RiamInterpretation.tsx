import {useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Badge,Table} from '@santi020k/lumen-react';
import type {Assessment} from './MatrixMethodData';
import {RIAM_CATEGORIES,RIAM_BAND_CODES,RIAM_BAND_VERSION,RIAM_BANDS,riamBand,riamRows,summarizeRiam,riamMetadataKey,emptyRiamMetadata,validRiamMetadata,assignRiamCategory,categoryAt,type RiamCategory,type RiamAxes} from './RiamInterpretationModel';
import './RiamInterpretation.css';

function readMetadata(projectId:string){
 let raw:string|null=null;try{raw=localStorage.getItem(riamMetadataKey(projectId));if(raw!==null){const parsed:unknown=JSON.parse(raw);return validRiamMetadata(parsed,projectId)?{doc:parsed,raw,blocked:false}:{doc:emptyRiamMetadata(projectId),raw,blocked:true};}}
 catch{return {doc:emptyRiamMetadata(projectId),raw,blocked:true};}
 return {doc:emptyRiamMetadata(projectId),raw,blocked:false};
}
export function useRiamMetadata(projectId:string){
 const [initial]=useState(()=>readMetadata(projectId)),[doc,setDoc]=useState(initial.doc),[notice,setNotice]=useState(''),[volatile,setVolatile]=useState(false),last=useRef(initial.raw);
 function setCategory(factorId:string,category:RiamCategory|''){
  if(initial.blocked)return;
  try{
   const next=assignRiamCategory(doc,factorId,category);
   try{
    const key=riamMetadataKey(projectId),current=localStorage.getItem(key);
    if(current!==last.current){setNotice('Otra pestaña cambió las categorías. Exportá tu trabajo y recargá antes de continuar; el archivo local se conserva.');return;}
    if(current!==null)localStorage.setItem(key+':backup:'+crypto.randomUUID(),current);
    const raw=JSON.stringify(next);localStorage.setItem(key,raw);last.current=raw;setVolatile(false);setNotice('Categoría guardada por proyecto. No se modificaron criterios ni puntuaciones.');
   }catch{setVolatile(true);setNotice('Categorías solo en memoria: exportá JSON antes de recargar o salir.');}
   setDoc(next);
  }catch(e){setNotice(e instanceof Error?e.message:'No se pudo registrar la categoría.');}
 }
 return {doc,blocked:initial.blocked,notice,volatile,setCategory,raw:initial.raw};
}
export function RiamBandBadge({score,compact=false}:{score:number|null;compact?:boolean}){
 const band=riamBand(score);return band?<Badge className="amb-riam-badge" variant="outline" data-riam-band={band.code} title={band.description}>{band.code}{!compact&&' · '+band.description}</Badge>:null;
}
export function RiamCategoryField({factorId,state,disabled=false}:{factorId:string;state:ReturnType<typeof useRiamMetadata>;disabled?:boolean}){
 return <div className="amb-riam-category-field"><label>Categoría RIAM del factor seleccionado
  <select aria-label="Categoría RIAM del factor seleccionado" disabled={disabled||state.blocked} value={categoryAt(state.doc,factorId)||''} onChange={e=>state.setCategory(factorId,e.target.value as RiamCategory|'')}>
   <option value="">Sin clasificar</option>{Object.entries(RIAM_CATEGORIES).map(([k,v])=><option value={k} key={k}>{k} · {v}</option>)}
  </select></label><p>Asignación explícita para este factor en RIAM. No se deduce del nombre ni cambia el catálogo compartido.</p></div>;
}
export function RiamInterpretation({axes,entries,state,onSelect}:{axes:RiamAxes;entries:Record<string,Assessment>;state:ReturnType<typeof useRiamMetadata>;onSelect:(id:string)=>void}){
 const rows=riamRows(axes,entries,state.doc),summary=summarizeRiam(axes,rows,state.doc),[params,setParams]=useSearchParams();
 const rawBand=params.get('riam-banda')||'',rawCategory=params.get('riam-categoria')||'';
 const band=RIAM_BAND_CODES.includes(rawBand)?rawBand:'',category=rawCategory==='unassigned'||Object.hasOwn(RIAM_CATEGORIES,rawCategory)?rawCategory:'';
 const filtered=rows.filter(r=>(!band||r.band?.code===band)&&(!category||(r.category||'unassigned')===category));
 const max=Math.max(1,...Object.values(summary.bands));
 function filter(key:string,value:string){setParams(previous=>{const next=new URLSearchParams(previous);next.set('metodo','riam-1998');if(value)next.set(key,value);else next.delete(key);return next;});}
 return <section className="amb-riam" data-riam-interpretation aria-label="Interpretación RIAM">
  <header><div><p className="amb-matrix-overline">INTERPRETACIÓN DEL RESULTADO</p><h4>Bandas y componentes ambientales</h4></div><span>{RIAM_BAND_VERSION}</span></header>
  <p>Se cuentan interacciones del catálogo actual, sin sumar ES ni compensar efectos. Las bandas describen el método; no son umbrales legales ni una aprobación ambiental.</p>
  <div className="amb-riam-stats"><span><strong data-riam-ready>{summary.ready}</strong>calculables de {summary.total}</span><span><strong data-riam-documented>{summary.documented}</strong>con fundamento y evidencia</span><span><strong data-riam-pending>{summary.pending}</strong>pendientes, incluidas no iniciadas</span><span><strong data-riam-orphaned>{summary.orphaned}</strong>fuera del catálogo, conservadas</span></div>
  <p className="amb-riam-note">Documentado significa que se declararon fundamento y evidencia; no implica revisión independiente. La categoría queda sin asignar hasta que la elijas.</p>
  {state.blocked&&<p className="amb-riam-warning" role="alert">El archivo de categorías no supera la validación. Se conserva intacto y no puede editarse. <button type="button" onClick={()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([state.raw??''],{type:'text/plain'}));a.href=url;a.download='RIAM-categorias-original.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Descargar categorías originales</button></p>}
  {state.notice&&<p className={state.volatile?'amb-riam-warning':'amb-riam-note'} role={state.volatile?'alert':'status'}>{state.notice}</p>}
  {(rawBand&&!band||rawCategory&&!category)&&<p role="status">El filtro del enlace no es válido; se muestran los valores disponibles sin modificar datos.</p>}
  <div className="amb-riam-filters"><label>Filtrar banda<select aria-label="Filtrar banda RIAM" value={band} onChange={e=>filter('riam-banda',e.target.value)}><option value="">Todas las bandas y pendientes</option>{RIAM_BAND_CODES.map(code=><option value={code} key={code}>{code}</option>)}</select></label><label>Filtrar categoría<select aria-label="Filtrar categoría RIAM" value={category} onChange={e=>filter('riam-categoria',e.target.value)}><option value="">Todas las categorías</option>{Object.entries(RIAM_CATEGORIES).map(([k,v])=><option value={k} key={k}>{k} · {v}</option>)}<option value="unassigned">Sin clasificar</option></select></label><button type="button" onClick={()=>setParams(previous=>{const next=new URLSearchParams(previous);next.delete('riam-banda');next.delete('riam-categoria');return next;})}>Limpiar filtros</button></div>
  <div className="amb-riam-bands" aria-label="Distribución de cantidades por banda">{RIAM_BAND_CODES.map(code=><button type="button" key={code} data-riam-bin={code} aria-label={'Banda '+code+': '+summary.bands[code]+' interacciones del catálogo'} aria-pressed={band===code} onClick={()=>filter('riam-banda',band===code?'':code)}><span>{code}</span><strong>{summary.bands[code]}</strong><i aria-hidden="true"><b style={{width:(summary.bands[code]/max*100)+'%'}}/></i></button>)}</div>
  {!summary.ready&&<p className="amb-riam-note">Todavía no hay interacciones calculables del catálogo. Los ceros de la distribución son cantidades, no valoraciones ambientales.</p>}
  <details><summary>Consultar significado y límites de las bandas</summary><p>Según |ES|: {RIAM_BANDS.map(b=>b.letter+' = '+b.min+'–'+b.max).join('; ')}. Se conserva el signo de ES; cero corresponde a N. Una valoración pendiente no recibe banda. N puede resultar de A1=0 o A2=0: consultá los criterios, el fundamento y la aplicabilidad.</p><p><a href="https://doi.org/10.1016/S0195-9255(98)00018-3" target="_blank" rel="noreferrer">Pastakia y Jensen, 1998</a> · <a href="https://doi.org/10.1016/j.eiar.2007.06.004" target="_blank" rel="noreferrer">Aplicación y tablas de Kuitunen et al., 2008</a>.</p></details>
  <Table className="amb-riam-table" layout="scroll"><table><caption>Distribución por categoría: todos los factores del catálogo, independientemente de los filtros del listado.</caption><thead><tr><th scope="col">Categoría</th><th scope="col">Calculables</th><th scope="col">Documentadas</th><th scope="col">Negativas</th><th scope="col">N</th><th scope="col">Positivas</th><th scope="col">Pendientes</th></tr></thead><tbody>{summary.categories.map(c=><tr key={c.code} data-riam-category-row={c.code}><th scope="row">{c.code==='unassigned'?'Sin clasificar':c.code+' · '+RIAM_CATEGORIES[c.code as RiamCategory]}</th>{[c.ready,c.documented,c.negative,c.neutral,c.positive,c.pending].map((v,i)=><td key={i}>{v}</td>)}</tr>)}</tbody></table></Table>
  <Table className="amb-riam-table amb-riam-register" layout="scroll"><table><caption>{filtered.length} valoraciones registradas visibles. Las interacciones no iniciadas se cuentan como pendientes en el resumen.</caption><thead><tr><th scope="col">Factor / acción</th><th scope="col">Categoría</th><th scope="col">ES / banda</th><th scope="col">Documentación y catálogo</th><th scope="col">Ficha</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id} data-riam-register-row={r.id}><th scope="row">{r.factor}<small>{r.action} · {r.phase}</small></th><td>{r.category||'Sin clasificar'}</td><td>{r.score??'Pendiente'}<RiamBandBadge score={r.score} compact/></td><td>{r.documented?'Fundamento y evidencia declarados':'Documentación pendiente'}<small>{r.inCatalog?'En catálogo':'Fuera del catálogo; conservada y exportable'}</small></td><td>{r.inCatalog?<button type="button" onClick={()=>{onSelect(r.id);requestAnimationFrame(()=>document.querySelector('[data-method-editor]')?.scrollIntoView({block:'start'}));}}>Abrir ficha</button>:<span>Consultar en JSON/CSV</span>}</td></tr>)}</tbody></table></Table>
  {!filtered.length&&<p className="amb-riam-note">No hay registros para esta selección. No se asignan criterios por defecto.</p>}
 </section>;
}
