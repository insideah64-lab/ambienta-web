import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const esbuild=require('esbuild');
const built=await esbuild.build({
 entryPoints:['v3/overrides/src/features/impacts/ConesaF3PrecisionModel.ts'],
 bundle:true,write:false,format:'esm',platform:'node',target:'es2022'
});
const m=await import('data:text/javascript;base64,'+
 Buffer.from(built.outputFiles[0].text).toString('base64'));
const c={
 x:{p0:100,p1:500,v0:0,v1:20},
 y:{p0:350,p1:50,v0:0,v1:1}
};
const view=(zoom,center={x:300,y:200})=>({zoom,center});
test('Zoom preserves original source coordinates and clamps all pan directions',()=>{
 assert.deepEqual(m.precisionViewport(600,400,view(1)),{x:0,y:0,width:600,height:400});
 assert.deepEqual(m.precisionViewport(600,400,view(2)),{x:150,y:100,width:300,height:200});
 assert.deepEqual(m.precisionViewport(600,400,view(4)),{x:225,y:150,width:150,height:100});
 assert.deepEqual(m.precisionViewport(600,400,view(8)),{x:262.5,y:175,width:75,height:50});
 assert.deepEqual(m.precisionViewport(600,400,view(2,{x:-999,y:1e6})),
  {x:0,y:200,width:300,height:200});
 assert.equal(m.precisionViewport(600,400,view(3)),null);
 assert.equal(m.precisionViewport(0,400,view(2)),null);
 assert.equal(m.precisionViewport(600,400,view(2,{x:NaN,y:200})),null);
});
test('Pan moves by visible image fraction and stays bounded',()=>{
 const east=m.movePrecisionView(600,400,view(2),.25,0);
 assert.deepEqual(m.precisionViewport(600,400,east),
  {x:225,y:100,width:300,height:200});
 const bounded=m.movePrecisionView(600,400,view(2),999,-999);
 assert.deepEqual(m.precisionViewport(600,400,bounded),
  {x:300,y:0,width:300,height:200});
});
test('Pixel reading sensitivity is derivative of axes, NOT a confidence interval',()=>{
 assert.deepEqual(m.pixelSensitivity(c,1),{
  radiusPixels:1,maxAbsM:.05,maxAbsCA:1/300
 });
 assert.deepEqual(m.pixelSensitivity(c,2),{
  radiusPixels:2,maxAbsM:.1,maxAbsCA:2/300
 });
 assert.equal(m.pixelSensitivity(c,0),null);
 assert.equal(m.pixelSensitivity(c,Infinity),null);
 assert.equal(m.pixelSensitivity(c,20),null);
});
test('Session export separates series, sorts labels and makes no certified claim',()=>{
 const a={label:'Corriente lenta',radiusPixels:1,points:[
  {pixel:{x:500,y:50},m:20,ca:1},
  {pixel:{x:100,y:350},m:0,ca:0}
 ]};
 const b={label:'Corriente rápida',radiusPixels:2,points:[
  {pixel:{x:100,y:350},m:0,ca:0},
  {pixel:{x:300,y:200},m:10,ca:.5}
 ]};
 assert(m.validSessionSeries(a));
 assert(m.validSessionSeries(b));
 const output=m.seriesSessionExport({
  sourceName:'ejemplo.png',width:600,height:400,calibration:c,series:[a,b]
 });
 assert(output);
 assert.equal(output.series.length,2);
 assert.deepEqual(output.series[0].points,[{m:0,ca:0},{m:20,ca:1}]);
 assert.equal(output.series[0].sourcePixels.length,2);
 assert.match(output.qualification,/no certificadas/);
 assert(!Object.hasOwn(output,'image'));
 assert(!Object.hasOwn(output,'signature'));
 assert(!Object.hasOwn(output,'approval'));
 assert.equal(m.seriesSessionExport({
  sourceName:'',width:600,height:400,calibration:c,series:[a]}),null);
 assert.equal(m.validSessionSeries({...a,label:'  '}),false);
 assert.equal(m.validSessionSeries({...a,points:[a.points[0]]}),false);
});
