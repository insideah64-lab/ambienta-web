import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web-v3/package.json',import.meta.url));
const built=await require('esbuild').build({entryPoints:['v3/overrides/src/features/mita/NdviClient.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const form={west:'-65.470',south:'-24.760',east:'-65.465',north:'-24.755',start:'2025-05-01',end:'2025-06-30',maxCloud:'0'};
test('NDVI query preserves zero cloud and coordinates without modifying input',()=>{const copy=structuredClone(form),q=m.ndviQuery(form);assert.equal(q.max_cloud,0);assert.deepEqual(q.bbox,[-65.47,-24.76,-65.465,-24.755]);assert.deepEqual(form,copy);});
test('NDVI rejects missing coordinates, inverted window, impossible dates and oversized pilot',()=>{for(const patch of [{west:''},{east:'-66'},{north:'-24'},{start:'2025-02-30'},{end:'2024-01-01'},{maxCloud:''},{maxCloud:'101'}])assert.throws(()=>m.ndviQuery({...form,...patch}));});
test('NDVI accepts bounded numeric legend stops only, never CSS payloads',()=>{assert.match(m.ndviLegend([{value:-1,color:'#123456d0'},{value:1,color:'#abcdefd0'}]),/0%.*100%/);assert.equal(m.ndviLegend([{value:-1,color:'url(https://example.invalid)'},{value:1,color:'#abcdefd0'}]),undefined);assert.equal(m.ndviLegend([{value:1,color:'#123456d0'},{value:-1,color:'#abcdefd0'}]),undefined);});
test('NDVI client rejects external destinations and unsupported operations before fetch',async()=>{for(const path of ['https://example.invalid','/../health','/jobs/other/files/report','/contaminants'])await assert.rejects(()=>m.ndviRequest(path));});
