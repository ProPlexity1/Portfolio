# Find the summit vantage for the opening: a true local peak with nothing
# higher within 400 m, and a viewing direction where the ground falls away
# steeply in front (a clear drop under the spur) and big mountains fill the
# view further out. Prints SX, SY (metres from the block centre), YAW (radians).
# Usage: python3 vantage.py <near.npy> [spacing]
import sys, math, numpy as np
from scipy.ndimage import maximum_filter

h = np.load(sys.argv[1]).astype(np.float32)
SP = float(sys.argv[2]) if len(sys.argv) > 2 else 15.0
n, m = h.shape

def hat(x, y):
    j = x / SP + m / 2
    i = n / 2 - y / SP
    if not (1 <= i < n - 2 and 1 <= j < m - 2):
        return None
    i0, j0 = int(i), int(j)
    fi, fj = i - i0, j - j0
    return (h[i0, j0] * (1 - fi) * (1 - fj) + h[i0, j0 + 1] * (1 - fi) * fj
            + h[i0 + 1, j0] * fi * (1 - fj) + h[i0 + 1, j0 + 1] * fi * fj)

peaks = (h == maximum_filter(h, size=int(800 / SP))) & (h > np.percentile(h, 85))
cand = np.argwhere(peaks)
cand = cand[(cand[:, 0] > 120) & (cand[:, 0] < n - 120) & (cand[:, 1] > 120) & (cand[:, 1] < m - 120)]
best = None
for i, j in cand:
    x, y = (j - m / 2) * SP, (n / 2 - i) * SP
    z = h[i, j] + 2.0
    for a in np.linspace(0, 2 * math.pi, 48, endpoint=False):
        ok = True
        drop = []
        depth = []
        for da in np.radians([-30, -15, 0, 15, 30]):
            for r in np.linspace(60, 6500, 40):
                g = hat(x + math.cos(a + da) * r, y + math.sin(a + da) * r)
                if g is None:
                    ok = False
                    break
                if r < 900 and g > z - r * 0.25:      # must fall away at least 14 deg near the spur
                    ok = False
                    break
                if r >= 900 and math.atan2(g - z, r) > math.radians(4):   # no wall right in front
                    ok = False
                    break
                if r < 900:
                    drop.append(z - g)
                else:
                    depth.append(g)
            if not ok:
                break
        if not ok:
            continue
        score = np.mean(drop) + 0.3 * np.std(depth)
        if best is None or score > best[0]:
            best = (score, x, y, a, z)
print(f'SX={best[1]:.0f} SY={best[2]:.0f} YAW={best[3]:.4f} Z={best[4]:.0f} score={best[0]:.0f}')
