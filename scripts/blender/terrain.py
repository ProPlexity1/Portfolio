# Real Naltar terrain for the summit and descent shots: the Copernicus 30 m
# elevation model (© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH
# 2014-2018, provided under COPERNICUS by the European Union and ESA) turned
# into a mesh, refined with fractal detail, shaded by altitude and slope with
# scanned rock and snow (Poly Haven, CC0), with a cloud layer and haze.
#
# Usage: blender -b --python terrain.py -- <heightfield.npy> <out.png> <w> <h> <samples> [shot]
#   (heightfield from heightfield.py; SPACING env = metres per sample)
import bpy, bmesh, sys, os, math, random
import numpy as np
from mathutils import Vector, Euler

argv = sys.argv[sys.argv.index('--') + 1:]
DEM, OUT, W, H, SPP = argv[0], argv[1], int(argv[2]), int(argv[3]), int(argv[4])
SHOT = argv[5] if len(argv) > 5 else 'summit'
ASSETS = os.environ.get('ASSETS', 'assets')

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SPP
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 4
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Medium High Contrast'
sc.view_settings.exposure = 0.0

def link(nt, a, b):
    nt.links.new(a, b)

# ------------------------------------------------------------------ terrain
sub = np.load(DEM).astype(np.float32)           # prepared by heightfield.py (metres above its lowest point)
SPACING = float(os.environ.get('SPACING', '15'))
n, m = sub.shape
z0 = float(os.environ.get('Z0', '0'))

def grid_object(name, Z, spacing, offset=(0, 0)):
    n_, m_ = Z.shape
    me = bpy.data.meshes.new(name)
    xs = (np.arange(m_) - m_ / 2) * spacing + offset[0]
    ys = (n_ / 2 - np.arange(n_)) * spacing + offset[1]
    X, Y = np.meshgrid(xs, ys)
    verts = np.stack([X, Y, Z], -1).reshape(-1, 3)
    idx = np.arange(n_ * m_).reshape(n_, m_)
    quads = np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], -1).reshape(-1, 4)
    me.vertices.add(len(verts))
    me.vertices.foreach_set('co', verts.ravel())
    me.loops.add(quads.size)
    me.loops.foreach_set('vertex_index', quads.ravel())
    me.polygons.add(len(quads))
    me.polygons.foreach_set('loop_start', np.arange(0, quads.size, 4))
    me.polygons.foreach_set('loop_total', np.full(len(quads), 4))
    me.update()
    me.polygons.foreach_set('use_smooth', np.ones(len(quads), bool))
    ob = bpy.data.objects.new(name, me)
    sc.collection.objects.link(ob)
    return ob

terrain = grid_object('terrain', sub, SPACING)
far_path = DEM.replace('.npy', '_far.npy')
far = None
if os.path.exists(far_path):
    fo = [float(v) for v in os.environ.get('FAR_OFFSET', '0,0').split(',')]
    far = grid_object('far', np.load(far_path).astype(np.float32), float(os.environ.get('FAR_SPACING', '240')), (fo[0], fo[1]))
    mid_path = DEM.replace('.npy', '_mid.npy')
    if os.path.exists(mid_path):
        midob = grid_object('mid', np.load(mid_path).astype(np.float32), 60.0)
        midob.data.materials.append(TM_PLACEHOLDER) if False else None
    sm = far.modifiers.new('smooth', 'SUBSURF')
    sm.levels = sm.render_levels = 1

def height_at(x, y):
    j = int(round(x / SPACING + m / 2))
    i = int(round(n / 2 - y / SPACING))
    return float(sub[min(max(i, 0), n - 1), min(max(j, 0), m - 1)])

# ------------------------------------------------------------------ material
def tex(nt, path, colour, scale, vec):
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = bpy.data.images.load(path)
    t.image.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
    t.projection = 'BOX'
    t.projection_blend = 0.25
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / scale,) * 3
    link(nt, vec, mp.inputs['Vector'])
    link(nt, mp.outputs['Vector'], t.inputs['Vector'])
    return t

