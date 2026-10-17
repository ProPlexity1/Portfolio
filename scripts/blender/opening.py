# The opening of the descent, built in Blender: deep fresh snow with a trail
# of boot prints, a meadow running into misty pines, fog and falling snow.
# The camera starts low over the prints looking straight down and tilts up
# along the trail to the trees.
#
# Assets: Poly Haven (CC0) fir_tree_01, snow_02 and an overcast snow HDRI, in
# ASSETS (env var, default ./assets): fir_tree_01/fir_tree_01.blend,
# snow_02/snow_02_{Diffuse,nor_gl,Rough}.png, hdri/<name>.hdr
# Usage: blender -b --python opening.py -- <prints_h.png> <out_dir> <w> <h> <samples> <u,u,...>
#   u: 0 = looking down at the prints, 1 = level, looking along the trail
import bpy, bmesh, sys, math, random, os
from mathutils import Vector, Euler

argv = sys.argv[sys.argv.index('--') + 1:]
HEIGHT, OUT, W, H, SPP = argv[0], argv[1], int(argv[2]), int(argv[3]), int(argv[4])
US = [float(u) for u in argv[5].split(',')]
os.makedirs(OUT, exist_ok=True)
ASSETS = os.environ.get('ASSETS', 'assets')
HDRI = os.environ.get('HDRI', 'snowy_field')

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SPP
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6
sc.cycles.volume_bounces = 1
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Medium High Contrast'
sc.view_settings.exposure = 1.6
random.seed(7)

def link(nt, a, b):
    nt.links.new(a, b)

# ---------------------------------------------------------------- materials
def snow_material():
    """scanned snow (Poly Haven snow_02), tiled every 1.6 m, with subsurface"""
    m = bpy.data.materials.new('snow')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1 / 1.6, 1 / 1.6, 1)
    link(nt, tc.outputs['Object'], mp.inputs['Vector'])
    def img(name, colour):
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = bpy.data.images.load(os.path.join(ASSETS, 'snow_02', f'snow_02_{name}.png'))
        t.image.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
        t.projection = 'BOX'
        t.projection_blend = 0.3
        link(nt, mp.outputs['Vector'], t.inputs['Vector'])
        return t
    # fresh snow is near white: the scan only adds a faint variation (its
    # dirt streaks are dropped), the shape comes from its normal map
    dif = img('Diffuse', True)
    bw = nt.nodes.new('ShaderNodeRGBToBW')
    link(nt, dif.outputs['Color'], bw.inputs['Color'])
    var = nt.nodes.new('ShaderNodeMapRange')
    var.inputs['From Min'].default_value = 0.2
    var.inputs['From Max'].default_value = 0.9
    var.inputs['To Min'].default_value = 0.86
    var.inputs['To Max'].default_value = 0.95
    link(nt, bw.outputs['Val'], var.inputs['Value'])
    tint = nt.nodes.new('ShaderNodeMix'); tint.data_type = 'RGBA'; tint.blend_type = 'MULTIPLY'
    tint.inputs['Factor'].default_value = 1.0
    link(nt, var.outputs['Result'], tint.inputs['A'])
    tint.inputs['B'].default_value = (0.94, 0.97, 1.0, 1)
    link(nt, tint.outputs['Result'], b.inputs['Base Color'])
    rough = img('Rough', False)
    link(nt, rough.outputs['Color'], b.inputs['Roughness'])
    nor = img('nor_gl', False)
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nm.inputs['Strength'].default_value = 0.8
    link(nt, nor.outputs['Color'], nm.inputs['Color'])
    link(nt, nm.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Subsurface Weight'].default_value = 0.3
    b.inputs['Subsurface Radius'].default_value = (0.25, 0.45, 0.8)
    b.inputs['Subsurface Scale'].default_value = 0.05
    return m

SNOW = snow_material()

def simple(name, col, rough=0.8):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = col
    b.inputs['Roughness'].default_value = rough
    return m

BARK = simple('bark', (0.05, 0.035, 0.025, 1))

def needles_material():
    """dark pine green, with snow settled on the upward faces"""
    m = bpy.data.materials.new('needles')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 6
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.95
    ramp.color_ramp.elements[0].color = (0.012, 0.03, 0.022, 1)
    ramp.color_ramp.elements[1].position = 1.15
    ramp.color_ramp.elements[1].color = (0.8, 0.83, 0.87, 1)
    ramp.color_ramp.elements[1].position = 1.0
    link(nt, geo.outputs['Normal'], sep.inputs[0])
    link(nt, sep.outputs['Z'], add.inputs[0])
    link(nt, noise.outputs['Fac'], add.inputs[1])
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = 0.9
    mr.inputs['From Max'].default_value = 1.5
    link(nt, add.outputs[0], mr.inputs['Value'])
    link(nt, mr.outputs['Result'], ramp.inputs['Fac'])
    ramp.color_ramp.elements[0].position = 0.45
    ramp.color_ramp.elements[1].position = 0.6
    link(nt, ramp.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.85
    return m

NEEDLES = needles_material()

# ---------------------------------------------------------------- snow ground
def ground_patch():
    """the 8 m patch with the prints, finely displaced"""
    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 3.4, 0))
    p = bpy.context.object
    p.name = 'prints'
    sub = p.modifiers.new('sub', 'SUBSURF')
    sub.subdivision_type = 'SIMPLE'
    sub.levels = sub.render_levels = 10
    img = bpy.data.images.load(HEIGHT)
    img.colorspace_settings.name = 'Non-Color'
    tex = bpy.data.textures.new('h', 'IMAGE')
    tex.image = img
    tex.extension = 'EXTEND'
    d = p.modifiers.new('disp', 'DISPLACE')
    d.texture = tex
    d.texture_coords = 'UV'
    d.strength = 0.5
    d.mid_level = 0.5
    p.data.materials.append(SNOW)
    bpy.ops.object.shade_smooth()
    return p

