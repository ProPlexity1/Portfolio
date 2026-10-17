# Cut him and the rock spur out of a 4K frame of the summit clip, using its
# depth map (him and the spur are far nearer than the valley behind them).
# Usage: python3 spur_cut.py <frame.png> <depth.npy> <out_rgba.png>
import sys, numpy as np, cv2
img = cv2.imread(sys.argv[1]).astype(np.float32) / 255
H, W = img.shape[:2]
d = np.load(sys.argv[2]).astype(np.float32)
d = cv2.resize(d, (W, H), interpolation=cv2.INTER_CUBIC)
v = (d - d.min()) / (d.max() - d.min())
a = np.clip((v - 0.45) / 0.08, 0, 1).astype(np.float32)
a = cv2.ximgproc.guidedFilter(img, a, 4, 2e-5)
a = np.clip((a - 0.5) * 2.4 + 0.5, 0, 1)
solid = (a > 0.97).astype(np.float32)
den = cv2.GaussianBlur(solid, (0, 0), 3)[..., None]
inner = cv2.GaussianBlur(img * solid[..., None], (0, 0), 3) / np.maximum(den, 1e-4)
k = np.clip((0.97 - a) / 0.6, 0, 1)[..., None] * (den > 0.02)
rgb = img * (1 - k) + inner * k
cv2.imwrite(sys.argv[3], (np.dstack([rgb, a]) * 255 + 0.5).astype(np.uint8))
ys, xs = np.where(a > 0.5)
print('bbox', xs.min(), ys.min(), xs.max(), ys.max())
