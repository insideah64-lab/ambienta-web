import type {F3FactorRecord} from './ConesaF3Model';
import {
 blankF3BCurve,f3bPointProblems,f3bProblems,interpolateF3BCurve,
 type F3BCurve,type F3BCurvePoint
} from './ConesaF3CurveModel';
import './ConesaF3CurveEditor.css';
type Props={
 base:F3FactorRecord;curve:F3BCurve;
 blocked:boolean;onChange:(next:F3BCurve)=>void
};
const numberOrNull=(text:string)=>text.trim()===''?null:Number(text);
export function ConesaF3CurveEditor({base,curve,blocked,onChange}:Props){
 const issues=f3bProblems(base,curve);
 const complete=f3bPointProblems(curve.points).length===0;
 const first=curve.points[0],last=curve.points[curve.points.length-1];
 const scaleX=(value:number)=>48+460*(value-first.m!)/(last.m!-first.m!);
 const scaleY=(value:number)=>196-166*value;
 const path=complete?curve.points.map((p,i)=>
  (i?'L':'M')+scaleX(p.m!).toFixed(2)+','+scaleY(p.ca!).toFixed(2)).join(' '):'';
 const sin=complete&&base.without.value!==null?
  interpolateF3BCurve(curve.points,base.without.value):null;
 const con=complete&&base.withProject.value!==null?
  interpolateF3BCurve(curve.points,base.withProject.value):null;
 const update=(change:Partial<F3BCurve>)=>{if(!blocked)onChange({...curve,...change})};
 const updatePoint=(i:number,key:keyof F3BCurvePoint,value:number|null)=>{
  const points=curve.points.map((p,index)=>index===i?{...p,[key]:value}:p);
  update({points});
 };
 return <fieldset className="amb-f3b" data-f3b-curve-editor>
  <legend>F3b · Curva reconstruida por puntos</legend>
  <p className="amb-f3b-caution">
   Esta herramienta interpola linealmente entre nudos que ingresás vos. No digitaliza
   automáticamente las curvas impresas de Conesa y no supone que los trazos originales
   sean lineales entre puntos. No admite discontinuidades, abscisas duplicadas ni extrapolación.
  </p>
  {(curve.indicator!==base.indicator||curve.unit!==base.unit)&&
   <div role="alert" className="amb-f3b-issues">
    <strong>Cambió el indicador o su unidad en F3a.</strong>
    <p>Esta curva no se reutiliza con otra magnitud. Antes de reiniciarla,
     exportá el JSON F3b si necesitás conservar sus puntos anteriores.</p>
    <button type="button" disabled={blocked}
     onClick={()=>onChange(blankF3BCurve(base))}>
     Reiniciar curva F3b para este indicador y unidad
    </button>
   </div>}
  <div className="amb-f3-grid">
   <label>Procedencia de la función
    <select aria-label="F3b procedencia" value={curve.origin} disabled={blocked}
     onChange={e=>update({origin:e.target.value as F3BCurve['origin']})}>
     <option value="anejo4">Anejo 4 de Conesa · transcripción revisada</option>
     <option value="estudio">Estudio científico o técnico externo</option>
     <option value="expertos">Panel de especialistas / Delphi</option>
    </select>
   </label>
   <label>Documento, edición o acta de referencia
    <input aria-label="F3b fuente" value={curve.source} maxLength={1200} disabled={blocked}
     onChange={e=>update({source:e.target.value})}
     placeholder="Cita técnica específica, edición y curva"/>
   </label>
   {curve.origin==='anejo4'&&<label>Página impresa del Anejo 4
    <input aria-label="F3b página" type="number" min={253} max={999} step={1}
     value={curve.bookPage??''} disabled={blocked}
     onChange={e=>update({bookPage:numberOrNull(e.target.value)})}/>
   </label>}
   <label>Responsable de adoptar / revisar la curva
    <input aria-label="F3b responsable" value={curve.assessor} maxLength={350} disabled={blocked}
     onChange={e=>update({assessor:e.target.value})}
     placeholder="Equipo técnico y persona responsable"/>
   </label>
  </div>
  <label>Ámbito, condiciones y validez local de la función
   <textarea aria-label="F3b ámbito" rows={2} maxLength={2000}
    value={curve.scope} disabled={blocked}
    onChange={e=>update({scope:e.target.value})}
    placeholder="Ambiente, indicadores, límites y criterios de validez"/>
  </label>
  <label>Evidencia de reconstrucción, lectura de gráfica o dictamen
   <textarea aria-label="F3b evidencia" rows={2} maxLength={1500}
    value={curve.evidence} disabled={blocked}
    onChange={e=>update({evidence:e.target.value})}
    placeholder="Cómo obtuviste los puntos y cómo se revisaron"/>
  </label>
  <div className="amb-f3b-points">
   <div className="amb-f3b-point-head"><h5>Nudos de la función (máximo 24)</h5>
    <button type="button" disabled={blocked||curve.points.length>=24}
     onClick={()=>update({points:[...curve.points,{m:null,ca:null}]})}>
     Añadir nudo</button>
   </div>
   <p>Ordená la magnitud M de menor a mayor; CA debe estar entre 0 y 1.
    No se completan extremos ni se asignan valores automáticamente.</p>
   <div className="amb-f3b-point-rows">
    {curve.points.map((point,i)=><div className="amb-f3b-point-row" key={i}
     data-f3b-point={i}>
     <strong>{i+1}</strong>
     <label>Magnitud M ({base.unit||'unidad pendiente'})
      <input aria-label={'F3b magnitud nudo '+(i+1)} type="number" step="any"
       disabled={blocked} value={point.m??''}
       onChange={e=>updatePoint(i,'m',numberOrNull(e.target.value))}/>
     </label>
     <label>Calidad ambiental CA
      <input aria-label={'F3b CA nudo '+(i+1)} type="number" step="any" min={0} max={1}
       disabled={blocked} value={point.ca??''}
       onChange={e=>updatePoint(i,'ca',numberOrNull(e.target.value))}/>
     </label>
     <button type="button" aria-label={'Quitar nudo F3b '+(i+1)}
      disabled={blocked||curve.points.length<=2}
      onClick={()=>update({points:curve.points.filter((_,j)=>j!==i)})}>Quitar</button>
    </div>)}
   </div>
  </div>
  {complete&&<div className="amb-f3b-preview" data-f3b-preview>
   <strong>Previsualización geométrica de los nudos, no validación técnica</strong>
   <svg viewBox="0 0 560 238" role="img"
    aria-label="Curva interpolada: calidad ambiental de cero a uno según magnitud del indicador">
    <line x1={48} y1={196} x2={508} y2={196} stroke="currentColor" opacity={0.5}/>
    <line x1={48} y1={30} x2={48} y2={196} stroke="currentColor" opacity={0.5}/>
    <line x1={48} y1={113} x2={508} y2={113} stroke="currentColor" opacity={0.18} strokeDasharray="4 5"/>
    <text x={5} y={33} fontSize="12" fill="currentColor">1</text>
    <text x={5} y={117} fontSize="12" fill="currentColor">0,5</text>
    <text x={5} y={199} fontSize="12" fill="currentColor">0</text>
    <path d={path} fill="none" stroke="#4ed5c1" strokeWidth={3} strokeLinejoin="round"/>
    {curve.points.map((p,i)=><circle key={i} cx={scaleX(p.m!)} cy={scaleY(p.ca!)}
     r={4} fill="#ffce85" stroke="#112e3c" strokeWidth={1}/>)}
    {sin!==null&&<circle cx={scaleX(base.without.value!)} cy={scaleY(sin)}
     r={7} fill="none" stroke="#f5b861" strokeWidth={3}/>}
    {con!==null&&<circle cx={scaleX(base.withProject.value!)} cy={scaleY(con)}
     r={6} fill="#2ed4c5" stroke="#ffffff" strokeWidth={2}/>}
    <text x={48} y={219} fontSize="12" fill="currentColor">{first.m}</text>
    <text x={508} y={219} fontSize="12" textAnchor="end" fill="currentColor">{last.m}</text>
   </svg>
   <p>Marcas: círculo vacío = SIN, círculo lleno = CON (cuando sus magnitudes están dentro del dominio).</p>
  </div>}
  {issues.length>0?<div className="amb-f3b-issues" data-f3b-issues role="status">
   <strong>La curva no se aplica a los resultados mientras falten datos o validaciones</strong>
   <p>{issues.join(' · ')}</p>
  </div>:<p className="amb-f3b-ready" data-f3b-ready role="status">
   Curva documentada y evaluable en los escenarios registrados. Revisar la precisión de la interpolación.
  </p>}
 </fieldset>;
}
