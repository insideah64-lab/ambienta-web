import {useEffect,useMemo,useState,type FormEvent} from 'react';
import type {DemoState} from '../../lib/demo';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
// @ts-ignore: laboratory-only independent Node/browser registry
import {MEASUREMENT_MATRICES,MEASUREMENT_UNITS,MEASUREMENT_QUALIFIERS,measurementsKey,
 readMeasurementBook,addMeasurement,voidMeasurement,measurementStatus,summarizeMeasurements,
 exportMeasurementBook} from './measurements.mjs';
import './measurements.css';
type Props={data:DemoState};
type Entry={id:string;sampleId:string;stationId:string;matrix:string;parameter:string;qualifier:string;unit:string;
 value:number|null;collectedAt:string;method:string;sourceId:string;[key:string]:unknown};
type Book={entries:Entry[];revision:number;[key:string]:unknown};
const key=measurementsKey(IS_DIABLILLOS_CASE);
const defaults=()=>({measureId:'',inspectionId:'',evidenceId:'',sampleId:'',stationId:'',matrix:'agua',
 parameter:'',qualifier:'quantified',unit:'mg/L',value:'',detectionLimit:'',quantificationLimit:'',
 uncertainty:'',collectedAt:'',analyzedAt:'',method:'',sourceId:'',operator:''});
const qualifierLabels:Record<string,string>={quantified:'Cuantificado',below_detection:'Inferior a detección',
 below_quantification:'Inferior a cuantificación'};
const statusLabels:Record<string,string>={awaiting_evidence:'Sin evidencia',evidence_reference_unverified:'Referencia sin verificar',
 fingerprint_declared_unverified:'SHA declarado, archivo no cotejado',voided:'Anulado'};
