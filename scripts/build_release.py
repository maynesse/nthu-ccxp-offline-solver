#!/usr/bin/env python3
"""Build reproducible AMO upload and project-source ZIPs using only stdlib."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
from hashlib import sha256
import json

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / 'extension'
OUT = ROOT / 'dist'
EXCLUDED = {'.DS_Store', '__pycache__', '.git', 'node_modules', '.venv', '.idea', '.vscode'}
TIME = (2020, 1, 1, 0, 0, 0)


def writezip(destination, pairs):
    with ZipFile(destination, 'w', compression=ZIP_DEFLATED, compresslevel=9) as z:
        for src, name in sorted(pairs, key=lambda x: x[1]):
            entry = ZipInfo(name, date_time=TIME)
            entry.compress_type = ZIP_DEFLATED
            entry.external_attr = (0o644 << 16)
            z.writestr(entry, src.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    digest = sha256(destination.read_bytes()).hexdigest()
    print(f'{destination.name}: {destination.stat().st_size:,} bytes | SHA-256 {digest}')
    return digest


def main():
    version = json.loads((EXT / 'manifest.json').read_text(encoding='utf-8'))['version']
    OUT.mkdir(parents=True, exist_ok=True)
    pairs = [(p, p.relative_to(EXT).as_posix()) for p in EXT.rglob('*') if p.is_file() and not any(x in EXCLUDED for x in p.parts)]
    if not any(name == 'manifest.json' for _,name in pairs):
        raise RuntimeError('Missing manifest.json at the archive root')
    filename = f'nthu-ccxp-offline-solver-{version}.zip'
    release = OUT / filename
    h = writezip(release, pairs)
    sourcepairs = [(p, (ROOT.name + '/' + p.relative_to(ROOT).as_posix())) for p in ROOT.rglob('*')
                   if p.is_file() and not any(x in EXCLUDED or x in ('dist','synthetic.pt','synthetic.json') for x in p.relative_to(ROOT).parts)]
    srcname = f'nthu-ccxp-offline-solver-source-{version}.zip'
    sourcehash = writezip(OUT / srcname, sourcepairs)
    (OUT / 'SHA256SUMS.txt').write_text(f'{h}  {filename}\n{sourcehash}  {srcname}\n', encoding='utf-8')

if __name__ == '__main__':
    main()
