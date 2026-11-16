"""Lay out actual browser screenshots without retouching the characters or item renders.
Run after e2e/hero-clothing.spec.ts. Pillow is also used by the GLB texture packer.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/hero3d-clothing'
ITEMS = ROOT / 'web/public/hero3d/items'
FONT = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')


def font(size):
    return ImageFont.truetype(str(FONT), size) if FONT.exists() else ImageFont.load_default(size=size)


canvas = Image.new('RGB', (1140, 730), '#eee7d8')
draw = ImageDraw.Draw(canvas)
for i, (name, label) in enumerate([
    ('f-average-base', 'Basisavatar'),
    ('f-average-equipped', 'Dezelfde avatar uitgerust'),
    ('f-average-champion', 'Kampioensoutfit'),
]):
    picture = Image.open(OUT / (name + '.png')).convert('RGB')
    picture.thumbnail((350, 520))
    canvas.paste(picture, (i * 380 + (380 - picture.width) // 2, 50))
    draw.text((i * 380 + 20, 15), label, fill='#28382e', font=font(23))
for i, key in enumerate(['crown', 'gold_shoes', 'headphones', 'tracksuit', 'gloves', 'balance_shoes']):
    picture = Image.open(ITEMS / (key + '.png')).convert('RGBA')
    picture.thumbnail((125, 125))
    canvas.paste(picture, (i * 190 + (190 - picture.width) // 2, 580), picture)
draw.text((20, 705), 'Synthetische avatars — echte browserrenders van modelversie 9', fill='#28382e', font=font(17))
canvas.save(OUT / 'overview.png')

files = sorted(ITEMS.glob('*.png'))
canvas = Image.new('RGB', (960, ((len(files) + 5) // 6) * 180), '#eee7d8')
draw = ImageDraw.Draw(canvas)
for i, file in enumerate(files):
    picture = Image.open(file).convert('RGBA')
    picture.thumbnail((150, 150))
    x, y = (i % 6) * 160, (i // 6) * 180
    canvas.paste(picture, (x + (160 - picture.width) // 2, y), picture)
    draw.text((x + 7, y + 155), file.stem, fill='#28382e')
canvas.save(OUT / 'items-overview.png')
