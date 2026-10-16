# Distant peaks for the view from the summit, cut from the photo's own range
# plane: their tops as they are, their bases fading out so they rise from the
# sea of cloud. Usage: python3 far_peaks.py <planes_dir>
import sys, os, json, numpy as np
from PIL import Image
d = sys.argv[1]
meta = json.load(open(os.path.join(d, 'planes.json')))
rng = [p for p in meta['planes'] if p['name'] == 'range'][0]
im = np.array(Image.open(os.path.join(d, rng['file'])).convert('RGBA')).astype(np.float32)
bx, by = int(rng['box'][0]), int(rng['box'][1])
for name, (x0, y0, x1, y1, fade) in {'peaks-left': (0, 0, 2800, 1250, 420), 'peaks-right': (4700, 640, 6500, 1450, 300)}.items():
    c = im[y0 - by:y1 - by, x0 - bx:x1 - bx].copy()
    h = c.shape[0]
    f = np.clip((h - np.arange(h)) / fade, 0, 1)[:, None] ** 1.5
    c[..., 3] *= f
    Image.fromarray(c.clip(0, 255).astype(np.uint8), 'RGBA').save(os.path.join(d, name + '.png'), compress_level=1)
    print(name, c.shape)
