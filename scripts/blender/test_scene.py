# Feasibility test: procedural snowy terrain + volumetric cloud, Cycles CPU.
import bpy, sys, time, math
argv = sys.argv[sys.argv.index('--') + 1:]
out, w, h, spp = argv[0], int(argv[1]), int(argv[2]), int(argv[3])
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = spp
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = w, h
sc.render.filepath = out
# terrain
bpy.ops.mesh.primitive_plane_add(size=4000)
t = bpy.context.object
m = t.modifiers.new('sub', 'SUBSURF'); m.subdivision_type = 'SIMPLE'; m.levels = 7; m.render_levels = 7
tex = bpy.data.textures.new('n', 'MUSGRAVE') if hasattr(bpy.types, 'MusgraveTexture') else bpy.data.textures.new('n', 'CLOUDS')
tex.noise_scale = 0.9
d = t.modifiers.new('d', 'DISPLACE'); d.texture = tex; d.strength = 700; d.texture_coords = 'GLOBAL'
mat = bpy.data.materials.new('snow'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); ramp = nt.nodes.new('ShaderNodeValToRGB')
nt.links.new(geo.outputs['Normal'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], ramp.inputs[0])
ramp.color_ramp.elements[0].position = 0.72; ramp.color_ramp.elements[0].color = (0.09, 0.09, 0.1, 1)
ramp.color_ramp.elements[1].position = 0.8; ramp.color_ramp.elements[1].color = (0.85, 0.88, 0.92, 1)
nt.links.new(ramp.outputs[0], bsdf.inputs['Base Color'])
t.data.materials.append(mat)
# cloud
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 300, 420)); c = bpy.context.object; c.scale = (1800, 500, 120)
cm = bpy.data.materials.new('cloud'); cm.use_nodes = True; cn = cm.node_tree
cn.nodes.remove(cn.nodes['Principled BSDF'])
vol = cn.nodes.new('ShaderNodeVolumePrincipled'); noise = cn.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 3; noise.inputs['Detail'].default_value = 8
mr = cn.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.5; mr.inputs['From Max'].default_value = 0.75; mr.inputs['To Max'].default_value = 0.08
cn.links.new(noise.outputs['Fac'], mr.inputs['Value']); cn.links.new(mr.outputs['Result'], vol.inputs['Density'])
cn.links.new(vol.outputs[0], cn.nodes['Material Output'].inputs['Volume'])
c.data.materials.append(cm)
# sky + sun
world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
sky = world.node_tree.nodes.new('ShaderNodeTexSky'); sky.sky_type = 'NISHITA'; sky.sun_elevation = math.radians(25)
world.node_tree.links.new(sky.outputs[0], world.node_tree.nodes['Background'].inputs[0])
world.node_tree.nodes['Background'].inputs[1].default_value = 0.4
# camera
bpy.ops.object.camera_add(location=(0, -1600, 450), rotation=(math.radians(82), 0, 0)); sc.camera = bpy.context.object
bpy.context.object.data.lens = 35
t0 = time.time(); bpy.ops.render.render(write_still=True); print('RENDER_SECONDS', round(time.time() - t0, 1))
