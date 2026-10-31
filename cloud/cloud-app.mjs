import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY } from './config.mjs';
import { createEnvironmentalRepository } from './repository.mjs';
import { escapeHtml as h,statusLabel,summariseProject,linksForMeasure,nameFor,noRegulatoryApproval } from './view-model.mjs';

const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
const repository=createEnvironmentalRepository(client);
const ui=document.getElementById('workspace');
const sessionUi=document.getElementById('session');
const notice=document.getElementById('notification');
const state={user:null,projects:[],data:null,screen:'projects',tab:'overview',authMode:'signin',
  editor:null,busy:false,loading:true};
let activeRequest=0;

function notify(message,ok=false){
  notice.textContent='';
  if(!message)return;
  const box=document.createElement('div');
  box.className='cloud-alert'+(ok?' success':'');
  box.textContent=message;
  notice.appendChild(box);
}
function input(name,label,type='text',value='',required=true){
  return '<label>'+h(label)+'<input name="'+h(name)+'" type="'+h(type)+'" value="'+h(value)+
    '"'+(required?' required':'')+(type==='password'?' autocomplete="current-password"':'')+'></label>';
}
function textarea(name,label){
  return '<label>'+h(label)+'<textarea name="'+h(name)+'" required maxlength="2000"></textarea></label>';
}
function select(name,label,records,sel=null){
  return '<label>'+h(label)+'<select name="'+h(name)+'" required>'+
    records.map(x=>'<option value="'+h(x.value)+'"'+(x.value===sel?' selected':'')+'>'+h(x.label)+'</option>').join('')+'</select></label>';
}
function choices(rows,id='id',name='name'){return rows.map(x=>({value:x[id],label:x[name]}));}
function control(label,action,secondary=false){
 return '<button type="button" class="'+(secondary?'cloud-secondary':'cloud-primary')+'" data-action="'+h(action)+'"'+
  (state.busy?' disabled':'')+'>'+h(label)+'</button>';
}
function formControls(){
 return '<div class="cloud-actions"><button class="cloud-primary" type="submit"'+(state.busy?' disabled':'')+
 '>Guardar en Supabase</button>'+control('Cancelar','cancel',true)+'</div>';
}
function authView(){
 const signup=state.authMode==='signup';
 return '<div class="cloud-auth"><div class="cloud-card"><p class="cloud-eyebrow">ACCESO A PROYECTOS PRIVADOS</p>'+
   '<h1>'+ (signup?'Crear cuenta ambiental':'Ingresar a la plataforma') +'</h1>'+
   '<p class="cloud-muted">Este espacio almacena datos reales en Supabase y exige iniciar sesión. El modo demostración continúa separado.</p>'+
   '<div class="cloud-auth-choices">'+
   '<button class="'+(signup?'cloud-quiet':'cloud-primary')+'" type="button" data-action="signin-mode">Iniciar sesión</button>'+
   '<button class="'+(signup?'cloud-primary':'cloud-quiet')+'" type="button" data-action="signup-mode">Crear cuenta</button></div>'+
   '<form class="cloud-form" data-form="auth">'+input('email','Correo electrónico','email')+
   input('password','Contraseña','password')+
   '<button class="cloud-primary" type="submit">'+(signup?'Crear cuenta':'Iniciar sesión')+'</button></form>'+
   '<p class="cloud-muted">Si creás una cuenta, Supabase puede requerir confirmación por correo antes de habilitar el acceso.</p>'+
   '</div></div>';
}
function listView(){
 return '<div class="cloud-content"><header class="cloud-header"><div>'+
  '<p class="cloud-eyebrow">MIS PROYECTOS · ESPACIO SEGURO</p><h1>Expedientes ambientales</h1>'+
  '<p>Solo aparecen los expedientes del usuario autenticado. No se importan automáticamente datos de la demostración.</p>'+
  '</div>'+control('＋ Nuevo expediente','create-project')+'</header>'+
  (state.projects.length?'<div class="cloud-grid">'+state.projects.map(p=>
   '<article class="cloud-card"><p class="cloud-eyebrow">'+h(p.province)+' · '+h(p.project_phase)+'</p>'+
   '<h2>'+h(p.name)+'</h2><p class="cloud-muted">Estado: '+h(statusLabel(p.status))+
   '<br>Creado: '+h((p.created_at||'').slice(0,10))+'</p>'+
   '<div class="cloud-actions"><button type="button" class="cloud-primary" data-select="'+h(p.id)+'">Abrir expediente</button></div></article>'
  ).join('')+'</div>':'<div class="cloud-card cloud-empty">Todavía no hay proyectos. Creá el primero para registrar impactos, PGA y monitoreo.</div>')+
  '<p class="cloud-blurb">'+h(noRegulatoryApproval)+'</p></div>';
}
const tabs=[['overview','Resumen'],['impacts','Impactos'],['programs','Programas PGA'],
 ['measures','Medidas'],['inspections','Monitoreo'],['evidence','Evidencias'],['findings','Auditorías']];
