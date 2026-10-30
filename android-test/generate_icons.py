#!/usr/bin/env python3
"""Crop the distinctive LEGO-filled A from the existing Archív logo."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import sys

source = Image.open(sys.argv[1]).convert("RGBA")
# The A shelf occupies the leftmost ~33% of the complete horizontal wordmark.
width,height = source.size
art = source.crop((0,0,int(width*.34),height))
# Crop only actual artwork when the source has transparency.
alpha=art.getchannel("A")
bbox=alpha.getbbox()
if bbox:
    art=art.crop(bbox)
else:
    art=art.crop((0,0,art.width,art.height))
# Crop from the left of the original logo without creating a new illustrated A.
for size,folder in [(48,"mdpi"),(72,"hdpi"),(96,"xhdpi"),(144,"xxhdpi"),(192,"xxxhdpi")]:
    base=Image.new("RGBA",(size,size),(244,239,230,255))
    inset=int(size*.08)
    thumb=art.copy()
    thumb.thumbnail((size-2*inset,size-2*inset),Image.Resampling.LANCZOS)
    base.alpha_composite(thumb,((size-thumb.width)//2,(size-thumb.height)//2))
    output=Path("app/src/main/res/mipmap-"+folder)
    output.mkdir(parents=True,exist_ok=True)
    base.save(output/"ic_launcher.png")
    base.save(output/"ic_launcher_round.png")
print("Generated launcher icons from the existing Archív artwork")
