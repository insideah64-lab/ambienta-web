import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createDiablillosState} from '../../apps/web-v3/src/lib/diablillosDemo.mjs';
import {createPointAoi,aoiKey} from '../../apps/web-v3/src/features/maps/aoi-model.mjs';
import {syntheticStudyPolygon,createStudyScenario,studyAreaStorageKey} from '../../apps/web-v3/src/features/maps/study-areas.mjs';
import {
 blankSpatialLinks,scenarioFingerprint,recordList,displayName,assignRecordZones,
 seedDemoSpatialLinks,summarizeSpatialLinks,readSpatialLinks,exportSpatialLinks,
 readSpatialBrowserContext,zoneLinksKey
} from '../../apps/web-v3/src/features/maps/spatial-links.mjs';

const data=()=>createDiablillosState();
const date='2026-10-31T20:00:00.000Z';
const bbox=[-67.249494,-24.744966,-67.150506,-24.655034];
function scenario(createdAt=date,location=bbox){
 const parent={type:'FeatureCollection',features:[syntheticStudyPolygon(location)]};
 const hash=createHash('sha256').update(JSON.stringify(parent)).digest('hex');
 return createStudyScenario({bbox:location,geojson:parent,sourceHash:hash,
  sourceKind:'synthetic',generatedAt:createdAt});
}
function blank(){return blankSpatialLinks(data(),scenario(),date);}
function seeded(){const d=data(),s=scenario();return {d,s,links:seedDemoSpatialLinks(
 blankSpatialLinks(d,s,date),d,s,date)};}
