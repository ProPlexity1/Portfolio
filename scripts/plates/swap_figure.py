# Put the real climber, and the real ground he stands on, into the panorama in
# place of its AI-made figure. The panorama's figure is the portrait's pose at
# the same spot, so the lower portrait maps onto it with one scale and offset
# (fitted on head, pole and pack). The real foreground is cut by depth (him and
# the rock pile, against the lake), its far sides fade into the panorama's own
# rubble, and any slivers of the AI figure left outside it are inpainted away.
# Usage: python3 swap_figure.py design/reference/panorama-upscaled-8000x3048.webp design/reference/original-portrait.webp design/plates/portrait-low-depth.npy design/plates/ai-figure-depth.npy <out.png>
import sys, numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

LOW_Y = 700                                     # the lower portrait crop starts here (portrait px)
S = 1.351                                       # portrait px -> panorama px
OX = 3600 + 142.5 - S * 450                     # panorama x of portrait x = 0
OY = 1500 + 40.5 - S * 850                      # panorama y of portrait y = 0
AI_CTX = (3600, 1500)                           # origin of the AI figure depth crop

pano = cv2.cvtColor(np.array(Image.open(sys.argv[1]).convert('RGB')), cv2.COLOR_RGB2BGR)
por = cv2.cvtColor(np.array(Image.open(sys.argv[2]).convert('RGB')), cv2.COLOR_RGB2BGR)
low = por[LOW_Y:].astype(np.float32) / 255
d = np.load(sys.argv[3]).astype(np.float32)
ai_d = np.load(sys.argv[4]).astype(np.float32)
H, W = pano.shape[:2]

# real foreground: him and the rocks in front of the lake
a = np.clip((d - 3.7) / 0.5, 0, 1).astype(np.float32)
a = cv2.ximgproc.guidedFilter(low, a, 3, 4e-5)
a = np.clip((a - 0.55) * 3.0 + 0.5, 0, 1)
# decontaminate the edge colours (no lake fringe)
solid = (a > 0.97).astype(np.float32)
inner = cv2.GaussianBlur(low * solid[..., None], (0, 0), 3) / np.maximum(cv2.GaussianBlur(solid, (0, 0), 3)[..., None], 1e-4)
k = np.clip((0.97 - a) / 0.5, 0, 1)[..., None] * (cv2.GaussianBlur(solid, (0, 0), 3)[..., None] > 0.02)
low = low * (1 - k) + inner * k
# the far sides of the rock pile give way to the panorama's own rubble
xs = np.arange(low.shape[1])[None]
edge = np.clip(np.minimum(xs - 60, low.shape[1] - 60 - xs) / 260, 0, 1)
a = a * (edge * edge * (3 - 2 * edge))

M = np.float32([[S, 0, OX], [0, S, OY + S * LOW_Y]])
fg = cv2.warpAffine(low, M, (W, H), flags=cv2.INTER_LANCZOS4)
fa = cv2.warpAffine(a, M, (W, H), flags=cv2.INTER_LINEAR)

# remove whatever of the AI figure the real one does not cover
ai = np.zeros((H, W), np.uint8)
ah, aw = ai_d.shape
ai[AI_CTX[1]:AI_CTX[1] + ah, AI_CTX[0]:AI_CTX[0] + aw] = (ai_d > 5.2).astype(np.uint8)
left = ai & (cv2.dilate((fa > 0.5).astype(np.uint8), np.ones((5, 5))) == 0)
left = cv2.dilate(left, np.ones((11, 11)))
y0, y1, x0, x1 = AI_CTX[1], AI_CTX[1] + ah, AI_CTX[0], AI_CTX[0] + aw
pano[y0:y1, x0:x1] = cv2.inpaint(pano[y0:y1, x0:x1], left[y0:y1, x0:x1] * 255, 9, cv2.INPAINT_TELEA)

out = pano.astype(np.float32) / 255
out = fg * fa[..., None] + out * (1 - fa[..., None])
cv2.imwrite(sys.argv[5], np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8))
