# Render one parallax camera move through a real photo to frames.
# Usage: python3 shot.py <shot.json> <out_dir> [every_nth]
#   shot.json: { image, depth, anchors: [[disparity, metres]...], cuts: [metres, far..near],
#                vfov (deg, photo's long... vertical side), size: [w, h], scale (out px per src px),
#                center: [x, y] (src px the neutral camera looks at), frames,
#                keys: [{t, pos, yaw, pitch, roll, zoom}], jump? }
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from parallax import anchors_to_z, build, render

cfg = json.load(open(sys.argv[1]))
out = sys.argv[2]
nth = int(sys.argv[3]) if len(sys.argv) > 3 else 1
os.makedirs(out, exist_ok=True)
img = cv2.imread(cfg['image'])
H, W = img.shape[:2]
d = cv2.resize(np.load(cfg['depth']).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
# the depth model softens object edges into ramps, and a ramp across a big depth
# step maps to points floating in mid-air: snap the depth to the photo's own edges
if cfg.get('wmf'):
    q = 2
    g = cv2.resize(img, (W // q, H // q), interpolation=cv2.INTER_AREA)
    ds = cv2.resize(d, (W // q, H // q), interpolation=cv2.INTER_AREA)
    ds = cv2.ximgproc.weightedMedianFilter(g, ds, cfg['wmf'], 25)
    # what is left of a ramp goes to whichever side it is nearer
    k = np.ones((7, 7), np.uint8)
    lo_, hi_ = cv2.erode(ds, k), cv2.dilate(ds, k)
    big = (hi_ - lo_) > 0.25 * np.maximum(hi_, 0.3)
    ds = np.where(big, np.where(ds - lo_ < hi_ - ds, lo_, hi_), ds)
    d = cv2.resize(ds, (W, H), interpolation=cv2.INTER_LINEAR)
# a person mask (from parse.py on a crop) is set to one depth, so the figure moves whole
for fx in cfg.get('fix', []):
    m = np.load(fx['mask']).astype(np.float32)
    m = np.clip((m - 0.15) / 0.3, 0, 1)
    # take in the whole rim (face, hands, soles) the parser leaves soft
    g = fx.get('grow', 7)
    m = cv2.GaussianBlur(cv2.dilate(m, np.ones((g, g), np.uint8)), (0, 0), 1.5)
    x0, y0 = fx['origin']
    sub = d[y0:y0 + m.shape[0], x0:x0 + m.shape[1]]
    sub[:] = sub * (1 - m) + fx['disparity'] * m
Z = anchors_to_z(d, cfg['anchors'])
layers = build(img, Z, cfg['cuts'], margin=cfg.get("margin", 0.2))
print('layers', [round(z, 1) for _, z, _ in layers])
f = (H / 2) / np.tan(np.radians(cfg['vfov'] / 2))
K = np.array([[f, 0, W / 2], [0, f, H / 2], [0, 0, 1]])

def ease(t):
    return t * t * (3 - 2 * t)

keys = cfg['keys']
def pose_at(t):
    for a, b in zip(keys, keys[1:]):
        if t <= b['t']:
            u = ease((t - a['t']) / max(b['t'] - a['t'], 1e-9))
            p = {}
            for k in ('yaw', 'pitch', 'roll', 'zoom'):
                p[k] = a.get(k, 1 if k == 'zoom' else 0) * (1 - u) + b.get(k, 1 if k == 'zoom' else 0) * u
            p['pos'] = [x * (1 - u) + y * u for x, y in zip(a.get('pos', [0, 0, 0]), b.get('pos', [0, 0, 0]))]
            return p
    return dict(keys[-1])

n = cfg['frames']
for i in range(0, n, nth):
    p = pose_at(i / (n - 1))
    p['scale'] = cfg['scale']
    fr = render(layers, K, p, tuple(cfg['size']), center=cfg.get('center'))
    cv2.imwrite(os.path.join(out, f'{i:04d}.jpg'), (fr * 255 + 0.5).clip(0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
print('done', n)