def ground_far():
    """the meadow beyond: gentle rolls, rising into slopes at the sides"""
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=400, y_subdivisions=400, size=900, location=(0, 380, 0))
    g = bpy.context.object
    g.name = 'meadow'
    bm = bmesh.new()
    bm.from_mesh(g.data)
    for v in bm.verts:
        x, y = v.co.x, v.co.y + 380
        r = math.hypot(x, y - 3.4)
        # keep it flat and a hair low under the prints patch, roll further out
        roll = 0.25 * math.sin(x * 0.07) * math.cos(y * 0.05) + 0.6 * math.sin(x * 0.013 + 1.3) * math.sin(y * 0.011)
        side = max(0.0, abs(x) - 60) ** 1.35 * 0.09 + max(0.0, y - 260) * 0.25
        fade = min(1.0, max(0.0, (r - 5.0) / 20.0))
        v.co.z = -0.02 + fade * (roll + side)
    bm.to_mesh(g.data)
    bm.free()
    g.data.materials.append(SNOW)
    bpy.ops.object.shade_smooth()
    return g

def meadow_height(x, y):
    r = math.hypot(x, y - 3.4)
    roll = 0.25 * math.sin(x * 0.07) * math.cos(y * 0.05) + 0.6 * math.sin(x * 0.013 + 1.3) * math.sin(y * 0.011)
    side = max(0.0, abs(x) - 60) ** 1.35 * 0.09 + max(0.0, y - 260) * 0.25
    fade = min(1.0, max(0.0, (r - 5.0) / 20.0))
    return -0.02 + fade * (roll + side)

# ---------------------------------------------------------------- pines
def make_pine(name, height, seed):
    rnd = random.Random(seed)
    bm = bmesh.new()
    # trunk
    bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=height * 0.025, radius2=height * 0.008, depth=height,
                          matrix=__import__('mathutils').Matrix.Translation((0, 0, height / 2)))
    trunk_faces = len(bm.faces)
    # tiers of drooping, ragged cones, wide at the bottom, narrow at the top
    tiers = 9 + rnd.randint(0, 4)
    for k in range(tiers):
        t = k / tiers
        z0 = height * (0.18 + 0.78 * t)
        rad = height * 0.24 * (1 - t) ** 1.1 + 0.15
        dep = height * 0.16 * (1.0 - 0.4 * t)
        ret = bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=rad, radius2=rad * 0.12, depth=dep,
                                    matrix=__import__('mathutils').Matrix.Translation((0, 0, z0)))
        for v in ret['verts']:
            if v.co.z < z0:   # ragged, drooping rim
                a = rnd.uniform(0.75, 1.25)
                v.co.x *= a
                v.co.y *= a
                v.co.z -= rnd.uniform(0, dep * 0.35)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(BARK)
    me.materials.append(NEEDLES)
    for i, f in enumerate(me.polygons):
        f.material_index = 0 if i < trunk_faces else 1
    ob = bpy.data.objects.new(name, me)
    return ob

