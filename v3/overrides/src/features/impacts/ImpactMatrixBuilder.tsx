import {useEffect,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowDownToLine,Check,ChevronDown,Pencil,Plus,RotateCcw,UploadCloud,X} from 'lucide-react';
import './ImpactMatrixBuilder.css';
import {LeopoldSummaryPanel} from './LeopoldSummaryPanel';
import {LeopoldReviewPanel} from './LeopoldReviewPanel';

type Sign = -1|0|1;
type Phase = 'preparacion'|'construccion'|'operacion'|'cierre';
type Mode = 'identificacion'|'leopold'|'ponderada';
type Action = {id:string;name:string;phase:Phase};
type Factor = {id:string;name:string;group:string;weight:number};
type AxisDraft = {kind:'action';id:string;name:string;phase:Phase}|
 {kind:'factor';id:string;name:string;group:string;weight:number};
type Cell = {sign:Sign;magnitude:number|null;importance:number|null;reason:string;evidence:string};
type Matrix = {schema:'ambienta.impact-matrix.v1';projectId:string;projectName:string;updatedAt:string;actions:Action[];factors:Factor[];cells:Record<string,Cell>};
type ExistingImpact={id:string;factor:string;name:string};
type Props={projectId:string;projectName:string;registeredImpacts:ExistingImpact[]};

const STORE='ambienta-impact-matrix-v1:';
const PHASES:Record<Phase,string>={
 preparacion:'Preparación',construccion:'Construcción',
 operacion:'Operación',cierre:'Cierre'
};
const uid=(prefix:string)=>prefix+'-'+Math.random().toString(36).slice(2,10);
const cellKey=(factor:string,action:string)=>factor+'::'+action;
const initial=(projectId:string,projectName:string):Matrix=>({
 schema:'ambienta.impact-matrix.v1',projectId,projectName,updatedAt:new Date().toISOString(),
 // A small, generic working catalog, NOT a factual representation of this project.
 actions:[
  {id:'demo-a1',name:'Movimiento de suelos · ejemplo',phase:'construccion'},
  {id:'demo-a2',name:'Tránsito de maquinaria · ejemplo',phase:'construccion'},
  {id:'demo-a3',name:'Uso de agua · ejemplo',phase:'operacion'},
  {id:'demo-a4',name:'Revegetación · ejemplo',phase:'cierre'}
 ],
 factors:[
  {id:'demo-f1',name:'Calidad del aire',group:'Medio físico',weight:1},
  {id:'demo-f2',name:'Agua superficial',group:'Medio físico',weight:1},
  {id:'demo-f3',name:'Calidad del suelo',group:'Medio físico',weight:1},
  {id:'demo-f4',name:'Vegetación',group:'Medio biótico',weight:1},
  {id:'demo-f5',name:'Fauna',group:'Medio biótico',weight:1},
  {id:'demo-f6',name:'Paisaje',group:'Perceptual',weight:1},
  {id:'demo-f7',name:'Empleo local',group:'Socioeconómico',weight:1}
 ],
 cells:{}
});
function validMatrix(value:unknown,projectId:string):value is Matrix{
 if(!value||typeof value!=='object')return false;
 const v=value as Partial<Matrix>;
 return v.schema==='ambienta.impact-matrix.v1'&&v.projectId===projectId&&
  Array.isArray(v.actions)&&Array.isArray(v.factors)&&v.actions.length<=150&&v.factors.length<=150&&
  v.actions.every(a=>a&&typeof a.id==='string'&&a.id.length<100&&typeof a.name==='string'&&a.name.length<350&&a.phase in PHASES)&&
  v.factors.every(f=>f&&typeof f.id==='string'&&f.id.length<100&&typeof f.name==='string'&&f.name.length<350&&
   typeof f.group==='string'&&f.group.length<150&&typeof f.weight==='number'&&Number.isFinite(f.weight)&&f.weight>=0.1&&f.weight<=5)&&
  !!v.cells&&typeof v.cells==='object'&&!Array.isArray(v.cells)&&Object.keys(v.cells).length<=12000&&
  Object.values(v.cells).every(c=>c&&[-1,0,1].includes(c.sign)&&
   (c.magnitude===null||(Number.isInteger(c.magnitude)&&c.magnitude>=1&&c.magnitude<=10))&&
   (c.importance===null||(Number.isInteger(c.importance)&&c.importance>=1&&c.importance<=10))&&
   typeof c.reason==='string'&&c.reason.length<=5000&&typeof c.evidence==='string'&&c.evidence.length<=1000);
}
function readMatrix(projectId:string,projectName:string):Matrix{
 try{const item=localStorage.getItem(STORE+projectId);
   if(item){const parsed:unknown=JSON.parse(item);if(validMatrix(parsed,projectId))return parsed;}
 }catch{ /* blocked storage falls back to a volatile blank matrix */ }
 return initial(projectId,projectName);
}
/** Read-only catalog shared by distinct scoring engines. Preserves V1 draft keys. */
export function readMatrixAxes(projectId:string,projectName:string):{
 actions:Action[];factors:Factor[]
}{
 const doc=readMatrix(projectId,projectName);
 return {actions:doc.actions,factors:doc.factors};
}
function download(filename:string,mime:string,content:string){
 const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 URL.revokeObjectURL(url);
}
const csvCell=(x:string|number|null|undefined)=>{
 const text=String(x??'');
 // Defend against spreadsheet formula injection in user supplied labels and notes.
 const safe=/^[\s]*[=+\-@\t\r]/.test(text)?"'"+text:text;
 return '"'+safe.replaceAll('"','""')+'"';
};
function matrixCsv(doc:Matrix){
 const rows:[string,...(string|number|null|undefined)[]][]=[
  ['Proyecto','Acción','Etapa','Factor','Grupo','Tipo','Magnitud (1-10)','Importancia (1-10)','Peso UIP (editable)','Índice ponderado exploratorio','Fundamento','Fuente o evidencia']
 ];
 for(const factor of doc.factors)for(const action of doc.actions){
  const c=doc.cells[cellKey(factor.id,action.id)];
  if(!c)continue;
  const score=c.sign!==0&&c.magnitude&&c.importance?c.sign*c.magnitude*c.importance*factor.weight:null;
  rows.push([doc.projectName,action.name,PHASES[action.phase],factor.name,factor.group,
   c.sign===-1?'Adverso':c.sign===1?'Beneficioso':'Sin interacción',c.magnitude,c.importance,
   factor.weight,score,c.reason,c.evidence]);
 }
 return '\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
}
function btnScore(sign:Sign|null,c?:Cell){if(!c)return '—';if(sign===0)return '∅';
 const label=sign===1?'+':'−';
 return c.magnitude!==null&&c.importance!==null?label+c.magnitude+'/'+c.importance:label+' identificado';
}
function cellTone(c:Cell|undefined){return !c?'empty':c.sign===0?'none':c.sign>0?'positive':'negative';}

