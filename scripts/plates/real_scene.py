# Build the end plate from the real landscape photo (same lake, same rock):
# grade it to the portrait's edit, remove the person standing on the rock and
# stand the real climber (figure only, so the new scene shows between his legs
# and around the pole) there at the same height, blended into the light.
# Usage: python3 real_scene.py design/reference/real-landscape.jpg design/plates/real-landscape-depth.npy
#        design/plates/climber-figure.png <out.png>
import os, sys, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from grade import grade

land = cv2.imread(sys.argv[1])
ld = np.load(sys.argv[2]).astype(np.float32)
fig = cv2.imread(sys.argv[3], cv2.IMREAD_UNCHANGED).astype(np.float32) / 255   # BGRA, portrait crop at (450, 850)
H, W = land.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]

# ---- remove the person on the rock (by depth; legs kept to the band above the rock)
person = (ld > 6.5) & (xx > 970) & (xx < 1220) & (yy > 700) & (yy < 1305)
person &= (yy < 1110) | ((xx > 1020) & (xx < 1180))
person = cv2.dilate(person.astype(np.uint8), np.ones((15, 15)))
y0, y1, x0, x1 = 600, 1420, 820, 1380
# patch-based fill copies real texture from around the hole; its block seams are
# softened inside the hole only (most of it ends up behind him anyway)
hole = person[y0:y1, x0:x1]
lab = cv2.cvtColor(land[y0:y1, x0:x1], cv2.COLOR_BGR2LAB)
filled = np.zeros_like(lab)
cv2.xphoto.inpaint(lab, (1 - hole).astype(np.uint8), filled, cv2.xphoto.INPAINT_SHIFTMAP)
filled = cv2.cvtColor(filled, cv2.COLOR_LAB2BGR)
# open water is smooth: there a frequency-selective fill reads better than copied blocks
smooth_fill = np.zeros_like(filled)
cv2.xphoto.inpaint(land[y0:y1, x0:x1].copy(), (1 - hole).astype(np.uint8), smooth_fill, cv2.xphoto.INPAINT_FSR_FAST)
c = cv2.cvtColor(smooth_fill, cv2.COLOR_BGR2LAB).astype(np.float32)
water = ((c[..., 1] < 125.5) & (c[..., 0] > 60)).astype(np.float32)   # cyan: a below neutral (snow sits at ~128.6)
water = cv2.GaussianBlur(cv2.morphologyEx(water, cv2.MORPH_OPEN, np.ones((7, 7))), (0, 0), 6)[..., None]
filled = (smooth_fill * water + filled * (1 - water)).astype(np.uint8)
soft = cv2.bilateralFilter(filled, 9, 30, 6)
hm = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 3)[..., None]
land[y0:y1, x0:x1] = (soft * hm + filled * (1 - hm)).astype(np.uint8)

# ---- grade the whole scene to the portrait's edit (the figure already has it)
scene = grade(land, ld)

# ---- place him where the person stood, at the same height
CUT = (450, 850)                                # figure png origin in the portrait
HEAD_P, BOOT_P, CX_P = 934, 1840, 760           # portrait: head top, boot soles, figure centre x
HEAD_L, BOOT_L, CX_L = 730, 1295, 1110          # landscape: where the person stood
s = (BOOT_L - HEAD_L) * 0.99 / (BOOT_P - HEAD_P)
M = np.float32([[s, 0, CX_L - s * (CX_P - CUT[0])], [0, s, BOOT_L - s * (BOOT_P - CUT[1])]])
fg = cv2.warpAffine(fig[..., :3], M, (W, H), flags=cv2.INTER_AREA)
fa = cv2.warpAffine(fig[..., 3], M, (W, H), flags=cv2.INTER_LINEAR)
fa = cv2.GaussianBlur(fa, (0, 0), 0.6)          # a photographed edge, not a cut one

# light wrap: a little of the bright scene behind spills onto his edges
bg_blur = cv2.GaussianBlur(scene, (0, 0), 6)
edge = np.clip(fa * (1 - cv2.erode(fa, np.ones((3, 3)))) * 2.0, 0, 1)[..., None]
fg = fg * (1 - 0.15 * edge) + bg_blur * 0.15 * edge
# match the landscape's sensor grain on him
rng = np.random.default_rng(7)
grain = cv2.GaussianBlur(rng.normal(0, 1, (H, W)).astype(np.float32), (0, 0), 0.7)[..., None]
fg = fg + grain * 0.012

# soft overcast contact shadow where his boots meet the rock
sh = np.exp(-(((xx - CX_L) / 85.0) ** 2 + ((yy - BOOT_L + 4) / 12.0) ** 2))
scene = scene * (1 - 0.4 * sh[..., None])

a = fa[..., None]
out = fg * a + scene * (1 - a)
cv2.imwrite(sys.argv[4], np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8))
print('scale', round(s, 3))