function stats(data){
 const x=summariseProject(data);
 return '<div class="cloud-totals">'+[
   ['Impactos',x.impacts],['Programas',x.programs],['Medidas',x.measures],
   ['Inspecciones',x.inspections],['Evidencias',x.evidence],['Hallazgos',x.findings]
 ].map(([k,v])=>'<div class="cloud-total"><b>'+v+'</b><span>'+k+'</span></div>').join('')+'</div>';
}
function table(headers,rows){
 if(!rows.length)return '<div class="cloud-empty">Todavía no hay registros en esta sección.</div>';
 return '<div class="cloud-table-wrap"><table class="cloud-table"><thead><tr>'+headers.map(x=>'<th>'+h(x)+'</th>').join('')+
 '</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function cloudDataView(){
 const d=state.data,counts=summariseProject(d);
 const title=d.project.name,pr=d.project;
 return '<div class="cloud-content"><header class="cloud-header"><div><p class="cloud-eyebrow">'+
   'EXPEDIENTE PRIVADO / '+h(pr.province)+'</p><h1>'+h(title)+'</h1>'+
   '<p>'+h(pr.activity_type||'Actividad no indicada')+' · '+h(statusLabel(pr.status))+
   ' · Responsable técnico: '+h(pr.technical_lead||'Por designar')+'</p></div>'+
   control('← Mis expedientes','back-projects',true)+'</header>'+
   '<nav class="cloud-nav" aria-label="Secciones del expediente">'+tabs.map(([id,label])=>
      '<button type="button" data-tab="'+h(id)+'" class="'+(state.tab===id?'active':'')+'">'+h(label)+'</button>').join('')+
   '</nav>'+(state.editor?editorView(d):sectionView(d,counts))+
   '<div class="cloud-blurb">Los registros se guardan en Supabase con políticas de acceso por propietario. '+
   'No hay aprobación normativa automática, roles de revisión, almacenamiento de archivos ni certificados ambientales.</div></div>';
}
function sectionView(d,c){
 if(state.tab==='overview')return '<div class="cloud-card"><p class="cloud-eyebrow">RESUMEN Y TRAZABILIDAD</p>'+
  '<h2>Estado del expediente</h2>'+stats(d)+'<p class="cloud-muted">Creado: '+h(d.project.created_at?.slice(0,10))+
  ' · Código interno: '+h(d.project.id)+'</p><p class="cloud-muted">Primero registrá un impacto y un programa para poder crear una medida vinculada.</p></div>';
 const spec={
  impacts:['Impactos ambientales','create-impact',c.impacts],programs:['Programas del PGA','create-program',c.programs],
  measures:['Medidas de gestión','create-measure',c.measures],inspections:['Inspecciones','create-inspection',c.inspections],
  evidence:['Referencias documentales','create-evidence',c.evidence],findings:['Auditorías y acciones correctivas','create-finding',c.findings]
 };
 const [title,action,count]=spec[state.tab];
 let rows=[],heads=[],extra='';
 if(state.tab==='impacts'){heads=['Código e impacto','Factor','Etapa','Valoración'];rows=d.environmental_impacts.map(x=>
  ['<strong>'+h(x.code)+'</strong>'+h(x.title),h(x.factor),h(x.project_phase),h(statusLabel(x.assessment_status))]);}
 if(state.tab==='programs'){heads=['Código y programa','Categoría'];rows=d.management_programs.map(x=>
  ['<strong>'+h(x.code)+'</strong>'+h(x.name),h(x.category)]);}
 if(state.tab==='measures'){heads=['Medida','Programa','Impactos','Indicador','Estado'];rows=d.management_measures.map(x=>[
  '<strong>'+h(x.title)+'</strong><small>'+h(x.owner_label)+'</small>',
  h(nameFor(d.management_programs,x.program_id)),
  linksForMeasure(d,x.id).map(v=>h(v.code)).join(', ')||'Sin referencia cargada',
  h(x.indicator),'<span class="cloud-tag pending">'+h(statusLabel(x.status))+'</span>']);}
 if(state.tab==='inspections'){heads=['Medida','Fecha','Resultado','Observación'];rows=d.monitoring_inspections.map(x=>
  [h(nameFor(d.management_measures,x.measure_id,'title')),h(x.scheduled_for),h(statusLabel(x.result)),h(x.note)]);}
 if(state.tab==='evidence'){heads=['Referencia','Medida','Estado','Archivo privado'];rows=d.environmental_evidence.map(x=>
  [h(x.label)+'<small>'+h(x.reference_label)+'</small>',h(nameFor(d.management_measures,x.measure_id,'title')),
   '<span class="cloud-tag pending">'+h(statusLabel(x.status))+'</span>',
   x.storage_path?'<button type="button" class="cloud-secondary" data-download="'+h(x.id)+'">↓ Descargar</button>':'Sin adjunto']);}
 if(state.tab==='findings'){heads=['Hallazgo','Inspección','Severidad','Estado'];rows=d.audit_findings.map(x=>
  ['<strong>'+h(x.title)+'</strong>'+h(x.description),h(x.inspection_id),h(statusLabel(x.severity)),h(statusLabel(x.status))]);
  extra='<div class="cloud-card"><div class="cloud-header"><h2>Acciones correctivas ('+c.actions+')</h2>'+
  control('＋ Registrar acción','create-corrective',true)+'</div>'+
  table(['Acción','Responsable','Estado'],d.corrective_actions.map(x=>[h(x.action),h(x.owner_label),h(statusLabel(x.status))]))+'</div>';
 }
 return '<div class="cloud-card"><div class="cloud-header"><div><p class="cloud-eyebrow">REGISTROS DEL EXPEDIENTE</p>'+
  '<h2>'+h(title)+' ('+count+')</h2></div>'+control('＋ Nuevo registro',action)+'</div>'+
  table(heads,rows)+'</div>'+extra;
}
function editorView(d){
 let title='',inputs='',intro='';
 const ed=state.editor;
 if(ed==='create-project'){
   title='Nuevo expediente ambiental';
   inputs=input('name','Nombre del proyecto')+input('province','Provincia','text','Salta')+
    input('activity_type','Tipo de actividad','text','',false)+input('proponent','Proponente','text','',false);
 }else if(ed==='create-impact'){
   title='Registrar impacto';inputs=input('code','Código del impacto')+input('title','Descripción del impacto')+
   input('factor','Factor ambiental')+input('project_phase','Fase del proyecto','text','construction')+
   select('sign','Signo',[{value:'negative',label:'Negativo'},{value:'positive',label:'Positivo'},{value:'uncertain',label:'Por determinar'}]);
 }else if(ed==='create-program'){
   title='Nuevo programa de gestión';inputs=input('code','Código del programa')+input('name','Nombre del programa')+input('category','Categoría');
 }else if(ed==='create-measure'){
   title='Nueva medida vinculada';
   if(!d.management_programs.length||!d.environmental_impacts.length)
     return '<div class="cloud-card"><h2>Necesitás un programa y un impacto</h2>'+
       '<p>Para preservar la trazabilidad, primero registrá un impacto y un programa.</p>'+control('Volver','cancel')+'</div>';
   inputs=select('programId','Programa de gestión',choices(d.management_programs))+
    select('impactId','Impacto asociado',d.environmental_impacts.map(x=>({value:x.id,label:x.code+' · '+x.title})))+
    input('title','Nombre de la medida')+textarea('description','Descripción técnica')+input('owner','Responsable')+
    input('indicator','Indicador')+input('criterion','Criterio de verificación')+
    input('frequency','Frecuencia','text','Semanal')+input('dueDate','Fecha prevista','date','',false);
 }else if(ed==='create-inspection'){
   title='Registrar inspección';
   if(!d.management_measures.length)return '<div class="cloud-card">Primero agregá una medida. '+control('Volver','cancel')+'</div>';
   inputs=select('measureId','Medida vinculada',choices(d.management_measures,'id','title'))+
    input('date','Fecha de inspección','date')+select('result','Resultado',
    [{value:'pending',label:'Pendiente'},{value:'conformant',label:'Conforme'},
    {value:'observed',label:'Observada'},{value:'not_applicable',label:'No aplica'}])+
    textarea('note','Observaciones del seguimiento');
 }else if(ed==='create-evidence'){
   title='Adjuntar evidencia ambiental privada';
   intro='JPG, PNG o PDF de hasta 5 MiB. Se guardará pendiente de revisión, sin certificar su autenticidad.';
   if(!d.management_measures.length)return '<div class="cloud-card">Primero agregá una medida. '+control('Volver','cancel')+'</div>';
   inputs=select('measureId','Medida vinculada',choices(d.management_measures,'id','title'))+
   input('label','Descripción de evidencia')+
   '<label>Archivo privado (máximo 5 MiB)<input name="file" type="file" required accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"></label>';
 }else if(ed==='create-finding'){
   title='Registrar hallazgo de auditoría';
   if(!d.monitoring_inspections.length)return '<div class="cloud-card">Primero registrá una inspección. '+control('Volver','cancel')+'</div>';
   inputs=select('inspectionId','Inspección relacionada',d.monitoring_inspections.map(x=>({
    value:x.id,label:x.scheduled_for+' · '+nameFor(d.management_measures,x.measure_id,'title')})))+
   input('title','Nombre del hallazgo')+textarea('description','Descripción técnica')+
   select('severity','Severidad',[{value:'observation',label:'Observación'},
   {value:'minor',label:'Menor'},{value:'major',label:'Mayor'}]);
 }else if(ed==='create-corrective'){
   title='Acción correctiva';
   if(!d.audit_findings.length)return '<div class="cloud-card">Primero registrá un hallazgo. '+control('Volver','cancel')+'</div>';
   inputs=select('findingId','Hallazgo vinculado',choices(d.audit_findings,'id','title'))+
   textarea('action','Acción correctiva')+input('owner','Responsable')+input('dueDate','Vencimiento','date','',false);
 }
 return '<div class="cloud-card"><p class="cloud-eyebrow">NUEVO REGISTRO · SUPABASE</p><h2>'+h(title)+'</h2>'+
  (intro?'<p class="cloud-muted">'+h(intro)+'</p>':'')+
  '<form class="cloud-form" data-form="'+h(ed)+'">'+inputs+
  '<div class="cloud-actions"><button class="cloud-primary" type="submit">Guardar registro</button>'+
  control('Cancelar','cancel',true)+'</div></form></div>';
}
function render(){
  if(state.loading){ui.innerHTML='<div class="cloud-loading">Verificando sesión segura…</div>';return;}
  const email=state.user?.email;
  sessionUi.innerHTML=email?'<small>'+h(email)+'</small>'+control('Cerrar sesión','logout',true):'';
  if(!state.user){ui.innerHTML=authView();return;}
  if(state.editor==='create-project'){ui.innerHTML='<div class="cloud-content">'+editorView({})+'</div>';return;}
  ui.innerHTML=state.screen==='detail'&&state.data?cloudDataView():listView();
}
async function reloadProjects(){
 state.projects=await repository.listProjects();
}
async function openProject(id){
 state.loading=true;render();
 try{state.data=await repository.loadProject(id);state.screen='detail';state.tab='overview';state.editor=null;}
 finally{state.loading=false;render();}
}
async function init(){
 const id=++activeRequest;
 state.loading=true;render();
 try{
  const {data,error}=await client.auth.getUser();
  if(error&&error.name!=='AuthSessionMissingError')throw error;
  if(id!==activeRequest)return;
  state.user=data?.user||null;
  if(state.user)await reloadProjects();
  if(id!==activeRequest)return;
  if(!state.user){state.projects=[];state.data=null;state.screen='projects';state.editor=null;}
 }catch(error){if(id===activeRequest){state.user=null;notify(error.message||'Error de sesión');}}
 finally{if(id===activeRequest){state.loading=false;render();}}
}
async function execute(action,payload){
 const p=state.data?.project.id;
 if(action==='create-project'){
  const project=await repository.createProject(payload);
  await reloadProjects();return openProject(project.id);
 }
 if(!p)throw Error('Elegí un expediente antes de registrar datos.');
 if(action==='create-impact')await repository.createImpact(p,payload);
 else if(action==='create-program')await repository.createProgram(p,payload);
 else if(action==='create-measure')await repository.createMeasure(p,payload);
 else if(action==='create-inspection')await repository.createInspection(p,payload.measureId,payload);
 else if(action==='create-evidence')await repository.uploadEvidenceFile(p,payload.measureId,payload);
 else if(action==='create-finding')await repository.createFinding(p,payload.inspectionId,payload);
 else if(action==='create-corrective')await repository.createCorrectiveAction(p,payload.findingId,payload);
 state.data=await repository.loadProject(p);
 state.editor=null;
}
async function handleForm(form){
 if(state.busy)return;
 const values=Object.fromEntries(new FormData(form));
 const action=form.dataset.form;
 state.busy=true;
 try{
  if(action==='auth'){
   const email=String(values.email||'').trim(),password=String(values.password||'');
   if(!email||password.length<6)throw Error('Ingresá un correo y una contraseña de al menos 6 caracteres.');
   const result=state.authMode==='signup'
      ?await client.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+window.location.pathname}})
      :await client.auth.signInWithPassword({email,password});
   if(result.error)throw result.error;
   if(state.authMode==='signup'&&!result.data?.session){
    notify('Cuenta registrada. Revisá tu correo para confirmar la dirección antes de ingresar.',true);
    state.authMode='signin';
   }else{notify('Sesión iniciada correctamente.',true);await init();}
  }else{
   await execute(action,values);
   notify('Registro guardado en Supabase.',true);
  }
 }catch(error){notify(error.message||'No se pudo completar la operación.');}
 finally{state.busy=false;render();}
}
ui.addEventListener('submit',event=>{
 const form=event.target.closest('form[data-form]');
 if(!form)return;
 event.preventDefault();handleForm(form);
});
ui.addEventListener('click',async event=>{
 const elem=event.target.closest('[data-action],[data-select],[data-tab],[data-download]');
 if(!elem||state.busy)return;
 if(elem.dataset.download){
   const item=state.data?.environmental_evidence?.find(x=>x.id===elem.dataset.download);
   if(!item||!item.storage_path){notify('Archivo no encontrado en este expediente.');return;}
   state.busy=true;
   try{
     const {blob,name}=await repository.downloadEvidence(item);
     const url=URL.createObjectURL(blob);
     const anchor=document.createElement('a');anchor.href=url;anchor.download=String(name).split(/[\\/]/).pop();
     document.body.appendChild(anchor);anchor.click();anchor.remove();
     setTimeout(()=>URL.revokeObjectURL(url),10000);
     notify('Archivo privado descargado.',true);
   }catch(error){notify(error.message||'Error de descarga.');}
   finally{state.busy=false;}
   return;
 }
 if(elem.dataset.select){state.loading=true;render();try{await openProject(elem.dataset.select);}catch(e){state.loading=false;state.screen='projects';notify(e.message);render();}return;}
 if(elem.dataset.tab){state.tab=elem.dataset.tab;state.editor=null;render();return;}
 const action=elem.dataset.action;
 if(action==='signin-mode'||action==='signup-mode'){state.authMode=action==='signup-mode'?'signup':'signin';notify('');render();return;}
 if(action==='cancel'){state.editor=null;render();return;}
 if(action==='back-projects'){state.screen='projects';state.editor=null;state.data=null;render();return;}
 if(action?.startsWith('create-')){state.editor=action;render();return;}
});
sessionUi.addEventListener('click',async e=>{
 if(!e.target.closest('[data-action="logout"]')||state.busy)return;
 state.busy=true;
 try{
   const {error}=await client.auth.signOut();
   if(error)throw error;
   ++activeRequest;state.user=null;state.data=null;state.projects=[];state.editor=null;state.screen='projects';
   notify('Sesión cerrada.',true);
 }catch(error){notify(error.message);}
 finally{state.busy=false;state.loading=false;render();}
});
const {data:listener}=client.auth.onAuthStateChange((event)=>{
 if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='TOKEN_REFRESHED'){
   // Do not call Supabase async APIs from inside the auth callback.
   if(event==='SIGNED_OUT')queueMicrotask(()=>init());
 }
});
window.addEventListener('pagehide',()=>listener.subscription.unsubscribe(),{once:true});
init();
