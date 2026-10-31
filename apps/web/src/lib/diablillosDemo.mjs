
// Caso basado en el informe documental aportado por el usuario (31/10/2026).
// El contexto administrativo se cita como referencia pública: NUNCA confundir con
// una auditoría oficial. Las inspecciones, medidas y evaluaciones son TODAS sintéticas.
export const DIABLILLOS_CASE_ID='diablillos-2026-demo';
export const DIABLILLOS_SOURCES=[
  {id:'SRC-01',label:'Convocatoria de audiencia, Boletín Oficial 22146',url:'https://boletinoficialsalta.gob.ar/boletindigital/2026/22146.pdf',kind:'referencia_publica',verifiedByApp:false},
  {id:'SRC-02',label:'Comunicación provincial sobre DIA, 27/04/2026',url:'https://produccionsalta.gob.ar/la-secretaria-de-mineria-otorgo-la-declaracion-de-impacto-ambiental-al-proyecto-diablillos/',kind:'referencia_publica',verifiedByApp:false},
  {id:'SRC-03',label:'Gobierno de Salta, audiencia pública concluida',url:'https://www.salta.gob.ar/prensa/noticias/finalizo-la-audiencia-publica-por-el-proyecto-de-plata-y-oro-diablillos-en-la-puna-saltenia-107290',kind:'referencia_publica',verifiedByApp:false},
  {id:'SRC-04',label:'Fiscalización ambiental y social, marzo de 2025',url:'https://www.salta.gob.ar/prensa/noticias/fiscalizacion-ambiental-y-social-en-proyecto-diablillos-plata-100824',kind:'referencia_publica',verifiedByApp:false},
  {id:'SRC-05',label:'Inspección provincial comunicada en 2020',url:'https://www.salta.gob.ar/prensa/noticias/policia-minera-de-salta-inspecciono-el-proyecto-metalifero-diablillos-69011',kind:'referencia_publica',verifiedByApp:false},
  {id:'SRC-06',label:'Inspección provincial comunicada en 2021',url:'https://www.salta.gob.ar/prensa/noticias/mineria-inspecciono-un-proyecto-de-exploracion-metalifera-en-la-puna-78906',kind:'referencia_publica',verifiedByApp:false}
];
export function createDiablillosState() {
 const now='2026-10-31T15:30:00.000Z';
 return {
  schema:1,demo:true,revision:0,
  project:{id:'DIAB-2026-DEMO',name:'Diablillos — auditoría documental DEMO',kind:'Minería metalífera (contexto documental)',province:'Salta',phase:'Evaluación documental de explotación',status:'DIA informada públicamente (no certifica cumplimiento)',proponent:'Pacific Rim Mining Corporation Argentina S.A.',technicalLead:'Responsable Ambiental DEMO — simulado'},
  impacts:[
   {id:'IMP-D-AGU',name:'Presión potencial sobre aguas superficiales y subterráneas',factor:'Agua',phase:'Explotación (hipotética)',sign:'negativo'},
   {id:'IMP-D-EFL',name:'Riesgo potencial de alteración por efluentes',factor:'Agua',phase:'Explotación (hipotética)',sign:'negativo'},
   {id:'IMP-D-SUE',name:'Posible afectación de suelo y gestión de residuos',factor:'Suelo',phase:'Explotación (hipotética)',sign:'negativo'},
   {id:'IMP-D-SOC',name:'Participación pública y comunicación socioambiental',factor:'Social',phase:'Gestión (hipotética)',sign:'mixto'}
  ],
  programs:[
   {id:'PG-D-AGU',name:'Monitoreo hídrico documental DEMO',kind:'Agua'},
   {id:'PG-D-EFL',name:'Control de efluentes documental DEMO',kind:'Agua'},
   {id:'PG-D-RES',name:'Suelos y residuos documental DEMO',kind:'Residuos'},
   {id:'PG-D-SOC',name:'Participación y trazabilidad DEMO',kind:'Capacitación'}
  ],
  measures:[
   {id:'MED-DIAB-001',programId:'PG-D-AGU',impactIds:['IMP-D-AGU'],title:'DEMO · Revisar trazabilidad de monitoreo hídrico',detail:'Prueba documental sintética; no contiene resultados reales ni demuestra calidad de agua. Vincular actas, metodología y cadena de custodia solo cuando existan documentos verificables.',owner:'Responsable Ambiental DEMO',indicator:'Porcentaje de actas documentales revisadas (solo QA)',frequency:'Trimestral (propuesto)',due:'2026-11-15',status:'en_ejecucion',criterion:'Para QA: inspección simulada conforme y evidencia sintética validada por actor distinto.'},
   {id:'MED-DIAB-002',programId:'PG-D-EFL',impactIds:['IMP-D-EFL'],title:'DEMO · Verificar documentación de efluentes',detail:'Prueba con observación simulada deliberada. No representa contaminación ni infracción de Diablillos.',owner:'Responsable Ambiental DEMO',indicator:'Referencias de efluentes revisadas (solo QA)',frequency:'Mensual (propuesto)',due:'2026-11-20',status:'en_revision',criterion:'Una observación abierta debe impedir cierre de conformidad en la prueba.'},
   {id:'MED-DIAB-003',programId:'PG-D-RES',impactIds:['IMP-D-SUE'],title:'DEMO · Trazabilidad de residuos y suelos',detail:'Verificación documental simulada, sin actas ni mediciones reales.',owner:'Responsable Ambiental DEMO',indicator:'Registros documentales pendientes (QA)',frequency:'Mensual (propuesto)',due:'2026-11-25',status:'borrador',criterion:'Registrar documentación y revisión independiente antes de cierre.'},
   {id:'MED-DIAB-004',programId:'PG-D-SOC',impactIds:['IMP-D-SOC'],title:'DEMO · Participación y acceso a información',detail:'Referenciar audiencia pública sin reproducir información sensible de participantes.',owner:'Responsable Ambiental DEMO',indicator:'Referencias públicas registradas (QA)',frequency:'Semestral (propuesto)',due:'2026-12-05',status:'borrador',criterion:'Conservar procedencia y evitar inferencias de cumplimiento.'}
  ],
  inspections:[
   {id:'INSP-DIAB-001',measureId:'MED-DIAB-001',date:'2026-10-30',result:'conforme',note:'SIMULACIÓN DOCUMENTAL: resultado ficticio de control de trazabilidad; no se realizó visita de campo.',assignee:'Auditor Inspector DEMO'},
   {id:'INSP-DIAB-002',measureId:'MED-DIAB-002',date:'2026-10-30',result:'observada',note:'SIMULACIÓN DOCUMENTAL: observación menor ficticia por referencia incompleta; no acusa incumplimiento real.',assignee:'Auditor Inspector DEMO'}
  ],
  evidence:[
   {id:'EVID-D-001',measureId:'MED-DIAB-001',inspectionId:'INSP-DIAB-001',label:'DEMO · Acta de revisión hídrica sintética 001',reference:'SIMULADO://diablillos/acta-hidrica-001',author:'Responsable Ambiental DEMO',status:'validada',createdAt:now,reviewer:'Auditor Inspector DEMO',reviewedAt:now},
   {id:'EVID-D-002',measureId:'MED-DIAB-001',inspectionId:'INSP-DIAB-001',label:'DEMO · CSV sintético de cadena de custodia (sin datos químicos)',reference:'SIMULADO://diablillos/cadena-custodia-001.csv',author:'Responsable Ambiental DEMO',status:'validada',createdAt:now,reviewer:'Auditor Inspector DEMO',reviewedAt:now},
   {id:'EVID-D-003',measureId:'MED-DIAB-001',inspectionId:'INSP-DIAB-001',label:'DEMO · Lista de control documental sintética',reference:'SIMULADO://diablillos/checklist-001',author:'Responsable Ambiental DEMO',status:'validada',createdAt:now,reviewer:'Auditor Inspector DEMO',reviewedAt:now},
   {id:'EVID-D-004',measureId:'MED-DIAB-002',inspectionId:'INSP-DIAB-002',label:'DEMO · Registro sintético de efluentes pendiente',reference:'SIMULADO://diablillos/efluentes-pendiente',author:'Responsable Ambiental DEMO',status:'pendiente',createdAt:now,reviewer:null,reviewedAt:null},
   {id:'EVID-D-005',measureId:'MED-DIAB-003',inspectionId:null,label:'DEMO · Inventario sintético de residuos pendiente',reference:'SIMULADO://diablillos/residuos-pendiente',author:'Responsable Ambiental DEMO',status:'pendiente',createdAt:now,reviewer:null,reviewedAt:null},
   {id:'EVID-D-006',measureId:'MED-DIAB-004',inspectionId:null,label:'DEMO · Matriz sintética de participación pendiente',reference:'SIMULADO://diablillos/participacion-pendiente',author:'Responsable Ambiental DEMO',status:'pendiente',createdAt:now,reviewer:null,reviewedAt:null}
  ],
  findings:[{id:'HALL-D-001',inspectionId:'INSP-DIAB-002',title:'DEMO · Observación documental simulada',description:'Hallazgo ficticio sobre trazabilidad incompleta para probar acciones correctivas. NO es una infracción ni un hallazgo en campo del proyecto real.',severity:'menor',status:'abierto',openedAt:now}],
  correctiveActions:[{id:'AC-D-001',findingId:'HALL-D-001',action:'DEMO · Solicitar y revisar referencia de efluentes sin inferir resultado real',owner:'Responsable Ambiental DEMO',due:'2026-11-30',status:'abierta',verification:'sin_verificar'}],
  audit:[{id:'EVT-DIAB-SEED',at:now,actor:'Sistema de demostración',event:'seed.diablillos',details:'Caso del informe documental Diablillos; todas las medidas, inspecciones, hallazgos, evidencias operativas y resultados son SIMULADOS. Fuentes públicas registradas solo como referencias.'}]
 };
}
