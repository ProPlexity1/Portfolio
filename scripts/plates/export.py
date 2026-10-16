# Export the scene plate for the web: a wide plate for landscape screens, a tall
# crop for phones and a full-resolution tile of the peak for the opening close-up.
# All coordinates are scene px (8000x3048). AVIF first, WebP as the fallback.
# Usage: python3 export.py <scene.png> <out_dir>
import sys, os, json
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
src, out = sys.argv[1], sys.argv[2]
scene = Image.open(src).convert('RGB')
W, H = scene.size

PLATES = {
    # name: (crop box in scene px, output width, avif quality)
    'scene-wide': ((0, 0, W, H), 4000, 58),
    'scene-wide-sm': ((0, 0, W, H), 2560, 58),
    'scene-tall': ((3000, 0, 5300, H), 1840, 58),
    'scene-tall-sm': ((3000, 0, 5300, H), 1150, 58),
    'peak': ((3450, 380, 5150, 1700), 1700, 62),
}
meta = {}
for name, (box, w, q) in PLATES.items():
    im = scene.crop(box)
    h = round(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    im.save(os.path.join(out, name + '.avif'), quality=q, speed=4)
    im.save(os.path.join(out, name + '.webp'), quality=82, method=6)
    meta[name] = {'box': box, 'size': [w, h]}
    print(name, im.size, os.path.getsize(os.path.join(out, name + '.avif')) // 1024, 'KB avif',
          os.path.getsize(os.path.join(out, name + '.webp')) // 1024, 'KB webp')
print(json.dumps(meta))
