/**
 * AMBIENTA WMS laboratory. A valid GetCapabilities response does NOT establish
 * that an organization, layer, licence, measurement or footprint is official.
 * No WMS server is hard-coded. Clients fetch only after explicit user action.
 */
const PARAMS=['service','request','version','layers','styles','format','transparent',
 'srs','crs','bbox','width','height','tiled','exceptions'];
export function normalizeWmsUrl(value){
 if(typeof value!=='string'||value.length>750)throw Error('La URL WMS es obligatoria (máximo 750 caracteres).');
 let u;
 try{u=new URL(value.trim());}catch{throw Error('La URL WMS no es válida.');}
 const host=u.hostname.toLowerCase().replace(/\.$/,'');
 if(u.protocol!=='https:'||u.username||u.password||u.port||
  host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||
  !host.includes('.')||host.includes(':')||/^[\d.]+$/.test(host))
  throw Error('Solo se admiten servidores WMS HTTPS con nombre de dominio público, sin credenciales ni puertos.');
 for(const [k] of u.searchParams){
  if(/(token|key|secret|password|pwd|auth|signature)/i.test(k))
   throw Error('No incluyas claves privadas, tokens o contraseñas en la URL WMS.');
 }
 u.hash='';
 return u;
}
function cleanUrl(raw){
 const u=normalizeWmsUrl(raw);
 for(const k of [...u.searchParams.keys()]){
  if(PARAMS.includes(k.toLowerCase()))u.searchParams.delete(k);
 }
 return u;
}
export function makeCapabilitiesUrl(raw){
 const u=cleanUrl(raw);
 u.searchParams.set('SERVICE','WMS');
 u.searchParams.set('REQUEST','GetCapabilities');
 return u.toString();
}
export function makeWmsTileUrl(raw,layerName){
 if(typeof layerName!=='string'||!/^[\w:.-]{1,180}$/.test(layerName))throw Error('Identificador WMS inválido.');
 const u=cleanUrl(raw);
 for(const [k,v] of Object.entries({
  SERVICE:'WMS',REQUEST:'GetMap',VERSION:'1.1.1',LAYERS:layerName,STYLES:'',
  FORMAT:'image/png',TRANSPARENT:'TRUE',SRS:'EPSG:3857',
  BBOX:'{bbox-epsg-3857}',WIDTH:'256',HEIGHT:'256'
 }))u.searchParams.set(k,v);
 return u.toString().replace(/%7Bbbox-epsg-3857%7D/ig,'{bbox-epsg-3857}');
}
function direct(layer,key){
 return [...layer.children].find(x=>x.localName===key)?.textContent?.trim()||'';
}
export function parseWmsCapabilities(xml,DOMParserImpl=globalThis.DOMParser){
 if(typeof xml!=='string'||xml.length>1_500_000)throw Error('Capabilities vacío o demasiado grande.');
 if(typeof DOMParserImpl!=='function')throw Error('El navegador no dispone de parser XML.');
 const doc=new DOMParserImpl().parseFromString(xml,'application/xml');
 const root=doc.documentElement;
 if(!root||!['WMS_Capabilities','WMT_MS_Capabilities'].includes(root.localName)||
    doc.getElementsByTagName('parsererror').length)throw Error('La respuesta no es un documento WMS GetCapabilities válido.');
 const getmap=[...doc.getElementsByTagName('*')].find(x=>x.localName==='GetMap');
 if(!getmap||![...getmap.getElementsByTagName('*')].some(x=>x.localName==='Format'&&x.textContent?.trim()==='image/png'))
  throw Error('El servicio WMS no anuncia GetMap en image/png.');
 const layers=[...doc.getElementsByTagName('*')].filter(x=>x.localName==='Layer').flatMap(el=>{
  const name=direct(el,'Name');
  if(!/^[\w:.-]{1,180}$/.test(name))return [];
  const crs=[];
  for(let current=el;current&&current.localName==='Layer';current=current.parentElement){
   for(const child of current.children){
    if(child.localName==='SRS'||child.localName==='CRS')crs.push(...(child.textContent||'').trim().split(/\s+/));
   }
  }
  if(!crs.includes('EPSG:3857'))return [];
  return [{name,title:direct(el,'Title').slice(0,140)||name}];
 }).slice(0,80);
 if(!layers.length)throw Error('No hay capas con EPSG:3857 y nombres válidos para la vista actual.');
 return {version:root.getAttribute('version')||'desconocida',
  serviceTitle:[...doc.getElementsByTagName('*')].find(x=>x.localName==='Service')?.textContent?.trim().slice(0,120)||'Servicio WMS declarado',
  layers};
}
