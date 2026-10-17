# Height map for the snow near the camera: soft drifts plus a trail of boot
# prints pressed in, walking away from the camera (toward the top of the map).
# The boot atlas is a ratio texture (mid grey = untouched snow, dark = pressed
# in, light = the lip pushed up), which reads directly as relative height.
# Output: 16-bit PNG, 0.5 = rest level. Covers PATCH x PATCH metres.
# Usage: python3 prints_height.py <boot-atlas.webp> <out.png>
import sys, math, numpy as np, cv2
from PIL import Image

PATCH = 8.0                     # metres
N = 4096
PX = N / PATCH                  # px per metre
atlas = np.array(Image.open(sys.argv[1]).convert('L')).astype(np.float32) / 255
LEFT, RIGHT = atlas[:, :768], atlas[:, 768:1536]
rng = np.random.default_rng(5)

def fbm(octaves, base):
    v = np.zeros((N, N), np.float32)
    amp = 1.0
    for o in range(octaves):
        c = int(base * 2 ** o)
        g = rng.random((c + 3, c + 3)).astype(np.float32)
        v += amp * cv2.resize(g, (N + N // c * 3, N + N // c * 3), interpolation=cv2.INTER_CUBIC)[:N, :N]
        amp *= 0.5
    return v / 2

# wind-shaped drifts and fine grain (relative units, scaled in Blender)
h = 0.5 + (fbm(5, 3) - 0.5) * 0.12 + (fbm(3, 60) - 0.5) * 0.015
press = np.zeros((N, N), np.float32)

def stamp(cx, cy, ang, left, length=0.31):
    src = LEFT if left else RIGHT
    hh = int(length * PX / 0.62)
    ww = int(hh * src.shape[1] / src.shape[0])
    s = cv2.resize(src, (ww, hh), interpolation=cv2.INTER_AREA) - 0.47
    big = int(math.hypot(ww, hh)) + 4
    M = cv2.getRotationMatrix2D((ww / 2, hh / 2), ang, 1.0)
    M[0, 2] += (big - ww) / 2
    M[1, 2] += (big - hh) / 2
    r = cv2.warpAffine(s, M, (big, big), borderValue=0)
    x0, y0 = int(cx - big / 2), int(cy - big / 2)
    sub = press[y0:y0 + big, x0:x0 + big]
    np.copyto(sub, np.where(np.abs(r[:sub.shape[0], :sub.shape[1]]) > np.abs(sub), r[:sub.shape[0], :sub.shape[1]], sub))

# trail: from below the camera (bottom of the map) away into the distance (top),
# a natural stride with a little wander; it runs off the top edge of the patch
y = N - 0.4 * PX
i = 0
while y > 0.15 * PX:
    left = i % 2 == 0
    t = (N - y) / N
    sway = math.sin(t * 5.0) * 0.18 * PX
    x = N / 2 + sway + (-0.12 if left else 0.12) * PX + rng.normal(0, 0.02) * PX
    stamp(x, y, rng.normal(0, 4) + (5 if left else -5), left)
    y -= (0.68 + rng.normal(0, 0.03)) * PX
    i += 1

# deep fresh snow: prints sink well in, with soft walls
press = cv2.GaussianBlur(press, (0, 0), 3)
h = h + press * 0.55
out = np.clip(h, 0, 1)
cv2.imwrite(sys.argv[2], (out * 65535).astype(np.uint16))
print('ok', N, PATCH)
