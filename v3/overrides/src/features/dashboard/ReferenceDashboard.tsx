import { Link } from 'react-router-dom';
import {
  ArrowDownToLine, ArrowRight, CalendarDays,
  ClipboardCheck, Clock3, Cloud, Droplets, FileText,
  History, Leaf, MapPin,
  ShieldCheck, Sprout, Wind, Volume2
} from 'lucide-react';
import type { DemoState, Summary } from '../../lib/demo';
import { statusText, IS_DIABLILLOS_CASE } from '../../lib/demo';
import {GeoMap} from '../maps/GeoMap';
// @ts-ignore: V3-only pure workflow summary, not an environmental risk model
import {summarizeWork} from './work-priorities.mjs';

type Props = {data:DemoState;k:Summary;onExport:()=>void};
const STATUS_STAGE:Record<string,number>={
  borrador:10,en_revision:42,en_ejecucion:72,verificada:100
};
function Metric({icon:Icon,label,value,subtitle,accent,to}:{
  icon:typeof Leaf;label:string;value:number;subtitle:string;
  accent:'green'|'cyan'|'blue'|'purple';to:string
}) {
  return <Link to={to} className={'v2-metric ref-metric ref-accent-'+accent}
   aria-label={label+': '+value+'. '+subtitle+'. Abrir módulo'}>
    <span className="v2-metric-icon" aria-hidden="true"><Icon size={23} strokeWidth={2}/></span>
    <span className="ref-metric-body">
      <span className="ref-metric-top"><span className="ref-metric-label">{label}</span><strong>{value}</strong></span>
      <span className="ref-metric-subtitle">{subtitle}</span>
    </span>
    <ArrowRight className="ref-metric-link-arrow" size={17} aria-hidden="true"/>
  </Link>;
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
    <p className="ref-panel-foot">Cartografía base OpenStreetMap. Un contorno de ensayo puede ser ilustrativo y no acredita límites oficiales ni observaciones de campo.</p>
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
function WorkAttention({data}:{data:DemoState}){
 const work=summarizeWork(data);
 return <section className="ref-attention" data-work-attention="true" aria-labelledby="ref-work-title">
  <div className="ref-attention-top">
   <div><p className="ref-attention-eyebrow">GESTIÓN DOCUMENTAL · ESTADOS DEL EXPEDIENTE</p>
    <h2 id="ref-work-title">Trabajo por atender</h2>
    <p>Seguimientos y revisiones abiertos en el expediente de demostración.
     Son estados de trabajo, <strong>no alertas ambientales ni incumplimientos comprobados.</strong></p>
   </div>
   <div className="ref-attention-summary" aria-label="Pendientes por tipo" data-work-summary="true">
    <span><strong data-work-follow-up="true">{work.followUp}</strong><small>seguimientos</small></span>
    <span><strong data-work-review="true">{work.review}</strong><small>revisiones</small></span>
   </div>
  </div>
  {work.noPending?<div className="ref-attention-empty" role="status">
    No hay registros pendientes en este expediente. Esto no significa que se haya verificado cumplimiento ambiental.
   </div>:<div className="ref-attention-grid">
    {work.groups.map((item:{key:string;count:number;label:string;description:string;path:string;category:string;caption:string})=>
     <Link to={item.path} key={item.key} className={'ref-attention-item ref-attention-'+item.category}
      data-attention-key={item.key}>
      <span className="ref-attention-item-top">
       <span className="ref-attention-kind">{item.category==='seguimiento'?'Seguimiento':'Revisión'}</span>
       <span className="ref-attention-count">{item.count} {item.count===1?'registro':'registros'}</span>
      </span>
      <strong>{item.label}</strong>
      <span className="ref-attention-bottom">
       <span className="ref-attention-description">{item.description}</span>
       <ArrowRight size={18} aria-hidden="true"/>
      </span>
     </Link>)}
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
  return <div className="ref-dashboard">
    <Hero data={data}/>
    <WorkAttention data={data}/>
    <section className="ref-metric-section" aria-label="Registros del expediente">
     <div className="ref-metric-section-head"><h2>Registros del expediente</h2>
      <p>Recuentos documentales, no porcentajes de cumplimiento.</p></div>
     <div className="v2-metrics ref-metrics">
      <Metric icon={Leaf} label="PROGRAMAS DEL PGA" value={k.programs}
        subtitle={measuresInPrograms+' con medidas asociadas'} accent="green" to="/pga"/>
      <Metric icon={ClipboardCheck} label="MEDIDAS AMBIENTALES" value={k.measures}
        subtitle={k.verified+' verificadas · '+data.measures.filter(m=>m.status==='en_ejecucion').length+' en ejecución'}
        accent="green" to="/pga"/>
      <Metric icon={ShieldCheck} label="INSPECCIONES" value={data.inspections.length}
        subtitle={k.inspectionsPending+' pendientes · registros documentales'} accent="cyan" to="/monitoreo"/>
      <Metric icon={FileText} label="EVIDENCIAS" value={data.evidence.length}
        subtitle={reviewedEvidence+' revisadas · '+k.evidencePending+' pendientes'} accent="blue" to="/evidencias"/>
     </div>
    </section>
    <div className="ref-section-heading">
      <div><span>SEGUIMIENTO DEL EXPEDIENTE</span><h2>Operación y territorio</h2></div>
      <p>Información de consulta. Las medidas del PGA son documentales y el perímetro QA no es oficial.</p>
    </div>
    <div className="ref-dashboard-columns">
      <div className="ref-dashboard-column">
        <MapPanel province={data.project.province}/>
        <Commitments data={data}/>
      </div>
      <div className="ref-dashboard-column">
        <Schedule data={data}/>
        <Indicators/>
      </div>
    </div>
    <div className="ref-supporting-grid">
      <ActivityPanel data={data}/>
      <About onExport={onExport}/>
    </div>
    <p className="ref-dashboard-disclaimer">{IS_DIABLILLOS_CASE?"AMBIENTA V2 · Caso documental Diablillos: todas las inspecciones, resultados y evidencias operativas son SIMULADOS.":"AMBIENTA V2 · Vista conceptual basada en el diseño de referencia · Datos de demostración separados de Supabase."}</p>
  </div>;
}
