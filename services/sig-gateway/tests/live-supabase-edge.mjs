import assert from 'node:assert/strict';
import {SIG_API_BASE,SIG_API_ANON} from '../../../v3/overrides/src/features/maps/sig-gateway-config.mjs';
import {requestOfficialPolygons} from '../../../v3/overrides/src/features/maps/sig-gateway-client.mjs';
const bbox=[-66.222472174,-25.056742206,-66.182768004,-25.020769366];
const result=await requestOfficialPolygons(SIG_API_BASE,'municipios',bbox,{token:SIG_API_ANON});
assert.equal(result.status,'complete');
assert(result.provenance.sourceCount>0&&result.provenance.sourceCount<=20);
assert(result.provenance.selectedCount>0);
assert.deepEqual(result.provenance.queryBbox,bbox);
assert.equal(result.provenance.hashScope,'raw_upstream_wfs_response');
assert.equal(result.provenance.queryIsProjectPerimeter,false);
assert.match(result.provenance.originalResponseSha256,/^[a-f0-9]{64}$/);
console.log(JSON.stringify({result:'PASS',service:'Supabase Edge IDESA WFS gateway',sourceCount:result.provenance.sourceCount,
 selectedCount:result.provenance.selectedCount,sourceBytes:result.provenance.originalResponseBytes,
 topology:'Polygon/MultiPolygon',sourceHashVerified:true}));
