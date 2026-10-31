// MITA / Plataforma Ambiental — demo domain, offline and framework-free.
// Domain logic: no regulatory conclusions and no automatically approved evidence.
export const VERSION = '0.5.0-demo';
export const STATUS_LABELS = {
  borrador:'Borrador', en_revision:'En revisión', en_ejecucion:'En ejecución', verificada:'Verificada'
};
export const PROGRAM_KINDS = ['Suelo','Agua','Aire','Residuos','Biodiversidad','Capacitación'];
const NOW = '2026-10-30T00:00:00.000Z';

function required(value, field, max=280) {
  const s=String(value==null?'':value).trim();
  if(!s || s.length>max) throw new Error(field+' es obligatorio (máximo '+max+' caracteres).');
  return s;
}
function exists(items,id,label) {
  if(!items.some(x=>x.id===id)) throw new Error(label+' no encontrado: '+id);
}
function newId(prefix) {
  const random = (typeof crypto!=='undefined' && crypto.randomUUID) ? crypto.randomUUID() :
    String(Date.now())+'-'+Math.random().toString(36).slice(2);
  return prefix+'-'+random;
}
function clone(input) { return JSON.parse(JSON.stringify(input)); }
function log(state,event,actor,details,now) {
  state.audit.push({id:newId('EVT'),at:now,actor:required(actor,'Operador',120),event,details});
}
function iso(value) {
  const d=new Date(value);
  if(!value || Number.isNaN(d.getTime())) throw new Error('Fecha inválida.');
  return d.toISOString();
}
function update(state,fn) {
  const next=clone(state);fn(next);
  next.revision=(state.revision||0)+1;
  return next;
}
export function createDemoState() {
  return {
    schema:1, demo:true, revision:0,
    project:{id:'DEMO-001',name:'Urbanización — expediente de ejemplo',kind:'Obra civil',
      province:'Salta',phase:'Construcción',status:'Borrador no aprobado',
      proponent:'Proponente ficticio',technicalLead:'Responsable por asignar'},
    impacts:[
      {id:'IMP-SUE-004',name:'Alteración de calidad del suelo',factor:'Suelo',phase:'Construcción',sign:'negativo'},
      {id:'IMP-AGU-002',name:'Alteración de escorrentías',factor:'Agua',phase:'Construcción',sign:'negativo'},
      {id:'IMP-AIR-003',name:'Emisión de material particulado',factor:'Aire',phase:'Construcción',sign:'negativo'},
      {id:'IMP-BIO-001',name:'Pérdida de cobertura vegetal',factor:'Biodiversidad',phase:'Preparación',sign:'negativo'}
    ],
    programs:[
      {id:'PG-SUE',name:'Protección del suelo',kind:'Suelo'},
      {id:'PG-AGU',name:'Gestión de agua y escorrentía',kind:'Agua'},
      {id:'PG-AIR',name:'Control de emisiones',kind:'Aire'},
      {id:'PG-RES',name:'Gestión de residuos',kind:'Residuos'},
      {id:'PG-BIO',name:'Biodiversidad y restauración',kind:'Biodiversidad'},
      {id:'PG-CAP',name:'Capacitación ambiental',kind:'Capacitación'}
    ],
    measures:[
      {id:'MED-001',programId:'PG-SUE',impactIds:['IMP-SUE-004'],title:'Prevención y control de derrames',
        detail:'Inspeccionar almacenamiento de combustibles y materiales peligrosos.',
        owner:'Coordinación ambiental',indicator:'Inspecciones conformes',frequency:'Semanal',
        due:'2026-11-15',status:'en_revision',criterion:'Registro de contención secundaria conforme'},
      {id:'MED-002',programId:'PG-AGU',impactIds:['IMP-AGU-002'],title:'Protección de drenajes',
        detail:'Verificar controles de sedimentos y escorrentía superficial.',
        owner:'Inspección ambiental',indicator:'Controles de sedimentos inspeccionados',frequency:'Quincenal',
        due:'2026-11-18',status:'borrador',criterion:'Inspección registrada y revisada'},
      {id:'MED-003',programId:'PG-AIR',impactIds:['IMP-AIR-003'],title:'Reducción de polvo de obra',
        detail:'Control operativo y registro de actividades generadoras de polvo.',
        owner:'Jefatura de obra',indicator:'Controles de polvo registrados',frequency:'Diaria',
        due:'2026-11-07',status:'en_ejecucion',criterion:'Actas e indicadores revisados'},
      {id:'MED-004',programId:'PG-BIO',impactIds:['IMP-BIO-001'],title:'Rescate de vegetación y revegetación',
        detail:'Inventariar cobertura afectada y documentar restauración.',
        owner:'Equipo de biodiversidad',indicator:'Superficie intervenida y restaurada',frequency:'Mensual',
        due:'2026-12-15',status:'borrador',criterion:'Superficies verificadas y registros georreferenciados'}
    ],
    inspections:[
      {id:'INSP-001',measureId:'MED-001',date:'2026-11-02',result:'pendiente',
        note:'Inspección programada (ejemplo).',assignee:'Coordinación ambiental'},
      {id:'INSP-002',measureId:'MED-003',date:'2026-11-03',result:'pendiente',
        note:'Control de polvo programado (ejemplo).',assignee:'Jefatura de obra'}
    ],
    evidence:[],findings:[],correctiveActions:[],
    audit:[{id:'EVT-DEMO',at:NOW,actor:'Sistema de demostración',event:'seed',
      details:'Todos los registros y cantidades de este expediente son ficticios.'}]
  };
}
export function validateState(s) {
  if(!s || s.schema!==1 || !s.demo || !Array.isArray(s.measures) || !Array.isArray(s.audit) ||
     !Array.isArray(s.programs) || !Array.isArray(s.impacts) || !Array.isArray(s.evidence) ||
     !Array.isArray(s.inspections) || !Array.isArray(s.findings) || !Array.isArray(s.correctiveActions))
     throw new Error('El archivo no cumple el esquema de demostración.');
  for(const m of s.measures) {
    exists(s.programs,m.programId,'Programa');
    if(!Array.isArray(m.impactIds)||!m.impactIds.length)throw new Error('La medida carece de impacto.');
    m.impactIds.forEach(id=>exists(s.impacts,id,'Impacto'));
    if(!(m.status in STATUS_LABELS))throw new Error('Estado inválido');
  }
  return true;
}
export function addMeasure(state,entry,actor='Técnico de demostración',now=new Date().toISOString()) {
  return update(state,s=>{
    exists(s.programs,entry.programId,'Programa');
    exists(s.impacts,entry.impactId,'Impacto');
    const m={id:newId('MED'),programId:entry.programId,impactIds:[entry.impactId],
      title:required(entry.title,'Título'),detail:required(entry.detail,'Descripción',1200),
      owner:required(entry.owner,'Responsable'),indicator:required(entry.indicator,'Indicador'),
      frequency:required(entry.frequency,'Frecuencia',100),
      due:required(entry.due,'Vencimiento',50),status:'borrador',
      criterion:required(entry.criterion,'Criterio de verificación',400)};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(m.due)||Number.isNaN(new Date(m.due+'T00:00:00Z').getTime()))
      throw new Error('Vencimiento inválido.');
    s.measures.push(m);log(s,'measure.created',actor,m.id,iso(now));
  });
}
export function recordInspection(state,entry,actor='Técnico de demostración',now=new Date().toISOString()) {
  return update(state,s=>{
    exists(s.measures,entry.measureId,'Medida');
    const result=entry.result||'pendiente';
    if(!['pendiente','conforme','observada','no_aplica'].includes(result))
      throw new Error('Resultado de inspección inválido');
    const ins={id:newId('INSP'),measureId:entry.measureId,date:required(entry.date,'Fecha',40),
      result,note:required(entry.note,'Observación',1200),
      assignee:required(entry.assignee,'Responsable')};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(ins.date)||Number.isNaN(Date.parse(ins.date)))
      throw new Error('Fecha de inspección inválida');
    s.inspections.push(ins);log(s,'inspection.created',actor,ins.id,iso(now));
  });
}
export function addEvidence(state,entry,actor='Técnico de demostración',now=new Date().toISOString()) {
  return update(state,s=>{
    if(entry.measureId)exists(s.measures,entry.measureId,'Medida');
    if(entry.inspectionId)exists(s.inspections,entry.inspectionId,'Inspección');
    if(!entry.measureId&&!entry.inspectionId)throw new Error('La evidencia requiere una referencia.');
    // Metadata only: this prototype cannot securely persist uploaded file bytes.
    const e={id:newId('EVID'),measureId:entry.measureId||null,inspectionId:entry.inspectionId||null,
      label:required(entry.label,'Descripción de evidencia',320),
      reference:required(entry.reference,'Referencia de archivo o acta',350),
      author:required(actor,'Responsable'),createdAt:iso(now),status:'pendiente',reviewer:null,
      reviewedAt:null};
    s.evidence.push(e);log(s,'evidence.registered',actor,e.id,iso(now));
  });
}
export function reviewEvidence(state,id,decision,reviewer,now=new Date().toISOString()) {
  return update(state,s=>{
    let e=s.evidence.find(x=>x.id===id);
    if(!e)throw new Error('Evidencia no encontrada');
    if(!['validada','rechazada'].includes(decision))throw new Error('Revisión inválida');
    const name=required(reviewer,'Revisor');
    if(name.trim().toLowerCase()===e.author.trim().toLowerCase())
      throw new Error('El autor no puede validar su propia evidencia.');
    e.status=decision;e.reviewer=name;e.reviewedAt=iso(now);
    log(s,'evidence.reviewed',name,e.id+' '+decision,iso(now));
  });
}
export function changeMeasureStatus(state,id,status,actor='Técnico de demostración',now=new Date().toISOString()) {
  return update(state,s=>{
    const m=s.measures.find(x=>x.id===id);
    if(!m)throw new Error('Medida no encontrada');
    if(!(status in STATUS_LABELS))throw new Error('Estado inválido');
    if(status==='verificada') {
      const accepted=s.evidence.some(e=>e.measureId===id && e.status==='validada');
      const inspection=s.inspections.some(i=>i.measureId===id && i.result==='conforme');
      if(!accepted||!inspection)throw new Error('Para verificar la medida se requieren inspección conforme y evidencia validada por un revisor.');
    }
    m.status=status;log(s,'measure.status',actor,id+' → '+status,iso(now));
  });
}
export function openFinding(state,entry,actor='Auditor de demostración',now=new Date().toISOString()) {
  return update(state,s=>{
    exists(s.inspections,entry.inspectionId,'Inspección');
    const f={id:newId('HALL'),inspectionId:entry.inspectionId,
      title:required(entry.title,'Hallazgo'),description:required(entry.description,'Descripción del hallazgo',1200),
      severity:entry.severity||'menor',status:'abierto',openedAt:iso(now)};
    if(!['observacion','menor','mayor'].includes(f.severity))throw new Error('Severidad inválida');
    s.findings.push(f);log(s,'finding.opened',actor,f.id,iso(now));
  });
}
export function addCorrectiveAction(state,entry,actor='Auditor de demostración',now=new Date().toISOString()) {
  return update(state,s=>{
    exists(s.findings,entry.findingId,'Hallazgo');
    const a={id:newId('AC'),findingId:entry.findingId,
      action:required(entry.action,'Acción correctiva',1200),
      owner:required(entry.owner,'Responsable'),due:required(entry.due,'Vencimiento'),
      status:'abierta',verification:'sin_verificar'};
    s.correctiveActions.push(a);log(s,'corrective_action.created',actor,a.id,iso(now));
  });
}
export function summary(state) {
  validateState(state);
  return {
    programs:state.programs.length,measures:state.measures.length,
    inReview:state.measures.filter(x=>x.status==='en_revision').length,
    verified:state.measures.filter(x=>x.status==='verificada').length,
    inspectionsPending:state.inspections.filter(x=>x.result==='pendiente').length,
    inspectionsObserved:state.inspections.filter(x=>x.result==='observada').length,
    evidencePending:state.evidence.filter(x=>x.status==='pendiente').length,
    findingsOpen:state.findings.filter(x=>x.status==='abierto').length,
    correctiveOpen:state.correctiveActions.filter(x=>x.status==='abierta').length
  };
}
export function measureTrace(state,id) {
  const m=state.measures.find(x=>x.id===id);
  if(!m)return null;
  return {measure:m,program:state.programs.find(x=>x.id===m.programId),
    impacts:m.impactIds.map(id=>state.impacts.find(x=>x.id===id)),
    inspections:state.inspections.filter(x=>x.measureId===id),
    evidence:state.evidence.filter(x=>x.measureId===id),
    findings:state.findings.filter(x=>state.inspections.some(i=>i.id===x.inspectionId&&i.measureId===id))};
}
export function exportJson(state) {
  validateState(state);
  return JSON.stringify(state,null,2);
}