export function ImpactMatrixBuilder({projectId,projectName,registeredImpacts}:Props){
 const [doc,setDoc]=useState<Matrix>(()=>readMatrix(projectId,projectName));
 const modified=useRef(false);
 const [mode,setMode]=useState<Mode>('identificacion');
 const [selected,setSelected]=useState<string|null>(null);
 const [actionName,setActionName]=useState('');
 const [factorName,setFactorName]=useState('');
 const [newActionPhase,setNewActionPhase]=useState<Phase>('construccion');
 const [newFactorGroup,setNewFactorGroup]=useState('Sin clasificar');
 const [axisDraft,setAxisDraft]=useState<AxisDraft|null>(null);
 const [notice,setNotice]=useState('');
 const [onlyEvaluated,setOnlyEvaluated]=useState(false);
 const [diagonal,setDiagonal]=useState(false);
 useEffect(()=>{modified.current=false;setDoc(readMatrix(projectId,projectName));setSelected(null);setAxisDraft(null);},[projectId,projectName]);
 useEffect(()=>{
  // Opening the read-only Impactos page must never create a draft or mutate local DEMO storage.
  if(!modified.current)return;
  try{localStorage.setItem(STORE+projectId,JSON.stringify(doc));}
  catch{setNotice('No se pudo guardar automáticamente. Exportá el JSON para conservar tu trabajo.');}
 },[projectId,doc]);
 const update=(fn:(current:Matrix)=>Matrix)=>{modified.current=true;setDoc(prev=>({...fn(prev),updatedAt:new Date().toISOString()}));};
 const chosen=useMemo(()=>{
  if(!selected)return null;
  const [fid,aid]=selected.split('::');
  const factor=doc.factors.find(f=>f.id===fid),action=doc.actions.find(a=>a.id===aid);
  return factor&&action?{factor,action,cell:doc.cells[selected]}:null;
 },[doc,selected]);
 const setCell=(key:string,patch:Partial<Cell>)=>update(current=>{
  const previous=current.cells[key]||{sign:-1 as Sign,magnitude:null,importance:null,reason:'',evidence:''};
  return {...current,cells:{...current.cells,[key]:{...previous,...patch}}};
 });
 const clearCell=()=>{if(!selected)return;update(current=>{
  const cells={...current.cells};delete cells[selected];return {...current,cells};
 });};
 const populated=Object.values(doc.cells);
 const scored=populated.filter(c=>c.sign!==0&&c.magnitude!==null&&c.importance!==null).length;
 const pending=populated.filter(c=>c.sign!==0&&(c.magnitude===null||c.importance===null)).length;
 const negative=populated.filter(c=>c.sign===-1).length;
 const adverseScore=doc.factors.reduce((sum,factor)=>sum+doc.actions.reduce((v,action)=>{
  const c=doc.cells[cellKey(factor.id,action.id)];
  return v+(c?.sign===-1&&c.magnitude&&c.importance?c.magnitude*c.importance*factor.weight:0);
 },0),0);
 const filteredFactors=onlyEvaluated?doc.factors.filter(f=>doc.actions.some(a=>!!doc.cells[cellKey(f.id,a.id)])):doc.factors;
 const exportJson=()=>download('AMBIENTA-matriz-'+projectId+'.json','application/json',JSON.stringify(doc,null,2));
 const addAction=()=>{if(!actionName.trim())return;const label=actionName.trim().slice(0,250);
  if(doc.actions.length>=150)return setNotice('Límite de 150 acciones por matriz.');
  update(cur=>({...cur,actions:[...cur.actions,{id:uid('a'),name:label,phase:newActionPhase}]}));setActionName('');
 };
 const addFactor=()=>{if(!factorName.trim())return;const label=factorName.trim().slice(0,250);
  if(doc.factors.length>=150)return setNotice('Límite de 150 factores por matriz.');
  update(cur=>({...cur,factors:[...cur.factors,{id:uid('f'),name:label,group:newFactorGroup.trim().slice(0,140)||'Sin clasificar',weight:1}]}));setFactorName('');setOnlyEvaluated(false);
 };
 const importFactors=()=>{
  const known=new Set(doc.factors.map(f=>f.name.trim().toLocaleLowerCase('es')));
  const add:Factor[]=[];
  for(const impact of registeredImpacts){
   const name=String(impact.factor||'').trim().slice(0,250);
   if(name&&!known.has(name.toLocaleLowerCase('es'))){known.add(name.toLocaleLowerCase('es'));
    add.push({id:uid('f'),name,group:'Importado del expediente',weight:1});}
  }
  if(!add.length)return setNotice('Los factores del expediente ya están presentes o no hay factores vinculados.');
  if(doc.factors.length+add.length>150)return setNotice('Demasiados factores para importar.');
  update(cur=>({...cur,factors:[...cur.factors,...add]}));setOnlyEvaluated(false);
  setNotice('Se incorporaron '+add.length+' factores nominales del expediente, sin asignar impactos ni puntuaciones.');
 };
 const onImport=async(file:File|undefined)=>{
  if(!file)return;
  if(file.size>1500000)return setNotice('El JSON excede el máximo de 1,5 MB.');
  try{const payload:unknown=JSON.parse(await file.text());
   if(!validMatrix(payload,projectId))return setNotice('Formato no válido, o corresponde a otro expediente. No se importó.');
   if(!window.confirm('¿Reemplazar la matriz local de este expediente por la del archivo?'))return;
   modified.current=true;setDoc(payload);setSelected(null);setNotice('Matriz JSON importada y verificada.');
  }catch{setNotice('No fue posible leer el archivo JSON.');}
 };
 const deleteAction=(id:string)=>{if(!window.confirm('¿Eliminar esta acción y sus interacciones?'))return;setAxisDraft(null);update(cur=>({
  ...cur,actions:cur.actions.filter(a=>a.id!==id),
  cells:Object.fromEntries(Object.entries(cur.cells).filter(([key])=>!key.endsWith('::'+id)))
 }));setSelected(null);};
 const deleteFactor=(id:string)=>{if(!window.confirm('¿Eliminar este factor y sus interacciones?'))return;setAxisDraft(null);update(cur=>({
  ...cur,factors:cur.factors.filter(f=>f.id!==id),
  cells:Object.fromEntries(Object.entries(cur.cells).filter(([key])=>!key.startsWith(id+'::')))
 }));setSelected(null);};
 const saveAxis=()=>{
  if(!axisDraft)return;
  const name=axisDraft.name.trim();
  if(!name){setNotice('Escribí un nombre antes de guardar la fila o columna.');return;}
  if(axisDraft.kind==='action'){
   update(cur=>({...cur,actions:cur.actions.map(a=>a.id===axisDraft.id?{
    ...a,name:name.slice(0,250),phase:axisDraft.phase}:a)}));
  }else{
   const group=axisDraft.group.trim();
   if(!group){setNotice('Indicá el grupo ambiental del factor.');return;}
   if(!Number.isFinite(axisDraft.weight)||axisDraft.weight<0.1||axisDraft.weight>5){
    setNotice('El peso exploratorio debe estar entre 0,1 y 5.');return;
   }
   update(cur=>({...cur,factors:cur.factors.map(f=>f.id===axisDraft.id?{
    ...f,name:name.slice(0,250),group:group.slice(0,140),weight:axisDraft.weight}:f)}));
  }
  setNotice('Cambios del catálogo guardados. Se conservan las interacciones y valoraciones vinculadas.');
  setAxisDraft(null);
 };
 return <section className="amb-matrix" data-impact-matrix="v1" aria-label="Constructor de matrices ambientales">
  <header className="amb-matrix-top">
   <div><p className="amb-matrix-overline">LABORATORIO DE EVALUACIÓN · BORRADOR LOCAL</p>
    <h3>Constructor de matrices de impacto</h3>
    <p>Acciones del proyecto × componentes ambientales. Las celdas permanecen sin evaluar hasta que alguien registra el criterio técnico.</p>
   </div>
   <div className="amb-matrix-exports">
    <button type="button" onClick={()=>download('AMBIENTA-matriz-'+projectId+'.csv','text/csv;charset=utf-8',matrixCsv(doc))}><ArrowDownToLine size={17}/> CSV</button>
    <button type="button" onClick={exportJson}><ArrowDownToLine size={17}/> JSON</button>
    <label className="amb-matrix-file"><UploadCloud size={17}/> Importar JSON
     <input type="file" accept=".json,application/json" onChange={e=>{void onImport(e.target.files?.[0]);e.currentTarget.value='';}}/>
    </label>
   </div>
  </header>
  <div className="amb-matrix-caution" role="note">
   <strong>No es una declaración de impacto ambiental.</strong> Catálogo inicial reducido e ilustrativo, no el inventario completo de 100 acciones y 88 factores de la matriz clásica; sin coordenadas, línea de base o mediciones verificadas. Los criterios deben fundamentarse en evidencia y revisión profesional. Se guarda solo en este navegador, por expediente.
  </div>
  <div className="amb-matrix-kpis">
   <span><strong>{doc.actions.length} × {doc.factors.length}</strong><small>acciones × factores</small></span>
   <span><strong>{populated.filter(c=>c.sign!==0).length}</strong><small>interacciones identificadas</small></span>
   <span><strong>{scored}</strong><small>valoradas por completo</small></span>
   <span><strong>{pending}</strong><small>pendientes de valoración</small></span>
   <span><strong>{negative}</strong><small>adversas declaradas</small></span>
  </div>
  <div className="amb-matrix-tools">
   <div className="amb-matrix-modes" aria-label="Método de visualización">
    <button type="button" aria-pressed={mode==='identificacion'} onClick={()=>setMode('identificacion')}>Identificación</button>
    <button type="button" aria-pressed={mode==='leopold'} onClick={()=>setMode('leopold')}>Leopold</button>
    <button type="button" aria-pressed={mode==='ponderada'} onClick={()=>setMode('ponderada')}>Ponderación exploratoria</button>
   </div>
   <label className="amb-matrix-filter"><input type="checkbox" checked={onlyEvaluated} onChange={e=>setOnlyEvaluated(e.target.checked)}/> Solo factores con interacciones</label>
    {mode==='leopold'&&<label className="amb-matrix-filter"><input type="checkbox" data-leopold-diagonal-toggle checked={diagonal} onChange={e=>setDiagonal(e.target.checked)}/> Mostrar diagonal clásica M/I</label>}
  </div>
  <div className="amb-matrix-legend">
   {mode==='identificacion'
    ? 'Identificación: + impacto beneficioso; − impacto adverso; ∅ sin interacción declarada; — no evaluado.'
    : mode==='leopold'
      ? 'Leopold según la matriz clásica: signo y magnitud (1–10) arriba; importancia (1–10) abajo. El producto M×I es una adaptación didáctica, no un índice oficial de aprobación.'
      : 'Vista exploratoria: signo × magnitud × importancia × peso editable. NO es la importancia de Conesa ni una clasificación legal.'}
  </div>
  <div className="amb-matrix-construction" data-matrix-inline-builder aria-label="Construcción directa de filas y columnas">
   <div className="amb-matrix-construction-head">
    <strong>Construí la matriz desde la tabla</strong>
    <p>Agregá columnas y filas aquí. Usá el lápiz en cada encabezado para cambiar nombres, etapas, grupos y pesos.
     Seleccioná una celda para registrar la interacción en el panel contiguo.</p>
   </div>
   <div className="amb-matrix-add-controls">
    <div className="amb-matrix-entry">
     <input aria-label="Nombre de nueva acción" value={actionName}
      onChange={e=>setActionName(e.target.value)} maxLength={250} placeholder="Nueva acción del proyecto"
      onKeyDown={e=>{if(e.key==='Enter')addAction();}}/>
     <select aria-label="Etapa de nueva acción" value={newActionPhase}
      onChange={e=>setNewActionPhase(e.target.value as Phase)}>
      {Object.entries(PHASES).map(([id,label])=><option key={id} value={id}>{label}</option>)}
     </select>
     <button type="button" onClick={addAction} disabled={!actionName.trim()}><Plus size={17}/> Acción</button>
    </div>
    <div className="amb-matrix-entry">
     <input aria-label="Nombre de nuevo factor" value={factorName}
      onChange={e=>setFactorName(e.target.value)} maxLength={250} placeholder="Nuevo factor ambiental"
      onKeyDown={e=>{if(e.key==='Enter')addFactor();}}/>
     <input aria-label="Grupo de nuevo factor" value={newFactorGroup}
      onChange={e=>setNewFactorGroup(e.target.value)} maxLength={140} placeholder="Grupo ambiental"/>
     <button type="button" onClick={addFactor} disabled={!factorName.trim()}><Plus size={17}/> Factor</button>
    </div>
   </div>
  </div>
  <div className="amb-matrix-canvas" data-matrix-canvas>
  <div className="amb-matrix-scroll" role="region" tabIndex={0} aria-label="Matriz editable, desplazamiento horizontal disponible">
   <table className="amb-matrix-grid">
    <thead><tr><th className="amb-matrix-sticky">Componente ambiental</th>
     {doc.actions.map(action=><th key={action.id} scope="col" className={axisDraft?.kind==='action'&&axisDraft.id===action.id?'amb-matrix-axis-editing':''}>
      {axisDraft?.kind==='action'&&axisDraft.id===action.id?
       <div className="amb-matrix-axis-editor" data-matrix-edit-action={action.id}>
        <input autoFocus aria-label="Editar nombre de acción en matriz" maxLength={250}
         value={axisDraft.name} onChange={e=>setAxisDraft({...axisDraft,name:e.target.value})}
         onKeyDown={e=>{if(e.key==='Enter')saveAxis();if(e.key==='Escape')setAxisDraft(null);}}/>
        <select aria-label="Editar etapa de acción en matriz" value={axisDraft.phase}
         onChange={e=>setAxisDraft({...axisDraft,phase:e.target.value as Phase})}>
         {Object.entries(PHASES).map(([id,label])=><option key={id} value={id}>{label}</option>)}
        </select>
        <div className="amb-matrix-axis-actions">
         <button type="button" onClick={saveAxis} aria-label="Guardar cambios de acción"><Check size={15}/></button>
         <button type="button" onClick={()=>setAxisDraft(null)} aria-label="Cancelar edición de acción"><X size={15}/></button>
        </div>
       </div>:
       <>
        <small>{PHASES[action.phase]}</small><span>{action.name}</span>
        <div className="amb-matrix-axis-actions">
         <button type="button" aria-label={'Editar columna '+action.name}
          onClick={()=>setAxisDraft({kind:'action',id:action.id,name:action.name,phase:action.phase})}>
          <Pencil size={14}/></button>
         <button type="button" aria-label={'Eliminar columna '+action.name}
          onClick={()=>deleteAction(action.id)}><X size={14}/></button>
        </div>
       </>}
     </th>)}
    </tr></thead>
    <tbody>{filteredFactors.map(factor=><tr key={factor.id}>
     <th className="amb-matrix-sticky" scope="row">
      {axisDraft?.kind==='factor'&&axisDraft.id===factor.id?
       <div className="amb-matrix-axis-editor" data-matrix-edit-factor={factor.id}>
        <input autoFocus aria-label="Editar nombre de factor en matriz" maxLength={250}
         value={axisDraft.name} onChange={e=>setAxisDraft({...axisDraft,name:e.target.value})}
         onKeyDown={e=>{if(e.key==='Enter')saveAxis();if(e.key==='Escape')setAxisDraft(null);}}/>
        <input aria-label="Editar grupo ambiental en matriz" maxLength={140} value={axisDraft.group}
         onChange={e=>setAxisDraft({...axisDraft,group:e.target.value})}/>
        <label>Peso exploratorio
         <input type="number" aria-label="Editar peso de factor en matriz" min="0.1" max="5" step="0.25"
          value={axisDraft.weight} onChange={e=>setAxisDraft({...axisDraft,weight:Number(e.target.value)})}/>
        </label>
        <div className="amb-matrix-axis-actions">
         <button type="button" onClick={saveAxis} aria-label="Guardar cambios de factor"><Check size={15}/></button>
         <button type="button" onClick={()=>setAxisDraft(null)} aria-label="Cancelar edición de factor"><X size={15}/></button>
        </div>
       </div>:
       <>
        <strong>{factor.name}</strong><small>{factor.group}</small>
        <div className="amb-matrix-axis-actions">
         <button type="button" aria-label={'Editar fila '+factor.name}
          onClick={()=>setAxisDraft({kind:'factor',id:factor.id,name:factor.name,group:factor.group,weight:factor.weight})}>
          <Pencil size={14}/></button>
         <button type="button" aria-label={'Eliminar fila '+factor.name}
          onClick={()=>deleteFactor(factor.id)}><X size={14}/></button>
        </div>
       </>}
     </th>
     {doc.actions.map(action=>{
       const key=cellKey(factor.id,action.id),cell=doc.cells[key];
       const score=cell&&cell.magnitude!==null&&cell.importance!==null&&cell.sign!==0
        ?Math.round(cell.sign*cell.magnitude*cell.importance*factor.weight*100)/100:null;
       const title=action.name+' × '+factor.name;
       const value=mode==='identificacion'?(cell?(cell.sign===0?'∅':cell.sign>0?'+':'−'):'—')
        :mode==='ponderada'?(score===null?(cell?'Pend.':'—'):String(score))
        :btnScore(cell?.sign??null,cell);
       const diag=mode==='leopold'&&diagonal&&!!cell&&cell.sign!==0&&cell.magnitude!==null&&cell.importance!==null;
       return <td key={key}><button type="button" className={'amb-matrix-cell amb-matrix-cell--'+cellTone(cell)+(selected===key?' is-selected':'')+(diag?' amb-matrix-cell--diagonal':'')}
        onClick={()=>setSelected(key)} aria-label={'Evaluar '+title+'. '+(cell?'Interacción registrada':'Sin evaluar')}
        aria-pressed={selected===key} title={title}>
        {diag&&cell?<span className="amb-leopold-diagonal" aria-hidden="true"><span>{cell.sign===-1?'−':'+'}{cell.magnitude}</span><span>{cell.importance}</span></span>:value}
       </button></td>;
     })}
    </tr>)}</tbody>
   </table>
  </div>
   <div className="amb-matrix-inspector" data-matrix-inspector>
    {chosen&&selected?<div>
     <div className="amb-matrix-inspector-head"><div><small>INTERACCIÓN SELECCIONADA</small><h4>{chosen.factor.name}</h4>
      <p>{chosen.action.name} · {PHASES[chosen.action.phase]}</p></div>
      <button type="button" title="Cerrar editor" aria-label="Cerrar editor de celda" onClick={()=>setSelected(null)}><X size={20}/></button>
     </div>
     <div className="amb-matrix-fast-sign" aria-label="Marcar interacción desde la matriz">
      <span>Marcación rápida</span>
      {([[-1,'− Adverso'],[1,'+ Beneficioso'],[0,'∅ Sin interacción']] as [Sign,string][]).map(([sign,label])=>
       <button type="button" key={sign} aria-pressed={chosen.cell?.sign===sign}
        onClick={()=>setCell(selected,{sign,...(sign===0?{magnitude:null,importance:null}:{})})}>{label}</button>)}
      <button type="button" aria-pressed={!chosen.cell} onClick={clearCell}>— No evaluado</button>
     </div>
     <label>Relación causa–efecto
      <select aria-label="Naturaleza de la interacción" value={chosen.cell?.sign===0?'0':chosen.cell?.sign===1?'1':chosen.cell?.sign===-1?'-1':'unassessed'}
       onChange={e=>{if(e.target.value==='unassessed')return clearCell();const n=Number(e.target.value) as Sign;
        setCell(selected,{sign:n,...(n===0?{magnitude:null,importance:null}:{})});}}>
       <option value="unassessed">No evaluado</option>
       <option value="-1">Adverso (−)</option>
       <option value="1">Beneficioso (+)</option>
       <option value="0">Sin interacción (∅)</option>
      </select>
     </label>
     {chosen.cell&&chosen.cell.sign!==0&&<>
      <div className="amb-matrix-two">
       <label>Magnitud (1–10)
        <select aria-label="Magnitud del impacto" value={chosen.cell.magnitude??''}
         onChange={e=>setCell(selected,{magnitude:e.target.value?Number(e.target.value):null})}>
         <option value="">Sin estimar</option>{Array.from({length:10},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}
        </select>
       </label>
       <label>Importancia (1–10)
        <select aria-label="Importancia del impacto" value={chosen.cell.importance??''}
         onChange={e=>setCell(selected,{importance:e.target.value?Number(e.target.value):null})}>
         <option value="">Sin estimar</option>{Array.from({length:10},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}
        </select>
       </label>
      </div>
      <p className="amb-matrix-guidance">Según Conesa (1997), apdo. 6.2.1.1, pp. 60–61: magnitud (1–10) describe la dimensión de la alteración, con signo; importancia (1–10) expresa la incidencia o trascendencia contextual (por ejemplo, local o regional). Son dos juicios diferentes, sin puntuaciones automáticas.</p>
     </>}
     {chosen.cell&&<>
      <label>Fundamento técnico y supuestos
       <textarea maxLength={5000} rows={3} placeholder="Describir relación causal, escenario, temporalidad e incertidumbre…" value={chosen.cell.reason} onChange={e=>setCell(selected,{reason:e.target.value})}/>
      </label>
      <label>Referencia documental o evidencia
       <input maxLength={1000} placeholder="Código, página, enlace o informe verificable…" value={chosen.cell.evidence} onChange={e=>setCell(selected,{evidence:e.target.value})}/>
      </label>
      {!chosen.cell.reason.trim()&&<p className="amb-matrix-caution-inline">Valoración provisional: falta explicar el fundamento técnico.</p>}
      <button type="button" className="amb-matrix-secondary" onClick={clearCell}>Eliminar valoración de esta celda</button>
     </>}
    </div>:<div className="amb-matrix-placeholder"><h4>Seleccioná una celda</h4>
     <p>Indicá si existe interacción y su signo. Después, de forma opcional, cargá magnitud, importancia y referencia documental.</p>
     <p>Las celdas sin evaluar no cuentan como ausencia de impacto.</p></div>}
   </div>
  </div>
  {mode==='leopold'&&<>
    <LeopoldSummaryPanel projectId={projectId} actions={doc.actions} factors={doc.factors} visibleFactors={filteredFactors} cells={doc.cells}/>
    <LeopoldReviewPanel actions={doc.actions} factors={doc.factors} cells={doc.cells}
     onReviewCell={key=>{
      setSelected(key);
      document.querySelector('[data-matrix-inspector]')?.scrollIntoView({behavior:'smooth',block:'center'});
     }}/>
   </>}
  <div className="amb-matrix-bottom">
   <div className="amb-matrix-side">
    <h4>Herramientas avanzadas</h4>
    <p>El catálogo se construye en la tabla de arriba. Aquí podés importar factores, revisar pesos y administrar el borrador.</p>

    <button type="button" className="amb-matrix-secondary" onClick={importFactors}>Incorporar factores existentes del expediente</button>
    <details className="amb-matrix-catalog"><summary>Editar catálogo y pesos <ChevronDown size={14}/></summary>
     <h5>Acciones</h5>{doc.actions.map(a=><div key={a.id} className="amb-matrix-editrow">
      <input aria-label={'Renombrar acción '+a.name} value={a.name} maxLength={250} onChange={e=>update(cur=>({...cur,actions:cur.actions.map(x=>x.id===a.id?{...x,name:e.target.value}:x)}))}/>
      <select aria-label={'Etapa de '+a.name} value={a.phase} onChange={e=>update(cur=>({...cur,actions:cur.actions.map(x=>x.id===a.id?{...x,phase:e.target.value as Phase}:x)}))}>
       {Object.entries(PHASES).map(([key,value])=><option key={key} value={key}>{value}</option>)}
      </select><button type="button" aria-label={'Quitar '+a.name} onClick={()=>deleteAction(a.id)}><X size={16}/></button>
     </div>)}
     <h5>Factores y ponderaciones</h5>{doc.factors.map(f=><div key={f.id} className="amb-matrix-editrow">
      <input aria-label={'Renombrar factor '+f.name} value={f.name} maxLength={250} onChange={e=>update(cur=>({...cur,factors:cur.factors.map(x=>x.id===f.id?{...x,name:e.target.value}:x)}))}/>
      <input type="number" min="0.1" max="5" step="0.25" aria-label={'Peso de '+f.name} value={f.weight} onChange={e=>{
       const n=Number(e.target.value);if(n>=0.1&&n<=5)update(cur=>({...cur,factors:cur.factors.map(x=>x.id===f.id?{...x,weight:n}:x)}));
      }}/>
      <button type="button" aria-label={'Quitar '+f.name} onClick={()=>deleteFactor(f.id)}><X size={16}/></button>
     </div>)}
    </details>
    {mode==='ponderada'&&<p className="amb-matrix-index">Suma de magnitudes adversas ponderadas: <strong>{adverseScore.toFixed(2)}</strong> · índice exploratorio sin umbral legal</p>}
    <button type="button" className="amb-matrix-reset" onClick={()=>{
      if(window.confirm('¿Reemplazar por catálogo de ejemplo vacío de valoraciones? Se perderán los cambios locales no exportados.')){
       modified.current=true;setDoc(initial(projectId,projectName));setSelected(null);setNotice('Matriz reiniciada.');}
    }}><RotateCcw size={15}/> Reiniciar borrador</button>
   </div>

  </div>
  {notice&&<p className="amb-matrix-notice" role="status">{notice} <button type="button" onClick={()=>setNotice('')}>Cerrar</button></p>}
  <footer className="amb-matrix-footer">
   <span>Guardado local · {new Date(doc.updatedAt).toLocaleString('es-AR')} · {projectId}</span>
   <span>Metodología: <a href="https://www.usgs.gov/publications/a-procedure-evaluating-environmental-impact" target="_blank" rel="noreferrer">Leopold (USGS, 1971)</a> · Vista ponderada: adaptación exploratoria, no normativa.</span>
   <span>Las medidas del <Link to="/pga">PGA</Link> deben asociarse y verificarse por separado. Esta herramienta no certifica cumplimiento.</span>
  </footer>
 </section>;
}
