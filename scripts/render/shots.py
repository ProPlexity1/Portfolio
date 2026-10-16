# The descent, as a list of camera shots for render.html (multiplane mode).
#
# World: metres, the photo was taken from the origin looking down +z, y up.
# The camera faces the summit the whole way and never turns round: it starts
# on the summit looking down at the boot prints, tilts up to the view, then
# pulls back out of the cloud and down the valley to him on the rock, ending
# exactly on the approved photograph.
#
# Usage: python3 shots.py <planes.json> <d|m> <out.json>
import json, math, sys

meta = json.load(open(sys.argv[1]))
fmt = sys.argv[2]
F = meta['focal']
CX, CY = meta['principal']
W, H = {'d': (2560, 1600), 'm': (1080, 2340)}[fmt]
ASPECT = W / H
VFOV = 2 * math.degrees(math.atan(CY / F))          # the photo's full height
# the approved framings are centred a little right of the photo's centre
FINAL_X = 4150 if fmt == 'd' else 4180
half_w = CY * ASPECT                                  # half the visible width in scene px
FINAL_SHIFT = -(FINAL_X - CX) / half_w

Z = {p['name']: p['z'] for p in meta['planes']}
# the summit: the top of the peak, which sits in the sky plane
SUMMIT = [(4300 - CX) / F * Z['sky'], (CY - 760) / F * Z['sky'], Z['sky'] - 2.0]
EYE = 1.7

def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

def plane_alpha(zc, hide=()):
    a = {}
    for p in meta['planes']:
        n = p['name']
        if n in hide:
            a[n] = 0.0
            continue
        r = (p['z'] - zc) / p['z']                    # share of its distance still in front of the camera
        if zc < 12:
            # the last approach: everything in front stays solid (no fills show)
            a[n] = 1.0 if p['z'] > zc * 1.05 + 0.3 else 0.0
        else:
            a[n] = max(0.0, min(1.0, (r - 0.12) / 0.23)) if n != 'backdrop' else 1.0
    return a

def cloud(file, centre, size, alpha=0.9, edge=0.0):
    """an upright cloud sheet facing the camera's direction (+z)"""
    x, y, z = centre
    w, h = size
    return {'tex': file, 'corners': [[x - w / 2, y + h / 2, z], [x + w / 2, y + h / 2, z], [x + w / 2, y - h / 2, z], [x - w / 2, y - h / 2, z]], 'alpha': alpha, 'edge': edge}

# clouds hanging in the valley along the way down (they pass by as the camera pulls back)
VALLEY_CLOUDS = [
    cloud('cloud-2.png', [1300, 650, 4300], [5600, 1500], 0.7),
    cloud('cloud-3.png', [-500, 420, 3300], [4200, 1150], 0.7),
    cloud('cloud-1.png', [700, 520, 2400], [3000, 1000], 0.8),
    cloud('cloud-0.png', [-650, 330, 1650], [2100, 720], 0.75),
    cloud('cloud-2.png', [520, 190, 1050], [1350, 470], 0.7),
]

def summit_set(pitch_deg):
    sx, sy, sz = SUMMIT
    cam = [sx, sy + EYE, sz - 0.25]
    sea = sy - 420
    def far(tex, cx, top, z, w, h):
        return {'tex': tex, 'corners': [[cx - w / 2, top, z], [cx + w / 2, top, z], [cx + w / 2, top - h, z], [cx - w / 2, top - h, z]], 'fog': [0.8, 0.84, 0.86, 0.28]}
    quads = [
        # distant sky beyond the summit
        {'tex': 'skydome.png', 'corners': [[sx - 70000, sy + 30000, sz + 45000], [sx + 70000, sy + 30000, sz + 45000], [sx + 70000, sea - 200, sz + 45000], [sx - 70000, sea - 200, sz + 45000]], 'order': 1e9},
        # far ranges rising out of the cloud
        far('peaks-left.png', sx - 9000, sy + 900, sz + 26000, 15000, 6700),
        far('peaks-right.png', sx + 7000, sy + 300, sz + 19000, 9000, 4050),
        # the sea of cloud below, hazing toward the horizon
        {'tex': 'cloudsea.png', 'repeat': True, 'uv': [0, 0, 30, 18], 'corners': [[sx - 70000, sea, sz + 44000], [sx + 70000, sea, sz + 44000], [sx + 70000, sea, sz - 3000], [sx - 70000, sea, sz - 3000]], 'fog': [0.8, 0.84, 0.86, 0.2]},
        # the summit: a small snowfield (the prints patch, scaled up and out of
        # focus) that drops away, then the patch with the prints
        {'tex': 'ground.png', 'uv': [0, 0, 1, 1], 'corners': [[sx - 9, sy - 0.03, sz + 6.5], [sx + 9, sy - 0.03, sz + 6.5], [sx + 9, sy - 0.03, sz - 8], [sx - 9, sy - 0.03, sz - 8]], 'order': 2, 'edge': 0.3},
        {'tex': 'ground.png', 'corners': [[sx - 2, sy, sz + 1.667], [sx + 2, sy, sz + 1.667], [sx + 2, sy, sz - 1.667], [sx - 2, sy, sz - 1.667]], 'order': 1, 'edge': 0.12},
    ]
    return {'pos': cam, 'yaw': 0.0, 'pitch': math.radians(pitch_deg), 'vfov': VFOV, 'shift': [0, 0], 'near': 0.05,
            'alpha': {p['name']: 0.0 for p in meta['planes']}, 'quads': quads}

