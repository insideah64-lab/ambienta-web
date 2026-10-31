import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  Activity, ArrowDownToLine, BookOpen, CheckCircle2, Clock3,
  Cloud, ExternalLink, FileText, FolderOpen, Globe2, History, LayoutDashboard,
  Leaf, Map, MapPin, Menu, Moon, Satellite, Search, ShieldCheck, Sun, X, Layers3
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  demoExport, demoSummary, readDemoState, statusText
} from './lib/demo';
import type { DemoState } from './lib/demo';
import { STORAGE_KEY, IS_DIABLILLOS_CASE } from './lib/demo';
// @ts-ignore: public-source metadata from deliberately isolated JS fixture.
import { DIABLILLOS_SOURCES } from './lib/diablillosDemo.mjs';
import { applyAndPersist, type Transaction } from './lib/transactions';
import { DemoActionDialog, type DemoActionKind } from './features/demo/DemoActionDialog';
import { CloudWorkspace } from './features/cloud/CloudWorkspace';
import { ReferenceDashboard } from './features/dashboard/ReferenceDashboard';
import { GeoMap } from './features/maps/GeoMap';

type Navigation = { path: string; label: string; icon: LucideIcon; description: string };
const NAV_PRIMARY: Navigation[] = [
  {path:'/',label:'Resumen',icon:LayoutDashboard,description:'Resumen visual del expediente y sus compromisos.'},
  {path:'/expediente',label:'Expediente',icon:FolderOpen,description:'Alcance, responsables y fases del proyecto.'},
  {path:'/area',label:'Área de estudio',icon:Globe2,description:'Cartografía regional real; ubicación y polígonos del proyecto pendientes de respaldo.'},
  {path:'/impactos',label:'Impactos',icon:Leaf,description:'Impactos ambientales vinculados al proyecto.'},
  {path:'/pga',label:'Plan de Gestión',icon:Layers3,description:'Programas, medidas, indicadores y trazabilidad ambiental.'},
  {path:'/monitoreo',label:'Monitoreo',icon:Activity,description:'Inspecciones, resultados y seguimiento en campo.'},
  {path:'/auditorias',label:'Auditorías',icon:ShieldCheck,description:'Hallazgos, controles y acciones correctivas.'},
  {path:'/evidencias',label:'Evidencias',icon:FileText,description:'Referencias documentales y revisiones registradas.'},
  {path:'/mapas',label:'Mapas y SIG',icon:Map,description:'Mapa interactivo OSM regional, sin perímetro de proyecto.'},
  {path:'/reportes',label:'Reportes',icon:FolderOpen,description:'Resumen exportable del expediente de demostración.'}
];
const NAV_TOOLS: Navigation[] = [
  {path:'/mita',label:'MITA satelital',icon:Satellite,description:'Información sobre integración del motor satelital MITA.'},
  {path:'/normativa',label:'Normativa',icon:BookOpen,description:'Referencias de gestión normativa pendientes de incorporación.'},
  {path:'/biblioteca',label:'Biblioteca',icon:FolderOpen,description:'Biblioteca documental pendiente de conexión.'},
  {path:'/historial',label:'Historial',icon:History,description:'Registro local de actividades de demostración.'},
  {path:'/nube',label:'Espacio privado',icon:Cloud,description:'Acceso autenticado de solo lectura a expedientes de Supabase.'}
];
const NAV=[...NAV_PRIMARY,...NAV_TOOLS];
const CLOUD_URL='https://insideah64-lab.github.io/ambienta-web/cloud.html';

