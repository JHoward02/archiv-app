#!/usr/bin/env python3
"""Generate Android launcher assets from the user's approved A-frame image.

Keep breathing room around the complete A so the launcher mask cannot trim its feet.
The image is stored as a compact lossless-transfer base64 text asset in the repo.
"""
from pathlib import Path
from io import BytesIO
import base64
from PIL import Image

source = Path(__file__).with_name("a-frame-icon.webp.b64")
art = Image.open(BytesIO(base64.b64decode(source.read_text().strip()))).convert("RGBA")
for size, folder in [(48, "mdpi"), (72, "hdpi"), (96, "xhdpi"), (144, "xxhdpi"), (192, "xxxhdpi")]:
    base = Image.new("RGBA", (size, size), (8, 5, 4, 255))
    inset = round(size * .12)
    thumb = art.copy()
    thumb.thumbnail((size - 2*inset, size - 2*inset), Image.Resampling.LANCZOS)
    base.alpha_composite(thumb, ((size-thumb.width)//2, (size-thumb.height)//2))
    output = Path("app/src/main/res/mipmap-" + folder)
    output.mkdir(parents=True, exist_ok=True)
    base.save(output/"ic_launcher.png")
    base.save(output/"ic_launcher_round.png")
print("Generated full A-frame icon with safety padding at five resolutions")
