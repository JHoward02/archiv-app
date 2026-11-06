from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent
logo = Image.open(root.parent / 'public/logo4').convert('RGBA')
shelf = logo.crop((0, 0, 760, 724))
shelf.thumbnail((420, 420), Image.Resampling.LANCZOS)
icon = Image.new('RGBA', (512, 512), '#f4efe6')
icon.alpha_composite(shelf, ((512-shelf.width)//2, (512-shelf.height)//2))
(root/'res/drawable').mkdir(exist_ok=True)
icon.save(root/'res/drawable/icon.png')
