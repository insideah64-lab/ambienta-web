import {useEffect,useRef,useState,type ChangeEvent,type MouseEvent} from 'react';
import type {F3BAudit} from './ConesaF3DigitizationModel';
import {auditNumber} from './ConesaF3DigitizationModel';
import {
 visualCalibration,imageToMagnitude,usableVisualPoints,asIndependentReading,
 type ImagePixel,type VisualPoint
} from './ConesaF3VisualDigitizerModel';
import {
 ZOOM_LEVELS,precisionViewport,movePrecisionView,pixelSensitivity,
 validSessionSeries,seriesSessionExport,
 type PrecisionZoom,type SessionSeries
} from './ConesaF3PrecisionModel';
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
 const [zoom,setZoom]=useState<PrecisionZoom>(1);
 const [center,setCenter]=useState<ImagePixel>({x:0,y:0});
 const [radius,setRadius]=useState('1');
 const [multi,setMulti]=useState(false);
 const [seriesName,setSeriesName]=useState('');
 const [seriesDocs,setSeriesDocs]=useState<SessionSeries[]>([]);
 const svgRef=useRef<SVGSVGElement|null>(null);
 const size=dimensions;
 const viewport=precisionViewport(size.width,size.height,{zoom,center});
 const viewBox=viewport?
  [viewport.x,viewport.y,viewport.width,viewport.height].join(' '):
  '0 0 1 1';
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
   setZoom(1);setCenter({x:image.naturalWidth/2,y:image.naturalHeight/2});
   setUrl(objectUrl);setError('');
  };
  image.onerror=()=>{if(alive)setError('No fue posible decodificar la imagen seleccionada.')};
  image.src=objectUrl;
  return ()=>{alive=false;image.onload=null;image.onerror=null;URL.revokeObjectURL(objectUrl)};
 },[file]);
 const calibration=visualCalibration(audit,size.width,size.height);
 const result=usableVisualPoints(points);
 const sensitivity=calibration.calibration?
  pixelSensitivity(calibration.calibration,Number(radius)):null;
 const canExport=!!url&&!multi&&calibration.calibration!==null&&
  result.problems.length===0&&!blocked;
 const tempSeries:SessionSeries={label:seriesName.trim(),points,radiusPixels:Number(radius)};
 const canStoreSeries=!!url&&multi&&!blocked&&calibration.calibration!==null&&
  validSessionSeries(tempSeries)&&
  !seriesDocs.some(x=>x.label.toLocaleLowerCase()===tempSeries.label.toLocaleLowerCase());
 const evidence=multi&&calibration.calibration?
  seriesSessionExport({sourceName:file?.name??'',width:size.width,height:size.height,
   calibration:calibration.calibration,series:seriesDocs}):null;
 const calibrationSignature=[
  audit.xPixelA,audit.xPixelB,audit.xValueA,audit.xValueB,
  audit.yPixelA,audit.yPixelB,audit.yValueA,audit.yValueB
 ].join('|');
 const priorCalibration=useRef(calibrationSignature);
 useEffect(()=>{
  if(priorCalibration.current!==calibrationSignature){
   priorCalibration.current=calibrationSignature;
   setPoints([]);setSeriesDocs([]);
  }
 },[calibrationSignature]);
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
  setPoints([]);setSeriesDocs([]);setZoom(1);setMode('xPixelA');setError('');
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
 const saveSeries=()=>{
  if(!canStoreSeries)return;
  setSeriesDocs(old=>[...old,tempSeries]);setPoints([]);setSeriesName('');
  setError('Serie registrada solo en esta sesión. Exportá el JSON antes de cerrar.');
 };
 const exportSeries=()=>{
  if(!evidence)return;
  const blob=new Blob([JSON.stringify(evidence,null,2)],{type:'application/json'});
  const objectUrl=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=objectUrl;
  link.download='AMBIENTA-Conesa-F3b-QA3-series-sin-certificar.json';
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(objectUrl);
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
   <div><strong>Digitalizador visual · F3b-QA3: precisión y series</strong>
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
  {url&&<div className="amb-f3b-precision-tools" data-f3b-precision-tools>
   <div className="amb-f3b-precision-zoom">
    <span>Ampliación (coordenadas de origen intactas)</span>
    {ZOOM_LEVELS.map(level=><button type="button" key={level}
     aria-label={'Ampliar a '+level+'x'} aria-pressed={zoom===level}
     disabled={blocked} onClick={()=>setZoom(level)}>{level}×</button>)}
    <button type="button" disabled={blocked||zoom===1}
     onClick={()=>setCenter({x:size.width/2,y:size.height/2})}>Centrar</button>
   </div>
   <div className="amb-f3b-precision-pan" role="group" aria-label="Desplazar vista ampliada">
    <button type="button" aria-label="Desplazar a la izquierda"
     disabled={blocked||zoom===1} onClick={()=>setCenter(c=>
      movePrecisionView(size.width,size.height,{zoom,center:c},-.25,0).center)}>←</button>
    <button type="button" aria-label="Desplazar a la derecha"
     disabled={blocked||zoom===1} onClick={()=>setCenter(c=>
      movePrecisionView(size.width,size.height,{zoom,center:c},.25,0).center)}>→</button>
    <button type="button" aria-label="Desplazar hacia arriba"
     disabled={blocked||zoom===1} onClick={()=>setCenter(c=>
      movePrecisionView(size.width,size.height,{zoom,center:c},0,-.25).center)}>↑</button>
    <button type="button" aria-label="Desplazar hacia abajo"
     disabled={blocked||zoom===1} onClick={()=>setCenter(c=>
      movePrecisionView(size.width,size.height,{zoom,center:c},0,.25).center)}>↓</button>
    <span data-f3b-viewport>Vista: {zoom}×, origen px {
     viewport?viewport.x.toFixed(1):'—'} / {viewport?viewport.y.toFixed(1):'—'}</span>
   </div>
   <div className="amb-f3b-precision-error">
    <label>Radio supuesto de imprecisión al marcar (píxeles originales)
     <select aria-label="Radio de selección en píxeles" value={radius}
      disabled={blocked} onChange={e=>setRadius(e.target.value)}>
      <option value="0.5">±0,5 px</option><option value="1">±1 px</option>
      <option value="2">±2 px</option><option value="3">±3 px</option>
     </select>
    </label>
    <p data-f3b-pixel-sensitivity>{sensitivity?
     'Sensibilidad estimada: ±'+sensitivity.maxAbsM.toFixed(5)+
     ' M y ±'+sensitivity.maxAbsCA.toFixed(5)+
     ' CA, para ±'+sensitivity.radiusPixels+' px en cada eje.':
     'Completá los valores de calibración para estimar sensibilidad de selección.'}
     <small>Solo deriva la escala de los ejes: no incluye error de calibración,
      grosor del trazo, incertidumbre de medición ni intervalo de confianza.</small>
    </p>
   </div>
  </div>}
  <p className="amb-f3b-visual-instruction" role="status">
   {mode==='point'?'Seleccioná los nudos sobre la curva. Solo se aceptan puntos dentro de la calibración.':
    'Hacé clic en la marca '+mode.replace('Pixel',' ')+' del gráfico, luego completá su valor en el formulario de calibración.'}
  </p>
  {url?<svg ref={svgRef} className="amb-f3b-visual-canvas" data-f3b-visual-canvas
   viewBox={viewBox}
   xmlns="http://www.w3.org/2000/svg" role="img"
   aria-label="Imagen de gráfico de Conesa con puntos seleccionados; alternativa de entrada manual disponible"
   onClick={svgClick}>
   <image href={url} x={0} y={0} width={size.width} height={size.height}/>
   {markers.map(m=>m.axis==='x'?
    <line key={m.key} x1={m.v!} x2={m.v!} y1={0} y2={size.height}
     stroke="#ed9951" strokeDasharray="5 5" strokeWidth={2}/>:
    <line key={m.key} y1={m.v!} y2={m.v!} x1={0} x2={size.width}
     stroke="#ed9951" strokeDasharray="5 5" strokeWidth={2}/>)}
   {seriesDocs.map((serie,s)=>serie.points.map((p,i)=>
    <g key={'saved-'+s+'-'+i}>
     <circle cx={p.pixel.x} cy={p.pixel.y} r={4} fill="none"
      stroke={['#673ab7','#cc5500','#248331','#ce2f78'][s%4]}
      strokeWidth={3}/>
    </g>))}
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
  {url&&<fieldset className="amb-f3b-series-mode">
   <legend>Modo de tratamiento de la figura</legend>
   <label><input type="radio" name="conesa-figura-mode" checked={!multi}
    onChange={()=>{setMulti(false);setPoints([]);setSeriesDocs([]);setError('')}}
    disabled={blocked}/> Una sola curva continua (auditoría QA1)</label>
   <label><input type="radio" name="conesa-figura-mode" checked={multi}
    onChange={()=>{setMulti(true);setPoints([]);setSeriesDocs([]);setError('')}}
    disabled={blocked}/> Varias series: documentación separada, sin importación a F3b</label>
   {multi&&<>
    <p>Asigná un nombre distinto a cada serie visible en el gráfico. Su relación
     con el factor es documental: QA1 aún no admite varias series.</p>
    <label>Identificación de la serie en el gráfico original
     <input type="text" maxLength={120} value={seriesName}
      aria-label="Nombre de serie en el gráfico" disabled={blocked}
      placeholder="Ej.: corriente rápida, curva 2, condición B"
      onChange={e=>setSeriesName(e.target.value)}/>
    </label>
    <div className="amb-f3b-visual-actions">
     <button type="button" disabled={!canStoreSeries}
      onClick={saveSeries}>Conservar serie en esta sesión</button>
     <button type="button" disabled={!evidence} onClick={exportSeries}>
      Exportar series JSON (sin certificar)</button>
    </div>
    <p data-f3b-series-count>{seriesDocs.length} series separadas;
     {seriesDocs.map((x,i)=><span key={x.label}> {i+1}. {x.label} ({x.points.length} puntos)</span>)}</p>
   </>}
  </fieldset>}
  {!multi&&<div className="amb-f3b-visual-readers" role="group" aria-label="Lector al que se asignará la captura">
   <span>Lectura en preparación:</span>
   <button type="button" aria-pressed={reader==='A'} disabled={blocked}
    onClick={()=>switchReader('A')}>Lector A</button>
   <button type="button" aria-pressed={reader==='B'} disabled={blocked}
    onClick={()=>switchReader('B')}>Lector B</button>
  </div>}
  <div className="amb-f3b-visual-preview" data-f3b-visual-preview>
   <strong>{points.length} puntos seleccionados · {multi?'Serie '+(seriesName||'sin nombre'):'Lectura '+reader}</strong>
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
   {!multi&&<button type="button" data-f3b-visual-apply
    disabled={!canExport} onClick={commit}>
    Pasar puntos a lectura {reader} (sin modificar F3b)
   </button>}
  </div>
  <p className="amb-f3b-visual-foot">El trazado y los puntos son una lectura manual aproximada
   de una imagen. No se aceptan saltos, escalas logarítmicas, curvas de varias series
   o coordenadas fuera de los ejes declarados. Las figuras con varias series se
   exportan como evidencia separada: no se mezclan en el motor F3b.
   La sensibilidad por píxel no es incertidumbre científica total.
   Para la revisión, compará las dos
   lecturas y completá el dictamen; ninguna acción aquí aprueba la curva.</p>
 </section>;
}
