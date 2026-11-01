import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DIABLILLOS_QA_GEOJSON,DIABLILLOS_REFERENCE_2025,
 seedDiablillosQaReference,DIABLILLOS_QA_SOURCE_DESCRIPTION} from
 '../../apps/web-v3/src/features/maps/diablillos-reference-qa.mjs';
import {perimeterKey,readPerimeter} from
 '../../apps/web-v3/src/features/maps/perimeter-source.mjs';
import {aoiKey} from '../../apps/web-v3/src/features/maps/aoi-model.mjs';
function fakeStorage(){
 const data=new Map();
 return {getItem:k=>data.has(k)?data.get(k):null,
  setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),
  dump:()=>JSON.stringify([...data.entries()])};
}
test('report centre is distinct from incorrect legacy QA location; polygon is visibly synthetic',()=>{
 assert.deepEqual(DIABLILLOS_REFERENCE_2025.centre,
  [-66.83333333333333,-25.3]);
 assert.notDeepEqual(DIABLILLOS_REFERENCE_2025.centre,[-67.2,-24.7]);
 assert.match(DIABLILLOS_REFERENCE_2025.reportUrl,/abrasilver\.com/);
 assert.match(DIABLILLOS_QA_GEOJSON.features[0].properties.name,/NO catastral/);
 assert.match(DIABLILLOS_QA_SOURCE_DESCRIPTION,/NO es límite oficial/);
 assert.equal(DIABLILLOS_QA_GEOJSON.features[0].geometry.coordinates[0].length,16);
 assert.equal(DIABLILLOS_QA_GEOJSON.features[0].geometry.coordinates.length,1);
 assert.equal(createHash('sha256').update(JSON.stringify(DIABLILLOS_QA_GEOJSON)).digest('hex'),
  DIABLILLOS_REFERENCE_2025.sha256);
});
test('irregular QA geometry has approximate 2025 report-scale area but cannot certify land rights',()=>{
 const ring=DIABLILLOS_QA_GEOJSON.features[0].geometry.coordinates[0];
 const c=DIABLILLOS_REFERENCE_2025.centre;
 const xy=ring.map(([lon,lat])=>[(lon-c[0])*111.195*Math.cos(c[1]*Math.PI/180),(lat-c[1])*111.195]);
 let area2=0;for(let i=0;i<xy.length-1;i++)
  area2+=xy[i][0]*xy[i+1][1]-xy[i+1][0]*xy[i][1];
 const ha=Math.abs(area2/2)*100;
 assert(ha>10800&&ha<12000);
 assert(ha<DIABLILLOS_REFERENCE_2025.referenceAreaHa*1.1);
});
test('opt-in QA insertion preserves original and saves non-official provenance',()=>{
 const storage=fakeStorage();
 const result=seedDiablillosQaReference(storage,'2026-11-01T19:00:00.000Z');
 assert.equal(result.status,'seeded_illustrative_qa');
 const saved=readPerimeter(storage,perimeterKey(true));
 assert.equal(saved.geometricStatus,'SYNTHETIC_QA_ONLY');
 assert.match(saved.sourceName,/NO-OFICIAL/);
 assert.equal(saved.sourceSha256,DIABLILLOS_REFERENCE_2025.sha256);
 assert.deepEqual(saved.geojson,DIABLILLOS_QA_GEOJSON);
 const aoi=JSON.parse(storage.getItem(aoiKey(true)));
 assert(aoi.bbox[0]<-66.895&&aoi.bbox[2]>-66.770);
 const unchanged=storage.dump();
 const again=seedDiablillosQaReference(storage,'2026-11-02T01:00:00Z');
 assert.equal(again.status,'existing_preserved');
 assert.equal(storage.dump(),unchanged);
});
test('pre-existing real perimeter or query window is never overwritten',()=>{
 const s=fakeStorage();s.setItem(perimeterKey(true),'USER_REAL_GEOJSON');
 const snapshot=s.dump();
 assert.equal(seedDiablillosQaReference(s,'2026-11-01T19:00:00Z').status,'existing_preserved');
 assert.equal(s.dump(),snapshot);
 const t=fakeStorage();t.setItem(aoiKey(true),'USER_QUERY_WINDOW');
 seedDiablillosQaReference(t,'2026-11-01T19:00:00Z');
 assert.equal(t.getItem(aoiKey(true)),'USER_QUERY_WINDOW');
});
