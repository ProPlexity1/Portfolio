# Grade the real landscape to the portrait's edit, region by region (the
# portrait was edited: dark teal sky, deep cyan water, bright clean snow,
# punchy contrast; the landscape is a flat phone shot).
# Usage: python3 grade.py <landscape.jpg> design/plates/real-landscape-depth.npy <out.png>
import sys, numpy as np, cv2

def smooth(v, a, b):
    t = np.clip((v - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def grade(bgr, depth):
    # the phone JPEG has faint 8x8 blocks in smooth cloud; clean them before any
    # contrast or clarity can bring them out
    bgr = cv2.fastNlMeansDenoisingColored(bgr, None, 4, 4, 5, 15)
    img = bgr.astype(np.float32) / 255
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)          # L 0..100, a/b around 0
    L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
    H, W = L.shape
    yy = np.arange(H)[:, None] / H
    xx = np.arange(W)[None] / W
    chroma = np.hypot(A, B)

    # region keys, soft; the sky edge follows the photo (guided) so no halos
    sky = (smooth(0.03 - depth, 0, 0.025) * smooth(0.62 - yy, 0, 0.1)).astype(np.float32)   # raw depth: sky ~0, peak >0.05
    sky = np.maximum(sky, smooth(L, 60, 75) * smooth(0.06 - yy, 0, 0.04)).astype(np.float32)   # bright cloud right at the top edge
    sky = np.clip(cv2.ximgproc.guidedFilter(img, sky, 8, 1e-3), 0, 1)
    # reach the bright rim along the skylines too (dark rock is left alone)
    rim = cv2.dilate(sky, np.ones((45, 45))) * smooth(L, 48, 62)
    sky = np.maximum(sky, cv2.GaussianBlur(rim, (0, 0), 2))
    water = smooth(-A, 1.5, 6) * smooth(-B, -2, 3) * smooth(L, 25, 40) * (1 - sky)
    water = cv2.GaussianBlur(water.astype(np.float32), (0, 0), 2)
    snow = smooth(L, 55, 70) * smooth(10 - chroma, 0, 6) * (1 - sky)
    rest = np.clip(1 - sky - water - snow, 0, 1)

    # sky: deep teal at the very top, staying bright and misty toward the peak
    top = 1 - smooth(yy, 0.0, 0.38)
    L = L - sky * 38 * top + sky * 6 * smooth(yy, 0.25, 0.45)
    # bring out the cloud structure already in the sky, from a deblocked copy
    # (the phone JPEG has 8x8 blocks in its smooth gradients)
    Ls = cv2.bilateralFilter(L.astype(np.float32), 15, 4, 10)
    Ls = cv2.GaussianBlur(Ls, (0, 0), 2.5)
    L = L * (1 - sky) + Ls * sky
    cl = cv2.GaussianBlur(L, (0, 0), 30)
    L = L + sky * 0.8 * (L - cl)
    A = A - sky * (2 + 5 * top)
    B = B - sky * (3 + 7 * top)
    # water: lighter, clear turquoise
    L = L + water * 4
    A = A - water * 13
    B = B - water * 8
    # snow: lifted and clean, a touch cool
    L = L + snow * (90 - L) * 0.45
    B = B - snow * 1.5
    # rock, forest, slopes: cool and quieter, like the portrait's grey-teal slopes
    warm = smooth(B, 0, 8)
    A = A - rest * (1.5 + 2 * warm)
    B = B - rest * (3 + 6 * warm)
    A = A * (1 - 0.25 * rest)
    B = B * (1 - 0.25 * rest)
    # overall: contrast S-curve on L and a little clarity
    Ln = np.clip(L / 100, 0, 1)
    Ln = Ln + 0.16 * (Ln - 0.5) * (1 - np.abs(2 * Ln - 1))
    L = Ln * 100
    blur = cv2.GaussianBlur(L, (0, 0), 25)
    L = L + 0.3 * (L - blur) * (1 - sky)
    # gentle vignette
    v = ((xx - 0.5) ** 2 * 1.2 + (yy - 0.55) ** 2) / 0.45
    L = L * (1 - 0.18 * np.clip(v, 0, 1))
    lab = np.dstack([np.clip(L, 0, 100), A, B]).astype(np.float32)
    out = np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2BGR), 0, 1)
    # the portrait's soft glow: screen a blurred copy over the highlights
    glow = cv2.GaussianBlur(out, (0, 0), 18) ** 1.6
    out = 1 - (1 - out) * (1 - 0.22 * glow)
    return np.clip(out, 0, 1)

if __name__ == '__main__':
    bgr = cv2.imread(sys.argv[1])
    d = np.load(sys.argv[2]).astype(np.float32)          # raw Depth Anything output
    cv2.imwrite(sys.argv[3], (grade(bgr, d) * 255 + 0.5).astype(np.uint8))