function memory(){
 const entries=new Map();
 return {getItem:key=>entries.get(key)??null,setItem:(key,val)=>entries.set(key,val),
  removeItem:key=>entries.delete(key),dump:()=>Object.fromEntries(entries)};
}
test('blank versioned sidecar contains no inferred geographic claims',()=>{
 const d=data(),s=scenario(),p=blankSpatialLinks(d,s,date);
 const count=summarizeSpatialLinks(p,d,s);
 assert.equal(p.status,'SIMULADO_NO_OFICIAL');
 assert.equal(count.totalLinked,0);
 assert.equal(count.totalRecords,16);
 assert.equal(count.conflicts.length,0);
 assert.equal(s.summary.zoneCount,4);
 assert.equal(p.projectId,d.project.id);
});
test('all four existing module types are recognized and descriptive references preserved',()=>{
 const d=data();
 assert.equal(recordList(d,'impact').length,4);
 assert.equal(recordList(d,'measure').length,4);
 assert.equal(recordList(d,'inspection').length,2);
 assert.equal(recordList(d,'evidence').length,6);
 assert.match(displayName('evidence',d.evidence[0]),/DEMO/);
 assert.throws(()=>recordList(d,'http_endpoint'),/Tipo de registro/);
});
test('explicit assignment supports multiple zones and preserves source domain unchanged',()=>{
 const d=data(),snapshot=JSON.stringify(d),s=scenario(),old=blankSpatialLinks(d,s,date);
 const next=assignRecordZones(old,d,s,'impact','IMP-D-AGU',['B','A'],date);
 assert.deepEqual(next.records.impact['IMP-D-AGU'].zoneIds,['A','B']);
 assert.equal(Object.keys(old.records.impact).length,0);
 assert.equal(JSON.stringify(d),snapshot);
 assert.equal(next.records.measure['MED-DIAB-001'],undefined);
 const cleared=assignRecordZones(next,d,s,'impact','IMP-D-AGU',[],date);
 assert.equal(Object.keys(cleared.records.impact).length,0);
});
test('Diablillos QA sample sets 16 links consistently and covers all zones',()=>{
 const {d,s,links}=seeded();
 const summary=summarizeSpatialLinks(links,d,s);
 assert.deepEqual(Object.values(summary.counts).map(x=>x.linked),[4,4,2,6]);
 assert.equal(summary.totalLinked,16);
 assert.equal(summary.conflicts.length,0);
 assert(summary.byZone.every(z=>z.impact===1&&z.measure===1));
 assert.deepEqual(links.records.evidence['EVID-D-006'].zoneIds,['D']);
 assert.equal(links.status,'SIMULADO_NO_OFICIAL');
});
test('changing a child zone creates a visible documentary mismatch rather than silent propagation',()=>{
 const {d,s,links}=seeded();
 const next=assignRecordZones(links,d,s,'inspection','INSP-DIAB-001',['C'],date);
 const summary=summarizeSpatialLinks(next,d,s);
 assert(summary.conflicts.some(x=>x.kind==='inspection'&&x.id==='INSP-DIAB-001'));
 assert(summary.conflicts.some(x=>x.kind==='evidence'&&x.relatedId==='INSP-DIAB-001'));
 assert.deepEqual(next.records.measure['MED-DIAB-001'].zoneIds,['B']);
});
test('unknown zones, IDs and duplicate associations fail closed',()=>{
 const {d,s,links}=seeded();
 assert.throws(()=>assignRecordZones(links,d,s,'measure','MED-UNTRUSTED',['A'],date),/No existe/);
 assert.throws(()=>assignRecordZones(links,d,s,'measure','MED-DIAB-001',['X'],date),/desconocidas/);
 assert.throws(()=>assignRecordZones(links,d,s,'measure','MED-DIAB-001',['A','A'],date),/repetidas/);
 assert.throws(()=>seedDemoSpatialLinks(links,{...d,project:{...d.project,id:'OTHER'}},s,date),/exclusiva/);
});
test('stale source generation, project ID and record removal are rejected without reassignment',()=>{
 const {d,s,links}=seeded(),store=memory(),key='test-links';
 store.setItem(key,JSON.stringify(links));
 assert.equal(readSpatialLinks(store,key,d,s).status,'ready');
 const modifiedGeneration=scenario('2026-10-31T22:00:00.000Z');
 const old=readSpatialLinks(store,key,d,modifiedGeneration);
 assert.equal(old.status,'blocked');
 assert.equal(old.state.records.impact['IMP-D-AGU'],undefined);
 assert.equal(readSpatialLinks(store,key,{...d,project:{...d.project,id:'NEW'}},s).status,'blocked');
 const changed={...d,evidence:d.evidence.filter(e=>e.id!=='EVID-D-006')};
 assert.equal(readSpatialLinks(store,key,changed,s).status,'blocked');
 assert.deepEqual(JSON.parse(store.getItem(key)),links);
});
test('tampered local JSON, forged zone, or malformed records never masquerade as valid',()=>{
 const {d,s,links}=seeded(),store=memory(),key='links';
 store.setItem(key,'{invalid');
 assert.equal(readSpatialLinks(store,key,d,s).status,'blocked');
 const corrupt=structuredClone(links);
 corrupt.records.impact['IMP-D-AGU'].zoneIds=['A','X'];
 store.setItem(key,JSON.stringify(corrupt));
 assert.equal(readSpatialLinks(store,key,d,s).status,'blocked');
 const duplicate=structuredClone(links);
 duplicate.records.evidence['EVID-D-001'].zoneIds=['B','B'];
 store.setItem(key,JSON.stringify(duplicate));
 assert.equal(readSpatialLinks(store,key,d,s).status,'blocked');
});
test('separate JSON export contains provenance, domain revision and no fake measurements',()=>{
 const {d,s,links}=seeded();
 const report=exportSpatialLinks(links,d,s);
 assert.equal(report.schema,'ambienta-spatial-demo-v1');
 assert.equal(report.status,'SIMULADO_NO_OFICIAL');
 assert.equal(report.projectId,d.project.id);
 assert.equal(report.domainRevision,0);
 assert.equal(report.scenario.sourceHash,s.sourceHash);
 assert.equal(report.scenario.zoneAreasHa.length,4);
 assert.equal(report.summary.totalLinked,16);
 assert(!JSON.stringify(report).includes('SIMULADO://diablillos/acta-hidrica-001'));
 assert.match(report.limitation,/no establece localización/);
});
test('reloaded browser context accepts current scenario but not stale BBOX',()=>{
 const d=data(),s=scenario(),store=memory();
 const aoi=createPointAoi(-24.7,-67.2,5);
 // Model-generated bbox is the only authoritative local query window.
 const actual=scenario(date,aoi.bbox);
 store.setItem(aoiKey(true),JSON.stringify({...aoi,savedAt:date}));
 store.setItem(studyAreaStorageKey(true),JSON.stringify(actual));
 const links=seedDemoSpatialLinks(blankSpatialLinks(d,actual,date),d,actual,date);
 store.setItem(zoneLinksKey(true),JSON.stringify(links));
 const previous=globalThis.localStorage;globalThis.localStorage=store;
 try{
  const context=readSpatialBrowserContext(d,true,store);
  assert.equal(context.status,'ready');
  assert.equal(context.state.records.evidence['EVID-D-003'].zoneIds[0],'B');
  store.setItem(aoiKey(true),JSON.stringify({...createPointAoi(-24.7,-67.2,7),savedAt:date}));
  const mismatched=readSpatialBrowserContext(d,true,store);
  assert.equal(mismatched.status,'no_scenario');
  assert.equal(mismatched.state,null);
  assert.equal(readSpatialLinks(store,'nonexistent',d,s).status,'empty');
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});
test('sidecar cannot be reused across different project polygon and identical label',()=>{
 const s=scenario();
 const copy=scenario('2026-10-31T23:00:00.000Z');
 assert.notEqual(scenarioFingerprint(s),scenarioFingerprint(copy));
 const d=data(),one=blankSpatialLinks(d,s,date);
 assert.throws(()=>assignRecordZones(one,d,copy,'impact','IMP-D-AGU',['B'],date),/otro polígono/);
});
