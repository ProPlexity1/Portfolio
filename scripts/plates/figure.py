# Cut only the climber (and his pole) from the portrait, nothing behind him.
# Depth gives crisp edges but also keeps the rock under his raised foot, which
# is as near as he is; the human parser knows what is a person but is soft.
# Keep depth's edges only where the parser says "person", and add the pole as
# a thin line traced from depth. Gaps between the legs and between pole and leg
# stay empty, so the new scene shows through them.
# Usage: python3 figure.py <portrait crop 450,850-1100,2000 png> design/plates/portrait-figure-depth.npy
#        design/plates/portrait-figure-parse.npy design/plates/climber-figure.png
import sys, numpy as np, cv2
from PIL import Image

img = np.array(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32) / 255
d = np.load(sys.argv[2]).astype(np.float32)
person = np.load(sys.argv[3]).astype(np.float32)
h, w = d.shape
yy, xx = np.mgrid[0:h, 0:w]

depth_a = np.clip((d - 3.2) / 1.6, 0, 1)
gate = cv2.dilate((person > 0.35).astype(np.uint8), np.ones((9, 9))).astype(np.float32)
gate = cv2.GaussianBlur(gate, (0, 0), 2)
pole_x = 116 - (yy - 500) * 0.095
pole = ((np.abs(xx - pole_x) < np.where(yy < 480, 24, 9)) & (yy > 315) & (yy < 952)).astype(np.float32)
a = depth_a * np.maximum(gate, pole)
a = cv2.ximgproc.guidedFilter(img, a.astype(np.float32), 2, 2e-5)
a = np.clip((a - 0.5) * 2.6 + 0.5, 0, 1)

solid = (a > 0.97).astype(np.float32)
den = cv2.GaussianBlur(solid, (0, 0), 2.5)[..., None]
inner = cv2.GaussianBlur(img * solid[..., None], (0, 0), 2.5) / np.maximum(den, 1e-4)
k = np.clip((0.97 - a) / 0.6, 0, 1)[..., None] * (den > 0.02)
rgb = img * (1 - k) + inner * k
Image.fromarray((np.dstack([rgb, a]) * 255 + 0.5).astype(np.uint8), 'RGBA').save(sys.argv[4])
