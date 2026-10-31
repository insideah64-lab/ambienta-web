import {VERSION,createDemoState,validateState,summary,measureTrace,addMeasure,
  recordInspection,addEvidence,reviewEvidence,changeMeasureStatus,
  openFinding,addCorrectiveAction,exportJson,STATUS_LABELS} from './domain.mjs';

const STORAGE_KEY='ambienta-pga-demo-v05';
const screen=document.querySelector('#screen');
const modal=document.querySelector('#modal');
const modalContent=document.querySelector('#modal-content');
const nav=document.querySelector('#nav');
const heading=document.querySelector('#heading');
const subtitle=document.querySelector('#subtitle');
const breadcrumb=document.querySelector('#breadcrumb');
const mainAction=document.querySelector('#main-action');
let route='pga',program='all',selectedMeasure='MED-001',searchText='',state;
try {
  state=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')||createDemoState();
  validateState(state);
} catch(error) { state=createDemoState(); }
const titleMap={
  resumen:['Vista general','Resumen de medidas, inspecciones y evidencias del proyecto.'],
  expediente:['Ficha integral del proyecto','Alcance, responsables y fases del expediente ambiental.'],
  pga:['Plan de Gestión Ambiental','Programas, medidas, indicadores y trazabilidad de impactos.'],
  monitoreo:['Monitoreo ambiental','Inspecciones programadas, resultados y evidencia de campo.'],
  auditorias:['Auditorías y hallazgos','No conformidades, acciones correctivas y revisión de desempeño.'],
  historial:['Historial de cambios','Registro local de acciones realizadas en esta demostración.']
};
function escapeHtml(v) {
  return String(v==null?'':v).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}
