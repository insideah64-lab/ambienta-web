import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDownToLine,BookOpen} from 'lucide-react';
import {
 F3_METHOD,F3_STORAGE,blankF3,blankF3Factor,validF3Document,
 f3Problems,evaluateF3Factor,type F3Doc,type F3FactorRecord,type ScenarioF3
} from './ConesaF3Model';
import type {F2Factor} from './ConesaF2Model';
import {ConesaF3Comparison} from './ConesaF3Comparison';
import './ConesaF3Panel.css';
type Props={projectId:string;projectName:string;factors:F2Factor[]};
function readDraft(projectId:string,projectName:string):{doc:F3Doc;damaged:string|null}{
 try{
  const raw=localStorage.getItem(F3_STORAGE+projectId);
  if(raw!==null){
   try{
    const decoded:unknown=JSON.parse(raw);
    if(validF3Document(decoded,projectId))return {doc:decoded,damaged:null};
   }catch{/* Preserve raw payload for recovery */}
   return {doc:blankF3(projectId,projectName),damaged:raw};
  }
 }catch{/* Temporary draft if local storage is unavailable */}
 return {doc:blankF3(projectId,projectName),damaged:null};
}
function download(name:string,type:string,content:string){
 const url=URL.createObjectURL(new Blob([content],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;
 document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function csv(v:unknown){
 const s=String(v??'');
 const safe=/^\s*[=+\-@\t\r]/.test(s)?"'"+s:s;
 return '"'+safe.replaceAll('"','""')+'"';
}
function nullableNumber(value:string){return value.trim()===''?null:Number(value)}
export function ConesaF3Panel({projectId,projectName,factors}:Props){
 const [loaded]=useState(()=>readDraft(projectId,projectName));
 const [doc,setDoc]=useState<F3Doc>(loaded.doc);
 const [selected,setSelected]=useState<string>('');
 const [notice,setNotice]=useState('');
 const modified=useRef(false);
 const blocked=loaded.damaged!==null;
 const factor=factors.find(f=>f.id===selected);
 const current=factor?doc.records[factor.id]:undefined;
 const active=current||blankF3Factor();
 const problems=f3Problems(current);
 const quality=evaluateF3Factor(current);
 const rows=useMemo(()=>factors.map(f=>({
  factor:f,
  record:doc.records[f.id],
  issues:f3Problems(doc.records[f.id]),
  result:evaluateF3Factor(doc.records[f.id])
 })),[factors,doc]);
 const orphanIds=Object.keys(doc.records).filter(id=>!factors.some(f=>f.id===id));
 useEffect(()=>{
  if(!modified.current||blocked)return;
  try{localStorage.setItem(F3_STORAGE+projectId,JSON.stringify(doc))}
  catch{setNotice('No fue posible guardar F3 en este navegador. Exportá el archivo JSON para conservarlo.')}
 },[doc,blocked,projectId]);
 const update=(changes:Partial<F3FactorRecord>)=>{
  if(!factor||blocked)return;
  modified.current=true;
  setDoc(previous=>({
   ...previous,updatedAt:new Date().toISOString(),
   records:{...previous.records,[factor.id]:{
    ...(previous.records[factor.id]||blankF3Factor()),...changes
   }}
  }));
 };
 const changeScenario=(which:'without'|'withProject',changes:Partial<ScenarioF3>)=>
  update({[which]:{...active[which],...changes}});
 const changeTransformation=(changes:Partial<F3FactorRecord['transformation']>)=>
  update({transformation:{...active.transformation,...changes}});
 const exportCSV=()=>{
  const lines:(string|number)[][]=[['Factor','Indicador','Unidad','Tipo','SIN','Fecha SIN','Fuente SIN','CON',
   'Fecha CON','Fuente CON','CA SIN','CA CON','Delta CA','Delta magnitud',
   'Transformación','Fuente transformación','Método composición','Avisos']];
  for(const row of rows){
   const r=row.record,q=row.result;
   lines.push([row.factor.name,r?.indicator??'',r?.unit??'',r?.method??'',
    r?.without.value??'',r?.without.date??'',r?.without.source??'',
    r?.withProject.value??'',r?.withProject.date??'',r?.withProject.source??'',
    q?.without??'',q?.withProject??'',q?.delta??'',q?.rawDelta??'',
    r?JSON.stringify(r.transformation):'',r?.transformation.source??'',
    r?.composition??'',row.issues.join(' | ')]);
  }
  return '\uFEFF'+lines.map(row=>row.map(csv).join(';')).join('\r\n');
 };
 return <section className="amb-f3" data-conesa-f3={F3_METHOD}>
  <header className="amb-f3-head">
   <div>
    <p className="amb-matrix-overline"><BookOpen size={15}/> FASE F3a · VALORACIÓN CUANTITATIVA EXPERIMENTAL</p>
    <h3>Indicadores, escenarios y calidad ambiental</h3>
    <p>Conesa 1997, pp. 107–116. Se comparan magnitudes y calidades por factor, SIN/CON proyecto.
     No se infieren mediciones, funciones ni eficacia de medidas. F3a no calcula todavía Vj, IA total
     ni demuestra equivalencia entre la importancia cualitativa y la calidad ambiental.</p>
   </div>
   <div className="amb-f3-actions">
    <button type="button" onClick={()=>download('AMBIENTA-Conesa-F3a-'+projectId+'.json','application/json',
     JSON.stringify({...doc,provenance:'Conesa (1997), 5.2–5.3.2 pp. 107–116',
      interpretation:'Borrador sin validación profesional'},null,2))}>
     <ArrowDownToLine size={15}/> JSON F3a</button>
    <button type="button" onClick={()=>download('AMBIENTA-Conesa-F3a-'+projectId+'.csv','text/csv;charset=utf-8',exportCSV())}>
     <ArrowDownToLine size={15}/> CSV F3a</button>
   </div>
  </header>
  <p className="amb-f3-notice" role="note">
   F3a comienza con funciones <strong>lineales explícitas</strong>, definidas por límites y orientación
   aportados por el evaluador. Una recta no es una función atribuida automáticamente al libro.
   No extrapolamos, no sumamos unidades físicas distintas y no suponemos sinergia aditiva.
  </p>
  {blocked&&<div role="alert" className="amb-f3-error">
   <strong>El borrador guardado F3a no supera la validación; edición bloqueada.</strong>
   <p>Conservamos el texto original. Descargalo para recuperarlo, sin sustituirlo por un documento vacío.</p>
   <button type="button" onClick={()=>download('AMBIENTA-Conesa-F3a-respaldo-'+projectId+'.txt',
    'text/plain;charset=utf-8',loaded.damaged!)}>Descargar original sin modificar</button>
  </div>}
  <div className="amb-f3-summary">
   <span><strong>{factors.length}</strong><small>Factores disponibles</small></span>
   <span><strong>{rows.filter(r=>r.result).length}</strong><small>Con CA SIN/CON calculada</small></span>
   <span><strong>{rows.filter(r=>r.record&&!r.result).length}</strong><small>Incompletos o fuera de dominio</small></span>
   <span><strong>{orphanIds.length}</strong><small>Registros desvinculados preservados</small></span>
  </div>
  <ConesaF3Comparison rows={rows}/>
  <div className="amb-f3-list">
   {factors.length===0?<p>Agregá primero factores ambientales al catálogo de matrices.</p>:
    factors.map(f=>{
     const row=rows.find(r=>r.factor.id===f.id)!;
     return <button type="button" key={f.id} onClick={()=>setSelected(f.id)}
      aria-pressed={f.id===selected} data-f3-factor={f.id}>
      <span><strong>{f.name}</strong><small>{f.group}</small></span>
      <span>{row.record?.indicator||'Sin indicador'}</span>
      <span>{row.result?('ΔCA '+row.result.delta.toFixed(4)):'Pendiente'}</span>
     </button>;
    })}
  </div>
  {factor&&<section className="amb-f3-editor" data-f3-editor={factor.id}>
   <h4>{factor.name} · valoración por indicador</h4>
   <div className="amb-f3-grid">
    <label>Indicador de impacto
     <input aria-label="F3 indicador" maxLength={350} disabled={blocked} value={active.indicator}
      onChange={e=>update({indicator:e.target.value})} placeholder="Nombre técnico del parámetro"/></label>
    <label>Unidad de magnitud
     <input aria-label="F3 unidad" maxLength={80} disabled={blocked} value={active.unit}
      onChange={e=>update({unit:e.target.value})} placeholder="Unidad, p. ej. mg/L"/></label>
    <label>Método del indicador
     <select aria-label="F3 método" disabled={blocked} value={active.method}
      onChange={e=>update({method:e.target.value as F3FactorRecord['method']})}>
      <option value="directo">Medición directa</option><option value="modelo">Índice / modelo indirecto</option>
     </select></label>
    {active.method==='modelo'&&<label>Fuente y versión del modelo
     <input aria-label="F3 modelo" disabled={blocked} maxLength={1200}
      value={active.modelReference} onChange={e=>update({modelReference:e.target.value})}/></label>}
   </div>
   <label>Composición de magnitudes / acciones involucradas
    <textarea aria-label="F3 composición" rows={2} maxLength={2500} disabled={blocked}
     value={active.composition} onChange={e=>update({composition:e.target.value})}
     placeholder="Cómo se obtiene la magnitud total y si existen sinergias/acumulación"/></label>
   <div className="amb-f3-scenarios">
    {(['without','withProject'] as const).map(which=>{
     const s=active[which],tag=which==='without'?'SIN proyecto':'CON proyecto';
     return <fieldset key={which}>
      <legend>{tag}</legend>
      <label>Magnitud ({active.unit||'unidad pendiente'})
       <input aria-label={'F3 '+which+' magnitud'} type="number" step="any"
        disabled={blocked} value={s.value??''}
        onChange={e=>changeScenario(which,{value:nullableNumber(e.target.value)})}/></label>
      <label>Fecha de referencia
       <input aria-label={'F3 '+which+' fecha'} type="date" disabled={blocked} value={s.date}
        onChange={e=>changeScenario(which,{date:e.target.value})}/></label>
      <label>Origen
       <select aria-label={'F3 '+which+' tipo'} disabled={blocked} value={s.kind}
        onChange={e=>changeScenario(which,{kind:e.target.value as ScenarioF3['kind']})}>
        <option value="medido">Medido</option><option value="estimado">Estimado / predicho</option>
       </select></label>
      <label>Fuente verificable
       <input aria-label={'F3 '+which+' fuente'} disabled={blocked} maxLength={1200} value={s.source}
        onChange={e=>changeScenario(which,{source:e.target.value})}/></label>
     </fieldset>;
    })}
   </div>
   <fieldset className="amb-f3-transform">
    <legend>Función CA=f(M) · lineal documentada</legend>
    <div className="amb-f3-grid">
     <label>Mínimo del dominio
      <input aria-label="F3 mínimo" type="number" step="any" disabled={blocked}
       value={active.transformation.min??''}
       onChange={e=>changeTransformation({min:nullableNumber(e.target.value)})}/></label>
     <label>Máximo del dominio
      <input aria-label="F3 máximo" type="number" step="any" disabled={blocked}
       value={active.transformation.max??''}
       onChange={e=>changeTransformation({max:nullableNumber(e.target.value)})}/></label>
     <label>Dirección de calidad
      <select aria-label="F3 orientación" disabled={blocked} value={active.transformation.orientation}
       onChange={e=>changeTransformation({orientation:e.target.value as 'creciente'|'decreciente'})}>
       <option value="creciente">Mayor magnitud = mejor calidad</option>
       <option value="decreciente">Mayor magnitud = peor calidad</option>
      </select></label>
     <label>Fuente de la función de calidad
      <input aria-label="F3 función fuente" maxLength={1200} disabled={blocked}
       value={active.transformation.source}
       onChange={e=>changeTransformation({source:e.target.value})}/></label>
    </div>
    <label>Justificación y ámbito válido de aplicación
     <textarea aria-label="F3 función alcance" rows={2} maxLength={2000} disabled={blocked}
      value={active.transformation.scope}
      onChange={e=>changeTransformation({scope:e.target.value})}/></label>
   </fieldset>
   {quality?<div className="amb-f3-results" data-f3-results>
    <span>CA SIN<strong>{quality.without.toFixed(4)}</strong></span>
    <span>CA CON<strong>{quality.withProject.toFixed(4)}</strong></span>
    <span>Δ CA CON − SIN<strong>{quality.delta.toFixed(4)}</strong></span>
    <span>Δ magnitud ({active.unit})<strong>{quality.rawDelta.toLocaleString('es-AR')}</strong></span>
   </div>:<div className="amb-f3-error" data-f3-issues role="status">
    <strong>Sin resultado cuantitativo validable para este factor</strong>
    <p>{problems.join(' · ')}</p>
   </div>}
   {!blocked&&current&&<button type="button" className="amb-f3-delete" onClick={()=>{
    modified.current=true;setDoc(before=>{
     const records={...before.records};delete records[factor.id];
     return {...before,records,updatedAt:new Date().toISOString()};
    });
   }}>Quitar indicador F3 de este factor</button>}
  </section>}
  {orphanIds.length>0&&<p className="amb-f3-error">Hay {orphanIds.length} registro(s) F3 sin factor activo.
   No se borran ni se cuentan en resultados; permanecen en JSON.</p>}
  {notice&&<p role="status" className="amb-f3-error">{notice}</p>}
  <footer>F3a experimental · Capítulos 5.2–5.3.2 · No sustituye evaluación profesional ni certificación.</footer>
 </section>;
}
