'use strict';
const status = document.querySelector('#status');
(async () => {
  try {
    const result = await browser.runtime.sendMessage({type: 'get-bundled-model'});
    if (!result?.modelB64) throw new Error(result?.error || 'Bundled model unavailable.');
    status.textContent = '✓ Model included and verified — ready to use.';
    status.className = 'success';
  } catch (error) {
    status.textContent = `Unable to load the bundled model: ${error.message}`;
    status.className = 'error';
  }
})();
