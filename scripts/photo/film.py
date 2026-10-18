# Join rendered parallax shots into one preview film: each shot graded toward the
# final scene's look (cool teal shadows, clean whites, firm contrast), and joined
# by a pass through cloud (blur and soft white swell, then the next shot clears).
# Usage: python3 film.py <out.mp4> <frames_dir>:<grade 0..1> [<frames_dir>:<grade> ...]
import sys, os, glob, subprocess, numpy as np, cv2

OVER = 36            # frames shared by two shots in a cloud pass
FOG = np.array([0.93, 0.92, 0.90], np.float32)   # BGR, cool pale cloud

def grade(bgr, k):
    if k <= 0:
        return bgr
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    L, A, B = lab[..., 0] / 100, lab[..., 1], lab[..., 2]
    # local contrast (clarity), then a gentle S-curve
    base = cv2.GaussianBlur(L, (0, 0), 25)
    L2 = L + (L - base) * 0.5 * k
    s = np.clip(L2, 0, 1)
    curve = s + 0.35 * k * (s - 0.5) * (1 - np.abs(2 * s - 1))
    # shadows and mids lean teal (a-, b-), highlights stay clean
    sh = (1 - np.clip(curve, 0, 1)) ** 1.5
    A2 = A * (1 + 0.25 * k) - 5 * k * sh
    B2 = B * (1 + 0.25 * k) - 7 * k * sh
    out = cv2.cvtColor(np.dstack([np.clip(curve, 0, 1) * 100, A2, B2]).astype(np.float32), cv2.COLOR_LAB2BGR)
    return np.clip(out, 0, 1)

def vignette(h, w):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2))
    return (1 - 0.18 * np.clip(r - 0.45, 0, 1) ** 1.6)[..., None]

out = sys.argv[1]
shots = []
for arg in sys.argv[2:]:
    d, g = arg.rsplit(':', 1)
    shots.append((sorted(glob.glob(os.path.join(d, '*.jpg'))), float(g)))
h, w = cv2.imread(shots[0][0][0]).shape[:2]
vig = vignette(h, w)
ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{w}x{h}', '-r', '30',
                       '-i', '-', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)

def load(f, g):
    return grade(cv2.imread(f).astype(np.float32) / 255, g) * vig

def emit(img):
    ff.stdin.write((img * 255 + 0.5).clip(0, 255).astype(np.uint8).tobytes())

for si, (frames, g) in enumerate(shots):
    start = OVER if si > 0 else 0
    end = len(frames) - (OVER if si < len(shots) - 1 else 0)
    for f in frames[start:end]:
        emit(load(f, g))
    if si < len(shots) - 1:
        nxt, g2 = shots[si + 1]
        for j in range(OVER):
            t = (j + 0.5) / OVER
            sm = t * t * (3 - 2 * t)
            a = load(frames[end + j], g)
            b = load(nxt[j], g2)
            mix = a * (1 - sm) + b * sm
            bell = np.sin(np.pi * t)
            sig = 1 + 14 * bell
            mix = cv2.GaussianBlur(mix, (0, 0), sig)
            emit(mix * (1 - 0.8 * bell) + FOG * 0.8 * bell)
ff.stdin.close()
ff.wait()
print('wrote', out)