def load_firs():
    """scanned firs (Poly Haven fir_tree_01): medium detail near, low far"""
    path = os.path.join(ASSETS, 'fir_tree_01', 'fir_tree_01.blend')
    names = ['fir_tree_01_a_LOD1', 'fir_tree_01_b_LOD1', 'fir_tree_01_a_LOD2', 'fir_tree_01_b_LOD2']
    with bpy.data.libraries.load(path, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n in names]
    # snow settled on the needles: blend toward white on upward faces
    for m in bpy.data.materials:
        if m.name.startswith('fir_tree_01_twig') or m.name.startswith('fir_tree_01_dead'):
            nt = m.node_tree
            b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
            src_link = b.inputs['Base Color'].links[0].from_socket if b.inputs['Base Color'].links else None
            geo = nt.nodes.new('ShaderNodeNewGeometry')
            sep = nt.nodes.new('ShaderNodeSeparateXYZ')
            noise = nt.nodes.new('ShaderNodeTexNoise')
            noise.inputs['Scale'].default_value = 3.0
            add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'
            link(nt, geo.outputs['Normal'], sep.inputs[0])
            link(nt, sep.outputs['Z'], add.inputs[0])
            link(nt, noise.outputs['Fac'], add.inputs[1])
            mr = nt.nodes.new('ShaderNodeMapRange')
            mr.inputs['From Min'].default_value = 1.05
            mr.inputs['From Max'].default_value = 1.35
            link(nt, add.outputs[0], mr.inputs['Value'])
            mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
            link(nt, mr.outputs['Result'], mix.inputs['Factor'])
            if src_link:
                link(nt, src_link, mix.inputs['A'])
            mix.inputs['B'].default_value = (0.82, 0.85, 0.9, 1)
            link(nt, mix.outputs['Result'], b.inputs['Base Color'])
    objs = {o.name: o for o in dst.objects}
    return [objs[n] for n in names[:2]], [objs[n] for n in names[2:]]

NEAR_FIRS, FAR_FIRS = load_firs()

def scatter_pines():
    rnd = random.Random(3)
    placed = []
    def place(x, y, s=1.0):
        p = rnd.choice(NEAR_FIRS if y < 140 and abs(x) < 120 else FAR_FIRS)
        ob = bpy.data.objects.new('t', p.data)
        ob.location = (x, y, meadow_height(x, y) - 0.2)
        ob.rotation_euler = (rnd.uniform(-0.03, 0.03), rnd.uniform(-0.03, 0.03), rnd.uniform(0, 6.28))
        ob.scale = (s,) * 3
        bpy.context.scene.collection.objects.link(ob)
        placed.append((x, y))
    # a few lone trees near the trail, like in the clip
    for x, y, s in [(-9, 32, 0.9), (-6.5, 36, 0.7), (11, 46, 1.0), (-14, 58, 1.1), (16, 64, 0.8)]:
        place(x, y, s)
    # the forest line across the meadow, with clumps and gaps
    for _ in range(900):
        x = rnd.uniform(-220, 220)
        y = rnd.uniform(85, 320) + 30 * math.sin(x * 0.02)
        if abs(x) < 25 and y < 120:
            continue
        place(x, y, rnd.uniform(0.7, 1.3))
    # trees up the side slopes
    for _ in range(500):
        side = rnd.choice([-1, 1])
        x = side * rnd.uniform(70, 260)
        y = rnd.uniform(20, 380)
        place(x, y, rnd.uniform(0.7, 1.2))

