import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {syntheticStudyPolygon,createStudyScenario} from '../../apps/web-v3/src/features/maps/study-areas.mjs';
import {pointRelation,analyzePointsInStudyAreas,analysisMatchesContext} from '../../apps/web-v3/src/features/maps/point-zone-analysis.mjs';
const bbox=[-67.254,-24.75,-67.146,-24.65];
const time='2026-11-01T00:00:00Z';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fc=features=>({type:'FeatureCollection',features});
const feature=(name,geometry)=>({type:'Feature',properties:{name},geometry});
const asPoint=(name,coordinate)=>feature(name,{type:'Point',coordinates:coordinate});
const xy=(fx,fy)=>[Number((bbox[0]+(bbox[2]-bbox[0])*fx).toFixed(9)),
 Number((bbox[1]+(bbox[3]-bbox[1])*fy).toFixed(9))];
const parent=()=>fc([syntheticStudyPolygon(bbox)]);
function scenario(){const source=parent();return createStudyScenario({bbox,geojson:source,
 sourceHash:hash(JSON.stringify(source)),sourceKind:'synthetic',generatedAt:time});}
function layer(features){const source=fc(features);return {
 sha256:hash(JSON.stringify(source)),source:'Geometrías generadas en ensayo cerrado',
 fileName:'puntos-ensayo.geojson',geojson:source};}
