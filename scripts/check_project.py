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
assert M['permissions'] == ['storage']
assert len(M['content_scripts']) == 1
assert M['content_scripts'][0]['matches'] == ['https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/*']
assert M['content_scripts'][0]['js'] == ['model.js','content-script.js']
assert 'background' not in M and 'host_permissions' not in M and 'web_accessible_resources' not in M
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
    for pattern in [r'\bfetch\s*\(', r'\bXMLHttpRequest\s*\(', r'\bWebSocket\s*\(',
                    r'\bsendBeacon\s*\(', r'\beval\s*\(', r'\bnew\s+Function\s*\(']:
        assert not re.search(pattern,s), (f.name,pattern)
    assert 'execute-api' not in s and 'SERVER_URL' not in s
assert 'type="file"' in (EXT/'options.html').read_text()
print('PASS: Firefox manifest, scoped permissions, local-only code and required repository files')
