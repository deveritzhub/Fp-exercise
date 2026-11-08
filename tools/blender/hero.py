"""FP Flow 3D sports hero: a stylised figurine (chunky fantasy proportions, sporty base kit) with
every piece of hero gear as its own named node, built from primitives in headless Blender.

  blender -b -P tools/blender/hero.py -- --frame m --glb web/public/hero3d/hero_m.glb
  blender -b -P tools/blender/hero.py -- --frame f --render out.png --show gear_crown,gear_wind_cape

Node names the web viewer relies on (see web/src/components/hero/hero3d.ts):
  body_*            always visible
  base_shoes        hidden when a shoe item is worn
  hair_<style>      one per HERO_OPTIONS.hair (none has no node)
  beard_<kind>      stubble, moustache, beard
  glasses_<kind>    round, square
  gear_<key>        one per gear key (GEAR_SLOT), plus aid_crutches
  outfit_<key>      overlays for tracksuit, team_kit, champion and sport_* outfits
Materials the viewer tints: skin, hair, iris, kit_main, kit_dark, kit_soft.
Original design; colours follow the FP Flow palette.
"""
import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--frame', choices=['m', 'f'], default='m')
ap.add_argument('--glb', default='')
ap.add_argument('--render', default='')
ap.add_argument('--show', default='', help='comma-separated nodes to show in the render (gear_*, outfit_*, hair_*)')
ap.add_argument('--angle', type=float, default=-28)
ap.add_argument('--samples', type=int, default=48)
ap.add_argument('--size', default='900x1200')
args = ap.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
F = args.frame
EXPORT = bool(args.glb)


def hexrgb(h, a=1.0):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4)) + (a,)


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


# Tinted by the viewer.
SKIN = mat('skin', '#d9a77f', 0.6)
HAIR = mat('hair', '#3b2a20', 0.8)
IRIS = mat('iris', '#5a3a22', 0.3)
KIT = mat('kit_main', '#29483c', 0.7)
KIT_D = mat('kit_dark', '#1d362d', 0.75)
KIT_S = mat('kit_soft', '#e6eee8', 0.7)
# Fixed.
EYE = mat('eye', '#141c18', 0.3)
WHITE = mat('white', '#f4f6f4', 0.5)
SAND = mat('sand', '#d8ccb6', 0.6)
BRASS = mat('brass', '#c9a14a', 0.35, 0.9)
GOLD = mat('gold', '#e4bc63', 0.25, 1.0)
STEEL = mat('steel', '#a7b1ad', 0.3, 0.9)
IRON = mat('iron', '#5d6a64', 0.45, 0.85)
LEATHER = mat('leather', '#6b4a2f', 0.8)
LEATHER_D = mat('leather_dark', '#3d2a1b', 0.8)
WOOD = mat('wood', '#8a6038', 0.8)
RUBBER = mat('rubber', '#202b26', 0.9)
ACCENT = mat('accent', '#2f8f6a', 0.5)
RED = mat('red', '#a2482a', 0.8)
BLUE = mat('blue', '#2759a0', 0.6)
ICE = mat('ice', '#9fd6f0', 0.15, 0.0, 0.4)
PURPLE = mat('purple', '#6f35ab', 0.7)
CALM = mat('calm', '#4a7aa8', 0.85)
WIND = mat('wind', '#dff1ec', 0.8)
FROG = mat('frog', '#5f8a5a', 0.6)
RUNE = mat('rune', '#53e0c0', 0.3, 0.0, 3.0)
YELLOW = mat('yellow', '#e0b43a', 0.6)
STONE = mat('stone', '#46554e', 0.9)

STACK = []


class part:
    """Every object created inside `with part('gear_cap'):` hangs under one empty with that name."""

    def __init__(self, name):
        self.name = name

    def __enter__(self):
        e = bpy.data.objects.new(self.name, None)
        scene.collection.objects.link(e)
        e.parent = STACK[-1] if STACK else None
        STACK.append(e)
        return e

    def __exit__(self, *a):
        STACK.pop()


def adopt(o):
    if STACK:
        o.parent = STACK[-1]
    return o


SUB = 1 if EXPORT else 2


def finish(o, m, sub=None, smooth=True):
    sub = SUB if sub is None else min(sub, SUB)
    o.data.materials.append(m)
    if sub:
        mod = o.modifiers.new('sub', 'SUBSURF')
        mod.levels = sub
        mod.render_levels = sub
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return adopt(o)


def cube(loc, scale, m, sub=2, taper=None, bevel=0.0, rot=(0, 0, 0), name='cube'):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    if taper:
        for v in o.data.vertices:
            f = taper[0] if v.co.z < 0 else taper[1]
            v.co.x *= f
            v.co.y *= f
    if bevel:
        bv = o.modifiers.new('bev', 'BEVEL')
        bv.width = bevel
        bv.segments = 2
    return finish(o, m, sub, smooth=bool(sub) or bool(bevel))


def sphere(loc, r, m, scale=(1, 1, 1), sub=1, rot=(0, 0, 0), name='sphere', seg=24, cut=None):
    """cut: keep only the part above this height (as a fraction of r), e.g. 0 for a dome."""
    if EXPORT:
        seg = max(10, seg * 2 // 3)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, rotation=rot, segments=seg, ring_count=seg // 2)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    if cut is not None:
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < cut * r - 1e-6], context='VERTS')
        bm.to_mesh(o.data)
        bm.free()
    return finish(o, m, sub)


