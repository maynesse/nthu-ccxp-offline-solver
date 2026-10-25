'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const Model = require('../extension/model.js');
const bytes = new Uint8Array(fs.readFileSync(path.join(__dirname, 'synthetic.pt')));
const model = Model.modelFromBytes(bytes);
let fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'synthetic.json'), 'utf8'));
for (const item of fixtures) {
  const result = Model.predictImageData({width:item.width,height:item.height,data:Uint8Array.from(item.rgba)}, model);
  console.log(`h=${item.height}: JS ${result}; PyTorch ${item.answer}`);
  assert.strictEqual(result, item.answer);
}
console.log('All PyTorch/JavaScript recognition predictions agree.');
