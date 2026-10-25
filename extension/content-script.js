/* Does not make fetch, XHR, WebSocket, Beacon, or any other network requests. */
(async () => {
  'use strict';
  const {LocalCaptchaModel: localModel} = globalThis;
  let model = null;
  let inflight = false;
  let lastImage = null;

  try {
    const result = await browser.runtime.sendMessage({type: 'get-bundled-model'});
    if (!result?.modelB64) throw new Error(result?.error || 'Bundled model unavailable.');
    model = localModel.modelFromBytes(localModel.base64ToBytes(result.modelB64));
  } catch (error) {
    console.warn('[CCXP Local] Unable to load the local model:', error);
    return;
  }

  async function solve() {
    if (inflight) return;
    const img = document.querySelector('.inputtext ~ img');
    const field = document.querySelector('input.inputtext[name="passwd2"]');
    if (!img || !field || !img.complete || img.naturalWidth === 0) return;
    if (field.value.trim()) return; // Never overwrite something typed by the user.
    const identity = `${img.currentSrc}:${img.naturalWidth}:${img.naturalHeight}`;
    if (lastImage === identity) return;
    inflight = true;
    try {
      // Image already loaded by NTHU page: reading pixels adds NO extra request.
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', {willReadFrequently: true});
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const answer = localModel.predictImageData(pixels, model);
      // Avoid filling a changed CAPTCHA or overwriting user input.
      if (!field.value.trim() && img.currentSrc === identity.split(':').slice(0, -2).join(':')) {
        field.value = answer;
        field.dispatchEvent(new Event('input', {bubbles: true}));
        field.dispatchEvent(new Event('change', {bubbles: true}));
      }
      lastImage = identity;
    } catch (error) {
      console.warn('[CCXP Local] Recognition failed:', error);
    } finally { inflight = false; }
  }

  const observer = new MutationObserver(() => {
    const img = document.querySelector('.inputtext ~ img');
    if (img && !img.complete) img.addEventListener('load', solve, {once: true});
    else void solve();
  });
  observer.observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ['src']});
  const img = document.querySelector('.inputtext ~ img');
  if (img) img.addEventListener('load', solve);
  void solve();
})();
