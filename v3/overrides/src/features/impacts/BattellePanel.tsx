import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDownToLine,UploadCloud} from 'lucide-react';
import {BATTELLE_CATEGORIES,BATTELLE_PARAMETERS,BATTELLE_SOURCE,emptyBattelle,emptyBattelleEntry,evaluateBattelle,summarizeBattelle,validBattelle,battelleCsv,type BattelleDocument,type BattelleEntry,type Category} from './BattelleModel';
import './BattellePanel.css';
const keyFor=(id:string)=>'ambienta-battelle-v1:'+id;
const labels={gap:'Datos pendientes',none:'Sin bandera',minor:'Bandera menor',major:'Bandera mayor'};
const fmt=(n:number|null)=>n===null?'—':n.toLocaleString('es-AR',{minimumFractionDigits:4,maximumFractionDigits:4});
function download(name:string,type:string,body:string){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function read(id:string,name:string){
 try{const raw=localStorage.getItem(keyFor(id));if(raw!==null){const d:unknown=JSON.parse(raw);return validBattelle(d,id)?{doc:d,invalid:false}:{doc:emptyBattelle(id,name),invalid:true};}}
 catch{return {doc:emptyBattelle(id,name),invalid:true};}
 return {doc:emptyBattelle(id,name),invalid:false};
}
export function BattellePanel({projectId,projectName}:{projectId:string;projectName:string}){
 const [initial]=useState(()=>read(projectId,projectName));
 const [doc,setDoc]=useState<BattelleDocument>(initial.doc),[invalid,setInvalid]=useState(initial.invalid);
 const [selected,setSelected]=useState('bc-01'),[category,setCategory]=useState<Category|''>('');
 const [notice,setNotice]=useState(''),[saved,setSaved]=useState(false);const modified=useRef(false);
 useEffect(()=>{if(!modified.current||invalid)return;try{localStorage.setItem(keyFor(projectId),JSON.stringify(doc));setSaved(true);}catch{setSaved(false);setNotice('No se pudo guardar. Descargá el JSON para conservar el trabajo.');}},[doc,projectId,invalid]);
 const change=(patch:Partial<BattelleDocument>)=>{if(invalid)return;modified.current=true;setSaved(false);setDoc(d=>({...d,...patch,updatedAt:new Date().toISOString()}));};
 const entry=doc.entries[selected]||emptyBattelleEntry();
 const edit=(patch:Partial<BattelleEntry>)=>change({entries:{...doc.entries,[selected]:{...entry,...patch}}});
 const summary=useMemo(()=>summarizeBattelle(doc),[doc]);
 const parameter=BATTELLE_PARAMETERS.find(p=>p.id===selected)!;
 const result=evaluateBattelle(doc,parameter);
 const visible=summary.rows.filter(r=>!category||r.parameter.category===category);
 const stringField=(field:keyof BattelleEntry,label:string,area=false)=>{
  const props={id:'bc-'+field,'aria-label':label,value:String(entry[field]??''),maxLength:5000,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>edit({[field]:e.target.value})};
  return <label key={field} htmlFor={props.id}>{label}{area?<textarea {...props} rows={3}/>:<input {...props}/>}</label>;
 };
 const nodes=result.nodes;
 const xMin=nodes[0]?.x??0,xMax=nodes.at(-1)?.x??1;
 const px=(x:number)=>45+310*(x-xMin)/(xMax-xMin||1),py=(y:number)=>160-130*y;
 return <section className="amb-matrix amb-battelle" data-battelle aria-label="Battelle-Columbus">
  <header className="amb-matrix-top"><div><p className="amb-matrix-overline">BATTELLE EES · PERFIL HISTÓRICO 1973 · BORRADOR</p><h3>Battelle-Columbus</h3>
   <p>Compará calidad ambiental y unidades de impacto entre escenarios SIN y CON proyecto. Los pesos históricos no califican el cumplimiento ambiental argentino.</p></div>
   <div className="amb-matrix-exports">
    <button type="button" disabled={invalid} onClick={()=>download('AMBIENTA-Battelle-'+projectId+'.csv','text/csv;charset=utf-8',battelleCsv(doc))}><ArrowDownToLine size={16}/> CSV</button>
    <button type="button" disabled={invalid} onClick={()=>download('AMBIENTA-Battelle-'+projectId+'.json','application/json',JSON.stringify({...doc,results:summary,methodSource:BATTELLE_SOURCE},null,2))}><ArrowDownToLine size={16}/> JSON</button>
    <label className="amb-matrix-file"><UploadCloud size={16}/> Importar JSON<input type="file" accept=".json,application/json" aria-label="Importar JSON Battelle" onChange={async event=>{
     const file=event.target.files?.[0];event.target.value='';if(!file)return;
     try{
      if(file.size>2000000)throw Error('El archivo supera 2 MB.');
      const parsed:unknown=JSON.parse(await file.text());if(!validBattelle(parsed,projectId))throw Error('Formato, perfil o proyecto incompatible. El borrador actual se conserva.');
      const previous=localStorage.getItem(keyFor(projectId));
      if(previous!==null){if(!window.confirm('¿Importar este borrador? Se conservará una copia local del anterior.'))return;localStorage.setItem(keyFor(projectId)+':backup:'+Date.now(),previous);}
      modified.current=true;setInvalid(false);setDoc(parsed);setNotice('JSON importado; no se trasladan datos a otros métodos.');
     }catch(error){setNotice(error instanceof Error?error.message:'No se pudo importar.');}
    }}/></label>
   </div></header>
  <p className="amb-battelle-provenance"><a href={BATTELLE_SOURCE} target="_blank" rel="noreferrer">Dee et al., 1973</a> · 78 parámetros · 1.000 UIP · 4 categorías · 18 componentes, incluido Ecosistemas, solo descriptivo.
   Nombres originales conservados para trazabilidad. Perfil concebido para recursos hídricos; su pertinencia local requiere revisión técnica.</p>
  {invalid&&<p role="alert">El archivo local no supera la validación. Se conserva intacto y la edición está bloqueada. <button type="button" onClick={()=>{try{download('Battelle-respaldo-original.txt','text/plain',localStorage.getItem(keyFor(projectId))??'');}catch{setNotice('No se pudo leer el respaldo.');}}}>Descargar respaldo original</button></p>}
  {notice&&<p role="status">{notice}</p>}
  <p className="amb-battelle-save" aria-live="polite">{invalid?'Archivo no validado':saved?'Cambios guardados en este navegador':modified.current?'Guardado pendiente':'Sin cambios · no se han creado mediciones'}</p>
  <fieldset disabled={invalid} className="amb-battelle-study"><legend>1 · Contexto común de comparación</legend>
   <label>Alternativa evaluada<input aria-label="Alternativa Battelle" value={doc.alternative} maxLength={5000} onChange={e=>change({alternative:e.target.value})}/></label>
   <label>Horizonte y fecha común SIN/CON<input aria-label="Horizonte Battelle" value={doc.horizon} maxLength={5000} onChange={e=>change({horizon:e.target.value})}/></label>
   <label>Ámbito espacial y supuestos<input aria-label="Ámbito Battelle" value={doc.boundary} maxLength={5000} onChange={e=>change({boundary:e.target.value})}/></label>
  </fieldset>
  <div className="amb-battelle-summary" aria-label="Cobertura Battelle">
   <span><strong data-bc-ready>{summary.ready} / 78</strong>parámetros calculables</span>
   <span><strong>{summary.coveredWeight} / 1.000</strong>UIP cubiertas, sin redistribuir faltantes</span>
   <span><strong data-bc-total>{fmt(summary.delta)}</strong>{summary.complete?'ΔUIA total del perfil':'ΔUIA parcial de parámetros calculables'}</span>
   <span><strong>{summary.rows.filter(r=>r.flag==='major').length} mayores · {summary.rows.filter(r=>r.flag==='minor').length} menores</strong>banderas para investigación</span>
  </div>
  <p className="amb-battelle-provenance">UIA = CA × UIP · ΔUIA = UIA CON − UIA SIN. Un subtotal positivo no borra las banderas ni los datos faltantes. No implica autorización del proyecto.</p>
  <div className="amb-battelle-category-totals">{(Object.keys(BATTELLE_CATEGORIES) as Category[]).map(cat=>{
   const rows=summary.rows.filter(r=>r.parameter.category===cat),ready=rows.filter(r=>r.ready);
   return <span key={cat}><b>{BATTELLE_CATEGORIES[cat]}</b> {rows.reduce((s,r)=>s+r.parameter.weight,0)} UIP · {ready.length}/{rows.length} calculables · Δ parcial {fmt(ready.length?ready.reduce((s,r)=>s+r.delta!,0):null)}</span>;
  })}</div>
  <div className="amb-battelle-toolbar"><h4>2 · Parámetros y resultados</h4><label>Categoría<select aria-label="Filtrar categoría Battelle" value={category} onChange={e=>setCategory(e.target.value as Category|'')}><option value="">Todas las categorías</option>{Object.entries(BATTELLE_CATEGORIES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div>
  <div className="amb-matrix-scroll amb-battelle-scroll" tabIndex={0} role="region" aria-label="Tabla de parámetros Battelle con desplazamiento">
   <table><caption>Seleccioná un parámetro para documentar sus mediciones y función.</caption><thead><tr><th scope="col">Parámetro / componente</th><th scope="col">UIP</th><th scope="col">CA SIN</th><th scope="col">CA CON</th><th scope="col">UIA SIN</th><th scope="col">UIA CON</th><th scope="col">ΔUIA</th><th scope="col">Señal de alerta</th></tr></thead>
    <tbody>{visible.map(r=><tr key={r.parameter.id} data-bc-row={r.parameter.id} aria-selected={selected===r.parameter.id}>
     <th scope="row"><button type="button" aria-pressed={selected===r.parameter.id} onClick={()=>setSelected(r.parameter.id)}>{r.parameter.number}. {r.parameter.name}</button><small>{BATTELLE_CATEGORIES[r.parameter.category]} · {r.parameter.component}</small></th>
     <td>{r.parameter.weight}</td><td>{fmt(r.without)}</td><td>{fmt(r.withProject)}</td><td>{fmt(r.uiaWithout)}</td><td>{fmt(r.uiaWith)}</td><td className={r.delta!==null&&r.delta<0?'is-adverse':''}>{fmt(r.delta)}</td><td data-flag={r.flag}>{labels[r.flag]}</td>
    </tr>)}</tbody></table>
  </div>
  <div className="amb-battelle-detail" data-bc-editor>
   <fieldset disabled={invalid}><legend>3 · {parameter.number}. {parameter.name} · {parameter.weight} UIP</legend>
    <div className="amb-battelle-fields">{stringField('indicator','Indicador ambiental')}{stringField('unit','Unidad del indicador')}
     {(['Without','With'] as const).map(which=>{const sin=which==='Without',x=sin?'xWithout':'xWith',kind=sin?'kindWithout':'kindWith';return <div key={which} className="amb-battelle-scenario">
      <label>Valor {sin?'SIN':'CON'}<input aria-label={'Valor '+(sin?'SIN':'CON')+' Battelle'} type="number" step="any" value={entry[x]??''} onChange={e=>edit({[x]:Number.isFinite(e.target.valueAsNumber)?e.target.valueAsNumber:null})}/></label>
      <label>Procedencia {sin?'SIN':'CON'}<select aria-label={'Procedencia '+(sin?'SIN':'CON')+' Battelle'} value={entry[kind]} onChange={e=>edit({[kind]:e.target.value})}><option value="">Seleccionar</option><option value="measured">Medido</option><option value="estimated">Estimado</option></select></label>
      {stringField(sin?'evidenceWithout':'evidenceWith','Fuente '+(sin?'SIN':'CON'))}
     </div>;})}
     {stringField('curveText','Nudos de función: indicador;CA, uno por línea',true)}
     {stringField('curveSource','Fuente, localizador y ámbito de la función',true)}
     {stringField('convention','Convención de calidad del estudio (0/0,5 y referencias)',true)}
     {stringField('evaluator','Evaluador / equipo responsable')}
    </div>
    <small>Interpolación lineal por tramos. Admite máximos interiores; no admite saltos, abscisas repetidas ni extrapolación. No se precargan curvas del Anejo 4 ni se declara que una curva manual sea original.</small>
   </fieldset>
   <aside className="amb-battelle-chart"><h4>Función y comparación del parámetro</h4>
    {nodes.length>=2?<svg viewBox="0 0 400 210" role="img" aria-label="Curva de transformación Battelle y posiciones SIN y CON"><path d="M45 25V160H360" fill="none" stroke="currentColor"/>
     <text x="15" y="35">1</text><text x="15" y="165">0</text><text x="15" y="16">CA</text>
     <polyline points={nodes.map(n=>px(n.x)+','+py(n.y)).join(' ')} fill="none" stroke="var(--bc-accent)" strokeWidth="3"/>
     <text x="45" y="185">{xMin}</text><text x="355" y="185" textAnchor="end">{xMax}</text><text x="200" y="205" textAnchor="middle">{entry.unit||'Unidad pendiente'}</text>
     {result.ready&&(entry.xWithout===entry.xWith
      ?[{x:entry.xWithout!,y:result.without!,label:'SIN/CON'}]
      :[{x:entry.xWithout!,y:result.without!,label:'SIN'},{x:entry.xWith!,y:result.withProject!,label:'CON'}]).map(p=><g key={p.label}><circle cx={px(p.x)} cy={py(p.y)} r="5" fill="currentColor"/><text x={px(p.x)} y={py(p.y)+(p.label==='CON'?18:-10)} textAnchor="middle">{p.label}</text></g>)}
    </svg>:<p>Ingresá una función válida para ver su forma.</p>}
    <dl><dt>CA SIN / CA CON</dt><dd>{fmt(result.without)} / {fmt(result.withProject)}</dd><dt>ΔUIA del parámetro</dt><dd data-bc-delta>{fmt(result.delta)}</dd><dt>Señal</dt><dd data-bc-flag>{labels[result.flag]}</dd></dl>
    {!result.ready&&<div role="status"><b>Parámetro pendiente</b><ul>{result.reasons.map((reason,i)=><li key={i}>{reason}</li>)}</ul></div>}
    <details><summary>Reglas de banderas (Dee, 1973, p. 532)</summary><p>Caída relativa de CA en Ecología: entre 5 y 10% inclusive, menor; más de 10%, mayor. Otras categorías: caída absoluta de CA ≥ 0,1; si su caída relativa es menor de 30%, menor, y si es ≥ 30%, mayor. Las lagunas de información se muestran aparte como datos pendientes. Con CA SIN = 0 no se divide por cero.</p></details>
   </aside>
  </div>
  <fieldset disabled={invalid} className="amb-battelle-study"><legend>4 · Ecosistemas: componente descriptivo</legend><label>Descripción, interacciones y lagunas de información<textarea aria-label="Ecosistemas Battelle" rows={3} value={doc.ecosystems} maxLength={5000} onChange={e=>change({ecosystems:e.target.value})}/></label></fieldset>
  <footer className="amb-matrix-footer">{summary.complete?'Perfil numérico completo con descripción de ecosistemas; sujeto a revisión técnica.':'Estudio incompleto: completar 78 parámetros y la descripción de ecosistemas antes de presentar un total del perfil.'} El catálogo histórico conserva denominaciones y contexto de origen; no sustituye una revisión de pertinencia cultural, territorial o metodológica.</footer>
 </section>;
}
