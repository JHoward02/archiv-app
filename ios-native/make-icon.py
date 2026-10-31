#!/usr/bin/env python3
"""Generate the Archív iOS AppIcon using the owner's locked navy/gold brick art."""
from pathlib import Path
from io import BytesIO
import base64, json
from PIL import Image

source = Path("android-test/golden-brick-icon.webp.b64")
art = Image.open(BytesIO(base64.b64decode(source.read_text().strip()))).convert("RGBA")
icon_dir = Path("ios/App/App/Assets.xcassets/AppIcon.appiconset")
icon_dir.mkdir(parents=True, exist_ok=True)
image = Image.new("RGBA", (1024, 1024), (8, 36, 59, 255))
inset = 38
art.thumbnail((1024 - 2 * inset, 1024 - 2 * inset), Image.Resampling.LANCZOS)
image.alpha_composite(art, ((1024 - art.width) // 2, (1024 - art.height) // 2))
image.convert("RGB").save(icon_dir / "AppIcon-512@2x.png", "PNG")
(icon_dir / "Contents.json").write_text(json.dumps({
    "images": [{"filename": "AppIcon-512@2x.png", "idiom": "universal",
                "platform": "ios", "size": "1024x1024"}],
    "info": {"author": "xcode", "version": 1}
}, indent=2) + "\n")
print("Prepared 1024x1024 Archív iPhone icon from approved gold-brick artwork")
