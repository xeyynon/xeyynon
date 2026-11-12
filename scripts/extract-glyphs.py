"""
Turns the fonts in scripts/fonts/ into outline data the SVG generator can
draw, so the README's images need no font loading at all (GitHub serves them
through <img>, where external fonts never load).

For each face below: the outline of every printable character as an SVG path
(font units, y up) and its advance. Variable fonts are cut at the weight named.

Run: python scripts/extract-glyphs.py   (needs fontTools and brotli)
"""
import json
from pathlib import Path

import re

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = Path(__file__).parent / "fonts"
FACES = {
    "display-600": ("SpaceGrotesk.woff2", 600),
    "display-700": ("SpaceGrotesk.woff2", 700),
    "display-400": ("SpaceGrotesk.woff2", 400),
    "display-500": ("SpaceGrotesk.woff2", 500),
    "mono-400": ("IBMPlexMono-Regular.woff2", None),
    "mono-500": ("IBMPlexMono-Medium.woff2", None),
}
CHARS = [chr(c) for c in range(0x20, 0x7F)] + list("·→↗↑’“”")


def extract(file, weight):
    font = TTFont(HERE / file)
    if weight is not None and "fvar" in font:
        font = instantiateVariableFont(font, {"wght": weight})
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()
    hmtx = font["hmtx"]
    out = {}
    for ch in CHARS:
        name = cmap.get(ord(ch))
        if not name:
            continue
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        # whole font units: invisible at README sizes, and a fraction of the bytes
        d = re.sub(r"-?\d+\.\d+", lambda m: str(round(float(m.group()))), pen.getCommands())
        out[ch] = {"adv": hmtx[name][0], "d": d}
    if "→" not in out:
        # Neither face has an arrow: draw one in its proportions (stem as thick as its "l").
        stem = 90 if (weight or 400) >= 600 else 70
        y, h = 330, stem / 2
        out["→"] = {
            "adv": 760,
            "d": f"M70 {y - h}H500V{y - 190}L700 {y}L500 {y + 190}V{y + h}H70Z",
        }
    kern = {}
    return {
        "unitsPerEm": font["head"].unitsPerEm,
        "capHeight": getattr(font["OS/2"], "sCapHeight", 0) or 700,
        "glyphs": out,
        "kern": kern,
    }


data = {key: extract(f, w) for key, (f, w) in FACES.items()}
(HERE / "glyphs.json").write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
print({k: len(v["glyphs"]) for k, v in data.items()}, (HERE / "glyphs.json").stat().st_size // 1024, "KB")
