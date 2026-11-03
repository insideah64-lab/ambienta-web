import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDownToLine,RefreshCcw,X} from 'lucide-react';
import {readMatrixAxes} from './ImpactMatrixBuilder';
import {ConesaResidualPanel} from './ConesaResidualPanel';
import {calculateConesa,conesaProblems,CONESA_FIELDS,METHOD_ID,validatedConesaEntry,type ConesaEntry} from './ConesaSimplificadoModel';
import './ConesaSimplificado.css';

type Props={projectId:string;projectName:string};
type Draft={schema:'ambienta.conesa-simplificado.v1';projectId:string;projectName:string;updatedAt:string;entries:Record<string,ConesaEntry>};
const STORAGE_PREFIX='ambienta-conesa-simplificado-v1:';
const blank=(id:string,name:string):Draft=>({schema:'ambienta.conesa-simplificado.v1',
 projectId:id,projectName:name,updatedAt:new Date().toISOString(),entries:{}});
function readDraft(id:string,name:string):Draft{
 try{
  const raw=localStorage.getItem(STORAGE_PREFIX+id);
  if(raw){
   const obj:unknown=JSON.parse(raw);
   if(obj&&typeof obj==='object'){
    const v=obj as Partial<Draft>;
    if(v.schema==='ambienta.conesa-simplificado.v1'&&v.projectId===id&&
      v.entries&&typeof v.entries==='object'&&!Array.isArray(v.entries)&&
      Object.entries(v.entries).length<=12000&&Object.entries(v.entries).every(([key,e])=>
       key.length<=220&&validatedConesaEntry(e)))return v as Draft;
   }
  }
 }catch{/* local storage unavailable, keep volatile editing */}
 return blank(id,name);
}
function download(name:string,mime:string,body:string){
 const url=URL.createObjectURL(new Blob([body],{type:mime}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function csvSafe(x:string|number|null){
 if(x===null)return '""';
 const raw=String(x);
 const value=typeof x==='number'?raw:/^\s*[=+\-@\t\r]/.test(raw)?"'"+raw:raw;
 return '"'+value.replaceAll('"','""')+'"';
}
export function ConesaSimplificado({projectId,projectName}:Props){
 const [doc,setDoc]=useState<Draft>(()=>readDraft(projectId,projectName));
 const edited=useRef(false);
 const [refresh,setRefresh]=useState(0);
 const [selected,setSelected]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 const axes=useMemo(()=>readMatrixAxes(projectId,projectName),[projectId,projectName,refresh]);
 useEffect(()=>{
  if(!edited.current)return;
  try{localStorage.setItem(STORAGE_PREFIX+projectId,JSON.stringify(doc));}
  catch{setNotice('No se pudo conservar el borrador en este navegador. Exportá JSON.');}
 },[doc,projectId]);
 const patch=(id:string,update:Partial<ConesaEntry>)=>{
  edited.current=true;
  setDoc(previous=>{
   const old=previous.entries[id]||{sign:null,criteria:{},reason:'',evidence:''};
   return {...previous,updatedAt:new Date().toISOString(),
    entries:{...previous.entries,[id]:{...old,...update}}};
  });
 };
 const clear=(id:string)=>{
  edited.current=true;
  setDoc(old=>{const entries={...old.entries};delete entries[id];
   return {...old,entries,updatedAt:new Date().toISOString()};});
 };
 const selectedItem=useMemo(()=>{
  if(!selected)return null;
  const separator=selected.indexOf('::');if(separator<0)return null;
  const factor=axes.factors.find(f=>f.id===selected.slice(0,separator));
  const action=axes.actions.find(a=>a.id===selected.slice(separator+2));
  return factor&&action?{factor,action,entry:doc.entries[selected]}:null;
 },[axes,selected,doc]);
 const reviews=useMemo(()=>{
  const activeIds=new Set<string>();
  const linked=axes.factors.flatMap(f=>axes.actions.flatMap(a=>{
   const id=f.id+'::'+a.id;activeIds.add(id);
   const entry=doc.entries[id];if(!entry)return [];
   return [{id,action:a.name,phase:a.phase,factor:f.name,entry,
    computed:calculateConesa(entry),problems:conesaProblems(entry),orphan:false}];
  }));
  // A change in the shared catalog must never silently hide saved evaluations.
  // Preserve disconnected IDs in the audit table and CSV until reconciled.
  const orphaned=Object.entries(doc.entries).filter(([id])=>!activeIds.has(id))
   .map(([id,entry])=>{
    const split=id.indexOf('::');
    return {id,action:split>=0?id.slice(split+2):'(sin acción)',
     phase:'Fuera del catálogo',factor:split>=0?id.slice(0,split):id,entry,
     computed:calculateConesa(entry),
     problems:['Acción o factor ausente del catálogo actual',...conesaProblems(entry)],orphan:true};
   });
  return [...linked,...orphaned];
 },[axes,doc]);
 const detached=reviews.filter(x=>x.orphan).length;
 const complete=reviews.filter(x=>!x.orphan&&x.computed!==null).length;
 const incomplete=reviews.length-complete;
 const exportRows=()=>{
  const header=['Acción','Etapa','Factor','Naturaleza',...CONESA_FIELDS.map(f=>f.id),
   'Importancia absoluta','Importancia con signo','Categoría','Estado de vínculo','Observaciones de validación',
   'Fundamento','Evidencia','Método/versión'];
  const rows:(string|number|null)[][]=[header];
  for(const r of reviews)rows.push([
   r.action,r.phase,r.factor,r.entry.sign===-1?'Negativo':r.entry.sign===1?'Positivo':'Sin declarar',
   ...CONESA_FIELDS.map(f=>r.entry.criteria[f.id]??null),
   r.computed?.absolute??null,r.computed?.signed??null,r.computed?.category??'Pendiente',
   r.orphan?'Desvinculado':'Vinculado',
   r.problems.join(' | '),r.entry.reason,r.entry.evidence,METHOD_ID
  ]);
  return '\uFEFF'+rows.map(row=>row.map(csvSafe).join(';')).join('\r\n');
 };
 return <section className="amb-matrix amb-conesa-rev" data-conesa-simplificado={METHOD_ID}>
  <div className="amb-conesa-top">
   <div><p className="amb-matrix-overline">VARIANTE DIDÁCTICA VERSIONADA · BORRADOR LOCAL</p>
    <h3>Conesa simplificado · revisión metodológica</h3>
    <p>El signo y la importancia absoluta se muestran por separado. Los recargos por localización y momento críticos se suman al valor base, con justificación documental.</p>
    <code>I<sub>abs</sub> = 3IN + 2(EX + EXcr) + (MO + MOcr) + PE + RV + SI + AC + EF + PR + MC</code>
   </div>
   <div className="amb-matrix-exports">
    <button type="button" onClick={()=>download('AMBIENTA-Conesa-simplificado-'+projectId+'.csv','text/csv;charset=utf-8',exportRows())}><ArrowDownToLine size={16}/> CSV</button>
    <button type="button" onClick={()=>download('AMBIENTA-Conesa-simplificado-'+projectId+'.json','application/json',JSON.stringify({...doc,method:METHOD_ID},null,2))}><ArrowDownToLine size={16}/> JSON</button>
   </div>
  </div>
  <p className="amb-conesa-disclaimer" role="note">
   Esta ficha reproduce la escala explícita del tutorial compartido, contrastada con aplicaciones publicadas de Conesa.
   <strong> No es una homologación normativa para Salta.</strong> El caso didáctico con RV = 3 queda fuera de esta variante (RV: 1, 2, 4), y no se acepta sin revisión.
   Las categorías de severidad para impactos negativos se asignan por importancia absoluta: menos de 25 irrelevante, 25 a menos de 50 moderado, 50 a menos de 75 severo y 75 o más crítico. Los impactos positivos se identifican como beneficiosos, sin etiquetarlos como críticos.
   <a href="https://www.dremsm.gob.pe/archivos/rdr/rdr24/rdr35.pdf" target="_blank" rel="noreferrer"> Fuente de clasificación: autoridad ambiental, 2024</a>.
  </p>
  <div className="amb-conesa-kpis">
   <span><strong>{axes.actions.length} × {axes.factors.length}</strong><small>acciones × factores</small></span>
   <span><strong>{complete}</strong><small>interacciones completas</small></span>
   <span><strong>{incomplete}</strong><small>incompletas / por revisar</small></span>
   <span><strong>{detached}</strong><small>registros desvinculados</small></span>
  </div>
  <div className="amb-conesa-toolbar">
   <p>El catálogo de factores y acciones proviene de la herramienta de identificación, no de puntuaciones de Leopold.</p>
   <button type="button" onClick={()=>{setRefresh(x=>x+1);setSelected(null);}}><RefreshCcw size={15}/> Actualizar catálogo</button>
  </div>
  <div className="amb-matrix-scroll" tabIndex={0} role="region" aria-label="Matriz de Conesa simplificado; desplazamiento horizontal">
   <table className="amb-matrix-grid">
    <thead><tr><th className="amb-matrix-sticky">Factor ambiental</th>
     {axes.actions.map(a=><th key={a.id} scope="col"><small>{a.phase}</small><span>{a.name}</span></th>)}
    </tr></thead>
    <tbody>{axes.factors.map(f=><tr key={f.id}><th scope="row" className="amb-matrix-sticky"><strong>{f.name}</strong><small>{f.group}</small></th>
     {axes.actions.map(a=>{
      const id=f.id+'::'+a.id,entry=doc.entries[id],score=calculateConesa(entry);
      const tone=!entry?'empty':!score?'none':score.signed<0?'negative':'positive';
      return <td key={id}><button type="button" data-conesa-cell={id}
       className={'amb-matrix-cell amb-matrix-cell--'+tone+(selected===id?' is-selected':'')}
       aria-label={'Evaluar '+f.name+' por '+a.name} aria-pressed={selected===id} onClick={()=>setSelected(id)}>
       {score?(score.signed>0?'+':'')+score.signed:entry?'Pend.':'—'}
      </button></td>;
     })}
    </tr>)}</tbody>
   </table>
  </div>
  <div className="amb-conesa-editor" data-conesa-editor>
   {!selected||!selectedItem?<div className="amb-matrix-placeholder">
    <h4>Seleccioná una interacción para valorar</h4>
    <p>La matriz empieza sin criterios asignados. Un valor pendiente no equivale a ausencia de impacto. Se conservan las valoraciones anteriores del método Conesa 1997 por separado.</p>
   </div>:<div>
    <header><div><small>VALORACIÓN DE LA INTERACCIÓN</small><h4>{selectedItem.factor.name}</h4><p>{selectedItem.action.name}</p></div>
     <button type="button" aria-label="Cerrar editor de Conesa" onClick={()=>setSelected(null)}><X size={18}/></button>
    </header>
    <label>Naturaleza
     <select aria-label="Naturaleza Conesa revisado" value={selectedItem.entry?.sign===-1?'-1':selectedItem.entry?.sign===1?'1':''}
      onChange={e=>patch(selected,{sign:e.target.value?Number(e.target.value) as -1|1:null})}>
      <option value="">No evaluada</option><option value="-1">Negativo (−)</option><option value="1">Positivo (+)</option>
     </select>
    </label>
    <div className="amb-conesa-fields">{CONESA_FIELDS.map(field=><label key={field.id}>
     {field.label} ({field.id})
     <select aria-label={'Conesa '+field.id} value={selectedItem.entry?.criteria[field.id]??''}
      onChange={e=>{
       const criteria={...(selectedItem.entry?.criteria||{})};
       if(e.target.value==='')delete criteria[field.id];else criteria[field.id]=Number(e.target.value);
       patch(selected,{criteria});
      }}>
      <option value="">Pendiente</option>
      {field.options.map(([value,label])=><option value={value} key={value}>{value} · {label}</option>)}
     </select>
    </label>)}</div>
    <div className="amb-conesa-result">
     <span>Importancia absoluta<strong data-conesa-absolute>{calculateConesa(selectedItem.entry)?.absolute??'Pendiente'}</strong></span>
     <span>Importancia con signo<strong data-conesa-signed>{calculateConesa(selectedItem.entry)?.signed??'Pendiente'}</strong></span>
     <span>Categoría descriptiva<strong data-conesa-category>{calculateConesa(selectedItem.entry)?.category??'Pendiente'}</strong></span>
    </div>
    {selectedItem.entry&&conesaProblems(selectedItem.entry).length>0&&
     <p className="amb-conesa-problems" data-conesa-problems>{conesaProblems(selectedItem.entry).join(' · ')}</p>}
    <label>Fundamento y supuestos<textarea rows={3} maxLength={5000}
     placeholder="Justificar cada criterio, especialmente si se asignó criticidad…"
     value={selectedItem.entry?.reason||''} onChange={e=>patch(selected,{reason:e.target.value})}/></label>
    <label>Referencia verificable<input maxLength={1000}
     placeholder="Documento, página, evidencia y ubicación de interés crítico…"
     value={selectedItem.entry?.evidence||''} onChange={e=>patch(selected,{evidence:e.target.value})}/></label>
    {selectedItem.entry&&<button type="button" className="amb-matrix-secondary" onClick={()=>clear(selected)}>Eliminar valoración</button>}
   </div>}
  </div>
  <div className="amb-conesa-review" data-conesa-review>
   <div><h4>Tabla de revisión de las interacciones</h4><p>Auditoría transversal de criterios, resultados y anomalías; los impactos de ejemplo no se precargan en Diablillos.</p>
    {detached>0&&<p className="amb-conesa-orphan-note" role="status">
     {detached} valoración(es) conservada(s) cuyo factor o acción ya no figura en el catálogo.
     Se mantienen visibles y exportables con sus ID originales; para volver a editarlas,
     restaurá los identificadores del catálogo. No cuentan como evaluaciones completas.
    </p>}</div>
   <div className="amb-conesa-review-scroll" role="region" tabIndex={0} aria-label="Tabla de revisión de resultados de Conesa">
    <table><thead><tr><th>Factor / acción</th><th>Nat.</th>{CONESA_FIELDS.map(f=><th key={f.id}>{f.id}</th>)}
     <th>I abs.</th><th>I signo</th><th>Categoría</th><th>Vínculo</th><th>Validación</th></tr></thead>
     <tbody>{reviews.length?reviews.map(r=><tr key={r.id} data-conesa-review-row={r.id} data-conesa-orphan={r.orphan?'true':undefined}>
      <th><button type="button" disabled={r.orphan} onClick={()=>setSelected(r.id)}>{r.factor}<small>{r.action}</small></button></th>
      <td>{r.entry.sign===-1?'−':r.entry.sign===1?'+':'?'}</td>
      {CONESA_FIELDS.map(f=><td key={f.id}>{r.entry.criteria[f.id]??'—'}</td>)}
      <td data-review-absolute>{r.computed?.absolute??'—'}</td>
      <td data-review-signed>{r.computed?.signed??'—'}</td>
      <td data-review-category>{r.computed?.category??'Pendiente'}</td>
      <td data-review-link>{r.orphan?'Desvinculado':'Vinculado'}</td>
      <td data-review-diagnostics>{r.problems.length?r.problems.join('; '):'Cálculo completo'}</td>
     </tr>):<tr><td colSpan={19}>Sin valoraciones todavía. Seleccioná una celda de la matriz para comenzar.</td></tr>}</tbody>
    </table>
   </div>
  </div>
  <ConesaResidualPanel projectId={projectId} initialEntries={doc.entries}
   actions={axes.actions} factors={axes.factors}/>
  <footer className="amb-matrix-footer">
   <span>Método: {METHOD_ID} · guardado en este navegador por expediente · {projectId}</span>
   <span>El resultado es descriptivo y requiere revisión profesional antes de incluirlo en un EsIA o PGA.</span>
  </footer>
  {notice&&<p role="status" className="amb-matrix-notice">{notice}</p>}
 </section>;
}
