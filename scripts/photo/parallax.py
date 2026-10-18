# Move a camera through one real photograph with true parallax.
#
# The photo is sliced by distance into fronto-parallel image layers (like a
# multiplane camera), each at its real distance, so that from the photo's own
# viewpoint the stack is exactly the photo. Every layer also covers everything
# nearer than itself: where a near object stands in front of something much
# farther, that part is painted in from the layer's own surroundings, so a
# moving camera reveals plausible background instead of a hole; where the
# nearer pixels are the same surface carrying on (a snowfield running toward
# the camera) the photo itself is kept, so the ground never tears.
#
# A camera pose (position in metres, yaw/pitch/roll in degrees, zoom) maps each
# layer by an exact plane homography: H = K' R (z I - c e3^T) K^-1.
#
# Usage as a module: build(img, Z) -> layers, render(layers, K, pose, size)
import numpy as np, cv2

def anchors_to_z(d, anchors):
    """relative disparity -> metres, interpolated in log space between (disparity, metres) anchors"""
    ad = np.array([a for a, _ in anchors], np.float32)
    az = np.log(np.array([z for _, z in anchors], np.float32))
    return np.exp(np.interp(d, ad, az)).astype(np.float32)

def pushpull(x, valid):
    x = x.astype(np.float32)
    w = valid.astype(np.float32)[..., None]
    levels = []
    cx, cw = x * w, w
    while max(cx.shape[:2]) > 1:
        levels.append((cx, cw))
        h2, w2 = max(1, (cx.shape[0] + 1) // 2), max(1, (cx.shape[1] + 1) // 2)
        cx = cv2.resize(cx, (w2, h2), interpolation=cv2.INTER_AREA).reshape(h2, w2, -1)
        cw = cv2.resize(cw, (w2, h2), interpolation=cv2.INTER_AREA).reshape(h2, w2, 1)
    mean = (x * w).reshape(-1, x.shape[2]).sum(0) / max(float(w.sum()), 1e-6)
    cur = np.where(cw > 1e-6, cx / np.maximum(cw, 1e-6), mean)
    for lx, lw in reversed(levels):
        up = cv2.resize(cur, (lx.shape[1], lx.shape[0]), interpolation=cv2.INTER_LINEAR).reshape(lx.shape)
        a = np.clip(lw * 4, 0, 1)
        cur = (lx / np.maximum(lw, 1e-6)) * a + up * (1 - a)
    return cur

def texfill(img, hole_q, q, band=96):
    """paint a hole with real texture copied from around it (shift-map) at half size, in a
    band along its rim (all a moving camera can ever uncover); deeper inside, a smooth fill.
    img: full-size uint8 BGR; hole_q: bool at 1/q size. Returns float32 BGR at full size."""
    H, W = img.shape[:2]
    h2, w2 = H // 2, W // 2
    half = cv2.resize(img, (w2, h2), interpolation=cv2.INTER_AREA)
    hole = cv2.resize(hole_q.astype(np.uint8), (w2, h2), interpolation=cv2.INTER_NEAREST) > 0
    dist = cv2.distanceTransform(hole.astype(np.uint8), cv2.DIST_L2, 3)
    smooth = pushpull(half.astype(np.float32), ~hole)
    pre = np.where((hole & (dist > band))[..., None], smooth, half).clip(0, 255).astype(np.uint8)
    rim = hole & (dist <= band)
    lab = cv2.cvtColor(pre, cv2.COLOR_BGR2LAB)
    out = np.zeros_like(lab)
    cv2.xphoto.inpaint(lab, (~rim).astype(np.uint8), out, cv2.xphoto.INPAINT_SHIFTMAP)
    out = cv2.cvtColor(out, cv2.COLOR_LAB2BGR).astype(np.float32)
    out = np.where(rim[..., None], cv2.bilateralFilter(out, 5, 20, 3), pre.astype(np.float32))
    return cv2.resize(out, (W, H), interpolation=cv2.INTER_CUBIC)

def build(img, Z, cuts, margin=0.2, soft=0.08, q=4):
    """img: HxWx3 uint8 (BGR), Z: HxW metres. cuts: layer boundaries in metres, far to near.
    margin: log-distance by which a pixel must be nearer than the layer's near bound to
    be painted out of it. Returns [(premultiplied RGBA float32, z, log-depth at 1/q size)], far to near."""
    H, W = Z.shape
    lz = np.log(Z)
    guide = cv2.resize(img, (W // 2, H // 2), interpolation=cv2.INTER_AREA).astype(np.float32) / 255

    def snap(m):
        s = cv2.resize(m.astype(np.float32), (W // 2, H // 2), interpolation=cv2.INTER_AREA)
        s = cv2.ximgproc.guidedFilter(guide, s, 4, 2e-4)
        return np.clip(cv2.resize(s, (W, H), interpolation=cv2.INTER_LINEAR), 0, 1)

    # "nearer than cut k" (soft in log metres), far to near
    near = [snap(np.clip((np.log(c) - lz) / soft + 0.5, 0, 1)) for c in cuts]
    small = cv2.resize(img, (W // q, H // q), interpolation=cv2.INTER_AREA).astype(np.float32)
    lzs = cv2.resize(lz, (W // q, H // q), interpolation=cv2.INTER_AREA)
    layers = []
    bounds = [np.inf] + list(cuts) + [0.0]
    for i in range(len(cuts) + 1):
        hi, lo = bounds[i], bounds[i + 1]                 # this layer holds lo..hi metres
        own_sel = (Z <= hi) & (Z > lo)
        z = float(np.median(Z[own_sel])) if own_sel.any() else (lo + hi) / 2
        if not np.isfinite(z):
            z = float(np.percentile(Z, 99))
        alpha = np.ones((H, W), np.float32) if i == 0 else near[i - 1]
        # everything clearly nearer than this layer is painted out with texture
        # copied from the layer itself; nearer layers cover it, and where they
        # slide apart the gap shows more of this layer's own surface
        aq = cv2.resize(alpha, (W // q, H // q), interpolation=cv2.INTER_AREA) > 0.5
        if lo <= 0:
            ld = pushpull(lzs[..., None], aq)[..., 0]
            layers.append((np.dstack([img.astype(np.float32) / 255 * alpha[..., None], alpha]).astype(np.float32), z, ld.astype(np.float32)))
            continue
        core = lzs < np.log(lo) - margin
        # grow the cut-out over the object's colour-fringed rim on this layer's own
        # side, never into nearer pixels a nearer layer only partly covers
        occ = core | ((cv2.dilate(core.astype(np.uint8), np.ones((5, 5))) > 0) & (lzs >= np.log(lo)))
        if occ.any():
            fill = texfill(img, occ, q)
            m = cv2.resize(occ.astype(np.float32), (W, H), interpolation=cv2.INTER_LINEAR)
            m = cv2.GaussianBlur(m, (0, 0), 2)[..., None]
            colour = img.astype(np.float32) * (1 - m) + fill * m
        else:
            colour = img.astype(np.float32)
        # the layer's surface: its own (and same-surface) depth, carried on smoothly
        # under the painted-out part and past its edges
        valid = aq & ~occ
        ld = pushpull(lzs[..., None], valid)[..., 0]
        ld = np.where(valid, lzs, ld)
        rgba = np.dstack([colour / 255 * alpha[..., None], alpha]).astype(np.float32)
        layers.append((rgba, z, ld.astype(np.float32)))
    return layers

def rot(yaw, pitch, roll):
    y, p, r = np.radians([yaw, pitch, roll])
    Ry = np.array([[np.cos(y), 0, -np.sin(y)], [0, 1, 0], [np.sin(y), 0, np.cos(y)]])
    Rx = np.array([[1, 0, 0], [0, np.cos(p), np.sin(p)], [0, -np.sin(p), np.cos(p)]])
    Rz = np.array([[np.cos(r), -np.sin(r), 0], [np.sin(r), np.cos(r), 0], [0, 0, 1]])
    return Rz @ Rx @ Ry

def render(layers, K, pose, size, center=None, q=4, iters=6):
    """pose: dict pos [x right, y down, z forward] metres, yaw (right +), pitch (up +), roll, zoom.
    center: source point the neutral camera looks at; size: (w, h) output px.
    Each layer is a surface with its own per-pixel depth: for every output pixel the
    source pixel landing on it is found by Newton steps from the layer's mean plane."""
    w, h = size
    f = K[0, 0] * pose.get('zoom', 1.0) * pose.get('scale', 1.0)
    cx, cy = (center if center is not None else (K[0, 2], K[1, 2]))
    K2 = np.array([[f, 0, w / 2], [0, f, h / 2], [0, 0, 1]])
    Kc = K.copy()
    Kc[0, 2], Kc[1, 2] = cx, cy
    Ki = np.linalg.inv(Kc)
    R = rot(pose.get('yaw', 0), pose.get('pitch', 0), pose.get('roll', 0))
    c = np.array(pose.get('pos', [0, 0, 0]), np.float64)[:, None]
    e3 = np.array([[0, 0, 1]], np.float64)
    M = K2 @ R                                            # world (photo camera frame) -> output px
    # output grid at 1/q
    gw, gh = w // q + 2, h // q + 2
    ux, uy = np.meshgrid(np.arange(gw, dtype=np.float32) * q, np.arange(gh, dtype=np.float32) * q)
    out = np.zeros((h, w, 4), np.float32)
    for i, (rgba, z, ld) in enumerate(layers):
        fade = np.clip((z - c[2, 0] - 0.15) / 0.3, 0, 1)
        if fade <= 0:
            continue
        Hm = M @ (z * np.eye(3) - c @ e3) @ Ki             # mean plane: source px -> output px
        Hi = np.linalg.inv(Hm)
        def hap(A, x, y):
            d = A[2, 0] * x + A[2, 1] * y + A[2, 2]
            return (A[0, 0] * x + A[0, 1] * y + A[0, 2]) / d, (A[1, 0] * x + A[1, 1] * y + A[1, 2]) / d
        sx, sy = hap(Hi, ux, uy)                           # initial guess
        hiH, hiW = ld.shape
        dq = rgba.shape[0] / hiH                           # source px per depth px
        for _ in range(iters if i > 0 else 0):
            zz = np.exp(cv2.remap(ld, (sx / dq).astype(np.float32), (sy / dq).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE))
            # project source px (sx, sy) at depth zz
            rx = Ki[0, 0] * sx + Ki[0, 1] * sy + Ki[0, 2]
            ry = Ki[1, 0] * sx + Ki[1, 1] * sy + Ki[1, 2]
            X = rx * zz - c[0, 0]; Y = ry * zz - c[1, 0]; Zc = zz - c[2, 0]
            Zc = np.maximum(Zc, 0.05)
            px = (M[0, 0] * X + M[0, 1] * Y + M[0, 2] * Zc) / (M[2, 0] * X + M[2, 1] * Y + M[2, 2] * Zc)
            py = (M[1, 0] * X + M[1, 1] * Y + M[1, 2] * Zc) / (M[2, 0] * X + M[2, 1] * Y + M[2, 2] * Zc)
            # Newton step using the mean plane's inverse as the Jacobian
            ax, ay = hap(Hi, ux, uy)
            bx, by = hap(Hi, px, py)
            sx = sx + (ax - bx)
            sy = sy + (ay - by)
        mx = cv2.resize(sx.astype(np.float32), (gw * q, gh * q), interpolation=cv2.INTER_LINEAR)[:h, :w]
        my = cv2.resize(sy.astype(np.float32), (gw * q, gh * q), interpolation=cv2.INTER_LINEAR)[:h, :w]
        border = cv2.BORDER_REFLECT if i == 0 else cv2.BORDER_CONSTANT
        if i == 0:
            lw = cv2.warpPerspective(rgba, Hm, (w, h), flags=cv2.INTER_LINEAR, borderMode=border)
        else:
            lw = cv2.remap(rgba, mx, my, cv2.INTER_LINEAR, borderMode=border)
        out = lw * fade + out * (1 - lw[..., 3:4] * fade)
    return out[..., :3]
