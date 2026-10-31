import assert from 'node:assert/strict';
import {retrieveAndClip,validateRequest} from '../gateway.mjs';
// Small, rate-limited, explicit remote QA. Never fetch the country-wide source.
const request=validateRequest({layer:'municipios',
 bbox:[-66.222472174,-25.056742206,-66.182768004,-25.020769366]});
const response=await retrieveAndClip(request);
assert.equal(response.status,'complete');
assert(response.provenance.sourceCount>0&&response.provenance.sourceCount<=20);
assert(response.provenance.selectedCount>0);
assert(response.clip.features.every(x=>['Polygon','MultiPolygon'].includes(x.geometry.type)));
assert.equal(response.provenance.hashScope,'raw_upstream_wfs_response');
assert.match(response.provenance.originalResponseSha256,/^[a-f0-9]{64}$/);
assert(!response.provenance.queryIsProjectPerimeter);
console.log(JSON.stringify({result:'PASS',provider:'IDESA Salta',sourceCount:response.provenance.sourceCount,
 clippedCount:response.provenance.selectedCount,
 sourceBytes:response.provenance.originalResponseBytes,rawSourceSha256:response.provenance.originalResponseSha256}));
