import {useEffect,useRef,useState} from 'react';
import type {F3BCurve} from './ConesaF3CurveModel';
import {
 F3B_AUDIT_STORAGE,blankF3BAudit,validF3BAudit,
 f3bAuditProblems,f3bAuditFingerprint,auditComparison,auditIsCurrent,
 type F3BAudit
} from './ConesaF3DigitizationModel';
import {ANNEX4_CATALOG} from './ConesaAnnex4Catalog';
import './ConesaF3DigitizationAudit.css';

type Props={projectId:string;factorId:string;curve:F3BCurve;blocked:boolean};
function readAudit(projectId:string,factorId:string){
 try{
  const raw=localStorage.getItem(F3B_AUDIT_STORAGE+projectId+':'+factorId);
  if(raw!==null){
   try{
    const obj:unknown=JSON.parse(raw);
    if(validF3BAudit(obj,projectId,factorId))return {doc:obj,damaged:null};
   }catch{/* Retener la copia original */}
   return {doc:blankF3BAudit(projectId,factorId),damaged:raw};
  }
 }catch{/* Modo de memoria únicamente */}
 return {doc:blankF3BAudit(projectId,factorId),damaged:null};
}
function saveDownload(filename:string,payload:string){
 const url=URL.createObjectURL(new Blob([payload],{type:'application/json;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=filename;
 document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}
const calibrations=[
 {key:'xPixelA',label:'Píxel X · referencia 1'},
 {key:'xValueA',label:'Magnitud X · referencia 1'},
 {key:'xPixelB',label:'Píxel X · referencia 2'},
 {key:'xValueB',label:'Magnitud X · referencia 2'},
 {key:'yPixelA',label:'Píxel Y · referencia 1'},
 {key:'yValueA',label:'CA Y · referencia 1'},
 {key:'yPixelB',label:'Píxel Y · referencia 2'},
 {key:'yValueB',label:'CA Y · referencia 2'}
] as const;
const otherInputs=[
 {key:'scanReference',label:'Archivo / recorte del gráfico original',placeholder:'Ej.: captura y referencia verificable del PDF'},
 {key:'readerA',label:'Lector independiente A',placeholder:'Persona o equipo que realizó la primera lectura'},
 {key:'readerB',label:'Lector independiente B',placeholder:'Otra persona o equipo'},
 {key:'maxDeviationM',label:'Tolerancia máxima de magnitud M',placeholder:'En unidades físicas del indicador'},
 {key:'maxDeviationCA',label:'Tolerancia máxima de CA',placeholder:'Entre 0 y 1'},
 {key:'reviewer',label:'Tercera persona revisora',placeholder:'Diferente de A y B'}
] as const;

export function ConesaF3DigitizationAudit({projectId,factorId,curve,blocked}:Props){
 const [initial]=useState(()=>readAudit(projectId,factorId));
 const [audit,setAudit]=useState<F3BAudit>(initial.doc);
 const [notice,setNotice]=useState('');
 const changed=useRef(false);
 const damaged=initial.damaged!==null;
 const locked=blocked||damaged;
 const issues=f3bAuditProblems(audit,curve);
 const metrics=auditComparison(audit,curve);
 const current=auditIsCurrent(audit,curve);
 const stale=audit.approval!==null&&!current;
 useEffect(()=>{
  if(!changed.current||locked)return;
  try{
   localStorage.setItem(F3B_AUDIT_STORAGE+projectId+':'+factorId,JSON.stringify(audit));
  }catch{
   setNotice('No fue posible guardar la auditoría. Exportá el JSON para conservarla.');
  }
 },[audit,locked,projectId,factorId]);
 const update=(patch:Partial<F3BAudit>)=>{
  if(locked)return;
  changed.current=true;
  setAudit(prev=>({...prev,...patch,approval:null}));
 };
 const reviewed=()=>{
  if(locked||issues.length)return;
  changed.current=true;
  setAudit(prev=>({...prev,approval:{
   fingerprint:f3bAuditFingerprint(prev,curve),recordedAt:new Date().toISOString()
  }}));
 };
 return <details className="amb-f3b-audit" data-f3b-audit>
  <summary>Auditoría de digitalización · calibración y doble lectura</summary>
  <div className="amb-f3b-audit-content">
   <p className="amb-f3b-audit-help">
    Expediente de revisión <strong>local</strong> para curvas continuas del Anejo 4.
    Debés conservar el gráfico original, calibrar los ejes y registrar
    dos lecturas independientes de los mismos nudos. El módulo compara
    las lecturas con los nudos actuales de F3b, pero no digitaliza imágenes
    ni habilita automáticamente funciones para otros proyectos.
   </p>
   {damaged&&<div role="alert" className="amb-f3b-audit-warning" data-f3b-audit-damaged>
    Los datos de auditoría están dañados o tienen un esquema no compatible.
    El original se conserva sin sobrescribirlo.
    <button type="button" onClick={()=>saveDownload(
     'AMBIENTA-F3b-auditoria-original-'+factorId+'.txt',initial.damaged!)}>
     Descargar original sin modificar</button>
   </div>}
   <div className="amb-f3b-audit-status" role="status" data-f3b-audit-status>
    <strong>{current?'Revisión interna registrada':
     stale?'Revisión anterior no vigente':
     'Pendiente de revisión técnica'}</strong>
    <span>{issues.length} controles pendientes · {audit.approval?
     'Última decisión registrada: '+audit.approval.recordedAt:
     'Sin decisión registrada'}</span>
   </div>
   <div className="amb-f3b-audit-grid">
    <label>Ficha original cotejada
     <select aria-label="Auditoría ficha Anejo 4" value={audit.catalogId}
      disabled={locked} onChange={e=>update({catalogId:e.target.value})}>
      <option value="">Elegir ficha del catálogo</option>
      {ANNEX4_CATALOG.map(item=><option key={item.id} value={item.id}>
       {item.section} · {item.number}. {item.title}{item.graphForm==='continua'?'':' (no compatible con F3b continuo)'}
      </option>)}
     </select>
    </label>
    {otherInputs.slice(0,1).map(item=><label key={item.key}>{item.label}
     <input aria-label={'Auditoría '+item.label} disabled={locked} maxLength={600}
      value={audit[item.key]} placeholder={item.placeholder}
      onChange={e=>update({[item.key]:e.target.value})}/>
    </label>)}
   </div>
   <fieldset className="amb-f3b-audit-calibration">
    <legend>1. Calibración declarada de los ejes (píxel → magnitud / CA)</legend>
    <p>Usá dos referencias distintas en cada eje. Los valores deben proceder de
     los rótulos y marcas del gráfico original, no de estimaciones automáticas.</p>
    <div className="amb-f3b-audit-grid">
     {calibrations.map(item=><label key={item.key}>{item.label}
      <input aria-label={'Auditoría '+item.label} type="text" inputMode="decimal"
       value={audit[item.key]} disabled={locked} placeholder="Valor declarado"
       onChange={e=>update({[item.key]:e.target.value})}/>
     </label>)}
    </div>
   </fieldset>
   <fieldset>
    <legend>2. Lecturas independientes A y B</legend>
    <div className="amb-f3b-audit-grid">
     {otherInputs.slice(1,3).map(item=><label key={item.key}>{item.label}
      <input aria-label={'Auditoría '+item.label} disabled={locked} maxLength={350}
       value={audit[item.key]} placeholder={item.placeholder}
       onChange={e=>update({[item.key]:e.target.value})}/>
     </label>)}
    </div>
    <div className="amb-f3b-audit-grid">
     {(['A','B'] as const).map(letter=><label key={letter}>
      Lectura {letter} · una fila por nudo «M;CA»
      <textarea aria-label={'Auditoría lectura '+letter} rows={5} disabled={locked}
       value={letter==='A'?audit.readingA:audit.readingB}
       placeholder={'Ejemplo sintético de formato:\n0;0\n10;0,5\n20;1'}
       onChange={e=>update(letter==='A'?
        {readingA:e.target.value}:{readingB:e.target.value})}/>
     </label>)}
    </div>
    <div className="amb-f3b-audit-grid">
     {otherInputs.slice(3,5).map(item=><label key={item.key}>{item.label}
      <input aria-label={'Auditoría '+item.label} type="text" inputMode="decimal"
       disabled={locked} value={audit[item.key]} placeholder={item.placeholder}
       onChange={e=>update({[item.key]:e.target.value})}/>
     </label>)}
    </div>
    <label>Justificación de las tolerancias según resolución del gráfico
     <textarea aria-label="Auditoría justificación tolerancias" disabled={locked}
      value={audit.toleranceBasis} rows={2} maxLength={1500}
      onChange={e=>update({toleranceBasis:e.target.value})}/>
    </label>
    {metrics&&<div className="amb-f3b-audit-metrics" data-f3b-audit-metrics>
     <strong>Discrepancias absolutas máximas observadas (no incertidumbre estadística)</strong>
     <div><span>Entre lecturas A y B</span>
      <b>ΔM {metrics.maxDifferenceM.toFixed(5)} · ΔCA {metrics.maxDifferenceCA.toFixed(5)}</b></div>
     <div><span>Frente a los nudos actuales de F3b</span>
      <b>ΔM {metrics.maxVersusCurveM.toFixed(5)} · ΔCA {metrics.maxVersusCurveCA.toFixed(5)}</b></div>
    </div>}
   </fieldset>
   <fieldset>
    <legend>3. Dictamen de revisión</legend>
    <label>Correspondencia de indicador, unidad, período y ámbito de aplicación
     <textarea aria-label="Auditoría correspondencia" rows={2} maxLength={1500}
      value={audit.correspondence} disabled={locked}
      onChange={e=>update({correspondence:e.target.value})}/>
    </label>
    <div className="amb-f3b-audit-grid">
     <label>Persona revisora (distinta de A y B)
      <input aria-label="Auditoría revisor" maxLength={350} disabled={locked}
       value={audit.reviewer} onChange={e=>update({reviewer:e.target.value})}/>
     </label>
     <label>Fecha del dictamen
      <input aria-label="Auditoría fecha revisión" type="date" disabled={locked}
       value={audit.reviewDate} onChange={e=>update({reviewDate:e.target.value})}/>
     </label>
    </div>
    <label>Observaciones y justificación de la decisión
     <textarea aria-label="Auditoría dictamen" rows={2} maxLength={1500}
      value={audit.reviewNotes} disabled={locked}
      onChange={e=>update({reviewNotes:e.target.value})}/>
    </label>
   </fieldset>
   {issues.length>0?<div className="amb-f3b-audit-warning" data-f3b-audit-issues role="status">
    <strong>Controles pendientes antes de registrar revisión</strong>
    <ul>{issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul>
   </div>:<p className="amb-f3b-audit-valid" data-f3b-audit-ready role="status">
    Las condiciones de consistencia declaradas están satisfechas.
    La decisión sigue siendo responsabilidad de la persona revisora.
   </p>}
   {stale&&<p role="alert" className="amb-f3b-audit-warning">
    Cambiaron los datos de esta curva o su auditoría: la decisión anterior
    dejó de corresponder con la versión actual.
   </p>}
   {notice&&<p role="alert" className="amb-f3b-audit-warning">{notice}</p>}
   <div className="amb-f3b-audit-actions">
    <button type="button" disabled={locked||issues.length>0}
     onClick={reviewed}>Registrar decisión de revisión interna</button>
    <button type="button" disabled={damaged}
     onClick={()=>saveDownload('AMBIENTA-Conesa-F3b-auditoria-'+factorId+'.json',
      JSON.stringify({...audit,notice:'Registro de revisión interna, no firma digital ni homologación oficial'},null,2))}>
     Exportar expediente JSON</button>
   </div>
   <p className="amb-f3b-audit-foot">
    Esta validación es una declaración local sin firma digital; no certifica el
    gráfico, no reemplaza el control profesional y no convierte las curvas en
    normas argentinas ni las incorpora automáticamente al catálogo reutilizable.
   </p>
  </div>
 </details>;
}
