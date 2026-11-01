import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareDiablillosPreview,DIABLILLOS_PREVIEW} from '../../apps/web-v3/src/features/maps/diablillos-preview.mjs';
import {createPointAoi,aoiKey} from '../../apps/web-v3/src/features/maps/aoi-model.mjs';
import {syntheticStudyPolygon,studyAreaStorageKey,restoreStudyScenario} from '../../apps/web-v3/src/features/maps/study-areas.mjs';
const at='2026-11-01T15:00:00.000Z';
function storage(initial=[]){
 const map=new Map(initial);
 return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v),
  removeItem:k=>map.delete(k),snapshot:()=>JSON.stringify([...map])};
}
test('prefilled Diablillos polygon is reproducible and never called official',()=>{
 const aoi=createPointAoi(-24.7,-67.2,5);
 const parent={type:'FeatureCollection',features:[syntheticStudyPolygon(aoi.bbox)]};
 const actual=createHash('sha256').update(JSON.stringify(parent)).digest('hex');
 assert.equal(actual,DIABLILLOS_PREVIEW.syntheticSourceSha256);
 const state=storage();
 const result=prepareDiablillosPreview(state,at);
 assert.equal(result.status,'seeded');
 assert.equal(result.scenario.sourceKind,'synthetic');
 assert.equal(result.scenario.status,'SIMULADO_NO_OFICIAL');
 assert.equal(result.scenario.summary.nonEmptyZoneCount,4);
 assert.equal(result.scenario.parent.features[0].geometry.coordinates.length,2);
 assert.match(result.scenario.caveat,/NO representa los límites/);
 const saved=restoreStudyScenario(studyAreaStorageKey(true),aoi.bbox);
 assert.equal(state.getItem(aoiKey(true))!==null,true);
 assert.equal(result.aoi.center.lat,-24.70);
 assert.equal(result.aoi.center.lon,-67.20);
 assert.equal(saved,null); // localStorage is not global; restoration tested independently.
});
test('idempotent reload never overwrites existing fields',()=>{
 const state=storage();prepareDiablillosPreview(state,at);
 const original=state.snapshot();
 assert.equal(prepareDiablillosPreview(state,'2026-11-02T15:00:00Z').status,'existing_preserved');
 assert.equal(state.snapshot(),original);
});
test('existing custom or corrupt AOI, scenario and working layer are always preserved',()=>{
 for(const key of [aoiKey(true),studyAreaStorageKey(true),'ambienta-gis-diablillos-working-v3']){
  const state=storage([[key,'USER_ORIGINAL']]);const before=state.snapshot();
  assert.equal(prepareDiablillosPreview(state,at).status,'existing_preserved');
  assert.equal(state.snapshot(),before);
 }
});
test('a storage error in the scenario write leaves no partially seeded AOI',()=>{
 const items=new Map();
 const fail={getItem:k=>items.get(k)??null,setItem:(k,v)=>{
  if(k===studyAreaStorageKey(true))throw Error('QuotaExceeded');items.set(k,v);
 },removeItem:k=>items.delete(k)};
 assert.throws(()=>prepareDiablillosPreview(fail,at),/QuotaExceeded/);
 assert.equal(items.size,0);
});
