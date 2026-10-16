# Cut the scene photograph into a multiplane stack for the offline renders.
#
# Like a multiplane animation camera: the photo is sliced by distance into flat
# image planes (sky and peak, the far range, the side mountains, the forest,
# bands of lake and snow, the rocks and him), each set at its real distance and
# scaled so that from the photo's own viewpoint the stack is the photo again.
# Moving the camera through the stack gives true parallax between the planes,
# and flat planes never streak. Every plane also carries on behind the nearer
# ones (filled smoothly), so parallax never opens a hole.
#
# Usage: python3 planes.py <scene.png> <scene_depth.npy> <fg_alpha.png> <out_dir>
import sys, os, json, numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
sys.path.insert(0, os.path.dirname(__file__))

scene_p, depth_p, fga_p, out = sys.argv[1:5]
img = cv2.imread(scene_p)                                   # 8000x3048
H, W = img.shape[:2]
d = cv2.resize(np.load(depth_p).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
fga = cv2.imread(fga_p, cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255
guide = cv2.resize(img, (W // 2, H // 2), interpolation=cv2.INTER_AREA).astype(np.float32) / 255

# metric depth from the relative disparity (anchors read off the photo)
ANCHORS = [(0.0, 9000), (0.14, 4200), (0.66, 1500), (1.1, 600), (1.8, 250), (4.2, 40), (6.5, 15), (9.7, 7), (12.8, 4), (16.5, 2.6)]
ad = np.array([a for a, _ in ANCHORS], np.float32)
az = np.log(np.array([z for _, z in ANCHORS], np.float32))
Z = np.exp(np.interp(d, ad, az)).astype(np.float32)
lz = np.log(Z)
yy = np.arange(H)[:, None] / H

# slice boundaries in metres, far to near; the last plane is him and his rocks
CUTS = [5000, 2200, 1100, 520, 260, 120, 60, 30, 15]
NAMES = ['sky', 'range', 'mountains', 'slopes', 'forest', 'shore', 'lake', 'banks', 'near', 'close', 'rocks']

def snap(m):
    small = cv2.resize(m.astype(np.float32), (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    small = cv2.ximgproc.guidedFilter(guide, small, 3, 3e-4)
    return np.clip(cv2.resize(small, (W, H), interpolation=cv2.INTER_LINEAR), 0, 1)

def above(z0, soft=0.12):
    """1 where farther than z0 (soft in log metres)"""
    return np.clip((lz - np.log(z0)) / soft + 0.5, 0, 1)

# the rocks plane: his own matte plus the rubble as near as he is
rocks = np.maximum(fga, snap(np.clip((Z < 8.5) * (yy > 0.6), 0, 1)))
# far to near: farther than the first cut, then each band between two cuts,
# then nearer than the last cut, then the rocks and him
F = [snap(above(c)) for c in CUTS]                       # "farther than cut k"
own = [F[0]]
for k in range(1, len(CUTS)):
    own.append(np.clip(F[k] - F[k - 1], 0, 1))
own.append(np.clip(1 - F[-1], 0, 1))
own = [o * (1 - rocks) for o in own] + [rocks]
# drop thin slivers (a ridge line one plane catches from its neighbour) back
# into the plane behind
op = np.ones((9, 9), np.uint8)
for k in range(len(own) - 1, 0, -1):
    kept = cv2.morphologyEx(own[k].astype(np.float32), cv2.MORPH_OPEN, op)
    own[k - 1] = own[k - 1] + (own[k] - kept)
    own[k] = kept

def pushpull(x, valid):
    x = x.astype(np.float32)
    w = valid.astype(np.float32)[..., None]
    levels = []
    cx, cw = x * w, w
    while max(cx.shape[:2]) > 1:
        levels.append((cx, cw))
        h2, w2 = max(1, (cx.shape[0] + 1) // 2), max(1, (cx.shape[1] + 1) // 2)
        cx = cv2.resize(cx, (w2, h2), interpolation=cv2.INTER_AREA).reshape(h2, w2, -1)
        cw = cv2.resize(cw, (w2, h2), interpolation=cv2.INTER_AREA).reshape(h2, w2, 1)
    mean = (x * w).reshape(-1, x.shape[2]).sum(0) / max(float(w.sum()), 1e-6)
    cur = np.where(cw > 1e-6, cx / np.maximum(cw, 1e-6), mean)
    for lx, lw in reversed(levels):
        up = cv2.resize(cur, (lx.shape[1], lx.shape[0]), interpolation=cv2.INTER_LINEAR).reshape(lx.shape)
        a = np.clip(lw * 4, 0, 1)
        cur = (lx / np.maximum(lw, 1e-6)) * a + up * (1 - a)
    return cur

def mirror_down(src, valid, fallback, max_run=900):
    h, w = valid.shape
    rows = np.arange(h)[:, None]
    # last valid row at or above each pixel, per column
    last = np.where(valid, rows, -1)
    last = np.maximum.accumulate(last, axis=0)
    srcy = 2 * last - rows
    ok = (last >= 0) & (srcy >= 0) & (rows - last < max_run) & ~valid
    srcy = np.clip(srcy, 0, h - 1)
    cols = np.broadcast_to(np.arange(w)[None], (h, w))
    ok &= valid[srcy, cols]
    out = fallback.copy()
    m = cv2.remap(src.astype(np.float32), cols.astype(np.float32), srcy.astype(np.float32), cv2.INTER_LINEAR)
    # soften with distance from the edge, so the mirror reads as more of the same, not a reflection
    dist = np.clip((rows - last) / max_run, 0, 1)
    blur = cv2.GaussianBlur(m, (0, 0), 6)
    m = m * (1 - dist[..., None]) + blur * dist[..., None]
    out[ok] = m[ok]
    mirror_down.reached = ok
    return out

# the sky plane gets a margin of filled sky all round, so a tilted or moved
# camera never runs off its edge
PAD = (3600, 3600)   # x, y in scene px
SKY_SCALE = 0.4      # the sky is soft: stored smaller, within texture limits
meta = {'scene': [W, H], 'focal': 3268, 'principal': [4000, 1524], 'planes': []}
n = len(own)
for i, name in enumerate(NAMES):
    a_own = own[i]
    nearer = np.clip(sum(own[i + 1:]), 0, 1) if i + 1 < n else np.zeros_like(a_own)
    alpha = np.clip(a_own + nearer, 0, 1) if i + 1 < n else a_own
    if i == 0:
        alpha = np.ones_like(a_own)
    # colour: the plane's own pixels, the rest filled from them
    q = 4
    small = cv2.resize(img, (W // q, H // q), interpolation=cv2.INTER_AREA).astype(np.float32)
    valid = cv2.resize(a_own, (W // q, H // q), interpolation=cv2.INTER_AREA) > 0.5
    smooth_fill = cv2.resize(pushpull(small, valid), (W, H), interpolation=cv2.INTER_CUBIC)
    # below a plane's own edge, continue its own picture by mirroring it
    # downward (mountains keep going down, forest stays forest) instead of a
    # flat average; the smooth fill only covers what a mirror cannot reach
    filled = mirror_down(img, a_own > 0.5, smooth_fill)
    # what the mirror could not reach (notches like the one behind him, inside
    # a lake band) is painted in from its sides at quarter size
    reached = (a_own > 0.5) | mirror_down.reached
    holes = (~reached).astype(np.uint8)
    hq = cv2.resize(holes, (W // q, H // q), interpolation=cv2.INTER_NEAREST)
    fq = cv2.resize(filled, (W // q, H // q), interpolation=cv2.INTER_AREA).clip(0, 255).astype(np.uint8)
    # only notches matter (bounded on both sides by the plane itself)
    tq = cv2.inpaint(fq, hq * 255, 9, cv2.INPAINT_TELEA)
    tq = cv2.resize(tq, (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    rows_own = (a_own > 0.5).any(axis=1)
    band = np.zeros((H, 1), bool)
    if rows_own.any():
        r0, r1 = np.where(rows_own)[0][[0, -1]]
        band[r0:r1 + 1] = True
    use = (holes > 0) & band
    filled[use] = tq[use]
    keep = np.clip(a_own * 1.5, 0, 1)[..., None]
    colour = (img * keep + filled * (1 - keep)).clip(0, 255).astype(np.uint8)
    if i == 0:
        # the photo's top sky turns gritty when the camera looks up into it:
        # soften it progressively toward the top
        soft = cv2.GaussianBlur(colour, (0, 0), 14).astype(np.float32)
        t = np.clip(1 - np.arange(H)[:, None, None] / 1100.0, 0, 1) ** 1.2
        colour = (colour * (1 - t) + soft * t).astype(np.uint8)
    # plane distance: the median of its own pixels (sky: far)
    sel = a_own > 0.5
    z = float(np.median(Z[sel])) if sel.any() else 9000.0
    if i == 0:
        z = 9000.0
        # (1) the backdrop: the sky extended all round with mirrored, heavily
        # blurred sky darkening to deep teal at the top, stored small, a little
        # farther than the sky so it only shows past the sky plane's edges
        px, py = PAD
        ext = cv2.copyMakeBorder(colour, py, 0, px, px, cv2.BORDER_REFLECT)
        blur = cv2.GaussianBlur(ext, (0, 0), 60)
        m = np.ones(ext.shape[:2], np.float32)
        m[py:, px:px + W] = 0
        m = cv2.GaussianBlur(m, (0, 0), 80)[..., None]
        top = np.clip(1 - np.arange(ext.shape[0])[:, None] / (py + 600), 0, 1)[..., None]
        ink = np.array([46, 52, 22], np.float32)          # deep teal (BGR) the photo's sky darkens to
        blur = blur * (1 - 0.6 * top) + ink * 0.6 * top
        ext = (ext * (1 - m) + blur * m).astype(np.uint8)
        ext = cv2.resize(ext, (round(ext.shape[1] * SKY_SCALE), round(ext.shape[0] * SKY_SCALE)), interpolation=cv2.INTER_AREA)
        bz = 9500.0
        k_ = bz / z                                        # same view from the photo's viewpoint
        bbox = [4000 + (-px - 4000) * k_, 1524 + (-py - 1524) * k_, (W + 2 * px) * k_, (H + py) * k_]
        rgba = np.dstack([ext, np.full(ext.shape[:2], 255, np.uint8)])
        Image.fromarray(cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA)).save(os.path.join(out, 'plane-backdrop.png'), compress_level=1)
        meta['planes'].append({'name': 'backdrop', 'file': 'plane-backdrop.png', 'box': [round(v, 1) for v in bbox], 'z': bz})
        # (2) the sky and peak at full resolution, melting into the backdrop at its edges
        e = 260
        xs_ = np.minimum(np.arange(W), W - 1 - np.arange(W)) / e
        ys_ = np.arange(H) / e
        alpha = (np.clip(xs_, 0, 1)[None, :] * np.clip(ys_, 0, 1)[:, None]).astype(np.float32)
        box = [0, 0, W, H]
    else:
        ys, xs = np.where(alpha > 0.01)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        colour, alpha = colour[y0:y1, x0:x1], alpha[y0:y1, x0:x1]
        box = [x0, y0, x1 - x0, y1 - y0]
    rgba = np.dstack([colour, (alpha * 255 + 0.5).astype(np.uint8)])
    Image.fromarray(cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA)).save(os.path.join(out, f'plane-{i:02d}-{name}.png'), compress_level=1)
    meta['planes'].append({'name': name, 'file': f'plane-{i:02d}-{name}.png', 'box': box, 'z': round(z, 2)})
    print(i, name, box, round(z, 1))

with open(os.path.join(out, 'planes.json'), 'w') as f:
    json.dump(meta, f, indent=1)
