import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import {CheckCircle2, ExternalLink, Menu, Moon, Search, Sun, X} from 'lucide-react';
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
import { PointZoneAnalysis } from './features/maps/PointZoneAnalysis';
import { StudyAreasWorkbench } from './features/maps/StudyAreasWorkbench';
import './area-gis-pages.css';
import './desktop-readability.css';
import { SpatialLinksPanel } from './features/maps/SpatialLinksPanel';
// @ts-ignore: native JS validator used to restore browser-local admin polygon
import {readAdminBoundary,adminBoundaryKey} from './features/georef/admin-boundary.mjs';
import {GeorefTerritory,GeorefSavedSummary,type TerritoryFocus,type BoundaryOverlay} from './features/georef/GeorefTerritory';
import {AoiWorkbench,type PointAoi} from './features/georef/AoiWorkbench';
// @ts-ignore: browser-local AOI model
import {aoiKey,readPointAoi} from './features/maps/aoi-model.mjs';
// @ts-ignore: pure browser-local non-destructive synthetic Diablillos preview initializer
import {retractSeededDiablillosPreview} from './features/maps/diablillos-preview.mjs';
// @ts-ignore: opt-in source-backed QA fixture, never overwrites a real contour
import {seedDiablillosQaReference} from './features/maps/diablillos-reference-qa.mjs';
import {PerimeterWorkbench} from './features/maps/PerimeterWorkbench';
import { EvidenceIntegrityLab } from './features/evidence/EvidenceIntegrityLab';
import {MeasureTracePanel} from './features/traceability/MeasureTracePanel';
import {RecordFocusPanel} from './features/traceability/RecordFocusPanel';
// @ts-ignore: small pure V3-only release label
import {AMBIENTA_WEB_VERSION,AMBIENTA_WEB_RELEASE_LABEL} from './release-info.mjs';
import {DocumentLinkAuditPanel} from './features/traceability/DocumentLinkAuditPanel';
import {PreliminaryTechnicalReportPanel} from './features/reporting/PreliminaryTechnicalReportPanel';
import type {AmbientaIconName} from './features/iconography/AmbientaIcon';
import {ArtworkIcon} from './features/iconography/ArtworkIcon';
import {BaselinePanel} from './features/baseline/BaselinePanel';
import {MitaPanel} from './features/mita/MitaPanel';
import {MatrixMethodHub} from './features/impacts/MatrixMethodHub';


type Navigation = { path: string; label: string; icon: AmbientaIconName; description: string };
const NAV_PRIMARY: Navigation[] = [
  {path:'/',label:'Resumen',icon:'dashboard',description:'Resumen visual del expediente y sus compromisos.'},
  {path:'/expediente',label:'Expediente',icon:'folder',description:'Alcance, responsables y fases del proyecto.'},
  {path:'/area',label:'Área de estudio',icon:'territory',description:'Definir ventana, territorio, perímetro, superficies y subáreas del proyecto.'},
  {path:'/linea-base',label:'Línea base',icon:'inspections',description:'Indicadores, registros, fuentes e incertidumbre por proyecto.'},
  {path:'/impactos',label:'Impactos',icon:'impacts',description:'Impactos ambientales vinculados al proyecto.'},
  {path:'/pga',label:'Plan de Gestión',icon:'pga',description:'Programas, medidas, indicadores y trazabilidad ambiental.'},
  {path:'/monitoreo',label:'Monitoreo',icon:'monitoring',description:'Inspecciones, resultados y seguimiento en campo.'},
  {path:'/auditorias',label:'Auditorías',icon:'audits',description:'Hallazgos, controles y acciones correctivas.'},
  {path:'/evidencias',label:'Evidencias',icon:'evidence',description:'Referencias documentales, huellas SHA-256 y revisiones en demostración.'},
  {path:'/mapas',label:'Mapas y SIG',icon:'gis',description:'Analizar capas WFS/WMS, importar GeoJSON, recortar y exportar cartografía.'},
  {path:'/reportes',label:'Reportes',icon:'reports',description:'Informe técnico preliminar, matriz de información faltante y exportación del expediente.'}
];
const NAV_TOOLS: Navigation[] = [
  {path:'/matrices',label:'Matrices ambientales',icon:'measures',description:'Crear, editar y exportar matrices ambientales por proyecto.'},
  {path:'/mita',label:'MITA satelital',icon:'satellite',description:'Analizar vegetación (NDVI) y columna troposférica de NO₂ con productos satelitales.'},
  {path:'/normativa',label:'Normativa',icon:'legal',description:'Referencias de gestión normativa pendientes de incorporación.'},
  {path:'/biblioteca',label:'Biblioteca',icon:'library',description:'Biblioteca documental pendiente de conexión.'},
  {path:'/historial',label:'Historial',icon:'history',description:'Registro local de actividades de demostración.'},
  {path:'/nube',label:'Espacio privado',icon:'cloud',description:'Acceso autenticado de solo lectura a expedientes de Supabase.'}
];
const NAV=[...NAV_PRIMARY,...NAV_TOOLS];

