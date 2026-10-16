# Compose the summit snow with boot prints for the opening shots: one copy of
# the snow close-up over a 4 x 3.3 m patch (its edges fade into fog in the
# renders), and a trail of alternating
# left/right prints pressed in from the boot atlas (a ratio texture: mid grey
# leaves the snow as it is, darker presses in, lighter is the lip). The trail
# comes up from the valley side and ends where he stood, feet side by side.
# Usage: python3 ground.py <snow-macro.webp> <boot-atlas.webp> <out.png>
import sys, math, numpy as np, cv2
from PIL import Image

snow = cv2.cvtColor(np.array(Image.open(sys.argv[1]).convert('RGB')), cv2.COLOR_RGB2BGR).astype(np.float32) / 255
atlas = cv2.cvtColor(np.array(Image.open(sys.argv[2]).convert('RGB')), cv2.COLOR_RGB2BGR).astype(np.float32) / 255
tex = snow
TH, TW = tex.shape[:2]                     # 1700 x 2040 for a 4 m wide patch
PATCH_M = 4.0
PX_PER_M = TW / PATCH_M

M_ = 400                                    # margin so prints near an edge are simply cut
ratio = np.full((TH + 2 * M_, TW + 2 * M_, 3), 0.5, np.float32)
LEFT, RIGHT = atlas[:, :768], atlas[:, 768:1536]

def stamp(cx, cy, ang, left, length_m=0.31):
    src = LEFT if left else RIGHT
    h = int(length_m * PX_PER_M / 0.62)                # the sole fills ~62% of the atlas cell height
    w = int(h * src.shape[1] / src.shape[0])
    s = cv2.resize(src, (w, h), interpolation=cv2.INTER_AREA)
    M = cv2.getRotationMatrix2D((w / 2, h / 2), ang, 1.0)
    big = int(math.hypot(w, h)) + 4
    M[0, 2] += (big - w) / 2
    M[1, 2] += (big - h) / 2
    r = cv2.warpAffine(s, M, (big, big), borderValue=(0.5, 0.5, 0.5))
    x0, y0 = int(cx - big / 2) + M_, int(cy - big / 2) + M_
    sub = ratio[y0:y0 + big, x0:x0 + big]
    # where prints overlap keep the deeper press
    np.minimum(sub, r, out=sub, where=(np.abs(r - 0.5) > np.abs(sub - 0.5)))

# trail: from the bottom edge (the valley side) up to the centre, a little wander
rng = np.random.default_rng(3)
cx0, cy0 = TW / 2, TH / 2
steps = 6
for i in range(steps):
    t = i / (steps - 1)
    y = cy0 + (1 - t) * 1.45 * PX_PER_M + 0.12 * PX_PER_M
    left = i % 2 == 0
    sway = math.sin(t * 2.2) * 0.12 * PX_PER_M
    x = cx0 + sway + (-0.11 if left else 0.11) * PX_PER_M + rng.normal(0, 0.015) * PX_PER_M
    ang = rng.normal(0, 4) + (6 if left else -6)
    stamp(x, y, ang, left)
# feet side by side where he stood
stamp(cx0 - 0.13 * PX_PER_M, cy0 - 0.05 * PX_PER_M, 4, True)
stamp(cx0 + 0.13 * PX_PER_M, cy0 - 0.02 * PX_PER_M, -5, False)

out = tex * ratio[M_:M_ + TH, M_:M_ + TW] * 2.0
# cool, overcast light like the scene
out = np.clip(out * np.array([1.02, 1.0, 0.96], np.float32), 0, 1)
cv2.imwrite(sys.argv[3], (out * 255 + 0.5).astype(np.uint8))
print(out.shape, PX_PER_M)
