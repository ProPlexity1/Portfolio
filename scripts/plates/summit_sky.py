# Textures for the view from the summit (the opening): a sea of cloud seen from
# above, laid flat below the summit, and a distant sky dome made from the
# photo's own upper sky (teal, darkening upward).
# Usage: python3 summit_sky.py <scene.png> <out_dir>
import sys, os, numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

scene = cv2.imread(sys.argv[1])
out = sys.argv[2]

def fbm(rng, w, h, base, octaves):
    v = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        cx, cy = max(2, int(base[0] * 2 ** o)), max(2, int(base[1] * 2 ** o))
        g = rng.random((cy + 3, cx + 3)).astype(np.float32)
        big = cv2.resize(g, (w + w // cx * 3, h + h // cy * 3), interpolation=cv2.INTER_CUBIC)[:h, :w]
        v += amp * big
        tot += amp
        amp *= 0.5
    return v / tot

# ---- cloud sea: a carpet of billows, tileable enough when mirrored
rng = np.random.default_rng(11)
W, H = 4096, 4096
n = fbm(rng, W, H, (6, 6), 8)
warp = fbm(rng, W, H, (3, 3), 4) - 0.5
mx, my = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
n = cv2.remap(n, mx + warp * 300, my + warp * 300, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
dens = np.clip((n - 0.36) / 0.3, 0, 1)
dens = cv2.GaussianBlur(dens, (0, 0), 2.5)
# light from above and a little from the far side: tops bright, folds shaded
gy = cv2.Sobel(dens, cv2.CV_32F, 0, 1, ksize=5)
gx = cv2.Sobel(dens, cv2.CV_32F, 1, 0, ksize=5)
lit = np.clip(0.72 + 0.35 * dens - 0.012 * gy - 0.004 * gx, 0, 1)
LIGHT = np.array([236, 234, 230], np.float32)    # BGR
SHADE = np.array([146, 128, 104], np.float32)
col = SHADE + (LIGHT - SHADE) * lit[..., None]
# gaps in the sea show a dark blue-grey valley far below
gap = np.array([92, 80, 58], np.float32)
col = col * dens[..., None] + gap * (1 - dens[..., None])
cv2.imwrite(os.path.join(out, 'cloudsea.png'), col.clip(0, 255).astype(np.uint8))

# ---- sky dome: pale cloud at the horizon rising to the photo's deep teal,
# with the photo's own soft cloud texture (from the sky above the peak) laid in
rows = 2048
t = (np.arange(rows, dtype=np.float32) / (rows - 1))[:, None, None]       # 0 top .. 1 horizon
ink = np.array([62, 66, 30], np.float32)          # BGR deep teal
haze = np.array([214, 210, 200], np.float32)      # BGR pale cloud
grad = ink + (haze - ink) * (t ** 1.8)
dome = np.repeat(grad, 4096, axis=1)
cloud = scene[60:560, 2600:5400].astype(np.float32)                         # cloud above the peak
cloud = cv2.resize(cloud, (4096, 900), interpolation=cv2.INTER_CUBIC)
cloud = cv2.GaussianBlur(cloud, (0, 0), 6)
lum = cloud.mean(2, keepdims=True) / 255
y0 = rows - 900
mix = np.clip((np.arange(900)[:, None, None] / 900) * 1.4, 0, 1) * 0.55
dome[y0:] = dome[y0:] * (1 - mix) + (dome[y0:] * (0.55 + 0.7 * lum)) * mix
cv2.imwrite(os.path.join(out, 'skydome.png'), dome.clip(0, 255).astype(np.uint8))
print('ok')
