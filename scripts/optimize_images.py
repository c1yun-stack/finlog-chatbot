"""Extract the chatbot mascots from HTML into cacheable PNG assets."""

from __future__ import annotations

import base64
import hashlib
import io
import re
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"
PATTERN = re.compile(r"data:image/png;base64,([A-Za-z0-9+/=]+)")
ASSETS = {
    "3e263848b7": "assets/images/goma-avatar.png",
    "d0c4b7d5bb": "assets/images/orso-avatar.png",
    "5187907d14": "assets/images/goma-full.png",
    "feaf28d042": "assets/images/orso-full.png",
}


def main() -> None:
    source = HTML.read_text(encoding="utf-8")
    replaced = 0

    def extract(match: re.Match[str]) -> str:
        nonlocal replaced
        raw = base64.b64decode(match.group(1))
        digest = hashlib.sha256(raw).hexdigest()[:10]
        relative = ASSETS.get(digest)
        if not relative:
            raise RuntimeError(f"Unmapped embedded image: {digest}")
        target = ROOT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(io.BytesIO(raw)) as image:
            image.save(target, format="PNG", optimize=True)
        replaced += 1
        return relative

    updated = PATTERN.sub(extract, source)
    if updated != source:
        HTML.write_text(updated, encoding="utf-8", newline="\n")
    print(f"data_uri_replacements={replaced}, assets={len(ASSETS)}")


if __name__ == "__main__":
    main()
