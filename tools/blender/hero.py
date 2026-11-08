"""Stylised FP Flow sports hero with gear, built from primitives in headless Blender.

Usage:
  blender -b -P tools/blender/hero.py -- --out OUT_DIR [--angle DEG] [--no-gear] [--glb]

Original design: chunky fantasy proportions (big shoulders, hands and boots, short legs),
gear themed on training and rehab (shoulder plates, belt, headband, wristbands, knee sleeve,
an oversized dumbbell). Colours follow the FP Flow brand palette.
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--out', default='out')
ap.add_argument('--angle', type=float, default=-28)
ap.add_argument('--no-gear', action='store_true')
ap.add_argument('--glb', action='store_true')
ap.add_argument('--samples', type=int, default=48)
ap.add_argument('--size', default='900x1200')
args = ap.parse_args(argv)
os.makedirs(args.out, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def hexrgb(h, a=1.0):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x ** 2.2 for x in c) + (a,)  # sRGB -> linear


MATS = {}


def mat(name, color, rough=0.75, metal=0.0, emit=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexrgb(color)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = hexrgb(color)
        b.inputs['Emission Strength'].default_value = emit
    MATS[name] = m
    return m


SKIN = mat('skin', '#c98f6b', 0.6)
HAIR = mat('hair', '#3a2618', 0.8)
FOREST = mat('forest', '#29483c', 0.7)
DARK = mat('dark', '#1d362d', 0.7)
SAND = mat('sand', '#d8ccb6', 0.6)
BRASS = mat('brass', '#c9a14a', 0.35, 0.9)
STEEL = mat('steel', '#9aa5a0', 0.3, 0.9)
LEATHER = mat('leather', '#5b432b', 0.8)
CLOTH = mat('cloth', '#413d28', 0.9)
EYE = mat('eye', '#141c18', 0.3)
WHITE = mat('white', '#f1f5f2', 0.4)
ACCENT = mat('accent', '#2f8f6a', 0.5)
STONE = mat('stone', '#46554e', 0.9)


def finish(o, m, sub=2, smooth=True):
    o.data.materials.append(m)
    if sub:
        mod = o.modifiers.new('sub', 'SUBSURF')
        mod.levels = sub
        mod.render_levels = sub
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def cube(loc, scale, m, sub=2, taper=None, name='cube', bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    if taper:  # (bottom_factor, top_factor) on x/y of the lower / upper verts
        for v in o.data.vertices:
            f = taper[0] if v.co.z < 0 else taper[1]
            v.co.x *= f
            v.co.y *= f
    if bevel:
        bv = o.modifiers.new('bev', 'BEVEL')
        bv.width = bevel
        bv.segments = 2
    return finish(o, m, sub)


def sphere(loc, r, m, scale=(1, 1, 1), sub=1, name='sphere'):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=32, ring_count=16)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    return finish(o, m, sub)


def limb(p1, p2, r1, r2, m, sub=1, name='limb'):
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=r1, radius2=r2, depth=d.length,
                                    location=(p1 + p2) / 2)
    o = bpy.context.object
    o.name = name
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    finish(o, m, sub)
    # Rounded ends: a sphere at each joint hides the seams.
    sphere(p1, r1, m, sub=1, name=name + '_j1')
    sphere(p2, r2, m, sub=1, name=name + '_j2')
    return o


def ring(loc, major, minor, m, rot=(0, 0, 0), scale=(1, 1, 1), name='ring'):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc,
                                     rotation=rot, major_segments=40, minor_segments=12)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    return finish(o, m, 0)


def cyl(loc, r, depth, m, rot=(0, 0, 0), verts=32, sub=0, name='cyl'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    return finish(o, m, sub, smooth=sub > 0)


def cone(loc, r, depth, m, rot=(0, 0, 0), name='cone'):
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=r, radius2=0, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    return finish(o, m, 0)


# ---------------------------------------------------------------- body (heroic proportions)
gear = not args.no_gear


def blob(name, m, elems, res=0.025):
    """One smooth body part from metaball elements: ('ball', co, r, scale) or ('cap', p1, p2, r)."""
    K = 1.55  # a metaball's visible surface sits at ~0.65 of its radius; K makes r the visible radius
    mb = bpy.data.metaballs.new(name)
    mb.resolution = res
    mb.render_resolution = res
    mb.threshold = 0.45
    o = bpy.data.objects.new(name, mb)
    scene.collection.objects.link(o)
    for e in elems:
        if e[0] == 'ball':
            _, co, r, sc = e
            el = mb.elements.new(type='ELLIPSOID')
            el.co = co
            el.radius = r * K
            el.size_x, el.size_y, el.size_z = sc
        else:
            _, p1, p2, r = e
            p1, p2 = Vector(p1), Vector(p2)
            d = p2 - p1
            el = mb.elements.new(type='CAPSULE')
            el.co = (p1 + p2) / 2
            el.radius = r * K
            el.size_x = d.length / 2
            el.rotation = Vector((1, 0, 0)).rotation_difference(d.normalized())
        el.stiffness = 2.2
    mb.materials.append(m)
    return o


# Arms in a relaxed A-pose; big forearms and fists.
ARM = {s: dict(sh=(0.46 * s, 0.0, 1.56), el=(0.66 * s, 0.03, 1.22), wr=(0.74 * s, -0.04, 0.96)) for s in (-1, 1)}

skin = []
for s in (-1, 1):
    a = ARM[s]
    skin += [('cap', a['sh'], a['el'], 0.11), ('cap', a['el'], a['wr'], 0.1),
             ('ball', (0.75 * s, -0.05, 0.86), 0.14, (0.9, 0.85, 1.05))]
skin += [('cap', (0, 0, 1.62), (0, 0, 1.78), 0.11)]
blob('Skin', SKIN, skin)

# Shirt: broad chest, narrow waist (V shape).
blob('Shirt', FOREST, [
    ('ball', (0, 0.0, 1.44), 0.36, (1.25, 0.72, 0.62)),
    ('ball', (0.0, -0.04, 1.47), 0.26, (1.2, 0.8, 0.6)),
    ('ball', (0, 0.0, 1.2), 0.25, (1.0, 0.7, 0.8)),
    ('ball', (0.3, 0, 1.52), 0.17, (1, 1, 1)),
    ('ball', (-0.3, 0, 1.52), 0.17, (1, 1, 1)),
])

# Trousers: sturdy, slightly short legs.
legs = [('ball', (0, 0, 1.0), 0.26, (1.1, 0.75, 0.6))]
for s in (-1, 1):
    legs += [('cap', (0.15 * s, 0, 0.98), (0.19 * s, 0.03, 0.56), 0.15),
             ('cap', (0.19 * s, 0.03, 0.56), (0.2 * s, 0, 0.24), 0.12)]
blob('Pants', CLOTH, legs)

for s in (-1, 1):
    cube((0.2 * s, -0.08, 0.11), (0.15, 0.26, 0.11), LEATHER, sub=2, taper=(1.0, 0.85), bevel=0.25, name=f'boot{s}')
    cyl((0.2 * s, 0.0, 0.28), 0.14, 0.14, LEATHER, sub=0, name=f'shaft{s}')
    ring((0.2 * s, 0, 0.35), 0.14, 0.03, SAND, name=f'cuff{s}')

# Head: friendly figurine head with short hair and full beard.
sphere((0, 0, 1.94), 0.19, SKIN, scale=(1, 0.95, 1.1), name='head')
sphere((0, -0.05, 1.82), 0.13, SKIN, scale=(1.12, 1, 0.75), name='jaw')
sphere((0, -0.19, 1.91), 0.034, SKIN, scale=(0.9, 1, 1.15), name='nose')
for s in (-1, 1):
    sphere((0.072 * s, -0.163, 1.96), 0.03, WHITE, name=f'eyewhite{s}')
    sphere((0.072 * s, -0.188, 1.96), 0.016, EYE, name=f'pupil{s}')
    cube((0.078 * s, -0.17, 2.012), (0.05, 0.016, 0.015), HAIR, sub=1, name=f'brow{s}')
    sphere((0.19 * s, 0, 1.93), 0.045, SKIN, scale=(0.5, 1, 1.2), name=f'ear{s}')
sphere((0, 0.03, 2.0), 0.2, HAIR, scale=(1.03, 1.0, 0.86), name='hair')
sphere((0, -0.09, 1.79), 0.125, HAIR, scale=(1.2, 0.85, 0.95), name='beard')
cube((0, -0.2, 1.865), (0.045, 0.01, 0.008), EYE, sub=1, name='mouth')

if gear:
    for s in (-1, 1):
        # Layered shoulder plates, tilted outward, with a sand trim and a brass rivet.
        for i, (r, z, sc) in enumerate(((0.25, 1.6, 0.5), (0.2, 1.68, 0.55))):
            sphere((0.5 * s, 0, z), r, FOREST if i == 0 else DARK, scale=(1.1, 1.05, sc), name=f'plate{s}{i}')
            o = bpy.context.object
            o.rotation_euler = (0, math.radians(-22 * s), 0)
        ring((0.5 * s, 0, 1.57), 0.255, 0.03, SAND, rot=(0, math.radians(-22 * s), 0), scale=(1.1, 1.05, 1), name=f'trim{s}')
        sphere((0.56 * s, -0.12, 1.72), 0.04, BRASS, name=f'rivet{s}')
        cone((0.58 * s, 0.0, 1.82), 0.07, 0.22, BRASS, rot=(0, math.radians(-30 * s), 0), name=f'horn{s}')
        # Leather bracers and sweatbands.
        limb((0.68 * s, 0.02, 1.16), (0.735 * s, -0.03, 1.0), 0.135, 0.125, LEATHER, sub=1, name=f'bracer{s}')
        ring((0.74 * s, -0.035, 0.97), 0.125, 0.038, SAND, rot=(0.15, 0.25 * s, 0), name=f'wrist{s}')
    # Knee sleeve on the left knee: the rehab touch.
    limb((-0.19, 0.03, 0.66), (-0.198, 0.02, 0.46), 0.19, 0.17, DARK, sub=1, name='kneesleeve')
    ring((-0.19, 0.03, 0.56), 0.185, 0.022, ACCENT, name='kneestrap')
    # Belt with a big brass buckle and a tabard.
    ring((0, 0, 1.08), 0.3, 0.05, LEATHER, scale=(1.0, 0.7, 1), name='belt')
    cube((0, -0.215, 1.08), (0.085, 0.025, 0.07), BRASS, sub=1, name='buckle')
    cube((0, -0.2, 0.85), (0.16, 0.02, 0.2), FOREST, sub=0, taper=(1.2, 0.95), name='tabard_f', bevel=0.3)
    cube((0, 0.2, 0.85), (0.16, 0.02, 0.2), FOREST, sub=0, taper=(1.2, 0.95), name='tabard_b', bevel=0.3)
    sphere((0, -0.225, 0.86), 0.06, SAND, scale=(1, 0.25, 1.25), name='tabard_mark')
    # Chest emblem.
    sphere((0, -0.27, 1.46), 0.07, SAND, scale=(1, 0.25, 1.25), name='emblem')
    sphere((0, -0.285, 1.46), 0.037, ACCENT, scale=(1, 0.3, 1.3), name='emblem_core')
    # Headband with a knot and tails at the back.
    ring((0, 0.0, 2.04), 0.196, 0.028, ACCENT, rot=(-0.12, 0, 0), name='headband')
    sphere((0, 0.2, 2.06), 0.04, ACCENT, name='knot')
    for s in (-1, 1):
        cube((0.04 * s, 0.23, 1.97), (0.02, 0.012, 0.08), ACCENT, sub=1, name=f'tail{s}')
    # Oversized dumbbell in the right fist, held like a war hammer.
    hx, hy, hz = -0.75, -0.05, 0.86
    cyl((hx, hy, hz), 0.035, 0.72, STEEL, name='bar')
    for dz in (-0.31, 0.31):
        cyl((hx, hy, hz + dz), 0.17, 0.1, DARK, verts=6, name='plate')
        ring((hx, hy, hz + dz), 0.17, 0.022, SAND, name='plate_trim')

# Pedestal.
cyl((0, 0, -0.06), 0.62, 0.12, STONE, verts=8, name='pedestal')
cyl((0, 0, 0.01), 0.56, 0.03, FOREST, verts=8, name='pedestal_top')

# ---------------------------------------------------------------- staging
world = bpy.data.worlds.new('w')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = hexrgb('#e8eee9')
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6


def light(kind, loc, energy, rot=None, size=1.0, color='#ffffff'):
    d = bpy.data.lights.new(kind, kind)
    d.energy = energy
    d.color = hexrgb(color)[:3]
    if kind == 'AREA':
        d.size = size
    o = bpy.data.objects.new(kind, d)
    o.location = loc
    scene.collection.objects.link(o)
    tgt = Vector((0, 0, 1.1))
    o.rotation_euler = (tgt - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o


light('AREA', (-2.5, -3.0, 3.5), 900, size=3, color='#fff4e6')   # key, warm
light('AREA', (3.0, -2.0, 1.5), 250, size=3, color='#e6f0ff')    # fill, cool
light('AREA', (0.5, 3.0, 3.0), 700, size=2, color='#ffffff')     # rim

cam_d = bpy.data.cameras.new('cam')
cam_d.lens = 60
cam = bpy.data.objects.new('cam', cam_d)
scene.collection.objects.link(cam)
scene.camera = cam
a = math.radians(args.angle)
dist = 6.2
cam.location = (dist * math.sin(a), -dist * math.cos(a), 1.6)
cam.rotation_euler = (Vector((0, 0, 1.05)) - cam.location).to_track_quat('-Z', 'Y').to_euler()

w, h = (int(x) for x in args.size.split('x'))
scene.render.resolution_x = w
scene.render.resolution_y = h
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = args.samples
scene.cycles.use_denoising = False  # the distro build has no OpenImageDenoise
scene.view_settings.view_transform = 'Standard'
scene.render.film_transparent = True
# Ink outline for the figurine look.
scene.render.use_freestyle = True
scene.render.line_thickness = 1.4
ls = scene.view_layers[0].freestyle_settings.linesets[0]
ls.linestyle = ls.linestyle or bpy.data.linestyles.new('ink')
ls.linestyle.color = hexrgb('#141c18')[:3]
ls.select_by_visibility = True
ls.select_by_edge_types = True
ls.select_crease = False
ls.select_border = False
ls.select_silhouette = True
ls.select_external_contour = True

scene.render.filepath = os.path.join(args.out, f'hero_{int(args.angle)}{"" if gear else "_nogear"}.png')
bpy.ops.render.render(write_still=True)

if args.glb:
    bpy.ops.export_scene.gltf(filepath=os.path.join(args.out, 'hero.glb'), export_apply=True)
