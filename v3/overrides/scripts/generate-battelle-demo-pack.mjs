import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createDemoState} from '../../../web/domain.mjs';
import {createDiablillosState} from '../../../apps/web/src/lib/diablillosDemo.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const require=createRequire(path.join(root,'apps/web-v3/package.json'));
const built=await require('esbuild').build({entryPoints:[path.join(root,'v3/overrides/src/features/impacts/BattelleModel.ts')],bundle:true,write:false,format:'esm',platform:'node'});
const model=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
export const DEMO_PACK_VERSION='ambienta.battelle-training-pack.v1';
// Every figure below is authored for training. No value is a measurement,
// legal threshold, calibrated forecast, or observation about a real project.
const urban=[
 ['bc-03','Cobertura de vegetación natural','% de 100 ha ficticias',60,42,'0;0\n100;1','IMP-BIO-001','MED-004','Área de 100 ha inventada: 60 ha SIN y 42 ha CON; no usa polígonos SIG.',.6,.42,-2.52,'major'],
 ['bc-12','Superficie de hábitat natural o permeable','% de 100 ha ficticias',70,50,'0;0\n100;1','IMP-BIO-001','MED-004','Hábitat permeable hipotético; incluye vegetación, no se suma a ella como área independiente.',.7,.5,-2.4,'major'],
 ['bc-28','Desviación absoluta del caudal estacional de referencia','%',10,30,'0;1\n100;0','IMP-AGU-002','MED-002','Índice hidrológico didáctico; no procede de modelo hidrológico ni de inspecciones de drenaje.',.9,.7,-5.6,'minor'],
 ['bc-36','PM10 representativo, promedio de 24 h hipotético','µg/m³',25,75,'0;1\n50;0.8\n100;0.4\n200;0','IMP-AIR-003','MED-003','Concentración sintética. La curva no representa una norma ni una recomendación sanitaria.',.9,.6,-3.6,'major'],
 ['bc-40','Superficie con alteración edáfica persistente','% de 100 ha ficticias',5,20,'0;1\n100;0','IMP-SUE-004','MED-001','Capa hipotética de afectación del suelo; no se deduce del número de inspecciones conformes.',.95,.8,-2.1,'minor'],
 ['bc-41','Pérdida anual de suelo por erosión','t/ha/año',2,8,'0;1\n10;0.5\n20;0','IMP-SUE-004','MED-001','Tasa anual media inventada para entrenamiento; no es una estimación RUSLE ni un registro de campo.',.9,.6,-4.2,'major']
];
const diablillos=[
 ['bc-19','Pérdida de balance hídrico de referencia','%',8,18,'0;1\n100;0','IMP-D-AGU','MED-DIAB-001','Balance sintético para una cuenca ficticia. No describe consumos ni impactos del proyecto real.',.92,.82,-2,'minor'],
 ['bc-27','pH en punto ficticio de comparación','unidad de pH',7.5,8.5,'0;0\n6.5;0.8\n7.5;1\n9;0.5\n14;0','IMP-D-EFL','MED-DIAB-002','Máximo didáctico en 7,5, elegido para enseñar una función no monótona; no es óptimo ecológico validado ni límite legal.',1,2/3,-6,'major'],
 ['bc-29','Desviación absoluta de temperatura de referencia','°C',1,2,'0;1\n5;0','IMP-D-EFL','MED-DIAB-002','Diferencia térmica inventada, no temperatura absoluta ni medición de un efluente.',.8,.6,-5.6,'minor'],
 ['bc-30','Sólidos disueltos totales en agua ficticia','mg/L',300,600,'0;1\n1000;0','IMP-D-EFL','MED-DIAB-002','Datos sintéticos sin análisis químico, cadena de custodia ni equivalencia normativa.',.7,.4,-7.5,'major'],
 ['bc-32','Turbidez en agua ficticia','NTU',5,20,'0;1\n50;0','IMP-D-EFL','MED-DIAB-002','Datos inventados; la evidencia documental de la demo no contiene estos valores.',.9,.6,-6,'major'],
 ['bc-41','Pérdida anual de suelo por erosión','t/ha/año',2,5,'0;1\n10;0.5\n20;0','IMP-D-SUE','MED-DIAB-003','Tasa sintética, sin localización geográfica ni atribución de afectación real.',.9,.75,-2.1,'minor'],
 ['bc-78','Rúbrica didáctica de interacción y diálogo','puntos de rúbrica (0-10)',5,7,'0;0\n10;1','IMP-D-SOC','MED-DIAB-004','Rúbrica inventada de cinco ítems 0-2; no se calcula desde referencias revisadas ni acredita participación real.',.5,.7,2.2,'none']
];
const approx=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
export function buildDemoPack(){
 const cases=[];
 for(const [state,rows,tag,area] of [[createDemoState(),urban,'URBANIZACION','100 ha hipotéticas sin georreferencia ni relación con polígonos del proyecto'],[createDiablillosState(),diablillos,'DIABLILLOS_DEMO','Cuenca hipotética de 100 km², sin coordenadas, sin correspondencia con el proyecto real']]){
  const original=JSON.stringify(state),doc=model.emptyBattelle(state.project.id,state.project.name);
  doc.updatedAt='2026-11-04T00:00:00.000Z';doc.alternative=`SIMULACIÓN EDUCATIVA ${tag}. No es evaluación ambiental del proyecto.`;
  doc.horizon='Año hipotético 2030: SIN y CON al mismo horizonte; ambos estimados, sin visita de campo.';
  doc.boundary=`SIMULACIÓN: ${area}. Comparación operativa hipotética; SIN incluye evolución sin intervención y CON la alternativa ficticia, sin capa residual separada.`;
  doc.ecosystems='SIMULACIÓN EDUCATIVA: descripción conceptual pendiente de inventarios reales. Relaciones agua-suelo-biota y efectos acumulativos no cuantificados. El relato no convierte parámetros faltantes en no aplicables.';
  const details=[];
  for(const [id,indicator,unit,sin,con,curve,impact,measure,rationale,caSin,caCon,delta,flag] of rows){
   assert(state.impacts.some(x=>x.id===impact));assert(state.measures.some(x=>x.id===measure&&x.impactIds.includes(impact)));
   const p=model.BATTELLE_PARAMETERS.find(p=>p.id===id);
   doc.entries[id]={...model.emptyBattelleEntry(),indicator:'SINTÉTICO · '+indicator,unit,xWithout:sin,xWith:con,kindWithout:'estimated',kindWith:'estimated',
    evidenceWithout:`SIMULACIÓN ${DEMO_PACK_VERSION}; ${state.project.id}/${id}/SIN: ${sin} ${unit}. Valor diseñado en el informe didáctico, no medido.`,
    evidenceWith:`SIMULACIÓN ${DEMO_PACK_VERSION}; ${state.project.id}/${id}/CON: ${con} ${unit}. Valor diseñado en el informe didáctico, no predicción calibrada.`,
    curveText:curve,curveSource:`FUNCIÓN DIDÁCTICA PROPUESTA, NO VALIDADA: nudos del informe AMBIENTA Datos Demo Battelle, ficha ${state.project.id}/${id}. ${rationale} No se atribuye al Anejo 4 ni a Dee.`,
    convention:'Convención didáctica común: CA=1 es el extremo favorable y CA=0 el desfavorable del dominio hipotético. Ningún nudo, incluido CA=0,5, representa un umbral legal. No extrapolar ni comparar con otro estudio sin validar la función.',evaluator:'Equipo ficticio de capacitación AMBIENTA; sin revisión técnica independiente.'};
   const r=model.evaluateBattelle(doc,p);assert(r.ready);approx(r.without,caSin);approx(r.withProject,caCon);approx(r.delta,delta);assert.equal(r.flag,flag);
   details.push({id,parameter:p.name,category:p.category,component:p.component,weight:p.weight,indicator,unit,sin,con,curve,impact,measure,rationale,expected:{caSin,caCon,uiaSin:caSin*p.weight,uiaCon:caCon*p.weight,delta,flag}});
  }
  assert(model.validBattelle(doc,state.project.id));assert.equal(JSON.stringify(state),original);
  const s=model.summarizeBattelle(doc),expected=tag==='URBANIZACION'?{ready:6,coveredWeight:94,without:78.7,withProject:58.28,delta:-20.42,major:4,minor:2}:{ready:7,coveredWeight:136,without:112.4,withProject:85.4,delta:-27,major:3,minor:3};
  for(const k of ['ready','coveredWeight','without','withProject','delta'])approx(s[k],expected[k]);assert.equal(s.complete,false);
  assert.equal(s.rows.filter(r=>r.flag==='major').length,expected.major);assert.equal(s.rows.filter(r=>r.flag==='minor').length,expected.minor);
  cases.push({tag,source:{project:state.project,counts:Object.fromEntries(['impacts','programs','measures','inspections','evidence','findings','correctiveActions'].map(k=>[k,state[k].length])),impacts:state.impacts,measures:state.measures.map(m=>({id:m.id,impactIds:m.impactIds,title:m.title,indicator:m.indicator}))},doc,details,expected});
 }
 const control=model.emptyBattelle('DEMO-001','CONTROL TÉCNICO DE 78 PARÁMETROS · NO EVALUACIÓN');
 Object.assign(control,{updatedAt:'2026-11-04T00:00:00.000Z',alternative:'CONTROL ARITMÉTICO EXHAUSTIVO QA-078. NO ES ESCENARIO AMBIENTAL NI DESCRIPCIÓN DE DEMO-001.',horizon:'Sin horizonte ambiental: comparación técnica fija SIN=50, CON=40.',boundary:'Sin territorio ni receptores reales; usar solamente para verificar sumas, persistencia y exportación.',ecosystems:'Sin descripción ambiental: este texto es únicamente un marcador del control técnico, no una caracterización de ecosistemas.'});
 for(const p of model.BATTELLE_PARAMETERS)control.entries[p.id]={...model.emptyBattelleEntry(),indicator:`CONTROL QA, NO INDICADOR AMBIENTAL: ${p.id}`,unit:'puntos técnicos QA (0-100)',xWithout:50,xWith:40,kindWithout:'estimated',kindWith:'estimated',evidenceWithout:'VALOR ARTIFICIAL FIJO=50 del generador QA-078; no medición ni evidencia ambiental.',evidenceWith:'VALOR ARTIFICIAL FIJO=40 del generador QA-078; no predicción ni evidencia ambiental.',curveText:'0;0\n100;1',curveSource:'Recta artificial QA: CA=x/100 en todos los identificadores, exclusivamente para validar operaciones. No representa la función ambiental de ningún parámetro del catálogo.',convention:'Escala de prueba técnica, sin significado de calidad ambiental ni equivalencia normativa.',evaluator:'Generador automático de pruebas AMBIENTA, no equipo evaluador.'};
 const cs=model.summarizeBattelle(control);assert.equal(cs.complete,true);approx(cs.without,500);approx(cs.withProject,400);approx(cs.delta,-100);assert.equal(cs.coveredWeight,1000);
 assert.equal(cs.rows.filter(r=>r.flag==='major').length,18);assert.equal(cs.rows.filter(r=>r.flag==='minor').length,60);
 return {version:DEMO_PACK_VERSION,methodCodeCommit:'adf76beee6ff55842ea42dd5ca06113df7af2f2b',warning:'TODO VALOR NUEVO ES SINTÉTICO. Funciones propuestas para capacitación, sin validación ambiental. No atribuir resultados a proyectos reales.',cases,control:{doc:control,expected:{ready:78,coveredWeight:1000,without:500,withProject:400,delta:-100,major:18,minor:60}},model};
}
export async function writeDemoPack(out='qa/ambienta-battelle-demo-pack'){
 const pack=buildDemoPack();await fs.mkdir(out,{recursive:true});
 for(const c of pack.cases){await fs.writeFile(path.join(out,c.source.project.id+'_Battelle_SINTETICO.json'),JSON.stringify(c.doc,null,2));await fs.writeFile(path.join(out,c.source.project.id+'_Battelle_SINTETICO.csv'),pack.model.battelleCsv(c.doc));}
 await fs.writeFile(path.join(out,'DEMO-001_Battelle_CONTROL_78_NO_EVALUACION.json'),JSON.stringify(pack.control.doc,null,2));
 await fs.writeFile(path.join(out,'datos-informe.json'),JSON.stringify({...pack,model:undefined,control:{...pack.control,doc:undefined},cases:pack.cases.map(c=>({...c,doc:undefined}))},null,2));
 await fs.writeFile(path.join(out,'resultados-esperados.json'),JSON.stringify({version:pack.version,cases:pack.cases.map(c=>({projectId:c.source.project.id,...c.expected})),control:pack.control.expected},null,2));
 return pack;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const pack=await writeDemoPack(process.env.QA_OUTPUT);console.log(JSON.stringify({version:pack.version,cases:pack.cases.map(c=>({id:c.doc.projectId,...c.expected})),control:pack.control.expected}));
}
