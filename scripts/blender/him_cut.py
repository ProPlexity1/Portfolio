# Cut just him (no rock) from the spur cutout: the pale stone is the pale
# region connected to the bottom of his box; his face and hands, though
# similar in colour, are not connected to it.
# Usage: python3 him_cut.py <spur_rgba.png> <out.png> x0 y0 x1 y1
import sys, numpy as np, cv2
img = cv2.imread(sys.argv[1], cv2.IMREAD_UNCHANGED)
x0, y0, x1, y1 = map(int, sys.argv[3:7])
c = img[y0:y1, x0:x1].copy()
bgr = c[..., :3].astype(np.float32) / 255
lum = bgr.mean(2)
hsv = cv2.cvtColor(c[..., :3], cv2.COLOR_BGR2HSV)
pale = ((lum > 0.48) & (hsv[..., 1] > 20)).astype(np.uint8)
n, lab = cv2.connectedComponents(pale)
bottom = set(np.unique(lab[-12:, :])) - {0}
rock = np.isin(lab, list(bottom))
rock = cv2.dilate(rock.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
m = (~rock & (c[..., 3] > 30)).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(m)
k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
m = (lab == k).astype(np.float32)
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
m = cv2.ximgproc.guidedFilter(bgr, m, 3, 1e-4).clip(0, 1)
c[..., 3] = (c[..., 3].astype(np.float32) * m).astype(np.uint8)
cv2.imwrite(sys.argv[2], c)
ys, xs = np.where(c[..., 3] > 128)
print('seat row', int(ys.max()), 'of', c.shape[0], 'width', c.shape[1])