DECK_Y = 280.0                                       # top of the cloud filling the valley

def deck(zc):
    """the cloud sea filling the valley, cut into strips between the planes so
    the painter's order hides exactly the part of each plane below it"""
    zs = sorted({p['z'] for p in meta['planes']} | {zc + 40, 30000})
    zs = [z for z in zs if z > zc + 30]
    strips = []
    for z0, z1 in zip([zc + 30] + zs[:-1], zs):
        if z1 - z0 < 1:
            continue
        w = z1 * 1.4
        tile = 900.0
        strips.append({'tex': 'cloudsea.png', 'repeat': True,
                       'uv': [-w / tile, z0 / tile, 2 * w / tile, (z1 - z0) / tile],
                       'corners': [[-w, DECK_Y, z1], [w, DECK_Y, z1], [w, DECK_Y, z0], [-w, DECK_Y, z0]],
                       'order': (z0 + z1) / 2 - zc, 'fog': [0.82, 0.85, 0.87, min(0.55, 0.12 + z0 / 16000)]})
    return strips

def above_cloud(zc, y):
    """high up the valley, above the cloud, looking at the summit"""
    pos = [0.0, y, zc]
    dx, dy, dz = SUMMIT[0] - pos[0], SUMMIT[1] * 0.8 - pos[1], SUMMIT[2] - pos[2]
    yaw = math.atan2(dx, dz)
    pitch = math.atan2(dy, math.hypot(dx, dz))
    alpha = plane_alpha(zc)
    # plane order by depth along z (cards are upright), so strips fall between them
    order = {p['name']: p['z'] - zc for p in meta['planes']}
    return {'pos': pos, 'yaw': yaw, 'pitch': pitch, 'vfov': VFOV, 'shift': [0, 0], 'alpha': alpha, 'order': order, 'quads': deck(zc)}

def in_cloud(seed):
    """inside the cloud: sheets right in front of the lens"""
    q = []
    for k, (dz, dx, dy) in enumerate([(26, -8, 2), (14, 6, -3), (7, -2, 1), (3.5, 1.5, -0.5)]):
        tex = f'cloud-{(seed + k) % 4}.png'
        q.append(cloud(tex, [dx, dy + 400, 5000 + dz], [dz * 3.4, dz * 1.6], 0.95))
    return {'pos': [0, 400, 5000], 'yaw': 0.0, 'pitch': 0.0, 'vfov': VFOV, 'shift': [0, 0], 'near': 0.05,
            'alpha': {p['name']: 0.0 for p in meta['planes']}, 'quads': [
                {'tex': 'skydome.png', 'corners': [[-400, 700, 5200], [400, 700, 5200], [400, 100, 5200], [-400, 100, 5200]], 'fog': [0.86, 0.88, 0.89, 0.8]}] + q}

def approach(zc, lift):
    """the last approach, low over the lake: everything in front is real photo"""
    pos = [0.0, lift * zc, zc]
    t = smooth(zc / 3.0) * 0.0
    return {'pos': pos, 'yaw': 0.0, 'pitch': 0.0, 'vfov': VFOV, 'shift': [FINAL_SHIFT, 0], 'alpha': plane_alpha(zc), 'quads': []}

SHOTS = [
    ('s00', 0.0, summit_set(-86)),
    ('s01', 0.4, summit_set(-52)),
    ('s02', 0.75, summit_set(-16)),
    ('s03', 1.0, summit_set(3)),
    ('s04', 1.5, in_cloud(0)),
    ('s05', 2.0, above_cloud(5200, 640)),
    ('s06', 3.0, above_cloud(3600, 560)),
    ('s07', 4.0, above_cloud(2400, 480)),
    ('s08', 4.7, above_cloud(1500, 420)),
    ('s09', 5.3, in_cloud(2)),
    ('s10', 6.0, approach(2.6, 0.12)),
    ('s11', 6.5, approach(1.2, 0.1)),
    ('s12', 7.0, approach(0.0, 0.0)),
]
out = []
for name, u, s in SHOTS:
    s.update({'name': name, 'u': u, 'w': W, 'h': H})
    out.append(s)
json.dump(out, open(sys.argv[3], 'w'))
print(len(out), 'shots', W, 'x', H, 'vfov', round(VFOV, 2), 'final shift', round(FINAL_SHIFT, 4), 'summit', [round(v, 1) for v in SUMMIT])
