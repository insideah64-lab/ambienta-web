// Pure view helpers: safe rendering and explicit non-regulatory status.
export const escapeHtml = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const statusLabel = s=>({draft:'Borrador',in_review:'En revisión',archived:'Archivado',in_progress:'En ejecución',verification_pending:'Pendiente de verificación',pending:'Pendiente',conformant:'Conforme',observed:'Observada',not_applicable:'No aplica',open:'Abierto',investigating:'En investigación',minor:'Menor',major:'Mayor',observation:'Observación'}[s]||String(s||'Sin estado'));
export function summariseProject(data) {
  if(!data?.project)throw new Error('Expediente no disponible');
  const size=x=>Array.isArray(data[x])?data[x].length:0;
  return {impacts:size('environmental_impacts'),programs:size('management_programs'),
    measures:size('management_measures'),inspections:size('monitoring_inspections'),
    evidence:size('environmental_evidence'),findings:size('audit_findings'),
    actions:size('corrective_actions')};
}
export function linksForMeasure(data,measureId) {
  if(!data?.project)return [];
  const link=(data.measure_impact_links||[]).filter(x=>x.measure_id===measureId);
  return link.map(x=>(data.environmental_impacts||[]).find(i=>i.id===x.impact_id)).filter(Boolean);
}
export function nameFor(items,id,field='name') {
  return (Array.isArray(items)?items:[]).find(x=>x.id===id)?.[field]||'Referencia sin nombre';
}
export const noRegulatoryApproval='La plataforma no emite conformidades, aprobaciones regulatorias ni certificados ambientales.';
