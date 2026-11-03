import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDownToLine,X} from 'lucide-react';
import {ImpactMatrixBuilder,readMatrixAxes} from './ImpactMatrixBuilder';
import type {DemoState} from '../../lib/demo';
import {ConesaSimplificado} from './ConesaSimplificado';
import {assess,METHOD_DEFINITIONS,validAssessment,type Assessment,type ScoredMethodId} from './MatrixMethodData';
import './MatrixMethodHub.css';

type ExistingImpact={id:string;factor:string;name:string};
type Props={projectId:string;projectName:string;registeredImpacts:ExistingImpact[];pgaData:DemoState};
type MethodDocument={schema:'ambienta.scored-matrix.v1';projectId:string;projectName:string;
 method:ScoredMethodId;updatedAt:string;entries:Record<string,Assessment>};
const PREFIX='ambienta-scored-matrix-v1:';
const keyFor=(project:string,method:ScoredMethodId)=>PREFIX+project+':'+method;
const empty=(projectId:string,projectName:string,method:ScoredMethodId):MethodDocument=>({
 schema:'ambienta.scored-matrix.v1',projectId,projectName,method,
 updatedAt:new Date().toISOString(),entries:{}
});
function validDocument(value:unknown,project:string,method:ScoredMethodId):value is MethodDocument{
 if(!value||typeof value!=='object')return false;
 const v=value as Partial<MethodDocument>;
 return v.schema==='ambienta.scored-matrix.v1'&&v.projectId===project&&v.method===method&&
  typeof v.projectName==='string'&&v.projectName.length<500&&typeof v.updatedAt==='string'&&
  !!v.entries&&typeof v.entries==='object'&&!Array.isArray(v.entries)&&
  Object.entries(v.entries).length<=12000&&Object.entries(v.entries)
   .every(([k,entry])=>k.length<=220&&validAssessment(method,entry));
}
function read(projectId:string,projectName:string,method:ScoredMethodId):MethodDocument{
 try{
  const raw=localStorage.getItem(keyFor(projectId,method));
  if(raw){const parsed:unknown=JSON.parse(raw);if(validDocument(parsed,projectId,method))return parsed;}
 }catch{/* Non-persistent browser: work in volatile memory */}
 return empty(projectId,projectName,method);
}
function download(name:string,type:string,body:string){
 const url=URL.createObjectURL(new Blob([body],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);
 a.click();a.remove();URL.revokeObjectURL(url);
}
function csvField(input:unknown){
 const original=String(input??'');
 const safe=/^\s*[=+\-@\t\r]/.test(original)?"'"+original:original;
 return '"'+safe.replaceAll('"','""')+'"';
}
function ScoredMatrix({projectId,projectName,method,readOnly=false}:{
 projectId:string;projectName:string;method:ScoredMethodId;readOnly?:boolean
}){
 const definition=METHOD_DEFINITIONS[method];
 const [refresh,setRefresh]=useState(0);
 const axes=useMemo(()=>readMatrixAxes(projectId,projectName),[projectId,projectName,refresh]);
 const [doc,setDoc]=useState<MethodDocument>(()=>read(projectId,projectName,method));
 const modified=useRef(false);
 const [selected,setSelected]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  if(!modified.current)return;
  try{localStorage.setItem(keyFor(projectId,method),JSON.stringify(doc));}
  catch{setNotice('Guardado local no disponible. Exportá el JSON para conservar tu evaluación.');}
 },[doc,projectId,method]);
 const edit=(id:string,patch:Partial<Assessment>)=>{
  if(readOnly)return;
  modified.current=true;
  setDoc(current=>{
   const previous=current.entries[id]||{sign:null,criteria:{},reason:'',evidence:''};
   return {...current,updatedAt:new Date().toISOString(),
    entries:{...current.entries,[id]:{...previous,...patch}}};
  });
 };
 const remove=(id:string)=>{
  if(readOnly)return;
  modified.current=true;
  setDoc(cur=>{const entries={...cur.entries};delete entries[id];return {...cur,updatedAt:new Date().toISOString(),entries};});
 };
 const chosen=useMemo(()=>{
  if(!selected)return null;
  const i=selected.indexOf('::');if(i<0)return null;
  const factor=axes.factors.find(f=>f.id===selected.slice(0,i));
  const action=axes.actions.find(a=>a.id===selected.slice(i+2));
  return factor&&action?{factor,action,entry:doc.entries[selected]}:null;
 },[selected,axes,doc]);
 const complete=Object.values(doc.entries).filter(x=>assess(method,x)!==null).length;
 const incomplete=Object.values(doc.entries).filter(x=>assess(method,x)===null).length;
 const exportCsv=()=>{
  const rows=[
   ['Proyecto','Método y versión','Acción','Etapa','Factor','Signo',
    ...definition.fields.map(c=>c.id), 'Resultado calculado','Fundamento','Evidencia']
  ];
  for(const f of axes.factors)for(const a of axes.actions){
   const entry=doc.entries[f.id+'::'+a.id];if(!entry)continue;
   rows.push([projectName,definition.version,a.name,a.phase,f.name,
     method==='conesa-1997-2ex'?String(entry.sign??''):String(entry.criteria.A2??''),
     ...definition.fields.map(c=>String(entry.criteria[c.id]??'')),
     String(assess(method,entry)??''),entry.reason,entry.evidence]);
  }
  download('AMBIENTA-'+method+'-'+projectId+'.csv','text/csv;charset=utf-8',
    '\uFEFF'+rows.map(r=>r.map(csvField).join(';')).join('\r\n'));
 };
 return <section className="amb-matrix amb-method-assessment"
   data-method-assessment={method} aria-label={'Evaluación mediante '+definition.shortName}>
   <div className="amb-method-eval-head">
    <div><p className="amb-matrix-overline">{readOnly?'ARCHIVO ANTERIOR · SOLO LECTURA':'MATRIZ DE VALORACIÓN · BORRADOR LOCAL'}</p>
     <h3>{definition.shortName}</h3><p>{definition.version}</p>
     <code>{definition.formula}</code>
     {readOnly&&<p role="note">Evaluación original de la edición anterior. Solo consulta y exportación; no se combina con el Conesa simplificado vigente.</p>}
    </div>
    <div className="amb-matrix-exports">
     <button type="button" onClick={exportCsv}><ArrowDownToLine size={16}/> CSV</button>
     <button type="button" onClick={()=>download('AMBIENTA-'+method+'-'+projectId+'.json','application/json',
      JSON.stringify({...doc,methodSpecification:definition.version},null,2))}><ArrowDownToLine size={16}/> JSON</button>
    </div>
   </div>
   <p className="amb-method-disclaimer">
    Se evalúa cada interacción por separado, con los parámetros propios del método.
    Ninguna celda recibe criterios por defecto. Los resultados son valoraciones técnicas
    preliminares, no una aprobación ambiental ni una clasificación legal automática.
    <a href={definition.sourceUrl} target="_blank" rel="noreferrer"> Consultar fuente metodológica</a>.
   </p>
   <div className="amb-method-stats">
    <div><strong>{axes.actions.length} × {axes.factors.length}</strong><small>acciones × factores</small></div>
    <div><strong>{complete}</strong><small>valoraciones completas</small></div>
    <div><strong>{incomplete}</strong><small>valoraciones incompletas</small></div>
   </div>
   <div className="amb-method-tools">
    <span>Acciones y factores vinculados al catálogo común, sin copiar puntuaciones de Leopold.</span>
    <button type="button" onClick={()=>{setRefresh(x=>x+1);setSelected(null);}}>Actualizar catálogo compartido</button>
   </div>
   <div className="amb-matrix-scroll" role="region" tabIndex={0}
     aria-label={'Matriz '+definition.shortName+' con desplazamiento horizontal'}>
    <table className="amb-matrix-grid">
     <thead><tr><th className="amb-matrix-sticky">Factor ambiental</th>
      {axes.actions.map(a=><th key={a.id} scope="col"><small>{a.phase}</small><span>{a.name}</span></th>)}
     </tr></thead>
     <tbody>{axes.factors.map(f=><tr key={f.id}>
      <th scope="row" className="amb-matrix-sticky"><strong>{f.name}</strong><small>{f.group}</small></th>
      {axes.actions.map(a=>{
       const id=f.id+'::'+a.id,entry=doc.entries[id],score=assess(method,entry);
       const tone=score===null?'empty':score>0?'positive':score<0?'negative':'none';
       return <td key={id}><button type="button" data-method-cell={id}
        className={'amb-matrix-cell amb-matrix-cell--'+tone+(selected===id?' is-selected':'')}
        aria-label={'Evaluar '+f.name+' × '+a.name+' en '+definition.shortName}
        aria-pressed={selected===id} onClick={()=>setSelected(id)}>
        {score===null?(entry?'Pend.':'—'):score>0?'+'+score:String(score)}
       </button></td>;
      })}
     </tr>)}</tbody>
    </table>
   </div>
   <div className="amb-method-inspector" data-method-editor>
    {!chosen||!selected?<div className="amb-matrix-placeholder">
     <h4>Elegí una interacción</h4>
     <p>Seleccioná la combinación de una acción con un factor para completar
       los criterios específicos de {definition.shortName}.</p>
     <p>Una celda sin valorar no equivale a «sin impacto».</p>
    </div>:<div>
     <header className="amb-method-selected">
      <div><small>INTERACCIÓN SELECCIONADA</small><h4>{chosen.factor.name}</h4>
       <p>{chosen.action.name}</p>
      </div>
      <button type="button" aria-label="Cerrar ficha del método" onClick={()=>setSelected(null)}><X size={18}/></button>
     </header>
     {method==='conesa-1997-2ex'&&<label>Carácter / naturaleza
      <select aria-label="Signo Conesa" disabled={readOnly} value={chosen.entry?.sign===-1?'-1':chosen.entry?.sign===1?'1':''}
       onChange={e=>edit(selected,{sign:e.target.value?Number(e.target.value) as -1|1:null})}>
       <option value="">Sin valorar</option><option value="-1">Perjudicial (−)</option>
       <option value="1">Beneficioso (+)</option>
      </select>
     </label>}
     <div className="amb-method-criteria">
      {definition.fields.map(field=><label key={field.id}>{field.name} ({field.id})
       <select disabled={readOnly} aria-label={field.id+' - '+field.name} value={chosen.entry?.criteria[field.id]??''}
        onChange={e=>{
         const criteria={...(chosen.entry?.criteria||{})};
         if(e.target.value==='')delete criteria[field.id];
         else criteria[field.id]=Number(e.target.value);
         edit(selected,{criteria});
        }}>
        <option value="">Sin valorar</option>
        {field.options.map(o=><option key={o.value} value={o.value}>{o.value} · {o.label}</option>)}
       </select>
      </label>)}
     </div>
     <div className="amb-method-score">
      <span>Resultado por {definition.shortName}</span>
      <strong data-method-result>{assess(method,chosen.entry)??'Pendiente'}</strong>
      <small>{assess(method,chosen.entry)===null?
       'Solo se calcula cuando todos los criterios están completos.':
       'Cálculo reproducible; no sustituye el juicio ni la revisión profesional.'}</small>
     </div>
     <label>Fundamento técnico y supuestos
      <textarea disabled={readOnly} maxLength={5000} rows={3} value={chosen.entry?.reason||''}
       onChange={e=>edit(selected,{reason:e.target.value})}
       placeholder="Describir por qué se asignó cada criterio y qué incertidumbre persiste…"/>
     </label>
     <label>Documento o evidencia
      <input disabled={readOnly} maxLength={1000} value={chosen.entry?.evidence||''}
       onChange={e=>edit(selected,{evidence:e.target.value})}
       placeholder="Código de informe, página, enlace o referencia verificable"/>
     </label>
     {chosen.entry&&!chosen.entry.reason.trim()&&<p className="amb-matrix-caution-inline">
      Valoración provisional: falta documentar la justificación.</p>}
     {chosen.entry&&!readOnly&&<button type="button" className="amb-matrix-secondary"
       onClick={()=>remove(selected)}>Eliminar valoración de esta interacción</button>}
    </div>}
   </div>
   <footer className="amb-matrix-footer">
    <span>Guardado por expediente y método · {projectId} · {doc.updatedAt.slice(0,10)}</span>
    <span>Catálogo de acciones y factores compartido; las puntuaciones permanecen separadas entre metodologías.</span>
   </footer>
   {notice&&<p role="status" className="amb-matrix-notice">{notice}</p>}
  </section>;
}
type ActiveMethod='causa-leopold'|'conesa-simplificado-tutorial-v1'|'riam-1998';
type Card={id:ActiveMethod|'battelle';name:string;kind:string;detail:string;status:string;source:string;available:boolean};
const CARDS:Card[]=[
 {id:'causa-leopold',name:'Identificación y Leopold',kind:'Identificación / valoración',
  detail:'Cruce de acciones y factores, naturaleza del impacto y magnitud/importancia independientes (1–10). Incluye una ponderación experimental separada.',
  status:'Disponible',source:'Leopold et al. · USGS (1971)',available:true},
 {id:'conesa-simplificado-tutorial-v1',name:'Conesa simplificado',kind:'Importancia ambiental · versión principal',
  detail:'Importancia absoluta y con signo, valoración inicial y residual, clasificación 25/50/75, recargos críticos explícitos y tabla de revisión. RV=3 fuera de escala.',
  status:'Disponible · con revisión documental',source:'Conesa Fernández-Vítora · variante didáctica contrastada',available:true},
 {id:'riam-1998',name:'RIAM',kind:'Comparación de alternativas',
  detail:'Cinco atributos A1, A2, B1, B2 y B3, con valoración estructurada y resultado ES.',
  status:'Disponible · fórmula identificada',source:'Pastakia y Jensen (1998)',available:true},
 {id:'battelle',name:'Battelle-Columbus',kind:'Indicadores de calidad ambiental',
  detail:'Requiere indicadores medidos, funciones de transformación, pesos y escenarios con/sin proyecto. No es válido calcularlo con valores DEMO.',
  status:'Preparación metodológica',source:'Dee et al. (1973)',available:false}
];
type ArchiveStatus={present:boolean;valid:boolean;count:number};
function oldConesaArchive(projectId:string):ArchiveStatus{
 try{
  const raw=localStorage.getItem(keyFor(projectId,'conesa-1997-2ex'));
  if(raw===null)return {present:false,valid:false,count:0};
  const parsed:unknown=JSON.parse(raw);
  if(!validDocument(parsed,projectId,'conesa-1997-2ex'))
   return {present:true,valid:false,count:0};
  return {present:true,valid:true,count:Object.keys(parsed.entries).length};
 }catch{return {present:true,valid:false,count:0};}
}
export function MatrixMethodHub({projectId,projectName,registeredImpacts,pgaData}:Props){
 const [active,setActive]=useState<ActiveMethod>('causa-leopold');
 const [legacyOpen,setLegacyOpen]=useState(false);
 const archive=useMemo(()=>active==='conesa-simplificado-tutorial-v1'
  ?oldConesaArchive(projectId):{present:false,valid:false,count:0},[projectId,active]);
 return <div className="amb-method-hub" data-matrix-method-catalog="v1">
  <section className="amb-method-catalog" aria-label="Catálogo de métodos ambientales">
   <div className="amb-method-heading">
    <p className="amb-matrix-overline">HERRAMIENTAS · MATRICES AMBIENTALES</p>
    <h3>Elegí la metodología de evaluación</h3>
    <p>Los métodos no son intercambiables: cada uno tiene criterios, escala, cálculo y fuentes propios. Cambiar de método no convierte ni traslada puntuaciones de otros.</p>
   </div>
   <div className="amb-method-cardgrid">{CARDS.map(card=><div key={card.id}
     className={'amb-method-card'+(active===card.id?' is-active':'')+(card.available?'':' is-planned')}
     data-catalog-method={card.id}>
    <div><small>{card.kind}</small><strong>{card.name}</strong>
     <p>{card.detail}</p><span className="amb-method-source">{card.source}</span></div>
    <div className="amb-method-cardbottom">
     <span>{card.status}</span>
     {card.available?<button type="button" aria-pressed={active===card.id}
      onClick={()=>setActive(card.id as ActiveMethod)}>
      {active===card.id?'Método seleccionado':'Abrir método'}</button>
      :<span className="amb-method-prerequisite">Requiere datos de base</span>}
    </div>
   </div>)}</div>
  </section>
  <section className="amb-method-purpose" aria-label="Finalidades y etapas de las matrices">
   <h4>Otros tipos de matrices: etapas y finalidades, no necesariamente otros métodos</h4>
   <p><strong>Valoración absoluta / relativa:</strong> etapas y ponderaciones que deben documentar su método base.
    <strong> Impactos residuales:</strong> valoración posterior a medidas de mitigación.
    <strong> Efectos acumulativos:</strong> análisis específico de interacciones y escenarios.
    <strong> Seguimiento del PGA:</strong> seguimiento de compromisos, indicadores y verificaciones, no una puntuación de impacto.</p>
  </section>
  {active==='causa-leopold'
   ?<ImpactMatrixBuilder projectId={projectId} projectName={projectName} registeredImpacts={registeredImpacts}/>
   :active==='conesa-simplificado-tutorial-v1'
     ?<>
      <ConesaSimplificado key={projectId+':'+active} projectId={projectId} projectName={projectName} pgaData={pgaData}/>
      {archive.present&&<section className="amb-conesa-archive" data-conesa-legacy-archive
        aria-label="Archivo de valoraciones Conesa anteriores">
       <div><small>ARCHIVO HISTÓRICO · NO ES OTRO MÉTODO PARA ELEGIR</small>
        <h4>Valoraciones guardadas con la edición anterior</h4>
        <p>{archive.valid
         ?'Hay '+archive.count+' valoración(es) anteriores en este navegador. Se conservan sin convertir ni mezclar sus puntuaciones.'
         :'El borrador de la edición anterior no supera la validación del formato. Se conserva intacto; descargá un respaldo para revisar su contenido.'}</p>
       </div>
       {archive.valid
        ?<button type="button" aria-expanded={legacyOpen}
          onClick={()=>setLegacyOpen(open=>!open)}>
          {legacyOpen?'Ocultar archivo anterior':'Consultar y exportar valoraciones anteriores'}
         </button>
        :<button type="button" onClick={()=>{
          try{
           const raw=localStorage.getItem(keyFor(projectId,'conesa-1997-2ex'));
           if(raw!==null)download('AMBIENTA-Conesa-anterior-respaldo-'+projectId+'.txt','text/plain;charset=utf-8',raw);
          }catch{/* Keep source unchanged on storage failures. */}
         }}>Descargar respaldo anterior sin modificar</button>}
       {archive.valid&&legacyOpen&&
        <ScoredMatrix key={projectId+':legacy-readonly'} projectId={projectId}
         projectName={projectName} method="conesa-1997-2ex" readOnly/>}
      </section>}
     </>
     :<ScoredMatrix key={projectId+':'+active} projectId={projectId} projectName={projectName} method={active}/>}
 </div>;
}
