# NTHU CCXP CAPTCHA — Offline Solver

An unofficial Firefox extension that recognizes six-digit CAPTCHAs on the
National Tsing Hua University CCXP login page locally in the browser.
Not affiliated with or endorsed by NTHU.

## Download

[**Download for Firefox (.xpi)**](https://github.com/maynesse/nthu-ccxp-offline-solver/releases/latest/download/nthu-ccxp-offline-solver-1.0.3.xpi)

Download the .xpi. In Firefox, open about:addons, click the gear menu,
choose Install Add-on From File…, and select the downloaded file.
Version 1.0.3 includes the model: open or refresh the NTHU CCXP login page.
Older releases (1.0.2 and earlier) still require a one-time model import.


## Features

- Local JavaScript inference; no third-party recognition service or telemetry.
- Fills the CAPTCHA field without submitting the login form or replacing existing text.
- Runs only on `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/*`.
- Includes the verified recognition model; no setup, storage permission, or external model download.
- Includes no remotely loaded JavaScript or runtime dependencies.

## Model

The original `tiny_net.pt` is bundled under `extension/models/` and verified
against Git blob SHA-1 `d5825b06613202943d481dd6cbe69c939ffddaf4` before use.
The background script reads only this fixed internal extension resource and
passes the verified bytes to the content script. It has no remote fallback.
The checkpoint is parsed without executing pickle instructions.

Existing installations no longer depend on a manually imported model. Any
legacy stored copy is unused. The original project may be unavailable without
affecting model loading in 1.0.3.

See [model provenance](extension/models/README.md) and [license](LICENSE).

## Development

Requires Python 3.8+ and Node.js 22+. The Python build uses the standard library.
Mozilla validation tooling is pinned in `package-lock.json`.

```sh
npm ci --ignore-scripts
npm test
npm run lint
npm run build
```

The deterministic build produces separate extension and source archives in
`dist/`, with SHA-256 checksums. The extension archive has `manifest.json` at
its root. Development dependencies are excluded from both archives.

Optional numerical compatibility tests require PyTorch and NumPy:

```sh
python3 tests/make_synthetic_fixture.py
node tests/verify_local.js
```

## Project layout

- `extension/`: Firefox extension source and assets.
- `scripts/`: project checks and reproducible packaging.
- `tests/`: smoke tests and optional numerical compatibility tests.
- `.github/workflows/`: continuous integration.

## Privacy and license

See [PRIVACY.md](PRIVACY.md), [LICENSE](LICENSE), and [NOTICE.md](NOTICE.md).
Original project and model copyright (c) 2022 25349023, licensed under MIT.
