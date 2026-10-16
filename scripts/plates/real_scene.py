# Build the end plate from the real landscape photo (same lake, same rock):
# grade it to the portrait's look, remove the person standing on the rock and
# stand the real climber from the portrait there at the same height.
# Usage: python3 real_scene.py design/reference/real-landscape.jpg <land_depth.npy>
#        design/reference/original-portrait.webp design/plates/portrait-low-depth.npy <out.png>
# (land depth: design/plates/real-landscape-depth.npy)
import sys, numpy as np, cv2
from PIL import Image

land = cv2.imread(sys.argv[1]).astype(np.float32) / 255
ld = np.load(sys.argv[2]).astype(np.float32)
por = cv2.cvtColor(np.array(Image.open(sys.argv[3]).convert('RGB')), cv2.COLOR_RGB2BGR).astype(np.float32) / 255
pd = np.load(sys.argv[4]).astype(np.float32)        # depth of portrait rows 700..2000
H, W = land.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]

# ---- grade: move the landscape's colour statistics (Lab) toward the portrait's
def lab(img): return cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
L, P = lab(land), lab(por)
STRENGTH = 0.8
for c in range(3):
    m1, s1 = L[..., c].mean(), L[..., c].std()
    m2, s2 = P[..., c].mean(), P[..., c].std()
    t = (L[..., c] - m1) * (s2 / s1) + m2
    L[..., c] = L[..., c] * (1 - STRENGTH) + t * STRENGTH
land = np.clip(cv2.cvtColor(L, cv2.COLOR_LAB2BGR), 0, 1)

# ---- remove the person on the rock (depth, legs kept to the narrow band above the rock)
person = (ld > 6.5) & (xx > 970) & (xx < 1220) & (yy > 700) & (yy < 1305)
person &= (yy < 1110) | ((xx > 1020) & (xx < 1180))
person = cv2.dilate(person.astype(np.uint8), np.ones((15, 15)))

# ---- the real climber, figure only (depth), boots fading into this rock
low = por[700:]
fy = np.arange(low.shape[0])[:, None] + 700
a = np.clip((pd - 6.0) / 0.6, 0, 1) * np.clip((1850 - fy) / 30, 0, 1)
a = cv2.ximgproc.guidedFilter(low, a.astype(np.float32), 3, 4e-5)
a = np.clip((a - 0.55) * 3.0 + 0.5, 0, 1)
solid = (a > 0.97).astype(np.float32)
den = cv2.GaussianBlur(solid, (0, 0), 3)[..., None]
inner = cv2.GaussianBlur(low * solid[..., None], (0, 0), 3) / np.maximum(den, 1e-4)
k = np.clip((0.97 - a) / 0.5, 0, 1)[..., None] * (den > 0.02)
low = low * (1 - k) + inner * k

HEAD_P, BOOT_P, CX_P = 934, 1840, 760          # portrait: head top, boot soles, figure centre x
HEAD_L, BOOT_L, CX_L = 730, 1295, 1110         # landscape: where the person stood
s = (BOOT_L - HEAD_L) * 0.99 / (BOOT_P - HEAD_P)  # same height as the person who stood there
M = np.float32([[s, 0, CX_L - s * CX_P], [0, s, BOOT_L - s * BOOT_P + s * 700]])
fg = cv2.warpAffine(low, M, (W, H), flags=cv2.INTER_AREA)
fa = cv2.warpAffine(a.astype(np.float32), M, (W, H), flags=cv2.INTER_LINEAR)

# erase the whole person first (texture-aware fill on a crop around them), so
# nothing of them can bleed in around the real figure
y0, y1, x0, x1 = 600, 1420, 820, 1380
crop = (land[y0:y1, x0:x1] * 255).astype(np.uint8)
keep = (1 - person[y0:y1, x0:x1]).astype(np.uint8)
filled = np.zeros_like(crop)
cv2.xphoto.inpaint(crop, keep, filled, cv2.xphoto.INPAINT_FSR_BEST)
land[y0:y1, x0:x1] = filled.astype(np.float32) / 255

# soft overcast contact shadow under the boots
sh = np.exp(-(((xx - CX_L) / 95.0) ** 2 + ((yy - BOOT_L + 6) / 16.0) ** 2))
land = land * (1 - 0.45 * sh[..., None])

out = fg * fa[..., None] + land * (1 - fa[..., None])
cv2.imwrite(sys.argv[5], np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8))
print('scale', round(s, 3))
