import test from 'node:test';
import assert from 'node:assert/strict';
import {createPointAoi,aoiKey,aoiRectangle} from '../../apps/web-v3/src/features/maps/aoi-model.mjs';
import {clipGeoJsonToBbox} from '../../apps/web-v3/src/features/maps/aoi-clip.mjs';
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
const square=(x1,y1,x2,y2)=>[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]];
const areaRing=ring=>Math.abs(ring.slice(0,-1).reduce((sum,p,i)=>{
 const q=ring[i+1];return sum+(p[0]*q[1]-q[0]*p[1]);
},0))/2;
const areaGeometry=geom=>(geom.type==='Polygon'?[geom.coordinates]:geom.coordinates)
 .reduce((sum,p)=>sum+areaRing(p[0])-p.slice(1).reduce((h,r)=>h+areaRing(r),0),0);

test('cóncavo en forma de U genera dos piezas reales, nunca puente artificial',()=>{
 const shell=[[-3,-3],[3,-3],[3,3],[1,3],[1,-1],[-1,-1],[-1,3],[-3,3],[-3,-3]];
 const src=fc(f({type:'Polygon',coordinates:[shell]},'U'));
 const before=JSON.stringify(src);
 const r=clipGeoJsonToBbox(src,[-2,0,2,2]);
 assert.equal(r.status,'clipped_local');assert.equal(r.unsupportedCount,0);
 assert.equal(r.selectedCount,1);
 assert.equal(r.geojson.features[0].geometry.type,'MultiPolygon');
 assert.equal(r.geojson.features[0].geometry.coordinates.length,2);
 assert(Math.abs(areaGeometry(r.geojson.features[0].geometry)-4)<1e-9);
 assert.equal(JSON.stringify(src),before);
});

test('polígono con hueco interno conserva el hueco tras la intersección',()=>{
 const src=fc(f({type:'Polygon',coordinates:[square(-3,-3,3,3),square(-1,-1,1,1)]},'Anillo'));
 const r=clipGeoJsonToBbox(src,[-2,-2,2,2]);
 const geom=r.geojson.features[0].geometry;
 assert.equal(r.unsupportedCount,0);
 assert.equal(geom.type,'Polygon');assert.equal(geom.coordinates.length,2);
 assert(Math.abs(areaGeometry(geom)-12)<1e-9);
});

test('hueco cortado por borde se convierte en muesca sin cerrar un hueco falso',()=>{
 const src=fc(f({type:'Polygon',coordinates:[square(-3,-3,3,3),square(0,-1,2,1)]}));
 const r=clipGeoJsonToBbox(src,[-1,-2,1,2]);
 assert.equal(r.status,'clipped_local');
 assert.equal(r.unsupportedCount,0);assert.equal(r.selectedCount,1);
 assert(Math.abs(areaGeometry(r.geojson.features[0].geometry)-6)<1e-9);
});

test('MultiPolygon conserva componentes incluidos y omite los exteriores',()=>{
 const src=fc(f({type:'MultiPolygon',coordinates:[[square(-3,-3,-1,-1)],[square(0,0,2,2)],[square(10,10,12,12)]]}));
 const r=clipGeoJsonToBbox(src,[-2,-2,1,1]);
 assert.equal(r.status,'clipped_local');assert.equal(r.unsupportedCount,0);
 assert.equal(r.geojson.features[0].geometry.type,'MultiPolygon');
 assert.equal(r.geojson.features[0].geometry.coordinates.length,2);
 assert(Math.abs(areaGeometry(r.geojson.features[0].geometry)-2)<1e-9);
});

test('autointersección, hueco exterior y anillo degenerado requieren revisión sin exportación completa',()=>{
 const bowtie=[[0,0],[2,2],[0,2],[2,0],[0,0]];
 const outsideHole=square(4,4,5,5);
 const repeated=[[0,0],[2,0],[2,0],[2,2],[0,2],[0,0]];
 const src=fc(f({type:'Polygon',coordinates:[bowtie]},'Autointersección'),
  f({type:'Polygon',coordinates:[square(-3,-3,3,3),outsideHole]},'Hueco inválido'),
  f({type:'Polygon',coordinates:[repeated]},'Segmento nulo'));
 const r=clipGeoJsonToBbox(src,[-1,-1,1,1]);
 assert.equal(r.status,'partial_requires_gis');
 assert.equal(r.unsupportedCount,3);assert.equal(r.invalidCount,3);
 assert.equal(r.selectedCount,0);assert.equal(r.issues.length,3);
 assert(r.issues.every(x=>x.category==='topology_review'));
});

test('anillo por encima del límite de revisión local no se confunde con topología inválida',()=>{
 const ring=Array.from({length:3001},(_,i)=>[2*Math.cos(i*2*Math.PI/3001),2*Math.sin(i*2*Math.PI/3001)]);
 ring.push(ring[0]);
 const r=clipGeoJsonToBbox(fc(f({type:'Polygon',coordinates:[ring]})),[-1,-1,1,1]);
 assert.equal(r.status,'partial_requires_gis');
 assert.equal(r.unsupportedCount,1);assert.equal(r.invalidCount,0);
 assert.equal(r.issues[0].category,'unsupported');
 assert.match(r.issues[0].reason,/demasiado complejo/);
});
test('tangencia al borde no inventa superficie y preserva los puntos del original',()=>{
 const src=fc(f({type:'Polygon',coordinates:[square(1,1,2,2)]}));
 const before=JSON.stringify(src);
 const r=clipGeoJsonToBbox(src,[-1,-1,1,1]);
 assert.equal(r.selectedCount,0);assert.equal(r.outsideCount,1);
 assert.equal(r.unsupportedCount,0);assert.equal(JSON.stringify(src),before);
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
