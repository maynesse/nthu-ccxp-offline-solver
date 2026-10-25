'use strict';
const input = document.querySelector('#model-file');
const status = document.querySelector('#status');
const forget = document.querySelector('#forget');
const LM = globalThis.LocalCaptchaModel;

function show(message, type = '') {
  status.textContent = message;
  status.className = type;
}
async function refresh() {
  try {
    const {modelB64} = await browser.storage.local.get('modelB64');
    show(modelB64 ? '✓ Ready. Recognition uses local model storage only.' :
      'Not set up yet. Import the model to enable recognition.', modelB64 ? 'success' : '');
    forget.disabled = !modelB64;
  } catch (e) { show(`Unable to access local storage: ${e.message}`, 'error'); }
}

input.addEventListener('change', async () => {
  const file = input.files[0];
  if (!file) return;
  show('Checking the model file…');
  try {
    if (file.size < 1000 || file.size > 2_000_000) throw new Error('Unexpected file size.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sha = await LM.officialBlobSHA1(bytes);
    if (sha !== LM.OFFICIAL_GIT_BLOB_SHA1) {
      throw new Error('This is not the original model from the reviewed GitHub commit. Check the download source.');
    }
    // Validate model shape and nonexecuting ZIP parsing before storing.
    LM.modelFromBytes(bytes);
    await browser.storage.local.set({modelB64: LM.byteToBase64(bytes)});
    show('✓ Model imported. Reload the NTHU CCXP page to use offline recognition.', 'success');
    forget.disabled = false;
  } catch (e) { show(`Import failed: ${e.message}`, 'error'); }
  finally { input.value = ''; }
});
forget.addEventListener('click', async () => {
  await browser.storage.local.remove('modelB64');
  await refresh();
});
void refresh();
