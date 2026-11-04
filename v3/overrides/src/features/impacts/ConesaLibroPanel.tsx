import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {ArrowDownToLine,RefreshCcw,X,BookOpen} from 'lucide-react';
import {readMatrixAxes} from './ImpactMatrixBuilder';
import {
 BOOK_METHOD_ID,BOOK_SCHEMA,BOOK_STORAGE_PREFIX,BOOK_SOURCE,BOOK_BOUNDARY_POLICY,
 BOOK_FIELDS,bookProblems,calculateBookConesa,validBookEntry,
 type BookEntry,type BookRecovery,type BookNature
} from './ConesaLibroModel';
import './ConesaSimplificado.css';
import {ConesaF2Panel} from './ConesaF2Panel';
import {ConesaF3Panel} from './ConesaF3Panel';
import './ConesaLibroPanel.css';

type Props={projectId:string;projectName:string};
type Stage='f1'|'f2'|'f3a'|'f3b';
const STAGES=[
 {id:'f1',title:'Valorar impactos',detail:'Naturaleza, importancia y evidencias'},
 {id:'f2',title:'Depurar y ponderar',detail:'Criba, alertas y pesos UIP'},
 {id:'f3a',title:'Calidad ambiental',detail:'Indicadores y escenarios SIN/CON'},
 {id:'f3b',title:'Curvas',detail:'Transformaciones y trazabilidad'}
] as const;
type Draft={
 schema:typeof BOOK_SCHEMA;methodId:typeof BOOK_METHOD_ID;
 projectId:string;projectName:string;updatedAt:string;
 entries:Record<string,BookEntry>
};
function fresh(projectId:string,projectName:string):Draft{
 return {schema:BOOK_SCHEMA,methodId:BOOK_METHOD_ID,projectId,projectName,
  updatedAt:new Date().toISOString(),entries:{}};
}
function validDraft(raw:unknown,projectId:string):raw is Draft{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return false;
 const v=raw as Partial<Draft>;
 return v.schema===BOOK_SCHEMA&&v.methodId===BOOK_METHOD_ID&&v.projectId===projectId
  &&typeof v.projectName==='string'&&v.projectName.length<=350
  &&typeof v.updatedAt==='string'
  &&!!v.entries&&typeof v.entries==='object'&&!Array.isArray(v.entries)
  &&Object.entries(v.entries).length<=12000
  &&Object.entries(v.entries).every(([id,e])=>id.length<=220&&validBookEntry(e));
}
function readDraft(projectId:string,projectName:string):{doc:Draft;damaged:string|null}{
 try{
  const raw=localStorage.getItem(BOOK_STORAGE_PREFIX+projectId);
  if(raw!==null){
   try{const data:unknown=JSON.parse(raw);
    if(validDraft(data,projectId))return {doc:data,damaged:null};
   }catch{/* raw kept verbatim for export */}
   return {doc:fresh(projectId,projectName),damaged:raw};
  }
 }catch{/* storage may be blocked; local state is still editable */}
 return {doc:fresh(projectId,projectName),damaged:null};
}
function download(filename:string,type:string,content:string){
 const url=URL.createObjectURL(new Blob([content],{type}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;
 document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}
function csv(v:string|number|null|undefined){
 const raw=String(v??'');
 const safe=/^\s*[=+\-@\t\r]/.test(raw)?"'"+raw:raw;
 return '"'+safe.replaceAll('"','""')+'"';
}
const makeBlank=():BookEntry=>({sign:null,criteria:{},recovery:null,reason:'',evidence:''});

export function ConesaLibroPanel({projectId,projectName}:Props){
 const [loaded]=useState(()=>readDraft(projectId,projectName));
 const [doc,setDoc]=useState<Draft>(loaded.doc);
 const modified=useRef(false);
 const [selected,setSelected]=useState<string|null>(null);
 const [refresh,setRefresh]=useState(0);
 const [notice,setNotice]=useState('');
 const [stage,setStage]=useState<Stage>('f1');
 const stagePrefix=useId();
 const axes=useMemo(()=>readMatrixAxes(projectId,projectName),[projectId,projectName,refresh]);
 useEffect(()=>{
  if(!modified.current||loaded.damaged!==null)return;
  try{localStorage.setItem(BOOK_STORAGE_PREFIX+projectId,JSON.stringify(doc));}
  catch{setNotice('No se pudo guardar en este navegador. Exportá JSON para conservar la evaluación.');}
 },[doc,projectId,loaded.damaged]);
 const patch=(id:string,changes:Partial<BookEntry>)=>{
  if(loaded.damaged!==null)return;
  modified.current=true;
  setDoc(before=>{
   const old=before.entries[id]||makeBlank();
   return {...before,updatedAt:new Date().toISOString(),
    entries:{...before.entries,[id]:{...old,...changes}}};
  });
 };
 const remove=(id:string)=>{
  if(loaded.damaged!==null)return;
  modified.current=true;
  setDoc(before=>{
   const entries={...before.entries};delete entries[id];
   return {...before,updatedAt:new Date().toISOString(),entries};
  });
 };
 const selectedItem=useMemo(()=>{
  if(!selected)return null;
  const n=selected.indexOf('::');if(n<0)return null;
  const factor=axes.factors.find(f=>f.id===selected.slice(0,n));
  const action=axes.actions.find(a=>a.id===selected.slice(n+2));
  return factor&&action?{factor,action,entry:doc.entries[selected]}:null;
 },[axes,doc,selected]);
 const rows=useMemo(()=>{
  const linked=new Set<string>();
  const entries=axes.factors.flatMap(f=>axes.actions.flatMap(a=>{
   const id=f.id+'::'+a.id;linked.add(id);
   const entry=doc.entries[id];
   return entry?[{id,action:a.name,phase:a.phase,factor:f.name,entry,
    result:calculateBookConesa(entry),problems:bookProblems(entry),orphan:false}]:[];
  }));
  const orphaned=Object.entries(doc.entries).filter(([id])=>!linked.has(id))
   .map(([id,entry])=>({id,action:id.split('::')[1]||'Sin acción',
    phase:'Desvinculado',factor:id.split('::')[0]||id,entry,
    result:calculateBookConesa(entry),
    problems:['Identificador fuera del catálogo actual',...bookProblems(entry)],orphan:true}));
  return [...entries,...orphaned];
 },[doc,axes]);
 const count=rows.filter(r=>!r.orphan&&r.result!==null&&r.result.status==='calculado').length;
 const uncertain=rows.filter(r=>!r.orphan&&r.result?.status==='naturaleza-incierta').length;
 const exportCsv=()=>{
  const head=['Factor','Acción','Fase','Naturaleza',...BOOK_FIELDS.map(f=>f.id),
   'MC_subtipo','Importancia absoluta','Importancia con signo','Categoría',
   'Validaciones','Fundamento','Evidencia','Método','Edición','Política de umbrales','Vínculo'];
  const records:(string|number|null)[][]=[head];
  for(const row of rows)records.push([
   row.factor,row.action,row.phase,String(row.entry.sign??'sin declarar'),
   ...BOOK_FIELDS.map(f=>row.entry.criteria[f.id]??null),
   row.entry.recovery||'',row.result?.absolute??null,row.result?.signed??null,
   row.result?.category||'Pendiente',row.problems.join(' | '),
   row.entry.reason,row.entry.evidence,BOOK_METHOD_ID,'1997, reimp. 2000',
   BOOK_BOUNDARY_POLICY,row.orphan?'Desvinculado':'Vinculado'
  ]);
  return '\uFEFF'+records.map(r=>r.map(csv).join(';')).join('\r\n');
 };
 const selectedResult=calculateBookConesa(selectedItem?.entry);
 const selectedProblems=bookProblems(selectedItem?.entry);
 return <section className="amb-matrix amb-conesa-rev amb-conesa-book" data-conesa-book={BOOK_METHOD_ID}>
  <header className="amb-conesa-workbench-intro">
   <p className="amb-matrix-overline">HERRAMIENTAS · EVALUACIÓN DE IMPACTOS</p>
   <h3>Conesa</h3>
   <p>Una metodología, cuatro espacios de trabajo. Elegí una solapa para avanzar sin perder
    las valoraciones ni mezclar sus borradores. Las etapas no representan versiones distintas del método.</p>
  </header>
  <div className="amb-conesa-stage-tabs" role="tablist" aria-label="Etapas de evaluación Conesa">
   {STAGES.map((step,i)=><button key={step.id} type="button" role="tab"
    id={stagePrefix+'-tab-'+step.id}
    data-conesa-phase-tab={step.id}
    aria-selected={stage===step.id}
    aria-controls={stagePrefix+'-panel-'+(step.id==='f3a'||step.id==='f3b'?'f3':step.id)}
    tabIndex={stage===step.id?0:-1}
    onClick={()=>setStage(step.id)}
    onKeyDown={e=>{
     const key=e.key;
     if(!['ArrowRight','ArrowLeft','Home','End'].includes(key))return;
     e.preventDefault();
     const n=key==='Home'?0:key==='End'?STAGES.length-1:
      (i+(key==='ArrowRight'?1:-1)+STAGES.length)%STAGES.length;
     setStage(STAGES[n].id);
     e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[n]?.focus();
    }}>
    <span className="amb-conesa-stage-number">{String(i+1).padStart(2,'0')}</span>
    <span><strong>{step.title}</strong><small>{step.detail}</small></span>
   </button>)}
  </div>
  <div role="tabpanel" className="amb-conesa-phase-panel" data-conesa-phase-panel="f1"
   id={stagePrefix+'-panel-f1'} aria-labelledby={stagePrefix+'-tab-f1'} hidden={stage!=='f1'}>
  <div className="amb-conesa-top">
   <div>
    <p className="amb-matrix-overline"><BookOpen size={15} aria-hidden="true"/> EDICIÓN BIBLIOGRÁFICA · CUALITATIVA F1</p>
    <h3>Valoración cualitativa</h3>
    <p>Valoración cualitativa versionada; no contiene aún matriz depurada, pesos UIP ni valoración cuantitativa del libro. Los valores son declaraciones del evaluador y requieren fundamento técnico.</p>
    <code>I = ± [3IN + 2(EX+EXcr) + (MO+MOcr) + PE + RV + SI + AC + EF + PR + MC]</code>
   </div>
   <div className="amb-matrix-exports">
    <button type="button" onClick={()=>download('AMBIENTA-Conesa-libro-'+projectId+'.csv','text/csv;charset=utf-8',exportCsv())}>
     <ArrowDownToLine size={16}/> CSV</button>
    <button type="button" onClick={()=>download('AMBIENTA-Conesa-libro-'+projectId+'.json','application/json',
     JSON.stringify({...doc,source:BOOK_SOURCE,boundaryPolicy:BOOK_BOUNDARY_POLICY},null,2))}>
     <ArrowDownToLine size={16}/> JSON</button>
   </div>
  </div>
  <p className="amb-conesa-disclaimer" role="note">
   Fuente: {BOOK_SOURCE}. <strong>F1 experimental; no es el método completo ni una validación normativa para Salta.</strong>
   Naturaleza «x»: efecto previsible cuyo carácter positivo/negativo no está determinado (p. 89).
   La criticidad del momento puede sumar +1 o +4 (p. 90). La compensación se documenta separada de mitigación cuando MC=4 (p. 93).
   { ' ' }{BOOK_BOUNDARY_POLICY}
  </p>
  {loaded.damaged!==null&&<div role="alert" className="amb-conesa-book-damaged">
   <strong>Archivo Conesa libro no legible: escritura bloqueada.</strong>
   <p>No se sustituirá el archivo por uno vacío. Descargá el contenido original y revisalo antes de continuar.</p>
   <button type="button" onClick={()=>download('AMBIENTA-Conesa-libro-respaldo-'+projectId+'.txt','text/plain;charset=utf-8',loaded.damaged!)}>
    <ArrowDownToLine size={16}/> Descargar respaldo original</button>
  </div>}
  <div className="amb-conesa-kpis">
   <span><strong>{axes.actions.length} × {axes.factors.length}</strong><small>acciones × factores</small></span>
   <span><strong>{count}</strong><small>con signo evaluado</small></span>
   <span><strong>{uncertain}</strong><small>naturaleza incierta (x)</small></span>
   <span><strong>{rows.length-count-uncertain}</strong><small>pendientes / desvinculados</small></span>
  </div>
  <div className="amb-conesa-toolbar">
   <p>Los ejes se toman del catálogo compartido con Leopold, sin importar sus puntuaciones. El borrador de la variante didáctica no se toca.</p>
   <button type="button" onClick={()=>{setRefresh(x=>x+1);setSelected(null)}}>
    <RefreshCcw size={15}/> Actualizar catálogo</button>
  </div>
  <div className="amb-matrix-scroll" tabIndex={0} role="region" aria-label="Matriz de Conesa basada en libro">
   <table className="amb-matrix-grid">
    <thead><tr><th className="amb-matrix-sticky">Factor ambiental</th>
     {axes.actions.map(a=><th key={a.id} scope="col"><small>{a.phase}</small><span>{a.name}</span></th>)}</tr></thead>
    <tbody>{axes.factors.map(f=><tr key={f.id}>
     <th scope="row" className="amb-matrix-sticky"><strong>{f.name}</strong><small>{f.group}</small></th>
     {axes.actions.map(a=>{
      const id=f.id+'::'+a.id,e=doc.entries[id],result=calculateBookConesa(e);
      const tone=!e?'empty':!result?'none':result.status==='naturaleza-incierta'?'none':
       result.signed!<0?'negative':'positive';
      return <td key={id}><button type="button" data-conesa-book-cell={id}
       className={'amb-matrix-cell amb-matrix-cell--'+tone+(selected===id?' is-selected':'')}
       onClick={()=>setSelected(id)} aria-pressed={selected===id}
       aria-label={'Valorar según libro '+f.name+' por '+a.name}>
       {result?(result.signed===null?'x · '+result.absolute:(result.signed>0?'+':'')+result.signed):e?'Pend.':'—'}
      </button></td>;
     })}
    </tr>)}</tbody>
   </table>
  </div>
  <div className="amb-conesa-editor" data-conesa-book-editor>
   {!selected||!selectedItem?<div className="amb-matrix-placeholder">
    <h4>Seleccioná un cruce para comenzar</h4>
    <p>No hay calificaciones precargadas: el libro describe un procedimiento, no resultados específicos para este expediente.</p>
   </div>:<div>
    <header><div><small>VALORACIÓN CUALITATIVA · EDICIÓN 1997</small>
     <h4>{selectedItem.factor.name}</h4><p>{selectedItem.action.name}</p>
     </div><button type="button" aria-label="Cerrar valoración Conesa libro" onClick={()=>setSelected(null)}><X size={18}/></button></header>
    <label>Naturaleza del efecto
     <select aria-label="Conesa libro naturaleza" disabled={loaded.damaged!==null}
      value={selectedItem.entry?.sign===-1?'-1':selectedItem.entry?.sign===1?'1':selectedItem.entry?.sign==='x'?'x':''}
      onChange={e=>patch(selected,{sign:e.target.value==='x'?'x':e.target.value?Number(e.target.value) as BookNature:null})}>
      <option value="">Sin valorar</option>
      <option value="-1">Perjudicial (−)</option><option value="1">Beneficioso (+)</option>
      <option value="x">Previsible pero difícil de cualificar (x)</option>
     </select>
    </label>
    <div className="amb-conesa-fields">
     {BOOK_FIELDS.map(f=><label key={f.id}>
      {f.label} ({f.id}) <small>p. {f.printedPage}</small>
      <select aria-label={'Conesa libro '+f.id}
       disabled={loaded.damaged!==null}
       value={selectedItem.entry?.criteria[f.id]??''}
       onChange={ev=>{
        const criteria={...(selectedItem.entry?.criteria||{})};
        if(ev.target.value==='')delete criteria[f.id];
        else criteria[f.id]=Number(ev.target.value);
        patch(selected,{criteria,...(f.id==='MC'?{recovery:null}: {})});
       }}>
       <option value="">Pendiente</option>
       {f.options.map(([value,label])=><option key={value} value={value}>{value} · {label}</option>)}
      </select>
     </label>)}
     {selectedItem.entry?.criteria.MC===4&&<label>Tipo de recuperación (MC=4)
      <select aria-label="Conesa libro recuperación" disabled={loaded.damaged!==null}
       value={selectedItem.entry?.recovery||''}
       onChange={e=>patch(selected,{recovery:(e.target.value||null) as BookRecovery})}>
       <option value="">Identificar tipo</option><option value="mitigable">Mitigable</option>
       <option value="compensable">Irrecuperable con medidas compensatorias</option>
      </select>
     </label>}
    </div>
    <div className="amb-conesa-result">
     <span>Importancia absoluta<strong data-book-absolute>{selectedResult?.absolute??'Pendiente'}</strong></span>
     <span>Importancia con signo<strong data-book-signed>{selectedResult?.signed??(selectedResult?'Indeterminado':'Pendiente')}</strong></span>
     <span>Clasificación / naturaleza<strong data-book-category>{selectedResult?.category??'Pendiente'}</strong></span>
    </div>
    {selectedProblems.length>0&&selectedItem.entry&&<p className="amb-conesa-problems" role="status" data-book-problems>
     {selectedProblems.join(' · ')}</p>}
    <label>Fundamento técnico<textarea rows={3} maxLength={5000} disabled={loaded.damaged!==null}
     value={selectedItem.entry?.reason||''} onChange={e=>patch(selected,{reason:e.target.value})}
     placeholder="Justificar criterios, circunstancias críticas y compensación…"/></label>
    <label>Evidencia / documento y página<input maxLength={1000} disabled={loaded.damaged!==null}
     value={selectedItem.entry?.evidence||''} onChange={e=>patch(selected,{evidence:e.target.value})}
     placeholder="Referencia verificable, documento y localización del impacto"/></label>
    {selectedItem.entry&&loaded.damaged===null&&<button type="button" className="amb-matrix-secondary"
     onClick={()=>remove(selected)}>Eliminar valoración de este cruce</button>}
   </div>}
  </div>
  <div className="amb-conesa-review" data-conesa-book-review>
   <h4>Revisión del libro · interacciones registradas</h4>
   <p>Se conservan también las valoraciones cuyo cruce dejó de estar en el catálogo. La naturaleza «x» no recibe una severidad negativa ni positiva por defecto.</p>
   <div className="amb-conesa-review-scroll" role="region" tabIndex={0} aria-label="Tabla de revisión según Conesa libro">
    <table><thead><tr><th>Factor / acción</th><th>Signo</th><th>Importancia abs.</th><th>Con signo</th><th>Clasificación</th><th>MC detalle</th><th>Revisión</th></tr></thead>
    <tbody>{rows.length===0?<tr><td colSpan={7}>Todavía no hay valoraciones registradas</td></tr>:
     rows.map(r=><tr key={r.id} data-book-review-row={r.id} data-conesa-orphan={r.orphan}>
      <th scope="row"><button type="button" disabled={r.orphan} onClick={()=>setSelected(r.id)}>
       {r.factor}<small>{r.action}</small></button></th>
      <td>{r.entry.sign??'—'}</td>
      <td>{r.result?.absolute??'—'}</td><td>{r.result?.signed??(r.result?'x':'—')}</td>
      <td>{r.result?.category??'Pendiente'}</td><td>{r.entry.recovery??'—'}</td>
      <td data-book-row-problems>{r.problems.length?r.problems.join('; '):r.result?.status==='naturaleza-incierta'?'Signo a investigar':'Cálculo completo'}</td>
     </tr>)}
    </tbody></table>
   </div>
  </div>
  <footer className="amb-matrix-footer">
   <span>Conesa · F1 · fuente 1997/reimp. 2000 · {projectId}</span>
   <span>{BOOK_BOUNDARY_POLICY}</span>
  </footer>
  {notice&&<p role="status" className="amb-matrix-notice">{notice}</p>}
  </div>
  <div role="tabpanel" className="amb-conesa-phase-panel" data-conesa-phase-panel="f2"
   id={stagePrefix+'-panel-f2'} aria-labelledby={stagePrefix+'-tab-f2'} hidden={stage!=='f2'}>
   <ConesaF2Panel projectId={projectId} projectName={projectName}
    factors={axes.factors} actions={axes.actions} entries={doc.entries}/>
  </div>
  <div role="tabpanel" className="amb-conesa-phase-panel" data-conesa-phase-panel="f3"
   id={stagePrefix+'-panel-f3'} aria-labelledby={stagePrefix+'-tab-'+(stage==='f3b'?'f3b':'f3a')}
   hidden={stage!=='f3a'&&stage!=='f3b'}>
   <ConesaF3Panel projectId={projectId} projectName={projectName} factors={axes.factors}
    focus={stage==='f3b'?'f3b':'f3a'} onStageChange={setStage}/>
  </div>
 </section>;
}
