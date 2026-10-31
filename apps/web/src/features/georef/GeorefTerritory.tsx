import {useEffect,useState,type FormEvent,type ChangeEvent} from 'react';
// @ts-ignore: validated administrative polygons in native JS module
import {adminBoundaryKey,readAdminBoundary,validateAdminBoundary} from './admin-boundary.mjs';
import {MapPin,RefreshCcw} from 'lucide-react';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
// @ts-ignore: reused native pure JS client, tested in Node
import {queryGeoref,readTerritory,georefStorageKey,GEOREF_CITATION,GEOREF_LICENSE,cleanTerritorialSelection} from './georef-service.mjs';
export type TerritoryFocus={lat:number;lon:number;zoom:number;seq:number};
type Admin={id:string;name:string;lat:number;lon:number;provinciaId:string;departamentoId:string;source:string};
export type BoundaryOverlay={
 geojson:{type:'FeatureCollection';features:unknown[]};bounds:number[];sha256:string;
 admin:{type:'provincias'|'departamentos';id:string;provinceId:string};
 verification:'operator_declared_unverified';sourceUrl:string;savedAt:string;fileName:string
};
type Props={onFocus:(focus:TerritoryFocus)=>void;onBoundary:(value:BoundaryOverlay|null)=>void};
const key=georefStorageKey(IS_DIABLILLOS_CASE);
const saved=()=>readTerritory(key);
function errText(error:unknown){return error instanceof Error?error.message:'Error de consulta al servicio Georef.';}
export function GeorefTerritory({onFocus,onBoundary}:Props){
 const bkey=adminBoundaryKey(IS_DIABLILLOS_CASE);
 const [boundary,setBoundary]=useState<BoundaryOverlay|null>(()=>readAdminBoundary(bkey));
 const [boundaryUrl,setBoundaryUrl]=useState('');
 const [boundaryError,setBoundaryError]=useState('');
 const [boundaryBusy,setBoundaryBusy]=useState(false);
 const [provinces,setProvinces]=useState<Admin[]>([]);
 const [departments,setDepartments]=useState<Admin[]>([]);
 const [municipalities,setMunicipalities]=useState<Admin[]>([]);
 const [localities,setLocalities]=useState<Admin[]>([]);
 const [pId,setPId]=useState(()=>saved()?.province.id|| (IS_DIABLILLOS_CASE?'66':''));
 const [dId,setDId]=useState(()=>saved()?.department?.id||'');
 const [mId,setMId]=useState(()=>saved()?.municipality?.id||'');
 const [lId,setLId]=useState(()=>saved()?.locality?.id||'');
 const [search,setSearch]=useState('');
 const [stored,setStored]=useState<ReturnType<typeof saved>>(saved);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [status,setStatus]=useState('');
 const [lookupSeq,setLookupSeq]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  queryGeoref('provincias',{max:50},{signal:controller.signal}).then((result:{items:Admin[]})=>setProvinces(result.items.sort((a,b)=>a.name.localeCompare(b.name,'es'))))
   .catch((e:unknown)=>{if(!controller.signal.aborted)setError(errText(e));});
  return ()=>controller.abort();
 },[lookupSeq]);
 useEffect(()=>{
  setDepartments([]);setMunicipalities([]);
  if(!pId)return;
  const controller=new AbortController();
  setLoading(true);setError('');
  Promise.all([
   queryGeoref('departamentos',{provincia:pId,max:100},{signal:controller.signal}),
   queryGeoref('municipios',{provincia:pId,max:100},{signal:controller.signal})
  ]).then(([a,b]:[{items:Admin[]},{items:Admin[]}])=>{
   setDepartments(a.items.sort((x,y)=>x.name.localeCompare(y.name,'es')));
   setMunicipalities(b.items.sort((x,y)=>x.name.localeCompare(y.name,'es')));
  }).catch((e:unknown)=>{if(!controller.signal.aborted)setError(errText(e));})
    .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return ()=>controller.abort();
 },[pId,lookupSeq]);
 async function findLocalities(event:FormEvent){
  event.preventDefault();setError('');setLocalities([]);setLId('');
  if(!pId||search.trim().length<2){setError('Ingresá al menos dos letras y seleccioná una provincia.');return;}
  setLoading(true);
  try{
   const r=await queryGeoref('localidades',{provincia:pId,departamento:dId||'',nombre:search.trim(),max:30});
   setLocalities(r.items);
   if(!r.items.length)setStatus('No se encontraron localidades con esos filtros.');
   else setStatus('Resultados: '+r.items.length+(r.total>30?' de '+r.total+' (afiná la búsqueda).':'')+'.');
  }catch(e){setError(errText(e));}
  finally{setLoading(false);}
 }
 const selectedProvince=provinces.find(x=>x.id===pId);
 const selectedDepartment=departments.find(x=>x.id===dId)||null;
 const selectedMunicipality=municipalities.find(x=>x.id===mId)||null;
 const selectedLocality=localities.find(x=>x.id===lId)||null;
 // Do not treat administrative correspondence as verified project footprint.
 function save(){
  setError('');setStatus('');
  if(!selectedProvince){setError('Seleccioná una provincia obtenida de Georef antes de guardar.');return;}
  try{
   const value=cleanTerritorialSelection({
    province:selectedProvince,department:selectedDepartment,municipality:selectedMunicipality,
    locality:selectedLocality,selectedAt:new Date().toISOString()
   });
   if(!value)throw Error('La referencia territorial no superó la validación.');
   localStorage.setItem(key,JSON.stringify(value));
   setStored(value);setStatus('Referencia administrativa guardada solo en este navegador. NO es el emplazamiento del proyecto.');
  }catch(e){setError(errText(e));}
 }
 function focus(){
  const place=selectedLocality||selectedMunicipality||selectedDepartment||selectedProvince;
  if(!place){setError('Seleccioná primero una unidad territorial.');return;}
  onFocus({lat:place.lat,lon:place.lon,zoom:selectedLocality?10:selectedMunicipality?9:selectedDepartment?8:5.5,seq:Date.now()});
  setStatus('Mapa centrado en el CENTROIDE administrativo. No identifica instalaciones ni el área real del expediente.');
 }
 function clear(){
  localStorage.removeItem(key);setStored(null);setStatus('Referencia local retirada.');setError('');
 }
 async function importBoundary(ev:ChangeEvent<HTMLInputElement>){
  const file=ev.target.files?.[0];ev.target.value='';
  if(!file)return;
  setBoundaryError('');
  if(file.size>1024*1024){setBoundaryError('Límite demasiado grande para este laboratorio (máximo 1 MiB). Preparalo en QGIS sin modificar su identificación.');return;}
  if(!/\.geojson$|\.json$/i.test(file.name)){setBoundaryError('Solo GeoJSON .geojson o .json.');return;}
  if(!/^https:\/\/(www\.)?(argentina\.gob\.ar|datos\.gob\.ar|ign\.gob\.ar)(\/|$)/i.test(boundaryUrl.trim())){
   setBoundaryError('Declarar una URL de fuente oficial argentina.gob.ar, datos.gob.ar o ign.gob.ar. No se verifica automáticamente su autenticidad.');return;
  }
  const t=dId?'departamentos':'provincias',code=dId||pId;
  if(!pId){setBoundaryError('Seleccioná primero una provincia Georef.');return;}
  setBoundaryBusy(true);
  try{
   const bytes=await file.arrayBuffer();
   const text=new TextDecoder().decode(bytes);
   const check=validateAdminBoundary(JSON.parse(text),{type:t,id:code,provinceId:pId});
   const digest=await crypto.subtle.digest('SHA-256',bytes);
   const sha=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
   const next:BoundaryOverlay={...check,geojson:check.geojson as BoundaryOverlay['geojson'],
    admin:{type:t,id:code,provinceId:pId},
    bounds:check.bounds,sha256:sha,
    sourceUrl:boundaryUrl.trim(),savedAt:new Date().toISOString(),
    fileName:file.name.slice(0,130),verification:'operator_declared_unverified'};
   localStorage.setItem(bkey,JSON.stringify(next));
   setBoundary(next);onBoundary(next);setStatus('Límite vectorial local cargado y asociado al ID administrativo. Su procedencia aún NO está verificada.');
  }catch(e){setBoundaryError(errText(e));}
  finally{setBoundaryBusy(false);}
 }
 function removeBoundary(){
  localStorage.removeItem(bkey);setBoundary(null);onBoundary(null);setBoundaryError('');
 }
  return <section className="v2-georef" aria-label="Referencia territorial oficial Georef" data-georef-selector="true">
   <div className="v2-georef-heading"><MapPin size={19}/>
    <div><h3>Georef · normalización territorial oficial</h3>
     <p>Seleccioná unidades administrativas de Argentina. Esta consulta NO determina el perímetro ni la ubicación real del proyecto ambiental.</p></div>
   </div>
   <div className="v2-georef-fields">
    <label>Provincia
     <select aria-label="Provincia Georef" value={pId} onChange={e=>{setPId(e.target.value);setDId('');setMId('');setLId('');setLocalities([]);setStatus('');removeBoundary();}}>
      <option value="">Seleccionar provincia</option>{provinces.map(p=><option key={p.id} value={p.id}>{p.name} (ID {p.id})</option>)}
     </select>
    </label>
    <label>Departamento
     <select aria-label="Departamento Georef" value={dId} onChange={e=>{setDId(e.target.value);setLId('');setLocalities([]);removeBoundary();}} disabled={!pId||loading}>
      <option value="">No seleccionado</option>{departments.map(p=><option key={p.id} value={p.id}>{p.name} (ID {p.id})</option>)}
     </select>
    </label>
    <label>Municipio (selección independiente)
     <select aria-label="Municipio Georef" value={mId} onChange={e=>setMId(e.target.value)} disabled={!pId||loading}>
      <option value="">No seleccionado</option>{municipalities.map(p=><option key={p.id} value={p.id}>{p.name} (ID {p.id})</option>)}
     </select>
    </label>
    <form onSubmit={e=>void findLocalities(e)} className="v2-georef-locality">
     <label>Buscar localidad por nombre
      <input aria-label="Buscar localidad Georef" value={search} onChange={e=>setSearch(e.target.value)} maxLength={90} placeholder="Ej.: Salta, Tartagal, Cachi" />
     </label>
     <button type="submit" disabled={!pId||loading||search.trim().length<2}>Buscar localidades</button>
    </form>
    <label>Localidad encontrada
     <select aria-label="Localidad Georef" value={lId} onChange={e=>setLId(e.target.value)} disabled={!localities.length}>
      <option value="">No seleccionado</option>{localities.map(p=><option key={p.id} value={p.id}>{p.name} (ID {p.id})</option>)}
     </select>
    </label>
   </div>
   <p className="v2-georef-note">La API muestra el <strong>centroide</strong> de cada unidad. El municipio seleccionado puede no corresponder al departamento indicado; esa relación debe comprobarse antes de usarla formalmente. No se descargan límites completos desde este formulario.</p>
   <div className="v2-georef-actions">
    <button type="button" onClick={focus} disabled={!selectedProvince}>Centrar mapa en centroide</button>
    <button type="button" onClick={save} disabled={!selectedProvince}>Guardar referencia local</button>
    <button type="button" className="v2-georef-minor" onClick={()=>setLookupSeq(v=>v+1)} aria-label="Actualizar consulta Georef"><RefreshCcw size={14}/> Actualizar</button>
    {stored&&<button type="button" className="v2-georef-minor" onClick={clear}>Quitar referencia guardada</button>}
   </div>
   {loading&&<p role="status">Consultando Georef…</p>}
   {status&&<p className="v2-georef-status" role="status">{status}</p>}
   {error&&<p className="v2-georef-error" role="alert">{error}</p>}
   {stored&&<div className="v2-georef-saved" data-georef-saved="true">
    <strong>Referencia administrativa local guardada</strong>
    <span>{stored.province.name} ({stored.province.id}) {stored.department?'/ '+stored.department.name+' ('+stored.department.id+')':''} {stored.municipality?'/ Municipio: '+stored.municipality.name:''} {stored.locality?'/ Localidad: '+stored.locality.name:''}</span>
    <small>No incorporada al expediente oficial, no auditada y no compartida con Supabase.</small>
   </div>}
   <div className="v2-admin-boundary" data-boundary-workbench="true">
    <h4>Límites administrativos vectoriales · importación controlada</h4>
    <p>El mapa base IGN permite <strong>ver</strong> divisiones administrativas. Para operaciones SIG, importá un GeoJSON con un único polígono cuya propiedad <code>id</code> coincida con {dId?'el departamento '+dId:'la provincia '+(pId||'elegida')}. No se acepta un centroide ni se convierte en perímetro del proyecto.</p>
    <label>URL pública de procedencia declarada
      <input aria-label="URL de procedencia del límite" type="url" value={boundaryUrl}
        onChange={e=>setBoundaryUrl(e.target.value)} placeholder="https://www.ign.gob.ar/..." maxLength={450}/>
    </label>
    <label className="v2-admin-upload">GeoJSON poligonal con propiedades.id
      <input aria-label="Importar límite administrativo" type="file" accept=".geojson,.json,application/geo+json,application/json"
        disabled={boundaryBusy||!pId} onChange={e=>void importBoundary(e)}/>
    </label>
    {boundaryBusy&&<span role="status">Validando identificador territorial y calculando SHA-256…</span>}
    {boundaryError&&<p role="alert" className="v2-georef-error">{boundaryError}</p>}
    {boundary&&<div className="v2-boundary-ready" data-boundary-loaded="unverified">
      <strong>Límite vectorial local · NO VERIFICADO</strong>
      <span>{boundary.admin.type} · código {boundary.admin.id} · {boundary.fileName}</span>
      <code>SHA-256 {boundary.sha256}</code>
      <small>Origen declarado: {boundary.sourceUrl}. No implica certificación cartográfica, congruencia topológica ni ubicación de Diablillos.</small>
      <button type="button" onClick={removeBoundary}>Quitar límite local</button>
    </div>}
    <p className="v2-georef-note">Los archivos completos Georef pueden superar los límites del navegador: su procesamiento nacional necesita ETL/servidor y revisión de geometrías. En esta etapa solo se admite una entidad de hasta 1 MiB para QA.</p>
   </div>
   <div className="v2-georef-attrib">
    <a href="https://www.argentina.gob.ar/georef/" target="_blank" rel="noreferrer">{GEOREF_CITATION}</a>
    <span> · </span><a href={GEOREF_LICENSE} target="_blank" rel="noreferrer">CC BY 4.0 y condiciones de uso</a>
    <span> · API v2.1 · No representa límites del proyecto.</span>
   </div>
 </section>;
}
export function GeorefSavedSummary(){
 const value=readTerritory(key);
 if(!value)return <p className="v2-panel-note">Sin referencia administrativa Georef guardada en este navegador.</p>;
 return <div className="v2-georef-saved" data-georef-reference="true">
  <strong>Referencia administrativa Georef (solo local)</strong>
  <span>{value.province.name} · ID {value.province.id}{value.department?' · '+value.department.name+' ('+value.department.id+')':''}</span>
  <small>No es el emplazamiento ni la delimitación verificada del proyecto.</small>
 </div>;
}
