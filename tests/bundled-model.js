'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const LM = require('../extension/model.js');
const bytes = new Uint8Array(fs.readFileSync(path.join(__dirname, '../extension/models/tiny_net.pt')));
const code = fs.readFileSync(path.join(__dirname, '../extension/background.js'), 'utf8');
function background(payload = bytes, ok = true) {
  let listener, calls = 0;
  const context = {Uint8Array, LocalCaptchaModel: LM,
    browser: {runtime: {id: 'test-addon', getURL: p => `moz-extension://test/${p}`,
      onMessage: {addListener: fn => { listener = fn; }}}},
    fetch: async url => {
      assert.equal(url, 'moz-extension://test/models/tiny_net.pt');
      calls++;
      return {ok, arrayBuffer: async () => payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength)};
    }};
  vm.runInNewContext(code, context);
  return {request: (message = {type: 'get-bundled-model'}, sender = {id: 'test-addon'}) => listener(message, sender), calls: () => calls};
}
(async () => {
  assert.equal(await LM.officialBlobSHA1(bytes), LM.OFFICIAL_GIT_BLOB_SHA1);
  const weights = LM.modelFromBytes(bytes);
  assert.match(LM.predictImageData({width:100,height:25,data:new Uint8Array(100*25*4)}, weights), /^\d{6}$/);
  // A fresh profile: no storage API exists in this harness.
  const bg = background();
  assert.equal(bg.request({type:'other'}), undefined);
  assert.equal(bg.request({type:'get-bundled-model'}, {id:'other-addon'}), undefined);
  const [a,b] = await Promise.all([bg.request(),bg.request()]);
  assert.equal(bg.calls(), 1);
  assert.equal(a.modelB64, b.modelB64);
  assert.deepEqual(LM.base64ToBytes(a.modelB64), bytes);
  await bg.request(); assert.equal(bg.calls(),1);
  const corrupt = bytes.slice(); corrupt[100] ^= 1;
  assert.match((await background(corrupt).request()).error, /integrity/);
  const missing = background(bytes, false);
  assert.match((await missing.request()).error, /could not be read/);
  await missing.request(); assert.equal(missing.calls(),2);
  console.log('PASS: real model integrity/inference, fresh-profile loading, cache, rejected messages, corrupt/missing model');
})().catch(error => { console.error(error); process.exitCode = 1; });