def limb(p1, p2, r1, r2, m, sub=1, caps=True, name='limb'):
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=r1, radius2=r2, depth=d.length, location=(p1 + p2) / 2)
    o = bpy.context.object
    o.name = name
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    finish(o, m, sub)
    if caps:
        sphere(p1, r1, m, sub=0, name=name + '_a', seg=16)
        sphere(p2, r2, m, sub=0, name=name + '_b', seg=16)
    return o


def ring(loc, major, minor, m, rot=(0, 0, 0), scale=(1, 1, 1), segs=32, name='ring'):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc, rotation=rot,
                                     major_segments=segs, minor_segments=10)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    return finish(o, m, 0)


def cyl(loc, r, depth, m, rot=(0, 0, 0), verts=24, scale=(1, 1, 1), name='cyl'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    return finish(o, m, 0, smooth=verts > 8)


def cone(loc, r, depth, m, rot=(0, 0, 0), verts=12, name='cone'):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=0, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    return finish(o, m, 0)


def blob(name, m, elems):
    """Smooth body part from metaball elements: ('ball', co, r, scale) or ('cap', p1, p2, r)."""
    K = 1.55  # visible surface sits at ~0.65 of a metaball's radius
    mb = bpy.data.metaballs.new(name)
    mb.resolution = mb.render_resolution = 0.035 if EXPORT else 0.022
    mb.threshold = 0.45
    o = adopt(bpy.data.objects.new(name, mb))
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


def lerp(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


# ---------------------------------------------------------------- proportions per frame
M = F == 'm'
P = dict(
    sh=0.46 if M else 0.39,      # shoulder x
    chest=1.25 if M else 1.02,   # chest width factor
    waist=0.25 if M else 0.205,
    hip=0.26 if M else 0.29,
    arm=(0.11, 0.1) if M else (0.088, 0.08),
    hand=0.135 if M else 0.112,
    leg=(0.15, 0.12) if M else (0.14, 0.11),
)
ARM = {}
for s in (-1, 1):
    sh = (P['sh'] * s, 0.0, 1.56)
    el = ((P['sh'] + 0.2) * s, 0.03, 1.22)
    wr = ((P['sh'] + 0.28) * s, -0.04, 0.96)
    hd = ((P['sh'] + 0.29) * s, -0.05, 0.86)
    ARM[s] = dict(sh=sh, el=el, wr=wr, hd=hd)
LEG = {s: dict(hip=(0.15 * s, 0, 0.98), knee=(0.19 * s, 0.03, 0.56), ank=(0.2 * s, 0, 0.24)) for s in (-1, 1)}
R, L = -1, 1  # the hero's right side is -x (faces -y)

# ---------------------------------------------------------------- body
with part('body'):
    skin = [('cap', (0, 0, 1.62), (0, 0, 1.78), 0.1 if M else 0.085)]
    for s in (-1, 1):
        a, g = ARM[s], LEG[s]
        skin += [('cap', a['sh'], a['el'], P['arm'][0]), ('cap', a['el'], a['wr'], P['arm'][1]),
                 ('ball', a['hd'], P['hand'], (0.9, 0.85, 1.05)),
                 ('cap', lerp(g['hip'], g['knee'], 0.55), g['knee'], P['leg'][0] * 0.92),
                 ('cap', g['knee'], g['ank'], P['leg'][1])]
    blob('body_skin', SKIN, skin)
    # Thumbs and knuckles so the fists read as hands.
    for s in (-1, 1):
        hx, hy, hz = ARM[s]['hd']
        sphere((hx - 0.03 * s, hy - 0.1, hz + 0.03), P['hand'] * 0.38, SKIN, scale=(0.8, 1, 1.3), name='thumb')
        for i in range(4):
            sphere((hx + (0.05 - i * 0.035) * s * 0.4 + 0.02 * s, hy - 0.085, hz - 0.06 + i * 0.0), P['hand'] * 0.22, SKIN,
                   sub=0, name='knuckle', seg=12)

    shirt = [('ball', (0, 0.0, 1.44), 0.36, (P['chest'], 0.72, 0.62)),
             ('ball', (0, 0, 1.2), P['waist'], (1.0, 0.7, 0.8))]
    for s in (-1, 1):
        shirt += [('ball', ((P['sh'] - 0.16) * s, 0, 1.52), 0.17 if M else 0.14, (1, 1, 1)),
                  ('cap', ARM[s]['sh'], lerp(ARM[s]['sh'], ARM[s]['el'], 0.38), P['arm'][0] * 1.18)]
        if not M:
            shirt += [('ball', (0.1 * s, -0.17, 1.42), 0.12, (1, 0.9, 0.85))]
    if M:
        shirt += [('ball', (0.0, -0.04, 1.47), 0.26, (1.2, 0.8, 0.6))]
    blob('body_shirt', KIT, shirt)

    shorts = [('ball', (0, 0, 1.0), P['hip'], (1.1, 0.75, 0.6))]
    for s in (-1, 1):
        g = LEG[s]
        shorts += [('cap', g['hip'], lerp(g['hip'], g['knee'], 0.62), P['leg'][0] * 1.08)]
    blob('body_shorts', KIT_D, shorts)

    # Head.
    hr = 0.19
    sphere((0, 0, 1.94), hr, SKIN, scale=(1, 0.95, 1.1), name='head')
    sphere((0, -0.05, 1.82), 0.13 if M else 0.115, SKIN, scale=(1.12 if M else 1.0, 1, 0.75), name='jaw')
    sphere((0, -0.19, 1.91), 0.032 if M else 0.025, SKIN, scale=(0.9, 1, 1.15), name='nose')
    for s in (-1, 1):
        sphere((0.072 * s, -0.163, 1.96), 0.032, WHITE, sub=0, name='eyewhite')
        sphere((0.072 * s, -0.188, 1.96), 0.019, IRIS, sub=0, name='iris', seg=16)
        sphere((0.072 * s, -0.2, 1.96), 0.009, EYE, sub=0, name='pupil', seg=12)
        cube((0.078 * s, -0.17, 2.012), (0.05, 0.016, 0.013 if M else 0.009), HAIR, sub=1, rot=(0, 0.12 * s, 0), name='brow')
        sphere((0.19 * s, 0, 1.93), 0.045, SKIN, scale=(0.5, 1, 1.2), name='ear')
        if not M:
            sphere((0.072 * s, -0.17, 1.985), 0.03, EYE, scale=(1.2, 0.3, 0.2), sub=0, name='lash')
    cube((0, -0.2, 1.865), (0.045, 0.01, 0.008), RED if not M else EYE, sub=1, name='mouth')

with part('base_shoes'):
    for s in (-1, 1):
        x = LEG[s]['ank'][0]
        cube((x, -0.07, 0.1), (0.13, 0.24, 0.1), WHITE, sub=2, taper=(1.0, 0.85), bevel=0.25, name='shoe')
        cube((x, -0.07, 0.025), (0.135, 0.245, 0.025), RUBBER, sub=1, bevel=0.3, name='sole')
        cube((x + 0.13 * s, -0.08, 0.11), (0.005, 0.14, 0.03), KIT, sub=0, name='stripe')
with part('body_socks'):
    for s in (-1, 1):
        cyl((LEG[s]['ank'][0], 0, 0.24), 0.105, 0.12, KIT_S, name='sock')

# ---------------------------------------------------------------- hair, beard, glasses
HZ = 1.94
with part('hair_short'):
    sphere((0, 0.03, 2.0), 0.2, HAIR, scale=(1.03, 1.0, 0.86), name='cap')
    sphere((0.0, -0.1, 2.08), 0.09, HAIR, scale=(1.6, 0.8, 0.6), name='fringe')
with part('hair_buzz'):
    sphere((0, 0.01, 1.98), 0.197, HAIR, scale=(1.0, 0.97, 0.98), name='cap')
with part('hair_long'):
    sphere((0, 0.03, 2.0), 0.205, HAIR, scale=(1.04, 1.0, 0.88), name='cap')
    cube((0, 0.1, 1.78), (0.19, 0.08, 0.2), HAIR, sub=2, taper=(1.1, 1.0), name='back')
    for s in (-1, 1):
        cube((0.17 * s, -0.04, 1.84), (0.04, 0.08, 0.16), HAIR, sub=2, name='lock')
with part('hair_ponytail'):
    sphere((0, 0.03, 2.0), 0.203, HAIR, scale=(1.03, 1.0, 0.87), name='cap')
    limb((0, 0.2, 2.02), (0, 0.27, 1.72), 0.06, 0.03, HAIR, name='tail')
    ring((0, 0.2, 2.0), 0.045, 0.014, KIT, rot=(1.2, 0, 0), name='tie')
with part('hair_bun'):
    sphere((0, 0.03, 2.0), 0.203, HAIR, scale=(1.03, 1.0, 0.87), name='cap')
    sphere((0, 0.12, 2.15), 0.08, HAIR, name='bun')
with part('hair_curly'):
    sphere((0, 0.03, 2.0), 0.2, HAIR, scale=(1.03, 1.0, 0.86), name='cap')
    for i in range(14):
        a = i / 14 * math.tau
        sphere((0.19 * math.cos(a), 0.02 + 0.17 * math.sin(a) * (1 if math.sin(a) > -0.6 else 0.3), 2.04 + 0.04 * math.sin(3 * a)),
               0.06, HAIR, sub=0, name='curl', seg=12)
with part('hair_afro'):
    sphere((0, 0.05, 2.04), 0.3, HAIR, scale=(1.05, 1.0, 0.9), name='afro')
with part('beard_stubble'):
    sphere((0, -0.06, 1.81), 0.128, HAIR, scale=(1.13, 0.98, 0.7), sub=1, name='stubble')
with part('beard_moustache'):
    cube((0, -0.205, 1.885), (0.06, 0.018, 0.016), HAIR, sub=1, name='moustache')
with part('beard_beard'):
    sphere((0, -0.09, 1.79), 0.125, HAIR, scale=(1.2, 0.85, 0.95), name='beard')
    cube((0, -0.205, 1.885), (0.06, 0.018, 0.016), HAIR, sub=1, name='moustache')
with part('glasses_round'):
    for s in (-1, 1):
        ring((0.072 * s, -0.205, 1.96), 0.045, 0.008, EYE, rot=(math.pi / 2, 0, 0), name='rim')
    cyl((0, -0.205, 1.965), 0.006, 0.05, EYE, rot=(0, math.pi / 2, 0), verts=8, name='bridge')
with part('glasses_square'):
    for s in (-1, 1):
        ring((0.072 * s, -0.205, 1.96), 0.05, 0.009, EYE, rot=(math.pi / 2, 0, math.pi / 4), segs=4, name='rim')
    cyl((0, -0.205, 1.965), 0.006, 0.05, EYE, rot=(0, math.pi / 2, 0), verts=8, name='bridge')


# ---------------------------------------------------------------- gear (one node per key)
def shoe(m, sole=RUBBER, height=0.1, name='shoe'):
    for s in (-1, 1):
        x = LEG[s]['ank'][0]
        cube((x, -0.07, height), (0.14, 0.25, height), m, sub=2, taper=(1.0, 0.85), bevel=0.25, name=name)
        cube((x, -0.07, 0.025), (0.145, 0.255, 0.028), sole, sub=1, bevel=0.3, name='sole')


with part('gear_cap'):
    sphere((0, 0.02, 2.02), 0.208, KIT, scale=(1.03, 1.02, 0.78), name='crown')
    cyl((0, -0.2, 2.03), 0.13, 0.02, KIT_D, rot=(0.25, 0, 0), scale=(1.1, 1.0, 1), name='brim')
    sphere((0, 0.02, 2.18), 0.022, KIT_S, sub=0, name='button')
with part('gear_visor'):
    ring((0, 0, 2.03), 0.2, 0.022, WHITE, scale=(1, 0.98, 1), name='band')
    cyl((0, -0.21, 2.03), 0.12, 0.016, KIT, rot=(0.2, 0, 0), scale=(1.15, 0.9, 1), name='brim')
with part('gear_headband'):
    ring((0, 0.0, 2.04), 0.198, 0.03, ACCENT, rot=(-0.12, 0, 0), name='band')
    sphere((0, 0.2, 2.06), 0.04, ACCENT, name='knot')
    for s in (-1, 1):
        cube((0.04 * s, 0.23, 1.97), (0.02, 0.012, 0.08), ACCENT, sub=1, name='tail')
with part('gear_crown'):
    cyl((0, 0.01, 2.13), 0.15, 0.08, GOLD, verts=24, name='band')
    for i in range(8):
        a = i / 8 * math.tau
        cone((0.15 * math.cos(a), 0.01 + 0.15 * math.sin(a), 2.21), 0.035, 0.1, GOLD, name='point')
    for i in range(4):
        a = i / 4 * math.tau + 0.4
        sphere((0.155 * math.cos(a), 0.01 + 0.155 * math.sin(a), 2.13), 0.018, RED if i % 2 else BLUE, sub=0, name='gem')
with part('gear_champion_helm'):
    sphere((0, 0.02, 2.03), 0.225, STEEL, scale=(1.02, 1.04, 0.95), cut=-0.05, name='dome')
    cube((0, 0.0, 2.2), (0.02, 0.16, 0.06), GOLD, sub=1, name='crest')
    for s in (-1, 1):
        cube((0.2 * s, -0.02, 1.9), (0.025, 0.07, 0.1), STEEL, sub=1, name='cheek')
        cone((0.24 * s, 0.0, 2.08), 0.045, 0.16, GOLD, rot=(0, math.radians(-60 * s), 0), name='wing')
    ring((0, 0.02, 2.02), 0.228, 0.022, GOLD, scale=(1.02, 1.04, 1), name='rim')

with part('gear_scarf'):
    ring((0, 0, 1.7), 0.15, 0.06, RED, scale=(1, 0.95, 0.8), name='wrap')
    cube((0.08, -0.15, 1.52), (0.05, 0.025, 0.14), RED, sub=1, rot=(0.15, 0, 0.1), name='end')
    for i in range(3):
        cube((0.08 + 0.025 * (i - 1), -0.16, 1.37), (0.008, 0.008, 0.02), RED, sub=0, name='fringe')
with part('gear_towel'):
    ring((0, 0, 1.69), 0.16, 0.05, WHITE, scale=(1, 0.95, 0.65), name='wrap')
    for s in (-1, 1):
        cube((0.12 * s, -0.2, 1.48), (0.055, 0.02, 0.15), WHITE, sub=1, name='end')
        cube((0.12 * s, -0.215, 1.38), (0.056, 0.005, 0.012), KIT, sub=0, name='stripe')
with part('gear_headphones'):
    ring((0, 0.02, 1.7), 0.16, 0.022, RUBBER, rot=(0.5, 0, 0), scale=(1, 1, 1), name='band')
    for s in (-1, 1):
        cyl((0.15 * s, -0.08, 1.67), 0.065, 0.05, RUBBER, rot=(0, math.pi / 2, 0.2 * s), name='cup')
        cyl((0.175 * s, -0.08, 1.67), 0.045, 0.012, KIT, rot=(0, math.pi / 2, 0.2 * s), name='cap')
with part('gear_medal'):
    for s in (-1, 1):
        limb((0.1 * s, -0.12, 1.66), (0.0, -0.27, 1.38), 0.018, 0.018, BLUE, caps=False, name='ribbon')
    cyl((0, -0.28, 1.33), 0.065, 0.02, GOLD, rot=(math.pi / 2, 0, 0), verts=24, name='disc')
    cyl((0, -0.292, 1.33), 0.04, 0.008, BRASS, rot=(math.pi / 2, 0, 0), verts=5, name='star')
with part('gear_ice_pack'):
    ring((0, 0, 1.66), 0.14, 0.008, LEATHER_D, scale=(1, 0.95, 1), rot=(0.4, 0, 0), name='cord')
    cube((0, -0.27, 1.43), (0.05, 0.02, 0.065), ICE, sub=1, rot=(0, math.radians(45), 0), name='gem')
    ring((0, -0.27, 1.43), 0.06, 0.008, STEEL, rot=(math.pi / 2, 0, 0), segs=4, name='setting')

with part('gear_pin'):
    cyl((0.14, -0.28, 1.5), 0.035, 0.015, GOLD, rot=(math.pi / 2 - 0.2, 0, 0), name='pin')
    cyl((0.14, -0.29, 1.5), 0.02, 0.008, ACCENT, rot=(math.pi / 2 - 0.2, 0, 0), name='face')
with part('gear_hr_band'):
    ring((0, 0, 1.36), 0.3 if M else 0.26, 0.02, RUBBER, scale=(1, 0.75, 1), name='strap')
    cube((0, -0.235, 1.36), (0.07, 0.02, 0.03), RUBBER, sub=1, name='pod')
with part('gear_golden_hinge'):
    for s in (-1, 1):
        cube((0.06 * s, -0.28, 1.47), (0.055, 0.015, 0.07), GOLD, sub=1, name='leaf')
    cyl((0, -0.29, 1.47), 0.02, 0.17, GOLD, name='pin')
with part('gear_frog_badge'):
    cyl((0.14, -0.28, 1.5), 0.05, 0.015, FROG, rot=(math.pi / 2 - 0.2, 0, 0), name='badge')
    for s in (-1, 1):
        sphere((0.14 + 0.02 * s, -0.29, 1.53), 0.014, WHITE, sub=0, name='eye')

with part('gear_yoga_mat'):
    cyl((0.0, 0.3, 1.4), 0.08, 0.7, PURPLE, rot=(0, math.radians(55), 0), name='roll')
    limb((-0.3, 0.27, 1.68), (0.3, 0.27, 1.12), 0.012, 0.012, LEATHER_D, caps=False, name='strap')
with part('gear_deswell_mantle'):
    cube((0, 0.28, 1.1), (0.4 if M else 0.34, 0.03, 0.55), CALM, sub=2, taper=(1.35, 0.85), rot=(0.08, 0, 0), name='cloak')
    ring((0, 0.0, 1.66), 0.2, 0.04, CALM, scale=(1.1, 1.0, 0.7), name='collar')
    sphere((0, -0.2, 1.62), 0.03, ICE, sub=0, name='clasp')
with part('gear_wind_cape'):
    cube((0, 0.3, 1.0), (0.42 if M else 0.36, 0.03, 0.66), WIND, sub=2, taper=(1.5, 0.85), rot=(0.18, 0, 0), name='cape')
    for s in (-1, 1):
        sphere(((P['sh'] - 0.12) * s, -0.05, 1.66), 0.04, GOLD, sub=0, name='clasp')

with part('gear_captain'):
    p = lerp(ARM[L]['sh'], ARM[L]['el'], 0.55)
    ring(p, P['arm'][0] * 1.2, 0.03, YELLOW, rot=(0, math.radians(-30), 0), name='band')
    cube((p[0] + 0.02, p[1] - 0.12, p[2]), (0.02, 0.005, 0.025), EYE, sub=0, name='c')

with part('gear_watch'):
    w = ARM[L]['wr']
    ring(lerp(w, ARM[L]['el'], 0.12), P['arm'][1] * 1.12, 0.03, RUBBER, rot=(0.15, 0.25, 0), name='strap')
    cyl((w[0] + 0.0, w[1] - 0.11, w[2] + 0.03), 0.045, 0.03, STEEL, rot=(math.pi / 2, 0, 0), name='case')
    cyl((w[0] + 0.0, w[1] - 0.125, w[2] + 0.03), 0.035, 0.005, ACCENT, rot=(math.pi / 2, 0, 0), name='face')
with part('gear_wristbands'):
    for s in (-1, 1):
        ring(lerp(ARM[s]['wr'], ARM[s]['el'], 0.08), P['arm'][1] * 1.2, 0.04, SAND, rot=(0.15, 0.25 * s, 0), name='band')
with part('gear_gloves'):
    for s in (-1, 1):
        sphere(ARM[s]['hd'], P['hand'] * 1.12, LEATHER, scale=(0.9, 0.85, 1.05), name='glove')
        ring(lerp(ARM[s]['wr'], ARM[s]['el'], 0.04), P['arm'][1] * 1.25, 0.035, LEATHER_D, rot=(0.15, 0.25 * s, 0), name='cuff')

with part('gear_belt'):
    ring((0, 0, 1.1), 0.3 if M else 0.27, 0.065, LEATHER, scale=(1.0, 0.72, 1.3), name='belt')
    cube((0, -0.215, 1.1), (0.085, 0.025, 0.07), BRASS, sub=1, name='buckle')
with part('gear_spring_belt'):
    ring((0, 0, 1.1), 0.3 if M else 0.27, 0.05, LEATHER_D, scale=(1.0, 0.72, 1.2), name='belt')
    cube((0, -0.215, 1.1), (0.07, 0.025, 0.06), BRASS, sub=1, name='buckle')
    for s in (-1, 1):
        for i in range(4):
            ring((0.3 * s if M else 0.28 * s, -0.02, 1.0 - i * 0.04), 0.035, 0.009, BRASS, segs=16, name='coil')

KNEE = LEG[L]['knee']


def knee_wrap(s, m, r=0.2, name='sleeve'):
    k = LEG[s]['knee']
    cyl((k[0], k[1] - 0.005, k[2]), r * P['leg'][0] / 0.15, 0.22, m, verts=20, name=name)
    for dz in (-0.11, 0.11):
        ring((k[0], k[1] - 0.005, k[2] + dz), r * P['leg'][0] / 0.15, 0.012, m, name=name + '_edge')


with part('gear_sleeve'):
    knee_wrap(L, RUBBER)
    ring((KNEE[0], KNEE[1], KNEE[2]), 0.215, 0.022, ACCENT, name='strap')
with part('gear_shin_guards'):
    for s in (-1, 1):
        g = LEG[s]
        c = lerp(g['knee'], g['ank'], 0.5)
        cube((c[0], c[1] - 0.09, c[2]), (0.09, 0.04, 0.15), KIT, sub=2, name='guard')
with part('gear_iron_brace'):
    knee_wrap(L, IRON, r=0.195, name='wrap')
    for s in (-1, 1):
        x = KNEE[0] + 0.21 * s
        cube((x, KNEE[1], KNEE[2]), (0.02, 0.03, 0.2), STEEL, sub=1, name='bar')
        cyl((x + 0.01 * s, KNEE[1], KNEE[2]), 0.035, 0.03, BRASS, rot=(0, math.pi / 2, 0), name='hinge')
with part('gear_rune_guard'):
    for s in (-1, 1):
        k = LEG[s]['knee']
        sphere((k[0], k[1] - 0.13, k[2]), 0.1, IRON, scale=(1, 0.5, 1.2), name='plate')
        cube((k[0], k[1] - 0.18, k[2]), (0.012, 0.005, 0.05), RUNE, sub=0, name='rune')
        cube((k[0], k[1] - 0.18, k[2] + 0.02), (0.035, 0.005, 0.01), RUNE, sub=0, rot=(0, 0.6, 0), name='rune2')

with part('gear_crew_socks'):
    for s in (-1, 1):
        g = LEG[s]
        c = lerp(g['ank'], g['knee'], 0.27)
        cyl((c[0], c[1], c[2]), 0.13, 0.2, WHITE, verts=20, name='sock')
        ring(lerp(g['ank'], g['knee'], 0.45), 0.118, 0.012, KIT, name='stripe')
with part('gear_gold_shoes'):
    shoe(GOLD, sole=WHITE)
with part('gear_balance_shoes'):
    shoe(KIT_S, sole=BLUE)
    for s in (-1, 1):
        cube((LEG[s]['ank'][0], -0.07, -0.01), (0.15, 0.26, 0.03), BLUE, sub=1, bevel=0.3, name='pad')
with part('gear_spikes'):
    shoe(RED, sole=RUBBER)
    for s in (-1, 1):
        for i in range(3):
            cone((LEG[s]['ank'][0], -0.2 + 0.06 * i, -0.01), 0.02, 0.05, STEEL, rot=(math.pi, 0, 0), name='spike')
with part('gear_pilgrim_boots'):
    for s in (-1, 1):
        x = LEG[s]['ank'][0]
        cube((x, -0.08, 0.11), (0.15, 0.26, 0.11), LEATHER, sub=2, taper=(1.0, 0.85), bevel=0.25, name='boot')
        cyl((x, 0.0, 0.3), 0.135, 0.3, LEATHER, name='shaft')
        ring((x, 0, 0.45), 0.14, 0.03, SAND, name='cuff')
        ring((x, 0, 0.25), 0.137, 0.012, LEATHER_D, name='lace')
with part('gear_wing_shoes'):
    shoe(WHITE, sole=ACCENT)
    for s in (-1, 1):
        x = LEG[s]['ank'][0]
        for i, (h, ln) in enumerate(((0.16, 0.11), (0.12, 0.09), (0.08, 0.07))):
            sphere((x + 0.15 * s, 0.03 + i * 0.03, h), 0.05, WIND, scale=(0.15, ln / 0.05, 0.4), rot=(0.5, 0, 0), sub=0,
                   name='feather')

HD = ARM[R]['hd']
with part('gear_sport_item'):
    sphere((HD[0] - 0.02, HD[1] - 0.16, HD[2] + 0.02), 0.11, WHITE, sub=1, name='ball')
    for a in (0, math.pi / 2):
        ring((HD[0] - 0.02, HD[1] - 0.16, HD[2] + 0.02), 0.111, 0.006, EYE, rot=(a, 0, 0), name='seam')
with part('gear_crutch_staff'):
    cyl((HD[0], HD[1], HD[2] - 0.2), 0.03, 1.5, WOOD, verts=10, name='staff')
    sphere((HD[0], HD[1], HD[2] + 0.6), 0.06, ICE, sub=0, name='gem')
    ring((HD[0], HD[1], HD[2] + 0.52), 0.045, 0.012, BRASS, name='band')
with part('gear_smith_hammer'):
    cyl((HD[0], HD[1], HD[2] + 0.05), 0.03, 0.75, WOOD, verts=10, name='handle')
    cube((HD[0], HD[1], HD[2] + 0.45), (0.17, 0.09, 0.09), IRON, sub=1, bevel=0.2, name='head')
    ring((HD[0], HD[1], HD[2] + 0.35), 0.04, 0.012, BRASS, name='band')

with part('aid_crutches'):
    for s in (-1, 1):
        hx, hy, hz = ARM[s]['hd']
        x = hx + 0.03 * s
        cyl((x, hy + 0.05, (hz + 0.0) / 2), 0.022, hz, STEEL, verts=10, name='shaft')
        cube((x, hy - 0.02, hz), (0.025, 0.08, 0.02), RUBBER, sub=1, name='grip')
        cyl((x, hy + 0.05, hz + 0.14), 0.05, 0.08, KIT, rot=(math.pi / 2, 0, 0), verts=16, name='cuff')
        sphere((x, hy + 0.05, 0.015), 0.03, RUBBER, sub=0, name='tip')

# ---------------------------------------------------------------- outfits (overlays; colours set by the viewer)
def long_sleeves(m=KIT):
    for s in (-1, 1):
        a = ARM[s]
        limb(a['sh'], a['el'], P['arm'][0] * 1.3, P['arm'][1] * 1.32, m, sub=1, name='sleeve')
        limb(a['el'], lerp(a['el'], a['wr'], 0.9), P['arm'][1] * 1.32, P['arm'][1] * 1.25, m, sub=1, name='forearm')


def long_pants(m=KIT_D):
    for s in (-1, 1):
        g = LEG[s]
        limb(lerp(g['hip'], g['knee'], 0.4), g['knee'], P['leg'][0] * 1.25, P['leg'][0] * 1.3, m, sub=1, name='thigh')
        limb(g['knee'], lerp(g['knee'], g['ank'], 0.92), P['leg'][0] * 1.3, P['leg'][1] * 1.3, m, sub=1, name='shin')


def high_socks(m=KIT_S):
    for s in (-1, 1):
        g = LEG[s]
        c = lerp(g['ank'], g['knee'], 0.42)
        cyl((c[0], c[1], c[2]), 0.135, 0.3, m, verts=20, name='sock')


def number(z=1.45, y=-0.27, m=KIT_S):
    cube((0, y, z), (0.07, 0.01, 0.085), m, sub=1, name='number')


with part('outfit_tracksuit'):
    long_sleeves()
    long_pants()
    for s in (-1, 1):
        cube((P['sh'] * s * 1.0 + 0.1 * s, -0.02, 1.3), (0.006, 0.05, 0.25), KIT_S, sub=0, rot=(0, -0.5 * s, 0), name='stripe')
    cube((0, -0.24, 1.42), (0.008, 0.01, 0.2), KIT_S, sub=0, name='zip')
with part('outfit_team_kit'):
    number()
    for s in (-1, 1):
        ring(lerp(ARM[s]['sh'], ARM[s]['el'], 0.36), P['arm'][0] * 1.25, 0.018, KIT_S, rot=(0, -0.5 * s, 0), name='cuff')
    high_socks()
with part('outfit_champion'):
    # The fantasy touch: layered shoulder plates with gold trim.
    for s in (-1, 1):
        for i, (r, z, sc) in enumerate(((0.25, 1.6, 0.5), (0.2, 1.68, 0.55))):
            o = sphere(((P['sh'] + 0.04) * s, 0, z), r * (1 if M else 0.85), KIT if i == 0 else KIT_D, scale=(1.1, 1.05, sc), name='plate')
            o.rotation_euler = (0, math.radians(-22 * s), 0)
        ring(((P['sh'] + 0.04) * s, 0, 1.57), 0.255 * (1 if M else 0.85), 0.03, GOLD, rot=(0, math.radians(-22 * s), 0), scale=(1.1, 1.05, 1), name='trim')
        cone(((P['sh'] + 0.1) * s, 0.0, 1.82), 0.06, 0.2, GOLD, rot=(0, math.radians(-30 * s), 0), name='horn')
    ring((0, 0, 1.1), 0.3 if M else 0.27, 0.05, GOLD, scale=(1.0, 0.72, 1), name='sash')
    sphere((0, -0.27, 1.46), 0.07, GOLD, scale=(1, 0.25, 1.25), name='emblem')
    sphere((0, -0.285, 1.46), 0.037, ACCENT, scale=(1, 0.3, 1.3), name='emblem_core')
with part('outfit_sport_football'):
    number()
    high_socks()
    cube((0, -0.25, 1.62), (0.09, 0.02, 0.03), KIT_S, sub=1, name='collar')
with part('outfit_sport_basketball'):
    number(z=1.4)
    for s in (-1, 1):
        g = LEG[s]
        limb(g['hip'], lerp(g['hip'], g['knee'], 0.85), P['leg'][0] * 1.15, P['leg'][0] * 1.15, KIT_D, sub=1, caps=False, name='longshort')
with part('outfit_sport_hockey'):
    high_socks()
    for s in (-1, 1):
        g = LEG[s]
        c = lerp(g['knee'], g['ank'], 0.5)
        cube((c[0], c[1] - 0.1, c[2]), (0.085, 0.035, 0.14), KIT_D, sub=2, name='pad')
    number()
with part('outfit_sport_ski'):
    long_sleeves()
    long_pants()
    ring((0, 0, 2.0), 0.205, 0.03, KIT_D, rot=(-0.15, 0, 0), name='strap')
    cube((0, -0.2, 1.97), (0.12, 0.03, 0.045), ICE, sub=2, name='goggles')
with part('outfit_sport_running'):
    cube((0, -0.27, 1.32), (0.1, 0.008, 0.07), WHITE, sub=0, name='bib')
    cube((0, -0.28, 1.32), (0.06, 0.004, 0.03), EYE, sub=0, name='bibno')
with part('outfit_sport_padel'):
    number(z=1.48)
    ring((0, 0, 2.03), 0.2, 0.022, WHITE, name='band')
    cyl((0, -0.21, 2.03), 0.11, 0.016, KIT, rot=(0.2, 0, 0), scale=(1.15, 0.9, 1), name='brim')

# ---------------------------------------------------------------- export / render
if EXPORT:
    # Metaballs become meshes so the glTF exporter keeps them.
    for o in list(scene.objects):
        if o.type == 'META':
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            parent = o.parent
            bpy.ops.object.convert(target='MESH')
            n = bpy.context.view_layer.objects.active
            n.parent = parent
            dec = n.modifiers.new('dec', 'DECIMATE')
            dec.ratio = 0.35
    os.makedirs(os.path.dirname(os.path.abspath(args.glb)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=args.glb, export_apply=True, export_yup=True, export_cameras=False,
                              export_lights=False, export_extras=False, export_animations=False)

if args.render:
    show = set(x for x in args.show.split(',') if x)
    toggles = ('gear_', 'outfit_', 'hair_', 'beard_', 'glasses_', 'aid_')

    def hide(o, h):
        o.hide_render = h
        for c in o.children:
            hide(c, h)

    for o in scene.objects:
        if o.parent is None and o.name.startswith(toggles):
            hide(o, o.name not in show)
    if any(s in show for s in ('gear_gold_shoes', 'gear_balance_shoes', 'gear_spikes', 'gear_pilgrim_boots', 'gear_wing_shoes')):
        hide(bpy.data.objects['base_shoes'], True)

    cyl((0, 0, -0.06), 0.62, 0.12, STONE, verts=8, name='pedestal')
    cyl((0, 0, 0.01), 0.56, 0.03, mat('ped', '#29483c'), verts=8, name='pedestal_top')
    world = bpy.data.worlds.new('w')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = hexrgb('#e8eee9')
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6

    def light(loc, energy, size, color):
        d = bpy.data.lights.new('l', 'AREA')
        d.energy, d.size, d.color = energy, size, hexrgb(color)[:3]
        o = bpy.data.objects.new('l', d)
        o.location = loc
        scene.collection.objects.link(o)
        o.rotation_euler = (Vector((0, 0, 1.1)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()

    light((-2.5, -3.0, 3.5), 900, 3, '#fff4e6')
    light((3.0, -2.0, 1.5), 250, 3, '#e6f0ff')
    light((0.5, 3.0, 3.0), 700, 2, '#ffffff')
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.lens = 60
    scene.collection.objects.link(cam)
    scene.camera = cam
    a = math.radians(args.angle)
    cam.location = (6.4 * math.sin(a), -6.4 * math.cos(a), 1.6)
    cam.rotation_euler = (Vector((0, 0, 1.1)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    w, h = (int(x) for x in args.size.split('x'))
    r = scene.render
    r.resolution_x, r.resolution_y = w, h
    r.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = False  # the distro build has no OpenImageDenoise
    scene.view_settings.view_transform = 'Standard'
    r.film_transparent = True
    r.use_freestyle = True
    r.line_thickness = 1.3
    ls = scene.view_layers[0].freestyle_settings.linesets[0]
    ls.linestyle = ls.linestyle or bpy.data.linestyles.new('ink')
    ls.linestyle.color = hexrgb('#141c18')[:3]
    ls.select_by_edge_types = True
    ls.select_crease = False
    ls.select_border = False
    ls.select_silhouette = True
    ls.select_external_contour = True
    r.filepath = os.path.abspath(args.render)
    bpy.ops.render.render(write_still=True)