def terrain_material():
    m_ = bpy.data.materials.new('terrain')
    m_.use_nodes = True
    nt = m_.node_tree
    out = nt.nodes['Material Output']
    nt.nodes.remove(nt.nodes['Principled BSDF'])
    tc = nt.nodes.new('ShaderNodeTexCoord')
    pos = tc.outputs['Object']
    A = os.path.join(ASSETS, 'aerial_rocks_02', 'aerial_rocks_02_')
    S = os.path.join(ASSETS, 'snow_field_aerial', 'snow_field_aerial_')
    rock = nt.nodes.new('ShaderNodeBsdfPrincipled')
    R = os.path.join(ASSETS, 'rock_face_03', 'rock_face_03_')
    rd = tex(nt, R + 'Diffuse.png', True, 120, pos)
    rd2 = tex(nt, A + 'Diffuse.png', True, 35, pos)
    rmix = nt.nodes.new('ShaderNodeMix'); rmix.data_type = 'RGBA'; rmix.blend_type = 'OVERLAY'
    rmix.inputs['Factor'].default_value = 0.25
    link(nt, rd.outputs['Color'], rmix.inputs['A']); link(nt, rd2.outputs['Color'], rmix.inputs['B'])
    dark = nt.nodes.new('ShaderNodeHueSaturation')
    dark.inputs['Value'].default_value = 0.42
    dark.inputs['Saturation'].default_value = 0.25
    link(nt, rmix.outputs['Result'], dark.inputs['Color'])
    link(nt, dark.outputs['Color'], rock.inputs['Base Color'])
    rock.inputs['Roughness'].default_value = 0.9
    rn = tex(nt, R + 'nor_gl.png', False, 60, pos)
    nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.6
    link(nt, rn.outputs['Color'], nm.inputs['Color']); link(nt, nm.outputs['Normal'], rock.inputs['Normal'])

    snow = nt.nodes.new('ShaderNodeBsdfPrincipled')
    sd = tex(nt, S + 'Diffuse.png', True, 220, pos)
    sb = nt.nodes.new('ShaderNodeHueSaturation')
    sb.inputs['Value'].default_value = 1.25
    sb.inputs['Saturation'].default_value = 0.4
    SN = os.path.join(ASSETS, 'snow_02', 'snow_02_')
    sdn = tex(nt, SN + 'Diffuse.png', True, 6.0, pos)
    cam_ = nt.nodes.new('ShaderNodeCameraData')
    near = nt.nodes.new('ShaderNodeMapRange')
    near.inputs['From Min'].default_value = 40
    near.inputs['From Max'].default_value = 160
    link(nt, cam_.outputs['View Distance'], near.inputs['Value'])
    sblend = nt.nodes.new('ShaderNodeMix'); sblend.data_type = 'RGBA'
    link(nt, near.outputs['Result'], sblend.inputs['Factor'])
    link(nt, sdn.outputs['Color'], sblend.inputs['A'])
    link(nt, sd.outputs['Color'], sblend.inputs['B'])
    link(nt, sblend.outputs['Result'], sb.inputs['Color'])
    link(nt, sb.outputs['Color'], snow.inputs['Base Color'])
    snow.inputs['Roughness'].default_value = 0.6
    snow.inputs['Subsurface Weight'].default_value = 0.2
    sn = tex(nt, S + 'nor_gl.png', False, 220, pos)
    snm = nt.nodes.new('ShaderNodeNormalMap'); snm.inputs['Strength'].default_value = 0.6
    link(nt, sn.outputs['Color'], snm.inputs['Color']); link(nt, snm.outputs['Normal'], snow.inputs['Normal'])

    # snow holds where the ground is not too steep and high enough; noisy edges
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    link(nt, geo.outputs['Normal'], sep.inputs[0])
    flat = nt.nodes.new('ShaderNodeMapRange')
    flat.inputs['From Min'].default_value = 0.58
    flat.inputs['From Max'].default_value = 0.74
    link(nt, sep.outputs['Z'], flat.inputs['Value'])
    sp = nt.nodes.new('ShaderNodeSeparateXYZ'); link(nt, pos, sp.inputs[0])
    alt = nt.nodes.new('ShaderNodeMapRange')
    alt.inputs['From Min'].default_value = 300
    alt.inputs['From Max'].default_value = 900
    link(nt, sp.outputs['Z'], alt.inputs['Value'])
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 0.02
    noise.inputs['Detail'].default_value = 10
    link(nt, pos, noise.inputs['Vector'])
    nadd = nt.nodes.new('ShaderNodeMath'); nadd.operation = 'ADD'
    link(nt, flat.outputs['Result'], nadd.inputs[0])
    nsub = nt.nodes.new('ShaderNodeMath'); nsub.operation = 'SUBTRACT'
    link(nt, noise.outputs['Fac'], nsub.inputs[0]); nsub.inputs[1].default_value = 0.5
    link(nt, nsub.outputs[0], nadd.inputs[1])
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.use_clamp = True
    link(nt, nadd.outputs[0], mul.inputs[0]); link(nt, alt.outputs['Result'], mul.inputs[1])
    sharpen = nt.nodes.new('ShaderNodeMapRange')
    sharpen.inputs['From Min'].default_value = 0.35
    sharpen.inputs['From Max'].default_value = 0.6
    link(nt, mul.outputs[0], sharpen.inputs['Value'])
    # gullies: noise squashed along x/y and stretched in z runs down steep faces
    gm = nt.nodes.new('ShaderNodeMapping')
    gm.inputs['Scale'].default_value = (1 / 14.0, 1 / 14.0, 1 / 160.0)
    link(nt, pos, gm.inputs['Vector'])
    gn = nt.nodes.new('ShaderNodeTexNoise')
    gn.inputs['Scale'].default_value = 1.0
    gn.inputs['Detail'].default_value = 6
    gn.inputs['Roughness'].default_value = 0.6
    link(nt, gm.outputs['Vector'], gn.inputs['Vector'])
    gr = nt.nodes.new('ShaderNodeMapRange')
    gr.inputs['From Min'].default_value = 0.42
    gr.inputs['From Max'].default_value = 0.62
    link(nt, gn.outputs['Fac'], gr.inputs['Value'])
    # snow fills the gullies on steep ground
    gs = nt.nodes.new('ShaderNodeMath'); gs.operation = 'MULTIPLY'
    link(nt, gr.outputs['Result'], gs.inputs[0]); gs.inputs[1].default_value = 0.55
    snow_f = nt.nodes.new('ShaderNodeMath'); snow_f.operation = 'ADD'; snow_f.use_clamp = True
    link(nt, sharpen.outputs['Result'], snow_f.inputs[0]); link(nt, gs.outputs[0], snow_f.inputs[1])
    am = nt.nodes.new('ShaderNodeMath'); am.operation = 'MULTIPLY'; am.use_clamp = True
    link(nt, snow_f.outputs[0], am.inputs[0]); link(nt, alt.outputs['Result'], am.inputs[1])
    # rock: ribs lighter, gullies darker
    rb = nt.nodes.new('ShaderNodeMix'); rb.data_type = 'RGBA'; rb.blend_type = 'MULTIPLY'
    link(nt, gr.outputs['Result'], rb.inputs['Factor'])
    link(nt, dark.outputs['Color'], rb.inputs['A'])
    rb.inputs['B'].default_value = (0.45, 0.45, 0.47, 1)
    link(nt, rb.outputs['Result'], rock.inputs['Base Color'])
    mix = nt.nodes.new('ShaderNodeMixShader')
    link(nt, am.outputs[0], mix.inputs['Fac'])
    link(nt, rock.outputs[0], mix.inputs[1]); link(nt, snow.outputs[0], mix.inputs[2])
    link(nt, mix.outputs[0], out.inputs['Surface'])
    return m_

