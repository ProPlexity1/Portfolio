# Build the wide ending plate: the real portrait in the middle, the panorama's
# scenery (never its figure) widening it, both lined up on the mountains.
# Coordinates: "p" = the portrait at 750x1000. The master canvas is K x p,
# offset so the panorama's full width fits.
import sys, numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
R = 'design/reference/'
OUT = sys.argv[1]   # argv[2]: panorama depth (design/plates/pano-depth.png, from depth.py)
K = 4                       # master px per p-px
X0, Y0, X1, Y1 = -600, -60, 1350, 1000
W, H = (X1 - X0) * K, (Y1 - Y0) * K

# portrait (750 scale) -> panorama (2000 scale), found with SIFT on the mountains
M = np.array([[1.09809313e+00, 4.01841550e-02, 6.37940015e+02],
              [-4.01841550e-02, 1.09809313e+00, -5.69085816e+01]])
A = np.vstack([M, [0, 0, 1]])
Ainv = np.linalg.inv(A)
def to_master(T):  # T maps source px -> p coords (3x3); returns source px -> master
    S = np.array([[K, 0, -X0 * K], [0, K, -Y0 * K], [0, 0, 1]], float)
    return (S @ T)[:2]

pano = cv2.cvtColor(np.array(Image.open(R + 'panorama-upscaled-8000x3048.webp').convert('RGB')), cv2.COLOR_RGB2BGR)
Tp = Ainv @ np.diag([0.25, 0.25, 1])          # pano8000 px -> pano2000 -> p
pw = cv2.warpAffine(pano, to_master(Tp), (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT)
pm = cv2.warpAffine(np.full(pano.shape[:2], 255, np.uint8), to_master(Tp), (W, H), flags=cv2.INTER_LINEAR)
del pano

por = cv2.cvtColor(np.array(Image.open(R + 'portrait-upscaled-6000x8000.webp').convert('RGB')), cv2.COLOR_RGB2BGR)
Tr = np.diag([0.125, 0.125, 1])               # portrait6000 px -> p
rw = cv2.warpAffine(por, to_master(Tr), (W, H), flags=cv2.INTER_AREA)
rm = cv2.warpAffine(np.full(por.shape[:2], 255, np.uint8), to_master(Tr), (W, H), flags=cv2.INTER_NEAREST)
del por

# The panorama was re-composed, not just extended: its right-hand mountain is
# smaller and lower than the portrait's. Its right side is scaled up about the
# far shore (that mountain is nearer than the peak), then each column slides
# vertically so the ridge continues the portrait's ridge and the shore meets the
# portrait's lake. Columns move only up/down, so trees and rocks stay upright.
SCALE, ANCHOR_SRC, ANCHOR_DST = 1.6, (750, 472), (750, 495)
def lines(img, valid):
    """ridge (sky->rock) and far-shore rows per p column, measured from the image"""
    sm = cv2.resize(img, (W // K, H // K), interpolation=cv2.INTER_AREA).astype(int)
    v = cv2.resize(valid, (W // K, H // K), interpolation=cv2.INTER_AREA) > 250
    lum = sm.mean(2).astype(np.float32)
    # sky is smooth, rock is textured: local contrast finds the ridge
    mu = cv2.blur(lum, (5, 5))
    tex = np.sqrt(np.maximum(cv2.blur(lum * lum, (5, 5)) - mu * mu, 0))
    lake = (sm[..., 0] - sm[..., 2] > 40) & (sm[..., 1] - sm[..., 2] > 30) & v
    ridge, shore = np.full(sm.shape[1], np.nan), np.full(sm.shape[1], np.nan)
    for x in range(sm.shape[1]):
        col = np.where(v[:, x] & (tex[:, x] > 9) & (lum[:, x] < 170))[0]
        col = col[col > 5]
        if not len(col): continue
        ridge[x] = col[0] + Y0
        ly = np.where(lake[:, x])[0]
        ly = ly[ly > col[0] + 60]
        if len(ly): shore[x] = ly[0] + Y0
    return ridge, shore

S2 = np.array([[SCALE, 0, ANCHOR_DST[0] - SCALE * ANCHOR_SRC[0]], [0, SCALE, ANCHOR_DST[1] - SCALE * ANCHOR_SRC[1]], [0, 0, 1]])
pano = cv2.cvtColor(np.array(Image.open(R + 'panorama-upscaled-8000x3048.webp').convert('RGB')), cv2.COLOR_RGB2BGR)
rw_ = cv2.warpAffine(pano, to_master(S2 @ Tp), (W, H), flags=cv2.INTER_LANCZOS4)
rmk = cv2.warpAffine(np.full(pano.shape[:2], 255, np.uint8), to_master(S2 @ Tp), (W, H), flags=cv2.INTER_LINEAR)
del pano
ridge, shore = lines(rw_, rmk)
xs = np.arange(W // K) + X0
def smooth(a, lo, hi):
    ok = ~np.isnan(a) & (xs >= lo) & (xs <= hi)
    f = np.interp(xs, xs[ok], a[ok])
    return cv2.GaussianBlur(f[None].astype(np.float32), (0, 0), 12)[0]
sr = smooth(ridge, 760, 1300)
ss = smooth(shore, 760, 1300)
tr = 210 - 0.77 * (xs - 750)
tr = np.maximum(tr, sr - 260)            # never stretch more than needed
ts = np.full_like(xs, 495.0)
xm = np.arange(W) / K + X0
srm, ssm, trm, tsm = (np.interp(xm, xs, a) for a in (sr, ss, tr, ts))
ys = np.arange(H)[:, None] / K + Y0
src = np.where(ys < trm, ys + (srm - trm),
      np.where(ys > tsm, ys + (ssm - tsm), srm + (ys - trm) * (ssm - srm) / np.maximum(tsm - trm, 1)))
mapy = ((src - Y0) * K).astype(np.float32)
mapx = np.broadcast_to(np.arange(W, dtype=np.float32)[None], (H, W)).copy()
pd = np.load(sys.argv[2]) if sys.argv[2].endswith('.npy') else cv2.imread(sys.argv[2], cv2.IMREAD_UNCHANGED).astype(np.float32)  # panorama depth, 2000 px wide
pd = ((pd - pd.min()) / (pd.max() - pd.min())).astype(np.float32)
rd = cv2.remap(cv2.warpAffine(pd, to_master(S2 @ Ainv), (W, H), flags=cv2.INTER_LINEAR), mapx, mapy, cv2.INTER_LINEAR)
rw_ = cv2.remap(rw_, mapx, mapy, cv2.INTER_LANCZOS4)
rmk = cv2.remap(rmk, mapx, mapy, cv2.INTER_LINEAR)
# use the scaled panel right of the portrait, the plain panorama on the left
side = np.clip((xm - 560) / 60, 0, 1)[None]   # fully scaled before the portrait's edge fades
pw = (rw_ * side[..., None] + pw * (1 - side[..., None])).astype(np.uint8)
pm = (rmk * side + pm * (1 - side)).astype(np.uint8)
ys_p = np.arange(H)[:, None] / K + Y0
xs_p = np.arange(W)[None] / K + X0
rocks_r = np.clip((rd - 0.45) / 0.1, 0, 1) * (rmk > 250) * (ys_p > 600) * np.clip((xs_p - 690) / 60, 0, 1)
del rw_, rmk, rd

# Left: the panorama's far shore lines up with the portrait's (y~455), but its
# lake and foreground are drawn smaller. Below the shore, scale it up about the
# shore so the boulders come forward. Its near boulders (by depth) are laid over
# the portrait's open water at the seam, like a real foreground.
L_SCALE, L_SHORE = 1.6, 455
SL = np.array([[L_SCALE, 0, 0], [0, L_SCALE, L_SHORE * (1 - L_SCALE)], [0, 0, 1]])
pano = cv2.cvtColor(np.array(Image.open(R + 'panorama-upscaled-8000x3048.webp').convert('RGB')), cv2.COLOR_RGB2BGR)
lw = cv2.warpAffine(pano, to_master(SL @ Tp), (W, H), flags=cv2.INTER_LANCZOS4)
lm = cv2.warpAffine(np.full(pano.shape[:2], 255, np.uint8), to_master(SL @ Tp), (W, H), flags=cv2.INTER_LINEAR)
del pano
ld = cv2.warpAffine(pd, to_master(SL @ Ainv), (W, H), flags=cv2.INTER_LINEAR)
below = np.clip((ys_p - L_SHORE) / 12, 0, 1) * (xs_p < 120)
pw = (lw * below[..., None] + pw * (1 - below[..., None])).astype(np.uint8)
pm = (lm * below + pm * (1 - below)).astype(np.uint8)
rocks = np.clip((ld - 0.45) / 0.1, 0, 1) * (lm > 250) * (ys_p > 520) * np.clip((170 - xs_p) / 90, 0, 1)
rocks = cv2.GaussianBlur(np.maximum(rocks, rocks_r).astype(np.float32), (0, 0), 1.2)
del lw, lm, ld

# match the panorama's grade to the portrait where they overlap (mountains band)
band = (pm > 250) & (rm > 0)
band[: int((60 - Y0) * K)] = False
band[int((330 - Y0) * K):] = False
pf = pw.astype(np.float32)
for c in range(3):
    a, b = pf[..., c][band], rw[..., c][band].astype(np.float32)
    pf[..., c] = (pf[..., c] - a.mean()) * (b.std() / a.std()) + b.mean()
# the portrait's sky is darker towards the top: match brightness (not colour)
# row by row in the sky only, measured just inside each seam
def sky_gain(x0, x1):
    c0, c1 = (x0 - X0) * K, (x1 - X0) * K
    ok = (pm[:, c0:c1] > 250) & (rm[:, c0:c1] > 0)
    a = np.where(ok, pf[:, c0:c1].mean(2), 0).sum(1)
    b = np.where(ok, rw[:, c0:c1].astype(np.float32).mean(2), 0).sum(1)
    n, idx = ok.sum(1), np.arange(H)
    good = (n > 20) & (idx / K + Y0 < 300)
    r = np.where(good, (b + 1) / (a + 1), np.nan)
    r = np.interp(idx, idx[good], r[good]) if good.any() else np.ones(H)
    r = cv2.GaussianBlur(r[None].astype(np.float32), (0, 0), 25 * K)[0]
    fade = np.clip((380 - (idx / K + Y0)) / 80, 0, 1)        # sky rows only
    return 1 + (np.clip(r, 0.7, 1.3) - 1) * fade
gl, gr = sky_gain(8, 50), sky_gain(700, 742)
t = np.clip(xs_p / 750, 0, 1)
pf = pf * (gl[:, None] * (1 - t) + gr[:, None] * t)[..., None]
pw = np.clip(pf, 0, 255).astype(np.uint8); del pf

# portrait weight: the portrait is the rectangle 0..750 x 0..1000 in p.
# Narrow fade on the left and upper right, wide where snow and lake meet low on
# the right.
def ss(v):
    v = np.clip(v, 0, 1)
    return v * v * (3 - 2 * v)
sky = np.clip((300 - ys_p) / 100, 0, 1)                    # 1 in the sky
FR = 70 + 110 * np.clip((ys_p - 520) / 120, 0, 1) + 130 * sky
FL = 70 + 130 * sky
w = ss(xs_p / FL) * ss((750 - xs_p) / FR) * (ys_p >= 0) * (ys_p <= 1000)
w = w.astype(np.float32)
inrect = ((xs_p >= 0) & (xs_p <= 750) & (ys_p >= 0) & (ys_p <= 1000)).astype(np.float32)
w = np.maximum(w, (1 - pm / 255.0) * inrect).astype(np.float32)   # no panorama there: portrait in full
w = w * (1 - rocks * (pm / 255.0))
out = (rw * w[..., None] + pw * (1 - w[..., None])).astype(np.uint8)
cover = (inrect > 0) | (pm > 250)

# Fill what neither photo covers: a thin strip of sky at the top corners and
# the ground at the bottom corners. Mirror the nearest real rows into the gap;
# sky is blurred smooth, the ground is darkened and softened like rubble just
# in front of the lens.
cover = cv2.erode(cover.astype(np.uint8), np.ones((25, 25))) > 0
first = np.argmax(cover, 0)
last = H - 1 - np.argmax(cover[::-1], 0)
rows = np.arange(H)[:, None]
srcy = np.where(rows < first, 2 * first - rows, np.where(rows > last, 2 * last - rows, rows))
srcy = np.clip(srcy, 0, H - 1).astype(np.float32)
mx = np.broadcast_to(np.arange(W, dtype=np.float32)[None], (H, W)).copy()
fill = cv2.remap(out, mx, srcy, cv2.INTER_LINEAR)
sky = cv2.GaussianBlur(fill, (0, 0), 18)
ground = cv2.GaussianBlur(fill, (0, 0), 7)
depth_below = np.clip((rows - last) / (30.0 * K), 0, 1)
ground = (ground * (1 - 0.6 * depth_below[..., None])).astype(np.uint8)
gap = (~cover)[..., None]
top = (rows < first)[..., None]
filled = np.where(top, sky, ground)
soft = cv2.GaussianBlur(gap.astype(np.float32)[..., 0], (0, 0), 6)[..., None]
out = (out * (1 - soft) + filled * soft).astype(np.uint8)

# one grade over everything: a gentle darkening toward the top, like the
# portrait's own sky, so the widened plate reads as one photograph
yy = np.arange(out.shape[0])[:, None, None] / K + Y0
out = (out * (0.78 + 0.22 * np.clip(yy / 320, 0, 1))).astype(np.uint8)

# final canvas: the portrait's full height at 16:10, with room to look around
CX0, CY0, CX1, CY1 = -440, 0, 1190, 1000
out = out[(CY0 - Y0) * K:(CY1 - Y0) * K, (CX0 - X0) * K:(CX1 - X0) * K]
cv2.imwrite(OUT, out)
print(out.shape)
