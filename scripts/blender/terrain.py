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
print('SUMMIT', round(sx), round(sy), round(sz + z0), 'yaw', round(math.degrees(yaw)))
# stand just behind the top, eye a little above it, looking down the valley
back = 40
cam.location = (sx - math.cos(yaw) * back, sy - math.sin(yaw) * back, max(sz, height_at(sx - math.cos(yaw) * back, sy - math.sin(yaw) * back)) + 30)
cam.rotation_euler = Euler((math.radians(76), 0, yaw - math.pi / 2))
cam_data.lens = 22
# side light: sun to the right of the view, low
az = yaw - math.radians(70)
so.rotation_euler = Euler((math.radians(90 - 14), 0, az + math.pi / 2))
mpw.inputs['Rotation'].default_value[2] = az - math.radians(float(os.environ.get('SKY_SUN_AZ', '0')))
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('RENDERED', OUT)