TM = terrain_material()
for ob in bpy.data.objects:
    if ob.name in ('terrain', 'mid', 'far'):
        ob.data.materials.append(TM)

# ------------------------------------------------------------------ sky, sun, haze, cloud
w = bpy.data.worlds.new('sky')
sc.world = w
w.use_nodes = True
nt_w = w.node_tree
env = nt_w.nodes.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(os.path.join(ASSETS, 'hdri', os.environ.get('SKY', 'kloofendal_48d_partly_cloudy_puresky') + '.hdr'))
tcw = nt_w.nodes.new('ShaderNodeTexCoord')
mpw = nt_w.nodes.new('ShaderNodeMapping')
link(nt_w, tcw.outputs['Generated'], mpw.inputs['Vector'])
link(nt_w, mpw.outputs['Vector'], env.inputs['Vector'])
link(nt_w, env.outputs['Color'], nt_w.nodes['Background'].inputs[0])
nt_w.nodes['Background'].inputs[1].default_value = 1.0
class _Sky:  # the HDRI's own sun; rotate the whole sky instead
    sun_rotation = 0
sky = _Sky()
sun = bpy.data.lights.new('sun', 'SUN')
sun.energy = float(os.environ.get('SUN', '2.0'))
sun.angle = math.radians(1.5)
sun.color = (1.0, 0.95, 0.88)
so = bpy.data.objects.new('sun', sun)
so.rotation_euler = Euler((math.radians(90 - 14), 0, math.radians(200 - 90)))
sc.collection.objects.link(so)

