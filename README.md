# NTHU CCXP CAPTCHA — Offline Solver

An unofficial Firefox extension that recognizes six-digit CAPTCHAs on the
National Tsing Hua University CCXP login page locally in the browser.
Not affiliated with or endorsed by NTHU.

## Features

- Local JavaScript inference; no third-party recognition service or telemetry.
- Fills the CAPTCHA field without submitting the login form or replacing existing text.
- Runs only on `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/*`.
- Stores the recognition model locally using Firefox's `storage` permission.
- Includes no remotely loaded JavaScript or runtime dependencies.

## Model

The original `tiny_net.pt` model is imported once through the extension's setup
page. Model weights are not bundled. Imported bytes are checked against Git blob
SHA-1 `d5825b06613202943d481dd6cbe69c939ffddaf4` and parsed without executing pickle
instructions. Recognition runs locally after import.

Model source: [25349023/nthu-ccxp-captcha](https://github.com/25349023/nthu-ccxp-captcha/blob/master/decaptcha/tiny_net.pt).

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
