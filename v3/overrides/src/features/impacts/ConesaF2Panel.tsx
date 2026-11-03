import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDownToLine,AlertTriangle,BookOpen,SlidersHorizontal} from 'lucide-react';
import {calculateBookConesa,type BookEntry} from './ConesaLibroModel';
import {
 F2_METHOD,F2_SCHEMA,F2_STORAGE,blankF2,validF2Document,
 proposeUIP,uipProblems,thresholdProblems,treatmentProblems,alertProblems,screeningReport,
 type F2Doc,type F2Factor,type F2Decision,type F2Alert,type Depuration
} from './ConesaF2Model';
import './ConesaF2Panel.css';

type Axis={id:string;name:string;phase:string};
type Props={
 projectId:string;projectName:string;
 factors:F2Factor[];actions:Axis[];
 entries:Record<string,BookEntry>
};
const treatmentNames:Record<Depuration,string>={
 normal:'Normal · incluir en matriz depurada',
 tamiz:'Descartado por tamiz documentado',
 intangible:'Intangible · examen paralelo',
 determinante:'Determinante · decisión paralela'
};
const blankAlert=():F2Alert=>({enabled:false,reason:'',evidence:'',alternative:''});
const blankDecision=():F2Decision=>({treatment:'normal',reason:'',evidence:''});
function readF2(projectId:string,projectName:string){
 try{
  const raw=localStorage.getItem(F2_STORAGE+projectId);
  if(raw!==null){
   try{const d:unknown=JSON.parse(raw);
    if(validF2Document(d,projectId))return {doc:d,damaged:null};
   }catch{/* Leave raw bytes intact */}
   return {doc:blankF2(projectId,projectName),damaged:raw};
  }
 }catch{/* Unavailable storage, edit temporary draft */}
 return {doc:blankF2(projectId,projectName),damaged:null};
}
function exportFile(filename:string,type:string,content:string){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=filename;
 document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function csvValue(value:unknown){
 const s=String(value??''),escaped=/^\s*[=+\-@\t\r]/.test(s)?"'"+s:s;
 return '"'+escaped.replaceAll('"','""')+'"';
}

export function ConesaF2Panel({projectId,projectName,factors,actions,entries}:Props){
 const [initial]=useState(()=>readF2(projectId,projectName));
 const [doc,setDoc]=useState<F2Doc>(initial.doc);
 const modified=useRef(false);
 const [selected,setSelected]=useState<string|null>(null);
 const [showWeights,setShowWeights]=useState(false);
 const [notice,setNotice]=useState('');
 const blocked=initial.damaged!==null;
 useEffect(()=>{
  if(!modified.current||blocked)return;
  try{localStorage.setItem(F2_STORAGE+projectId,JSON.stringify(doc));}
  catch{setNotice('El navegador no permitió guardar F2. Descargá el archivo JSON para conservar los cambios.');}
 },[blocked,doc,projectId]);
 const setDocument=(fn:(current:F2Doc)=>F2Doc)=>{
  if(blocked)return;modified.current=true;
  setDoc(current=>({...fn(current),updatedAt:new Date().toISOString()}));
 };
 const setThreshold=(changes:Partial<F2Doc['screening']>)=>
  setDocument(d=>({...d,screening:{...d.screening,...changes}}));
 const setUIP=(changes:Partial<F2Doc['uip']>)=>
  setDocument(d=>({...d,uip:{...d.uip,...changes}}));
 const setDecision=(id:string,changes:Partial<F2Decision>)=>
  setDocument(d=>({...d,screening:{...d.screening,decisions:{
   ...d.screening.decisions,
   [id]:{...(d.screening.decisions[id]||blankDecision()),...changes}
  }}}));
 const setAlert=(id:string,changes:Partial<F2Alert>)=>
  setDocument(d=>({...d,screening:{...d.screening,alerts:{
   ...d.screening.alerts,
   [id]:{...(d.screening.alerts[id]||blankAlert()),...changes}
  }}}));
 const clearDecision=(id:string)=>
  setDocument(d=>{
   const decisions={...d.screening.decisions};delete decisions[id];
   const alerts={...d.screening.alerts};delete alerts[id];
   return {...d,screening:{...d.screening,decisions,alerts}};
  });
 const interactions=useMemo(()=>factors.flatMap(f=>actions.flatMap(a=>{
  const id=f.id+'::'+a.id,entry=entries[id];
  return entry?[{id,factorId:f.id,actionId:a.id,entry,factor:f.name,action:a.name}]:[];
 })),[factors,actions,entries]);
 const active=interactions.find(i=>i.id===selected);
 const activeResult=active?calculateBookConesa(active.entry):null;
 const decision=active?doc.screening.decisions[active.id]:undefined;
 const alert=active?doc.screening.alerts[active.id]:undefined;
 const thresholdIssues=thresholdProblems(doc.screening);
 const allocation=proposeUIP(factors,doc.uip);
 const weightIssues=uipProblems(factors,doc.uip);
 const summary=useMemo(()=>screeningReport(interactions,doc.screening),[interactions,doc.screening]);
 const issues=new Map(summary.findings.map(f=>[f.id,f]));
 const source='Conesa Fernández-Vítora (1997, reimp. 2000), pp. 96–100; F2 experimental';
 const csvContent=()=>{
  const rows:(string|number|null)[][]=[[
   'Factor','Acción','ID interacción','I absoluta F1','I firmada F1','Naturaleza F1',
   'Tratamiento F2','Justificación','Evidencia','Bandera roja declarada',
   'Motivo alerta','Evidencia alerta','Alternativa planteada','UIP factor propuesta',
   'Observaciones de validación','Fuente'
  ]];
  const weightById=new Map(allocation?.allocations.map(a=>[a.factorId,a.uip])||[]);
  for(const x of interactions){
   const score=calculateBookConesa(x.entry),d=doc.screening.decisions[x.id],alert=doc.screening.alerts[x.id];
   const problems=issues.get(x.id)?.warnings||[];
   rows.push([x.factor,x.action,x.id,score?.absolute??null,score?.signed??null,
    x.entry.sign??'Pendiente',d?.treatment||'Pendiente',d?.reason||'',d?.evidence||'',
    alert?.enabled?'Sí':'No',alert?.reason||'',alert?.evidence||'',alert?.alternative||'',
    weightById.get(x.factorId)??null,problems.join(' | '),source]);
  }
  return '\uFEFF'+rows.map(r=>r.map(csvValue).join(';')).join('\r\n');
 };
 return <section className="amb-f2" data-conesa-f2={F2_METHOD}>
  <div className="amb-f2-head">
   <div>
    <p className="amb-matrix-overline"><BookOpen size={14} aria-hidden="true"/>  FASE F2 · CRIBA Y FACTORES</p>
    <h3>Matriz depurada, alertas y UIP</h3>
    <p>Complemento cualitativo de la edición 1997, pp. 96–100. No altera las puntuaciones F1, no aplica exclusiones automáticas ni certifica una consulta Delphi.</p>
   </div>
   <div className="amb-f2-export">
    <button type="button" onClick={()=>exportFile('AMBIENTA-Conesa-F2-'+projectId+'.json','application/json',
     JSON.stringify({...doc,provenance:source,interpretation:'Propuesta documental no validada por expertos'},null,2))}>
     <ArrowDownToLine size={15}/> JSON F2</button>
    <button type="button" onClick={()=>exportFile('AMBIENTA-Conesa-F2-'+projectId+'.csv','text/csv;charset=utf-8',csvContent())}>
     <ArrowDownToLine size={15}/> CSV F2</button>
   </div>
  </div>
  <p className="amb-f2-notice" role="note">
   La matriz depurada distingue <strong>normal</strong> (en el cálculo),
   <strong> tamiz</strong> (exclusión justificada),
   <strong> intangible</strong> y <strong> determinante</strong> (análisis paralelo).
   Una bandera roja es una alerta técnica para revisar alternativas, no una clase de severidad automática.
  </p>
  {blocked&&<div className="amb-f2-damaged" role="alert">
   <strong>Archivo F2 inválido: edición bloqueada.</strong> El documento anterior no se reemplazará.
   <button type="button" onClick={()=>exportFile('AMBIENTA-Conesa-F2-respaldo-'+projectId+'.txt',
    'text/plain;charset=utf-8',initial.damaged!)}>Descargar original sin modificar</button>
  </div>}
  <div className="amb-f2-summary" aria-label="Resumen de depuración F2">
   <span><strong>{interactions.length}</strong><small>Interacciones F1 registradas</small></span>
   <span><strong>{summary.normal}</strong><small>Normales validadas</small></span>
   <span><strong>{summary.parallel}</strong><small>En análisis paralelo</small></span>
   <span><strong>{summary.excluded}</strong><small>Por tamiz documentado</small></span>
   <span><strong>{summary.pending}</strong><small>Sin depurar / con errores</small></span>
   <span><strong>{summary.alerts}</strong><small>Banderas rojas declaradas</small></span>
  </div>
  <div className="amb-f2-sections">
   <section className="amb-f2-block" aria-label="Definición documentada del tamiz">
    <h4><SlidersHorizontal size={16}/> 1. Tamiz metodológico opcional</h4>
    <p>El umbral es una decisión del estudio. No descarta ninguna interacción hasta que el evaluador seleccione y justifique el tratamiento.</p>
    <div className="amb-f2-grid">
     <label>Umbral de importancia absoluta
      <input aria-label="Conesa F2 umbral" type="number" min="13" max="100" step="1" disabled={blocked}
       value={doc.screening.threshold??''} placeholder="Sin umbral"
       onChange={e=>setThreshold({threshold:e.target.value===''?null:Number(e.target.value)})}/>
     </label>
     <label>Justificación del umbral
      <textarea aria-label="Conesa F2 fundamento tamiz" rows={2} maxLength={5000} disabled={blocked}
       value={doc.screening.thresholdReason} onChange={e=>setThreshold({thresholdReason:e.target.value})}
       placeholder="Explicar por qué se adopta este valor…"/>
     </label>
     <label>Fuente o acta que sustenta el umbral
      <input aria-label="Conesa F2 evidencia tamiz" maxLength={1000} disabled={blocked}
       value={doc.screening.thresholdEvidence} onChange={e=>setThreshold({thresholdEvidence:e.target.value})}/>
     </label>
    </div>
    {thresholdIssues.length>0&&<p className="amb-f2-warning">{thresholdIssues.join(' · ')}</p>}
   </section>
   <section className="amb-f2-block" aria-label="Ponderación UIP documentada">
    <h4>2. Unidades de Importancia Ponderada (UIP)</h4>
    <p>El manual distribuye 1.000 UIP entre factores. Aquí los pesos de 1 a 10 son <strong>declarados</strong>: el cálculo de su distribución no acredita el consenso de expertos.</p>
    <button type="button" aria-expanded={showWeights} className="amb-f2-toggle"
     onClick={()=>setShowWeights(v=>!v)}>
      {showWeights?'Ocultar ponderación':'Registrar ponderación de factores'}
    </button>
    {showWeights&&<div className="amb-f2-weights">
     <div className="amb-f2-grid">
      <label>Panel o persona responsable y alcance
       <input disabled={blocked} maxLength={350} aria-label="Conesa F2 panel"
        value={doc.uip.panelReference} onChange={e=>setUIP({panelReference:e.target.value})}
        placeholder="Quién participó y qué representatividad tiene"/>
      </label>
      <label>Documento, acta y fuente
       <input disabled={blocked} maxLength={1000} aria-label="Conesa F2 fuente UIP"
        value={doc.uip.source} onChange={e=>setUIP({source:e.target.value})}/>
      </label>
      <label>Fecha de consulta
       <input type="date" disabled={blocked} aria-label="Conesa F2 fecha UIP"
        value={doc.uip.sessionDate} onChange={e=>setUIP({sessionDate:e.target.value})}/>
      </label>
      <label>Alcance y limitaciones de la consulta
       <textarea rows={2} disabled={blocked} maxLength={3000} aria-label="Conesa F2 notas UIP"
        value={doc.uip.notes} onChange={e=>setUIP({notes:e.target.value})}/>
      </label>
     </div>
     <div className="amb-f2-weight-table" role="region" tabIndex={0} aria-label="Factores y UIP propuestas">
      <table><thead><tr><th>Factor</th><th>Coeficiente declarado (1–10)</th><th>UIP propuesta</th></tr></thead>
       <tbody>{factors.map(f=>{
        const u=allocation?.allocations.find(a=>a.factorId===f.id);
        return <tr key={f.id}><th scope="row">{f.name}<small>{f.group}</small></th>
         <td><input type="number" min="1" max="10" step="1" disabled={blocked}
           aria-label={'UIP coeficiente '+f.name}
           value={doc.uip.coefficients[f.id]??''}
           onChange={e=>{
            const coefficients={...doc.uip.coefficients};
            if(e.target.value==='')delete coefficients[f.id];
            else coefficients[f.id]=Number(e.target.value);
            setUIP({coefficients});
           }}/></td><td>{u?.uip??'—'}</td>
        </tr>;
       })}</tbody></table>
     </div>
     <p className="amb-f2-weight-total" data-f2-uip-total>
      {allocation
       ?<>Propuesta matemática: <strong>{allocation.total} UIP</strong> repartidas. Sin validación profesional.</>
       :<>UIP pendientes: completar los coeficientes y la procedencia de la consulta.</>}
     </p>
     {weightIssues.length>0&&<p className="amb-f2-warning" data-f2-uip-problems>
      {weightIssues.join(' · ')}</p>}
    </div>}
   </section>
  </div>
  <section className="amb-f2-block">
   <h4>3. Depuración y banderas rojas por interacción</h4>
   <p>Las decisiones se aplican a cruces con valoración F1 registrada. Las que desaparezcan del catálogo siguen conservadas para revisión.</p>
   <div className="amb-f2-list" data-f2-interactions>
    {interactions.length===0?<p>Primero registrá alguna evaluación en F1.</p>:interactions.map(i=>{
     const report=issues.get(i.id),value=calculateBookConesa(i.entry);
     return <button key={i.id} type="button" aria-pressed={selected===i.id}
       onClick={()=>setSelected(selected===i.id?null:i.id)} data-f2-interaction={i.id}>
      <span>{i.factor}<small>{i.action}</small></span>
      <span>{value?(value.signed===null?'x':value.signed):'F1 pendiente'}</span>
      <span>{report?.treatment||'pendiente'}</span>
      {report?.redFlag&&<AlertTriangle size={16} aria-label="Bandera roja declarada"/>}
      {report?.warnings.length?<em>{report.warnings.length} aviso(s)</em>:null}
     </button>;
    })}
   </div>
   {active&&<div className="amb-f2-editor" data-f2-editor={active.id}>
    <h5>{active.factor} × {active.action}</h5>
    <p>F1 actual: {activeResult?activeResult.signed===null?
      'Naturaleza x, importancia '+activeResult.absolute:
      'Importancia '+activeResult.signed+' ('+activeResult.category+')'
      :'Incompleta. No se puede incluir como impacto normal hasta completar F1.'}</p>
    <label>Tratamiento de la matriz depurada
     <select aria-label="Conesa F2 tratamiento" value={decision?.treatment||''} disabled={blocked}
      onChange={e=>setDecision(active.id,{treatment:e.target.value as Depuration})}>
      <option value="">Pendiente de decidir</option>
      {(Object.keys(treatmentNames) as Depuration[]).map(key=><option key={key} value={key}>
       {treatmentNames[key]}</option>)}
     </select>
    </label>
    {decision&&<div className="amb-f2-grid">
     <label>Fundamento del tratamiento
      <textarea aria-label="Conesa F2 fundamento decisión" rows={3} maxLength={5000}
       disabled={blocked} value={decision.reason}
       onChange={e=>setDecision(active.id,{reason:e.target.value})}/>
     </label>
     <label>Referencia documental de la decisión
      <input aria-label="Conesa F2 evidencia decisión" maxLength={1000} disabled={blocked}
       value={decision.evidence} onChange={e=>setDecision(active.id,{evidence:e.target.value})}/>
     </label>
    </div>}
    <label className="amb-f2-alert-switch">
     <input type="checkbox" checked={!!alert?.enabled} disabled={blocked}
      onChange={e=>setAlert(active.id,{enabled:e.target.checked})}/>
     <AlertTriangle size={16}/> Bandera roja declarada: requiere análisis de alternativas
    </label>
    {alert?.enabled&&<div className="amb-f2-grid">
     <label>Por qué requiere una alerta
      <textarea aria-label="Conesa F2 motivo bandera roja" rows={2} disabled={blocked} maxLength={5000}
       value={alert.reason} onChange={e=>setAlert(active.id,{reason:e.target.value})}/>
     </label>
     <label>Fuente o evidencia de la criticidad
      <input aria-label="Conesa F2 evidencia bandera roja" disabled={blocked} maxLength={1000}
       value={alert.evidence} onChange={e=>setAlert(active.id,{evidence:e.target.value})}/>
     </label>
     <label>Alternativa propuesta (puede quedar pendiente)
      <input aria-label="Conesa F2 alternativa" disabled={blocked} maxLength={1500}
       value={alert.alternative} onChange={e=>setAlert(active.id,{alternative:e.target.value})}/>
     </label>
    </div>}
    <div className="amb-f2-warning" role="status" data-f2-problems>
     {[...treatmentProblems(decision,activeResult,doc.screening),
       ...alertProblems(alert,activeResult)].join(' · ')||'Decisión documentada; pendiente de revisión profesional'}
    </div>
    <button type="button" className="amb-f2-clear" disabled={blocked}
     onClick={()=>clearDecision(active.id)}>Volver a sin depurar (sin borrar F1)</button>
   </div>}
   {summary.findings.some(f=>f.warnings.some(w=>w.includes('desvinculado')))&&
    <p className="amb-f2-warning" role="status">
     Hay decisiones F2 vinculadas a cruces que ya no existen en los ejes actuales. Se conservan en el respaldo, pero no se consideran depuradas.
    </p>}
  </section>
  <footer className="amb-f2-footer">
   <span>F2 · 1997 · pp. 96–100 · {F2_SCHEMA}</span>
   <span>Estado: borrador metodológico sin validación de experto ni ponderación cualitativa final automática.</span>
  </footer>
  {notice&&<p role="status" className="amb-f2-warning">{notice}</p>}
 </section>;
}
