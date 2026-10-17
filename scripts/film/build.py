# Cut the owner's own footage into the descent film: one graded, continuous
# sequence of frames (boot prints, the tilt up into the pines, the summit
# pull-back, the cloud, the forest, the lake, him on the rock).
#
# Each shot is a source (video span or still) plus a moving crop window, so a
# still can push in and a 4K clip can be reframed (the summit pull-back is a
# crop that opens from him to the whole valley). Output: numbered JPEG frames
# for one format (d = 16:10 desktop, m = 9:19.5 phone) and, with --mp4, a
# preview film with cross-dissolves between shots.
#
# Usage: python3 build.py <raw_dir> <end_plate.png> <out_dir> <d|m> [--mp4 preview.mp4]
import os, sys, subprocess, numpy as np, cv2
from PIL import Image, ImageOps

RAW, END, OUT, FMT = sys.argv[1:5]
MP4 = sys.argv[sys.argv.index('--mp4') + 1] if '--mp4' in sys.argv else None
W, H = {'d': (1600, 1000), 'm': (720, 1560)}[FMT]
FPS = 30
os.makedirs(OUT, exist_ok=True)

def smooth(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)

def lerp(a, b, t):
    return [x + (y - x) * t for x, y in zip(a, b)]

# crop windows are (cx, cy, h) as fractions of the source: centre and height
# (width follows from the output aspect)
SHOTS = [
    # name, source, start s, source span s, film s, window from, window to
    ('prints', 'VID_20260405_105022.mp4', 5.9, 1.0, 2.2, (0.5, 0.42, 0.70), (0.5, 0.40, 0.62)),
    ('tilt', 'VID_20260405_105249.mp4', 9.0, 6.8, 5.0, (0.5, 0.70, 0.56), (0.5, 0.40, 0.56)),
    ('summit', 'VID_20260403_160636.mp4', 24.6, 10.0, 6.0, (0.505, 0.60, 0.30), (0.5, 0.5, 1.0)),
    ('cloud', 'IMG20260405113514.jpg', 0, 0, 3.4, (0.5, 0.36, 0.42), (0.5, 0.50, 0.70)),
    ('forest', 'VID_20260405_104755.mp4', 16.0, 3.0, 2.6, (0.5, 0.45, 0.62), (0.5, 0.45, 0.56)),
    ('lake', 'VID_20260405_102514.mp4', 36.0, 0, 2.6, (0.5, 0.55, 0.60), (0.5, 0.55, 0.52)),
    ('end', END, 0, 0, 3.4, (0.519, 0.5, 0.62), (0.519, 0.5, 1.0)),
]
XFADE = 0.7   # seconds of dissolve between shots

# people the owner asked to leave out, in still sources: (file, cx, cy, r) as fractions
CLEAN = {'IMG20260405113514.jpg': [(0.505, 0.665, 0.03)]}

def load_still(path):
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    a = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    for cx, cy, r in CLEAN.get(os.path.basename(path), []):
        h, w = a.shape[:2]
        m = np.zeros((h, w), np.uint8)
        cv2.ellipse(m, (int(cx * w), int(cy * h)), (int(r * w * 0.6), int(r * h * 1.1)), 0, 0, 360, 255, -1)
        a = cv2.inpaint(a, m, 15, cv2.INPAINT_TELEA)
    return a

def video_frames(path, start, span, n):
    """n frames evenly over [start, start + span] (span 0: one still frame)"""
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    want = [start + (span * i / max(1, n - 1) if span else 0) for i in range(n)]
    idx = [int(round(t * fps)) for t in want]
    out, cur, f = [], -1, None
    cap.set(cv2.CAP_PROP_POS_FRAMES, idx[0])
    cur = idx[0] - 1
    for k in idx:
        while cur < k:
            ok, f = cap.read()
            if not ok:
                break
            cur += 1
        out.append(f)
    cap.release()
    return out

def crop(frame, win):
    sh, sw = frame.shape[:2]
    cx, cy, hf = win
    ch = hf * sh
    cw = ch * W / H
    if cw > sw:                       # wider than the source allows: fit the width
        cw = sw
        ch = cw * H / W
    x0 = min(max(cx * sw - cw / 2, 0), sw - cw)
    y0 = min(max(cy * sh - ch / 2, 0), sh - ch)
    M = np.float32([[W / cw, 0, -x0 * W / cw], [0, H / ch, -y0 * H / ch]])
    interp = cv2.INTER_AREA if cw > W else cv2.INTER_CUBIC
    return cv2.warpAffine(frame, M, (W, H), flags=interp, borderMode=cv2.BORDER_REFLECT)

# ---- one look across every source: the portrait's edit (cool, teal shadows,
# clean whites, firm contrast, soft vignette)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIG = 1 - 0.28 * np.clip(((xx / W - 0.5) ** 2 * 1.3 + (yy / H - 0.52) ** 2) / 0.42, 0, 1)
TOP = np.clip(1 - yy / (H * 0.45), 0, 1) ** 1.6

def grade(bgr):
    f = bgr.astype(np.float32) / 255
    lum = f.mean(2, keepdims=True)
    # contrast S-curve
    f = f + 0.22 * (f - 0.5) * (1 - np.abs(2 * f - 1))
    # gentle desaturation, then teal in the shadows and a cool tint in the mids
    f = lum + (f - lum) * 0.82
    sh = np.clip(1 - lum * 1.8, 0, 1)
    f = f + sh * np.array([0.05, 0.03, -0.035], np.float32)       # BGR: blue/green up, red down
    f = f * np.array([1.03, 1.0, 0.95], np.float32)
    # the portrait's dark teal heavy sky
    f = f * (1 - 0.22 * TOP[..., None]) + np.array([0.30, 0.27, 0.10], np.float32) * 0.22 * TOP[..., None]
    f = f * VIG[..., None]
    return np.clip(f * 255 + 0.5, 0, 255).astype(np.uint8)

frames = []          # list of (shot index, image)
for si, (name, src, start, span, film, w0, w1) in enumerate(SHOTS):
    n = int(round(film * FPS))
    path = src if os.path.isabs(src) else os.path.join(RAW, src)
    if path.lower().endswith(('.jpg', '.png')):
        still = load_still(path)
        srcs = [still] * n
    else:
        srcs = video_frames(path, start, span, n)
    for i, f in enumerate(srcs):
        t = smooth(i / max(1, n - 1))
        win = lerp(w0, w1, t)
        img = crop(f, win)
        frames.append((si, img if name == 'end' else grade(img)))
    print(name, n, 'frames')

# dissolves: overlap the tail of each shot with the head of the next
xf = int(XFADE * FPS)
seq = []
i = 0
shots = [[f for s, f in frames if s == k] for k in range(len(SHOTS))]
for k, sh in enumerate(shots):
    if k == 0:
        seq.extend(sh)
        continue
    tail = seq[-xf:]
    seq = seq[:-xf]
    for j in range(xf):
        a = smooth((j + 1) / (xf + 1))
        seq.append(cv2.addWeighted(tail[j], 1 - a, sh[j], a, 0))
    seq.extend(sh[xf:])
for k, f in enumerate(seq):
    cv2.imwrite(os.path.join(OUT, f'{k:04d}.jpg'), f, [cv2.IMWRITE_JPEG_QUALITY, 90])
print(len(seq), 'frames total', W, 'x', H)

if MP4:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', os.path.join(OUT, '%04d.jpg'),
                    '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', MP4], check=True)
    print('preview', MP4)
