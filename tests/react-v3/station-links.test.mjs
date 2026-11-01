import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {syntheticStudyPolygon,createStudyScenario} from '../../v3/overrides/src/features/maps/study-areas.mjs';
import {analyzePointsInStudyAreas} from '../../v3/overrides/src/features/maps/point-zone-analysis.mjs';
import {blankMeasurementBook,addMeasurement,voidMeasurement} from '../../v3/overrides/src/features/monitoring/measurements.mjs';
import {stationContext,blankStationLinks,proposeStationLink,reviewStationLink,
 readStationLinks,stationLinkSummary,exportStationLinks,validateStationLinks}
 from '../../v3/overrides/src/features/maps/station-links.mjs';
const time='2026-11-01T12:00:00.000Z',later='2026-11-01T13:00:00.000Z';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const bbox=[-67.254,-24.75,-67.146,-24.65];
const xy=(x,y)=>[Number((bbox[0]+(bbox[2]-bbox[0])*x).toFixed(9)),
 Number((bbox[1]+(bbox[3]-bbox[1])*y).toFixed(9))];
const fc=features=>({type:'FeatureCollection',features});
function domain(){return {demo:true,revision:0,project:{id:'DIAB-2026-DEMO'},
 measures:[{id:'MED-DIAB-001'}],inspections:[],evidence:[]};}
const sample=(station,sample)=>({measureId:'MED-DIAB-001',inspectionId:null,evidenceId:null,
 sampleId:sample,stationId:station,matrix:'agua',parameter:'Sonda QA',qualifier:'quantified',
 unit:'°C',value:4,detectionLimit:null,quantificationLimit:null,uncertainty:null,
 collectedAt:time,analyzedAt:null,method:'Método sintético',sourceId:'QA-NO-REAL',
 operator:'Proponente QA'});
function fixture(){
 const data=domain();
 let measurements=blankMeasurementBook(data,time);
 measurements=addMeasurement(measurements,data,sample('EST-A','S-1'),later);
 measurements=addMeasurement(measurements,data,sample('EST-B','S-2'),later);
 const parent=fc([syntheticStudyPolygon(bbox)]);
 const scenario=createStudyScenario({bbox,geojson:parent,sourceHash:sha(parent),
  sourceKind:'synthetic',generatedAt:time});
 const geometry=[xy(.26,.5),xy(.02,.5),xy(.29,.5)].map((coord,i)=>({
  type:'Feature',properties:{name:'Punto QA '+i},geometry:{type:'Point',coordinates:coord}}));
 const geojson=fc(geometry);
 const layer={sha256:sha(geojson),fileName:'qa-estaciones.geojson',source:'Ensayo QA sin campo',geojson};
 const report=analyzePointsInStudyAreas({layer,scenario,analyzedAt:later});
 const ctx=stationContext({book:measurements,data,report,layer,scenario});
 return {data,measurements,scenario,layer,report,ctx};
}
const proposal=(stationId,pointRef)=>({stationId,pointRef,sourceId:'ACTA-QA-FICTICIA',
 positionMethod:'GPS simulado solo para QA',positionObservedAt:time,accuracyMeters:1,
 proposer:'Proponente QA'});