const h=escapeHtml;
function countBy(array,key,val) {return array.filter(x=>x[key]===val).length;}
function fmtDate(s) {if(!s)return 'Sin fecha';let a=s.split('-');return a.length===3?a[2]+'/'+a[1]+'/'+a[0]:h(s);}
function tag(label,type='') {return '<span class="tag '+h(type)+'">'+h(label)+'</span>';}
function statusTag(s) {
  return tag(STATUS_LABELS[s]||s,s==='borrador'?'gray':s==='verificada'?'blue':s==='en_revision'?'orange':'');
}
function button(label,action,opts={}) {
  return '<button type="button" class="'+(opts.cls||'secondary-btn')+'" data-action="'+h(action)+'"'+
    (opts.id?' data-id="'+h(opts.id)+'"':'')+'>'+h(label)+'</button>';
}
function metric(title,value,note,warning=false) {
  return '<div class="kpi'+(warning?' danger':'')+'"><span>'+h(title)+'</span>'+
    '<strong>'+h(value)+'</strong><small>'+h(note)+'</small></div>';
}
function panel(content,classes='') {
  return '<article class="panel panel-pad '+classes+'">'+content+'</article>';
}
function fields(k,v) {return '<div class="info-field"><label>'+h(k)+'</label><strong>'+h(v)+'</strong></div>';}
function layoutKpis() {
  const k=summary(state);
  return '<div class="kpis">'+metric('PROGRAMAS',k.programs,'Agrupaciones del PGA')+
    metric('MEDIDAS',k.measures,'Medidas de ejemplo y nuevas')+
    metric('INSPECCIONES',k.inspectionsPending,'Programadas')+
    metric('HALLAZGOS',k.findingsOpen,'Abiertos',k.findingsOpen>0)+'</div>';
}
function renderHeader() {
  const [title,desc]=titleMap[route];
  heading.textContent=title;subtitle.textContent=desc;
  breadcrumb.textContent=route.toUpperCase();
  nav.querySelectorAll('[data-route]').forEach(b=>{
    const active=b.dataset.route===route;
    b.classList.toggle('active',active);
    b.setAttribute('aria-current',active?'page':'false');
  });
  const action={pga:['＋ Nueva medida','new-measure'],monitoreo:['＋ Nueva inspección','new-inspection'],
    auditorias:['＋ Registrar hallazgo','new-finding'],historial:['↻ Restaurar demo','reset'],
    resumen:['Ver PGA','go-pga']};
  const a=action[route];
  mainAction.innerHTML=a?button(a[0],a[1],{cls:'primary-btn'}):'';
}
function renderResumen() {
  const k=summary(state);
  const rows=state.measures.slice(0,4).map(m=>
    '<div class="brief-item"><div><b>'+h(m.title)+'</b><br><small>'+h(m.id)+' · '+h(m.owner)+'</small></div>'+statusTag(m.status)+'</div>'
  ).join('');
  return layoutKpis()+'<div class="hero-grid">'+
    panel('<p class="section-cap">EXPEDIENTE AMBIENTAL</p><h2>'+h(state.project.name)+'</h2>'+
      '<p class="muted">Código '+h(state.project.id)+' · Provincia de '+h(state.project.province)+'</p>'+
      '<div class="data-grid stats-row">'+fields('Estado','Borrador sin aprobación')+
      fields('Fase',state.project.phase)+fields('Proponente',state.project.proponent)+
      fields('Responsable',state.project.technicalLead)+'</div>'+
      '<div class="callout">MITA genera productos satelitales y de calidad del aire por separado. Esta interfaz todavía no está conectada al backend de MITA, ni representa una evaluación legal.</div>')+
    panel('<div class="panel-head"><div><p class="section-cap">MEDIDAS ACTIVAS</p><h2>Seguimiento de compromisos</h2></div>'+tag(String(k.measures),'gray')+'</div>'+rows+
      '<p class="muted small">Se necesita revisión profesional de cada evidencia antes de declarar una medida verificada.</p>')+'</div>';
}
function renderExpediente() {
  const p=state.project;
  return '<div class="two-cols">'+
    panel('<div class="panel-head"><div><p class="section-cap">01 / IDENTIFICACIÓN</p><h2>Datos generales del expediente</h2></div>'+tag('Borrador','orange')+'</div>'+
      '<div class="data-grid">'+fields('Nombre del proyecto',p.name)+fields('Código',p.id)+
      fields('Tipo de actividad',p.kind)+fields('Jurisdicción',p.province)+
      fields('Titular / proponente',p.proponent)+fields('Responsable técnico',p.technicalLead)+
      fields('Fase actual',p.phase)+fields('Estado',p.status)+'</div>'+
      '<p class="callout">Pantalla de consulta del expediente demostrativo. La edición multiusuario, firmas y documentos oficiales todavía no están implementados.</p>')+
    panel('<p class="section-cap">02 / CICLO DE VIDA</p><h2>Etapas ambientales</h2>'+
      '<div class="timeline stats-row">'+
      ['Preparación / anteproyecto','Construcción / ejecución','Operación y mantenimiento','Cierre y restauración'].map((v,i)=>
        '<div class="timeline-entry"><div class="timeline-dot">'+String(i+1).padStart(2,'0')+
        '</div><div><b>'+h(v)+'</b><p class="muted small">Acciones, recursos, impactos y responsables por registrar</p></div></div>'
      ).join('')+'</div>'+
      '<div class="callout">Próxima integración: alternativas del proyecto, normativa provincial versionada y campañas de muestreo.</div>')+'</div>';
}
function chooseMeasure() {
  const valid=state.measures.find(x=>x.id===selectedMeasure&&
    (program==='all'||x.programId===program));
  if(!valid) {
    const first=state.measures.find(x=>program==='all'||x.programId===program);
    selectedMeasure=first?first.id:null;
  }
}
function renderInspector() {
  const trace=measureTrace(state,selectedMeasure);
  if(!trace)return panel('<p class="section-cap">INSPECTOR DE MEDIDAS</p><h2>Seleccioná una medida</h2><p class="muted">La información se muestra al seleccionar una fila.</p>');
  const m=trace.measure;
  const evid=trace.evidence.length?trace.evidence.slice(-4).map(e=>
    '<div class="brief-item"><div><b>'+h(e.label)+'</b><br><small>'+h(e.author)+' · '+h(e.reference)+'</small></div>'+
    tag(e.status,e.status==='validada'?'blue':e.status==='rechazada'?'orange':'gray')+'</div>'
  ).join(''):'<div class="empty">No hay evidencias registradas.</div>';
  return panel('<p class="section-cap">DETALLE DE LA MEDIDA</p><h2>'+h(m.title)+'</h2>'+
    '<p class="muted small">'+h(m.id)+' · '+h(trace.program.name)+'</p>'+statusTag(m.status)+
    '<div class="inspector-line"><label>IMPACTOS VINCULADOS</label>'+trace.impacts.map(i=>
    '<p><strong class="linked">'+h(i.id)+'</strong><br>'+h(i.name)+'</p>').join('')+'</div>'+
    '<div class="inspector-line"><label>RESPONSABLE</label><b>'+h(m.owner)+'</b></div>'+
    '<div class="inspector-line"><label>INDICADOR Y CRITERIO</label><p>'+h(m.indicator)+' · '+h(m.frequency)+
    '</p><p class="muted">'+h(m.criterion)+'</p></div>'+
    '<div class="inspector-line"><label>VENCIMIENTO</label><b>'+h(fmtDate(m.due))+'</b></div>'+
    '<div class="inspector-line"><label>EVIDENCIAS ('+trace.evidence.length+')</label>'+evid+'</div>'+
    '<div class="inspector-actions">'+
    button('＋ Registrar referencia de evidencia','new-evidence',{id:m.id,cls:'secondary-btn'})+
    button('Revisar evidencia pendiente','review-evidence',{id:m.id,cls:'mini-action'})+
    button('Cambiar estado de la medida','change-status',{id:m.id,cls:'mini-action'})+
    '</div>');
}
function renderPga() {
  chooseMeasure();
  const counts=state.programs.map(g=>({g,n:state.measures.filter(m=>m.programId===g.id).length}));
  const programs='<div class="program-list">'+
    '<button class="program-item '+(program==='all'?'active':'')+'" data-program="all" type="button"><span class="program-number">◎</span><span class="program-meta"><strong>Todos los programas</strong><small>'+state.measures.length+' medidas</small></span></button>'+
    counts.map(({g,n},i)=>'<button class="program-item '+(g.id===program?'active':'')+
      '" data-program="'+h(g.id)+'" type="button"><span class="program-number">'+String(i+1).padStart(2,'0')+
      '</span><span class="program-meta"><strong>'+h(g.name)+'</strong><small>'+n+' medidas</small></span></button>').join('')+
    '</div>';
  const rows=state.measures.filter(m=>(program==='all'||m.programId===program) &&
    (!searchText||[m.title,m.id,m.owner,m.indicator].join(' ').toLowerCase().includes(searchText)));
  const table='<div class="toolbar"><input id="search" type="search" aria-label="Buscar medidas" placeholder="⌕ Buscar medida, código o responsable" value="'+h(searchText)+'">'+
    '<select id="status-filter" aria-label="Filtrar por estado"><option value="">Todos los estados</option>'+
    Object.entries(STATUS_LABELS).map(([value,label])=>'<option value="'+h(value)+'">'+h(label)+'</option>').join('')+'</select></div>'+
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>MEDIDA</th><th>IMPACTO</th><th>RESPONSABLE</th><th>ESTADO</th></tr></thead><tbody>'+
    rows.map(m=>'<tr data-measure="'+h(m.id)+'" tabindex="0" class="'+(m.id===selectedMeasure?'selected':'')+'">'+
      '<td><strong>'+h(m.title)+'</strong><small>'+h(m.id)+'</small></td>'+
      '<td>'+m.impactIds.map(h).join(', ')+'</td><td>'+h(m.owner)+'</td><td>'+statusTag(m.status)+'</td></tr>').join('')+
    '</tbody></table></div>'+(!rows.length?'<div class="empty">No hay medidas con estos filtros.</div>':'');
  return layoutKpis()+'<div class="pga-grid">'+
    panel('<div class="panel-head"><div><p class="section-cap">PROGRAMAS DEL PGA</p><h2>Explorador</h2></div></div>'+programs)+
    panel('<div class="panel-head"><div><p class="section-cap">CONTROL OPERATIVO</p><h2>Medidas ambientales</h2></div>'+tag(rows.length+' registros')+'</div>'+table)+
    renderInspector()+'</div>';
}
function renderMonitoreo() {
  const k=summary(state);
  const rows=state.inspections.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(i=>{
    const m=state.measures.find(x=>x.id===i.measureId);
    return '<tr><td><strong>'+h(i.id)+'</strong><small>'+h(fmtDate(i.date))+'</small></td>'+
      '<td>'+h(m?m.title:'Medida no disponible')+'</td><td>'+h(i.assignee)+'</td>'+
      '<td>'+tag(i.result,i.result==='conforme'?'blue':i.result==='observada'?'orange':'gray')+'</td></tr>';
  }).join('');
  return '<div class="kpis">'+metric('INSPECCIONES',state.inspections.length,'Programadas o registradas')+
  metric('PENDIENTES',k.inspectionsPending,'Sin resultado de campo')+
  metric('OBSERVADAS',k.inspectionsObserved,'Con observaciones')+
  metric('EVIDENCIAS',state.evidence.length,'Referencias, no archivos',false)+'</div>'+
  '<div class="two-cols">'+panel('<div class="panel-head"><div><p class="section-cap">AGENDA DE CAMPO</p><h2>Registros de inspección</h2></div></div>'+
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>INSPECCIÓN</th><th>MEDIDA ASOCIADA</th><th>RESPONSABLE</th><th>RESULTADO</th></tr></thead><tbody>'+
    rows+'</tbody></table></div>')+
  panel('<p class="section-cap">METODOLOGÍA DE MONITOREO</p><h2>Registros verificables</h2>'+
    '<div class="timeline stats-row">'+
    ['Programar inspección con medida y responsable','Registrar observación, método y fecha','Anexar referencia de evidencia','Revisar evidencia por una segunda persona'].map((v,i)=>
      '<div class="timeline-entry"><div class="timeline-dot">'+(i+1)+'</div><div><b>'+h(v)+'</b>'+
      '<p class="muted small">Paso de control documental y operativo</p></div></div>').join('')+'</div>'+
    '<p class="callout">Los datos no provienen de sensores ni laboratorios reales. Los registros de inspección no validan automáticamente medidas o requisitos legales.</p>')+'</div>';
}
function renderAuditorias() {
  const rows=state.findings.map(f=>{
    const i=state.inspections.find(x=>x.id===f.inspectionId),m=i&&state.measures.find(x=>x.id===i.measureId);
    return '<tr><td><strong>'+h(f.title)+'</strong><small>'+h(f.id)+'</small></td>'+
    '<td>'+h(m?m.id:'Sin medida')+'</td><td>'+tag(f.severity,f.severity==='mayor'?'orange':'gray')+'</td>'+
    '<td>'+tag(f.status)+'</td></tr>';
  }).join('');
  const acts=state.correctiveActions.map(a=>{
    const found=state.findings.find(f=>f.id===a.findingId);
    return '<div class="brief-item"><div><b>'+h(a.action)+'</b><br><small>'+h(found?found.id:'')+
      ' · '+h(a.owner)+' · vence '+h(fmtDate(a.due))+'</small></div>'+tag(a.status,'orange')+'</div>';
  }).join('');
  return '<div class="kpis">'+metric('HALLAZGOS',state.findings.length,'Registrados')+
    metric('ABIERTOS',countBy(state.findings,'status','abierto'),'En investigación',true)+
    metric('ACCIONES',state.correctiveActions.length,'Correctivas')+
    metric('SIN CERRAR',countBy(state.correctiveActions,'status','abierta'),'Verificación pendiente',true)+'</div>'+
    '<div class="two-cols">'+panel('<div class="panel-head"><div><p class="section-cap">AUDITORÍA AMBIENTAL</p><h2>Registro de hallazgos</h2></div></div>'+
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>HALLAZGO</th><th>VINCULADO</th><th>SEVERIDAD</th><th>ESTADO</th></tr></thead><tbody>'+
    rows+'</tbody></table></div>'+(!rows?'<div class="empty">No hay hallazgos. Podés registrar uno de ejemplo.</div>':'')+
    '<div style="margin-top:20px">'+button('＋ Nueva acción correctiva','new-corrective')+'</div>')+
    panel('<p class="section-cap">MEJORA CONTINUA</p><h2>Acciones correctivas</h2>'+
    (acts||'<div class="empty">Todavía no hay acciones correctivas.</div>')+
    '<div class="callout">Las acciones permanecen abiertas en esta versión: el cierre formal requiere verificación independiente y se incorporará con el flujo de aprobación y roles.</div>')+
    '</div>';
}
function renderHistorial() {
  return panel('<div class="panel-head"><div><p class="section-cap">CONTROL Y TRAZABILIDAD</p><h2>Bitácora local</h2></div>'+tag(state.audit.length+' eventos')+'</div>'+
    '<p class="muted">Este historial es solo un registro de demostración guardado en el navegador y puede ser alterado por quien tenga acceso al dispositivo. No es una pista de auditoría certificada.</p>'+
    '<div class="timeline stats-row">'+state.audit.slice().reverse().map((a,i)=>
    '<div class="timeline-entry"><div class="timeline-dot">'+h(String(Math.min(99,i+1)))+'</div><div>'+
    '<strong>'+h(a.event)+'</strong><p>'+h(a.details)+'</p><small>'+h(a.actor)+' · '+h(a.at)+'</small></div></div>').join('')+'</div>');
}
function render() {
  renderHeader();
  const pages={resumen:renderResumen,expediente:renderExpediente,pga:renderPga,
    monitoreo:renderMonitoreo,auditorias:renderAuditorias,historial:renderHistorial};
  screen.innerHTML=(pages[route]||renderPga)();
}
let toastTimeout;
function toast(message,error=false) {
  const node=document.getElementById('toast');node.textContent=message;
  node.classList.toggle('error',error);node.classList.add('show');
  clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>node.classList.remove('show'),4200);
}
function commitState(next) {
  validateState(next);
  try {localStorage.setItem(STORAGE_KEY,exportJson(next));}catch(error){
    toast('No pudo guardarse en este navegador. Exportá un respaldo JSON.',true);
  }
  state=next;render();
}
function field(name,label,type='text',options=null,value='') {
  let control;
  if(type==='select') {
    control='<select name="'+h(name)+'" required>'+
      options.map(o=>'<option value="'+h(o.value)+'"'+(o.value===value?' selected':'')+'>'+h(o.label)+'</option>').join('')+'</select>';
  } else if(type==='textarea'){
    control='<textarea name="'+h(name)+'" required rows="3">'+h(value)+'</textarea>';
  }else {
    control='<input name="'+h(name)+'" type="'+h(type)+'" value="'+h(value)+'" required>';
  }
  return '<div class="form-field"><label>'+h(label)+control+'</label></div>';
}
function options(items,id='id',label='name') {return items.map(x=>({value:x[id],label:x[label]}));}
function openDialog(kind,id='') {
  const m=state.measures.find(x=>x.id===id)||state.measures[0];
  let title='',intro='',fields='';
  if(kind==='new-measure') {
    title='Nueva medida ambiental';intro='Creá un registro de borrador vinculado a un impacto real del expediente.';
    fields=field('title','Nombre de la medida')+field('detail','Descripción técnica','textarea')+
      field('programId','Programa PGA','select',options(state.programs),'PG-SUE')+
      field('impactId','Impacto asociado','select',options(state.impacts,'id','name'),'IMP-SUE-004')+
      field('owner','Responsable asignado')+field('indicator','Indicador verificable')+
      field('criterion','Criterio de verificación')+field('frequency','Frecuencia de control','select',
        ['Diaria','Semanal','Quincenal','Mensual','Trimestral'].map(v=>({value:v,label:v})))+
      field('due','Fecha de revisión','date',null,'2026-11-25');
  }else if(kind==='new-inspection'){
    title='Registrar inspección';intro='Registrá una visita de campo con su resultado y observación.';
    fields=field('measureId','Medida asociada','select',options(state.measures,'id','title'),m.id)+
      field('date','Fecha de inspección','date',null,'2026-11-10')+
      field('result','Resultado','select',['pendiente','conforme','observada','no_aplica'].map(v=>({value:v,label:v})))+
      field('assignee','Responsable')+field('note','Observación técnica','textarea');
  }else if(kind==='new-evidence'){
    title='Registrar evidencia';intro='Se guarda solamente la referencia documental. No se suben archivos.';
    fields=field('measureId','Medida','select',options(state.measures,'id','title'),m.id)+
      field('label','Descripción del respaldo')+field('reference','Nombre de archivo, acta o código')+
      field('actor','Autor del registro','text',null,'Técnico de demostración');
  }else if(kind==='review-evidence'){
    const pending=state.evidence.filter(e=>e.measureId===id&&e.status==='pendiente');
    if(!pending.length){toast('Esta medida no tiene evidencias pendientes de revisión.',true);return;}
    title='Revisar evidencia';intro='Una persona distinta del autor debe revisar la referencia registrada.';
    fields=field('evidenceId','Evidencia pendiente','select',pending.map(e=>({value:e.id,label:e.label+' · '+e.author})))+
      field('decision','Decisión','select',[{value:'validada',label:'Validar referencia'},{value:'rechazada',label:'Rechazar referencia'}])+
      field('reviewer','Nombre del revisor');
  }else if(kind==='change-status'){
    title='Actualizar estado';intro='El estado verificada exige inspección conforme y evidencia validada.';
    fields=field('measureId','Medida','select',options(state.measures,'id','title'),m.id)+
      field('status','Estado','select',Object.entries(STATUS_LABELS).map(([value,label])=>({value,label})),m.status)+
      field('actor','Responsable de actualización','text',null,'Técnico de demostración');
  }else if(kind==='new-finding'){
    title='Registrar hallazgo de auditoría';intro='El hallazgo queda asociado a una inspección del proyecto.';
    if(!state.inspections.length){toast('Primero registrá una inspección.',true);return;}
    fields=field('inspectionId','Inspección relacionada','select',options(state.inspections,'id','id'))+
      field('title','Título del hallazgo')+field('description','Descripción y criterio incumplido','textarea')+
      field('severity','Severidad','select',[{value:'observacion',label:'Observación'},{value:'menor',label:'Menor'},{value:'mayor',label:'Mayor'}])+
      field('actor','Auditor','text',null,'Auditor de demostración');
  }else if(kind==='new-corrective'){
    if(!state.findings.length){toast('Primero registrá un hallazgo.',true);return;}
    title='Nueva acción correctiva';intro='Las acciones quedan abiertas hasta futura verificación independiente.';
    fields=field('findingId','Hallazgo','select',options(state.findings,'id','title'))+
      field('action','Acción correctiva','textarea')+field('owner','Responsable')+
      field('due','Fecha prevista de cierre','date',null,'2026-11-30')+
      field('actor','Auditor','text',null,'Auditor de demostración');
  }else return;
  modalContent.innerHTML='<form id="data-form" data-kind="'+h(kind)+'"><div class="modal-head"><h2>'+
    h(title)+'</h2><p>'+h(intro)+'</p></div><div class="modal-body">'+fields+
    '</div><div class="modal-actions"><button type="button" class="ghost-btn" id="close-modal">Cancelar</button>'+
    '<button type="submit" class="primary-btn">Guardar registro</button></div></form>';
  modal.showModal();
  modalContent.querySelector('#close-modal').addEventListener('click',()=>modal.close());
}
function formSubmit(e) {
  if(e.target.id!=='data-form')return;
  e.preventDefault();
  const form=e.target,kind=form.dataset.kind;
  const entry=Object.fromEntries(new FormData(form));
  try {
    let next=state;
    if(kind==='new-measure')next=addMeasure(state,entry);
    else if(kind==='new-inspection')next=recordInspection(state,entry);
    else if(kind==='new-evidence')next=addEvidence(state,entry,entry.actor);
    else if(kind==='review-evidence')next=reviewEvidence(state,entry.evidenceId,entry.decision,entry.reviewer);
    else if(kind==='change-status')next=changeMeasureStatus(state,entry.measureId,entry.status,entry.actor);
    else if(kind==='new-finding')next=openFinding(state,entry,entry.actor);
    else if(kind==='new-corrective')next=addCorrectiveAction(state,entry,entry.actor);
    modal.close();commitState(next);toast('Registro de demostración guardado en este navegador.');
  }catch(error) {toast(error.message||'No pudo registrarse.',true);}
}
function doAction(a,id) {
  if(['new-measure','new-inspection','new-evidence','review-evidence','change-status','new-finding','new-corrective'].includes(a))
    return openDialog(a,id);
  if(a==='go-pga'){route='pga';return render();}
  if(a==='reset'){
    if(!window.confirm('¿Restaurar los datos ficticios de ejemplo y perder los cambios locales?'))return;
    state=createDemoState();program='all';selectedMeasure='MED-001';searchText='';
    localStorage.setItem(STORAGE_KEY,exportJson(state));render();toast('Datos ficticios restaurados.');
  }
}
nav.addEventListener('click',e=>{
  const item=e.target.closest('[data-route]');
  if(!item)return;
  route=item.dataset.route;render();
  document.querySelector('#main').scrollIntoView({behavior:'smooth',block:'start'});
});
document.querySelector('#main-action').addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(b)doAction(b.dataset.action,b.dataset.id);
});
screen.addEventListener('click',e=>{
  const item=e.target.closest('[data-measure]');
  if(item){selectedMeasure=item.dataset.measure;render();return;}
  const p=e.target.closest('[data-program]');
  if(p){program=p.dataset.program;selectedMeasure=null;render();return;}
  const btn=e.target.closest('[data-action]');
  if(btn)doAction(btn.dataset.action,btn.dataset.id);
});
screen.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-measure]')){
    e.preventDefault();selectedMeasure=e.target.dataset.measure;render();
  }
});
screen.addEventListener('input',e=>{
  if(e.target.id==='search'){
    const pos=e.target.selectionStart;searchText=e.target.value.toLowerCase();
    render();const input=screen.querySelector('#search');
    input.focus();try{input.setSelectionRange(pos,pos);}catch(error){}
  }
});
screen.addEventListener('change',e=>{
  if(e.target.id==='status-filter'){
    const value=e.target.value;
    screen.querySelectorAll('[data-measure]').forEach(row=>{
      const m=state.measures.find(x=>x.id===row.dataset.measure);
      row.hidden=Boolean(value&&m&&m.status!==value);
    });
  }
});
modal.addEventListener('submit',formSubmit);
modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
document.querySelector('#export').addEventListener('click',()=>{
  const blob=new Blob([exportJson(state)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='ambienta-demo-pga-backup.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Respaldo JSON local exportado. No es una firma ni un respaldo del servidor.');
});
render();
console.info('AMBIENTA '+VERSION+' — Datos ficticios, no uso regulatorio.');
