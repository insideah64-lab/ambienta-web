import test from 'node:test';
import assert from 'node:assert/strict';
import {AMBIENTA_WEB_VERSION,AMBIENTA_WEB_RELEASE_LABEL} from '../../apps/web-v3/src/release-info.mjs';
test('release identifies the web product independently of its SIG submodule',()=>{
 assert.equal(AMBIENTA_WEB_VERSION,'3.6.6');
 assert.equal(AMBIENTA_WEB_RELEASE_LABEL,'AMBIENTA · WEB 3.6.6');
 assert(!AMBIENTA_WEB_RELEASE_LABEL.includes('SIG'));
});