# ---------------------------------------------------------------- weather
def fog():
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 300, 60))
    c = bpy.context.object
    c.name = 'fog'
    c.scale = (1200, 1000, 140)
    m = bpy.data.materials.new('fog')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes['Principled BSDF'])
    v = nt.nodes.new('ShaderNodeVolumeScatter')
    v.inputs['Color'].default_value = (0.86, 0.89, 0.92, 1)
    v.inputs['Density'].default_value = 0.009
    v.inputs['Anisotropy'].default_value = 0.3
    link(nt, v.outputs[0], nt.nodes['Material Output'].inputs['Volume'])
    c.data.materials.append(m)

def flakes():
    """falling snow: small soft flakes in front of the camera"""
    rnd = random.Random(9)
    m = simple('flake', (1, 1, 1, 1), 0.9)
    fb = m.node_tree.nodes['Principled BSDF']
    fb.inputs['Emission Color'].default_value = (0.9, 0.93, 0.96, 1)
    fb.inputs['Emission Strength'].default_value = 0.6
    me = bpy.data.meshes.new('flake')
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(m)
    for _ in range(2600):
        ob = bpy.data.objects.new('f', me)
        d = rnd.uniform(1.2, 40) ** 1.0
        ob.location = (rnd.uniform(-1, 1) * d * 0.9, rnd.uniform(0.6, 1.0) * d - 1, rnd.uniform(-0.5, 1.0) * d * 0.6 + 1.6)
        ob.scale = (rnd.uniform(0.002, 0.0045),) * 3
        bpy.context.scene.collection.objects.link(ob)

def sky():
    """the HDRI lights the scene; the camera sees a soft overcast gradient"""
    w = bpy.data.worlds.new('overcast')
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    out = nt.nodes['World Output']
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(os.path.join(ASSETS, 'hdri', HDRI + '.hdr'))
    light = nt.nodes.new('ShaderNodeBackground')
    light.inputs['Strength'].default_value = 1.0
    link(nt, env.outputs['Color'], light.inputs['Color'])
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.74, 0.78, 0.82, 1)
    ramp.color_ramp.elements[1].position = 0.5
    ramp.color_ramp.elements[1].color = (0.52, 0.58, 0.63, 1)
    link(nt, tc.outputs['Generated'], sep.inputs[0])
    link(nt, sep.outputs['Z'], ramp.inputs['Fac'])
    seen = nt.nodes.new('ShaderNodeBackground')
    seen.inputs['Strength'].default_value = 1.0
    link(nt, ramp.outputs['Color'], seen.inputs['Color'])
    lp = nt.nodes.new('ShaderNodeLightPath')
    mix = nt.nodes.new('ShaderNodeMixShader')
    link(nt, lp.outputs['Is Camera Ray'], mix.inputs['Fac'])
    link(nt, light.outputs['Background'], mix.inputs[1])
    link(nt, seen.outputs['Background'], mix.inputs[2])
    link(nt, mix.outputs['Shader'], out.inputs['Surface'])
    # a low soft sun so the prints have shape
    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 1.2
    sun.angle = math.radians(12)
    s_ = bpy.data.objects.new('sun', sun)
    s_.rotation_euler = Euler((math.radians(62), 0, math.radians(-35)))
    sc.collection.objects.link(s_)

ground_patch()
ground_far()
scatter_pines()
fog()
flakes()
sky()

# ---------------------------------------------------------------- camera
cam_data = bpy.data.cameras.new('cam')
cam_data.lens_unit = 'FOV'
cam = bpy.data.objects.new('cam', cam_data)
sc.collection.objects.link(cam)
sc.camera = cam

def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

def set_camera(u):
    """u 0: low over the first print looking straight down; u 1: standing,
    looking along the trail at the trees"""
    e = smooth(u)
    z = 1.05 + 0.6 * e
    y = -0.2 + 0.2 * e
    pitch = math.radians(4 + 82 * e)          # 0 = straight down, 90 = level
    cam.location = (0.05, y, z)
    cam.rotation_euler = Euler((pitch, 0, 0))
    cam_data.angle = math.radians(62 - 8 * e)  # a touch wider down on the snow

for k, u in enumerate(US):
    set_camera(u)
    sc.render.filepath = os.path.join(OUT, f'open_{k:03d}.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED', k, u, flush=True)
