import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {approximateAreaHa,AREA_LABELS,syntheticStudyPolygon,createStudyScenario,
 scenarioMatchesAoi,studyScenarioExport,restoreStudyScenario} from '../../apps/web-v3/src/features/maps/study-areas.mjs';
const bbox=[-67.2601,-24.745,-67.1399,-24.655];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const collection=feature=>({type:'FeatureCollection',features:[feature]});
const scenario=()=>{const parent=collection(syntheticStudyPolygon(bbox));return createStudyScenario({
 bbox,geojson:parent,sourceHash:hash(parent),sourceKind:'synthetic',generatedAt:'2026-10-31T00:00:00Z'
});};
test('synthetic study case is explicitly independent of BBOX and has a real hole',()=>{
 const parent=syntheticStudyPolygon(bbox);
 assert.equal(parent.geometry.type,'Polygon');
 assert.equal(parent.geometry.coordinates.length,2);
 assert.match(parent.properties.name,/NO perímetro/);
 const xs=parent.geometry.coordinates.flat().map(p=>p[0]);
 assert(Math.min(...xs)>bbox[0]);
 assert(Math.max(...xs)<bbox[2]);
 assert(approximateAreaHa(parent.geometry)>0);
});
test('four classified zones sum to the synthetic study polygon hectares and 100%',()=>{
 const s=scenario();
 assert.equal(s.status,'SIMULADO_NO_OFICIAL');
 assert.equal(s.sourceKind,'synthetic');
 assert.equal(s.summary.areas.length,4);
 assert.equal(s.summary.nonEmptyZoneCount,4);
 assert.equal(s.zones.features.length,4);
 assert(s.summary.parentHa>0);
 assert(Math.abs(s.summary.assignedHa-s.summary.parentHa)/s.summary.parentHa < .0005);
 assert(Math.abs(s.summary.areas.reduce((v,a)=>v+a.percent,0)-100)<.05);
 assert.deepEqual(s.summary.areas.map(z=>z.id),AREA_LABELS.map(z=>z.id));
 for(const z of s.zones.features){
  assert(['Polygon','MultiPolygon'].includes(z.geometry.type));
  assert.equal(z.properties.verification,'synthetic_area_allocation_not_approved');
  assert(z.properties.areaHa>0);
 }
});
test('parent original data is preserved, cut zones do not mutate source',()=>{
 const parent=collection(syntheticStudyPolygon(bbox));
 const original=JSON.stringify(parent);
 const s=createStudyScenario({bbox,geojson:parent,sourceHash:hash(parent),sourceKind:'synthetic'});
 assert.equal(JSON.stringify(parent),original);
 assert.deepEqual(s.parent.features[0].geometry.coordinates,parent.features[0].geometry.coordinates);
 assert.equal(s.summary.zoneCount,4);
});
test('geodesic area subtracts holes and adds disjoint multipolygons',()=>{
 const ring=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
 const outer={type:'Polygon',coordinates:[ring(-67.2,-24.7,-67.1,-24.6)]};
 const hole={type:'Polygon',coordinates:[ring(-67.2,-24.7,-67.1,-24.6),
  ring(-67.17,-24.67,-67.16,-24.66)]};
 assert(approximateAreaHa(hole)<approximateAreaHa(outer));
 const mul={type:'MultiPolygon',coordinates:[outer.coordinates,outer.coordinates]};
 assert(Math.abs(approximateAreaHa(mul)-2*approximateAreaHa(outer))<1e-8);
 const oneDeg={type:'Polygon',coordinates:[ring(0,0,1,1)]};
 assert(approximateAreaHa(oneDeg)>1200000&&approximateAreaHa(oneDeg)<1300000);
});
test('cannot silently turn imported multi-feature WFS layer into a project perimeter',()=>{
 const one=syntheticStudyPolygon(bbox);
 const imported=collection(one);
 imported.features.push({...one});
 assert.throws(()=>createStudyScenario({bbox,geojson:imported,sourceHash:hash(imported),
 sourceKind:'imported'}),/exactamente un polígono/);
});
test('operator polygon outside query window is rejected instead of clipped or certified',()=>{
 const big={type:'Feature',properties:{name:'Límite no declarado'},geometry:{type:'Polygon',
 coordinates:[[[-67.4,-24.8],[-67,-24.8],[-67,-24.5],[-67.4,-24.5],[-67.4,-24.8]]]}};
 const original=collection(big);
 assert.throws(()=>createStudyScenario({bbox,geojson:original,sourceHash:hash(original),
 sourceKind:'imported'}),/excede la ventana/);
 assert.deepEqual(original.features[0].geometry.coordinates,big.geometry.coordinates);
});
test('self-intersecting perimeter is blocked with no zones assigned',()=>{
 const bowtie={type:'Feature',properties:{name:'cruce'},geometry:{type:'Polygon',
 coordinates:[[[-67.2,-24.72],[-67.16,-24.68],[-67.2,-24.68],[-67.16,-24.72],[-67.2,-24.72]]]}};
 const fc=collection(bowtie);
 assert.throws(()=>createStudyScenario({bbox,geojson:fc,sourceHash:hash(fc),
 sourceKind:'imported'}),/revisión SIG/);
});
test('exports preserve source SHA, four area assignments and simulation flags',()=>{
 const s=scenario();
 const zones=studyScenarioExport(s,'zones');
 const parent=studyScenarioExport(s,'parent');
 assert.equal(zones.features.length,4);
 assert.equal(parent.features.length,1);
 assert.equal(zones.properties.ambientaStudyAreas.status,'SIMULADO_NO_OFICIAL');
 assert.equal(zones.properties.ambientaStudyAreas.sourceSha256,s.sourceHash);
 assert.equal(zones.properties.ambientaStudyAreas.hashScope,'synthetic_generated_geojson');
 assert.equal(parent.properties.ambientaStudyAreas.exportPart,'parent');
 assert(zones.properties.ambientaStudyAreas.parentAreaHa>0);
 assert.match(zones.properties.ambientaStudyAreas.warning,/NO es un perímetro/);
});
test('stale bbox or changed imported source invalidates stored classification',()=>{
 const s=scenario();
 assert(scenarioMatchesAoi(s,bbox));
 assert(!scenarioMatchesAoi(s,[bbox[0]+.01,...bbox.slice(1)]));
 const imported=createStudyScenario({bbox,geojson:s.parent,sourceHash:s.sourceHash,
 sourceKind:'imported'});
 const old=globalThis.localStorage;
 globalThis.localStorage={getItem:()=>JSON.stringify(imported)};
 try{
  assert.equal(restoreStudyScenario('demo',bbox,'b'.repeat(64)),null);
  assert(restoreStudyScenario('demo',bbox,imported.sourceHash));
  assert.equal(restoreStudyScenario('demo',[bbox[0]+.01,...bbox.slice(1)],imported.sourceHash),null);
 }finally{if(old===undefined)delete globalThis.localStorage;else globalThis.localStorage=old;}
});
test('source SHA must be valid and unknown scenarios are rejected',()=>{
 const parent=collection(syntheticStudyPolygon(bbox));
 assert.throws(()=>createStudyScenario({bbox,geojson:parent,sourceHash:'bogus',
 sourceKind:'synthetic'}),/SHA-256/);
 assert.throws(()=>createStudyScenario({bbox,geojson:parent,sourceHash:hash(parent),
 sourceKind:'official'}),/Origen/);
});
