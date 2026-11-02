import {measureDocumentTrace} from '../traceability/measure-document-trace.mjs';
import {auditDocumentLinks} from '../traceability/document-link-audit.mjs';

/** Preliminary desktop technical report. NO legal conclusion, EIA, EsIA, field
 * verification, official boundary or file authentication. Read-only DEMO.
 * Every record comes from the explicit local expediente; no generated scores.
 */
const safe=(value)=>value===null||value===undefined||value===''?'No informado':String(value);
const htmlEscape=value=>safe(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const txt=x=>htmlEscape(x);
const unique=(rows,id)=>rows.filter(row=>row?.id===id).length===1;
const valid=rows=>Array.isArray(rows)?rows:[];
const registered=(name,count,detail)=>({name,status:count?'Registro DEMO disponible':'No documentado',
 detail});
export const TECHNICAL_REPORT_SCHEMA='ambienta.preliminary_technical_review.v1';
export const TECHNICAL_REPORT_DISCLAIMER='DOCUMENTO DE TRABAJO · DEMOSTRACIÓN. '+
 'No constituye Estudio de Impacto Ambiental (EsIA), auditoría de campo, '+
 'declaración de impacto ambiental, autorización, certificación ni dictamen de cumplimiento. '+
 'Los registros de la demostración no acreditan fuentes oficiales.';

export function buildPreliminaryTechnicalReview(state){
 const impacts=valid(state?.impacts),measures=valid(state?.measures),
  inspections=valid(state?.inspections),evidence=valid(state?.evidence),
  findings=valid(state?.findings),actions=valid(state?.correctiveActions),
  programs=valid(state?.programs);
 const project=state?.project??{};
 const audit=auditDocumentLinks(state);
 const impactRows=impacts.map(impact=>{
  const linked=unique(impacts,impact.id)?measures.filter(m=>unique(measures,m.id)&&
   Array.isArray(m.impactIds)&&m.impactIds.includes(impact.id)):[];
  return {id:impact.id,name:impact.name,factor:impact.factor,phase:impact.phase,
   sign:impact.sign,measures:linked.map(m=>m.id),
   referenceStatus:unique(impacts,impact.id)?'Registrado':'ID duplicado — revisar'};
 });
 const measureRows=measures.map(m=>{
  const distinct=typeof m?.id==='string'&&unique(measures,m.id);
  const trace=distinct?measureDocumentTrace(state,m.id):null;
  const impactIds=valid(m?.impactIds);
  return {id:m?.id??null,title:m?.title??null,programId:m?.programId??null,
   program:trace?.program?.name??null,owner:m?.owner??null,
   indicator:m?.indicator??null,frequency:m?.frequency??null,
   criterion:m?.criterion??null,due:m?.due??null,status:m?.status??null,
   impactIds,ambiguous:!distinct,
   inspectionIds:trace?.inspections.map(i=>i.id)??[],
   evidenceIds:trace?.evidence.map(e=>e.record.id)??[],
   findingIds:trace?.findings.map(f=>f.id)??[],
   actionIds:trace?.actions.map(a=>a.id)??[],
   warnings:trace?.warnings.map(w=>w.message)??(!distinct?['Medida con identificador no único.']:[])
  };
 });
 const evidenceRows=evidence.map(e=>({
  id:e.id,label:e.label,reference:e.reference,status:e.status,
  measureId:e.measureId,inspectionId:e.inspectionId,
  author:e.author,createdAt:e.createdAt,reviewer:e.reviewer,reviewedAt:e.reviewedAt,
  filesIncluded:false
 }));
 const readiness=[
  registered('Ficha básica de proyecto',project?.id&&project?.name?1:0,
   'Identificación declarada en el expediente local; no hay acreditación administrativa.'),
  registered('Inventario de impactos',impacts.length,
   'Factores, etapa y signo declarados; sin metodología ni valoración de magnitud/significancia.'),
  registered('Plan de gestión y medidas',measures.length,
   'Responsables, indicadores y seguimiento documental; no equivale a eficacia ambiental verificada.'),
  registered('Inspecciones registradas',inspections.length,
   'Resultados declarados sin actas de campo autenticadas.'),
  registered('Referencias de evidencia',evidence.length,
   'Metadatos textuales; no se adjuntan ni autentican los archivos originales.'),
  {name:'Descripción técnica y alternativas del proyecto',status:'No documentado',
   detail:'Faltan memoria técnica, alternativas comparadas, etapas y magnitudes de obra verificadas.'},
  {name:'Área de influencia y delimitación oficial',status:'No acreditado',
   detail:'Los polígonos de ensayo, AOI y capas SIG locales no acreditan una delimitación oficial.'},
  {name:'Línea base físico-biótica y socioeconómica',status:'No documentado',
   detail:'Faltan campañas, datos medidos, metodología, fechas, unidades y fuentes trazables.'},
  {name:'Evaluación de significancia de impactos',status:'No documentado',
   detail:'No existen criterios justificados de magnitud, extensión, duración, reversibilidad o ponderación.'},
  {name:'Normativa y permisos aplicables',status:'No verificado',
   detail:'Jurisdicción, instrumentos y versiones normativas requieren investigación y validación profesional.'},
  {name:'Participación y consulta',status:'No documentado',
   detail:'No constan instancias participativas acreditadas ni actas asociadas.'},
  {name:'Cartografía final y anexos originales',status:'No acreditado',
   detail:'No se incorporan mapas periciales, datos geoespaciales originales ni anexos documentales verificables.'}
 ];
 return {
  schema:TECHNICAL_REPORT_SCHEMA,scope:'browser_local_demo',
  project:{id:project.id??null,name:project.name??null,
   province:project.province??null,phase:project.phase??null,
   kind:project.kind??null,proponent:project.proponent??null,
   technicalLead:project.technicalLead??null,status:project.status??null},
  provenance:{source:'Expediente de demostración en navegador',revision:state?.revision??null,
   demo:state?.demo===true,fieldworkVerified:false,officialBoundaryVerified:false,
   originalFilesIncluded:false,regulatoryAssessmentPerformed:false},
  counts:{impacts:impacts.length,programs:programs.length,measures:measures.length,
   inspections:inspections.length,evidence:evidence.length,findings:findings.length,
   correctiveActions:actions.length,documentaryWarnings:audit.total},
  impactRows,measureRows,
  inspections:inspections.map(i=>({id:i.id,date:i.date,result:i.result,
   measureId:i.measureId,assignee:i.assignee,note:i.note})),
  evidence:evidenceRows,
  findings:findings.map(f=>({id:f.id,title:f.title,inspectionId:f.inspectionId,
   status:f.status,severity:f.severity,description:f.description})),
  actions:actions.map(a=>({id:a.id,findingId:a.findingId,action:a.action,
   owner:a.owner,due:a.due,status:a.status,verification:a.verification})),
  documentaryWarnings:audit.issues.map(x=>({origin:x.sourceCollection,
   id:x.id,field:x.field,reference:x.reference,code:x.code,message:x.message})),
  readiness,disclaimer:TECHNICAL_REPORT_DISCLAIMER
 };
}
const td=v=>'<td>'+txt(v)+'</td>';
const tr=cells=>'<tr>'+cells.map(td).join('')+'</tr>';
const table=(head,rows)=>'<div class="table-scroll"><table><thead><tr>'+
 head.map(h=>'<th scope="col">'+txt(h)+'</th>').join('')+'</tr></thead><tbody>'+
 (rows.length?rows.map(tr).join(''):'<tr><td colspan="'+head.length+'">Sin registros declarados.</td></tr>')+
 '</tbody></table></div>';
const join=rows=>rows?.length?rows.join(', '):'Ninguno declarado';
const section=(id,title,content)=>'<section id="'+id+'"><h2>'+txt(title)+'</h2>'+content+'</section>';

export function renderPreliminaryTechnicalHtml(model){
 if(!model||model.schema!==TECHNICAL_REPORT_SCHEMA)throw Error('Modelo técnico no válido');
 const p=model.project,counts=model.counts;
 const fields=[
  ['Proyecto',p.name],['Identificador',p.id],['Tipo de obra',p.kind],
  ['Provincia declarada',p.province],['Etapa',p.phase],
  ['Proponente',p.proponent],['Responsable técnico',p.technicalLead],
  ['Estado declarado',p.status],['Revisión DEMO',model.provenance.revision]
 ];
 const projectTable=table(['Dato','Declaración'],fields);
 const impactTable=table(['ID','Impacto declarado','Factor','Etapa','Signo','Medidas por ID','Estado de referencia'],
  model.impactRows.map(x=>[x.id,x.name,x.factor,x.phase,x.sign,join(x.measures),x.referenceStatus]));
 const measureTable=table(['ID y medida','Programa','Responsable','Estado documental','Impactos','Inspecciones','Evidencias','Hallazgos','Acciones'],
  model.measureRows.map(x=>[safe(x.id)+' · '+safe(x.title),x.program??x.programId,x.owner,x.status,
   join(x.impactIds),join(x.inspectionIds),join(x.evidenceIds),
   join(x.findingIds),join(x.actionIds)]));
 const inspectionTable=table(['ID','Medida declarada','Fecha','Resultado declarado','Responsable','Nota'],
  model.inspections.map(x=>[x.id,x.measureId,x.date,x.result,x.assignee,x.note]));
 const evidenceTable=table(['ID','Descripción','Referencia textual','Medida','Inspección','Estado documental','Autor'],
  model.evidence.map(x=>[x.id,x.label,x.reference,x.measureId,x.inspectionId,x.status,x.author]));
 const findingTable=table(['ID','Inspección','Título','Clasificación declarada','Estado documental','Descripción'],
  model.findings.map(x=>[x.id,x.inspectionId,x.title,x.severity,x.status,x.description]));
 const actionTable=table(['ID','Hallazgo','Acción','Responsable','Vencimiento','Estado documental','Verificación declarada'],
  model.actions.map(x=>[x.id,x.findingId,x.action,x.owner,x.due,x.status,x.verification]));
 const readinessTable=table(['Componente','Disponibilidad','Información faltante o limitación'],
  model.readiness.map(x=>[x.name,x.status,x.detail]));
 const issuesTable=table(['Colección','Registro','Campo','Referencia','Tipo','Aviso'],
  model.documentaryWarnings.map(x=>[x.origin,x.id,x.field,x.reference,x.code,x.message]));
 const styles=`
  :root{color-scheme:light;font-family:Arial,Helvetica,sans-serif;color:#17252c}
  *{box-sizing:border-box} body{max-width:1120px;margin:0 auto;padding:38px 46px;background:#fff;font-size:13px;line-height:1.55}
  h1{font-size:28px;line-height:1.2;margin:12px 0}h2{font-size:19px;color:#12574c;margin:26px 0 12px;border-bottom:2px solid #d0e4df;padding-bottom:8px}
  h3{font-size:15px}p{max-width:105ch}.eyebrow{letter-spacing:.11em;font-weight:700;color:#27695d;font-size:11px}
  .warning{border-left:5px solid #995b1b;background:#fff5e7;padding:14px 18px;font-weight:600;margin:20px 0}
  .meta{color:#4f616a}table{border-collapse:collapse;width:100%;font-size:11px;table-layout:auto}
  th,td{border:1px solid #cfdddd;padding:8px 9px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
  th{background:#edf5f2;color:#1d3c38}tbody tr:nth-child(even){background:#f7f9f8}
  .table-scroll{width:100%;overflow-wrap:anywhere}section{break-inside:auto}
  tr{break-inside:avoid} .two{display:flex;gap:20px;flex-wrap:wrap}
  .stat{padding:10px 14px;background:#edf5f2;border-radius:8px;min-width:130px}
  .stat b{display:block;font-size:21px;color:#12574c}.foot{margin-top:32px;padding-top:12px;border-top:1px solid #becfc8;font-size:11px;color:#57666c}
  @page{size:A4;margin:15mm}
  @media print{body{padding:0;max-width:none;font-size:11px}.warning{background:#fff5e7!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}h2{break-after:avoid}section{page-break-inside:auto}}
 `;
 const header='<header><p class="eyebrow">AMBIENTA · DIAGNÓSTICO DOCUMENTAL PRELIMINAR</p>'+
 '<h1>Informe técnico de revisión del expediente</h1><p class="meta">'+
 txt(p.name)+' · '+txt(p.id)+' · '+txt(p.province)+'</p><div class="warning">'+
 txt(model.disclaimer)+'</div><p>Documento de análisis del estado de información disponible. '+
 'No se calcularon impactos ni resultados de monitoreo; se transcriben relaciones y estados registrados.</p></header>';
 const stats='<div class="two">'+Object.entries(counts).map(([key,v])=>
  '<div class="stat"><b>'+txt(v)+'</b>'+txt(key)+'</div>').join('')+'</div>';
 const body=header+
 section('alcance','1. Alcance y procedencia',
  '<p>Fuente: '+txt(model.provenance.source)+'. Revisión '+txt(model.provenance.revision)+
  '. No se incluyen archivos de evidencia, fotografías originales ni geometrías oficiales. '+
  'Las referencias a medidas e inspecciones se basan exclusivamente en identificadores expresos.</p>'+projectTable)+
 section('inventario','2. Inventario de componentes',stats)+
 section('impactos','3. Identificación de impactos (sin valoración de significancia)',impactTable)+
 section('pga','4. Plan de Gestión Ambiental: medidas documentadas',measureTable)+
 section('inspecciones','5. Inspecciones y monitoreo documental',inspectionTable)+
 section('evidencias','6. Evidencias y referencias declaradas',evidenceTable)+
 section('hallazgos','7. Hallazgos y acciones correctivas',findingTable+actionTable)+
 section('integridad','8. Integridad de vínculos declarados',issuesTable+
 '<p>Los avisos se refieren a la consistencia de IDs, no a infracciones ambientales.</p>')+
 section('faltantes','9. Matriz de información faltante para un EsIA',readinessTable)+
 section('siguientes','10. Condiciones para avanzar hacia un informe ambiental profesional',
 '<p>Se requiere documentación del proyecto y su área de influencia, línea base verificable, '+
 'metodología de valoración de impactos, análisis de alternativas, planes y monitoreos respaldados '+
 'por evidencias originales, cartografía de procedencia acreditada y revisión normativa por jurisdicción. '+
 'El resultado debe ser revisado y firmado por profesionales habilitados según corresponda.</p>')+
 '<footer class="foot">AMBIENTA · Documento de trabajo generado desde un expediente local de demostración. '+
 'El archivo HTML puede imprimirse como PDF desde el navegador. Sin certificación ambiental, '+
 'sin validación de fuentes externas y sin contenido SIG original adjunto.</footer>';
 return '<!doctype html><html lang="es"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>AMBIENTA · Diagnóstico documental preliminar</title><style>'+styles+
 '</style></head><body>'+body+'</body></html>';
}
export function preparePreliminaryTechnicalDownload(state){
 const model=buildPreliminaryTechnicalReview(state);
 const html=renderPreliminaryTechnicalHtml(model);
 const filename='ambienta-diagnostico-preliminar-'+String(model.project.id??'demo')
  .replace(/[^A-Za-z0-9_-]/g,'_')+'.html';
 return {model,html,filename};
}
