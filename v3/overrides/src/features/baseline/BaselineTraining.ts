import urban from '../../../../../docs/examples/battelle-training/DEMO-001_Battelle_SINTETICO.json';
import diablillos from '../../../../../docs/examples/battelle-training/DIAB-2026-DEMO_Battelle_SINTETICO.json';
import {emptyBaseline,validBaseline,type Indicator,type Observation} from './BaselineModel';
/** Opt-in reuse of the explicitly synthetic training report. No source measurements
 * are fabricated from inspections and no matrix storage is read or written. */
export function baselineTraining(projectId:string,projectName:string){
 const doc=emptyBaseline(projectId,projectName),now='2026-11-04T00:00:00.000Z';doc.updatedAt=now;
 const source=projectId==='DEMO-001'?urban:projectId==='DIAB-2026-DEMO'?diablillos:null;
 if(!source)throw Error('No hay ejemplo sintético para este proyecto. Podés registrar sus indicadores manualmente.');
 const ids=projectId==='DEMO-001'?['bc-03','bc-36']:['bc-27','bc-30'];
 for(const id of ids){
  const e=source.entries[id as keyof typeof source.entries];
  const indicator:Indicator={id:'lb-training-v1-'+projectId+'-'+id,name:e.indicator,factor:id==='bc-03'?'Biodiversidad':id==='bc-36'?'Aire':'Agua',unit:e.unit,method:'Estimación didáctica no calibrada, informe 16 de datos sintéticos Battelle. Sin muestreo real.',temporalSupport:id==='bc-36'?'Promedio hipotético de 24 h, fecha representativa de 2030':'Valor hipotético en una fecha representativa de 2030',description:'Ejemplo del informe de capacitación. Los números son magnitudes del indicador, no CA ni UIA. La ficha fuente '+id+' permanece en el informe; no se importan curvas ni pesos.',impactIds:projectId==='DEMO-001'?[id==='bc-03'?'IMP-BIO-001':'IMP-AIR-003']:['IMP-D-EFL'],createdAt:now};
  doc.indicators.push(indicator);
  for(const scenario of ['without','with'] as const){
   const row:Observation={id:indicator.id+'-'+scenario,indicatorId:indicator.id,start:'2030-01-15',end:'2030-01-15',location:'Punto sintético sin georreferencia; no representa una estación real',latitude:null,longitude:null,origin:'synthetic',basis:'estimated',scenario,horizon:source.horizon,
    qualifier:'exact',value:scenario==='without'?e.xWithout:e.xWith,detectionLimit:null,uncertainty:null,uncertaintyNote:'No cuantificada: números diseñados para capacitación, sin campaña ni intervalo de confianza.',source:scenario==='without'?e.evidenceWithout:e.evidenceWith,author:'Equipo ficticio de capacitación AMBIENTA',notes:'Fecha representativa adicional elegida para el ejemplo de registro. No corresponde a una campaña de la demo ni a una predicción ambiental validada.',supersedes:null,correctionReason:'',createdAt:now};
   doc.observations.push(row);
  }
 }
 if(!validBaseline(doc,projectId))throw Error('El ejemplo no supera el contrato de línea base.');
 return doc;
}
