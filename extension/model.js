/*
 * Local NTHU CCXP CAPTCHA recognizer.
 * Reimplements the architecture of 25349023/nthu-ccxp-captcha entirely in JS.
 * Reads ONLY the tensor storage entries from the official PyTorch checkpoint ZIP;
 * it never unpickles/executes anything in the checkpoint.
 * SPDX-License-Identifier: MIT
 */
(function (root) {
  'use strict';

  const OFFICIAL_GIT_BLOB_SHA1 = 'd5825b06613202943d481dd6cbe69c939ffddaf4';
  const decoder = new TextDecoder('utf-8', {fatal: true});

  function byteToBase64(bytes) {
    let result = '';
    // Chunked conversion avoids argument stack-size limits.
    for (let i = 0; i < bytes.length; i += 8192) {
      result += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(result);
  }

  function base64ToBytes(base64) {
    const decoded = atob(base64);
    const output = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) output[i] = decoded.charCodeAt(i);
    return output;
  }

  function readZipStoredEntries(bytes) {
    if (bytes.byteLength > 2_000_000 || bytes.byteLength < 80) {
      throw new Error('Unexpected model file size.');
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = (offset) => view.getUint16(offset, true);
    const u32 = (offset) => view.getUint32(offset, true);
    // Find the ZIP End-of-Central-Directory record (allows a ZIP comment).
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
      if (u32(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('The file is not a ZIP-based PyTorch checkpoint.');
    const entriesCount = u16(eocd + 10);
    let cursor = u32(eocd + 16);
    if (entriesCount > 100) throw new Error('Unexpected number of checkpoint files.');
    const tensors = new Map();
    for (let i = 0; i < entriesCount; i++) {
      if (cursor + 46 > bytes.length || u32(cursor) !== 0x02014b50) {
        throw new Error('Invalid ZIP central directory.');
      }
      const method = u16(cursor + 10);
      const compressedSize = u32(cursor + 20);
      const originalSize = u32(cursor + 24);
      const nameLength = u16(cursor + 28);
      const extraLength = u16(cursor + 30);
      const commentLength = u16(cursor + 32);
      const localOffset = u32(cursor + 42);
      const filenameEnd = cursor + 46 + nameLength;
      if (filenameEnd > bytes.length) throw new Error('Truncated ZIP filename.');
      const filename = decoder.decode(bytes.subarray(cursor + 46, filenameEnd));
      cursor = filenameEnd + extraLength + commentLength;
      if (cursor > bytes.length) throw new Error('Invalid ZIP entry lengths.');
      const match = filename.match(/^[^/]+\/data\/(\d+)$/);
      if (!match) continue;
      if (method !== 0 || compressedSize !== originalSize) {
        throw new Error('This checkpoint uses unsupported compression.');
      }
      if (localOffset + 30 > bytes.length || u32(localOffset) !== 0x04034b50) {
        throw new Error('Invalid ZIP local header.');
      }
      const dataStart = localOffset + 30 + u16(localOffset + 26) + u16(localOffset + 28);
      if (dataStart + compressedSize > bytes.length) throw new Error('Truncated model tensor.');
      tensors.set(Number(match[1]), bytes.subarray(dataStart, dataStart + compressedSize));
    }
    return tensors;
  }

  function tensorFloat(tensors, index, expectedCount) {
    const data = tensors.get(index);
    if (!data || data.byteLength !== expectedCount * 4) {
      throw new Error(`Missing/unexpected tensor data/${index}: expected ${expectedCount} floats.`);
    }
    const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const result = new Float32Array(expectedCount);
    for (let i = 0; i < expectedCount; i++) result[i] = v.getFloat32(i * 4, true);
    if (!result.every(Number.isFinite)) throw new Error('The model contains invalid weights.');
    return result;
  }

  function foldBatchNorm(weights, biases, bnGamma, bnBeta, bnMean, bnVariance, numInputs, kernelSize) {
    const outputChannels = biases.length;
    const scalePerOut = numInputs * kernelSize * kernelSize;
    for (let out = 0; out < outputChannels; out++) {
      if (bnVariance[out] < 0) throw new Error('Invalid batch norm variance.');
      const scale = bnGamma[out] / Math.sqrt(bnVariance[out] + 1e-5);
      const shift = bnBeta[out] - bnMean[out] * scale;
      for (let j = 0; j < scalePerOut; j++) weights[out * scalePerOut + j] *= scale;
      biases[out] = biases[out] * scale + shift;
    }
  }

  function modelFromBytes(bytes) {
    const tensor = readZipStoredEntries(bytes);
    const conv1W = tensorFloat(tensor, 0, 16 * 3 * 3 * 3);
    const conv1B = tensorFloat(tensor, 1, 16);
    const bn1G = tensorFloat(tensor, 2, 16);
    const bn1B = tensorFloat(tensor, 3, 16);
    const bn1M = tensorFloat(tensor, 4, 16);
    const bn1V = tensorFloat(tensor, 5, 16);
    const conv2W = tensorFloat(tensor, 7, 16 * 16 * 3 * 3);
    const conv2B = tensorFloat(tensor, 8, 16);
    const bn2G = tensorFloat(tensor, 9, 16);
    const bn2B = tensorFloat(tensor, 10, 16);
    const bn2M = tensorFloat(tensor, 11, 16);
    const bn2V = tensorFloat(tensor, 12, 16);
    const linearW = tensorFloat(tensor, 14, 10 * 64);
    const linearB = tensorFloat(tensor, 15, 10);
    foldBatchNorm(conv1W, conv1B, bn1G, bn1B, bn1M, bn1V, 3, 3);
    foldBatchNorm(conv2W, conv2B, bn2G, bn2B, bn2M, bn2V, 16, 3);
    return {conv1W, conv1B, conv2W, conv2B, linearW, linearB};
  }

  // Equivalent to PyTorch Conv2d(in, 16, kernel=3, stride=2, padding=1) + ReLU.
  // Data is C,H,W (CHW), and weights are O,I,K,K.
  function convRelu(input, inChannels, inHeight, inWidth, weights, bias) {
    const outH = Math.ceil(inHeight / 2);
    const outW = Math.ceil(inWidth / 2);
    const output = new Float32Array(16 * outH * outW);
    const inArea = inHeight * inWidth;
    const outArea = outH * outW;
    for (let oc = 0; oc < 16; oc++) {
      for (let oy = 0; oy < outH; oy++) {
        for (let ox = 0; ox < outW; ox++) {
          let sum = bias[oc];
          for (let ic = 0; ic < inChannels; ic++) {
            const baseIn = ic * inArea;
            const baseWeight = (oc * inChannels + ic) * 9;
            for (let ky = 0; ky < 3; ky++) {
              const y = oy * 2 + ky - 1;
              if (y < 0 || y >= inHeight) continue;
              for (let kx = 0; kx < 3; kx++) {
                const x = ox * 2 + kx - 1;
                if (x < 0 || x >= inWidth) continue;
                sum += input[baseIn + y * inWidth + x] * weights[baseWeight + ky * 3 + kx];
              }
            }
          }
          output[oc * outArea + oy * outW + ox] = Math.max(0, sum);
        }
      }
    }
    return {data: output, height: outH, width: outW};
  }

  function predictDigit(rgbCHW, height, model) {
    const layer1 = convRelu(rgbCHW, 3, height, 16, model.conv1W, model.conv1B);
    const layer2 = convRelu(layer1.data, 16, layer1.height, layer1.width, model.conv2W, model.conv2B);
    const h = layer2.height, w = layer2.width;
    const area = h * w;
    const pooled = new Float32Array(64);
    for (let channel = 0; channel < 16; channel++) {
      for (let py = 0; py < 2; py++) {
        const y0 = Math.floor(py * h / 2);
        const y1 = Math.ceil((py + 1) * h / 2);
        for (let px = 0; px < 2; px++) {
          const x0 = Math.floor(px * w / 2);
          const x1 = Math.ceil((px + 1) * w / 2);
          let total = 0;
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) total += layer2.data[channel * area + y * w + x];
          }
          pooled[channel * 4 + py * 2 + px] = total / ((y1 - y0) * (x1 - x0));
        }
      }
    }
    let bestScore = -Infinity, bestDigit = 0;
    for (let d = 0; d < 10; d++) {
      let score = model.linearB[d];
      for (let k = 0; k < 64; k++) score += pooled[k] * model.linearW[d * 64 + k];
      if (score > bestScore) { bestScore = score; bestDigit = d; }
    }
    return bestDigit;
  }

  function predictImageData(imageData, model) {
    const {width, height, data} = imageData;
    // Matches the original Python model's max_valid_w=100 and w//digits=16.
    const validWidth = Math.min(width, 100);
    const patchWidth = Math.floor(validWidth / 6);
    if (patchWidth !== 16 || height < 8 || height > 150 || data.length !== width * height * 4) {
      throw new Error('Unexpected CAPTCHA image dimensions. Expected at least 96 pixels wide.');
    }
    const result = [];
    for (let digit = 0; digit < 6; digit++) {
      const input = new Float32Array(3 * height * patchWidth);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < patchWidth; x++) {
          const index = (y * width + digit * patchWidth + x) * 4;
          for (let c = 0; c < 3; c++) {
            input[c * height * patchWidth + y * patchWidth + x] = data[index + c] / 255;
          }
        }
      }
      result.push(predictDigit(input, height, model));
    }
    return result.join('');
  }

  async function officialBlobSHA1(bytes) {
    const prefix = new TextEncoder().encode(`blob ${bytes.byteLength}\0`);
    const payload = new Uint8Array(prefix.length + bytes.length);
    payload.set(prefix); payload.set(bytes, prefix.length);
    const digest = await crypto.subtle.digest('SHA-1', payload);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  }

  const api = {modelFromBytes, predictImageData, byteToBase64, base64ToBytes,
    officialBlobSHA1, OFFICIAL_GIT_BLOB_SHA1};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LocalCaptchaModel = api;
})(globalThis);
