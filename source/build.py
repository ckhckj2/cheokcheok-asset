from pathlib import Path
import base64,hashlib
root=Path(__file__).resolve().parent
css=(root/'base.css').read_text()+'\n'+(root/'asset.css').read_text()
js='\n'.join((root/name).read_text() for name in ['curriculum.js','progress.js','app.js'])
assert '</script' not in js.lower()
sha=lambda text:base64.b64encode(hashlib.sha256(text.encode()).digest()).decode()
csp=f"default-src 'none'; script-src 'sha256-{sha(js)}'; style-src 'sha256-{sha(css)}'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"
html=(root/'template.html').read_text().replace('__CSS__',css).replace('__JS__',js).replace('__CSP__',csp)
(root/'index.html').write_text(html)
print(f'Built {len(html.encode())} bytes')
