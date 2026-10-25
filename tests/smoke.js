// Dependency-free smoke tests; full PyTorch parity test is optional.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../extension/model.js');
const m = JSON.parse(fs.readFileSync(path.join(__dirname,'../extension/manifest.json'),'utf8'));
assert.equal(m.manifest_version, 2);
assert.equal(m.browser_specific_settings.gecko.data_collection_permissions.required[0], 'none');
assert.deepEqual(m.permissions,[]);
assert.throws(() => M.modelFromBytes(new Uint8Array(90)), /ZIP-based|ZIP/);
const weights = {
  conv1W:new Float32Array(16*3*3*3),conv1B:new Float32Array(16),
  conv2W:new Float32Array(16*16*3*3),conv2B:new Float32Array(16),
  linearW:new Float32Array(10*64),linearB:new Float32Array(10)
};
const pixels = {width:100,height:25,data:new Uint8Array(100*25*4)};
assert.equal(M.predictImageData(pixels,weights),'000000');
assert.throws(()=>M.predictImageData({...pixels,width:95},weights),/Unexpected CAPTCHA/);
const bytes = new Uint8Array([0,1,2,128,254,255]);
assert.deepEqual(Array.from(M.base64ToBytes(M.byteToBase64(bytes))),Array.from(bytes));
console.log('PASS: local model smoke tests, secure manifest declaration and base64 conversion');
