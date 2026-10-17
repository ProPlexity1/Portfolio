# Sharpen a heightfield the way water and ice would: a particle hydraulic
# erosion pass (droplets pick up and drop sediment as they run downhill),
# then a light thermal pass so slopes settle at a stable angle. Carves the
# branching gullies and sharp ribs a 30 m elevation model cannot hold.
# Usage: python3 erode.py <in.npy> <out.npy> [droplets] [spacing_m]
import sys, numpy as np
from numba import njit

@njit(cache=True)
def erode(h, droplets, seed, spacing):
    np.random.seed(seed)
    n, m = h.shape
    inertia, capacity_k, min_slope = 0.08, 6.0, 0.01
    deposit_k, erode_k, evap, gravity = 0.25, 0.35, 0.012, 9.0
    radius = 2
    for _ in range(droplets):
        x = np.random.random() * (m - 3) + 1
        y = np.random.random() * (n - 3) + 1
        dx = 0.0; dy = 0.0; speed = 1.0; water = 1.0; sed = 0.0
        for _step in range(80):
            xi = int(x); yi = int(y)
            if xi < 1 or yi < 1 or xi >= m - 2 or yi >= n - 2:
                break
            fx = x - xi; fy = y - yi
            h00 = h[yi, xi]; h10 = h[yi, xi + 1]; h01 = h[yi + 1, xi]; h11 = h[yi + 1, xi + 1]
            gx = ((h10 - h00) * (1 - fy) + (h11 - h01) * fy) / spacing
            gy = ((h01 - h00) * (1 - fx) + (h11 - h10) * fx) / spacing
            hc = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy
            dx = dx * inertia - gx * (1 - inertia)
            dy = dy * inertia - gy * (1 - inertia)
            l = (dx * dx + dy * dy) ** 0.5
            if l < 1e-9:
                break
            dx /= l; dy /= l
            nx = x + dx; ny = y + dy
            nxi = int(nx); nyi = int(ny)
            if nxi < 1 or nyi < 1 or nxi >= m - 2 or nyi >= n - 2:
                break
            nfx = nx - nxi; nfy = ny - nyi
            hn = (h[nyi, nxi] * (1 - nfx) * (1 - nfy) + h[nyi, nxi + 1] * nfx * (1 - nfy)
                  + h[nyi + 1, nxi] * (1 - nfx) * nfy + h[nyi + 1, nxi + 1] * nfx * nfy)
            dh = hn - hc
            cap = min(max(-dh / spacing, min_slope) * speed * water * capacity_k * spacing, 25.0)
            if sed > cap or dh > 0:
                amt = min(dh, sed) if dh > 0 else (sed - cap) * deposit_k
                sed -= amt
                h[yi, xi] += amt * (1 - fx) * (1 - fy)
                h[yi, xi + 1] += amt * fx * (1 - fy)
                h[yi + 1, xi] += amt * (1 - fx) * fy
                h[yi + 1, xi + 1] += amt * fx * fy
            else:
                amt = min((cap - sed) * erode_k, -dh, 1.5)
                tot = 0.0
                for oy in range(-radius, radius + 1):
                    for ox in range(-radius, radius + 1):
                        w = max(0.0, radius - (ox * ox + oy * oy) ** 0.5)
                        tot += w
                for oy in range(-radius, radius + 1):
                    for ox in range(-radius, radius + 1):
                        w = max(0.0, radius - (ox * ox + oy * oy) ** 0.5)
                        yy = yi + oy; xx = xi + ox
                        if w > 0 and 0 <= yy < n and 0 <= xx < m:
                            h[yy, xx] -= amt * w / tot
                sed += amt
            speed = min((max(speed * speed - dh * gravity, 0.0)) ** 0.5, 12.0)
            water *= (1 - evap)
            x = nx; y = ny
    return h

@njit(cache=True)
def thermal(h, iters, talus):
    n, m = h.shape
    for _ in range(iters):
        for i in range(1, n - 1):
            for j in range(1, m - 1):
                for di, dj in ((1, 0), (0, 1), (-1, 0), (0, -1)):
                    d = h[i, j] - h[i + di, j + dj]
                    if d > talus:
                        mv = (d - talus) * 0.25
                        h[i, j] -= mv
                        h[i + di, j + dj] += mv
    return h

if __name__ == '__main__':
    h = np.load(sys.argv[1]).astype(np.float64)
    drops = int(sys.argv[3]) if len(sys.argv) > 3 else 600000
    spacing = float(sys.argv[4]) if len(sys.argv) > 4 else 15.0
    before = h.copy()
    # the droplet model is tuned for a 15 m grid: work in that frame and scale back
    k = 15.0 / spacing
    h = h * k
    h = erode(h, drops, 3, 15.0)
    h = thermal(h, 6, 15.0 * 1.6)         # nothing steeper than ~58 degrees stays loose
    h = h / k
    np.save(sys.argv[2], h.astype(np.float32))
    print('eroded; mean |change| m', float(np.abs(h - before).mean()), 'max', float(np.abs(h - before).max()))
