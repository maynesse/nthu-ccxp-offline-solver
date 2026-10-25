'use strict';
// Only reads a fixed resource inside this signed extension; no remote fallback.
let modelPromise;
function bundledModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const response = await fetch(browser.runtime.getURL('models/tiny_net.pt'));
      if (!response.ok) throw new Error('Bundled model could not be read.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      const LM = globalThis.LocalCaptchaModel;
      if (await LM.officialBlobSHA1(bytes) !== LM.OFFICIAL_GIT_BLOB_SHA1) {
        throw new Error('Bundled model integrity check failed.');
      }
      LM.modelFromBytes(bytes); // Validate the checkpoint without executing pickle.
      return LM.byteToBase64(bytes);
    })().catch(error => {
      modelPromise = undefined; // Allow a later request to retry a failed read.
      throw error;
    });
  }
  return modelPromise;
}
browser.runtime.onMessage.addListener((message, sender) => {
  if (sender.id !== browser.runtime.id || message?.type !== 'get-bundled-model') return;
  return bundledModel().then(modelB64 => ({modelB64}), error => ({error: error.message}));
});
