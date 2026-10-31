import test from 'node:test';
import assert from 'node:assert/strict';
import {createPointAoi,aoiKey,aoiRectangle} from '../../apps/web/src/features/maps/aoi-model.mjs';
import {clipGeoJsonToBbox} from '../../apps/web/src/features/maps/aoi-clip.mjs';
const f=(geometry,name='QA')=>({type:'Feature',properties:{name},geometry});
const fc=(...features)=>({type:'FeatureCollection',features});
test('coordenadas generan ventana EPSG4326, aislada por caso',()=>{
 const a=createPointAoi(-24.7,-67.2,5);
 assert.equal(a.verification,'operator_declared_not_project_perimeter');
 assert.equal(a.bbox.length,4);
 assert(a.bbox[0]<-67.2&&a.bbox[2]>-67.2);
 assert(a.bbox[1]<-24.7&&a.bbox[3]>-24.7);
 assert.equal(aoiRectangle(a).features[0].geometry.type,'Polygon');
 assert.notEqual(aoiKey(true),aoiKey(false));
});
test('rechaza radio, latitud, longitud y antimeridiano',()=>{
 for(const args of [[-24,-67,0],[-24,-67,101],[91,-67,5],[-24,-190,5],[0,179.99,100]])
  assert.throws(()=>createPointAoi(...args));
});
test('recorta línea cruzando ventana y conserva el tramo interior',()=>{
 const a=clipGeoJsonToBbox(fc(f({type:'LineString',coordinates:[[-2,0],[2,0]]})),[-1,-1,1,1]);
 assert.equal(a.selectedCount,1);
 assert.equal(a.geojson.features[0].geometry.type,'LineString');
 assert.deepEqual(a.geojson.features[0].geometry.coordinates,[[-1,0],[1,0]]);
});
test('recorta línea que entra y sale dos veces en partes separadas',()=>{
 const a=clipGeoJsonToBbox(fc(f({type:'LineString',coordinates:[[-2,0],[2,0],[2,2],[-2,0]]})),[-1,-1,1,1]);
 assert.equal(a.selectedCount,1);
 assert.equal(a.geojson.features[0].geometry.type,'MultiLineString');
 assert.equal(a.geojson.features[0].geometry.coordinates.length,2);
});
test('puntos fuera se descartan y los internos permanecen',()=>{
 const a=clipGeoJsonToBbox(fc(f({type:'Point',coordinates:[2,2]}),f({type:'MultiPoint',coordinates:[[0,0],[2,2]]})),[-1,-1,1,1]);
 assert.equal(a.selectedCount,1);assert.equal(a.outsideCount,1);
 assert.deepEqual(a.geojson.features[0].geometry.coordinates,[[0,0]]);
});
test('polígono rectangular convexo se recorta sin alterar el original',()=>{
 const src=fc(f({type:'Polygon',coordinates:[[[-2,-2],[2,-2],[2,2],[-2,2],[-2,-2]]]}));
 const original=JSON.stringify(src);
 const a=clipGeoJsonToBbox(src,[-1,-1,1,1]);
 assert.equal(a.selectedCount,1);
 const ring=a.geojson.features[0].geometry.coordinates[0];
 assert(ring.length>=5);assert.deepEqual(ring[0],ring.at(-1));
 for(const [x,y] of ring){assert(x>=-1&&x<=1);assert(y>=-1&&y<=1);}
 assert.equal(JSON.stringify(src),original);
});
test('polígonos cóncavos y con huecos se señalan, no se falsea la geometría',()=>{
 const concave=[[-2,-2],[2,-2],[2,2],[0,0],[-2,2],[-2,-2]];
 const hole=[[-0.5,-0.5],[0.5,-0.5],[0.5,0.5],[-0.5,0.5],[-0.5,-0.5]];
 const a=clipGeoJsonToBbox(fc(f({type:'Polygon',coordinates:[concave]}),f({type:'Polygon',coordinates:[concave,hole]})),[-1,-1,1,1]);
 assert.equal(a.selectedCount,0);assert.equal(a.unsupportedCount,2);
 assert.equal(a.status,'partial_requires_gis');
});
test('capa completamente fuera devuelve colección vacía',()=>{
 const a=clipGeoJsonToBbox(fc(f({type:'LineString',coordinates:[[10,10],[11,11]]})),[-1,-1,1,1]);
 assert.equal(a.selectedCount,0);assert.equal(a.outsideCount,1);
 assert.deepEqual(a.geojson.features,[]);
});
test('rechaza bbox malformada y GeoJSON con CRS distinto',()=>{
 assert.throws(()=>clipGeoJsonToBbox(fc(f({type:'Point',coordinates:[0,0]})),[2,2,1,1]),/Extensión/);
 assert.throws(()=>clipGeoJsonToBbox({...fc(f({type:'Point',coordinates:[0,0]})),crs:{properties:{name:'EPSG:3857'}}},[-1,-1,1,1]),/CRS distinto/);
});