def volume_box(name, loc, size, density, noise_scale=None, lo=0.5, hi=0.7, colour=(0.92, 0.94, 0.97), falloff=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    c = bpy.context.object
    c.name = name
    c.scale = size
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.remove(nt.nodes['Principled BSDF'])
    v = nt.nodes.new('ShaderNodeVolumePrincipled')
    v.inputs['Color'].default_value = (*colour, 1)
    v.inputs['Anisotropy'].default_value = 0.4
    if noise_scale:
        tc = nt.nodes.new('ShaderNodeTexCoord')
        nz = nt.nodes.new('ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = noise_scale
        nz.inputs['Detail'].default_value = 12
        nz.inputs['Roughness'].default_value = 0.62
        link(nt, tc.outputs['Object'], nz.inputs['Vector'])
        # thin out toward the top and bottom of the box (a layer, not a block)
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        link(nt, tc.outputs['Object'], sep.inputs[0])
        prof = nt.nodes.new('ShaderNodeMath'); prof.operation = 'ABSOLUTE'
        link(nt, sep.outputs['Z'], prof.inputs[0])
        fall = nt.nodes.new('ShaderNodeMapRange')
        fall.inputs['From Min'].default_value = 0.15
        fall.inputs['From Max'].default_value = 0.5
        fall.inputs['To Min'].default_value = 0.0
        fall.inputs['To Max'].default_value = 0.35
        link(nt, prof.outputs[0], fall.inputs['Value'])
        sub_ = nt.nodes.new('ShaderNodeMath'); sub_.operation = 'ADD'
        link(nt, nz.outputs['Fac'], sub_.inputs[0]); link(nt, fall.outputs['Result'], sub_.inputs[1])
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['From Min'].default_value = lo
        mr.inputs['From Max'].default_value = hi
        mr.inputs['To Max'].default_value = density
        inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
        link(nt, sub_.outputs[0], inv.inputs[1])
        link(nt, inv.outputs[0], mr.inputs['Value'])
        link(nt, mr.outputs['Result'], v.inputs['Density'])
    elif falloff:
        # thins out with height: dense in the valleys, gone high up
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        link(nt, geo.outputs['Position'], sep.inputs[0])
        k = nt.nodes.new('ShaderNodeMath'); k.operation = 'MULTIPLY'
        link(nt, sep.outputs['Z'], k.inputs[0]); k.inputs[1].default_value = -1.0 / falloff
        e = nt.nodes.new('ShaderNodeMath'); e.operation = 'EXPONENT'
        link(nt, k.outputs[0], e.inputs[0])
        d = nt.nodes.new('ShaderNodeMath'); d.operation = 'MULTIPLY'
        link(nt, e.outputs[0], d.inputs[0]); d.inputs[1].default_value = density
        link(nt, d.outputs[0], v.inputs['Density'])
    else:
        v.inputs['Density'].default_value = density
    link(nt, v.outputs[0], nt.nodes['Material Output'].inputs['Volume'])
    c.data.materials.append(mat)
    return c

span = 400000.0
valley = float(np.percentile(sub, 8))
peaks = float(np.percentile(sub, 97))
# aerial haze over the whole terrain
if not os.environ.get('NOHAZE'):
    volume_box('haze', (0, 0, 6000), (span, span, 12500), float(os.environ.get('HAZE', '0.00003')), colour=(0.55, 0.7, 0.9), falloff=2600.0)
# a cloud layer lying in the valleys, below the summits
cloud_z = valley + (peaks - valley) * 0.45
if os.environ.get('CLOUD'):
    volume_box('cloud', (0, 0, cloud_z), (span, span, 650), 0.02, noise_scale=40.0, lo=0.46, hi=0.6)

# ------------------------------------------------------------------ camera
cam_data = bpy.data.cameras.new('cam')
cam = bpy.data.objects.new('cam', cam_data)
sc.collection.objects.link(cam)
sc.camera = cam
cam_data.clip_end = 250000
cam_data.lens = 24

# the summit: highest point in the middle third
mid = sub[n // 3:2 * n // 3, m // 3:2 * m // 3]
i, j = np.unravel_index(np.argmax(mid), mid.shape)
i += n // 3
j += m // 3
sx, sy = (j - m / 2) * SPACING, (n / 2 - i) * SPACING
sz = float(sub[i, j])
# look toward the deepest ground within 6 km
best = None
for a in np.linspace(0, 2 * math.pi, 72, endpoint=False):
    hs = [height_at(sx + math.cos(a) * r, sy + math.sin(a) * r) for r in np.linspace(1500, 6000, 10)]
    score = -np.mean(hs)
    if best is None or score > best[0]:
        best = (score, a)
yaw = best[1]
if os.environ.get('SX'):
    sx, sy, yaw = float(os.environ['SX']), float(os.environ['SY']), float(os.environ['YAW'])
    sz = height_at(sx, sy)
print('SUMMIT', round(sx), round(sy), round(sz + z0), 'yaw', round(math.degrees(yaw)))
# stand just behind the top, eye a little above it, looking down the valley
# walk out from the top to where the ground falls away: the spur hangs off that edge
edge = 0.0
while edge < 400 and height_at(sx + math.cos(yaw) * edge, sy + math.sin(yaw) * edge) > sz - 10:
    edge += 2.0
back = float(os.environ.get('BACK', '5')) - edge
bx_, by_ = sx - math.cos(yaw) * back, sy - math.sin(yaw) * back
print('EDGE', edge)
base = Vector((bx_, by_, max(sz, height_at(bx_, by_)) + float(os.environ.get('EYE', '2.2'))))
fwd = Vector((math.cos(yaw), math.sin(yaw), 0))
up = Vector((0, 0, 1))
PITCH = math.radians(76)

# him on the rock spur: a card cut from his own summit clip, set out over the
# drop in front of the camera, square to the opening view
SPUR = os.environ.get('SPUR')
CARD_D = 6.0                                  # metres in front of the opening camera
HFOV = math.radians(68)                       # the phone's view: the card fills the frame
if SPUR:
    img = bpy.data.images.load(SPUR)
    cw = 2 * CARD_D * math.tan(HFOV / 2)
    ch = cw * img.size[1] / img.size[0]
    me_ = bpy.data.meshes.new('spur')
    me_.from_pydata([(-0.5, -0.5, 0), (0.5, -0.5, 0), (0.5, 0.5, 0), (-0.5, 0.5, 0)], [], [(0, 1, 2, 3)])
    uv = me_.uv_layers.new(name='UVMap')
    for li, (u_, v_) in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv.data[li].uv = (u_, v_)
    card = bpy.data.objects.new('spur', me_)
    sc.collection.objects.link(card)
    card.scale = (cw, ch, 1)
    rot = Euler((PITCH, 0, yaw - math.pi / 2))
    card.rotation_euler = rot
    view = rot.to_matrix() @ Vector((0, 0, -1))
    card.location = base + view * CARD_D
    mat = bpy.data.materials.new('spur')
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = img
    # match the render's cool overcast light
    hsv = nt.nodes.new('ShaderNodeHueSaturation')
    hsv.inputs['Saturation'].default_value = 0.55
    hsv.inputs['Value'].default_value = 0.92
    link(nt, t.outputs['Color'], hsv.inputs['Color'])
    cool = nt.nodes.new('ShaderNodeMix'); cool.data_type = 'RGBA'; cool.blend_type = 'MULTIPLY'
    cool.inputs['Factor'].default_value = 1.0
    link(nt, hsv.outputs['Color'], cool.inputs['A'])
    cool.inputs['B'].default_value = (0.86, 0.93, 1.0, 1)
    emit = nt.nodes.new('ShaderNodeEmission')
    link(nt, cool.outputs['Result'], emit.inputs['Color'])
    emit.inputs['Strength'].default_value = float(os.environ.get('SPUR_GAIN', '1.0'))
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix_ = nt.nodes.new('ShaderNodeMixShader')
    link(nt, t.outputs['Alpha'], mix_.inputs['Fac'])
    link(nt, tr.outputs[0], mix_.inputs[1])
    link(nt, emit.outputs[0], mix_.inputs[2])
    link(nt, mix_.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    mat.blend_method = 'HASHED'
    me_.materials.append(mat)
    card.visible_shadow = False
    # the spur grows out of a big rock: a scanned boulder (Poly Haven boulder_01)
    # sunk under the card's cut-off left edge
    bpath = os.path.join(ASSETS, 'boulder_01', 'boulder_01.blend')
    with bpy.data.libraries.load(bpath, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n == 'boulder_01_LOD0']
    rock = dst.objects[0]
    sc.collection.objects.link(rock)
    right = rot.to_matrix() @ Vector((1, 0, 0))
    upv = rot.to_matrix() @ Vector((0, 1, 0))
    # the spur's root: where its left edge meets the frame, carried back to the ridge
    root = card.location - right * (cw * 0.5) - upv * (ch * 0.18)
    gz = height_at(root.x, root.y)
    print('ROOT', round(root.z - gz, 1), 'm above ground')
    rock.location = (root.x, root.y, min(root.z, gz + 0.6) - 1.2)
    rock.scale = (4.2, 4.2, 3.6)
    extra = []
    for k_, (ox_, oy_, sc_) in enumerate([(-3.0, -2.5, 3.2), (2.0, -4.0, 2.6), (-5.5, 1.0, 2.8)]):
        r2 = rock.copy()
        r2.data = rock.data
        sc.collection.objects.link(r2)
        p2 = root - right * ox_ * -1 + fwd * oy_
        r2.location = (p2.x, p2.y, height_at(p2.x, p2.y) - 0.6)
        r2.scale = (sc_, sc_, sc_ * 0.8)
        r2.rotation_euler = (0, 0, yaw + k_ * 1.7)
    for slot in rock.material_slots:
        nt_r = slot.material.node_tree
        br = next(n for n in nt_r.nodes if n.type == 'BSDF_PRINCIPLED')
        if br.inputs['Base Color'].links:
            src_ = br.inputs['Base Color'].links[0].from_socket
            hs = nt_r.nodes.new('ShaderNodeHueSaturation')
            hs.inputs['Saturation'].default_value = 0.3
            hs.inputs['Value'].default_value = 1.1
            link(nt_r, src_, hs.inputs['Color'])
            link(nt_r, hs.outputs['Color'], br.inputs['Base Color'])
    rock.rotation_euler = (0, 0, yaw)

HIM = os.environ.get('HIM')
him_pos = None
if HIM:
    # ---- the spur: a tapering stone horn growing out of the edge, over the drop
    import random as _r
    rr = _r.Random(4)
    ex, ey = sx + math.cos(yaw) * edge, sy + math.sin(yaw) * edge
    side = math.radians(28)                                  # points out a little to the right
    d = Vector((math.cos(yaw - side), math.sin(yaw - side), math.tan(math.radians(9)))).normalized()
    root = Vector((ex - math.cos(yaw) * 2.5, ey - math.sin(yaw) * 2.5, 0))
    root.z = height_at(root.x, root.y) - 0.4
    L, R0, R1, RINGS, SEG = 8.5, 1.25, 0.42, 28, 20
    a_ = d.orthogonal().normalized()
    b_ = d.cross(a_).normalized()
    verts, faces = [], []
    for i in range(RINGS + 1):
        t = i / RINGS
        r = R0 + (R1 - R0) * t ** 0.8
        if t > 0.9:
            r *= math.sqrt(max(0.0, 1 - ((t - 0.9) / 0.1) ** 2)) * 0.9 + 0.1
        c = root + d * (L * t) + Vector((0, 0, -0.35 * math.sin(t * math.pi)))
        for j in range(SEG):
            ang = 2 * math.pi * j / SEG
            k = 1 + 0.12 * math.sin(ang * 3 + i * 0.7) + rr.uniform(-0.05, 0.05)
            flat = 0.78 if math.sin(ang) > 0 else 1.0        # a flatter top to sit on
            verts.append(c + (a_ * math.cos(ang) + b_ * math.sin(ang) * flat) * r * k)
    for i in range(RINGS):
        for j in range(SEG):
            q = i * SEG
            faces.append((q + j, q + (j + 1) % SEG, q + SEG + (j + 1) % SEG, q + SEG + j))
    tip = len(verts)
    verts.append(root + d * (L * 1.01))
    for j in range(SEG):
        faces.append((RINGS * SEG + j, RINGS * SEG + (j + 1) % SEG, tip))
    me_s = bpy.data.meshes.new('spur')
    me_s.from_pydata([tuple(v) for v in verts], [], faces)
    me_s.polygons.foreach_set('use_smooth', [True] * len(me_s.polygons))
    spur = bpy.data.objects.new('spur', me_s)
    sc.collection.objects.link(spur)
    sub_ = spur.modifiers.new('sub', 'SUBSURF'); sub_.levels = sub_.render_levels = 2
    sm_ = bpy.data.materials.new('spur_rock')
    sm_.use_nodes = True
    nt = sm_.node_tree
    bs = nt.nodes['Principled BSDF']
    tc_ = nt.nodes.new('ShaderNodeTexCoord')
    R_ = os.path.join(ASSETS, 'rock_face_03', 'rock_face_03_')
    rdif = tex(nt, R_ + 'Diffuse.png', True, 2.2, tc_.outputs['Object'])
    tint = nt.nodes.new('ShaderNodeMix'); tint.data_type = 'RGBA'; tint.blend_type = 'MULTIPLY'
    tint.inputs['Factor'].default_value = 1.0
    link(nt, rdif.outputs['Color'], tint.inputs['A'])
    tint.inputs['B'].default_value = (1.0, 0.86, 0.68, 1)      # the clip's pale tan granite
    bri = nt.nodes.new('ShaderNodeHueSaturation'); bri.inputs['Value'].default_value = 1.35; bri.inputs['Saturation'].default_value = 0.6
    link(nt, tint.outputs['Result'], bri.inputs['Color'])
    link(nt, bri.outputs['Color'], bs.inputs['Base Color'])
    rnor = tex(nt, R_ + 'nor_gl.png', False, 2.2, tc_.outputs['Object'])
    nmap = nt.nodes.new('ShaderNodeNormalMap'); nmap.inputs['Strength'].default_value = 1.2
    link(nt, rnor.outputs['Color'], nmap.inputs['Color']); link(nt, nmap.outputs['Normal'], bs.inputs['Normal'])
    bs.inputs['Roughness'].default_value = 0.85
    me_s.materials.append(sm_)

    # ---- him, sitting near the tip, a card square to the opening camera
    img_h = bpy.data.images.load(HIM)
    hh = 1.3
    hw = hh * img_h.size[0] / img_h.size[1]
    seat = root + d * (L * 0.8)
    seat.z += R1 * 0.95 + 0.05
    him_pos = seat
    me_h = bpy.data.meshes.new('him')
    me_h.from_pydata([(-0.5, 0, 0), (0.5, 0, 0), (0.5, 0, 1), (-0.5, 0, 1)], [], [(0, 1, 2, 3)])
    uvh = me_h.uv_layers.new(name='UVMap')
    for li, uvv in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]):
        uvh.data[li].uv = uvv
    him_ob = bpy.data.objects.new('him', me_h)
    sc.collection.objects.link(him_ob)
    him_ob.scale = (hw, 1, hh)
    seat_px = 462 / 500                                       # where he meets the rock in the image
    him_ob.location = seat - Vector((0, 0, hh * (1 - seat_px)))
    him_ob.rotation_euler = (0, 0, yaw - math.pi / 2 - side * 0.35)
    hm = bpy.data.materials.new('him')
    hm.use_nodes = True
    nt = hm.node_tree
    t_ = nt.nodes.new('ShaderNodeTexImage'); t_.image = img_h
    hs_ = nt.nodes.new('ShaderNodeHueSaturation'); hs_.inputs['Saturation'].default_value = 0.8; hs_.inputs['Value'].default_value = 0.95
    link(nt, t_.outputs['Color'], hs_.inputs['Color'])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 0.9
    link(nt, hs_.outputs['Color'], em.inputs['Color'])
    trn = nt.nodes.new('ShaderNodeBsdfTransparent')
    mx = nt.nodes.new('ShaderNodeMixShader')
    link(nt, t_.outputs['Alpha'], mx.inputs['Fac']); link(nt, trn.outputs[0], mx.inputs[1]); link(nt, em.outputs[0], mx.inputs[2])
    link(nt, mx.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    hm.blend_method = 'HASHED'
    me_h.materials.append(hm)

def look_at(pos, target):
    q = (target - pos).to_track_quat('-Z', 'Y')
    return q.to_euler()

def place_camera(k):
    """k 0: just behind him, looking past him over the drop; 1: far back and high"""
    e = k * k * (3 - 2 * k)
    if him_pos is not None:
        leftv = Vector((-math.sin(yaw), math.cos(yaw), 0))
        start = him_pos - fwd * 4.2 + leftv * 1.8 + Vector((0, 0, 1.1))
        near_target = him_pos + fwd * 30 - Vector((0, 0, 7))     # past him, a little down
        far_target = him_pos + fwd * 4000 - Vector((0, 0, 700))
        tgt = near_target.lerp(far_target, min(1.0, e * 1.3))
        loc = start - fwd * (650 * e ** 1.5) + Vector((0, 0, 420 * e ** 2.0))
    else:
        loc = base - fwd * (700 * e ** 1.5) + up * (520 * e ** 2.2)
        tgt = loc + Euler((PITCH, 0, yaw - math.pi / 2)).to_matrix() @ Vector((0, 0, -100))
    g = max(height_at(loc.x + dx_, loc.y + dy_) for dx_ in (-20, 0, 20) for dy_ in (-20, 0, 20))
    loc.z = max(loc.z, g + 1.6 + 0.06 * (loc - base).length)
    cam.location = loc
    cam.rotation_euler = look_at(loc, tgt)
    cam_data.sensor_fit = 'HORIZONTAL'
    cam_data.angle = HFOV + (math.radians(80) - HFOV) * e

# side light: sun to the right of the view, low
az = yaw - math.radians(70)
so.rotation_euler = Euler((math.radians(90 - 14), 0, az + math.pi / 2))
mpw.inputs['Rotation'].default_value[2] = az - math.radians(float(os.environ.get('SKY_SUN_AZ', '0')))
KS = [float(k) for k in os.environ.get('KS', '').split(',') if k] if (SPUR or HIM) else []
if KS:
    for i_, k in enumerate(KS):
        place_camera(k)
        sc.render.filepath = OUT.replace('.png', f'_{i_:03d}.png')
        bpy.ops.render.render(write_still=True)
        print('RENDERED', k, flush=True)
else:
    cam.location = base
    cam.rotation_euler = Euler((PITCH, 0, yaw - math.pi / 2))
    sc.render.filepath = OUT
    bpy.ops.render.render(write_still=True)
print('RENDERED', OUT)