test('point in simple polygon, inside a hole and on boundaries are distinguished',()=>{
 const g={type:'Polygon',coordinates:[
 [[0,0],[4,0],[4,4],[0,4],[0,0]],
 [[1,1],[2,1],[2,2],[1,2],[1,1]]
 ]};
 assert.equal(pointRelation([3,3],g),'inside');
 assert.equal(pointRelation([1.5,1.5],g),'outside');
 assert.equal(pointRelation([-1,1],g),'outside');
 assert.equal(pointRelation([0,2],g),'boundary');
 assert.equal(pointRelation([1,1.5],g),'boundary');
 assert.equal(pointRelation([1.5,2],g),'boundary');
});
test('multipart islands and shared borders must never assign by guess',()=>{
 const left=[[[0,0],[1,0],[1,1],[0,1],[0,0]]];
 const right=[[[2,0],[3,0],[3,1],[2,1],[2,0]]];
 const multi={type:'MultiPolygon',coordinates:[left,right]};
 assert.equal(pointRelation([.5,.5],multi),'inside');
 assert.equal(pointRelation([2.5,.5],multi),'inside');
 assert.equal(pointRelation([1.5,.5],multi),'outside');
 assert.equal(pointRelation([2,.5],multi),'boundary');
 assert.throws(()=>pointRelation([2,.5],{type:'LineString',coordinates:[]}),/solo se admiten polígonos/);
});
test('synthetic polygon zones classify one point per interior quarter',()=>{
 const s=scenario();
 const locations=[xy(.26,.5),xy(.36,.5),xy(.55,.5),xy(.85,.5)];
 const l=layer(locations.map((c,i)=>asPoint('Estación demo '+(i+1),c)));
 const r=analyzePointsInStudyAreas({layer:l,scenario:s,analyzedAt:time});
 assert.equal(r.schema,'ambienta-point-zones-v1');
 assert.equal(r.summary.insideCount,4);
 assert.equal(r.summary.outsideCount,0);
 assert.equal(r.summary.reviewCount,0);
 assert.deepEqual(r.points.map(p=>p.zoneId),['A','B','C','D']);
 assert.deepEqual(r.summary.perZone.map(z=>z.count),[1,1,1,1]);
});
test('inner hole, concave notch and beyond perimeter are NOT assigned zones',()=>{
 const s=scenario();
 const loc=[xy(.18,.36),xy(.65,.82),xy(.02,.5)];
 const r=analyzePointsInStudyAreas({layer:layer(loc.map((c,i)=>asPoint('Fuera '+i,c))),scenario:s});
 assert.equal(r.summary.outsideCount,3);
 assert(r.points.every(p=>p.status==='outside_perimeter'&&p.zoneId===null));
});
test('outer, hole and zone boundaries are marked review, not silently put into A or B',()=>{
 const s=scenario();
 const coords=[xy(.08,.5),xy(.15,.35),xy(.29,.5),xy(.5,.5)];
 const r=analyzePointsInStudyAreas({layer:layer(coords.map((p,i)=>asPoint('Borde '+i,p))),scenario:s});
 assert.equal(r.summary.reviewCount,4);
 assert(r.points.every(p=>p.status==='review_boundary'&&p.zoneId===null));
});
test('MultiPoint results preserve unique source indices and total count',()=>{
 const s=scenario();
 const l=layer([feature('Par de puntos',{type:'MultiPoint',
  coordinates:[xy(.26,.5),xy(.36,.5)]}),asPoint('Unidad',xy(.85,.5))]);
 const result=analyzePointsInStudyAreas({layer:l,scenario:s,analyzedAt:time});
 assert.deepEqual(result.points.map(x=>x.ref),['F1:P1','F1:P2','F2']);
 assert.deepEqual(result.points.map(x=>x.zoneId),['A','B','D']);
 assert.equal(result.summary.totalCount,3);
 assert.equal(result.summary.insideCount,3);
 assert.equal(result.points[0].name,'Par de puntos');
});
test('source GeoJSON is never rewritten by the analysis',()=>{
 const s=scenario();
 const l=layer([asPoint('Preservar',xy(.26,.5))]);
 const before=JSON.stringify(l),scenarioBefore=JSON.stringify(s);
 const r=analyzePointsInStudyAreas({layer:l,scenario:s,analyzedAt:time});
 assert.equal(JSON.stringify(l),before);
 assert.equal(JSON.stringify(s),scenarioBefore);
 assert.equal(r.provenance.inputSha256,l.sha256);
 assert.equal(r.provenance.scenarioSha256,s.sourceHash);
 assert.equal(r.provenance.sourceOfficiallyVerified,false);
 assert.match(r.caveat,/ENSAYO/);
 assert(analysisMatchesContext(r,l,s));
 assert(!analysisMatchesContext(r,{...l,sha256:'a'.repeat(64)},s));
 assert(!analysisMatchesContext(r,l,{...s,createdAt:'2027-01-01'}));
});
test('mixed layers, forged hash and missing scenario fail closed',()=>{
 const s=scenario();
 const mixed=layer([asPoint('Punto',xy(.26,.5)),feature('Línea',{type:'LineString',
  coordinates:[xy(.2,.3),xy(.3,.4)]})]);
 assert.throws(()=>analyzePointsInStudyAreas({layer:mixed,scenario:s}),/únicamente Point o MultiPoint/);
 const broken=layer([asPoint('Punto',xy(.26,.5))]);broken.sha256='invalid';
 assert.throws(()=>analyzePointsInStudyAreas({layer:broken,scenario:s}),/SHA-256/);
 assert.throws(()=>analyzePointsInStudyAreas({layer:layer([asPoint('Punto',xy(.26,.5))]),scenario:null}),/polígono de ensayo/);
});
test('never classify data from tampered study zone IDs',()=>{
 const s=scenario();
 s.zones.features[0].properties.zoneId='unknown';
 assert.throws(()=>analyzePointsInStudyAreas({layer:layer([asPoint('P',xy(.26,.5))]),scenario:s}),/únicos/);
});
test('one source and one scenario hash drive entire point report with no fabricated measurements',()=>{
 const s=scenario(),p=layer([asPoint('Sensor solo demo',xy(.26,.5))]);
 const r=analyzePointsInStudyAreas({layer:p,scenario:s});
 assert.equal(r.status,'SIMULADO_NO_OFICIAL');
 assert.equal(r.provenance.inputHashScope,'original_imported_file');
 assert.equal(r.provenance.scenarioHashScope,'synthetic_generated_geojson');
 assert.equal(r.crs,'EPSG:4326');
 assert(!JSON.stringify(r).includes('validated_monitoring_result'));
});
