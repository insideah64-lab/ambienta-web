import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { DemoState } from '../../lib/demo';
import type { Transaction } from '../../lib/transactions';
import {
  createMeasure, createInspection, registerEvidence, decideEvidence,
  setMeasureStatus, createFinding, createCorrective
} from '../../lib/transactions';

export type DemoActionKind = 'measure'|'inspection'|'evidence'|'review'|'status'|'finding'|'corrective';
type Props = {
  kind: DemoActionKind;
  state: DemoState;
  initialMeasureId?: string;
  onClose:()=>void;
  onApply:(transaction:Transaction,success:string)=>void;
};
const NAMES:Record<DemoActionKind,string>={
  measure:'Nueva medida ambiental',
  inspection:'Registrar inspección',
  evidence:'Registrar referencia de evidencia',
  review:'Revisar evidencia',
  status:'Actualizar estado de medida',
  finding:'Registrar hallazgo',
  corrective:'Nueva acción correctiva'
};
const DESCRIPTIONS:Record<DemoActionKind,string>={
  measure:'Crea una medida vinculada a un programa y un impacto existente.',
  inspection:'Registra un control de campo asociado a una medida del PGA.',
  evidence:'Solo metadatos y referencia documental. Esta demo no almacena archivos.',
  review:'Revisión por un responsable distinto del autor de la evidencia.',
  status:'Verificada exige inspección conforme y evidencia validada.',
  finding:'Los hallazgos deben estar vinculados a una inspección existente.',
  corrective:'Asigna responsable y vencimiento a un hallazgo existente.'
};
function Field({name,label,children}: {name:string;label:string;children:ReactNode}) {
  return <label className="v2-form-field" data-field={name}><span>{label}</span>{children}</label>;
}
function TextField({name,label,required=true,type='text',placeholder='',maxLength=280,defaultValue=''}:{
  name:string;label:string;required?:boolean;type?:string;placeholder?:string;maxLength?:number;defaultValue?:string
}) {
  return <Field name={name} label={label}><input name={name} type={type} required={required}
    maxLength={type==='date'?undefined:maxLength} defaultValue={defaultValue} placeholder={placeholder}/></Field>;
}
function SelectField({name,label,children,required=true,defaultValue}:{
  name:string;label:string;children:ReactNode;required?:boolean;defaultValue?:string
}) {
  return <Field name={name} label={label}><select name={name} required={required} defaultValue={defaultValue}>{children}</select></Field>;
}
function NotesField({name,label,maxLength=1200}: {name:string;label:string;maxLength?:number}) {
  return <Field name={name} label={label}><textarea name={name} rows={3} maxLength={maxLength} required/></Field>;
}
export function DemoActionDialog({kind,state,initialMeasureId,onClose,onApply}:Props) {
  const [error,setError]=useState('');
  const modal=useRef<HTMLDivElement>(null);
  const pendingEvidence=state.evidence.filter(e=>e.status==='pendiente');
  const unavailable=(kind==='review'&&!pendingEvidence.length)||
    ((kind==='finding'||kind==='corrective')&&!(kind==='finding'?state.inspections.length:state.findings.length));
  useEffect(()=>{
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const focusSelector='button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])';
    modal.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus();
    const key=(ev:KeyboardEvent)=>{
      if(ev.key==='Escape'){ev.preventDefault();onClose();return;}
      if(ev.key==='Tab'){
        const elements=Array.from(modal.current?.querySelectorAll<HTMLElement>(focusSelector)??[])
          .filter(el=>el.getClientRects().length>0);
        if(!elements.length)return;
        const first=elements[0],last=elements[elements.length-1];
        if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}
        else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',key);
    const before=document.body.style.overflow;document.body.style.overflow='hidden';
    return ()=>{
      document.removeEventListener('keydown',key);
      document.body.style.overflow=before;
      previousFocus?.focus();
    };
  },[onClose,kind]);
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setError('');
    const form=new FormData(event.currentTarget);
    const value=(key:string)=>String(form.get(key)??'').trim();
    const actor=value('actor');
    let transaction:Transaction;
    try {
      switch(kind) {
        case 'measure':
          transaction=createMeasure({
            programId:value('programId'),impactId:value('impactId'),title:value('title'),
            detail:value('detail'),owner:value('owner'),indicator:value('indicator'),
            frequency:value('frequency'),due:value('due'),criterion:value('criterion')
          },actor);break;
        case 'inspection':
          transaction=createInspection({
            measureId:value('measureId'),date:value('date'),result:value('result'),
            note:value('note'),assignee:value('assignee')
          },actor);break;
        case 'evidence':
          transaction=registerEvidence({
            measureId:value('measureId'),inspectionId:value('inspectionId'),
            label:value('label'),reference:value('reference')
          },actor);break;
        case 'review':
          transaction=decideEvidence(value('evidenceId'),value('decision') as 'validada'|'rechazada',actor);break;
        case 'status':
          transaction=setMeasureStatus(value('measureId'),value('status'),actor);break;
        case 'finding':
          transaction=createFinding({
            inspectionId:value('inspectionId'),title:value('title'),
            description:value('description'),severity:value('severity')
          },actor);break;
        case 'corrective':
          transaction=createCorrective({
            findingId:value('findingId'),action:value('action'),owner:value('owner'),due:value('due')
          },actor);break;
      }
      // Domain + localStorage are committed before parent displays a success message.
      onApply(transaction,NAMES[kind]+' registrada en la demostración local.');
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'No se pudo guardar la operación.');
    }
  }
  const selectMeasures=<SelectField name="measureId" label="Medida ambiental" defaultValue={initialMeasureId||state.measures[0]?.id}>
    {state.measures.map(m=><option key={m.id} value={m.id}>{m.id} · {m.title}</option>)}
  </SelectField>;
  return <div className="v2-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div ref={modal} className="v2-modal" role="dialog" aria-modal="true" aria-labelledby="v2-dialog-title" aria-describedby="v2-dialog-help">
      <div className="v2-modal-heading"><div><p className="v2-kicker">OPERACIÓN DE DEMOSTRACIÓN</p>
        <h2 id="v2-dialog-title">{NAMES[kind]}</h2><p id="v2-dialog-help">{DESCRIPTIONS[kind]}</p></div>
        <button type="button" onClick={onClose} aria-label="Cerrar formulario"><X size={19}/></button></div>
      {unavailable?<div className="v2-modal-help"><AlertCircle size={20}/> No hay registros disponibles para esta operación. Creá primero el registro requerido.</div>:
        <form className="v2-modal-form" onSubmit={submit}>
          {kind==='measure'&&<>
            <div className="v2-form-grid">
              <SelectField name="programId" label="Programa del PGA">{state.programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</SelectField>
              <SelectField name="impactId" label="Impacto vinculado">{state.impacts.map(i=><option key={i.id} value={i.id}>{i.factor} · {i.name}</option>)}</SelectField>
            </div>
            <TextField name="title" label="Nombre de la medida" placeholder="Ej.: Control de escorrentías"/>
            <NotesField name="detail" label="Descripción"/>
            <div className="v2-form-grid">
              <TextField name="owner" label="Responsable"/>
              <TextField name="indicator" label="Indicador de seguimiento"/>
              <TextField name="frequency" label="Frecuencia" placeholder="Ej.: Semanal" maxLength={100}/>
              <TextField name="due" label="Vencimiento" type="date"/>
            </div>
            <NotesField name="criterion" label="Criterio de verificación" maxLength={400}/>
          </>}
          {kind==='inspection'&&<>
            {selectMeasures}
            <div className="v2-form-grid">
              <TextField name="date" label="Fecha de inspección" type="date"/>
              <SelectField name="result" label="Resultado inicial">
                <option value="pendiente">Pendiente</option><option value="conforme">Conforme</option>
                <option value="observada">Observada</option><option value="no_aplica">No aplica</option>
              </SelectField>
            </div>
            <TextField name="assignee" label="Responsable de inspección"/>
            <NotesField name="note" label="Observaciones del control"/>
          </>}
          {kind==='evidence'&&<>
            <p className="v2-form-caution">Esta demo guarda una referencia textual, no el contenido del archivo ni su hash. Las evidencias privadas reales siguen en Supabase.</p>
            {selectMeasures}
            <SelectField name="inspectionId" label="Inspección relacionada (opcional)" required={false} defaultValue="">
              <option value="">Sin inspección específica</option>
              {state.inspections.map(i=><option key={i.id} value={i.id}>{i.id} · {i.date} · {i.result}</option>)}
            </SelectField>
            <TextField name="label" label="Descripción de la evidencia" maxLength={320}/>
            <TextField name="reference" label="Referencia de acta o documento" maxLength={350} placeholder="Código o ubicación documental, no contraseña"/>
          </>}
          {kind==='review'&&<>
            <SelectField name="evidenceId" label="Evidencia pendiente">{pendingEvidence.map(e=><option key={e.id} value={e.id}>{e.id} · {e.label} (autor: {e.author})</option>)}</SelectField>
            <SelectField name="decision" label="Decisión"><option value="validada">Validar</option><option value="rechazada">Rechazar</option></SelectField>
            <p className="v2-form-caution">El revisor no puede ser la misma persona que registró la evidencia. El dominio aplicará esta regla automáticamente.</p>
          </>}
          {kind==='status'&&<>
            {selectMeasures}
            <SelectField name="status" label="Nuevo estado">
              <option value="borrador">Borrador</option><option value="en_revision">En revisión</option>
              <option value="en_ejecucion">En ejecución</option><option value="verificada">Verificada</option>
            </SelectField>
            <p className="v2-form-caution">La verificación exige una inspección conforme y una evidencia validada por otra persona. No existe opción de aprobación normativa.</p>
          </>}
          {kind==='finding'&&<>
            <SelectField name="inspectionId" label="Inspección asociada">{state.inspections.map(i=><option key={i.id} value={i.id}>{i.id} · {i.date}</option>)}</SelectField>
            <div className="v2-form-grid">
              <TextField name="title" label="Hallazgo"/>
              <SelectField name="severity" label="Gravedad">
                <option value="observacion">Observación</option><option value="menor">Menor</option><option value="mayor">Mayor</option>
              </SelectField>
            </div>
            <NotesField name="description" label="Descripción del hallazgo"/>
          </>}
          {kind==='corrective'&&<>
            <SelectField name="findingId" label="Hallazgo vinculado">{state.findings.map(f=><option key={f.id} value={f.id}>{f.title}</option>)}</SelectField>
            <NotesField name="action" label="Acción correctiva"/>
            <div className="v2-form-grid">
              <TextField name="owner" label="Responsable"/>
              <TextField name="due" label="Vencimiento" type="date"/>
            </div>
          </>}
          <TextField name="actor" label={kind==='review'?'Revisor responsable':'Operador que registra la acción'}
            defaultValue={kind==='review'?'Revisor de demostración':'Operador de demostración'} maxLength={120}/>
          {error&&<p className="v2-form-error" role="alert"><AlertCircle size={17}/>{error}</p>}
          <div className="v2-modal-actions">
            <button type="button" className="v2-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="v2-primary"><CheckCircle2 size={17}/> Guardar en la demo</button>
          </div>
        </form>}
    </div>
  </div>;
}
