import {useEffect,useState,type ChangeEvent} from 'react';
import type {PointAoi} from '../georef/AoiWorkbench';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
// @ts-ignore: Node/browser source validation and provenance contract
import {polygonFromVertices,parseKmlPolygon,validatePerimeterGeoJson,buildPerimeterRecord,
 readPerimeter,savePerimeter,perimeterKey,perimeterHistoryKey,suggestWindowForBounds} from './perimeter-source.mjs';
// @ts-ignore: independent query window model
import {aoiKey,readPointAoi} from './aoi-model.mjs';
import {PerimeterDrawMap} from './PerimeterDrawMap';
import './perimeter-editor.css';
type Props={aoi:PointAoi|null};
type Candidate={geojson:any;rawText:string|null;sourceName:string;sourceType:'drawn'|'geojson'|'kml'};
const KEY=perimeterKey(IS_DIABLILLOS_CASE),HISTORY=perimeterHistoryKey(IS_DIABLILLOS_CASE);
async function sha256(text:string){
 const bytes=new TextEncoder().encode(text);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('');
}
function download(name:string,content:string,mime:string){
 const url=URL.createObjectURL(new Blob([content],{type:mime}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();
 a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
}
export function PerimeterWorkbench({aoi}:Props){
 const [revision,setRevision]=useState(0);
 const [saved,setSaved]=useState<any|null>(()=>readPerimeter(localStorage,KEY));
 const [vertices,setVertices]=useState<number[][]>([]);
 const [drawing,setDrawing]=useState(false);
 const [candidate,setCandidate]=useState<Candidate|null>(null);
 const [description,setDescription]=useState('');
 const [replace,setReplace]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  const refresh=()=>{setSaved(readPerimeter(localStorage,KEY));setRevision(v=>v+1);};
  window.addEventListener('focus',refresh);window.addEventListener('storage',refresh);
  return ()=>{window.removeEventListener('focus',refresh);window.removeEventListener('storage',refresh);};
 },[]);
 async function chooseFile(ev:ChangeEvent<HTMLInputElement>){
  const file=ev.target.files?.[0];ev.target.value='';
  if(!file)return;
  setError('');setNotice('');setCandidate(null);
  try{
   if(file.size<1||file.size>600000)throw Error('Usá un archivo de hasta 600 KB.');
   if(!/\.(geojson|json|kml)$/i.test(file.name))throw Error('Solo GeoJSON o KML poligonal.');
   const raw=await file.text();
   const kind=file.name.toLowerCase().endsWith('.kml')?'kml':'geojson';
   const parsed=kind==='kml'?parseKmlPolygon(raw,()=>new DOMParser()):JSON.parse(raw);
   const checked=validatePerimeterGeoJson(parsed);
   setCandidate({geojson:checked.geojson,rawText:raw,sourceType:kind,sourceName:file.name});
   setVertices([]);setDrawing(false);
   setNotice('Contorno importado para revisión. No se ha sobrescrito la geometría guardada.');
  }catch(cause){setError(cause instanceof Error?cause.message:'Archivo inválido.');}
 }
 function addVertex(point:number[]){
  setVertices(old=>old.length>=1000?old:[...old,point]);
  setCandidate(null);setNotice('');setError('');
 }
 function draftFromDrawing(){
  try{
   const validated=validatePerimeterGeoJson(polygonFromVertices(vertices));
   setCandidate({geojson:validated.geojson,rawText:null,sourceType:'drawn',sourceName:'perimetro-dibujado.geojson'});
   setDrawing(false);setError('');setNotice('Dibujo cerrado y validado. Guardalo para usarlo en el proyecto.');
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo cerrar el dibujo.');}
 }
 async function persist(){
  if(!candidate||busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const sourceText=candidate.rawText??JSON.stringify(candidate.geojson);
   const record=buildPerimeterRecord({geojson:candidate.geojson,sha256:await sha256(sourceText),
    sourceName:candidate.sourceName,sourceType:candidate.sourceType,
    description:description.trim(),createdAt:new Date().toISOString(),
    rawText:candidate.rawText});
   const result=savePerimeter(localStorage,KEY,HISTORY,record,{replace});
   setSaved(record);setCandidate(null);setVertices([]);setReplace(false);
   setNotice(result.replaced?'Perímetro anterior archivado localmente; nuevo contorno conservado.':
    'Perímetro guardado como fuente declarada, todavía sin zonificación.');
   window.dispatchEvent(new Event('ambienta:spatial-updated'));
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo guardar el perímetro.');}
  finally{setBusy(false);}
 }
 function adjustQueryWindow(){
  if(!saved)return;
  try{
   const suggested=suggestWindowForBounds(saved.bounds);
   const existing=readPointAoi(aoiKey(IS_DIABLILLOS_CASE));
   if(existing&&!window.confirm('Esto cambiará la ventana de CONSULTA, no el perímetro. ¿Querés ajustarla a la geometría guardada?'))return;
   localStorage.setItem(aoiKey(IS_DIABLILLOS_CASE),JSON.stringify(suggested));
   window.dispatchEvent(new Event('ambienta:perimeter-aoi-updated'));
   window.dispatchEvent(new Event('ambienta:spatial-updated'));
   setNotice('Ventana de consulta ajustada a la extensión del perímetro. El contorno original no se modificó.');
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo definir la ventana.');}
 }
 const bounds=candidate?validatePerimeterGeoJson(candidate.geojson).bounds:saved?.bounds;
 return <section className="geo-perimeter-editor" data-perimeter-editor="true">
  <header className="geo-perimeter-head"><div>
   <small>01 · DELIMITACIÓN PROPIA · ÁREA DE ESTUDIO</small>
   <h3>Definir el perímetro real de trabajo</h3>
   <p>Importá un límite respaldado o dibujá uno siguiendo el relieve y las instalaciones visibles.
    La geometría no se convierte en «oficial» hasta que se documente su procedencia.</p>
  </div><span>FUENTE DECLARADA · NO CERTIFICADA</span></header>
  <div className="geo-perimeter-toolbar">
   <button type="button" aria-pressed={drawing} onClick={()=>{setDrawing(x=>!x);setCandidate(null);setError('');}}>
    {drawing?'Salir del modo dibujo':'Dibujar perímetro en el mapa'}</button>
   <label>Importar GeoJSON / KML
    <input type="file" accept=".geojson,.json,.kml,application/geo+json,application/vnd.google-earth.kml+xml"
     aria-label="Importar perímetro GeoJSON o KML" onChange={e=>void chooseFile(e)}/></label>
   <button type="button" disabled={!vertices.length} onClick={()=>{setVertices(v=>v.slice(0,-1));setCandidate(null);}}>
    Deshacer último vértice</button>
   <button type="button" disabled={vertices.length<3} onClick={draftFromDrawing}>
    Cerrar y validar dibujo</button>
   <button type="button" onClick={()=>{setVertices([]);setCandidate(null);setDrawing(false);setError('');}}>
    Limpiar borrador</button>
  </div>
  <p className="geo-perimeter-guidance">Acercá el mapa con + y desplazalo arrastrando.
   Activá «Dibujar perímetro», agregá vértices alrededor del área y cerrá el dibujo.
   No es obligatorio crear un rectángulo ni dividirlo en cuatro franjas.</p>
  <PerimeterDrawMap vertices={vertices} onAdd={addVertex} enabled={drawing}
   center={aoi?.center??null} bounds={bounds??null}/>
  <div className="geo-perimeter-meta">
   <span data-perimeter-vertices="true">{vertices.length} vértices del trazado actual</span>
   {candidate&&<span data-perimeter-candidate="true">Fuente preparada: {candidate.sourceName} ·
    {candidate.geojson.features[0].geometry.type}</span>}
   {saved&&<span data-perimeter-saved="true"><b>Perímetro guardado:</b> {saved.sourceName} ·
    {saved.sourceType==='drawn'?'Dibujo manual':'Archivo importado'} · sin zonificación automática</span>}
  </div>
  {candidate&&<div className="geo-perimeter-save">
   <label>Origen y justificación del perímetro
    <input aria-label="Procedencia del perímetro" required maxLength={180}
     placeholder="Ej.: GeoJSON entregado por consultora; fecha y responsable"
     value={description} onChange={e=>setDescription(e.target.value)}/></label>
   {saved&&<label className="geo-perimeter-replace">
    <input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)}/>
    Confirmo reemplazar el perímetro anterior (se archivará una copia local)
   </label>}
   <button type="button" disabled={busy||!description.trim()||(!!saved&&!replace)} onClick={()=>void persist()}>
    Guardar este perímetro</button>
  </div>}
  {saved&&<div className="geo-perimeter-saved-actions">
   <button type="button" onClick={adjustQueryWindow}>Ajustar ventana de consulta a este perímetro</button>
   <button type="button" onClick={()=>{
    const text=JSON.stringify(saved.geojson,null,2);
    download('ambienta-perimetro-declarado.geojson',text,'application/geo+json');
   }}>Exportar perímetro guardado</button>
   {saved.rawText&&<button type="button" onClick={()=>{
    download(saved.sourceName,saved.rawText,
     saved.sourceType==='kml'?'application/vnd.google-earth.kml+xml':'application/geo+json');
   }}>Descargar archivo original</button>}
   {saved&&<small>SHA-256 de origen: <code>{saved.sourceSha256.slice(0,22)}…</code>
    · {saved.createdAt}</small>}
  </div>}
  {error&&<p className="geo-perimeter-error" role="alert">{error}</p>}
  {notice&&<p role="status" className="geo-perimeter-notice">{notice}</p>}
  <p className="geo-perimeter-disclaimer">La ventana de consulta no es el perímetro.
   Los límites cargados o trazados por usuario no se verifican contra catastro, concesiones o permisos.
   Las subáreas son opcionales y se gestionan por separado, sin alterar el contorno fuente.</p>
 </section>;
}
