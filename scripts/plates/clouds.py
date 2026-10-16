# Paint soft cloud sheets for the offline renders: billowy fractal noise,
# lit from above (bright tops, blue-grey undersides) in the photo's colours,
# with alpha that thins out at the edges so a sheet never shows a border.
# Usage: python3 clouds.py <out_dir> [count]
import sys, os, numpy as np, cv2
from PIL import Image

out = sys.argv[1]
count = int(sys.argv[2]) if len(sys.argv) > 2 else 4
W, H = 3200, 1100

def noise(rng, w, h, cells):
    g = rng.random((cells[1] + 3, cells[0] + 3)).astype(np.float32)
    big = cv2.resize(g, (w + w // cells[0] * 3, h + h // cells[1] * 3), interpolation=cv2.INTER_CUBIC)
    return big[:h, :w]

def fbm(rng, w, h, base, octaves=6):
    v = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        c = (max(2, int(base[0] * 2 ** o)), max(2, int(base[1] * 2 ** o)))
        v += amp * noise(rng, w, h, c)
        tot += amp
        amp *= 0.5
    return v / tot

LIGHT = np.array([232, 230, 226], np.float32)      # BGR, sunlit tops (cool white)
SHADE = np.array([150, 132, 112], np.float32)      # BGR, blue-grey undersides
for i in range(count):
    rng = np.random.default_rng(100 + i)
    # domain-warped fbm, stretched wide: stringy wisps like the photo's, not blobs
    wx = fbm(rng, W, H, (4, 2), 5) - 0.5
    wy = fbm(rng, W, H, (4, 2), 5) - 0.5
    mx, my = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    n = fbm(rng, W, H, (9, 3), 8)
    n = cv2.remap(n, mx + wx * 420, my + wy * 90, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    fine = fbm(rng, W, H, (40, 14), 4)
    yy = my / H
    xx = mx / W
    # a loose band that wanders across the sheet and fades out at every edge
    centre = 0.5 + (fbm(rng, W, 1, (3, 1), 3)[0][None, :] - 0.5) * 0.5
    env = np.exp(-((yy - centre) / 0.2) ** 2) * np.clip(np.minimum(xx, 1 - xx) / 0.25, 0, 1)
    dens = np.clip((n - 0.62 + env * 0.5) / 0.22, 0, 1) * env
    dens = dens * np.clip(0.55 + (fine - 0.5) * 2.2, 0, 1)      # edges eaten by fine detail
    dens = cv2.GaussianBlur(dens, (0, 0), 2.2)
    # light from above: compare density with the density a little higher up
    up = np.roll(dens, 14, axis=0)
    lit = np.clip(0.6 + (dens - up) * 1.4 + (0.5 - yy) * 0.5, 0, 1)
    col = SHADE + (LIGHT - SHADE) * lit[..., None]
    alpha = np.clip(dens * 0.9, 0, 1)
    rgba = np.dstack([col, alpha * 255]).clip(0, 255).astype(np.uint8)
    Image.fromarray(cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA)).save(os.path.join(out, f'cloud-{i}.png'), compress_level=1)
    print('cloud', i)
