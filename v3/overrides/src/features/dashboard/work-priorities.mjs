// V3.5.6: derived WORKFLOW priorities; never infer environmental danger,
// legal non-compliance, severity or work completion from the demo records.
const OPEN_CORRECTIVE=new Set(['abierta','abierto','pendiente','en_ejecucion','en_revision']);
const isActiveCorrective=s=>OPEN_CORRECTIVE.has(String(s||'').toLowerCase());
export function summarizeWork(data){
 const findings=(data.findings||[]).filter(f=>f.status==='abierto');
 const corrective=(data.correctiveActions||[]).filter(a=>isActiveCorrective(a.status));
 const measures=(data.measures||[]).filter(m=>m.status==='en_revision');
 const evidence=(data.evidence||[]).filter(e=>e.status==='pendiente');
 const inspections=(data.inspections||[]).filter(i=>i.result==='pendiente');
 const groups=[
  {key:'findings',count:findings.length,label:'Hallazgos para seguimiento',
   description:findings[0]?.title||'Registrar y revisar hallazgos abiertos',
   path:'/auditorias',category:'seguimiento',caption:'Estado del registro, no una infracción verificada'},
  {key:'corrective',count:corrective.length,label:'Acciones correctivas abiertas',
   description:corrective[0]?.action||'Revisar acciones y su verificación',
   path:'/auditorias',category:'seguimiento',caption:'Acciones documentales con cierre pendiente'},
  {key:'measures',count:measures.length,label:'Medidas para revisión',
   description:measures[0]?.title||'Revisar medidas del PGA',
   path:'/pga',category:'revision',caption:'Medidas que están en estado «En revisión»'},
  {key:'evidence',count:evidence.length,label:'Evidencias por revisar',
   description:evidence[0]?.label||'Revisar documentación pendiente',
   path:'/evidencias',category:'revision',caption:'Documentos pendientes de revisión'},
  {key:'inspections',count:inspections.length,label:'Inspecciones pendientes',
   description:inspections[0]?.id||'Revisar inspecciones pendientes',
   path:'/monitoreo',category:'revision',caption:'Registros de inspección pendientes'}
 ];
 return {
  groups:groups.filter(x=>x.count>0),
  followUp:findings.length+corrective.length,
  review:measures.length+evidence.length+inspections.length,
  all:groups.reduce((sum,g)=>sum+g.count,0),
  noPending:groups.every(g=>g.count===0)
 };
}
