import {useEffect,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import type {DemoState} from '../../lib/demo';
// @ts-ignore: pure read-only selector validated by native Node regression
import {resolveConesaPgaLink,uniquePgaMeasures} from './conesa-pga-link.mjs';
import {ArrowDownToLine,Link2,RotateCcw} from 'lucide-react';
import {CONESA_FIELDS,type ConesaEntry} from './ConesaSimplificadoModel';
import {blankRecord,fingerprint,isResidualDocument,RESIDUAL_METHOD_ID,reviewResidual,
 type ResidualDocument,type ResidualRecord,type Measure} from './ConesaResidualModel';
import './ConesaResidualPanel.css';

type Axis={id:string;name:string;phase?:string};
type Props={projectId:string;initialEntries:Record<string,ConesaEntry>;
 actions:Axis[];factors:Axis[];pgaData:DemoState};
const PREFIX='ambienta-conesa-residual-v1:';
const create=(projectId:string):ResidualDocument=>({
 schema:'ambienta.conesa-residual.v1',method:RESIDUAL_METHOD_ID,
 projectId,updatedAt:new Date().toISOString(),entries:{}
});
function read(projectId:string):ResidualDocument{
 try{
  const data=localStorage.getItem(PREFIX+projectId);
  if(data){const parsed:unknown=JSON.parse(data);
   if(isResidualDocument(parsed,projectId))return parsed;}
 }catch{/* Keep volatile document on read/storage failures. */}
 return create(projectId);
}
const safeCsv=(v:string|number|null):string=>{
 const raw=String(v??'');
 const safe=typeof v==='number'?raw:/^\s*[=+\-@\t\r]/.test(raw)?"'"+raw:raw;
 return '"'+safe.replaceAll('"','""')+'"';
};
function download(name:string,type:string,body:string){
 const url=URL.createObjectURL(new Blob([body],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;
 document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
const hierarchyOptions=[
 ['', 'Seleccionar jerarquía'],['evitar','Evitar'],['minimizar','Minimizar'],
 ['restaurar','Restaurar'],['compensar','Compensar (último recurso)']
] as const;
export function ConesaResidualPanel({projectId,initialEntries,actions,factors,pgaData}:Props){
 const [doc,setDoc]=useState<ResidualDocument>(()=>read(projectId));
 const edited=useRef(false);
 const [selected,setSelected]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  if(!edited.current)return;
  try{localStorage.setItem(PREFIX+projectId,JSON.stringify(doc));}
  catch{setNotice('No se pudo guardar el escenario residual. Exportá JSON para conservarlo.');}
 },[projectId,doc]);
 const patch=(id:string,changes:Partial<ResidualRecord>)=>{
  edited.current=true;
  setDoc(old=>{
   const previous=old.entries[id]||blankRecord(initialEntries[id]);
   return {...old,updatedAt:new Date().toISOString(),
    entries:{...old.entries,[id]:{...previous,...changes}}};
  });
 };
 const patchMeasure=(id:string,changes:Partial<Measure>)=>{
  edited.current=true;
  setDoc(old=>{
   const previous=old.entries[id]||blankRecord(initialEntries[id]);
   return {...old,updatedAt:new Date().toISOString(),
    entries:{...old.entries,[id]:{...previous,measure:{...previous.measure,...changes}}}};
  });
 };
 const remove=(id:string)=>{
  edited.current=true;
  setDoc(old=>{const entries={...old.entries};delete entries[id];
   return {...old,entries,updatedAt:new Date().toISOString()};});
 };
 const availablePga=useMemo(()=>uniquePgaMeasures(pgaData,projectId) as Array<{
  id:string;title:string;owner:string;status:string}>,[pgaData,projectId]);
 const rows=useMemo(()=>{
  const ids=new Set([...Object.keys(initialEntries),...Object.keys(doc.entries)]);
  return [...ids].map(id=>{
   const sep=id.indexOf('::');
   const fid=sep<0?id:id.slice(0,sep),aid=sep<0?'':id.slice(sep+2);
   const factor=factors.find(f=>f.id===fid),action=actions.find(a=>a.id===aid);
   const initial=initialEntries[id],record=doc.entries[id];
   const review=reviewResidual(initial,record);
   const pgaId=record?.measure.pgaMeasureId||'';
   const pgaLink=resolveConesaPgaLink(pgaData,projectId,pgaId);
   const linkBlocked=Boolean(pgaId)&&(pgaLink.status!=='vinculado'||pgaLink.warnings.length>0);
   const reviewStatus=linkBlocked&&record?'revisar':review.status;
   return {id,factor:factor?.name||fid,action:action?.name||aid,
    phase:action?.phase||'Sin etapa',detached:!factor||!action,
    initial,record,review,pgaLink,reviewStatus};
  }).filter(r=>r.review.initial||r.record);
 },[initialEntries,doc,actions,factors,pgaData,projectId]);
 const selectedRow=rows.find(x=>x.id===selected);
 const record=selectedRow?.record;
 const validCount=rows.filter(r=>r.reviewStatus==='completo'&&!r.detached).length;
 const reviewCount=rows.filter(r=>r.record&&
  (r.reviewStatus!=='completo'||r.detached)).length;
 const stageRows=useMemo(()=>{
  const groups=new Map<string,{total:number;complete:number}>();
  for(const row of rows){
   const g=groups.get(row.phase)||{total:0,complete:0};
   g.total++;if(row.reviewStatus==='completo'&&!row.detached)g.complete++;
   groups.set(row.phase,g);
  }
  return [...groups];
 },[rows]);
 const exportCsv=()=>{
  const header=['Proyecto','Método','ID interacción','Etapa','Factor','Acción',
   'I inicial abs','I inicial signo','Categoría inicial','Resultado residual',
   'I residual abs','I residual signo','Categoría residual','Delta abs',
   'Estado','Estado catálogo','Jerarquía','Medida','Referencia de medida','PGA referencia manual',
   'Responsable','Indicador','Frecuencia','Incertidumbre declarada',
   'Calidad de evidencia declarada','Implementación declarada','Supuestos',
   'PGA medida ID','Estado vínculo PGA','PGA programa','PGA estado documental',
   'PGA inspecciones','PGA evidencias','Advertencias PGA',
   'Fundamento residual','Evidencia residual','Incidencias'];
  const values:(string|number|null)[][]=[header];
  for(const row of rows){
   const {record:r,review:v}=row,m=r?.measure;
   values.push([projectId,RESIDUAL_METHOD_ID,row.id,row.phase,row.factor,row.action,
    v.initial?.absolute??null,v.initial?.signed??null,v.initial?.category??'Pendiente',
    v.avoided?'Evitado (sin valor 0)':'Impacto persistente',
    v.residual?.absolute??null,v.residual?.signed??null,v.residual?.category??'Pendiente',
    v.delta,row.reviewStatus,row.detached?'Desvinculado':'Vinculado',
    m?.hierarchy||'',m?.description||'',m?.reference||'',m?.pgaRef||'',
    m?.responsible||'',m?.indicator||'',m?.frequency||'',
    m?.uncertainty||'',m?.quality||'',m?.execution||'',m?.assumptions||'',
    m?.pgaMeasureId||'',row.pgaLink.status,row.pgaLink.program?.name||'',
    row.pgaLink.measure?.status||'',row.pgaLink.trace?.counts.inspections??null,
    row.pgaLink.trace?.counts.evidence??null,row.pgaLink.warnings.join(' | '),
    r?.residual.reason||'',r?.residual.evidence||'',
    [...v.problems,...row.pgaLink.warnings].join(' | ')]);
  }
  return '\uFEFF'+values.map(r=>r.map(safeCsv).join(';')).join('\r\n');
 };
 return <section className="amb-residual" data-conesa-residual={RESIDUAL_METHOD_ID}>
  <header className="amb-residual-head">
   <div><p className="amb-matrix-overline">SEGUNDA VALORACIÓN · ESCENARIO RESIDUAL</p>
    <h4>Impacto inicial frente a impacto residual</h4>
    <p>La valoración inicial permanece en Conesa. La residual requiere introducir
     nuevamente cada criterio, justificar la medida y documentar la incertidumbre.
     No se aplican descuentos porcentuales ni se supone eficacia automáticamente.</p>
   </div>
   <div className="amb-matrix-exports">
    <button type="button" onClick={()=>download('AMBIENTA-Conesa-residual-'+projectId+'.csv',
      'text/csv;charset=utf-8',exportCsv())}><ArrowDownToLine size={16}/> CSV</button>
    <button type="button" onClick={()=>download('AMBIENTA-Conesa-residual-'+projectId+'.json',
      'application/json',JSON.stringify({...doc,sourceMethod:'conesa-simplificado-tutorial-v1'},null,2))}>
     <ArrowDownToLine size={16}/> JSON</button>
   </div>
  </header>
  <p className="amb-residual-advice">
   <strong>Importante:</strong> este escenario puede ser proyectado, no medido. La ejecución,
   la calidad de evidencia y la incertidumbre son declaraciones del evaluador, no verificaciones
   automáticas. Los vínculos PGA son de solo lectura por ID y nunca validan
   automáticamente la eficacia de la medida ni su correspondencia ambiental.
   Un impacto completamente evitado se registra como <em>Evitado</em>, nunca como I = 0.
  </p>
  <div className="amb-residual-stats">
   <span><strong>{validCount}</strong><small>escenarios completos vinculados</small></span>
   <span><strong>{reviewCount}</strong><small>escenarios por revisar</small></span>
   <span><strong>{rows.length}</strong><small>interacciones con valoración inicial</small></span>
  </div>
  {stageRows.length>0&&<div className="amb-residual-stages" aria-label="Avance por etapa">
   {stageRows.map(([phase,g])=><span key={phase}><strong>{phase}</strong>
    <small>{g.complete} de {g.total} escenarios completos</small></span>)}
  </div>}
  <div className="amb-residual-overflow" role="region" tabIndex={0}
   aria-label="Comparación de escenarios iniciales y residuales">
   <table>
    <thead><tr><th>Interacción</th><th>Etapa</th><th>Inicial</th>
     <th>Residual</th><th>Δ importancia abs.</th><th>PGA</th><th>Estado</th><th>Acción</th></tr></thead>
    <tbody>{rows.length?rows.map(r=><tr key={r.id}
     data-residual-row={r.id} data-residual-detached={r.detached?'true':undefined}>
      <th>{r.factor}<small>{r.action}</small></th><td>{r.phase}</td>
      <td data-residual-initial>{r.review.initial?.signed??'—'}</td>
      <td data-residual-score>{r.review.avoided?'Evitado':r.review.residual?.signed??'Pendiente'}</td>
      <td data-residual-delta>{r.review.delta===null?'No comparable':
       (r.review.delta>0?'+':'')+r.review.delta}</td>
      <td data-residual-pga>{r.record?.measure.pgaMeasureId
       ?r.pgaLink.status==='vinculado'?'Vinculado · '+r.record.measure.pgaMeasureId:'Revisar vínculo'
       :'Sin vínculo'}</td>
      <td data-residual-state>{r.detached?'Desvinculado':
       r.reviewStatus==='completo'?'Completo':r.reviewStatus==='sin-valoracion'?'Sin residual':'Revisar'}</td>
      <td><button type="button" disabled={r.detached||!r.review.initial}
       onClick={()=>setSelected(r.id)}>Revisar</button></td>
     </tr>):<tr><td colSpan={8}>
      Primero completá una valoración inicial en la matriz Conesa superior.
      Aquí no se generan resultados de ejemplo para el expediente.</td></tr>}</tbody>
   </table>
  </div>
  {selectedRow&&selected&&<div className="amb-residual-editor" data-residual-editor>
   <div className="amb-residual-editor-heading">
    <div><small>INTERACCIÓN EN REVISIÓN</small><h5>{selectedRow.factor}</h5>
     <p>{selectedRow.action} · {selectedRow.phase}</p>
     <p>Inicial: {selectedRow.review.initial?.signed} · {selectedRow.review.initial?.category}</p>
    </div>
    <button type="button" onClick={()=>setSelected(null)}>Cerrar</button>
   </div>
   <div className="amb-residual-fields">
    <label>Resultado tras la medida
     <select aria-label="Persistencia del impacto" value={record?.outcome||'persiste'}
      onChange={e=>patch(selected,{outcome:e.target.value as ResidualRecord['outcome']})}>
      <option value="persiste">Permanece: valorar impacto residual</option>
      <option value="evitado">Se prevé evitar completamente (sin puntuar 0)</option>
     </select>
    </label>
    <label>Jerarquía de mitigación
     <select aria-label="Jerarquía de mitigación" value={record?.measure.hierarchy||''}
      onChange={e=>patchMeasure(selected,{hierarchy:e.target.value as Measure['hierarchy']})}>
      {hierarchyOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}
     </select>
    </label>
    <label>Situación de implementación declarada
     <select aria-label="Situación de implementación" value={record?.measure.execution||'prevista'}
      onChange={e=>patchMeasure(selected,{execution:e.target.value as Measure['execution']})}>
      <option value="prevista">Prevista / hipótesis</option>
      <option value="implementada">Implementada (declarada)</option>
      <option value="verificada">Verificada (declarada, requiere evidencia)</option>
     </select>
    </label>
   </div>
   {(record?.outcome||'persiste')==='persiste'&&<>
    <div className="amb-residual-fields">
     <label>Naturaleza residual
      <select aria-label="Naturaleza residual" value={record?.residual.sign??''}
       onChange={e=>patch(selected,{residual:{...(record?.residual||blankRecord(selectedRow.initial).residual),
        sign:e.target.value?Number(e.target.value) as -1|1:null}})}>
       <option value="">Pendiente</option><option value="-1">Negativa (−)</option>
       <option value="1">Positiva (+)</option>
      </select>
     </label>
     {CONESA_FIELDS.map(field=><label key={field.id}>{field.label} ({field.id})
      <select aria-label={'Residual '+field.id} value={record?.residual.criteria[field.id]??''}
       onChange={e=>{
        const criteria={...(record?.residual.criteria||{})};
        if(e.target.value==='')delete criteria[field.id];else criteria[field.id]=Number(e.target.value);
        patch(selected,{residual:{...(record?.residual||blankRecord(selectedRow.initial).residual),criteria}});
       }}>
       <option value="">Pendiente</option>
       {field.options.map(([value,label])=><option key={value} value={value}>{value} · {label}</option>)}
      </select>
     </label>)}
    </div>
    <label>Justificación de los criterios residuales
     <textarea rows={2} maxLength={5000} value={record?.residual.reason||''}
      onChange={e=>patch(selected,{residual:{...(record?.residual||blankRecord(selectedRow.initial).residual),
       reason:e.target.value}})}/></label>
    <label>Evidencia de la valoración residual
     <input maxLength={1000} value={record?.residual.evidence||''}
      onChange={e=>patch(selected,{residual:{...(record?.residual||blankRecord(selectedRow.initial).residual),
       evidence:e.target.value}})}/></label>
   </>}
   <div className="amb-residual-pga-link" data-pga-link-editor>
    <label>Vincular medida existente del PGA (solo lectura)
     <select aria-label="Medida PGA vinculada" value={record?.measure.pgaMeasureId||''}
      onChange={e=>patchMeasure(selected,{pgaMeasureId:e.target.value})}>
      <option value="">Sin vínculo con medida registrada</option>
      {availablePga.map(m=><option key={m.id} value={m.id}>{m.id} · {m.title}</option>)}
      {record?.measure.pgaMeasureId&&!availablePga.some(m=>m.id===record.measure.pgaMeasureId)&&
       <option value={record.measure.pgaMeasureId}>ID no disponible: {record.measure.pgaMeasureId}</option>}
     </select>
    </label>
    {selectedRow.pgaLink.status==='vinculado'&&selectedRow.pgaLink.measure&&
     <div data-pga-linked-detail>
      <strong>{selectedRow.pgaLink.measure.id} · {selectedRow.pgaLink.measure.title}</strong>
      <p>Programa: {selectedRow.pgaLink.program?.name||'No resuelto'}
       {' · '}Responsable PGA: {selectedRow.pgaLink.measure.owner}
       {' · '}Estado documental: {selectedRow.pgaLink.measure.status}</p>
      <p>Inspecciones vinculadas: {selectedRow.pgaLink.trace?.counts.inspections??0}
       {' · '}Evidencias relacionadas: {selectedRow.pgaLink.trace?.counts.evidence??0}</p>
      <Link to={'/pga?medida='+encodeURIComponent(selectedRow.pgaLink.measure.id)}>
       Abrir ficha y trazabilidad en PGA
      </Link>
      <p>La coincidencia de ID no demuestra que esta medida reduzca el impacto evaluado.
       Los datos proceden del expediente local y son de demostración.</p>
     </div>}
    {selectedRow.pgaLink.warnings.length>0&&
     <p className="amb-residual-errors" role="status" data-pga-link-warning>
      {selectedRow.pgaLink.warnings.join(' · ')}
     </p>}
   </div>
   <div className="amb-residual-fields">
    <label>Descripción de la medida
     <textarea rows={2} maxLength={5000} value={record?.measure.description||''}
      onChange={e=>patchMeasure(selected,{description:e.target.value})}/></label>
    <label>Referencia de la medida / fuente
     <input maxLength={1000} value={record?.measure.reference||''}
      onChange={e=>patchMeasure(selected,{reference:e.target.value})}/></label>
    <label><Link2 size={14}/> Referencia PGA (manual, no sincronizada)
     <input maxLength={300} value={record?.measure.pgaRef||''}
      onChange={e=>patchMeasure(selected,{pgaRef:e.target.value})}/></label>
    <label>Responsable
     <input maxLength={300} value={record?.measure.responsible||''}
      onChange={e=>patchMeasure(selected,{responsible:e.target.value})}/></label>
    <label>Indicador de seguimiento
     <input maxLength={500} value={record?.measure.indicator||''}
      onChange={e=>patchMeasure(selected,{indicator:e.target.value})}/></label>
    <label>Frecuencia de seguimiento
     <input maxLength={300} value={record?.measure.frequency||''}
      onChange={e=>patchMeasure(selected,{frequency:e.target.value})}/></label>
    <label>Incertidumbre declarada
     <select aria-label="Incertidumbre residual" value={record?.measure.uncertainty||''}
      onChange={e=>patchMeasure(selected,{uncertainty:e.target.value as Measure['uncertainty']})}>
      <option value="">Sin evaluar</option><option value="alta">Alta</option>
      <option value="media">Media</option><option value="baja">Baja</option>
     </select>
    </label>
    <label>Calidad de evidencia declarada
     <select aria-label="Calidad de evidencia" value={record?.measure.quality||''}
      onChange={e=>patchMeasure(selected,{quality:e.target.value as Measure['quality']})}>
      <option value="">Sin evaluar</option><option value="declarada">Declarativa</option>
      <option value="documental">Documental</option><option value="campo">Medición / campo</option>
     </select>
    </label>
   </div>
   <label>Supuestos, limitaciones y datos faltantes
    <textarea rows={2} maxLength={3000} value={record?.measure.assumptions||''}
     onChange={e=>patchMeasure(selected,{assumptions:e.target.value})}/></label>
   <div className="amb-residual-result">
    <span>Inicial<strong>{selectedRow.review.initial?.absolute??'—'}</strong></span>
    <span>Residual<strong data-residual-editor-score>{selectedRow.review.avoided?'Evitado':
     selectedRow.review.residual?.absolute??'Pendiente'}</strong></span>
    <span>Δ absoluta<strong>{selectedRow.review.delta??'No comparable'}</strong></span>
    <span>Estado<strong data-residual-editor-state>{selectedRow.reviewStatus}</strong></span>
   </div>
   {record&&selectedRow.review.problems.length>0&&<p className="amb-residual-errors" role="status">
    {selectedRow.review.problems.join(' · ')}</p>}
   {record&&record.initialFingerprint!==fingerprint(selectedRow.initial)&&
    <button type="button" className="amb-residual-secondary" onClick={()=>
     patch(selected,{initialFingerprint:fingerprint(selectedRow.initial)})}>
     <RotateCcw size={14}/> Ratificar vínculo tras revisar el impacto inicial
    </button>}
   {record&&<button type="button" className="amb-residual-secondary"
    onClick={()=>{remove(selected);setSelected(null);}}>Eliminar solo escenario residual</button>}
  </div>}
  <footer className="amb-residual-footer">
   Las diferencias son aritméticas entre puntuaciones ordinales del mismo método:
   no son porcentajes de mitigación ni resultados medidos. Evitado no se equipara a cero.
   El vínculo PGA se resuelve únicamente por ID en el expediente activo, sin modificar
   registros originales. «Completo» expresa integridad de campos, no aprobación técnica.
  </footer>
  {notice&&<p role="status">{notice}</p>}
 </section>;
}
