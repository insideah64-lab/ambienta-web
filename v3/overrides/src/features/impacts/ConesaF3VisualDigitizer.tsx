import {useEffect,useRef,useState,type ChangeEvent,type MouseEvent} from 'react';
import type {F3BAudit} from './ConesaF3DigitizationModel';
import {auditNumber} from './ConesaF3DigitizationModel';
import {
 visualCalibration,imageToMagnitude,usableVisualPoints,asIndependentReading,
 type ImagePixel,type VisualPoint
} from './ConesaF3VisualDigitizerModel';
import './ConesaF3VisualDigitizer.css';

type Props={
 audit:F3BAudit;blocked:boolean;onPatch:(patch:Partial<F3BAudit>)=>void
};
type Target='xPixelA'|'xPixelB'|'yPixelA'|'yPixelB'|'point';
const targets:{key:Target;label:string}[]=[
 {key:'xPixelA',label:'Marcar X1'}, {key:'xPixelB',label:'Marcar X2'},
 {key:'yPixelA',label:'Marcar Y1'}, {key:'yPixelB',label:'Marcar Y2'},
 {key:'point',label:'Capturar nudos'}
];
const limitSize=15*1024*1024;
export function ConesaF3VisualDigitizer({audit,blocked,onPatch}:Props){
 const [file,setFile]=useState<File|null>(null);
 const [url,setUrl]=useState('');
 const [dimensions,setDimensions]=useState({width:0,height:0});
 const [error,setError]=useState('');
 const [mode,setMode]=useState<Target>('xPixelA');
 const [reader,setReader]=useState<'A'|'B'>('A');
 const [points,setPoints]=useState<VisualPoint[]>([]);
 const [manualX,setManualX]=useState('');
 const [manualY,setManualY]=useState('');
 const svgRef=useRef<SVGSVGElement|null>(null);
 const size=dimensions;
 useEffect(()=>{
  if(!file)return;
  const objectUrl=URL.createObjectURL(file);
  let alive=true;
  const image=new Image();
  image.onload=()=>{
   if(!alive)return;
   if(image.naturalWidth<32||image.naturalHeight<32||
    image.naturalWidth>12000||image.naturalHeight>12000){
    setError('La imagen debe medir entre 32 y 12000 píxeles por eje.');
    return;
   }
   setDimensions({width:image.naturalWidth,height:image.naturalHeight});
   setUrl(objectUrl);setError('');
  };
  image.onerror=()=>{if(alive)setError('No fue posible decodificar la imagen seleccionada.')};
  image.src=objectUrl;
  return ()=>{alive=false;image.onload=null;image.onerror=null;URL.revokeObjectURL(objectUrl)};
 },[file]);
 const calibration=visualCalibration(audit,size.width,size.height);
 const result=usableVisualPoints(points);
 const canExport=!!url&&calibration.calibration!==null&&
  result.problems.length===0&&!blocked;
 const reference=(key:Target)=>{
  if(key==='point')return '';
  return audit[key];
 };
 const onFile=(event:ChangeEvent<HTMLInputElement>)=>{
  const selected=event.target.files?.[0];
  event.target.value='';
  if(!selected)return;
  if(!['image/png','image/jpeg','image/webp'].includes(selected.type)||
   selected.size>limitSize||selected.size===0){
   setError('Usá un PNG, JPG o WebP válido de hasta 15 MB.');
   return;
  }
  setFile(selected);setUrl('');setDimensions({width:0,height:0});
  setPoints([]);setMode('xPixelA');setError('');
  // A different bitmap invalidates pixel anchors and any local review.
  // Keep user-supplied A/B readings intact; never replace them silently.
  onPatch({xPixelA:'',xPixelB:'',yPixelA:'',yPixelB:''});
 };
 const mark=(position:ImagePixel)=>{
  if(blocked||!url)return;
  if(position.x<0||position.x>size.width||position.y<0||position.y>size.height){
   setError('El punto está fuera de la imagen.');return;
  }
  if(mode!=='point'){
   onPatch({[mode]:String(mode.startsWith('x')?position.x:position.y)});
   setError('');
   const index=targets.findIndex(t=>t.key===mode);
   setMode(targets[Math.min(index+1,targets.length-1)].key);
   return;
  }
  if(!calibration.calibration){
   setError('Completá ambas marcas y los valores reales de los ejes antes de capturar puntos.');
   return;
  }
  if(points.length>=24){setError('F3b admite como máximo 24 nudos.');return;}
  const out=imageToMagnitude(position,calibration.calibration,size.width,size.height);
  if(!out){setError('Punto fuera del rango calibrado o con CA fuera de 0–1. No se extrapola.');return;}
  setPoints(old=>[...old,{pixel:position,m:out.m!,ca:out.ca!}]);
  setError('');
 };
 const svgClick=(event:MouseEvent<SVGSVGElement>)=>{
  if(!svgRef.current)return;
  const transform=svgRef.current.getScreenCTM();
  if(!transform){setError('No fue posible calcular la posición del puntero.');return;}
  const p=svgRef.current.createSVGPoint();
  p.x=event.clientX;p.y=event.clientY;
  const q=p.matrixTransform(transform.inverse());
  mark({x:q.x,y:q.y});
 };
 const commit=()=>{
  if(!canExport)return;
  const content=asIndependentReading(points);
  if(!content)return;
  const old=reader==='A'?audit.readingA:audit.readingB;
  if(old.trim()&&!window.confirm('¿Reemplazar la lectura '+reader+
   '? La lectura existente se conserva en el JSON exportado si la respaldaste.'))return;
  onPatch(reader==='A'?{readingA:content}:{readingB:content});
  setPoints([]);
  setError('Lectura '+reader+' guardada en el expediente; aún requiere revisión independiente.');
 };
 const switchReader=(next:'A'|'B')=>{
  setReader(next);setPoints([]);setMode('point');setError('');
 };
 const markers=([
  {key:'xPixelA',axis:'x',label:'X1'},
  {key:'xPixelB',axis:'x',label:'X2'},
  {key:'yPixelA',axis:'y',label:'Y1'},
  {key:'yPixelB',axis:'y',label:'Y2'}
 ] as const).map(item=>({...item,v:auditNumber(reference(item.key))}))
  .filter(x=>x.v!==null);
 return <section className="amb-f3b-visual" data-f3b-visual>
  <div className="amb-f3b-visual-heading">
   <div><strong>Digitalizador visual de curvas · F3b-QA2</strong>
    <p>Captura manual desde una imagen local. El archivo no se sube al servidor ni se guarda
     en el navegador. Guardá el original por separado.</p>
   </div>
   <span>Local · sin certificado</span>
  </div>
  <label className="amb-f3b-visual-upload">
   Imagen del gráfico original (PNG, JPG o WebP)
   <input aria-label="Imagen del gráfico para digitalizar" type="file"
    accept="image/png,image/jpeg,image/webp" disabled={blocked}
    onChange={onFile}/>
  </label>
  {url&&<div className="amb-f3b-visual-info" data-f3b-visual-size>
   {file?.name} · {size.width} × {size.height} px · coordenadas del original
  </div>}
  <div className="amb-f3b-visual-toolbar" role="group" aria-label="Modo del digitalizador">
   {targets.map(t=><button key={t.key} type="button"
    data-visual-mode={t.key} aria-pressed={mode===t.key} disabled={blocked||!url}
    onClick={()=>{setMode(t.key);setError('')}}>{t.label}</button>)}
  </div>
  <p className="amb-f3b-visual-instruction" role="status">
   {mode==='point'?'Seleccioná los nudos sobre la curva. Solo se aceptan puntos dentro de la calibración.':
    'Hacé clic en la marca '+mode.replace('Pixel',' ')+' del gráfico, luego completá su valor en el formulario de calibración.'}
  </p>
  {url?<svg ref={svgRef} className="amb-f3b-visual-canvas" data-f3b-visual-canvas
   viewBox={'0 0 '+size.width+' '+size.height}
   xmlns="http://www.w3.org/2000/svg" role="img"
   aria-label="Imagen de gráfico de Conesa con puntos seleccionados; alternativa de entrada manual disponible"
   onClick={svgClick}>
   <image href={url} x={0} y={0} width={size.width} height={size.height}/>
   {markers.map(m=>m.axis==='x'?
    <line key={m.key} x1={m.v!} x2={m.v!} y1={0} y2={size.height}
     stroke="#ed9951" strokeDasharray="5 5" strokeWidth={2}/>:
    <line key={m.key} y1={m.v!} y2={m.v!} x1={0} x2={size.width}
     stroke="#ed9951" strokeDasharray="5 5" strokeWidth={2}/>)}
   {points.map((p,i)=><g key={i}>
    <circle cx={p.pixel.x} cy={p.pixel.y} r={6}
     fill="#03646e" stroke="#ffffff" strokeWidth={2}/>
    <text x={p.pixel.x+8} y={p.pixel.y-8} fontSize={15}
     fill="#ffffff" stroke="#142a36" strokeWidth={2}
     paintOrder="stroke">{i+1}</text>
   </g>)}
  </svg>:<p className="amb-f3b-visual-empty">
   Seleccioná una imagen para activar el lienzo. No cargamos puntos predeterminados.
  </p>}
  <div className="amb-f3b-visual-keyboard">
   <strong>Alternativa sin hacer clic en el gráfico</strong>
   <div><label>Píxel X
    <input aria-label="Píxel X manual" type="number" step="any"
     value={manualX} disabled={blocked||!url} onChange={e=>setManualX(e.target.value)}/>
   </label>
   <label>Píxel Y
    <input aria-label="Píxel Y manual" type="number" step="any"
     value={manualY} disabled={blocked||!url} onChange={e=>setManualY(e.target.value)}/>
   </label>
   <button type="button" disabled={blocked||!url||manualX.trim()===''||manualY.trim()===''}
    onClick={()=>{const x=Number(manualX),y=Number(manualY);
     if(!Number.isFinite(x)||!Number.isFinite(y)){setError('Píxeles inválidos.');return}
     mark({x,y})}}>Marcar coordenada</button></div>
  </div>
  {url&&<div className="amb-f3b-visual-calibration" role="status">
   {calibration.calibration?
    'Calibración lineal completa: podés marcar nudos, sin extrapolación.':
    'Calibración pendiente: '+calibration.problems.join(' · ')}
  </div>}
  <div className="amb-f3b-visual-readers" role="group" aria-label="Lector al que se asignará la captura">
   <span>Lectura en preparación:</span>
   <button type="button" aria-pressed={reader==='A'} disabled={blocked}
    onClick={()=>switchReader('A')}>Lector A</button>
   <button type="button" aria-pressed={reader==='B'} disabled={blocked}
    onClick={()=>switchReader('B')}>Lector B</button>
  </div>
  <div className="amb-f3b-visual-preview" data-f3b-visual-preview>
   <strong>{points.length} puntos seleccionados · Lectura {reader}</strong>
   {points.length?
    <div className="amb-f3b-visual-table">
     <table><thead><tr><th scope="col">#</th><th scope="col">M</th>
      <th scope="col">CA</th><th scope="col">Acción</th></tr></thead>
      <tbody>{points.map((p,i)=><tr key={i}>
       <td>{i+1}</td><td>{p.m.toFixed(5)}</td><td>{p.ca.toFixed(5)}</td>
       <td><button type="button" disabled={blocked}
        onClick={()=>setPoints(old=>old.filter((_,k)=>k!==i))}>
        Quitar {i+1}</button></td>
      </tr>)}</tbody></table>
    </div>:<p>Sin puntos de esta lectura. No se copiarán los del otro lector.</p>}
   {points.length>0&&result.problems.length>0&&
    <p role="alert">Para exportar: {result.problems.join(' · ')}</p>}
  </div>
  {error&&<p role="alert" className="amb-f3b-visual-error">{error}</p>}
  <div className="amb-f3b-visual-actions">
   <button type="button" disabled={blocked||points.length===0}
    onClick={()=>{setPoints([]);setError('')}}>Descartar selección</button>
   <button type="button" data-f3b-visual-apply
    disabled={!canExport} onClick={commit}>
    Pasar puntos a lectura {reader} (sin modificar F3b)
   </button>
  </div>
  <p className="amb-f3b-visual-foot">El trazado y los puntos son una lectura manual aproximada
   de una imagen. No se aceptan saltos, escalas logarítmicas, curvas de varias series
   o coordenadas fuera de los ejes declarados. Para la revisión, compará las dos
   lecturas y completá el dictamen; ninguna acción aquí aprueba la curva.</p>
 </section>;
}
