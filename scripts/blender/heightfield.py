# Prepare the Naltar terrain for terrain.py from Copernicus GLO-30 tiles
# (1 arc second; at 36 N one sample is ~25 m east-west and ~30.9 m north-south).
#
#   near: a 15 x 15 km block around CENTRE resampled to an even 15 m grid, plus
#         fractal ridges the 30 m model cannot hold (erode.py then carves it)
#   far:  a 3 x 3 degree mosaic around it at an even 240 m, so the horizon is
#         real mountains in every direction
# Heights are metres above Z0 (the near block's lowest point). Prints FAR_OFFSET:
# the far grid's centre relative to the near block's centre, in metres.
#
# Usage: python3 heightfield.py <tiles_dir> <out_near.npy> [lat lon]
import sys, os, numpy as np, cv2, rasterio

TILES, OUT = sys.argv[1], sys.argv[2]
LAT, LON = (float(sys.argv[3]), float(sys.argv[4])) if len(sys.argv) > 4 else (36.155, 74.175)
DX = 30.87 * np.cos(np.radians(36.5))      # metres per arc second east-west
DY = 30.87                                  # metres per arc second north-south

def tile(la, lo):
    with rasterio.open(os.path.join(TILES, f'n{la}e{lo:03d}.tif')) as d:
        return d.read(1).astype(np.float32)

# mosaic of 3 x 3 tiles, north at the top
la0, lo0 = int(LAT), int(LON)
rows = []
for la in (la0 + 1, la0, la0 - 1):
    rows.append(np.hstack([tile(la, lo) for lo in (lo0 - 1, lo0, lo0 + 1)]))
mos = np.vstack(rows)                       # 10800 x 10800, top-left = (la0 + 2, lo0 - 1)
# arc-second pixel of the centre
cy = int(round((la0 + 2 - LAT) * 3600))
cx = int(round((LON - (lo0 - 1)) * 3600))

# ---- near block: 15 km square, even 15 m grid
half_x = int(7500 / DX)
half_y = int(7500 / DY)
near = mos[cy - half_y:cy + half_y, cx - half_x:cx + half_x]
near = cv2.resize(near, (1000, 1000), interpolation=cv2.INTER_CUBIC)
SP = 15.0
rng = np.random.default_rng(1)
n, m = near.shape
det = np.zeros_like(near)
amp = 30.0
for o in range(6):
    c = 10 * 2 ** o
    g = rng.standard_normal((c + 3, c + 3)).astype(np.float32)
    g = cv2.resize(g, (m + m // c * 3, n + n // c * 3), interpolation=cv2.INTER_CUBIC)[:n, :m]
    det += amp * (0.5 - np.abs(np.tanh(g)))          # ridged: sharp crests, soft hollows
    amp *= 0.5
gy, gx = np.gradient(near, SP)
near = near + det * np.clip(np.hypot(gx, gy) * 1.5, 0.3, 1.5)
z0 = float(near.min())
np.save(OUT, (near - z0).astype(np.float32))

# ---- middle band: 60 km square at an even 60 m, a little low under the near block
MS = 60.0
mhx = int(30000 / DX)
mhy = int(30000 / DY)
mid = mos[cy - mhy:cy + mhy, cx - mhx:cx + mhx]
mid = cv2.resize(mid, (1000, 1000), interpolation=cv2.INTER_CUBIC)
mn, mm = mid.shape
mdet = np.zeros_like(mid)
amp = 40.0
for o in range(5):
    c = 20 * 2 ** o
    g = rng.standard_normal((c + 3, c + 3)).astype(np.float32)
    g = cv2.resize(g, (mm + mm // c * 3, mn + mn // c * 3), interpolation=cv2.INTER_CUBIC)[:mn, :mm]
    mdet += amp * (0.5 - np.abs(np.tanh(g)))
    amp *= 0.5
gy, gx = np.gradient(mid, MS)
mid = mid + mdet * np.clip(np.hypot(gx, gy) * 1.5, 0.3, 1.5)
np.save(OUT.replace('.npy', '_mid.npy'), (mid - z0 - 4).astype(np.float32))

# ---- far mosaic: even 240 m grid, centred on the same point
FS = 240.0
fw = int(mos.shape[1] * DX / FS)
fh = int(mos.shape[0] * DY / FS)
far = cv2.resize(mos, (fw, fh), interpolation=cv2.INTER_AREA)
np.save(OUT.replace('.npy', '_far.npy'), (far - z0 - 20).astype(np.float32))
# far grid centre vs the near centre (metres, x east, y north)
ox = (mos.shape[1] / 2 - cx) * DX
oy = (cy - mos.shape[0] / 2) * DY
print('Z0', round(z0, 1), 'near', near.shape, 'far', far.shape, f'FAR_OFFSET={ox:.0f},{oy:.0f}', 'FAR_SPACING', FS)
