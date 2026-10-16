# Split the scene photograph into depth layers for the 3D stage.
#
# Every layer is a sheet of the photo that the stage pushes out to its real
# distance (camera projection: seen from where the photo was taken it is the
# photo again, pixel for pixel; seen from anywhere else it has true parallax).
# Layers break where the depth jumps (sky behind ridges, mountains behind the
# forest, the lake behind the rocks and him), and what each nearer layer hides
# is filled in on the layer behind it, so moving the camera never opens a hole.
#
# Usage: python3 layers.py <scene.png> <scene_depth.npy> <fg_alpha.png> <out_dir> <tier: d|m>
import sys, os, json, numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

scene_p, depth_p, fga_p, out, tier = sys.argv[1:6]
scene = cv2.imread(scene_p)                               # 8000x3048 BGR
SH, SW = scene.shape[:2]
d = np.load(depth_p).astype(np.float32)                    # Depth Anything, 2000x762, larger = nearer
fg_alpha = cv2.imread(fga_p, cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255

# Work at a reduced resolution for masks and fills; layers ship at the tier's size.
TIER = {
    # crop in scene px (x0, x1) and output scale of that crop
    'd': {'x': (0, SW), 'scale': 0.512},
    'm': {'x': (2600, 5700), 'scale': 0.55},
    'o': {'x': (0, SW), 'scale': 1.0},          # offline renders: full resolution
}[tier]
x0, x1 = TIER['x']
k = TIER['scale']
img = scene[:, x0:x1]
img = cv2.resize(img, (round((x1 - x0) * k), round(SH * k)), interpolation=cv2.INTER_AREA)
H, W = img.shape[:2]
dd = cv2.resize(d, (SW, SH), interpolation=cv2.INTER_CUBIC)[:, x0:x1]
dd = cv2.resize(dd, (W, H), interpolation=cv2.INTER_AREA)
fga = cv2.resize(fg_alpha[:, x0:x1], (W, H), interpolation=cv2.INTER_AREA)
guide = img.astype(np.float32) / 255

# ---- metric depth: the relative disparity mapped through anchors read off the
# photo (him ~7 m, the far shore ~250 m, the side mountains ~1.5 km, peak and
# sky far away). Monotone, interpolated in log space.
ANCHORS = [(0.0, 9000), (0.14, 4200), (0.66, 1500), (1.1, 600), (1.8, 250), (4.2, 40), (6.5, 15), (9.7, 7), (12.8, 4), (16.5, 2.6)]
ad = np.array([a for a, _ in ANCHORS], np.float32)
az = np.log(np.array([z for _, z in ANCHORS], np.float32))
def metric(v):
    return np.exp(np.interp(v, ad, az)).astype(np.float32)

# ---- layer masks, edges snapped to the photo
def snap(m, r=4, eps=2e-4):
    m = cv2.ximgproc.guidedFilter(guide, m.astype(np.float32), r, eps)
    return np.clip(m, 0, 1)

def band(v, lo, hi, soft=0.04):
    a = np.clip((v - lo) / soft + 0.5, 0, 1) if lo > -1 else np.ones_like(v)
    b = np.clip((hi - v) / soft + 0.5, 0, 1) if hi < 99 else np.ones_like(v)
    return a * b

# nearest first: him and the rock pile (from the swap's own matte), plus the
# rubble at the sides of the frame that is as near
near_rocks = snap(band(dd, 8.6, 99, 0.6), 3, 1e-4)
yy = np.arange(H)[:, None] / H
near_rocks *= (yy > 0.62)
FG = np.maximum(fga, near_rocks)
# the lake, snow banks, forest, dead trees and the right-hand slope (the dead
# trees read a little far, so everything low and not sky belongs here too)
MID_OWN = snap(np.maximum(band(dd, 0.9, 99, 0.12), band(dd, 0.4, 99, 0.1) * (yy > 0.5)))
# the side mountains (and the lower slopes of the peak); thin slivers along the
# right-hand skyline are dropped
FAR_OWN = snap(band(dd, 0.06, 99, 0.05)) * (1 - MID_OWN)
FAR_OWN = cv2.morphologyEx(FAR_OWN.astype(np.float32), cv2.MORPH_OPEN, np.ones((max(3, W // 800),) * 2, np.uint8))
# every layer also carries on behind the nearer ones (filled below), so a
# moving camera sees more of it there instead of a hole
# (coverages add up across a join, so two soft edges never leave a hairline)
MID = np.clip(MID_OWN + FG, 0, 1)
FAR = np.clip(FAR_OWN + MID_OWN + FG, 0, 1)
# sky, cloud and the peak in it: everything that is left, filled everywhere
layers = {'fg': FG, 'mid': MID, 'far': FAR}

# ---- fill what nearer layers hide (colour and depth), so parallax shows the
# right thing behind an edge instead of a hole or a smear of the edge itself
def pushpull(x, valid):
    """smooth fill of the invalid area from the valid one: average down a
    pyramid ignoring holes, then fill each level from the coarser one"""
    x = x.astype(np.float32)
    if x.ndim == 2:
        x = x[..., None]
    w = valid.astype(np.float32)[..., None]
    levels = []
    cx, cw = x * w, w
    while min(cx.shape[:2]) > 4:
        levels.append((cx, cw))
        h2, w2 = (cx.shape[0] + 1) // 2, (cx.shape[1] + 1) // 2
        cx = cv2.resize(cx, (w2, h2), interpolation=cv2.INTER_AREA).reshape(h2, w2, -1)
        cw = cv2.resize(cw, (w2, h2), interpolation=cv2.INTER_AREA).reshape(h2, w2, 1)
    cur = cx / np.maximum(cw, 1e-6)
    for lx, lw in reversed(levels):
        up = cv2.resize(cur, (lx.shape[1], lx.shape[0]), interpolation=cv2.INTER_LINEAR).reshape(lx.shape)
        own = lx / np.maximum(lw, 1e-6)
        a = np.clip(lw * 4, 0, 1)
        cur = own * a + up * (1 - a)
    return cur if cur.shape[2] > 1 else cur[..., 0]

def fill(colour, depth, keep, radius=None):
    keep = np.asarray(keep, np.float32)
    fc = pushpull(colour, keep > 0.5)
    fd = pushpull(depth, keep > 0.5)
    w = np.clip(keep, 0, 1)
    return (colour * w[..., None] + fc * (1 - w[..., None])).clip(0, 255).astype(np.uint8), depth * w + fd * (1 - w)

meta = {'scene': [SW, SH], 'crop': [x0, 0, x1 - x0, SH], 'size': [W, H], 'layers': {}}
z = metric(dd)
# sky and the far peak: one far sheet, depth kept smooth and far
sky_col, sky_z = fill(img, np.maximum(z, 2500), np.maximum(FG, np.maximum(MID_OWN, FAR_OWN)) < 0.5, 20)
sky_z = cv2.GaussianBlur(sky_z, (0, 0), 6)
far_col, far_z = fill(img, z, (np.maximum(FG, MID_OWN)) < 0.5)
mid_col, mid_z = fill(img, z, FG < 0.5)

def bbox(a, pad=8):
    ys, xs = np.where(a > 0.01)
    if not len(xs):
        return [0, 0, W, H]
    return [int(max(0, xs.min() - pad)), int(max(0, ys.min() - pad)), int(min(W, xs.max() + pad)), int(min(H, ys.max() + pad))]

ZMIN, ZMAX = 2.0, 12000.0
def zenc(v):
    return np.clip((np.log(np.maximum(v, ZMIN)) - np.log(ZMIN)) / (np.log(ZMAX) - np.log(ZMIN)), 0, 1)

DW, DH = 1024, round(1024 * H / W)
depth_pack = np.zeros((DH, DW, 4), np.uint8)
for ch, (name, colour, zz, alpha) in enumerate([
    ('sky', sky_col, sky_z, np.ones((H, W), np.float32)),
    ('far', far_col, far_z, FAR),
    ('mid', mid_col, mid_z, MID),
    ('fg', img, z, FG),
]):
    # depth: each layer's own sheet; far edges stretched a little outward so the
    # sheet never folds back at its silhouette
    zz = cv2.resize(zz.astype(np.float32), (DW, DH), interpolation=cv2.INTER_AREA)
    depth_pack[..., ch] = (zenc(zz) * 255 + 0.5).astype(np.uint8)
    bx0, by0, bx1, by1 = bbox(alpha)
    rgba = np.dstack([colour, (alpha * 255 + 0.5).astype(np.uint8)])[by0:by1, bx0:bx1]
    path = os.path.join(out, f'layer-{tier}-{name}')
    im = Image.fromarray(cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA))
    if name == 'sky':
        im = im.convert('RGB')
    if tier == 'o':
        im.save(path + '.png', compress_level=1)   # lossless, for the offline renderer only
    else:
        im.save(path + '.webp', quality=84, method=6)
        im.save(path + '.avif', quality=60, speed=4)
    meta['layers'][name] = {'box': [bx0, by0, bx1 - bx0, by1 - by0]}
    print(name, im.size)

Image.fromarray(depth_pack, 'RGBA').save(os.path.join(out, f'layer-{tier}-depth.png'), optimize=True)
meta['depth'] = {'size': [DW, DH], 'zmin': ZMIN, 'zmax': ZMAX, 'channels': ['sky', 'far', 'mid', 'fg']}
with open(os.path.join(out, f'layers-{tier}.json'), 'w') as f:
    json.dump(meta, f)
print(json.dumps(meta))
