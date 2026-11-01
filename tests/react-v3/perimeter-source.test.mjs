import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {polygonFromVertices,validatePerimeterGeoJson,buildPerimeterRecord,
 savePerimeter,readPerimeter,suggestWindowForBounds} from '../../apps/web-v3/src/features/maps/perimeter-source.mjs';
import {prepareDiablillosPreview,retractSeededDiablillosPreview} from '../../apps/web-v3/src/features/maps/diablillos-preview.mjs';
import {aoiKey} from '../../apps/web-v3/src/features/maps/aoi-model.mjs';
import {studyAreaStorageKey} from '../../apps/web-v3/src/features/maps/study-areas.mjs';
const now='2026-11-01T17:00:00Z';
const polygon=()=>polygonFromVertices([
 [-67.24,-24.71],[-67.224,-24.702],[-67.221,-24.69],
 [-67.208,-24.695],[-67.198,-24.68],[-67.174,-24.687],
 [-67.166,-24.704],[-67.182,-24.725],[-67.206,-24.723]]);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function storage(){
 const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),
 removeItem:k=>map.delete(k),snapshot:()=>JSON.stringify([...map])};
}
function record(fc=polygon()){
 return buildPerimeterRecord({geojson:fc,sha256:hash(fc),sourceName:'usuario.geojson',
 sourceType:'geojson',description:'Suministrado por el operador; no verificado',createdAt:now});
}
test('accepts genuinely irregular polygons without imposing rectangular strips',()=>{
 const source=polygon(),checked=validatePerimeterGeoJson(source);
 assert.equal(checked.featureCount,1);
 assert(checked.geojson.features[0].geometry.coordinates[0].length>8);
 const row=record(source);
 assert.equal(row.status,'DECLARED_NOT_VERIFIED');
 assert.equal(row.geojson.features.length,1);
 assert.equal(row.geojson.features[0].geometry.type,'Polygon');
 assert.equal(JSON.stringify(row).includes('zoneId'),false);
});
test('supports valid hole and multiple separated components, retains their geometry',()=>{
 const single=polygon();
 const ring=single.features[0].geometry.coordinates[0];
 const hole=[[-67.217,-24.712],[-67.212,-24.712],[-67.212,-24.71],
 [-67.217,-24.71],[-67.217,-24.712]];
 // Test an uncomplicated shell+hole independent of the irregular example.
 const outer=[[-67.25,-24.73],[-67.15,-24.73],[-67.15,-24.65],[-67.25,-24.65],[-67.25,-24.73]];
 const source={type:'FeatureCollection',features:[{type:'Feature',properties:{name:'Usuario'},
 geometry:{type:'Polygon',coordinates:[outer,hole]}}]};
 assert.equal(validatePerimeterGeoJson(source).geojson.features[0].geometry.coordinates.length,2);
 const multi={type:'FeatureCollection',features:[{type:'Feature',properties:{name:'Multi'},
 geometry:{type:'MultiPolygon',coordinates:[[outer],[[
 [-67.14,-24.73],[-67.13,-24.73],[-67.13,-24.72],[-67.14,-24.72],[-67.14,-24.73]
 ]]]}}]};
 assert.equal(validatePerimeterGeoJson(multi).geojson.features[0].geometry.type,'MultiPolygon');
 assert(ring.length>8);
});
test('does not accept bowties, nonpolygons, multiple features or degenerate drawn rings',()=>{
 const bowtie=polygonFromVertices([[-67.22,-24.70],[-67.2,-24.68],
 [-67.22,-24.68],[-67.2,-24.70]]);
 assert.throws(()=>validatePerimeterGeoJson(bowtie),/topología|inválida|Perímetro/);
 assert.throws(()=>polygonFromVertices([[0,0],[1,1]]),/vértices/);
 assert.throws(()=>polygonFromVertices([[0,0],[1,0],[1,0],[0,1]]),/repetidos/);
 const points={type:'FeatureCollection',features:[{type:'Feature',properties:{},
 geometry:{type:'Point',coordinates:[-67.2,-24.7]}}]};
 assert.throws(()=>validatePerimeterGeoJson(points),/único polígono/);
 const doubles={...polygon(),features:[...polygon().features,...polygon().features]};
 assert.throws(()=>validatePerimeterGeoJson(doubles),/único polígono/);
});
test('saves without changing old source; explicit replacement archives full previous record',()=>{
 const store=storage(),source=record();
 assert.equal(savePerimeter(store,'own','history',source).status,'saved');
 assert.deepEqual(readPerimeter(store,'own').geojson,source.geojson);
 const before=store.getItem('own');
 const replacement={...source,sourceName:'nuevo.geojson',createdAt:'2026-11-02T00:00:00Z'};
 assert.throws(()=>savePerimeter(store,'own','history',replacement),/reemplazar/);
 assert.equal(store.getItem('own'),before);
 assert.equal(savePerimeter(store,'own','history',replacement,{replace:true}).replaced,true);
 assert.equal(JSON.parse(store.getItem('history'))[0].raw,before);
 assert.equal(readPerimeter(store,'own').sourceName,'nuevo.geojson');
});
test('supports bounded AOI suggestion that is not the perimeter',()=>{
 const suggestion=suggestWindowForBounds(validatePerimeterGeoJson(polygon()).bounds);
 assert.equal(suggestion.kind,'point_bbox');
 assert.equal(suggestion.verification,'operator_declared_not_project_perimeter');
 assert(suggestion.radiusKm>0);
 assert.throws(()=>suggestWindowForBounds([-70,-25,-60,-20]),/100 km/);
});
test('legacy V3.5.1 auto-added example is retired without touching user scenarios',()=>{
 const store=storage();
 const seeded=prepareDiablillosPreview(store,now);
 assert.equal(seeded.status,'seeded');
 const out=retractSeededDiablillosPreview(store);
 assert.equal(out.status,'auto_preview_retired');
 assert.equal(store.getItem(aoiKey(true)),null);
 assert.equal(store.getItem(studyAreaStorageKey(true)),null);
 assert.equal(retractSeededDiablillosPreview(store).status,'no_auto_preview');
 const store2=storage();
 prepareDiablillosPreview(store2,now);
 const own={...JSON.parse(store2.getItem(studyAreaStorageKey(true))),previewMarker:'user-geometry'};
 store2.setItem(studyAreaStorageKey(true),JSON.stringify(own));
 const previous=store2.snapshot();
 assert.equal(retractSeededDiablillosPreview(store2).status,'user_data_preserved');
 assert.equal(store2.snapshot(),previous);
});
