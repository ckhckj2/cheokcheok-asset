"""Run relevant automated checks and verify the generated static release."""
from pathlib import Path
from html.parser import HTMLParser
import base64
import hashlib
import subprocess
import sys

root = Path(__file__).resolve().parent
for name in ["progress", "quiz", "investment", "assumptions", "scenarios", "integration"]:
    subprocess.run(["node", str(root / f"{name}.test.js")], cwd=root, check=True)
subprocess.run([sys.executable, str(root / "build.py")], cwd=root, check=True)


class Release(HTMLParser):
    def __init__(self):
        super().__init__()
        self.blocks = {"script": [], "style": []}
        self.current = None
        self.csp = None
        self.ids = set()
        self.routes = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        assert not any(key.startswith("on") for key in attrs), "Inline event handler"
        assert not attrs.get("href", "").lower().startswith("javascript:"), "Script URL"
        if "id" in attrs:
            assert attrs["id"] not in self.ids, "Duplicate static id"
            self.ids.add(attrs["id"])
        if "data-view" in attrs:
            self.routes.append(attrs["data-view"])
        if tag == "meta" and attrs.get("http-equiv") == "Content-Security-Policy":
            self.csp = attrs["content"]
        if tag in self.blocks:
            assert "src" not in attrs, "Unexpected external script"
            self.blocks[tag].append("")
            self.current = tag

    def handle_endtag(self, tag):
        if tag == self.current:
            self.current = None

    def handle_data(self, data):
        if self.current:
            self.blocks[self.current][-1] += data


output = root.parent if root.name == "source" else root
html = (output / "index.html").read_text()
release = Release()
release.feed(html)
for tag in ["script", "style"]:
    assert len(release.blocks[tag]) == 1, f"Expected one bundled {tag}"
    digest = base64.b64encode(hashlib.sha256(release.blocks[tag][0].encode()).digest()).decode()
    assert f"{tag}-src 'sha256-{digest}'" in release.csp, f"Mismatched {tag} CSP"
for directive in ["default-src 'none'", "connect-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]:
    assert directive in release.csp, f"Missing {directive}"
assert all(f"view-{route}" in release.ids for route in release.routes), "Missing view"
assert "__CSS__" not in html and "__JS__" not in html and "__CSP__" not in html
print("PASS: generated bundle CSP hashes, static navigation targets and no inline handlers/external scripts")
