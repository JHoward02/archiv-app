#!/usr/bin/env python3
"""Build Android icons from the owner's navy-and-gold brick artwork.

The original art is preserved, with a small safety margin for rounded Android
launcher masks. This changes only Android launcher icons, not website branding.
"""
from pathlib import Path
from io import BytesIO
import base64
from PIL import Image

source = Path(__file__).with_name("golden-brick-icon.webp.b64")
art = Image.open(BytesIO(base64.b64decode(source.read_text().strip()))).convert("RGBA")
for size, folder in [(48, "mdpi"), (72, "hdpi"), (96, "xhdpi"), (144, "xxhdpi"), (192, "xxxhdpi")]:
    base = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    inset = round(size * .06)
    thumb = art.copy()
    thumb.thumbnail((size-2*inset, size-2*inset), Image.Resampling.LANCZOS)
    base.alpha_composite(thumb, ((size-thumb.width)//2, (size-thumb.height)//2))
    output = Path("app/src/main/res/mipmap-" + folder)
    output.mkdir(parents=True, exist_ok=True)
    base.save(output/"ic_launcher.png")
    base.save(output/"ic_launcher_round.png")
print("Generated gold brick Android launcher icons at five display densities")
