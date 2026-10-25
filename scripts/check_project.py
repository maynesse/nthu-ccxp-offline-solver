#!/usr/bin/env python3
"""Basic AMO package security, metadata, and repository structure checks."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / 'extension'
M = json.loads((EXT/'manifest.json').read_text(encoding='utf-8'))
assert M['manifest_version'] == 2
assert re.fullmatch(r'\d+\.\d+\.\d+', M['version'])
assert M['browser_specific_settings']['gecko']['data_collection_permissions']['required'] == ['none']
assert M['browser_specific_settings']['gecko']['strict_min_version'] == '140.0'
assert M['browser_specific_settings']['gecko']['id'] == '{0da11df6-4fad-4e60-a745-bf31d02f7839}'
assert M['browser_specific_settings']['gecko_android']['strict_min_version'] == '142.0'
assert M['permissions'] == []
assert len(M['content_scripts']) == 1
assert M['content_scripts'][0]['matches'] == ['https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/*']
assert M['content_scripts'][0]['js'] == ['model.js','content-script.js']
assert M['background'] == {'scripts': ['model.js', 'background.js'], 'persistent': False}
assert 'host_permissions' not in M and 'web_accessible_resources' not in M
for cs in M['content_scripts']:
    for fname in cs['js']:
        assert (EXT/fname).is_file(), fname
for key in ['browser_action','options_ui']:
    assert key in M
for rel in ['model.js','content-script.js','options.js','options.html','options.css','LICENSE',
            'icons/icon-48.png','icons/icon-96.png','icons/icon-128.png']:
    assert (EXT/rel).is_file(), rel
for rel in ['README.md','PRIVACY.md','LICENSE','NOTICE.md']:
    assert (ROOT/rel).is_file(), rel
for f in EXT.glob('*.js'):
    s = f.read_text(encoding='utf-8')
    # These scripts should not initiate networking or execute remote code.
    for pattern in [r'\bXMLHttpRequest\s*\(', r'\bWebSocket\s*\(',
                    r'\bsendBeacon\s*\(', r'\beval\s*\(', r'\bnew\s+Function\s*\(']:
        assert not re.search(pattern,s), (f.name,pattern)
    assert 'execute-api' not in s and 'SERVER_URL' not in s
assert 'type="file"' not in (EXT/'options.html').read_text()
import hashlib
model = (EXT/'models/tiny_net.pt').read_bytes()
assert hashlib.sha1(b'blob ' + str(len(model)).encode() + b'\0' + model).hexdigest() == 'd5825b06613202943d481dd6cbe69c939ffddaf4'
for f in EXT.glob('*.js'):
    calls = re.findall(r'\bfetch\s*\(', f.read_text())
    assert len(calls) == (1 if f.name == 'background.js' else 0)
assert "fetch(browser.runtime.getURL('models/tiny_net.pt'))" in (EXT/'background.js').read_text()
print('PASS: Firefox manifest, scoped permissions, local-only code and required repository files')
