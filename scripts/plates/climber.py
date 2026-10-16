# Cut the climber out of the original portrait photo at full resolution.
# Depth Anything run on a tight crop gives a crisp silhouette; a guided filter
# snaps it to the photo's edges, then edge colours are pulled from inside the
# figure so no snow or lake fringe is left around him.
# Usage: python3 climber.py <ctx.png> <ctx_depth.npy> <out_rgba.png> [threshold]
import sys, numpy as np, cv2
from PIL import Image

img = np.array(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32) / 255
d = np.load(sys.argv[2])
t = float(sys.argv[4]) if len(sys.argv) > 4 else 4.0
a = np.clip((d - t + 0.8) / 1.6, 0, 1).astype(np.float32)
a = cv2.ximgproc.guidedFilter(img, a, 3, 4e-5)
a = np.clip((a - 0.55) * 3.0 + 0.5, 0, 1)

# decontaminate: edge pixels take the colour of the solid figure just inside
solid = (a > 0.97).astype(np.float32)
num = cv2.GaussianBlur(img * solid[..., None], (0, 0), 3)
den = cv2.GaussianBlur(solid, (0, 0), 3)[..., None]
inner = num / np.maximum(den, 1e-4)
w = np.clip((0.97 - a) / 0.5, 0, 1)[..., None] * (den > 0.02)
rgb = img * (1 - w) + inner * w

out = np.dstack([rgb, a])
Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGBA').save(sys.argv[3])
