import {uploadPendingEvidence,downloadPrivateEvidence} from './file-evidence.mjs';
/**
 * Adaptador Supabase para Plataforma Ambiental Argentina.
 *
 * No crea cliente ni incluye claves. Recibe un cliente autenticado creado por
 * una aplicación que instale @supabase/supabase-js con versión fijada.
 * RLS es la frontera real de autorización; NO confiar en filtros del navegador.
 * Deliberadamente no dispone de métodos de aprobación normativa ni de evidencias.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function id(value,label='Identificador') {
  if(typeof value!=='string'||!UUID.test(value))throw new Error(label+' inválido');
  return value;
}
function text(value,label,max=500) {
  if(typeof value!=='string'||!value.trim()||value.length>max)
    throw new Error(label+' obligatorio o demasiado extenso');
  return value.trim();
}
function result(response) {
  if(response?.error) throw new Error(response.error.message||'Error de base de datos');
  return response?.data;
}
export function createEnvironmentalRepository(supabase) {
  if(!supabase || typeof supabase.from!=='function' || typeof supabase.rpc!=='function' ||
    typeof supabase.auth?.getUser!=='function')
    throw new Error('Se requiere cliente Supabase autenticable');
  async function user() {
    const response=await supabase.auth.getUser();
    if(response.error)throw new Error('No se pudo verificar la sesión');
    const u=response.data?.user;
    if(!u?.id)throw new Error('Iniciá sesión para acceder a proyectos privados');
    return u;
  }
  async function listProjects() {
    await user();
    return result(await supabase.from('environmental_projects')
      .select('id,name,province,project_phase,status,created_at')
      .order('created_at',{ascending:false}));
  }
  async function createProject(values) {
    const u=await user();
    const data={
      owner_id:u.id,
      name:text(values.name,'Nombre de proyecto',240),
      province:text(values.province,'Provincia',80),
      activity_type:values.activity_type?.trim()||null,
      proponent:values.proponent?.trim()||null,
      project_phase:'planning',
      status:'draft'
    };
    return result(await supabase.from('environmental_projects')
      .insert(data).select('*').single());
  }
  async function loadProject(projectId) {
    await user();id(projectId,'Proyecto');
    const project=result(await supabase.from('environmental_projects')
      .select('*').eq('id',projectId).single());
    const tables=[
      'environmental_impacts','management_programs','management_measures',
      'measure_impact_links','monitoring_inspections','environmental_evidence',
      'audit_findings','corrective_actions'
    ];
    const records={project};
    for(const table of tables) {
      records[table]=result(await supabase.from(table).select('*').eq('project_id',projectId));
    }
    return records;
  }
  async function createImpact(projectId,values) {
    await user();id(projectId,'Proyecto');
    return result(await supabase.from('environmental_impacts').insert({
      project_id:projectId,code:text(values.code,'Código',70),
      title:text(values.title,'Impacto',240),factor:text(values.factor,'Factor',100),
      project_phase:text(values.project_phase,'Fase',80),
      sign:values.sign==='positive'?'positive':values.sign==='negative'?'negative':'uncertain'
    }).select('*').single());
  }
  async function createProgram(projectId,values) {
    await user();id(projectId,'Proyecto');
    return result(await supabase.from('management_programs').insert({
      project_id:projectId,code:text(values.code,'Código',70),
      name:text(values.name,'Programa',240),
      category:text(values.category,'Categoría',100),
      description:values.description?.trim()||null
    }).select('*').single());
  }
  async function createMeasure(projectId,values) {
    await user();id(projectId,'Proyecto');id(values.programId,'Programa');id(values.impactId,'Impacto');
    return result(await supabase.rpc('create_measure_with_impact',{
      p_project_id:projectId,p_program_id:values.programId,p_impact_id:values.impactId,
      p_title:text(values.title,'Medida',240),p_description:text(values.description,'Descripción',2000),
      p_owner_label:text(values.owner,'Responsable',240),
      p_indicator:text(values.indicator,'Indicador',500),
      p_criterion:text(values.criterion,'Criterio',500),
      p_frequency:text(values.frequency,'Frecuencia',80),
      p_due_date:values.dueDate||null
    }));
  }
  async function createInspection(projectId,measureId,values) {
    const u=await user();id(projectId,'Proyecto');id(measureId,'Medida');
    const allowed=new Set(['pending','conformant','observed','not_applicable']);
    if(!allowed.has(values.result))throw new Error('Resultado de inspección inválido');
    return result(await supabase.from('monitoring_inspections').insert({
      project_id:projectId,measure_id:measureId,recorded_by:u.id,
      scheduled_for:text(values.date,'Fecha',40),
      result:values.result,note:text(values.note,'Observación',2000)
    }).select('*').single());
  }
  async function registerEvidence(projectId,measureId,values) {
    const u=await user();id(projectId,'Proyecto');id(measureId,'Medida');
    if(values.inspectionId)id(values.inspectionId,'Inspección');
    return result(await supabase.from('environmental_evidence').insert({
      project_id:projectId,measure_id:measureId,inspection_id:values.inspectionId||null,
      created_by:u.id,label:text(values.label,'Descripción',320),
      reference_label:text(values.reference,'Referencia',350),status:'pending'
    }).select('*').single());
  }
  async function createFinding(projectId,inspectionId,values) {
    const u=await user();id(projectId,'Proyecto');id(inspectionId,'Inspección');
    const severity=values.severity||'minor';
    if(!['observation','minor','major'].includes(severity))throw new Error('Severidad inválida');
    return result(await supabase.from('audit_findings').insert({
      project_id:projectId,inspection_id:inspectionId,created_by:u.id,
      title:text(values.title,'Hallazgo',240),description:text(values.description,'Descripción',2000),
      severity,status:'open'
    }).select('*').single());
  }
  async function createCorrectiveAction(projectId,findingId,values) {
    const u=await user();id(projectId,'Proyecto');id(findingId,'Hallazgo');
    return result(await supabase.from('corrective_actions').insert({
      project_id:projectId,finding_id:findingId,created_by:u.id,
      action:text(values.action,'Acción correctiva',2000),
      owner_label:text(values.owner,'Responsable',240),due_date:values.dueDate||null,
      status:'open'
    }).select('*').single());
  }
  async function uploadEvidenceFile(projectId,measureId,values) {
    const u=await user();id(projectId,'Proyecto');id(measureId,'Medida');
    return uploadPendingEvidence(supabase,{projectId,measureId,userId:u.id,label:values.label,
      file:values.file,inspectionId:values.inspectionId||null});
  }
  async function downloadEvidence(record) {
    await user();
    return downloadPrivateEvidence(supabase,record);
  }
  return Object.freeze({listProjects,createProject,loadProject,createImpact,createProgram,
    createMeasure,createInspection,registerEvidence,uploadEvidenceFile,downloadEvidence,
    createFinding,createCorrectiveAction});
}