test('empty register never invents measurements, coordinates or stations',()=>{
 const {ctx}=fixture(),empty=blankStationLinks(ctx,time);
 assert.deepEqual(empty.entries,[]);
 assert.deepEqual(ctx.stations,['EST-A','EST-B']);
 assert.deepEqual(stationLinkSummary(empty,ctx),{total:0,accepted:0,pending:0,
  reviewSpatial:0,rejected:0,unlinked:2});
});
test('manual source and point reference require independent human decision',()=>{
 const {ctx}=fixture(),empty=blankStationLinks(ctx,time);
 const pending=proposeStationLink(empty,ctx,proposal('EST-A','F1'),later);
 assert.equal(pending.entries[0].zoneId,'A');
 assert.equal(pending.entries[0].status,'awaiting_review');
 assert.equal(pending.entries[0].pointRef,'F1');
 assert.equal(empty.entries.length,0);
 assert.throws(()=>reviewStationLink(pending,ctx,'EST-A','accept','Proponente QA','Autovalidado',later),/proponente no puede/);
 const accepted=reviewStationLink(pending,ctx,'EST-A','accept','Revisor QA','Archivo y geometría examinados solo en laboratorio',later);
 assert.equal(accepted.entries[0].status,'accepted_qa');
 assert.equal(pending.entries[0].status,'awaiting_review');
 assert.equal(stationLinkSummary(accepted,ctx).accepted,1);
 assert.equal(exportStationLinks(accepted,ctx).exportType,'LOCAL_EXPLICIT_STATION_LINKS_NO_COORDINATES');
 assert.equal(JSON.stringify(accepted).includes('coordinate'),false);
 assert.throws(()=>reviewStationLink(accepted,ctx,'EST-A','reject','Otro QA','Cambiar',later),/no revisadas/);
});
test('exteriors and borders never become accepted, even with reviewer',()=>{
 const {ctx}=fixture();
 let b=proposeStationLink(blankStationLinks(ctx,time),ctx,proposal('EST-B','F2'),later);
 assert.equal(b.entries[0].status,'needs_spatial_review');
 assert.equal(b.entries[0].zoneId,null);
 assert.throws(()=>reviewStationLink(b,ctx,'EST-B','accept','Revisor QA','No corresponde',later),/no revisadas/);
 b=proposeStationLink(blankStationLinks(ctx,time),ctx,proposal('EST-B','F3'),later);
 assert.equal(b.entries[0].status,'needs_spatial_review');
 assert.equal(b.entries[0].zoneId,null);
});
test('uncertainty reaching outer or internal boundary blocks eligibility',()=>{
 const {ctx}=fixture();
 const b=proposeStationLink(blankStationLinks(ctx,time),ctx,
  {...proposal('EST-A','F1'),accuracyMeters:100000},later);
 assert.equal(b.entries[0].status,'needs_spatial_review');
 assert.equal(b.entries[0].zoneId,null);
 assert.match(b.entries[0].reason,/Precisión declarada/);
});
test('altered classification, wrong station and missing provenance fail closed',()=>{
 const {ctx,measurements,data,report,layer,scenario}=fixture();
 assert.throws(()=>stationContext({book:measurements,data,report:{...report,points:report.points.map((p,i)=>
  i===0?{...p,zoneId:'D'}:p)},layer,scenario}),/clasificación/);
 assert.throws(()=>proposeStationLink(blankStationLinks(ctx,time),ctx,proposal('MISSING','F1'),later),/estación/);
 assert.throws(()=>proposeStationLink(blankStationLinks(ctx,time),ctx,{...proposal('EST-A','F1'),sourceId:''},later),/procedencia/);
});
test('different measurement revision or spatial source blocks stale links without overwrite',()=>{
 const {ctx,measurements,data,report,layer,scenario}=fixture();
 const first=proposeStationLink(blankStationLinks(ctx,time),ctx,proposal('EST-A','F1'),later);
 const storage={getItem:()=>JSON.stringify(first)};
 assert.equal(readStationLinks(storage,'key',ctx).status,'ready');
 const changed=voidMeasurement(measurements,data,'MUE-0001','Muestra cancelada','Inspector QA',later);
 const ctx2=stationContext({book:changed,data,report,layer,scenario});
 assert.equal(readStationLinks(storage,'key',ctx2).status,'stale');
 const tampered=structuredClone(first);tampered.entries[0].zoneId='D';
 assert.equal(readStationLinks({getItem:()=>JSON.stringify(tampered)},'key',ctx).status,'blocked');
 assert.throws(()=>validateStationLinks(tampered,ctx),/alterado/);
});
test('one station cannot have competing links or same-person review',()=>{
 const {ctx}=fixture();
 let b=proposeStationLink(blankStationLinks(ctx,time),ctx,proposal('EST-A','F1'),later);
 assert.throws(()=>proposeStationLink(b,ctx,proposal('EST-A','F2'),later),/ya enlazada/);
 assert.throws(()=>reviewStationLink(b,ctx,'EST-A','accept','','',later),/inválidos/);
 b=reviewStationLink(b,ctx,'EST-A','reject','Revisor distinto','Fuente no trazable',later);
 assert.equal(stationLinkSummary(b,ctx).rejected,1);
});
