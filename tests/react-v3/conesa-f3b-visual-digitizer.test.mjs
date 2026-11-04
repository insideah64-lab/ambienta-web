import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const esbuild=require('esbuild');
const built=await esbuild.build({
 entryPoints:['v3/overrides/src/features/impacts/ConesaF3VisualDigitizerModel.ts'],
 bundle:true,write:false,format:'esm',platform:'node',target:'es2022'
});
const m=await import('data:text/javascript;base64,'+
 Buffer.from(built.outputFiles[0].text).toString('base64'));
const axis=()=>({
 xPixelA:'100',xValueA:'0',xPixelB:'500',xValueB:'20',
 yPixelA:'500',yValueA:'0',yPixelB:'100',yValueB:'1'
});
test('Image coordinate calibration uses original pixels and no extrapolation',()=>{
 const c=m.visualCalibration(axis(),600,600);
 assert.equal(c.problems.length,0);
 assert(c.calibration);
 const p=m.imageToMagnitude({x:300,y:300},c.calibration,600,600);
 assert(p);assert(Math.abs(p.m-10)<1e-12);assert(Math.abs(p.ca-.5)<1e-12);
 assert.deepEqual(m.imageToMagnitude({x:100,y:500},c.calibration,600,600),{m:0,ca:0});
 assert.deepEqual(m.imageToMagnitude({x:500,y:100},c.calibration,600,600),{m:20,ca:1});
 for(const pos of [{x:90,y:300},{x:540,y:300},{x:300,y:90},
  {x:300,y:550},{x:Infinity,y:300},{x:-2,y:30}]){
  assert.equal(m.imageToMagnitude(pos,c.calibration,600,600),null);
 }
});
test('Calibration rejects missing, equal, outside bounds and unsafe sizes',()=>{
 const cases=[
  d=>{d.xPixelB='100'},d=>{d.xValueB='0'},d=>{d.xPixelA='-1'},
  d=>{d.yValueB='2'},d=>{d.yPixelA='100'},
  d=>{d.yPixelB='601'},d=>{d.xValueA='NaN'}
 ];
 for(const change of cases){const a=axis();change(a);
  assert.equal(m.visualCalibration(a,600,600).calibration,null);}
 assert.equal(m.visualCalibration(axis(),0,600).calibration,null);
 assert.equal(m.visualCalibration(axis(),10001,12001).calibration,null);
});
test('Reversed calibrations are supported, but CA never escapes 0..1',()=>{
 const a=axis();a.xValueA='20';a.xValueB='0';
 const {calibration}=m.visualCalibration(a,600,600);
 assert(calibration);
 const v=m.imageToMagnitude({x:300,y:300},calibration,600,600);
 assert.deepEqual(v,{m:10,ca:.5});
});
test('Visual nudos are sorted and only valid domain/CA pairs are exported',()=>{
 const points=[
  {pixel:{x:500,y:100},m:20,ca:1},
  {pixel:{x:100,y:500},m:0,ca:0},
  {pixel:{x:300,y:300},m:10,ca:.5}
 ];
 assert.deepEqual(m.usableVisualPoints(points).points.map(x=>x.m),[0,10,20]);
 assert.equal(m.asIndependentReading(points),'0;0\n10;0.5\n20;1');
 assert.equal(m.proposedReadingProblems('0;0\n10;0.5\n20;1').length,0);
 assert.equal(m.asIndependentReading(points.slice(0,1)),null);
 assert.equal(m.asIndependentReading([...points,{pixel:{x:100,y:400},m:0,ca:.7}]),null);
 assert.equal(m.asIndependentReading([...points,{pixel:{x:250,y:250},m:5,ca:-.2}]),null);
});
