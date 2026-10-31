import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowDownToLine, ArrowRight, CalendarDays,
  ClipboardCheck, Clock3, Cloud, Droplets, FileText,
  History, Leaf, MapPin,
  ShieldCheck, Sprout, Wind, Volume2
} from 'lucide-react';
import type { DemoState, Summary } from '../../lib/demo';
import { statusText, IS_DIABLILLOS_CASE } from '../../lib/demo';
import {GeoMap} from '../maps/GeoMap';

type Props = {data:DemoState;k:Summary;onExport:()=>void};
const STATUS_STAGE:Record<string,number>={
  borrador:10,en_revision:42,en_ejecucion:72,verificada:100
};
function Metric({icon:Icon,label,value,subtitle,accent,fill}:{
  icon:typeof Leaf;label:string;value:number;subtitle:string;
  accent:'green'|'cyan'|'blue'|'purple';fill:number
}) {
  return <div className={'v2-metric ref-metric ref-accent-'+accent}>
    <span className="v2-metric-icon"><Icon size={27} strokeWidth={2}/></span>
    <div className="ref-metric-body">
      <p>{label}</p><strong>{value}</strong><span>{subtitle}</span>
      <div className="ref-metric-track" aria-hidden="true"><i style={{width:Math.max(0,Math.min(100,fill))+'%'}}/></div>
    </div>
  </div>;
}
function Hero({data}:{data:DemoState}) {
  const p=data.project;
  return <section className="ref-hero">
    <div className="ref-hero-copy">
      <span className="ref-hero-label">{IS_DIABLILLOS_CASE ? "CASO DOCUMENTAL · PRUEBA SIMULADA" : "PROYECTO DE EJEMPLO"}</span>
      <h1>{p.name}</h1>
      <div className="ref-hero-meta">
        <span><ClipboardCheck size={16}/> Código: {p.id}</span>
        <span><MapPin size={16}/> Provincia de {p.province}</span>
        <span><CalendarDays size={16}/> {p.phase}</span>
      </div>
      <div className="ref-hero-tags">
        <span>{p.status}</span><span>Área no informada</span>
        <span>Inicio no declarado</span><span>{p.proponent}</span>
      </div>
    </div>
    <div className="ref-hero-location">
      <div className="ref-province-art" aria-hidden="true"><MapPin size={31}/></div>
      <div className="ref-location-copy"><small>UBICACIÓN</small><strong>{p.province} · Argentina</strong>
        <span>Coordenadas no declaradas</span>
        <Link to="/area"><MapPin size={14}/> Ver ficha</Link>
      </div>
    </div>
  </section>;
}
function MapPanel({province}:{province:string}) {
 return <section className="ref-panel ref-map-panel ref-map-live">
    <div className="ref-panel-head"><h2>Mapa base regional</h2>
      <Link to="/mapas">Abrir SIG <ArrowRight size={14}/></Link></div>
    <GeoMap province={province} compact/>
    <p className="ref-panel-foot">Mapa real de OpenStreetMap. Sin perímetro, puntos de muestreo ni resultados del proyecto.</p>
  </section>;
}
function Commitments({data}:{data:DemoState}) {
  const iconFor=(programId:string)=>{
    if(programId.includes('AGU'))return <Droplets size={22}/>;
    if(programId.includes('BIO'))return <Sprout size={22}/>;
    if(programId.includes('AIR'))return <Wind size={22}/>;
    return <Leaf size={22}/>;
  };
  return <section className="ref-panel ref-commitments">
    <div className="ref-panel-head"><h2>Seguimiento de compromisos</h2>
      <Link to="/pga">Ver todos <ArrowRight size={14}/></Link></div>
    <div className="ref-commitment-list">{data.measures.slice(0,5).map(m=>
      <Link key={m.id} className="ref-commitment" to="/pga">
        <span className="ref-commitment-icon">{iconFor(m.programId)}</span>
        <span className="ref-commitment-info">
          <span className="ref-commitment-title"><strong>{m.title}</strong>
            <span className={'ref-stage-tag ref-stage-'+m.status}>{statusText(m.status)}</span></span>
          <small>{m.id} · {m.owner}</small>
          <span className="ref-progress-track" title="Etapa del flujo documental, no avance físico">
            <i style={{width:STATUS_STAGE[m.status]+'%'}}/></span>
        </span>
      </Link>)}</div>
    <p className="ref-panel-foot">Barras: etapa documental, no porcentaje de obra. {data.measures.filter(m=>m.status==='verificada').length} de {data.measures.length} medidas verificadas.</p>
  </section>;
}
function ActivityPanel({data}:{data:DemoState}) {
  const entries=[...data.audit].reverse().slice(0,3);
  return <section className="ref-panel ref-activities">
    <div className="ref-panel-head"><h2>Últimas actividades</h2>
      <Link to="/historial">Ver historial <ArrowRight size={14}/></Link></div>
    {entries.map(e=><div className="ref-activity" key={e.id}>
      <span className="ref-activity-icon"><History size={20}/></span>
      <div><strong>{e.event==='seed'?'Expediente de demostración creado':e.event.replaceAll('.',' · ')}</strong>
        <small>{e.details}</small></div>
      <time>{new Date(e.at).toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'})}</time>
    </div>)}
    {entries.length<2&&<div className="ref-activity"><span className="ref-activity-icon"><Clock3 size={20}/></span>
      <div><strong>Sin más actividades registradas</strong><small>Los próximos cambios del PGA aparecerán aquí.</small></div></div>}
  </section>;
}
function Alerts({data}:{data:DemoState}) {
  const pendingMeasures=data.measures.filter(m=>m.status==='en_revision');
  const inspections=data.inspections.filter(i=>i.result==='pendiente');
  const findings=data.findings.filter(f=>f.status==='abierto');
  const count=pendingMeasures.length+inspections.length+findings.length;
  return <section className="ref-panel ref-alerts">
    <div className="ref-panel-head"><h2>Alertas y pendientes <span className="ref-alert-count">{count}</span></h2>
      <Link to="/monitoreo">Ver todas <ArrowRight size={14}/></Link></div>
    {pendingMeasures.slice(0,1).map(m=><Link to="/pga" className="ref-alert" key={m.id}>
      <span className="ref-alert-icon is-amber"><AlertTriangle size={19}/></span>
      <span><strong>Revisión de medida</strong><small>{m.id} · {m.title}</small></span>
      <b className="ref-stage-tag ref-stage-en_revision">En revisión</b>
    </Link>)}
    {inspections.slice(0,1).map(i=><Link to="/monitoreo" className="ref-alert" key={i.id}>
      <span className="ref-alert-icon is-red"><CalendarDays size={19}/></span>
      <span><strong>Inspección programada</strong><small>{i.id} · {i.date}</small></span>
      <b className="ref-stage-tag ref-stage-en_ejecucion">Pendiente</b>
    </Link>)}
    {findings.length?<Link to="/auditorias" className="ref-alert">
      <span className="ref-alert-icon is-red"><AlertTriangle size={19}/></span>
      <span><strong>{findings.length} hallazgo(s) abierto(s)</strong><small>Requieren seguimiento</small></span>
    </Link>:<div className="ref-alert">
      <span className="ref-alert-icon is-blue"><ShieldCheck size={19}/></span>
      <span><strong>Sin hallazgos abiertos</strong><small>No hay hallazgos registrados como abiertos.</small></span>
      <b className="ref-stage-tag">Sin registros</b>
    </div>}
  </section>;
}
const MONTHS=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function Schedule({data}:{data:DemoState}) {
  const dates=data.measures.map(m=>new Date(m.due+'T12:00:00Z')).filter(d=>!Number.isNaN(d.getTime()));
  const earliest=dates.length?new Date(Math.min(...dates.map(d=>d.getTime()))):new Date();
  const start=new Date(Date.UTC(earliest.getUTCFullYear(),earliest.getUTCMonth()-1,1));
  const end=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+3,1));
  const duration=end.getTime()-start.getTime();
  const months=[0,1,2].map(offset=>new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+offset,1)));
  return <section className="ref-panel ref-schedule">
    <div className="ref-panel-head"><h2>Cronograma general</h2>
      <Link to="/pga">Ver medidas <ArrowRight size={14}/></Link></div>
    <div className="ref-schedule-intro">Vencimientos documentados · {start.getUTCFullYear()}</div>
    <div className="ref-schedule-months"><span>Medida</span>{months.map((d,i)=>
      <span key={i}>{MONTHS[d.getUTCMonth()].toUpperCase()}</span>)}</div>
    <div className="ref-schedule-rows">{data.measures.slice(0,5).map((m,i)=>{
      const date=new Date(m.due+'T12:00:00Z');
      const pct=Number.isNaN(date.getTime())?0:Math.min(97,Math.max(0,(date.getTime()-start.getTime())/duration*100));
      return <div className="ref-schedule-row" key={m.id}>
        <span title={m.title}>{m.title}</span><div className="ref-schedule-lane">
          <i className={'ref-schedule-mark ref-schedule-mark-'+(i%4)}
            style={{left:pct+'%'}} title={'Vence '+m.due}/></div>
      </div>})}</div>
    <p className="ref-schedule-note">Marcadores = fecha de vencimiento; no representan duración de actividades.</p>
  </section>;
}
function Indicators() {
  const list=[
    {name:'Cobertura vegetal',note:'Sin datos satelitales',icon:Leaf,accent:'green'},
    {name:'Calidad del agua',note:'Sin mediciones',icon:Droplets,accent:'blue'},
    {name:'Calidad del aire',note:'Sin mediciones',icon:Cloud,accent:'cyan'},
    {name:'Ruido ambiental',note:'Sin mediciones',icon:Volume2,accent:'purple'}
  ];
  return <section className="ref-panel ref-indicators">
    <div className="ref-panel-head"><h2>Indicadores ambientales</h2>
      <span className="ref-panel-muted">Datos por incorporar</span></div>
    <div className="ref-indicator-grid">{list.map(({name,note,icon:Icon,accent})=>
      <div className={'ref-indicator ref-indicator-'+accent} key={name}>
        <span className="ref-indicator-icon"><Icon size={22}/></span>
        <div><strong>{name}</strong><small>{note}</small></div>
        <span className="ref-indicator-dashes" aria-hidden="true">···</span>
      </div>)}</div>
  </section>;
}
function About({onExport}:{onExport:()=>void}) {
  return <section className="ref-panel ref-about">
    <div className="ref-about-photo" aria-hidden="true"/>
    <div className="ref-about-text"><strong>{IS_DIABLILLOS_CASE?'Diablillos · escenario documental DEMO':'Proyecto de ejemplo'}</strong>
      <p>{IS_DIABLILLOS_CASE?'Antecedentes públicos y registros sintéticos; no se realizaron inspecciones en campo ni se verificó cumplimiento ambiental.':'Todos los proyectos, medidas y cifras iniciales son ficticios. No constituyen evaluación, aprobación ni cumplimiento ambiental.'}</p>
      <button type="button" aria-label="Exportar JSON" onClick={onExport}>
        <ArrowDownToLine size={16}/> Exportar resumen</button>
    </div>
  </section>;
}
export function ReferenceDashboard({data,k,onExport}:Props) {
  const measuresInPrograms=new Set(data.measures.map(m=>m.programId)).size;
  const reviewedEvidence=data.evidence.filter(e=>e.status!=='pendiente').length;
  const completedInspections=data.inspections.filter(i=>i.result!=='pendiente').length;
  return <div className="ref-dashboard">
    <Hero data={data}/>
    <div className="v2-metrics ref-metrics">
      <Metric icon={Leaf} label="PROGRAMAS DEL PGA" value={k.programs}
        subtitle={measuresInPrograms+' con medidas registradas'} accent="green"
        fill={k.programs?measuresInPrograms/k.programs*100:0}/>
      <Metric icon={ClipboardCheck} label="MEDIDAS AMBIENTALES" value={k.measures}
        subtitle={k.verified+' verificadas · '+data.measures.filter(m=>m.status==='en_ejecucion').length+' en ejecución'}
        accent="green" fill={k.measures?k.verified/k.measures*100:0}/>
      <Metric icon={ShieldCheck} label="INSPECCIONES" value={data.inspections.length}
        subtitle={data.inspections.length+' registradas · '+k.inspectionsPending+' pendientes'} accent="cyan"
        fill={data.inspections.length?completedInspections/data.inspections.length*100:0}/>
      <Metric icon={FileText} label="EVIDENCIAS" value={data.evidence.length}
        subtitle={reviewedEvidence+' revisadas · '+k.evidencePending+' pendientes'} accent="blue"
        fill={data.evidence.length?reviewedEvidence/data.evidence.length*100:0}/>
    </div>
    <div className="ref-dashboard-columns">
      <div className="ref-dashboard-column">
        <MapPanel province={data.project.province}/>
        <ActivityPanel data={data}/>
      </div>
      <div className="ref-dashboard-column">
        <Commitments data={data}/>
        <Alerts data={data}/>
      </div>
      <div className="ref-dashboard-column">
        <Schedule data={data}/>
        <Indicators/>
        <About onExport={onExport}/>
      </div>
    </div>
    <p className="ref-dashboard-disclaimer">{IS_DIABLILLOS_CASE?"AMBIENTA V2 · Caso documental Diablillos: todas las inspecciones, resultados y evidencias operativas son SIMULADOS.":"AMBIENTA V2 · Vista conceptual basada en el diseño de referencia · Datos de demostración separados de Supabase."}</p>
  </div>;
}
