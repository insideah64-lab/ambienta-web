import {useEffect,useState,type FormEvent} from 'react';
import {MapPin,RefreshCcw} from 'lucide-react';
import {IS_DIABLILLOS_CASE} from '../../lib/demo';
// @ts-ignore: reused native pure JS client, tested in Node
import {queryGeoref,readTerritory,georefStorageKey,GEOREF_CITATION,GEOREF_LICENSE,cleanTerritorialSelection} from './georef-service.mjs';
export type TerritoryFocus={lat:number;lon:number;zoom:number;seq:number};
type Admin={id:string;name:string;lat:number;lon:number;provinciaId:string;departamentoId:string;source:string};
type Props={onFocus:(focus:TerritoryFocus)=>void};
const key=georefStorageKey(IS_DIABLILLOS_CASE);
const saved=()=>readTerritory(key);
function errText(error:unknown){return error instanceof Error?error.message:'Error de consulta al servicio Georef.';}
export function GeorefTerritory({onFocus}:Props){
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
 return <section className="v2-georef" aria-label="Referencia territorial oficial Georef" data-georef-selector="true">
   <div className="v2-georef-heading"><MapPin size={19}/>
    <div><h3>Georef · normalización territorial oficial</h3>
     <p>Seleccioná unidades administrativas de Argentina. Esta consulta NO determina el perímetro ni la ubicación real del proyecto ambiental.</p></div>
   </div>
   <div className="v2-georef-fields">
    <label>Provincia
     <select aria-label="Provincia Georef" value={pId} onChange={e=>{setPId(e.target.value);setDId('');setMId('');setLId('');setLocalities([]);setStatus('');}}>
      <option value="">Seleccionar provincia</option>{provinces.map(p=><option key={p.id} value={p.id}>{p.name} (ID {p.id})</option>)}
     </select>
    </label>
    <label>Departamento
     <select aria-label="Departamento Georef" value={dId} onChange={e=>{setDId(e.target.value);setLId('');setLocalities([]);}} disabled={!pId||loading}>
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