function Badge({ children, tone='neutral' }: {children: React.ReactNode; tone?: 'neutral'|'mint'|'amber'|'blue'}) {
  return <span className={'v2-badge v2-badge-'+tone}>{children}</span>;
}
function measureTone(status: string): 'neutral'|'mint'|'amber'|'blue' {
  return status==='verificada'?'blue':status==='en_ejecucion'?'mint':status==='en_revision'?'amber':'neutral';
}
function Panel({kicker, title, children, action}: {kicker:string;title:string;children:React.ReactNode;action?:React.ReactNode}) {
  return <section className="v2-panel"><header className="v2-panel-title"><div><p className="v2-kicker">{kicker}</p><h2>{title}</h2></div>{action}</header>{children}</section>;
}
function MapPreview({province}:{province:string}) {
 return <GeoMap province={province}/>;
}
function Info({label,value,icon:Icon}:{label:string;value:string;icon:LucideIcon}) {
  return <div className="v2-info"><Icon size={18}/><div><small>{label}</small><strong>{value}</strong></div></div>;
}
function Expediente({data}: {data:DemoState}) {
  const p=data.project;
  return <div className="v2-detail-grid">
    <Panel kicker="FICHA DEL PROYECTO" title={p.name}>
      <div className="v2-project-code">{p.id} · {p.province}</div>
      <div className="v2-project-fields">
        <Info icon={ShieldCheck} label="Estado" value={p.status}/>
        <Info icon={Clock3} label="Fase" value={p.phase}/>
        <Info icon={FolderOpen} label="Proponente" value={p.proponent}/>
        <Info icon={Leaf} label="Actividad" value={p.kind}/>
        <Info icon={ShieldCheck} label="Responsable" value={p.technicalLead}/>
      </div>
      {IS_DIABLILLOS_CASE ? <div className="v2-case-sources"><strong>CONTEXTO DOCUMENTAL PÚBLICO · SIN AUDITORÍA OFICIAL</strong>
        <p>Referencia administrativa según informe: <b>0090302-188367/2024-0</b>. DIA informada: Resolución 048/2026 SM. Fuentes citadas, no equivalentes a evidencias de cumplimiento.</p>
        <ul>{DIABLILLOS_SOURCES.map((src:{id:string;label:string;url:string})=><li key={src.id}><a href={src.url} target="_blank" rel="noreferrer">{src.id} · {src.label} <ExternalLink size={13}/></a></li>)}</ul>
        <p>Las medidas, inspecciones, revisiones, hallazgos y acciones en este expediente son <b>simulaciones del laboratorio</b>. No se realizaron visitas de campo.</p></div> : <p className="v2-panel-note">Expediente ficticio. La edición completa sigue disponible en la aplicación V1 durante la migración.</p>}
    </Panel>
    <Panel kicker="MAPA BASE REAL · GEOMETRÍA DEL PROYECTO PENDIENTE" title="Ubicación y geometría">
      <MapPreview province={p.province}/>
      <p className="v2-panel-note">Mapa base OpenStreetMap a nivel regional. El área exacta del proyecto y sus límites no están verificados ni representados.</p>
    </Panel>
  </div>;
}
function AreaEstudio({data}:{data:DemoState}) {
  return <div className="v2-detail-grid"><Panel kicker="ÁREA DE ESTUDIO" title="Localización del expediente">
    <div className="v2-project-fields"><Info icon={MapPin} label="Provincia" value={data.project.province}/>
      <Info icon={FolderOpen} label="Expediente" value={data.project.id}/></div>
    <p className="v2-panel-note">No hay una superficie, coordenadas ni polígono de predio verificados asociados a esta demostración. No deben interpretarse mapas ilustrativos como cartografía técnica.</p>
  </Panel><Panel kicker="VISTA CARTOGRÁFICA" title="Geometría pendiente">
    <MapPreview province={data.project.province}/>
    <p className="v2-panel-note">La cartografía base es auténtica y regional; no hay coordenadas ni perímetros verificables asociados al expediente.</p>
  </Panel></div>;
}
function Impactos({data}:{data:DemoState}) {
  return <Panel kicker="MATRIZ DE IMPACTOS" title="Impactos ambientales registrados">
    <div className="v2-table-scroll"><table className="v2-table"><thead><tr>
      <th>Impacto</th><th>Factor</th><th>Etapa</th><th>Signo</th><th>Medidas relacionadas</th>
    </tr></thead><tbody>{data.impacts.map(impact=><tr key={impact.id}>
      <td><strong>{impact.name}</strong><small>{impact.id}</small></td><td>{impact.factor}</td>
      <td>{impact.phase}</td><td>{impact.sign}</td>
      <td>{data.measures.filter(m=>m.impactIds.includes(impact.id)).length}</td>
    </tr>)}</tbody></table></div>
    <p className="v2-panel-note">No hay puntuaciones de significancia ambiental calculadas automáticamente.</p>
  </Panel>;
}
function Evidencias({data,onAction}:{data:DemoState;onAction:(kind:DemoActionKind)=>void}) {
  return <Panel kicker="EVIDENCIAS DEL PGA" title="Registro documental"
    action={<button className="v2-action-button" onClick={()=>onAction('evidence')}>+ Registrar evidencia</button>}>
    <div className="v2-evidence-overview"><strong>{data.evidence.length} referencias de demostración</strong>
      <span>{data.evidence.filter(e=>e.status==='pendiente').length} pendientes de revisión</span></div>
    {data.evidence.length?data.evidence.map(e=><div className="v2-evidence-row" key={e.id}>
      <div><strong>{e.label}</strong><small>{e.reference} · {e.author} · {e.measureId??e.inspectionId}</small></div>
      <Badge tone={e.status==='validada'?'blue':e.status==='rechazada'?'amber':'neutral'}>{e.status}</Badge>
    </div>):<p className="v2-empty">Todavía no se registraron evidencias documentales.</p>}
    <p className="v2-panel-note">La demo conserva referencias textuales, no el contenido ni la autenticidad de los archivos. Los documentos privados se gestionan por separado.</p>
  </Panel>;
}
function Reportes({data,onExport}:{data:DemoState;onExport:()=>void}) {
  const k=demoSummary(data);
  return <Panel kicker="REPORTES" title="Resumen exportable">
    <p className="v2-caption">{data.project.name} · {data.project.id} · {data.project.province}</p>
    <div className="v2-project-fields"><Info label="Programas" icon={Layers3} value={String(k.programs)}/>
      <Info label="Medidas" icon={Leaf} value={String(k.measures)}/>
      <Info label="Inspecciones" icon={Activity} value={String(data.inspections.length)}/>
      <Info label="Evidencias" icon={FileText} value={String(data.evidence.length)}/></div>
    <p className="v2-panel-note">El archivo JSON conserva referencias, eventos y datos ficticios; no es un informe de cumplimiento ni un certificado ambiental.</p>
    <button className="v2-action-button" style={{marginTop:16}} onClick={onExport}>
      <ArrowDownToLine size={16}/> Exportar JSON de la demostración</button>
  </Panel>;
}
function ToolSection({kind}:{kind:'mita'|'normativa'|'biblioteca'}) {
  const spec={
    mita:['MITA satelital','El motor de análisis satelital sigue disponible por separado; no se han conectado productos validados a este expediente.'],
    normativa:['Normativa','La biblioteca normativa requiere fuentes jurisdiccionales y versiones verificadas. No se emiten conclusiones legales automáticamente.'],
    biblioteca:['Biblioteca','El gestor de documentos se incorporará después de validar acceso privado y trazabilidad de archivos en Supabase.']
  }[kind];
  return <Panel kicker="HERRAMIENTAS AMBIENTALES" title={spec[0]}>
    <p className="v2-caption">{spec[1]}</p>
    {kind==='mita'&&<a className="v2-small-link" href={CLOUD_URL}>Consultar aplicación V1 <ExternalLink size={14}/></a>}
  </Panel>;
}
function PGA({data,onAction}: {data:DemoState;onAction:(kind:DemoActionKind,measureId?:string)=>void}) {
  const [term,setTerm]=useState('');
  const [program,setProgram]=useState('todos');
  const filtered=useMemo(()=>data.measures.filter(m=>
    (program==='todos'||m.programId===program) &&
    (m.title+' '+m.id+' '+m.owner).toLocaleLowerCase('es').includes(term.toLocaleLowerCase('es'))
  ),[data,term,program]);
  return <Panel kicker="PLAN DE GESTIÓN AMBIENTAL" title="Medidas y compromisos"
    action={<div className="v2-action-group">
      <button type="button" className="v2-action-button" onClick={()=>onAction('measure')}>+ Nueva medida</button>
      <button type="button" className="v2-action-button v2-action-muted" onClick={()=>onAction('status')}>Cambiar estado</button>
      <button type="button" className="v2-action-button v2-action-muted" onClick={()=>onAction('evidence')}>Registrar evidencia</button>
      <button type="button" className="v2-action-button v2-action-muted" onClick={()=>onAction('review')}>Revisar evidencia</button>
    </div>}>
    <div className="v2-controls">
      <label className="v2-search"><Search size={17}/><input aria-label="Buscar medida" value={term} onChange={e=>setTerm(e.target.value)} placeholder="Buscar medida o responsable…"/></label>
      <label className="v2-select-label">Programa <select value={program} onChange={e=>setProgram(e.target.value)}><option value="todos">Todos los programas</option>{data.programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    </div>
    <div className="v2-table-scroll"><table className="v2-table"><thead><tr><th>Medida</th><th>Programa</th><th>Responsable</th><th>Estado</th><th>Vencimiento</th></tr></thead>
      <tbody>{filtered.map(m=><tr key={m.id}><td><strong>{m.title}</strong><small>{m.id}</small></td>
        <td>{data.programs.find(p=>p.id===m.programId)?.name||'Sin programa'}</td><td>{m.owner}</td>
        <td><Badge tone={measureTone(m.status)}>{statusText(m.status)}</Badge></td><td>{m.due}</td>
      </tr>)}</tbody></table></div>
    {!filtered.length&&<p className="v2-empty">No hay medidas que coincidan con los filtros.</p>}
    <p className="v2-panel-note">Medidas creadas localmente mediante el dominio original. Verificar requiere inspección conforme y evidencia revisada por otra persona. No equivale a aprobación ambiental.</p>
    <div className="v2-evidence-overview"><strong>Evidencias registradas (solo referencias)</strong>
      <span>{data.evidence.length} registros · {data.evidence.filter(e=>e.status==='pendiente').length} pendientes</span></div>
    {data.evidence.slice(-5).reverse().map(e=><div className="v2-evidence-row" key={e.id}>
      <div><strong>{e.label}</strong><small>{e.id} · {e.reference} · Autor: {e.author}</small></div>
      <Badge tone={e.status==='validada'?'blue':e.status==='rechazada'?'amber':'neutral'}>{e.status}</Badge>
    </div>)}
  </Panel>;
}
function Monitoreo({data,onAction}: {data:DemoState;onAction:(kind:DemoActionKind)=>void}) {
  return <Panel kicker="MONITOREO AMBIENTAL" title="Inspecciones programadas"
    action={<button type="button" className="v2-action-button" onClick={()=>onAction('inspection')}>+ Nueva inspección</button>}>
    <div className="v2-table-scroll"><table className="v2-table"><thead><tr><th>Inspección</th><th>Fecha</th><th>Medida asociada</th><th>Responsable</th><th>Resultado</th></tr></thead>
      <tbody>{data.inspections.map(i=><tr key={i.id}><td><strong>{i.id}</strong><small>{i.note}</small></td><td>{i.date}</td>
        <td>{data.measures.find(m=>m.id===i.measureId)?.title||'—'}</td><td>{i.assignee}</td>
        <td><Badge tone={i.result==='pendiente'?'amber':'mint'}>{i.result}</Badge></td></tr>)}</tbody></table></div>
    <p className="v2-panel-note">No existen mediciones de calidad del aire cargadas en esta demostración.</p>
  </Panel>;
}
function Auditorias({data,onAction}: {data:DemoState;onAction:(kind:DemoActionKind)=>void}) {
  return <div className="v2-detail-grid">
    <Panel kicker="AUDITORÍAS" title="Hallazgos abiertos"
      action={<div className="v2-action-group"><button type="button" className="v2-action-button" onClick={()=>onAction('finding')}>+ Nuevo hallazgo</button>
      <button type="button" className="v2-action-button v2-action-muted" onClick={()=>onAction('corrective')}>Acción correctiva</button></div>}>
      <div className="v2-large-stat">{data.findings.filter(f=>f.status==='abierto').length}</div>
      <p className="v2-caption">Hallazgos abiertos en los datos actuales del ejemplo.</p>
      <div className="v2-inline-notice"><ShieldCheck size={19}/><span>Los hallazgos y su seguimiento son registros de demostración y no constituyen un dictamen de cumplimiento ambiental.</span></div>
    </Panel>
    <Panel kicker="REGISTRO" title="Historial de hallazgos">
      {data.findings.length?data.findings.map(f=><div className="v2-audit-item" key={f.id}><span>{f.title}<small>{f.id} · {f.severity} · Inspección {f.inspectionId}</small></span><Badge tone="amber">{f.status}</Badge></div>):<p className="v2-empty">No se registraron hallazgos en esta demostración.</p>}
      <div className="v2-evidence-overview"><strong>Acciones correctivas</strong><span>{data.correctiveActions.length} registros</span></div>
      {data.correctiveActions.map(a=><div className="v2-evidence-row" key={a.id}><div><strong>{a.action}</strong><small>{a.findingId} · {a.owner} · {a.due}</small></div><Badge>{a.status}</Badge></div>)}
    </Panel>
  </div>;
}
function Historial({data}: {data:DemoState}) {
  return <Panel kicker="TRAZABILIDAD" title="Registro de actividades"><div className="v2-history">
    {data.audit.slice().reverse().map(e=><div className="v2-activity" key={e.id}><span className="v2-activity-icon"><History size={18}/></span>
      <div><strong>{e.actor}</strong><p>{e.details}</p><small>{new Date(e.at).toLocaleString('es-AR',{dateStyle:'medium',timeStyle:'short'})}</small></div>
    </div>)}</div></Panel>;
}
function exportDemo(data: DemoState) {
  const blob=new Blob([demoExport(data)],{type:'application/json;charset=utf-8'});
  const href=URL.createObjectURL(blob);const link=document.createElement('a');
  link.href=href;link.download='ambienta-v2-demo-'+data.project.id+'.json';
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(href);
}
export default function App() {
  const [data,setData]=useState<DemoState>(()=>readDemoState());
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [bright,setBright]=useState(false);
  const [action,setAction]=useState<{kind:DemoActionKind;measureId?:string}|null>(null);
  const [notice,setNotice]=useState('');
  function applyTransaction(operation:Transaction,message:string) {
    // Atomic from UI perspective: storage and domain validation must both succeed.
    const next=applyAndPersist(data,operation,window.localStorage,STORAGE_KEY);
    setData(next);
    setNotice(message);
    setAction(null);
  }
  function openAction(kind:DemoActionKind,measureId?:string) {
    setNotice('');
    setAction({kind,measureId});
  }
  const location=useLocation();
  const k=demoSummary(data);
  const active=NAV.find(x=>x.path===location.pathname)||NAV[0];
  const isPrivate=location.pathname==='/nube';
  const isOverview=location.pathname==='/';
  useEffect(()=>setSidebarOpen(false),[location.pathname]);
  return <div className={"v2-app ref-shell"+(bright?" ref-bright":"")+(IS_DIABLILLOS_CASE?" audit-diablillos":"")}>
    <aside className={'v2-sidebar '+(sidebarOpen?'sidebar-open':'')} aria-label="Navegación de AMBIENTA">
      <div className="v2-brand"><span className="v2-logo"><Leaf size={30}/></span><div><strong>AMBIENTA</strong><small>PLATAFORMA AMBIENTAL</small></div>
        <button className="v2-close" aria-label="Cerrar navegación" onClick={()=>setSidebarOpen(false)}><X size={20}/></button>
      </div>
      <div className="v2-sidebar-title">ESPACIO DE TRABAJO</div>
      <nav className="v2-nav" aria-label="Secciones">{NAV_PRIMARY.map(({path,label,icon:Icon})=>
        <NavLink key={path} to={path} end={path==='/'} className={({isActive})=>'v2-nav-item '+(isActive?'is-active':'')}>
          <Icon size={19} strokeWidth={1.8}/><span>{label}</span></NavLink>)}</nav>
      <div className="v2-sidebar-separator"/>
      <div className="v2-sidebar-title ref-tools-label">HERRAMIENTAS</div>
      <nav className="v2-nav ref-tool-nav" aria-label="Herramientas">{NAV_TOOLS.map(({path,label,icon:Icon})=>
        <NavLink key={path} to={path} className={({isActive})=>'v2-nav-item '+(isActive?'is-active':'')}>
          <Icon size={19} strokeWidth={1.8}/><span>{label}</span></NavLink>)}</nav>
      <div className="v2-sidebar-base">
        <span className="ref-demo-icon"><Leaf size={22}/></span>
        <div><strong>Entorno de demostración</strong><small>{data.project.province} · Argentina</small>
        <Link to="/nube">Cambiar proyecto</Link></div>
      </div>
      <div className="v2-sidebar-landscape" aria-hidden="true"/>
    </aside>
    {sidebarOpen&&<button className="v2-scrim" aria-label="Cerrar menú" onClick={()=>setSidebarOpen(false)}/>}
    <main className="v2-main">
      <div className="v2-scenic" aria-hidden="true"/>
      <header className="v2-topbar">
        <div className="v2-top-left"><button className="v2-menu-toggle" onClick={()=>setSidebarOpen(true)} aria-label="Abrir navegación"><Menu size={21}/></button>
          <div className="v2-breadcrumb">PROYECTOS <span>/</span> <strong>{isPrivate?'PRIVADO':data.project.id}</strong> <span>/</span> {active.label.toUpperCase()}</div></div>
        <div className="v2-top-actions">
          <button className="ref-theme-button" type="button" aria-label={bright?'Activar tema oscuro':'Activar iluminación suave'} onClick={()=>setBright(v=>!v)}>
            {bright?<Moon size={18}/>:<Sun size={18}/>}</button>
          {!isPrivate&&<span className="v2-location"><MapPin size={15}/> {data.project.province} · AR</span>}
          <div className="ref-user-chip"><span>DE</span><strong>{isPrivate?'Acceso privado':'Demo Usuario'}</strong></div>
          {!isOverview&&!isPrivate&&<button className="v2-export" onClick={()=>exportDemo(data)}><ArrowDownToLine size={17}/> <span>Exportar JSON</span></button>}
        </div>
      </header>
      <div className="v2-content">
        {IS_DIABLILLOS_CASE&&!isPrivate&&<div className="v2-case-banner" role="note"><ShieldCheck size={17}/> CASO DIABLILLOS · AUDITORÍA DOCUMENTAL DEMO · RESULTADOS SIMULADOS · SIN VISITA DE CAMPO</div>}
        {!isOverview&&<div className="v2-page-intro"><div><p className="v2-kicker">PLATAFORMA AMBIENTAL ARGENTINA · V2 EXPERIMENTAL</p>
          <h1>{active.label}</h1><p>{active.description}</p></div></div>}
        {!isPrivate&&!isOverview&&<div className="v2-warning"><span>!</span><p><strong>Ambiente de demostración.</strong> {IS_DIABLILLOS_CASE ? "Diablillos es un caso documental basado en fuentes públicas; medidas, inspecciones, evidencias y hallazgos son SIMULADOS. No se realizó auditoría de campo ni se certifica cumplimiento." : "Todos los proyectos, medidas y cifras iniciales son ficticios. No constituyen evaluación, aprobación ni cumplimiento ambiental."}</p></div>}
        {notice&&<div className="v2-success" role="status"><CheckCircle2 size={17}/><span>{notice}</span>
          <button type="button" onClick={()=>setNotice('')} aria-label="Cerrar confirmación"><X size={16}/></button></div>}
        <Routes>
          <Route path="/" element={<ReferenceDashboard data={data} k={k} onExport={()=>exportDemo(data)}/>}/>
          <Route path="/area" element={<AreaEstudio data={data}/>}/>
          <Route path="/impactos" element={<Impactos data={data}/>}/>
          <Route path="/evidencias" element={<Evidencias data={data} onAction={openAction}/>}/>
          <Route path="/mapas" element={<AreaEstudio data={data}/>}/>
          <Route path="/reportes" element={<Reportes data={data} onExport={()=>exportDemo(data)}/>}/>
          <Route path="/mita" element={<ToolSection kind="mita"/>}/>
          <Route path="/normativa" element={<ToolSection kind="normativa"/>}/>
          <Route path="/biblioteca" element={<ToolSection kind="biblioteca"/>}/>
          <Route path="/expediente" element={<Expediente data={data}/>}/>
          <Route path="/pga" element={<PGA data={data} onAction={openAction}/>}/>
          <Route path="/monitoreo" element={<Monitoreo data={data} onAction={openAction}/>}/>
          <Route path="/auditorias" element={<Auditorias data={data} onAction={openAction}/>}/>
          <Route path="/historial" element={<Historial data={data}/>}/>
          <Route path="/nube" element={<CloudWorkspace/>}/>
          <Route path="*" element={<div className="v2-empty"><p>Sección no encontrada.</p><Link to="/">Volver al resumen</Link></div>}/>
        </Routes>
        <footer className="v2-footer"><span><CheckCircle2 size={15}/> Sin aprobación normativa automática</span><span>AMBIENTA V2 · React + TypeScript · Desarrollo experimental</span></footer>
      </div>
    </main>
    {action&&<DemoActionDialog kind={action.kind} state={data} initialMeasureId={action.measureId}
      onClose={()=>setAction(null)} onApply={applyTransaction}/>}
  </div>;
}
