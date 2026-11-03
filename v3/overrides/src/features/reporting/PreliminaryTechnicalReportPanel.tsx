import {useMemo,useState} from 'react';
import './preliminary-technical-report.css';
import {readConesaReportAnnex} from './ConesaReportReader';
import {Link} from 'react-router-dom';
import {ArtworkIcon} from '../iconography/ArtworkIcon';
import type {DemoState} from '../../lib/demo';
// @ts-ignore: pure read-only report logic shared with Node regression suite
import {preparePreliminaryTechnicalDownload,buildPreliminaryTechnicalReview} from './preliminary-technical-report.mjs';

type Props={data:DemoState};
type Readiness={name:string;status:string;detail:string};
export function PreliminaryTechnicalReportPanel({data}:Props){
 const [message,setMessage]=useState('');
 const conesaAnnex=useMemo(()=>readConesaReportAnnex(data,window.localStorage),[data]);
 const model=useMemo(()=>buildPreliminaryTechnicalReview(data,conesaAnnex),[data,conesaAnnex]);
 const gaps=model.readiness as Readiness[];
 const unaccredited=gaps.filter(x=>x.status==='No documentado'||
  x.status==='No acreditado'||x.status==='No verificado').length;
 function download(){
  try{
   const file=preparePreliminaryTechnicalDownload(data,conesaAnnex);
   const url=URL.createObjectURL(new Blob([file.html],{type:'text/html;charset=utf-8'}));
   const a=document.createElement('a');
   a.href=url;a.download=file.filename;document.body.appendChild(a);a.click();a.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),1000);
   setMessage('Informe HTML generado. Abrilo en un navegador para imprimirlo como PDF. No es un EsIA ni una certificación.');
  }catch(error){setMessage('No se pudo generar el informe: '+(error instanceof Error?error.message:String(error)));}
 }
 return <section className="ref-tech-report" data-technical-report="preliminary" aria-labelledby="ref-tech-title">
  <div className="ref-tech-head">
   <div><small>ENTREGABLE TÉCNICO · DIAGNÓSTICO PRELIMINAR</small>
    <h3 id="ref-tech-title">Informe integrado del expediente</h3>
    <p>Conecta proyecto, impactos, medidas del PGA, inspecciones, evidencias,
     hallazgos y acciones correctivas. Presenta los vacíos que impiden
     utilizar la documentación como un Estudio de Impacto Ambiental terminado.</p></div>
   <button type="button" onClick={download} data-export-technical-report="html">
    <ArtworkIcon kind="export" size={24}/> Descargar informe HTML imprimible
   </button>
  </div>
  <div className="ref-tech-facts">
   <div><ArtworkIcon kind="impacts" size={24}/><strong>{model.counts.impacts}</strong><small>Impactos declarados</small></div>
   <div><ArtworkIcon kind="measures" size={24}/><strong>{model.counts.measures}</strong><small>Medidas relacionadas</small></div>
   <div><ArtworkIcon kind="notice" size={24}/><strong data-report-missing={unaccredited}>{unaccredited}</strong><small>Componentes sin acreditación</small></div>
   <div><ArtworkIcon kind="notice" size={24}/><strong>{model.counts.documentaryWarnings}</strong><small>Observaciones de vínculos</small></div>
  </div>
  <div className="ref-tech-conesa" data-report-conesa-annex>
   <div>
    <h4>Evaluaciones Conesa vinculadas al informe</h4>
    <p>Se leen los borradores Conesa del navegador para este expediente y se recalculan
     al exportar, sin escribir sobre los originales. Ninguna puntuación corresponde
     automáticamente a una medición o validación profesional.</p>
   </div>
   <div className="ref-tech-conesa-counts">
    <span><strong data-report-conesa-initial>{conesaAnnex.counts.initialEntries}</strong> valoraciones iniciales</span>
    <span><strong data-report-conesa-residual>{conesaAnnex.counts.residualEntries}</strong> escenarios residuales</span>
    <span><strong data-report-conesa-review>{conesaAnnex.counts.reviewRequired}</strong> pendientes de revisión</span>
    <span><strong data-report-conesa-chains>{conesaAnnex.counts.documentedChains}</strong> cadenas documentadas</span>
   </div>
   {conesaAnnex.rows.length>0
    ?<p className="ref-tech-conesa-note">Las puntuaciones y sus fundamentos se incluirán
      en el anexo metodológico. Los valores fuera de escala, referencias faltantes
      y cadenas incompatibles quedarán marcados para revisión.</p>
    :<p className="ref-tech-conesa-note">Sin valoraciones guardadas para este expediente.
      No se generarán puntuaciones de ejemplo en el informe.</p>}
   {conesaAnnex.issues.map((issue,i)=>
    <p key={i} className="ref-tech-conesa-issue" role="status">{issue}</p>)}
   <Link to="/matrices">Abrir el constructor de matrices Conesa</Link>
  </div>
  <div className="ref-tech-readiness">
   <h4>Matriz de información para un futuro EsIA</h4>
   <p>Disponibilidad de datos en la demostración, <strong>no porcentaje de avance ni conformidad ambiental</strong>.</p>
   <div className="ref-tech-readiness-grid">
    {gaps.map((x,i)=><div data-report-readiness={x.status} key={i}>
     <strong>{x.name}</strong><span>{x.status}</span><small>{x.detail}</small>
    </div>)}
   </div>
  </div>
  {message&&<p className="ref-tech-message" role="status">{message}</p>}
  <p className="ref-tech-warning"><strong>Alcance:</strong> los registros son DEMO.
   El informe no adjunta geometrías oficiales, fotografías originales ni estudios
   de línea base. Los estados del expediente no acreditan cumplimiento ambiental.</p>
  <p className="ref-tech-nav">Documentar lo faltante en <Link to="/expediente">Expediente</Link>,
   <Link to="/area"> Área de estudio</Link>, <Link to="/impactos"> Impactos</Link>,
   <Link to="/pga"> PGA</Link> y <Link to="/mapas"> SIG</Link>.
   Los datos que aún no pueden cargarse aparecen expresamente como pendientes.</p>
 </section>;
}