function Badge({ children, tone='neutral' }: {children: React.ReactNode; tone?: 'neutral'|'mint'|'amber'|'blue'}) {
  return <span className={'v2-badge v2-badge-'+tone}>{children}</span>;
}
function measureTone(status: string): 'neutral'|'mint'|'amber'|'blue' {
  return status==='verificada'?'blue':status==='en_ejecucion'?'mint':status==='en_revision'?'amber':'neutral';
}
function Panel({kicker, title, children, action, icon}: {kicker:string;title:string;children:React.ReactNode;action?:React.ReactNode;icon?:AmbientaIconName}) {
  return <section className="v2-panel"><header className="v2-panel-title"><div><p className="v2-kicker">{kicker}</p><h2>{icon&&<ArtworkIcon kind={icon} size={25}/>} {title}</h2></div>{action}</header>{children}</section>;
}
function MapPreview({province,focus,boundary,aoi}:{province:string;focus?:TerritoryFocus|null;boundary?:BoundaryOverlay|null;aoi?:PointAoi|null}) {
 return <GeoMap compact province={province} focus={focus} boundary={boundary} aoi={aoi}/>;
}
function Info({label,value,icon}:{label:string;value:string;icon:AmbientaIconName}) {
  return <div className="v2-info"><ArtworkIcon kind={icon} size={26}/><div><small>{label}</small><strong>{value}</strong></div></div>;
}
function Expediente({data}: {data:DemoState}) {
  const p=data.project;
  return <div className="v2-detail-grid">
    <Panel kicker="FICHA DEL PROYECTO" icon="folder" title={p.name}>
      <div className="v2-project-code">{p.id} · {p.province}</div>
      <GeorefSavedSummary/>
      <div className="v2-project-fields">
        <Info icon="folder" label="Estado" value={p.status}/>
        <Info icon="calendar" label="Fase" value={p.phase}/>
        <Info icon="industry" label="Proponente" value={p.proponent}/>
        <Info icon="impacts" label="Actividad" value={p.kind}/>
        <Info icon="folder" label="Responsable" value={p.technicalLead}/>
      </div>
      {IS_DIABLILLOS_CASE ? <div className="v2-case-sources"><strong>CONTEXTO DOCUMENTAL PÚBLICO · SIN AUDITORÍA OFICIAL</strong>
        <p>Referencia administrativa según informe: <b>0090302-188367/2024-0</b>. DIA informada: Resolución 048/2026 SM. Fuentes citadas, no equivalentes a evidencias de cumplimiento.</p>
        <ul>{DIABLILLOS_SOURCES.map((src:{id:string;label:string;url:string})=><li key={src.id}><a href={src.url} target="_blank" rel="noreferrer">{src.id} · {src.label} <ExternalLink size={13}/></a></li>)}</ul>
        <p>Las medidas, inspecciones, revisiones, hallazgos y acciones en este expediente son <b>simulaciones del laboratorio</b>. No se realizaron visitas de campo.</p></div> : <p className="v2-panel-note">Expediente ficticio. La edición completa sigue disponible en la aplicación V1 durante la migración.</p>}
    </Panel>
    <Panel kicker="MAPA BASE REAL · GEOMETRÍA DEL PROYECTO PENDIENTE" icon="territory" title="Ubicación y geometría">
      <MapPreview province={p.province}/>
      <p className="v2-panel-note">Mapa base OpenStreetMap a nivel regional. El área exacta del proyecto y sus límites no están verificados ni representados.</p>
    </Panel>
  </div>;
}
function AreaEstudio({data}:{data:DemoState}) {
 const [,setTerritoryFocus]=useState<TerritoryFocus|null>(null);
 const [,setBoundary]=useState<BoundaryOverlay|null>(()=>readAdminBoundary(adminBoundaryKey(IS_DIABLILLOS_CASE)));
 const [aoi,setAoi]=useState<PointAoi|null>(()=>readPointAoi(aoiKey(IS_DIABLILLOS_CASE)) as PointAoi|null);
 return <div className="v2-area-stack" data-page-role="territory-definition">
   <Panel kicker="ÁREA DE ESTUDIO · DEFINICIÓN" icon="territory" title="Territorio, perímetro y superficies">
    <div className="v2-project-fields">
     <Info icon="territory" label="Provincia" value={data.project.province}/>
     <Info icon="folder" label="Expediente" value={data.project.id}/>
    </div>
    <p className="v2-panel-note">En este módulo se declara la ventana de referencia, se caracteriza el territorio y se delimita un polígono de estudio con sus subáreas. Las consultas de capas WFS/WMS, el recorte y la importación GeoJSON se realizan exclusivamente en <Link to="/mapas">laboratorio cartográfico</Link>.</p>
   </Panel>
   <Panel kicker="PASO 1 · PERÍMETRO DEL ESTUDIO" icon="gis" title="Importar o dibujar el contorno">
    <PerimeterWorkbench aoi={aoi}/>
   </Panel>
   <AoiWorkbench onChange={setAoi}/>
   <GeorefTerritory onFocus={setTerritoryFocus} onBoundary={setBoundary}/>
   <Panel kicker="PASO 3 · ZONIFICACIÓN OPCIONAL" icon="gis" title="Subáreas experimentales, solo a pedido">
    <StudyAreasWorkbench aoi={aoi}/>
   </Panel>
   <Panel kicker="VÍNCULOS AMBIENTALES · QA" icon="monitoring" title="Relación documental con las subáreas">
    <SpatialLinksPanel data={data} mode="overview"/>
   </Panel>
 </div>;
}
function MapasSIG({data}:{data:DemoState}){
 return <div className="v2-area-stack" data-page-role="gis-analysis">
  <Panel kicker="MAPAS Y SIG · ANÁLISIS" icon="gis" title="Laboratorio cartográfico y geoprocesamiento">
   <p className="v2-panel-note">Este módulo concentra las bases cartográficas, consulta de datos IDESA/Georef, capas WMS, importación GeoJSON, recortes topológicos, revisión y exportación. La ventana AOI y el polígono de ensayo proceden de <Link to="/area">la definición territorial</Link> y no se redefinen aquí.</p>
   <GeoMap province={data.project.province}/>
   <PointZoneAnalysis/>
   <p className="v2-panel-note">Las cuatro subáreas son capas visibles de solo lectura. Para cambiar el perímetro, asignar zonas o revisar superficies, <Link to="/area">volvé al módulo de delimitación</Link>. Ninguna ventana de consulta ni geometría importada constituye automáticamente un perímetro ambiental acreditado.</p>
  </Panel>
 </div>;
}
function Impactos({data}:{data:DemoState}) {
  return <Panel kicker="REGISTRO DE IMPACTOS" icon="impacts" title="Impactos ambientales registrados">
    <div className="v2-table-scroll"><table className="v2-table"><thead><tr>
      <th>Impacto</th><th>Factor</th><th>Etapa</th><th>Signo</th><th>Medidas relacionadas</th>
    </tr></thead><tbody>{data.impacts.map(impact=><tr key={impact.id}>
      <td><strong>{impact.name}</strong><small>{impact.id}</small></td><td>{impact.factor}</td>
      <td>{impact.phase}</td><td>{impact.sign}</td>
      <td>{data.measures.filter(m=>m.impactIds.includes(impact.id)).length}</td>
    </tr>)}</tbody></table></div>
    <p className="v2-panel-note">Este registro no calcula automáticamente la significancia ambiental. Las matrices de identificación y valoración se elaboran por separado.</p>
    <Link className="v2-small-link" to="/matrices" data-open-matrix-tool="true">Abrir el constructor de matrices en Herramientas →</Link>
    <SpatialLinksPanel data={data} mode="impact"/>
  </Panel>;
}
function Matrices({data}:{data:DemoState}) {
  return <div className="v2-area-stack" data-page-role="environmental-matrices-tool">
    <details className="amb-workspace-about"><summary>Acerca del constructor y el guardado local</summary>
    <Panel kicker="HERRAMIENTAS · EVALUACIÓN AMBIENTAL" icon="measures" title="Constructor de matrices">
      <p className="v2-panel-note">Espacio de trabajo independiente para elaborar matrices de identificación y valoración. Los impactos ya registrados se consultan en <Link to="/impactos">Impactos</Link>; las ediciones del constructor se guardan en un borrador local vinculado al identificador del expediente, sin modificar el registro original. Las magnitudes y sus fuentes pueden documentarse en <Link to="/linea-base">Línea base</Link>; no se transfieren automáticamente a una matriz.</p>
    </Panel>
    </details>
    <MatrixMethodHub projectId={data.project.id} projectName={data.project.name} registeredImpacts={data.impacts} pgaData={data}/>
  </div>;
}
function Evidencias({data,onAction,onApply}:{data:DemoState;onAction:(kind:DemoActionKind)=>void;onApply:(operation:Transaction,message:string)=>void}) {
  const [params,setParams]=useSearchParams();
  const selected=params.get('evidencia');
  const clear=()=>setParams(prev=>{const next=new URLSearchParams(prev);next.delete('evidencia');return next});
  return <Panel kicker="EVIDENCIAS DEL PGA" icon="evidence" title="Registro documental"
    action={<button className="v2-action-button" onClick={()=>onAction('evidence')}><ArtworkIcon kind="evidence" size={24}/> Registrar evidencia</button>}>
    <div className="v2-evidence-overview"><strong>{data.evidence.length} referencias de demostración</strong>
      <span>{data.evidence.filter(e=>e.status==='pendiente').length} pendientes de revisión</span></div>
    {selected&&<RecordFocusPanel data={data} kind="evidence" id={selected} onClose={clear}/>}

    {data.evidence.length?data.evidence.map(e=><div className="v2-evidence-row" key={e.id}>
      <div><strong>{e.label}</strong><small>{e.reference} · {e.author} · {e.measureId??e.inspectionId}</small></div>
      <Badge tone={e.status==='validada'?'blue':e.status==='rechazada'?'amber':'neutral'}>{e.status}</Badge>
      <Link className="ref-record-inline" to={'/evidencias?evidencia='+encodeURIComponent(e.id)}>Ver ficha</Link>
    </div>):<p className="v2-empty">Todavía no se registraron evidencias documentales.</p>}
    <p className="v2-panel-note">La demo conserva referencias textuales, no el contenido ni la autenticidad de los archivos. Los documentos privados se gestionan por separado.</p>
    <EvidenceIntegrityLab data={data} onApply={onApply}/>
    <SpatialLinksPanel data={data} mode="evidence"/>
  </Panel>;
}
function Reportes({data,onExport}:{data:DemoState;onExport:()=>void}) {
  const k=demoSummary(data);
  return <Panel kicker="INFORMES TÉCNICOS" icon="reports" title="Revisión integral del expediente">
    <p className="v2-caption">{data.project.name} · {data.project.id} · {data.project.province}</p>
    <div className="v2-project-fields"><Info label="Programas" icon="pga" value={String(k.programs)}/>
      <Info label="Medidas" icon="measures" value={String(k.measures)}/>
      <Info label="Inspecciones" icon="inspections" value={String(data.inspections.length)}/>
      <Info label="Evidencias" icon="evidence" value={String(data.evidence.length)}/></div>
    <p className="v2-panel-note">El archivo JSON conserva referencias, eventos y datos ficticios; no es un informe de cumplimiento ni un certificado ambiental.</p>
    <button className="v2-action-button" style={{marginTop:16}} onClick={onExport}>
      <ArtworkIcon kind="export" size={23}/> Exportar JSON de la demostración</button>
    <PreliminaryTechnicalReportPanel data={data}/>
    <SpatialLinksPanel data={data} mode="report"/>
  </Panel>;
}
function ToolSection({kind}:{kind:'normativa'|'biblioteca'}) {
  const spec={
    normativa:['Normativa','La biblioteca normativa requiere fuentes jurisdiccionales y versiones verificadas. No se emiten conclusiones legales automáticamente.'],
    biblioteca:['Biblioteca','El gestor de documentos se incorporará después de validar acceso privado y trazabilidad de archivos en Supabase.']
  }[kind];
  return <Panel kicker="HERRAMIENTAS AMBIENTALES" icon={kind==='normativa'?'legal':'library'} title={spec[0]}>
    <p className="v2-caption">{spec[1]}</p>
  </Panel>;
}
function PGA({data,onAction}: {data:DemoState;onAction:(kind:DemoActionKind,measureId?:string)=>void}) {
  const [term,setTerm]=useState('');
  const [program,setProgram]=useState('todos');
  const [searchParams,setSearchParams]=useSearchParams();
  const selectedId=searchParams.get('medida');
  const chooseMeasure=(id:string|null)=>{
   setSearchParams(prev=>{
    const next=new URLSearchParams(prev);
    if(id)next.set('medida',id);
    else next.delete('medida');
    return next;
   });
  };
  const filtered=useMemo(()=>data.measures.filter(m=>
    (program==='todos'||m.programId===program) &&
    (m.title+' '+m.id+' '+m.owner).toLocaleLowerCase('es').includes(term.toLocaleLowerCase('es'))
  ),[data,term,program]);
  return <Panel kicker="PLAN DE GESTIÓN AMBIENTAL" icon="pga" title="Medidas y compromisos"
    action={<div className="v2-action-group">
      <button type="button" className="v2-action-button" onClick={()=>onAction('measure')}><ArtworkIcon kind="measures" size={17}/> Nueva medida</button>
      <button type="button" className="v2-action-button v2-action-muted" onClick={()=>onAction('status')}><ArtworkIcon kind="calendar" size={17}/> Cambiar estado</button>
      <button type="button" className="v2-action-button v2-action-muted" onClick={()=>onAction('evidence')}><ArtworkIcon kind="evidence" size={17}/> Registrar evidencia</button>
      <button type="button" className="v2-action-button v2-action-muted" onClick={()=>onAction('review')}><ArtworkIcon kind="review" size={17}/> Revisar evidencia</button>
    </div>}>
    <div className="v2-controls">
      <label className="v2-search"><Search size={17}/><input aria-label="Buscar medida" value={term} onChange={e=>setTerm(e.target.value)} placeholder="Buscar medida o responsable…"/></label>
      <label className="v2-select-label">Programa <select value={program} onChange={e=>setProgram(e.target.value)}><option value="todos">Todos los programas</option>{data.programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    </div>
    <div className="v2-table-scroll"><table className="v2-table"><thead><tr><th>Medida</th><th>Programa</th><th>Responsable</th><th>Estado</th><th>Vencimiento</th><th>Consulta</th></tr></thead>
      <tbody>{filtered.map(m=><tr key={m.id}><td><strong>{m.title}</strong><small>{m.id}</small></td>
        <td>{data.programs.find(p=>p.id===m.programId)?.name||'Sin programa'}</td><td>{m.owner}</td>
        <td><Badge tone={measureTone(m.status)}>{statusText(m.status)}</Badge></td><td>{m.due}</td>
        <td><button type="button" className="ref-trace-open" data-select-measure={m.id}
          aria-pressed={selectedId===m.id} onClick={()=>chooseMeasure(m.id)}>
          {selectedId===m.id?'Seleccionada':'Ver trazabilidad'}
        </button></td>
      </tr>)}</tbody></table></div>
    {!filtered.length&&<p className="v2-empty">No hay medidas que coincidan con los filtros.</p>}
    <p className="v2-panel-note">Medidas creadas localmente mediante el dominio original. Verificar requiere inspección conforme y evidencia revisada por otra persona. No equivale a aprobación ambiental.</p>
    <DocumentLinkAuditPanel data={data}/>
    {selectedId?<MeasureTracePanel data={data} measureId={selectedId} onClear={()=>chooseMeasure(null)}/>
      :<div className="ref-trace-choose" data-trace-empty-selection="true">
        Seleccioná <strong>Ver trazabilidad</strong> en una medida para consultar solo sus inspecciones,
        evidencias, hallazgos y acciones con identificadores asociados.
       </div>}
    <SpatialLinksPanel data={data} mode="measure"/>
  </Panel>;
}
function Monitoreo({data,onAction}: {data:DemoState;onAction:(kind:DemoActionKind)=>void}) {
  const [params,setParams]=useSearchParams();
  const selected=params.get('inspeccion');
  const clear=()=>setParams(prev=>{const next=new URLSearchParams(prev);next.delete('inspeccion');return next});
  return <Panel kicker="MONITOREO AMBIENTAL" icon="monitoring" title="Inspecciones programadas"
    action={<button type="button" className="v2-action-button" onClick={()=>onAction('inspection')}><ArtworkIcon kind="inspections" size={24}/> Nueva inspección</button>}>
    {selected&&<RecordFocusPanel data={data} kind="inspection" id={selected} onClose={clear}/>}
    <div className="v2-table-scroll"><table className="v2-table"><thead><tr><th>Inspección</th><th>Fecha</th><th>Medida asociada</th><th>Responsable</th><th>Resultado</th><th>Consulta</th></tr></thead>
      <tbody>{data.inspections.map(i=><tr key={i.id}><td><strong>{i.id}</strong><small>{i.note}</small></td><td>{i.date}</td>
        <td>{data.measures.find(m=>m.id===i.measureId)?.title||'—'}</td><td>{i.assignee}</td>
        <td><Badge tone={i.result==='pendiente'?'amber':'mint'}>{i.result}</Badge></td>
        <td><Link className="ref-record-inline" to={'/monitoreo?inspeccion='+encodeURIComponent(i.id)}>Ver ficha</Link></td></tr>)}</tbody></table></div>
    <p className="v2-panel-note">No existen mediciones de calidad del aire cargadas en esta demostración.</p>
    <SpatialLinksPanel data={data} mode="inspection"/>
  </Panel>;
}
function Auditorias({data,onAction}: {data:DemoState;onAction:(kind:DemoActionKind)=>void}) {
  const [params,setParams]=useSearchParams();
  const findingId=params.get('hallazgo'),actionId=params.get('accion');
  const clear=()=>setParams(prev=>{const next=new URLSearchParams(prev);
    next.delete('hallazgo');next.delete('accion');return next});
  return <div className="v2-detail-grid">
    {(findingId||actionId)&&<div className="ref-record-focus-placement">
      <RecordFocusPanel data={data} kind={findingId?'finding':'action'} id={(findingId||actionId)!}
        onClose={clear}/>
    </div>}
    <Panel kicker="AUDITORÍAS" icon="audits" title="Hallazgos abiertos"
      action={<div className="v2-action-group"><button type="button" className="v2-action-button" onClick={()=>onAction('finding')}><ArtworkIcon kind="audits" size={24}/> Nuevo hallazgo</button>
      <button type="button" className="v2-action-button v2-action-muted" onClick={()=>onAction('corrective')}><ArtworkIcon kind="measures" size={24}/> Acción correctiva</button></div>}>
      <div className="v2-large-stat">{data.findings.filter(f=>f.status==='abierto').length}</div>
      <p className="v2-caption">Hallazgos abiertos en los datos actuales del ejemplo.</p>
      <div className="v2-inline-notice"><ArtworkIcon kind="notice" size={19}/><span>Los hallazgos y su seguimiento son registros de demostración y no constituyen un dictamen de cumplimiento ambiental.</span></div>
    </Panel>
    <Panel kicker="REGISTRO" icon="history" title="Historial de hallazgos">
      {data.findings.length?data.findings.map(f=><div className="v2-audit-item" key={f.id}><span>{f.title}<small>{f.id} · {f.severity} · Inspección {f.inspectionId}</small></span><Badge tone="amber">{f.status}</Badge>
      <Link className="ref-record-inline" to={'/auditorias?hallazgo='+encodeURIComponent(f.id)}>Ver ficha</Link>
      </div>):<p className="v2-empty">No se registraron hallazgos en esta demostración.</p>}
      <div className="v2-evidence-overview"><strong>Acciones correctivas</strong><span>{data.correctiveActions.length} registros</span></div>
      {data.correctiveActions.map(a=><div className="v2-evidence-row" key={a.id}><div><strong>{a.action}</strong><small>{a.findingId} · {a.owner} · {a.due}</small></div><Badge>{a.status}</Badge>
        <Link className="ref-record-inline" to={'/auditorias?accion='+encodeURIComponent(a.id)}>Ver ficha</Link>
      </div>)}
    </Panel>
  </div>;
}
function Historial({data}: {data:DemoState}) {
  return <Panel kicker="TRAZABILIDAD" icon="history" title="Registro de actividades"><div className="v2-history">
    {data.audit.slice().reverse().map(e=><div className="v2-activity" key={e.id}><span className="v2-activity-icon"><ArtworkIcon kind="history" size={24}/></span>
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
  const [data,setData]=useState<DemoState>(()=>{
    // Only the Diablillos DEMO and only in an empty local workspace:
    // the example geometry is never a verified project boundary.
    if(IS_DIABLILLOS_CASE){
      // Retire only the automatically injected V3.5.1 example; never touch user-created boundaries.
      try{retractSeededDiablillosPreview(window.localStorage);}catch{/* keep local data unchanged */}
      // Explicit URL opt-in: never seed the Diablillos shape for normal project visits.
      // A previous user perimeter is never overwritten even in QA mode.
      if(new URLSearchParams(window.location.search).get('perimetro')==='referencia-qa'){
       try{seedDiablillosQaReference(window.localStorage,new Date().toISOString());}
       catch{/* keep local originals unchanged if storage or geometry fails */}
      }
    }
    return readDemoState();
  });
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
      <div className="v2-brand"><span className="v2-logo"><ArtworkIcon kind="brand" size={35}/></span><div><strong>AMBIENTA</strong><small>PLATAFORMA AMBIENTAL</small></div>
        <button className="v2-close" aria-label="Cerrar navegación" onClick={()=>setSidebarOpen(false)}><X size={20}/></button>
      </div>
      <div className="v2-sidebar-title">ESPACIO DE TRABAJO</div>
      <nav className="v2-nav" aria-label="Secciones">{NAV_PRIMARY.map(({path,label,icon})=>
        <NavLink key={path} to={path} end={path==='/'} className={({isActive})=>'v2-nav-item '+(isActive?'is-active':'')}>
          <ArtworkIcon kind={icon} size={29}/><span>{label}</span></NavLink>)}</nav>
      <div className="v2-sidebar-separator"/>
      <div className="v2-sidebar-title ref-tools-label">HERRAMIENTAS</div>
      <nav className="v2-nav ref-tool-nav" aria-label="Herramientas">{NAV_TOOLS.map(({path,label,icon})=>
        <NavLink key={path} to={path} className={({isActive})=>'v2-nav-item '+(isActive?'is-active':'')}>
          <ArtworkIcon kind={icon} size={29}/><span>{label}</span></NavLink>)}</nav>
      <div className="v2-sidebar-base">
        <span className="ref-demo-icon"><ArtworkIcon kind="brand" size={25}/></span>
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
          {!isPrivate&&<span className="v2-location"><ArtworkIcon kind="territory" size={23}/> {data.project.province} · AR</span>}
          <div className="ref-user-chip"><span>DE</span><strong>{isPrivate?'Acceso privado':'Demo Usuario'}</strong></div>
          {!isOverview&&!isPrivate&&<button className="v2-export" onClick={()=>exportDemo(data)}><ArtworkIcon kind="export" size={23}/> <span>Exportar JSON</span></button>}
        </div>
      </header>
      <div className="v2-content">
        {IS_DIABLILLOS_CASE&&!isPrivate&&<div className="v2-case-banner" role="note"><ArtworkIcon kind="notice" size={17}/> CASO DIABLILLOS · AUDITORÍA DOCUMENTAL DEMO · RESULTADOS SIMULADOS · SIN VISITA DE CAMPO</div>}
        {!isOverview&&<div className="v2-page-intro"><div><p className="v2-kicker">PLATAFORMA AMBIENTAL ARGENTINA · VERSIÓN WEB {AMBIENTA_WEB_VERSION} · EXPERIMENTAL</p>
          <h1>{active.label}</h1><p>{active.description}</p></div></div>}
        {!isPrivate&&!isOverview&&<div className="v2-warning"><span className="amb-warning-glyph"><ArtworkIcon kind="notice" size={20}/></span><p><strong>Ambiente de demostración.</strong> {IS_DIABLILLOS_CASE ? "Diablillos es un caso documental basado en fuentes públicas; medidas, inspecciones, evidencias y hallazgos son SIMULADOS. No se realizó auditoría de campo ni se certifica cumplimiento." : "Todos los proyectos, medidas y cifras iniciales son ficticios. No constituyen evaluación, aprobación ni cumplimiento ambiental."}</p></div>}
        {notice&&<div className="v2-success" role="status"><CheckCircle2 size={17}/><span>{notice}</span>
          <button type="button" onClick={()=>setNotice('')} aria-label="Cerrar confirmación"><X size={16}/></button></div>}
        <Routes>
          <Route path="/" element={<ReferenceDashboard data={data} k={k} onExport={()=>exportDemo(data)}/>}/>
          <Route path="/area" element={<AreaEstudio data={data}/>}/>
          <Route path="/linea-base" element={<BaselinePanel key={data.project.id} data={data}/>}/>
          <Route path="/impactos" element={<Impactos data={data}/>}/>
          <Route path="/matrices" element={<Matrices data={data}/>}/>
          <Route path="/evidencias" element={<Evidencias data={data} onAction={openAction} onApply={applyTransaction}/>}/>
          <Route path="/mapas" element={<MapasSIG data={data}/>}/>
          <Route path="/reportes" element={<Reportes data={data} onExport={()=>exportDemo(data)}/>}/>
          <Route path="/mita" element={<MitaPanel key={data.project.id} data={data}/>}/>
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
        <footer className="v2-footer"><span><CheckCircle2 size={15}/> Sin aprobación normativa automática</span><span data-app-release={AMBIENTA_WEB_VERSION}>{AMBIENTA_WEB_RELEASE_LABEL} · React + TypeScript · Laboratorio SIG</span></footer>
      </div>
    </main>
    {action&&<DemoActionDialog kind={action.kind} state={data} initialMeasureId={action.measureId}
      onClose={()=>setAction(null)} onApply={applyTransaction}/>}
  </div>;
}