const dateIso=(s:string)=>{if(!s)return null;const d=new Date(s);if(Number.isNaN(d.getTime()))throw Error('Fecha inválida');return d.toISOString();};
const numberOrNull=(s:string)=>s.trim()===''?null:Number(s);
function downloadJson(name:string,value:unknown){
 const u=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),500);
}
export function MeasurementWorkbench({data}:Props){
 const [revision,setRevision]=useState(0),[form,setForm]=useState(defaults);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [voidId,setVoidId]=useState(''),[reason,setReason]=useState(''),[actor,setActor]=useState('');
 const state=useMemo(()=>readMeasurementBook(localStorage,key,data),[data,revision]);
 const book=state.book as Book|null;
 const stats=book?summarizeMeasurements(book,data):null;
 const inspections=data.inspections.filter(x=>x.measureId===form.measureId);
 const evidence=data.evidence.filter(x=>x.measureId===form.measureId&&(!x.inspectionId||x.inspectionId===form.inspectionId));
 useEffect(()=>{const reload=()=>setRevision(x=>x+1);
  window.addEventListener('focus',reload);window.addEventListener('storage',reload);
  return ()=>{window.removeEventListener('focus',reload);window.removeEventListener('storage',reload);};
 },[]);
 const put=(name:string,value:string)=>setForm(old=>({...old,[name]:value,
  ...(name==='measureId'?{inspectionId:'',evidenceId:''}:{}),
  ...(name==='inspectionId'?{evidenceId:''}:{})}));
 const field=(name:string,label:string,required=false,type='text')=><label key={name}>{label}
  <input aria-label={label} type={type} required={required} maxLength={type==='text'?180:undefined}
   step={type==='number'?'any':undefined} value={(form as Record<string,string>)[name]}
   onChange={e=>put(name,e.target.value)}/></label>;
 const select=(name:string,label:string,options:{value:string;label:string}[],disabled=false)=><label key={name}>{label}
  <select aria-label={label} value={(form as Record<string,string>)[name]} disabled={disabled}
   onChange={e=>put(name,e.target.value)}>
   {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select></label>;
 function persist(previous:Book,next:Book){
  const latest=readMeasurementBook(localStorage,key,data);
  if(!latest.book||JSON.stringify(latest.book)!==JSON.stringify(previous))
   throw Error('Los datos cambiaron en otra pestaña. Actualizá antes de editar.');
  localStorage.setItem(key,JSON.stringify(next));setRevision(x=>x+1);
 }
 function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');setNotice('');if(!book)return;
  try{
   const next=addMeasurement(book,data,{...form,
    inspectionId:form.inspectionId||null,evidenceId:form.evidenceId||null,
    collectedAt:dateIso(form.collectedAt),analyzedAt:dateIso(form.analyzedAt),
    value:form.qualifier==='quantified'?numberOrNull(form.value):null,
    detectionLimit:numberOrNull(form.detectionLimit),quantificationLimit:numberOrNull(form.quantificationLimit),
    uncertainty:numberOrNull(form.uncertainty)},new Date().toISOString()) as Book;
   persist(book,next);setForm(defaults());
   setNotice('Medición declarada guardada. No implica medición acreditada o cumplimiento.');
  }catch(x){setError(x instanceof Error?x.message:'Error en registro');}
 }
 function annul(){if(!book)return;setError('');setNotice('');
  try{const next=voidMeasurement(book,data,voidId,reason,actor,new Date().toISOString()) as Book;
   persist(book,next);setVoidId('');setReason('');setActor('');
   setNotice('Registro anulado; el dato y la auditoría fueron conservados.');
  }catch(x){setError(x instanceof Error?x.message:'No se pudo anular');}
 }
 return <section className="am-measurements" data-measurements-panel={state.status}
  aria-label="Registro de mediciones ambientales">
  <header><div><small>MONITOREO · V3.8</small><h3>Mediciones ambientales</h3></div><b>LOCAL · NO VERIFICADO</b></header>
  <p>Las muestras tienen un registro independiente de las inspecciones. No se generan resultados de ejemplo,
   se convierten unidades ni se declaran incumplimientos automáticamente.</p>
  {state.status==='blocked'&&<p className="am-error" role="alert">Registro local inválido o referencias desaparecidas.
   No se sobrescribirá su contenido. {state.reason}</p>}
  {book&&<>
   <div className="am-stats" data-measurement-summary="true">
    <span><strong>{stats?.total??0}</strong> registros</span><span><strong>{stats?.active??0}</strong> activos</span>
    <span><strong>{stats?.awaitingEvidence??0}</strong> sin respaldo</span><span><strong>{stats?.voided??0}</strong> anulados</span>
   </div>
   <form onSubmit={submit} className="am-form"><h4>Registrar un dato declarado</h4>
    <div className="am-fields">
     {select('measureId','Medida PGA',[{value:'',label:'Seleccionar medida'},...data.measures.map(m=>({value:m.id,label:m.id+' · '+m.title}))])}
     {select('inspectionId','Inspección opcional',[{value:'',label:'Sin inspección'},...inspections.map(i=>({value:i.id,label:i.id}))],!form.measureId)}
     {select('evidenceId','Evidencia opcional',[{value:'',label:'Sin evidencia'},...evidence.map(x=>({value:x.id,label:x.id+' · '+x.label}))],!form.measureId)}
     {field('sampleId','ID de muestra',true)}
     {field('stationId','Identificador de estación',true)}
     {select('matrix','Matriz ambiental',MEASUREMENT_MATRICES.map((x:string)=>({value:x,label:x})))}
     {field('parameter','Parámetro o analito',true)}
     {select('qualifier','Calificador del resultado',MEASUREMENT_QUALIFIERS.map((x:string)=>({value:x,label:qualifierLabels[x]})))}
     {select('unit','Unidad',MEASUREMENT_UNITS.map((x:string)=>({value:x,label:x})))}
     {form.qualifier==='quantified'&&field('value','Valor numérico declarado',true,'number')}
     {field('detectionLimit','Límite de detección (LDM)',false,'number')}
     {field('quantificationLimit','Límite de cuantificación (LCM)',false,'number')}
     {field('uncertainty','Incertidumbre absoluta opcional',false,'number')}
     {field('collectedAt','Fecha y hora de toma',true,'datetime-local')}
     {field('analyzedAt','Fecha y hora de análisis opcional',false,'datetime-local')}
     {field('method','Método analítico',true)}
     {field('sourceId','Identificador del informe o fuente',true)}
     {field('operator','Responsable declarante',true)}
    </div>
    <p className="am-note">Un resultado inferior a LDM o LCM es censurado, no cero. Los valores son
     declarados y no verificados; el nombre del laboratorio o del responsable tampoco acredita identidad.</p>
    <button type="submit">Registrar medición declarada</button>
   </form>
   <button type="button" onClick={()=>downloadJson('ambienta-v38-mediciones.json',exportMeasurementBook(book,data))}>
    Exportar registro e historial JSON</button>
   <div className="am-list">
    {book.entries.length===0&&<p data-measurement-empty="true">Sin mediciones registradas.</p>}
    {book.entries.slice(-40).reverse().map(entry=>{
     const status=measurementStatus(entry,book,data);
     return <article key={entry.id} data-measurement-id={entry.id} data-measurement-status={status}>
      <div><strong>{entry.id} · {entry.sampleId}</strong><small>{entry.stationId} · {entry.matrix}</small></div>
      <div><strong>{entry.parameter}</strong>
       <small>{entry.qualifier==='quantified'?String(entry.value):qualifierLabels[entry.qualifier]} {entry.unit}</small>
       <small>{statusLabels[status]}</small></div>
      <div><small>{entry.collectedAt}</small><small>{entry.sourceId}</small></div>
      {status!=='voided'&&<button type="button" onClick={()=>setVoidId(entry.id)}>Anular con motivo</button>}
     </article>;
    })}
   </div>
   {book.entries.length>40&&<small>Se muestran las últimas 40 mediciones; el JSON contiene todas.</small>}
   {voidId&&<div className="am-void" data-measurement-void="true">
    <h4>Anular {voidId} conservando el registro</h4>
    <label>Motivo de anulación<input aria-label="Motivo de anulación" value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <label>Responsable de anulación<input aria-label="Responsable de anulación" value={actor} onChange={e=>setActor(e.target.value)}/></label>
    <button type="button" onClick={annul}>Confirmar anulación</button>
    <button type="button" onClick={()=>setVoidId('')}>Cancelar</button>
   </div>}
  </>}
  {error&&<p role="alert" className="am-error">{error}</p>}
  {notice&&<p role="status" className="am-notice">{notice}</p>}
  <small>Laboratorio exclusivamente local, sin autenticación ni cadena de custodia. No cargues información sensible.
   No se compara con límites legales ni se emiten certificaciones ambientales.</small>
 </section>;
}
