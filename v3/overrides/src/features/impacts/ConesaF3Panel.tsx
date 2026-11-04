import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDownToLine,BookOpen} from 'lucide-react';
import {
 F3_METHOD,F3_STORAGE,blankF3,blankF3Factor,validF3Document,
 f3Problems,evaluateF3Factor,type F3Doc,type F3FactorRecord,type ScenarioF3
} from './ConesaF3Model';
import type {F2Factor} from './ConesaF2Model';
import {
 F3B_STORAGE,blankF3BDoc,blankF3BCurve,validF3BDoc,
 f3bProblems,evaluateF3BCurve,type F3BDoc,type F3BCurve
} from './ConesaF3CurveModel';
import {ConesaF3CurveEditor} from './ConesaF3CurveEditor';
import {ConesaF3Comparison} from './ConesaF3Comparison';
import './ConesaF3Panel.css';
type Props={projectId:string;projectName:string;factors:F2Factor[];
 focus?:'f3a'|'f3b';onStageChange?:(next:'f3a'|'f3b')=>void};
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
function readCurveDraft(projectId:string,projectName:string):{doc:F3BDoc;damaged:string|null}{
 try{
  const raw=localStorage.getItem(F3B_STORAGE+projectId);
  if(raw!==null){
   try{
    const decoded:unknown=JSON.parse(raw);
    if(validF3BDoc(decoded,projectId))return {doc:decoded,damaged:null};
   }catch{/* Never overwrite a damaged original */}
   return {doc:blankF3BDoc(projectId,projectName),damaged:raw};
  }
 }catch{/* Draft remains memory-only when storage unavailable */}
 return {doc:blankF3BDoc(projectId,projectName),damaged:null};
}
export function ConesaF3Panel({projectId,projectName,factors,focus='f3a',onStageChange}:Props){
 const [loaded]=useState(()=>readDraft(projectId,projectName));
 const [curveLoaded]=useState(()=>readCurveDraft(projectId,projectName));
 const [doc,setDoc]=useState<F3Doc>(loaded.doc);
 const [curveDoc,setCurveDoc]=useState<F3BDoc>(curveLoaded.doc);
 const [selected,setSelected]=useState<string>('');
 const [notice,setNotice]=useState('');
 const modified=useRef(false);
 const curveModified=useRef(false);
 const blocked=loaded.damaged!==null;
 const curveBlocked=curveLoaded.damaged!==null;
 const factor=factors.find(f=>f.id===selected);
 const current=factor?doc.records[factor.id]:undefined;
 const active=current||blankF3Factor();
 const curveRecord=factor?curveDoc.records[factor.id]:undefined;
 const curveActive=!!curveRecord?.enabled;
 const problems=curveActive?f3bProblems(current,curveRecord):f3Problems(current);
 const quality=curveActive?evaluateF3BCurve(current,curveRecord):evaluateF3Factor(current);
 const rows=useMemo(()=>factors.map(f=>{
  const record=doc.records[f.id],curve=curveDoc.records[f.id],isCurve=!!curve?.enabled;
  return {
   factor:f,record,
   mode:isCurve?'curva':'lineal',
   methodDescription:isCurve?'F3b · interpolación por tramos':'F3a · lineal',
   methodSource:isCurve?curve.source:(record?.transformation.source??''),
   issues:isCurve?f3bProblems(record,curve):f3Problems(record),
   result:isCurve?evaluateF3BCurve(record,curve):evaluateF3Factor(record)
  };
 }),[factors,doc,curveDoc]);
 const orphanIds=Object.keys(doc.records).filter(id=>!factors.some(f=>f.id===id));
 const orphanCurveIds=Object.keys(curveDoc.records).filter(id=>!factors.some(f=>f.id===id));
 const curveRows=useMemo(()=>factors.map(f=>{
  const base=doc.records[f.id],curve=curveDoc.records[f.id];
  const enabled=!!curve?.enabled;
  return {factor:f,base,curve,enabled,
   ready:enabled&&f3bProblems(base,curve).length===0};
 }),[factors,doc,curveDoc]);
 const activeCurves=curveRows.filter(r=>r.enabled);
 const readyCurves=activeCurves.filter(r=>r.ready).length;
 const curvePoints=activeCurves.reduce((total,r)=>total+(r.curve?.points.length??0),0);
 useEffect(()=>{
  if(!modified.current||blocked)return;
  try{localStorage.setItem(F3_STORAGE+projectId,JSON.stringify(doc))}
  catch{setNotice('No fue posible guardar F3 en este navegador. Exportá el archivo JSON para conservarlo.')}
 },[doc,blocked,projectId]);
 useEffect(()=>{
  if(!curveModified.current||curveBlocked)return;
  try{localStorage.setItem(F3B_STORAGE+projectId,JSON.stringify(curveDoc))}
  catch{setNotice('No se pudo guardar F3b. Exportá el JSON de curvas para conservarlo.')}
 },[curveDoc,curveBlocked,projectId]);
 const updateCurve=(next:F3BCurve)=>{
  if(!factor||curveBlocked)return;
  curveModified.current=true;
  setCurveDoc(previous=>({...previous,updatedAt:new Date().toISOString(),
   records:{...previous.records,[factor.id]:next}}));
 };
 const chooseCurve=(mode:'lineal'|'curva')=>{
  if(!factor||curveBlocked)return;
  const previous=curveDoc.records[factor.id];
  if(mode==='lineal'&&!previous?.enabled)return;
  updateCurve(previous?{...previous,enabled:mode==='curva'}:
   {...blankF3BCurve(current||blankF3Factor()),enabled:mode==='curva'});
 };
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
    row.mode==='curva'?JSON.stringify(curveDoc.records[row.factor.id]??''):
     (r?JSON.stringify(r.transformation):''),
    row.methodSource??'',r?.composition??'',row.issues.join(' | ')]);
  }
  return '\uFEFF'+lines.map(row=>row.map(csv).join(';')).join('\r\n');
 };
 return <section className="amb-f3" data-conesa-f3={F3_METHOD} data-conesa-f3-focus={focus}>
  <header className="amb-f3-head">
   <div>
    <p className="amb-matrix-overline"><BookOpen size={15}/> {focus==='f3a'?'ETAPA F3a · INDICADORES Y ESCENARIOS':'ETAPA F3b · CURVAS DOCUMENTADAS'}</p>
    <h3>{focus==='f3a'?'Indicadores y calidad ambiental':'Curvas de transformación'}</h3>
    {focus==='f3a'?
     <p>Definí indicadores, unidades y escenarios SIN/CON proyecto. Compará la calidad ambiental
      calculada por la función activa de cada factor, sin sumar indicadores ni inventar mediciones.</p>:
     <p>Documentá y revisá funciones de transformación mediante nudos, referencias técnicas,
      previsualizaciones y auditoría de digitalización. Los escenarios proceden de Calidad ambiental.</p>}
   </div>
   <div className="amb-f3-actions">
    {focus==='f3a'&&<button type="button" onClick={()=>download('AMBIENTA-Conesa-F3a-'+projectId+'.json','application/json',
     JSON.stringify({...doc,provenance:'Conesa (1997), 5.2–5.3.2 pp. 107–116',
      interpretation:'Borrador sin validación profesional'},null,2))}>
     <ArrowDownToLine size={15}/> JSON F3a</button>}
    {focus==='f3a'&&<button type="button" onClick={()=>download('AMBIENTA-Conesa-F3a-'+projectId+'.csv','text/csv;charset=utf-8',exportCSV())}>
     <ArrowDownToLine size={15}/> CSV F3a/F3b</button>}
    {focus==='f3b'&&<button type="button" disabled={curveBlocked}
     onClick={()=>download('AMBIENTA-Conesa-F3b-curvas-'+projectId+'.json','application/json',
     JSON.stringify({...curveDoc,provenance:'Conesa 1997, cap. 5.3 y Anejo 4',
      interpretation:'Curvas reconstruidas por el evaluador, no digitalización oficial'},null,2))}>
     <ArrowDownToLine size={15}/> JSON Curvas F3b</button>}
   </div>
  </header>
  <p className="amb-f3-notice" role="note">
   {focus==='f3a'?
    'Este espacio compara magnitudes y calidades SIN/CON proyecto. Si un factor utiliza una curva F3b, sus resultados se muestran aquí; los nudos y su procedencia se revisan en Curvas. Ningún indicador se transforma automáticamente.':
    'Este espacio no vuelve a ingresar los escenarios, ni presenta la comparación SIN/CON. Los nudos son introducidos y documentados por especialistas; no se extrapolan valores ni se suponen curvas oficiales.'}
  </p>
  {blocked&&<div role="alert" className="amb-f3-error">
   <strong>El borrador guardado F3a no supera la validación; edición bloqueada.</strong>
   <p>Conservamos el texto original. Descargalo para recuperarlo, sin sustituirlo por un documento vacío.</p>
   <button type="button" onClick={()=>download('AMBIENTA-Conesa-F3a-respaldo-'+projectId+'.txt',
    'text/plain;charset=utf-8',loaded.damaged!)}>Descargar original sin modificar</button>
  </div>}
  {curveBlocked&&<div role="alert" className="amb-f3-error" data-f3b-damaged>
   <strong>El respaldo F3b no supera la validación; las curvas quedan bloqueadas.</strong>
   <p>No se reescribe el archivo original. F3a permanece independiente y accesible.</p>
   <button type="button" onClick={()=>download('AMBIENTA-F3b-original-'+projectId+'.txt',
    'text/plain;charset=utf-8',curveLoaded.damaged!)}>Descargar original F3b sin modificar</button>
  </div>}
  {focus==='f3a'?<div data-f3a-workspace>
   <div className="amb-f3-summary">
    <span><strong>{factors.length}</strong><small>Factores ambientales</small></span>
    <span><strong>{rows.filter(r=>r.record?.indicator).length}</strong><small>Con indicador declarado</small></span>
    <span><strong>{rows.filter(r=>r.result).length}</strong><small>CA SIN/CON calculada</small></span>
    <span><strong>{orphanIds.length}</strong><small>Registros desvinculados preservados</small></span>
   </div>
   <ConesaF3Comparison rows={rows}/>
   <div className="amb-f3-workspace-label">
    <h4>Indicadores y escenarios por factor</h4>
    <p>Elegí un factor para completar los datos medidos o estimados, su procedencia y la función lineal.
     Las curvas F3b ya activas se reflejan en la comparación anterior, pero se editan en su propia solapa.</p>
   </div>
   <div className="amb-f3-list" data-f3a-indicator-list>
    {factors.length===0?<p>Agregá primero factores ambientales al catálogo de matrices.</p>:
     factors.map(f=>{
      const row=rows.find(r=>r.factor.id===f.id)!;
      const before=row.record?.without.value,after=row.record?.withProject.value;
      return <button type="button" key={f.id} onClick={()=>setSelected(f.id)}
       aria-pressed={f.id===selected} data-f3-factor={f.id} data-f3a-indicator={f.id}>
       <span><strong>{f.name}</strong><small>{f.group}</small></span>
       <span>{row.record?.indicator||'Indicador pendiente'}<small>{
        before!==null&&before!==undefined&&after!==null&&after!==undefined
         ?'SIN '+before+' · CON '+after+' '+(row.record?.unit||''):'Escenarios pendientes'
       }</small></span>
       <span>{row.result?('ΔCA '+row.result.delta.toFixed(4)):'Pendiente'}</span>
      </button>;
     })}
   </div>
  </div>:
  <div data-f3b-workspace>
   <div className="amb-f3b-overview" data-f3b-overview>
    <div><strong>{activeCurves.length}</strong><small>Curvas activas</small></div>
    <div><strong>{readyCurves}</strong><small>Curvas evaluables</small></div>
    <div><strong>{activeCurves.length-readyCurves}</strong><small>Curvas pendientes de revisión</small></div>
    <div><strong>{curvePoints}</strong><small>Nudos registrados en curvas activas</small></div>
   </div>
   <div className="amb-f3-workspace-label">
    <h4>Funciones de transformación por factor</h4>
    <p>Seleccioná una curva para revisar origen, ámbito de aplicación, nudos y gráfico M → CA.
     Los factores sin curva aparecen para permitir comenzar una nueva, sin inventar puntos ni fuentes.</p>
   </div>
   <div className="amb-f3b-curve-index" data-f3b-curve-index>
    {factors.length===0?<p>Agregá primero factores ambientales al catálogo de matrices.</p>:
     curveRows.map(({factor:f,base,curve,enabled,ready})=><button key={f.id}
      type="button" data-f3-factor={f.id} data-f3b-curve-card={f.id}
      aria-pressed={f.id===selected} onClick={()=>setSelected(f.id)}>
      <span className="amb-f3b-card-name"><strong>{f.name}</strong><small>{f.group}</small></span>
      <span className="amb-f3b-card-detail">{base?.indicator||'Indicador sin definir'}
       <small>{curve?.points.length??0} nudos guardados · {curve?.source||'Fuente no documentada'}</small>
      </span>
      <span className="amb-f3b-card-state" data-f3b-status={enabled?(ready?'evaluable':'pendiente'):'inactiva'}>
       {enabled?(ready?'Evaluable':'Revisión pendiente'):'Sin curva activa'}
      </span>
     </button>)}
   </div>
   {orphanCurveIds.length>0&&<p className="amb-f3-error" role="note">Hay {orphanCurveIds.length}
    curva(s) con factor desvinculado. No se eliminan: permanecen en el JSON F3b.</p>}
  </div>}
  {factor&&<section className="amb-f3-editor" data-f3-editor={factor.id}>
   <h4>{factor.name} · {focus==='f3a'?'indicador y escenarios':'función y evidencia de la curva'}</h4>
   {focus==='f3b'&&<div className="amb-f3-stage-hint" role="note">
    <strong>Datos de referencia desde Calidad ambiental (F3a)</strong>
    <p>Indicador: {active.indicator||'pendiente'} · Unidad: {active.unit||'pendiente'}.
     Los escenarios SIN/CON se editan en F3a y se reutilizan aquí sin copiarlos.</p>
    {onStageChange&&<button type="button" onClick={()=>onStageChange('f3a')}>Editar indicador y escenarios en F3a</button>}
   </div>}
   {focus==='f3a'&&<>
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
   </>}
   {focus==='f3b'&&<div className="amb-f3-type">
    <label>Tipo de transformación de calidad ambiental
     <select aria-label="F3 tipo de función" value={curveActive?'curva':'lineal'}
      disabled={curveBlocked||blocked} onChange={e=>chooseCurve(e.target.value as 'lineal'|'curva')}>
      <option value="lineal">F3a · recta documentada</option>
      <option value="curva">F3b · curva por nudos documentados</option>
     </select>
    </label>
    <p>Cambiar de función no borra ni transforma la anterior. La evaluación utiliza
     exclusivamente el método seleccionado para este factor.</p>
   </div>}
   {focus==='f3b' ? (curveActive&&curveRecord?
    <ConesaF3CurveEditor base={active} curve={curveRecord} projectId={projectId}
     factorId={factor.id} blocked={blocked||curveBlocked} onChange={updateCurve}/>:
    <p className="amb-f3-stage-hint">Para trabajar con curvas, elegí «F3b · curva por nudos documentados».
     La función lineal se configura en la solapa Calidad ambiental.</p>) :
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
   </fieldset>}
   {quality?(focus==='f3b'?<div className="amb-f3b-evaluation" data-f3-results>
    <strong>Resultado de la función de transformación activa</strong>
    <p>CA del escenario SIN: <b>{quality.without.toFixed(4)}</b> ·
     CA del escenario CON: <b>{quality.withProject.toFixed(4)}</b> ·
     Diferencia de calidad: <b>{quality.delta.toFixed(4)}</b>.</p>
    <p>Estos valores proceden de los escenarios F3a, interpolados con los nudos revisados aquí.
     La comparación ambiental global se consulta únicamente en Calidad ambiental.</p>
   </div>:<div className="amb-f3-results" data-f3-results>
    <span>CA SIN<strong>{quality.without.toFixed(4)}</strong></span>
    <span>CA CON<strong>{quality.withProject.toFixed(4)}</strong></span>
    <span>Δ CA CON − SIN<strong>{quality.delta.toFixed(4)}</strong></span>
    <span>Δ magnitud ({active.unit})<strong>{quality.rawDelta.toLocaleString('es-AR')}</strong></span>
   </div>):<div className="amb-f3-error" data-f3-issues role="status">
    <strong>Sin resultado cuantitativo validable para este factor</strong>
    <p>{problems.join(' · ')}</p>
   </div>}
   {focus==='f3a'&&!blocked&&current&&<button type="button" className="amb-f3-delete" onClick={()=>{
    modified.current=true;setDoc(before=>{
     const records={...before.records};delete records[factor.id];
     return {...before,records,updatedAt:new Date().toISOString()};
    });
   }}>Quitar indicador F3 de este factor</button>}
  </section>}
  {orphanIds.length>0&&<p className="amb-f3-error">Hay {orphanIds.length} registro(s) F3 sin factor activo.
   No se borran ni se cuentan en resultados; permanecen en JSON.</p>}
  {notice&&<p role="status" className="amb-f3-error">{notice}</p>}
  <footer>{focus==='f3a'?
   'Indicadores y escenarios SIN/CON · Conesa, §5.3. Los resultados de calidad dependen de la función activa y de fuentes válidas.':
   'Curvas documentadas · Conesa, Anejo 4. La interpolación es declarada, no digitalización oficial ni revisión profesional.'}</footer>
 </section>;
}
