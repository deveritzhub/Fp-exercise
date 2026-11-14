"""Build eight naturally proportioned FP Flow characters from MakeHuman/MPFB.
Each frame/build gets fitted clothing, CC0 hair and every equipment node.
See README.md for Python 3.13 / Blender 5.2.3 setup and reproducible build commands.
Existing idle, walk, run and cheer animations are retained.
"""
import argparse
import math
import os
import sys

import bpy  # noqa: I001  (must come first: it makes addon_utils importable)
import addon_utils
import bmesh
from mathutils import Matrix, Quaternion, Vector
from mathutils.kdtree import KDTree

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument('--frame', choices=['m', 'f'], default='m')
ap.add_argument('--build', choices=['slim', 'average', 'athletic', 'full'], default='average')
ap.add_argument('--assets', default=os.path.join(os.path.dirname(__file__), 'assets'))
ap.add_argument('--eyes', required=True, help='MakeHuman data/eyes folder')
ap.add_argument('--glb', default='')
ap.add_argument('--render', default='')
ap.add_argument('--show', default='')
ap.add_argument('--angle', type=float, default=-25)
ap.add_argument('--samples', type=int, default=48)
ap.add_argument('--size', default='900x1200')
ap.add_argument('--face', action='store_true', help='close-up of the head')
ap.add_argument('--pose', default='', help='render a frame of a motion, e.g. walk:8 (motion:frame)')
ap.add_argument('--side', action='store_true', help='render from the side (to judge a gait)')
ap.add_argument('--study', action='store_true', help='Build the single art-direction study; does not replace production models')
args = ap.parse_args(argv)
if args.study and (args.frame != 'f' or args.build != 'average'):
    ap.error('--study is the single female/average style study; other builds use the normal generator')
M = args.frame == 'm'
EXPORT = bool(args.glb)

addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.user_default.mpfb.services.targetservice import TargetService  # noqa: E402

scene = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)


# ---------------------------------------------------------------- materials
def hexrgb(h, a=1.0):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4)) + (a,)


MATS = {}


def mat(name, color, rough=0.75, metal=0.0, emit=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_fake_user = True  # MPFB purges unused materials while it builds the human
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


SKIN = mat('skin', '#d9a77f', 0.5)
SKIN.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value = 0.06
SKIN.node_tree.nodes['Principled BSDF'].inputs['Subsurface Radius'].default_value = (1.0, 0.45, 0.25)
LIPS = mat('lips', '#c27e6e', 0.5)
HAIR = mat('hair', '#3b2a20', 0.8)
IRIS = mat('iris', '#5a3a22', 0.3)
KIT = mat('kit_main', '#29483c', 0.75)
KIT_D = mat('kit_dark', '#1d362d', 0.8)
KIT_S = mat('kit_soft', '#e6eee8', 0.75)
EYE = mat('eye', '#141c18', 0.3)
WHITE = mat('white', '#f4f6f4', 0.5)
SCLERA = mat('sclera', '#f2efe9', 0.25)
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

# ---------------------------------------------------------------- MakeHuman body
macro = TargetService.get_default_macro_info_dict()
BUILD_MACROS = {'slim': (0.3, 0.25), 'average': (0.5, 0.5), 'athletic': (0.8, 0.45), 'full': (0.4, 0.85)}
muscle, weight = BUILD_MACROS[args.build]
macro.update(gender=1.0 if M else 0.0, age=0.45, muscle=muscle, weight=weight, proportions=0.5, height=0.6,
             cupsize=0.45, firmness=0.7)
macro['race'] = {'asian': 0.33, 'caucasian': 0.34, 'african': 0.33}
human = HumanService.create_human(macro_detail_dict=macro, feet_on_ground=True, scale=0.1)
if args.study:
    from hero_study import soften_face
    soften_face(human, TargetService)
rig = HumanService.add_builtin_rig(human, 'game_engine')
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')


def aim(name, d):
    pb = rig.pose.bones[name]
    q = (pb.tail - pb.head).normalized().rotation_difference(Vector(d).normalized())
    loc = pb.head.copy()
    pb.matrix = Matrix.Translation(loc) @ q.to_matrix().to_4x4() @ Matrix.Translation(-loc) @ pb.matrix
    bpy.context.view_layer.update()


def curl(name, deg):
    pb = rig.pose.bones[name]
    pb.rotation_mode = 'XYZ'
    pb.rotation_euler.x = math.radians(deg)
    bpy.context.view_layer.update()


# A relaxed hero stance with loose fists.
for s, sg in (('l', 1), ('r', -1)):
    aim(f'upperarm_{s}', ((0.18 if args.study else 0.3) * sg, 0.03, -1))
    aim(f'lowerarm_{s}', (0.18 * sg, -0.28, -1))
    aim(f'hand_{s}', (0.08 * sg, -0.12, -1))
    for f in ('index', 'middle', 'ring', 'pinky'):
        for i, d in (((1, 18), (2, 24), (3, 18)) if args.study else ((1, 55), (2, 70), (3, 50))):
            curl(f'{f}_0{i}_{s}', d)
    curl(f'thumb_02_{s}', 25)
    curl(f'thumb_03_{s}', 25)
bpy.ops.object.mode_set(mode='OBJECT')

eyes = HumanService.add_mhclo_asset(os.path.join(args.eyes, 'high-poly', 'high-poly.mhclo'), human, asset_type='Eyes',
                                    subdiv_levels=0, material_type='MAKESKIN', set_up_rigging=True)
# Fit official CC0 MHCLO meshes before applying the pose/removing helper geometry.
ASSETS = {
    'hair_short': 'system/hair/short01/short01.mhclo',
    'hair_buzz': 'system/hair/short01/short01.mhclo',
    'hair_long': 'system/hair/long01/long01.mhclo',
    'hair_ponytail': 'system/hair/ponytail01/ponytail01.mhclo',
    'hair_bun': 'hair/hair/rehmanpolanski_hair_bun_brown/rehmanpolanski_hair_bun_brown.mhclo',
    'hair_curly': 'hair/hair/cortu_strawberry_cloud_hair/cortu_strawberry_cloud_hair.mhclo',
    'hair_afro': 'system/hair/afro01/afro01.mhclo',
    'body_eyebrows': 'system/eyebrows/eyebrow001/eyebrow001.mhclo',
    'body_eyelashes': 'system/eyelashes/eyelashes01/eyelashes01.mhclo',
}
asset_objects = []
for node_name, relative in ASSETS.items():
    ob = HumanService.add_mhclo_asset(os.path.join(args.assets, relative), human,
         asset_type='Hair' if node_name.startswith('hair_') else 'Eyebrows' if node_name == 'body_eyebrows' else 'Eyelashes',
         subdiv_levels=0, material_type='MAKESKIN', set_up_rigging=True)
    ob.name = node_name
    # Preserve strand transparency, but remove baked hair colour so all choices tint correctly.
    images = [n.image for m in ob.data.materials if m and m.use_nodes for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image]
    material = HAIR.copy()
    material.name = 'hair'
    material.use_fake_user = True
    if images:
        import numpy as np
        image = images[0].copy()
        resolution = 256 if args.study and node_name == 'hair_bun' else 160
        image.scale(resolution, resolution)
        pixels = np.array(image.pixels[:], dtype=np.float32).reshape(-1, 4)
        shade = 0.55 + 0.45 * pixels[:, :3].mean(axis=1)
        pixels[:, :3] = shade[:, None]
        image.pixels.foreach_set(pixels.ravel())
        image.pack()
        texture = material.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = image
        bsdf = material.node_tree.nodes['Principled BSDF']
        material.node_tree.links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
        material.node_tree.links.new(texture.outputs['Alpha'], bsdf.inputs['Alpha'])
        material.surface_render_method = 'DITHERED'
    ob.data.materials.clear()
    ob.data.materials.append(material)
    for poly in ob.data.polygons:
        poly.material_index = 0
        poly.use_smooth = True
    asset_objects.append(ob)

for ob in (human, eyes, *asset_objects):
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    if ob.data.shape_keys:
        bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
    for mod in list(ob.modifiers):
        if mod.type == 'ARMATURE':
            bpy.ops.object.modifier_apply(modifier=mod.name)
    ob.parent = None
    ob.matrix_world = ob.matrix_world.copy()

for ob in asset_objects:
    if ob.name == 'hair_buzz':
        # A close-cropped derivative of the official short mesh, fitted to this head.
        shrink = ob.modifiers.new('close_crop', 'SHRINKWRAP')
        shrink.target = human
        shrink.wrap_method = 'NEAREST_SURFACEPOINT'
        shrink.offset = 0.002
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=shrink.name)
    ob.data.transform(ob.matrix_world)
    ob.matrix_world = Matrix()
    ob.vertex_groups.clear()

BONE = {b.name: (rig.matrix_world @ rig.pose.bones[b.name].head, rig.matrix_world @ rig.pose.bones[b.name].tail) for b in rig.data.bones}
mw = human.matrix_world.copy()
GI = {g.name: g.index for g in human.vertex_groups}


def joint(n):
    g = GI['joint-' + n]
    vs = [mw @ v.co for v in human.data.vertices if any(x.group == g for x in v.groups)]
    return sum(vs, Vector()) / len(vs)


J = {n: joint(n) for n in ('head', 'neck', 'mouth', 'l-eye', 'r-eye', 'pelvis', 'l-knee', 'r-knee', 'l-ankle', 'r-ankle')}

# Remove helper geometry; retain the rig for the existing motions.
bm = bmesh.new()
bm.from_mesh(human.data)
dl = bm.verts.layers.deform.active
drop = {GI['HelperGeometry'], GI['JointCubes']}
bmesh.ops.delete(bm, geom=[v for v in bm.verts if any(g in drop for g in v[dl].keys())], context='VERTS')
bm.to_mesh(human.data)
bm.free()
human.data.transform(mw)
human.matrix_world = Matrix()
for m in list(human.modifiers):
    human.modifiers.remove(m)
# The rig stays, for the motions: the hero stance becomes its rest pose, in metres at the origin.
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
rig.name = 'rig'
rig.select_set(False)
eyes.data.transform(eyes.matrix_world)
eyes.matrix_world = Matrix()

# Per-vertex: position, normal, dominant bone and position along that bone.
BONES = set(BONE)
GNAME = {g.index: g.name for g in human.vertex_groups}
human.data.update()
VX = []
for v in human.data.vertices:
    best, bw = None, 0.0
    for x in v.groups:
        n = GNAME.get(x.group)
        if n in BONES and x.weight > bw:
            best, bw = n, x.weight
    t = 0.0
    if best:
        h0, t0 = BONE[best]
        d = t0 - h0
        t = (v.co - h0).dot(d) / max(d.length_squared, 1e-9)
    groups = {GNAME.get(x.group) for x in v.groups if x.weight > 0.3}
    VX.append((v.co.copy(), v.normal.copy(), best, t, groups))


def side(b):
    return 1 if b.endswith('_l') else -1 if b.endswith('_r') else 0


# ---------------------------------------------------------------- measurements
def pts(pred):
    return [c for c, n, b, t, g in VX if pred(c, n, b, t, g)]


def bbox(ps):
    lo = Vector((min(p.x for p in ps), min(p.y for p in ps), min(p.z for p in ps)))
    hi = Vector((max(p.x for p in ps), max(p.y for p in ps), max(p.z for p in ps)))
    return lo, hi


HEAD_PTS = pts(lambda c, n, b, t, g: b == 'head')
HLO, HHI = bbox(HEAD_PTS)
HC = (HLO + HHI) / 2
HR = (HHI - HLO) / 2           # head half-sizes
TOP = HHI.z
EYE_Z = (J['l-eye'].z + J['r-eye'].z) / 2
FRONT_Y = HLO.y


def section(ps, z, dz=0.012):
    """Centre and half-sizes of the points within dz of height z."""
    s = [p for p in ps if abs(p.z - z) < dz]
    lo, hi = bbox(s)
    return (lo + hi) / 2, (hi - lo) / 2


TORSO = pts(lambda c, n, b, t, g: b in ('spine_01', 'spine_02', 'spine_03', 'pelvis'))
CHEST_Z = BONE['spine_03'][0].z + 0.03
CHEST_C, CHEST_R = section(TORSO, CHEST_Z)
WAIST_Z = BONE['spine_01'][0].z
WAIST_C, WAIST_R = section(TORSO, WAIST_Z)
NECK_H, NECK_T = BONE['neck_01']
NECK_C, _nr = section(pts(lambda c, n, b, t, g: b == 'neck_01'), (NECK_H.z + NECK_T.z) / 2)
NECK_R = (_nr.x + _nr.y) / 2


def limb_r(bone, t0):
    h0, t1 = BONE[bone]
    axis = (t1 - h0).normalized()
    ds = []
    for c, n, b, t, g in VX:
        if b == bone and abs(t - t0) < 0.08:
            v = c - h0
            ds.append((v - axis * v.dot(axis)).length)
    ds.sort()
    return ds[len(ds) // 2] if ds else 0.04


def along(bone, t):
    h0, t1 = BONE[bone]
    return h0.lerp(t1, t)


def hem(bone, t, keep):
    """A clean cut across a limb at `t` along `bone`; keep the 'head' or 'tail' side."""
    h0, t1 = BONE[bone]
    d = (t1 - h0).normalized()
    p = h0.lerp(t1, t)
    r = limb_r(bone, min(max(t, 0.05), 0.95)) * 2.2

    arm = bone.startswith(('upperarm', 'lowerarm'))

    def region(co):
        v = co - p
        a = v.dot(d)
        if arm and abs(co.x) < abs(p.x) - r * 0.5:  # never cut into the torso under the arm
            return False
        return abs(a) < 0.1 and (v - d * a).length < r

    return (p, -d if keep == 'head' else d, region)


def hems(bones, t, keep):
    return [hem(b, t, keep) for b in bones]


ARMS_U = ('upperarm_l', 'upperarm_r')
ARMS_L = ('lowerarm_l', 'lowerarm_r')
THIGHS = ('thigh_l', 'thigh_r')
CALVES = ('calf_l', 'calf_r')

HAND = {}
for s, sg in (('l', 1), ('r', -1)):
    hp = pts(lambda c, n, b, t, g, s=s: b and b.endswith('_' + s) and (b.startswith(('hand', 'index', 'middle', 'ring', 'pinky', 'thumb'))))
    lo, hi = bbox(hp)
    HAND[sg] = ((lo + hi) / 2, (hi - lo) / 2)
FOOT = {}
for s, sg in (('l', 1), ('r', -1)):
    fp = pts(lambda c, n, b, t, g, s=s: b in (f'foot_{s}', f'ball_{s}'))
    FOOT[sg] = bbox(fp)
L, R = 1, -1
SIDE = {L: 'l', R: 'r'}
print('MEASURE', 'height', round(TOP, 3), 'head', tuple(round(x, 3) for x in HR), 'chest', tuple(round(x, 3) for x in CHEST_R))

# ---------------------------------------------------------------- object helpers
STACK = []


class part:
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
        mod.levels = mod.render_levels = sub
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
    if EXPORT:
        seg = max(10, seg * 2 // 3)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, rotation=rot, segments=seg, ring_count=seg // 2)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    if cut is not None:
        b2 = bmesh.new()
        b2.from_mesh(o.data)
        bmesh.ops.delete(b2, geom=[v for v in b2.verts if v.co.z < cut * r - 1e-6], context='VERTS')
        b2.to_mesh(o.data)
        b2.free()
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


def ring_on(axis_a, axis_b, major, minor, m, name='ring'):
    """A ring around the segment axis_a→axis_b (at axis_a), e.g. a band around a limb."""
    a, b = Vector(axis_a), Vector(axis_b)
    o = ring(a, major, minor, m, name=name)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference((b - a).normalized())
    return o


def cyl(loc, r, depth, m, rot=(0, 0, 0), verts=24, scale=(1, 1, 1), name='cyl'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    return finish(o, m, 0, smooth=verts > 8)


def cyl_between(p1, p2, r, m, verts=12, name='rod'):
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    o = cyl((p1 + p2) / 2, r, d.length, m, verts=verts, name=name)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return o


def cone(loc, r, depth, m, rot=(0, 0, 0), verts=12, name='cone'):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=0, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    return finish(o, m, 0)


FRONT = 0.006  # extra room in front of the chest, where the cloth bridges
DRAPE = 0.010  # how far loose cloth hangs off the body, on top of a shell's own offset


def shell(name, m, pick, off, thick=0.002, sub=0, src=None, cuts=(), loose=None):
    """A copy of the body faces whose vertices all pass `pick`, pushed `off` metres outward.
    loose: cloth that hangs instead of clinging. A number, or a function of the position, of extra metres;
    the shell is then smoothed so it bridges the hollows of the body, and its hems stand open.
    cuts: (point, normal) planes; only the side the normal points to is kept, for clean edges."""
    src = src or human
    keep = [pick(*VX[i]) for i in range(len(VX))]
    b2 = bmesh.new()
    b2.from_mesh(src.data)
    b2.verts.ensure_lookup_table()
    b2.faces.ensure_lookup_table()
    bmesh.ops.delete(b2, geom=[f for f in b2.faces if not all(keep[v.index] for v in f.verts)], context='FACES_ONLY')
    bmesh.ops.delete(b2, geom=[v for v in b2.verts if not v.link_faces], context='VERTS')
    for cut in cuts:
        pc, pn = Vector(cut[0]), Vector(cut[1])
        region = cut[2] if len(cut) > 2 else (lambda co: True)
        vs = {v for v in b2.verts if region(v.co)}
        geom = list(vs) + [e for e in b2.edges if all(v in vs for v in e.verts)] + [f for f in b2.faces if all(v in vs for v in f.verts)]
        if geom:
            bmesh.ops.bisect_plane(b2, geom=geom, plane_co=pc, plane_no=pn, clear_inner=True)
        bmesh.ops.delete(b2, geom=[v for v in b2.verts if not v.link_faces], context='VERTS')
    b2.normal_update()
    if loose is None:
        for v in b2.verts:
            v.co += v.normal * off
    else:
        slack = loose if callable(loose) else (lambda co: loose)
        tight = [(v.co + v.normal * off, v.normal.copy()) for v in b2.verts]
        rim = {v for e in b2.edges if e.is_boundary for v in e.verts}
        for v in b2.verts:
            v.co += v.normal * (off + slack(v.co) * (1.25 if v in rim else 1.0))
        inner = [v for v in b2.verts if v not in rim]
        for _ in range(14):
            bmesh.ops.smooth_vert(b2, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        # Cloth lies on the body where it is pulled tight, never inside it.
        for v, (p0, n0) in zip(b2.verts, tight):
            d = (v.co - p0).dot(n0)
            if d < 0:
                v.co -= n0 * d
    me = bpy.data.meshes.new(name)
    b2.to_mesh(me)
    b2.free()
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    # Same vertex groups as the source, in the same order: the shell moves exactly like the body under it.
    for g in src.vertex_groups:
        o.vertex_groups.new(name=g.name)
    if thick and not EXPORT:  # in the app a single-sided shell is enough and half the size
        so = o.modifiers.new('thick', 'SOLIDIFY')
        so.thickness = thick
        so.offset = 1
    return finish(o, m, sub)


def bone_in(*names, tmin=-99.0, tmax=99.0):
    ns = set(names)
    return lambda c, n, b, t, g: b in ns and tmin <= t <= tmax


def any_of(*preds):
    return lambda *a: any(p(*a) for p in preds)


SH = {sg: BONE[f'upperarm_{s}'][0] for s, sg in (('l', L), ('r', R))}
SHW = (SH[L].x - SH[R].x) / 2
EL = {sg: BONE[f'lowerarm_{s}'][0] for s, sg in (('l', L), ('r', R))}
WR = {sg: BONE[f'hand_{s}'][0] for s, sg in (('l', L), ('r', R))}
HIP = {sg: BONE[f'thigh_{s}'][0] for s, sg in (('l', L), ('r', R))}
KNEE = {sg: BONE[f'calf_{s}'][0] for s, sg in (('l', L), ('r', R))}
ANK = {sg: BONE[f'foot_{s}'][0] for s, sg in (('l', L), ('r', R))}
U = HR.x / 0.19  # converts sizes drawn for the old 0.19 m head to this body

# ---------------------------------------------------------------- body nodes
with part('body'):
    human.name = 'body_skin'
    human.data.materials.clear()
    human.data.materials.append(SKIN)
    human.data.materials.append(LIPS)
    lips = GI.get('lips')
    for p in human.data.polygons:
        p.use_smooth = True
        if lips is not None and all('lips' in VX[i][4] for i in p.vertices):
            p.material_index = 1
    adopt(human)
    if not EXPORT:
        sm = human.modifiers.new('sub', 'SUBSURF')
        sm.levels = sm.render_levels = 1
    # Eyes: sclera, iris (tinted) and pupil; the iris is the cap of each eyeball that looks forward.
    eyes.name = 'body_eyes'
    eyes.data.materials.clear()
    for m_ in (SCLERA, IRIS, EYE):
        eyes.data.materials.append(m_)
    ev = eyes.data.vertices
    for sgn in (1, -1):
        ps = [v.co for v in ev if v.co.x * sgn > 0]
        cen = sum(ps, Vector()) / len(ps)
        rad = max((p - cen).length for p in ps)
        for p in eyes.data.polygons:
            if p.center.x * sgn <= 0:
                continue
            d = (p.center - cen).normalized()
            fwd = d.dot(Vector((0, -1, 0)))
            # A large iris with little white round it: a calm look instead of a stare.
            p.material_index = 2 if fwd > 0.955 else 1 if fwd > 0.74 else 0
            p.use_smooth = True
    adopt(eyes)
    # Base kit: T-shirt and shorts that follow the body.
    shirt0 = any_of(bone_in('spine_01', 'spine_02', 'spine_03', 'clavicle_l', 'clavicle_r'),
                    bone_in('upperarm_l', 'upperarm_r', tmax=0.6),
                    lambda c, n, b, t, g: b in ('neck_01', 'head') and c.z < BONE['neck_01'][0].z + 0.012,
                    lambda c, n, b, t, g: b == 'pelvis' and c.z > BONE['pelvis'][0].z + 0.015)
    neck0 = BONE['neck_01'][0]
    hole = NECK_R * 1.35

    def shirt(c, n, b, t, g):
        return shirt0(c, n, b, t, g)

    # A T-shirt that hangs: over the waistband, with open sleeves.
    shell('body_shirt', KIT, shirt, 0.006, thick=0.003, cuts=hems(ARMS_U, 0.5, 'head') + [((0, 0, BONE['pelvis'][0].z + 0.04), (0, 0, 1), lambda co: co.z < BONE['pelvis'][0].z + 0.1 and abs(co.x) < SHW * 1.2),
                                              # A round collar: one clean cut across the base of the neck, lower in front.
                                              ((NECK_C.x, NECK_C.y, neck0.z + 0.004), (0, 0.3, -1),
                                               lambda co: co.z > neck0.z - 0.07 and math.hypot(co.x - NECK_C.x, co.y - NECK_C.y) < hole * 2.4)],
          loose=DRAPE)
    shorts = any_of(bone_in('pelvis'), bone_in('thigh_l', 'thigh_r', tmax=0.75),
                    lambda c, n, b, t, g: b == 'spine_01' and c.z < BONE['pelvis'][0].z + 0.11)
    waist_z, knee_z = BONE['pelvis'][0].z + 0.06, KNEE[L].z

    def legs_open(co):
        # Snug at the waist, wide at the hem.
        k = min(1.0, max(0.0, (waist_z - co.z) / max(0.05, waist_z - knee_z) * 2.0))
        return 0.002 + 0.016 * k

    shell('body_shorts', KIT_D, shorts, 0.005, thick=0.003, cuts=hems(THIGHS, 0.64, 'head'), loose=legs_open)

with part('body_socks'):
    shell('socks', KIT_S, bone_in('calf_l', 'calf_r', tmin=0.78), 0.002, thick=0.0, cuts=hems(CALVES, 0.86, 'tail'))


def shoes(m, sole=RUBBER, extra=None, name='shoe'):
    for s in (L, R):
        lo, hi = FOOT[s]
        # A smooth shoe last encloses the toes rather than copying each toe's skin.
        cx = (lo.x + hi.x) / 2
        half = (hi.x - lo.x) / 2 + 0.012
        length = hi.y - lo.y + 0.035
        height = max(0.10, hi.z - lo.z)
        rings = [(0, .10, .28), (.07, .75, .48), (.23, 1, .55), (.5, 1, .72), (.74, .9, 1), (.93, .75, .95), (1, .15, .65)]
        vertices, faces = [], []
        sides = 16
        for t, width, rise in rings:
            for i in range(sides):
                angle = math.tau * i / sides
                vertices.append((cx + math.cos(angle) * half * width,
                                 lo.y - .02 + t * length,
                                 .015 + (math.sin(angle) + 1) / 2 * height * rise))
        for j in range(len(rings) - 1):
            for i in range(sides):
                faces.append((j*sides+i, j*sides+(i+1)%sides, (j+1)*sides+(i+1)%sides, (j+1)*sides+i))
        faces.extend([tuple(reversed(range(sides))), tuple((len(rings)-1)*sides+i for i in range(sides))])
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(vertices, [], [tuple(reversed(face)) for face in faces])
        mesh.update()
        shoe = bpy.data.objects.new(name, mesh)
        scene.collection.objects.link(shoe)
        finish(shoe, m, sub=1)
        cube(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, 0.008), ((hi.x - lo.x) / 2 + 0.012, (hi.y - lo.y) / 2 + 0.014, 0.012), sole,
             sub=1, bevel=0.3, name='sole')


with part('base_shoes'):
    shoes(WHITE)
    for s in (L, R):
        lo, hi = FOOT[s]
        cube((hi.x + 0.006 if s == L else lo.x - 0.006, (lo.y + hi.y) / 2, 0.04), (0.002, (hi.y - lo.y) / 3, 0.012), KIT, sub=0, name='stripe')

# ---------------------------------------------------------------- hair, beard, glasses
jaw = lambda c, n, b, t, g: b == 'head' and c.z < J['mouth'].z + 0.012 and c.y < HC.y - HR.y * 0.05 and 'lips' not in g  # noqa: E731
with part('beard_stubble'):
    shell('stubble', HAIR, jaw, 0.0015, thick=0.0)
with part('beard_moustache'):
    shell('moustache', HAIR, lambda c, n, b, t, g: b == 'head' and J['mouth'].z + 0.004 < c.z < J['mouth'].z + 0.02 and abs(c.x) < 0.028
          and c.y < HC.y - HR.y * 0.5 and 'lips' not in g, 0.004, thick=0.003)
with part('beard_beard'):
    shell('beard', HAIR, any_of(jaw, lambda c, n, b, t, g: b == 'head' and J['mouth'].z < c.z < J['mouth'].z + 0.02 and abs(c.x) < 0.03
                                and c.y < HC.y - HR.y * 0.5 and 'lips' not in g), 0.008, thick=0.006)
for kind, segs in (('round', 32), ('square', 4)):
    with part(f'glasses_{kind}'):
        for s in (L, R):
            e = J['l-eye' if s == L else 'r-eye']
            ring((e.x, FRONT_Y - 0.004, e.z), 0.02, 0.0025, EYE, rot=(math.pi / 2, 0, math.pi / 4 if segs == 4 else 0), segs=segs, name='rim')
        cyl_between((J['r-eye'].x + 0.02, FRONT_Y - 0.004, EYE_Z), (J['l-eye'].x - 0.02, FRONT_Y - 0.004, EYE_Z), 0.002, EYE, name='bridge')
        for s in (L, R):
            cyl_between((HC.x + HR.x * 0.95 * s, FRONT_Y - 0.002, EYE_Z), (HC.x + HR.x * 1.0 * s, HC.y + HR.y * 0.2, EYE_Z), 0.0018, EYE, name='arm')

# ---------------------------------------------------------------- gear
BAND_Z = EYE_Z + (TOP - EYE_Z) * 0.45
BC, BR = section(HEAD_PTS, BAND_Z, 0.006)
with part('gear_cap'):
    sphere((HC.x, HC.y + 0.004, BAND_Z), HR.x * 1.05, KIT, scale=(1.0, HR.y / HR.x * 1.02, (TOP - BAND_Z) / HR.x + 0.08), cut=0.0, name='crown')
    cyl((HC.x, FRONT_Y - HR.x * 0.45, BAND_Z + 0.004), HR.x * 0.7, 0.006, KIT_D, rot=(0.2, 0, 0), scale=(1.05, 0.9, 1), name='brim')
with part('gear_visor'):
    ring((BC.x, BC.y, BAND_Z), 1, 0.007, WHITE, scale=(BR.x + 0.006, BR.y + 0.006, 1), name='band')
    cyl((HC.x, FRONT_Y - HR.x * 0.4, BAND_Z), HR.x * 0.6, 0.005, KIT, rot=(0.2, 0, 0), scale=(1.1, 0.9, 1), name='brim')
with part('gear_headband'):
    ring((BC.x, BC.y, BAND_Z), 1, 0.009, ACCENT, scale=(BR.x + 0.008, BR.y + 0.008, 1), name='band')
    sphere((HC.x, BC.y + BR.y + 0.012, BAND_Z), 0.014, ACCENT, name='knot')
    for s in (L, R):
        cube((HC.x + 0.012 * s, BC.y + BR.y + 0.02, BAND_Z - 0.03), (0.007, 0.004, 0.03), ACCENT, sub=1, name='tail')
with part('gear_crown'):
    cr = (BR.x + BR.y) / 2 * 0.9
    cz = TOP - HR.z * 0.12
    cyl((HC.x, HC.y, cz), cr, 0.03, GOLD, verts=24, name='band')
    for i in range(8):
        a = i / 8 * math.tau
        cone((HC.x + cr * math.cos(a), HC.y + cr * math.sin(a), cz + 0.03), 0.012, 0.035, GOLD, name='point')
    for i in range(4):
        a = i / 4 * math.tau + 0.4
        sphere((HC.x + cr * 1.02 * math.cos(a), HC.y + cr * 1.02 * math.sin(a), cz), 0.006, RED if i % 2 else BLUE, sub=0, name='gem')
with part('gear_champion_helm'):
    sphere((HC.x, HC.y + 0.004, BAND_Z - 0.005), HR.x * 1.12, STEEL, scale=(1.0, HR.y / HR.x * 1.05, (TOP - BAND_Z) / HR.x + 0.15), cut=-0.05, name='dome')
    ring((BC.x, BC.y, BAND_Z - 0.003), 1, 0.008, GOLD, scale=(BR.x + 0.016, BR.y + 0.016, 1), name='rim')
    cube((HC.x, HC.y, TOP + 0.02), (0.007, HR.y * 0.8, 0.02), GOLD, sub=1, name='crest')
    for s in (L, R):
        cube((HC.x + (BR.x + 0.012) * s, HC.y - HR.y * 0.1, EYE_Z - 0.04), (0.008, HR.y * 0.35, 0.04), STEEL, sub=1, name='cheek')
        cone((HC.x + (BR.x + 0.03) * s, HC.y, BAND_Z + 0.02), 0.016, 0.06, GOLD, rot=(0, math.radians(-60 * s), 0), name='wing')

# Neck and chest anchors.
NB = NECK_H.lerp(NECK_T, 0.15)
CHEST_FRONT = min(p.y for p in TORSO if abs(p.z - CHEST_Z) < 0.015 and abs(p.x) < 0.04)
BACK_Y = max(p.y for p in TORSO if abs(p.z - CHEST_Z) < 0.015 and abs(p.x) < 0.04)
with part('gear_scarf'):
    ring(NB, NECK_R * 1.6, 0.022, RED, scale=(1, 0.95, 0.8), name='wrap')
    cube((NB.x + 0.03, CHEST_FRONT - 0.01, NB.z - 0.09), (0.022, 0.008, 0.07), RED, sub=1, rot=(0.15, 0, 0.1), name='end')
with part('gear_towel'):
    ring(NB, NECK_R * 1.7, 0.018, WHITE, scale=(1, 0.95, 0.7), name='wrap')
    for s in (L, R):
        cube((NB.x + 0.05 * s, CHEST_FRONT - 0.012, NB.z - 0.1), (0.024, 0.006, 0.075), WHITE, sub=1, name='end')
        cube((NB.x + 0.05 * s, CHEST_FRONT - 0.018, NB.z - 0.16), (0.024, 0.002, 0.006), KIT, sub=0, name='stripe')
with part('gear_headphones'):
    ring(NB + Vector((0, 0.005, 0.01)), NECK_R * 1.7, 0.007, RUBBER, rot=(0.5, 0, 0), name='band')
    for s in (L, R):
        cyl((NB.x + NECK_R * 1.6 * s, NB.y - 0.03, NB.z - 0.005), 0.026, 0.02, RUBBER, rot=(0, math.pi / 2, 0.2 * s), name='cup')
        cyl((NB.x + NECK_R * 1.6 * s + 0.01 * s, NB.y - 0.03, NB.z - 0.005), 0.018, 0.004, KIT, rot=(0, math.pi / 2, 0.2 * s), name='capp')
MED = Vector((0, CHEST_FRONT - 0.012, CHEST_Z - 0.03))
with part('gear_medal'):
    for s in (L, R):
        cyl_between((NB.x + NECK_R * 1.1 * s, NB.y - NECK_R * 0.8, NB.z), MED + Vector((0, 0, 0.025)), 0.006, BLUE, name='ribbon')
    cyl(MED, 0.026, 0.007, GOLD, rot=(math.pi / 2, 0, 0), name='disc')
    cyl(MED - Vector((0, 0.005, 0)), 0.015, 0.003, BRASS, rot=(math.pi / 2, 0, 0), verts=5, name='star')
with part('gear_ice_pack'):
    ring(NB, NECK_R * 1.35, 0.0025, LEATHER_D, rot=(0.45, 0, 0), name='cord')
    cube(MED + Vector((0, 0, 0.03)), (0.017, 0.007, 0.024), ICE, sub=1, rot=(0, math.radians(45), 0), name='gem')
PIN = Vector((CHEST_R.x * 0.45, CHEST_FRONT - 0.004, CHEST_Z + 0.015))
with part('gear_pin'):
    cyl(PIN, 0.013, 0.005, GOLD, rot=(math.pi / 2 - 0.2, 0, 0), name='pin')
    cyl(PIN - Vector((0, 0.003, 0)), 0.008, 0.003, ACCENT, rot=(math.pi / 2 - 0.2, 0, 0), name='face')
with part('gear_hr_band'):
    hz = CHEST_Z - 0.06
    shell('strap', RUBBER, lambda c, n, b, t, g: b in ('spine_02', 'spine_03') and abs(c.z - hz) < 0.012, 0.009 + DRAPE, thick=0.003)
    cube((0, CHEST_FRONT - 0.006, hz), (0.03, 0.008, 0.012), RUBBER, sub=1, name='pod')
with part('gear_golden_hinge'):
    for s in (L, R):
        cube((0.022 * s, CHEST_FRONT - 0.008, CHEST_Z), (0.02, 0.005, 0.026), GOLD, sub=1, name='leaf')
    cyl((0, CHEST_FRONT - 0.011, CHEST_Z), 0.007, 0.065, GOLD, name='pin')
with part('gear_frog_badge'):
    cyl(PIN, 0.018, 0.005, FROG, rot=(math.pi / 2 - 0.2, 0, 0), name='badge')
    for s in (L, R):
        sphere(PIN + Vector((0.007 * s, -0.004, 0.01)), 0.005, WHITE, sub=0, name='eye')

with part('gear_yoga_mat'):
    cyl((0, BACK_Y + 0.04, CHEST_Z - 0.03), 0.04, 0.6, PURPLE, rot=(0, math.radians(55), 0), name='roll')
    cyl_between((-SHW * 0.9, BACK_Y + 0.008, CHEST_Z + 0.12), (SHW * 0.9, BACK_Y + 0.008, WAIST_Z - 0.05), 0.005, LEATHER_D, name='strap')


def cape(m, length, flare, tilt, name):
    top = CHEST_Z + 0.12
    o = cube((0, BACK_Y + 0.02 + length * math.sin(tilt) / 2, top - length / 2), (SHW * 1.05, 0.012, length / 2), m, sub=2,
             taper=(flare, 0.85), rot=(tilt, 0, 0), name=name)
    return o


with part('gear_deswell_mantle'):
    cape(CALM, 0.85, 1.3, 0.06, 'cloak')
    ring(NB - Vector((0, 0, 0.02)), NECK_R * 2.0, 0.016, CALM, scale=(1.15, 1.0, 0.7), name='collar')
    sphere((0, NB.y - NECK_R * 1.6, NB.z - 0.035), 0.012, ICE, sub=0, name='clasp')
with part('gear_wind_cape'):
    cape(WIND, 1.05, 1.5, 0.14, 'cape')
    for s in (L, R):
        sphere((SHW * 0.55 * s, CHEST_FRONT + 0.03, CHEST_Z + 0.11), 0.014, GOLD, sub=0, name='clasp')

with part('gear_captain'):
    shell('band', YELLOW, bone_in('upperarm_l', tmin=0.38, tmax=0.7), 0.008, thick=0.003,
          cuts=[hem('upperarm_l', 0.45, 'tail'), hem('upperarm_l', 0.62, 'head')])
with part('gear_watch'):
    shell('strap', RUBBER, bone_in('lowerarm_l', tmin=0.8, tmax=1.0), 0.006, thick=0.003,
          cuts=[hem('lowerarm_l', 0.86, 'tail'), hem('lowerarm_l', 0.95, 'head')])
    w = along('lowerarm_l', 0.9)
    r_ = limb_r('lowerarm_l', 0.9)
    cyl((w.x, w.y - r_ - 0.008, w.z), 0.016, 0.01, STEEL, rot=(math.pi / 2, 0, 0), name='case')
    cyl((w.x, w.y - r_ - 0.013, w.z), 0.012, 0.002, ACCENT, rot=(math.pi / 2, 0, 0), name='face')
with part('gear_wristbands'):
    shell('band', SAND, bone_in('lowerarm_l', 'lowerarm_r', tmin=0.72, tmax=1.05), 0.008, thick=0.004,
          cuts=hems(ARMS_L, 0.8, 'tail') + hems(ARMS_L, 0.97, 'head'))
with part('gear_gloves'):
    hands = lambda c, n, b, t, g: b is not None and b.startswith(('hand_', 'index', 'middle', 'ring', 'pinky', 'thumb'))  # noqa: E731
    shell('glove', LEATHER, hands, 0.004, thick=0.002)
    shell('cuff', LEATHER_D, bone_in('lowerarm_l', 'lowerarm_r', tmin=0.8), 0.008, thick=0.003, cuts=hems(ARMS_L, 0.88, 'tail'))

waist = lambda c, n, b, t, g: b in ('pelvis', 'spine_01') and abs(c.z - (BONE['pelvis'][0].z + 0.06)) < 0.03  # noqa: E731
with part('gear_belt'):
    shell('belt', LEATHER, waist, 0.014 + DRAPE, thick=0.006)
    cube((0, WAIST_C.y - WAIST_R.y - 0.02 - DRAPE, BONE['pelvis'][0].z + 0.06), (0.03, 0.008, 0.026), BRASS, sub=1, name='buckle')
with part('gear_spring_belt'):
    shell('belt', LEATHER_D, waist, 0.012 + DRAPE, thick=0.005)
    cube((0, WAIST_C.y - WAIST_R.y - 0.018 - DRAPE, BONE['pelvis'][0].z + 0.06), (0.024, 0.008, 0.02), BRASS, sub=1, name='buckle')
    for s in (L, R):
        for i in range(4):
            ring((WAIST_R.x * 1.1 * s, WAIST_C.y, BONE['pelvis'][0].z + 0.02 - i * 0.016), 0.013, 0.0035, BRASS, segs=16, name='coil')

knee = lambda s: any_of(bone_in(f'thigh_{s}', tmin=0.7), bone_in(f'calf_{s}', tmax=0.28))  # noqa: E731
knee_cuts = lambda s: [hem(f'thigh_{s}', 0.8, 'tail'), hem(f'calf_{s}', 0.18, 'head')]  # noqa: E731
with part('gear_sleeve'):
    shell('sleeve', RUBBER, knee('l'), 0.007, thick=0.004, cuts=knee_cuts('l'))
    ring_on(KNEE[L] - Vector((0, 0, 0.0)), KNEE[L] - Vector((0, 0, 0.1)), limb_r('calf_l', 0.02) + 0.012, 0.004, ACCENT, name='strap')
with part('gear_shin_guards'):
    shell('guard', KIT, lambda c, n, b, t, g: b in ('calf_l', 'calf_r') and 0.15 < t < 0.8 and n.y < -0.35, 0.012, thick=0.006, sub=1,
          cuts=hems(CALVES, 0.25, 'tail') + hems(CALVES, 0.72, 'head'))
with part('gear_iron_brace'):
    shell('wrap', IRON, knee('l'), 0.008, thick=0.005, cuts=knee_cuts('l'))
    kr = limb_r('calf_l', 0.02) + 0.014
    for s in (L, R):
        p = KNEE[L] + Vector((kr * s, 0, 0))
        cube(p, (0.006, 0.01, 0.09), STEEL, sub=1, name='bar')
        cyl(p + Vector((0.003 * s, 0, 0)), 0.013, 0.01, BRASS, rot=(0, math.pi / 2, 0), name='hinge')
with part('gear_rune_guard'):
    for s in (L, R):
        k = KNEE[s]
        kr = limb_r(f'calf_{SIDE[s]}', 0.02)
        sphere((k.x, k.y - kr - 0.005, k.z), 0.045, IRON, scale=(1, 0.45, 1.2), name='plate')
        cube((k.x, k.y - kr - 0.026, k.z), (0.004, 0.002, 0.02), RUNE, sub=0, name='rune')
        cube((k.x, k.y - kr - 0.026, k.z + 0.008), (0.013, 0.002, 0.004), RUNE, sub=0, rot=(0, 0.6, 0), name='rune2')

with part('gear_crew_socks'):
    shell('sock', WHITE, bone_in('calf_l', 'calf_r', tmin=0.45), 0.003, thick=0.0, cuts=hems(CALVES, 0.55, 'tail'))
    for s in (L, R):
        ring_on(along(f'calf_{SIDE[s]}', 0.62), along(f'calf_{SIDE[s]}', 0.7), limb_r(f'calf_{SIDE[s]}', 0.62) + 0.004, 0.003, KIT, name='stripe')
with part('gear_gold_shoes'):
    shoes(GOLD, sole=WHITE)
with part('gear_balance_shoes'):
    shoes(KIT_S, sole=BLUE)
    for s in (L, R):
        lo, hi = FOOT[s]
        cube(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, -0.004), ((hi.x - lo.x) / 2 + 0.016, (hi.y - lo.y) / 2 + 0.018, 0.01), BLUE, sub=1, bevel=0.3, name='pad')
with part('gear_spikes'):
    shoes(RED)
    for s in (L, R):
        lo, hi = FOOT[s]
        for i in range(3):
            cone(((lo.x + hi.x) / 2, lo.y + 0.03 + i * 0.03, -0.006), 0.007, 0.018, STEEL, rot=(math.pi, 0, 0), name='spike')
with part('gear_pilgrim_boots'):
    shell('boot', LEATHER, any_of(bone_in('foot_l', 'foot_r', 'ball_l', 'ball_r'), bone_in('calf_l', 'calf_r', tmin=0.4)), 0.011, thick=0.004,
          cuts=hems(CALVES, 0.5, 'tail'))
    for s in (L, R):
        lo, hi = FOOT[s]
        cube(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, 0.008), ((hi.x - lo.x) / 2 + 0.014, (hi.y - lo.y) / 2 + 0.016, 0.012), LEATHER_D, sub=1, bevel=0.3, name='sole')
        ring_on(along(f'calf_{SIDE[s]}', 0.5), along(f'calf_{SIDE[s]}', 0.6), limb_r(f'calf_{SIDE[s]}', 0.5) + 0.015, 0.008, SAND, name='cuff')
with part('gear_wing_shoes'):
    shoes(WHITE, sole=ACCENT)
    for s in (L, R):
        a = ANK[s]
        for i, (h, ln) in enumerate(((0.05, 0.045), (0.035, 0.036), (0.02, 0.028))):
            sphere((a.x + 0.045 * s, a.y + 0.012 + i * 0.01, a.z - 0.02 + h), 0.02, WIND, scale=(0.15, ln / 0.02, 0.4), rot=(0.5, 0, 0), sub=0, name='feather')

HDR, HSR = HAND[R]
GRIP = HDR + Vector((0, -0.005, 0.0))
with part('gear_sport_item'):
    ball = GRIP + Vector((-0.02, -0.11, 0.02))
    sphere(ball, 0.11, WHITE, sub=1, name='ball')
    for a in (0, math.pi / 2):
        ring(ball, 0.111, 0.0025, EYE, rot=(a, 0, 0), name='seam')
with part('gear_crutch_staff'):
    cyl((GRIP.x, GRIP.y, (GRIP.z + 1.45) / 2 - 0.05), 0.013, 1.5, WOOD, verts=10, name='staff')
    sphere((GRIP.x, GRIP.y, 1.45), 0.03, ICE, sub=0, name='gem')
    ring((GRIP.x, GRIP.y, 1.41), 0.018, 0.005, BRASS, name='band')
with part('gear_smith_hammer'):
    cyl((GRIP.x, GRIP.y, GRIP.z + 0.08), 0.013, 0.55, WOOD, verts=10, name='handle')
    cube((GRIP.x, GRIP.y, GRIP.z + 0.36), (0.075, 0.04, 0.04), IRON, sub=1, bevel=0.2, name='head')
    ring((GRIP.x, GRIP.y, GRIP.z + 0.3), 0.016, 0.005, BRASS, name='band')

with part('aid_crutches'):
    for s in (L, R):
        hc, hs = HAND[s]
        x = hc.x + 0.012 * s
        cyl((x, hc.y + 0.02, hc.z / 2), 0.01, hc.z, STEEL, verts=10, name='shaft')
        cube((x, hc.y - 0.01, hc.z), (0.01, 0.04, 0.008), RUBBER, sub=1, name='grip')
        f = along(f'lowerarm_{SIDE[s]}', 0.55)
        cyl_between((x, hc.y + 0.02, hc.z), (f.x, f.y + 0.02, f.z), 0.009, STEEL, name='upper')
        ring_on(f, f + (along(f'lowerarm_{SIDE[s]}', 0.7) - f), limb_r(f'lowerarm_{SIDE[s]}', 0.55) + 0.01, 0.008, KIT, name='cuff')
        sphere((x, hc.y + 0.02, 0.006), 0.012, RUBBER, sub=0, name='tip')


# ---------------------------------------------------------------- outfits
def long_sleeves(m=KIT):
    shell('sleeves', m, any_of(bone_in('upperarm_l', 'upperarm_r'), bone_in('lowerarm_l', 'lowerarm_r', tmax=1.0),
                               lambda c, n, b, t, g: b in ('clavicle_l', 'clavicle_r', 'spine_03') and abs(c.x) > SHW * 0.7), 0.009, thick=0.003,
          cuts=hems(ARMS_L, 0.92, 'head'), loose=DRAPE)


def long_pants(m=KIT_D):
    shell('pants', m, any_of(bone_in('thigh_l', 'thigh_r'), bone_in('calf_l', 'calf_r', tmax=0.98)), 0.006, thick=0.003, cuts=hems(CALVES, 0.9, 'head'), loose=0.012)


def high_socks(m=KIT_S):
    shell('socks', m, bone_in('calf_l', 'calf_r', tmin=0.22), 0.004, thick=0.002, cuts=hems(CALVES, 0.3, 'tail'))


def number(z=None, m=KIT_S):
    zc = z or CHEST_Z - 0.01
    # In front of whatever the cloth bridges there, not only the hollow of the breastbone.
    front = min(p.y for p in TORSO if abs(p.z - zc) < 0.05 and abs(p.x) < 0.09)
    # A flat patch with square corners reads as a shirt number; a rounded one as a blob.
    cube((0, front - 0.006 - DRAPE, zc + 0.02), (0.042, 0.002, 0.048), m, sub=0, bevel=0.15, name='number')


with part('outfit_tracksuit'):
    long_sleeves()
    long_pants()
    cube((0, CHEST_FRONT - 0.01 - DRAPE - FRONT, CHEST_Z - 0.02), (0.003, 0.004, 0.12), KIT_S, sub=0, name='zip')
with part('outfit_team_kit'):
    number()
    for s in (L, R):
        ring_on(along(f'upperarm_{SIDE[s]}', 0.4), along(f'upperarm_{SIDE[s]}', 0.5), limb_r(f'upperarm_{SIDE[s]}', 0.4) + 0.01 + DRAPE, 0.005, KIT_S, name='cuff')
    high_socks()
with part('outfit_champion'):
    for s in (L, R):
        shoulder_scale = limb_r(f'upperarm_{SIDE[s]}', 0.15) / 0.075
        p = SH[s] + Vector((0.012 * s, 0, 0.02))
        for i, (r, dz, sc) in enumerate(((0.11, 0.0, 0.5), (0.085, 0.035, 0.55))):
            o = sphere(p + Vector((0, 0, dz)), r * shoulder_scale, KIT if i == 0 else KIT_D, scale=(1.1, 1.05, sc), name='plate')
            o.rotation_euler = (0, math.radians(-22 * s), 0)
        ring(p - Vector((0, 0, 0.012)), 0.11 * shoulder_scale, 0.012, GOLD, rot=(0, math.radians(-22 * s), 0), scale=(1.1, 1.05, 1), name='trim')
        cone(p + Vector((0.035 * s, 0, 0.09)), 0.024, 0.09, GOLD, rot=(0, math.radians(-30 * s), 0), name='horn')
    shell('sash', GOLD, waist, 0.012 + DRAPE, thick=0.004)
    sphere((0, CHEST_FRONT - 0.008 - DRAPE - FRONT, CHEST_Z), 0.03, GOLD, scale=(1, 0.25, 1.25), name='emblem')
    sphere((0, CHEST_FRONT - 0.014 - DRAPE - FRONT, CHEST_Z), 0.016, ACCENT, scale=(1, 0.3, 1.3), name='emblem_core')
with part('outfit_sport_football'):
    number()
    high_socks()
with part('outfit_sport_basketball'):
    number(CHEST_Z - 0.03)
    shell('shorts', KIT_D, any_of(bone_in('pelvis'), bone_in('thigh_l', 'thigh_r', tmax=0.95)), 0.012, thick=0.003, cuts=hems(THIGHS, 0.85, 'head'), loose=0.02)
with part('outfit_sport_hockey'):
    high_socks()
    shell('pads', KIT_D, lambda c, n, b, t, g: b in ('calf_l', 'calf_r') and 0.3 < t < 0.8 and n.y < -0.3, 0.012, thick=0.006)
    number()
with part('outfit_sport_ski'):
    long_sleeves()
    long_pants()
    ring((BC.x, BC.y, BAND_Z - 0.01), 1, 0.007, KIT_D, scale=(BR.x + 0.008, BR.y + 0.008, 1), name='strap')
    cube((HC.x, FRONT_Y - 0.012, EYE_Z + 0.004), (HR.x * 0.8, 0.012, 0.02), ICE, sub=2, name='goggles')
with part('outfit_sport_running'):
    cube((0, CHEST_FRONT - 0.008 - DRAPE, WAIST_Z + 0.03), (0.045, 0.002, 0.032), WHITE, sub=0, name='bib')
    cube((0, CHEST_FRONT - 0.011 - DRAPE, WAIST_Z + 0.03), (0.026, 0.001, 0.013), EYE, sub=0, name='bibno')
with part('outfit_sport_padel'):
    number(CHEST_Z + 0.01)
    ring((BC.x, BC.y, BAND_Z), 1, 0.007, WHITE, scale=(BR.x + 0.006, BR.y + 0.006, 1), name='band')
    cyl((HC.x, FRONT_Y - HR.x * 0.4, BAND_Z), HR.x * 0.6, 0.005, KIT, rot=(0.2, 0, 0), scale=(1.1, 0.9, 1), name='brim')

if args.study:
    from hero_study import dress_study
    dress_study(globals())

# ---------------------------------------------------------------- skin: every part follows the skeleton
DEF = {b.name for b in rig.data.bones}
HEAD_PARTS = ('hair_', 'beard_', 'glasses_', 'gear_cap', 'gear_visor', 'gear_headband', 'gear_crown', 'gear_champion_helm', 'gear_headphones')
CHEST_PARTS = ('gear_deswell_mantle', 'gear_wind_cape', 'gear_yoga_mat', 'gear_medal', 'gear_pin', 'gear_frog_badge', 'gear_golden_hinge', 'gear_scarf', 'gear_towel')
HAND_PARTS = ('gear_sport_item', 'gear_crutch_staff', 'gear_smith_hammer', 'aid_crutches')
BODY_W = [{GNAME[x.group]: x.weight for x in v.groups if GNAME.get(x.group) in DEF and x.weight > 0.01} for v in human.data.vertices]
kd = KDTree(len(human.data.vertices))
for i, v in enumerate(human.data.vertices):
    kd.insert(v.co, i)
kd.balance()


def top_name(o):
    while o.parent:
        o = o.parent
    return o.name


def skin(o):
    """Shells already carry the body's weights. Other parts get them from the nearest skin; small and
    hard things (helmet, glasses, buckles, crutches) follow one bone, so they never bend."""
    for g in [g for g in o.vertex_groups if g.name not in DEF]:
        o.vertex_groups.remove(g)
    used = {x.group for v in o.data.vertices for x in v.groups if x.weight > 0}
    if not used:
        for g in list(o.vertex_groups):
            o.vertex_groups.remove(g)
        mwo = o.matrix_world
        cos = [mwo @ v.co for v in o.data.vertices]
        lo = Vector((min(c.x for c in cos), min(c.y for c in cos), min(c.z for c in cos)))
        hi = Vector((max(c.x for c in cos), max(c.y for c in cos), max(c.z for c in cos)))
        name = top_name(o)
        one = None
        if name.startswith(HEAD_PARTS) or lo.z > J['neck'].z:
            one = 'head'
        elif name.startswith(CHEST_PARTS):
            one = 'spine_03'
        elif name.startswith(HAND_PARTS):
            one = 'hand_l' if (lo.x + hi.x) > 0 else 'hand_r'
        if one is None:
            near = [BODY_W[kd.find(c)[1]] for c in cos]
            if (hi - lo).length < 0.12:
                total = {}
                for w in near:
                    for b, x in w.items():
                        total[b] = total.get(b, 0.0) + x
                one = max(total, key=total.get) if total else 'spine_03'
            else:
                groups = {}
                for i, w in enumerate(near):
                    for b, x in (w or {'spine_03': 1.0}).items():
                        (groups.get(b) or groups.setdefault(b, o.vertex_groups.new(name=b))).add([i], x, 'REPLACE')
        if one is not None:
            o.vertex_groups.new(name=one).add(list(range(len(cos))), 1.0, 'REPLACE')
    o.modifiers.new('rig', 'ARMATURE').object = rig


for o in [o for o in scene.objects if o.type == 'MESH']:
    skin(o)

# ---------------------------------------------------------------- motions
# Joint angles follow normal gait analysis (sagittal curves after Perry and Winter for walking, after
# Novacheck for running), in degrees over one cycle of the right leg; the left leg is half a cycle
# later. Flexion and dorsiflexion are positive. The pelvis turns, lists and shifts over the stance leg,
# the trunk turns against it and the arms swing opposite to the legs. The body's height is not drawn
# by hand: each frame it is set so that the lowest part of a sole rests on the ground.
scene.render.fps = 30
REST = {b.name: b.matrix_local.copy() for b in rig.data.bones}
AX, AY, AZ = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
ANIMATED = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head'] + [f'{b}_{s}' for s in 'lr' for b in ('thigh', 'calf', 'foot', 'ball', 'upperarm', 'lowerarm', 'hand')]
ANIMATED = [b for b in ANIMATED if b in DEF]
GROUND_Z = min(v.co.z for v in human.data.vertices)
SOLE = []
for s in 'lr':
    a, b0, b1 = REST[f'foot_{s}'].translation, REST[f'ball_{s}'].translation, rig.data.bones[f'ball_{s}'].tail_local
    SOLE += [(f'foot_{s}', Vector((a.x, a.y + 0.055, GROUND_Z))), (f'foot_{s}', Vector((b0.x, b0.y, GROUND_Z))), (f'ball_{s}', Vector((b1.x, b1.y, GROUND_Z)))]


def curve(keys):
    """Smooth periodic curve through (percent of the cycle, value) points."""
    xs = [k[0] / 100 for k in keys if k[0] < 100]
    ys = [k[1] for k in keys if k[0] < 100]
    n = len(xs)

    def slope(i):
        x0, x1, x2 = xs[(i - 1) % n] - (1 if i == 0 else 0), xs[i], xs[(i + 1) % n] + (1 if i == n - 1 else 0)
        return ((ys[(i + 1) % n] - ys[i]) / (x2 - x1) + (ys[i] - ys[(i - 1) % n]) / (x1 - x0)) / 2

    def f(t):
        t %= 1.0
        i = max(k for k in range(n) if xs[k] <= t) if t >= xs[0] else n - 1
        x1 = xs[i] - (1 if t < xs[0] else 0)
        x2 = xs[(i + 1) % n] + (1 if i == n - 1 and t >= xs[0] else 0)
        h = x2 - x1
        u = (t - x1) / h
        y1, y2 = ys[i], ys[(i + 1) % n]
        return ((2 * u ** 3 - 3 * u ** 2 + 1) * y1 + (u ** 3 - 2 * u ** 2 + u) * h * slope(i)
                + (-2 * u ** 3 + 3 * u ** 2) * y2 + (u ** 3 - u ** 2) * h * slope((i + 1) % n))
    return f


def wave(t, shift=0.0):
    return math.cos(2 * math.pi * (t - shift))


def set_pose(pose):
    for n in ANIMATED:
        pb = rig.pose.bones[n]
        pb.rotation_mode = 'QUATERNION'
        inv = REST[n].to_3x3().inverted()
        q = Quaternion()
        for axis, deg in pose.get(n, ()):
            q = q @ Quaternion(inv @ axis, math.radians(deg))
        pb.rotation_quaternion = q
        pb.location = (0, 0, 0)
    bpy.context.view_layer.update()


def sole_points():
    return [rig.pose.bones[b].matrix @ REST[b].inverted() @ p for b, p in SOLE]


def legs_and_arms(pose, t, hip, knee, ankle, toe, shoulder, elbow, arms_in):
    for s, ph, sg in (('r', t, -1), ('l', t + 0.5, 1)):
        pose[f'thigh_{s}'] = [(AX, -hip(ph))]
        pose[f'calf_{s}'] = [(AX, knee(ph))]
        pose[f'foot_{s}'] = [(AX, -ankle(ph))]
        pose[f'ball_{s}'] = [(AX, -toe(ph))]
        pose[f'upperarm_{s}'] = [(AY, arms_in * sg), (AX, -shoulder(ph))]
        pose[f'lowerarm_{s}'] = [(AX, -(elbow(ph) - 15))]


W_HIP = curve([(0, 30), (10, 25), (20, 12), (30, 2), (40, -6), (50, -10), (55, -8), (60, 0), (70, 15), (80, 28), (87, 33), (95, 31)])
W_KNEE = curve([(0, 5), (5, 10), (13, 18), (20, 14), (30, 8), (40, 5), (50, 12), (60, 38), (67, 55), (73, 62), (80, 52), (90, 22), (96, 5)])
W_ANKLE = curve([(0, 0), (7, -6), (15, 1), (30, 6), (45, 10), (50, 8), (56, -4), (62, -17), (70, -8), (80, 0), (90, 2)])
W_TOE = curve([(0, 0), (40, 5), (50, 25), (58, 40), (65, 10), (75, 0), (90, 0)])


def walk(t):
    pose = {}
    legs_and_arms(pose, t, W_HIP, W_KNEE, W_ANKLE, W_TOE,
                  shoulder=lambda ph: -6 - 14 * wave(ph), elbow=lambda ph: 30 - 12 * wave(ph, 0.05), arms_in=7)
    turn, drop = 4 * wave(t), 4 * wave(t, 0.13)
    pose['pelvis'] = [(AZ, turn), (AY, drop)]
    pose['spine_01'] = [(AY, -drop * 0.9), (AZ, -turn * 0.6), (AX, 3)]
    pose['spine_02'] = [(AZ, -turn * 0.6)]
    pose['spine_03'] = [(AZ, -turn * 0.55)]
    pose['neck_01'] = [(AZ, turn * 0.75)]
    return pose, Vector((-0.018 * math.sin(2 * math.pi * (t - 0.05)), 0, 0)), False


R_HIP = curve([(0, 30), (10, 23), (20, 10), (30, -2), (38, -10), (45, -8), (55, 10), (65, 30), (75, 41), (85, 43), (93, 37)])
R_KNEE = curve([(0, 18), (8, 32), (16, 42), (25, 36), (33, 22), (38, 18), (45, 35), (55, 70), (65, 95), (72, 92), (82, 60), (92, 25)])
R_ANKLE = curve([(0, 4), (8, 14), (18, 24), (28, 12), (35, -10), (40, -22), (48, -14), (60, -2), (75, 4)])
R_TOE = curve([(0, 0), (25, 10), (34, 35), (40, 30), (48, 5), (60, 0), (85, 0)])
RUN_STANCE = 0.38


def run(t):
    pose = {}
    legs_and_arms(pose, t, R_HIP, R_KNEE, R_ANKLE, R_TOE,
                  shoulder=lambda ph: -10 - 30 * wave(ph), elbow=lambda ph: 95 - 15 * wave(ph, 0.05), arms_in=9)
    turn, drop = 5 * wave(t), 5 * wave(t, 0.1)
    pose['pelvis'] = [(AZ, turn), (AY, drop), (AX, 4)]
    pose['spine_01'] = [(AY, -drop * 0.9), (AZ, -turn * 1.1), (AX, 5)]
    pose['spine_02'] = [(AZ, -turn * 1.1)]
    pose['spine_03'] = [(AZ, -turn * 1.1)]
    pose['neck_01'] = [(AZ, turn * 1.3), (AX, -6)]
    air = (t % 0.5) >= RUN_STANCE
    return pose, Vector((-0.008 * math.sin(2 * math.pi * (t - 0.05)), 0, 0)), air


def idle(t):
    b = math.sin(2 * math.pi * t)
    pose = {'spine_02': [(AX, -0.7 * b)], 'spine_03': [(AX, -0.9 * b)], 'neck_01': [(AX, 0.8 * b)]}
    for s, sg in (('l', 1), ('r', -1)):
        pose[f'upperarm_{s}'] = [(AY, -0.8 * b * sg)]
    return pose, Vector(), False


def cheer(t):
    up = 0.5 - 0.5 * math.cos(2 * math.pi * t)
    dip = max(0.0, math.sin(2 * math.pi * t)) ** 2
    pose = {'spine_03': [(AX, -6 * up)], 'neck_01': [(AX, -8 * up)]}
    for s, sg in (('l', 1), ('r', -1)):
        pose[f'thigh_{s}'] = [(AX, -22 * dip)]
        pose[f'calf_{s}'] = [(AX, 40 * dip)]
        pose[f'foot_{s}'] = [(AX, -18 * dip)]
        pose[f'upperarm_{s}'] = [(AY, -14 * up * sg), (AX, -150 * up)]
        pose[f'lowerarm_{s}'] = [(AX, -18 * up)]
    return pose, Vector(), False


SPEEDS = {}


def bake(name, frames, fn, grounded=True, stance=0.6):
    """Keyframe one loop of `fn` on the rig and park it on its own NLA track (one glTF animation)."""
    rows = []
    for f in range(frames):
        pose, shift, air = fn(f / frames)
        set_pose(pose)
        pts = sole_points()
        rows.append([pose, shift, air, (GROUND_Z - min(p.z for p in pts)) if grounded else 0.0, pts[4].y])
    # In the air nothing touches the ground: a small arc between the last and the next contact.
    for f, row in enumerate(rows):
        if row[2]:
            a = b = f
            while rows[a % frames][2]:
                a -= 1
            while rows[b % frames][2]:
                b += 1
            u = (f - a) / (b - a)
            row[3] = rows[a % frames][3] * (1 - u) + rows[b % frames][3] * u + 0.16 * u * (1 - u)
    # Walking speed that fits the cycle: how far the right forefoot travels back under the body in stance.
    n = max(1, round(stance * frames))
    SPEEDS[name] = (rows[n - 1][4] - rows[0][4]) / ((n - 1) / scene.render.fps) if grounded and n > 1 else 0.0
    act = bpy.data.actions.new(name)
    rig.animation_data_create()
    rig.animation_data.action = act
    pinv = REST['pelvis'].to_3x3().inverted()
    for f in range(frames + 1):
        pose, shift, _air, dz, _y = rows[f % frames]
        set_pose(pose)
        rig.pose.bones['pelvis'].location = pinv @ (shift + Vector((0, 0, dz)))
        for n2 in ANIMATED:
            rig.pose.bones[n2].keyframe_insert('rotation_quaternion', frame=f)
        rig.pose.bones['pelvis'].keyframe_insert('location', frame=f)
    slot = getattr(rig.animation_data, 'action_slot', None)
    rig.animation_data.action = None
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 0, act)
    if slot is not None and hasattr(strip, 'action_slot'):
        strip.action_slot = slot
    track.mute = True
    return act


ACTIONS = {
    'idle': bake('idle', 90, idle, grounded=False),
    'walk': bake('walk', 32, walk),
    'run': bake('run', 21, run, stance=RUN_STANCE),
    'cheer': bake('cheer', 40, cheer),
}
set_pose({})
print('MOTION speeds m/s (walk, run):', round(SPEEDS['walk'], 3), round(SPEEDS['run'], 3), '| height', round(max(v.co.z for v in human.data.vertices) - GROUND_Z, 3))
if EXPORT:
    for tr in rig.animation_data.nla_tracks:
        tr.mute = False

# ---------------------------------------------------------------- export / render
if EXPORT:
    os.makedirs(os.path.dirname(os.path.abspath(args.glb)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=args.glb, export_apply=True, export_yup=True, export_cameras=False,
                              export_lights=False, export_extras=False, export_animations=True, export_skins=True,
                              export_morph=False, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
                              export_def_bones=True, export_optimize_animation_size=True, export_anim_slide_to_zero=True)
    from compact_glb import compact_glb
    compact_glb(args.glb)

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
    cyl((0, 0, -0.05), 0.5, 0.1, STONE, verts=8, name='pedestal')
    cyl((0, 0, 0.0), 0.46, 0.012, mat('ped', '#29483c'), verts=8, name='pedestal_top')
    world = bpy.data.worlds.new('w')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = hexrgb('#e8eee9')
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7

    def light(loc, energy, size, color):
        d = bpy.data.lights.new('l', 'AREA')
        d.energy, d.size, d.color = energy, size, hexrgb(color)[:3]
        o = bpy.data.objects.new('l', d)
        o.location = loc
        scene.collection.objects.link(o)
        o.rotation_euler = (Vector((0, 0, 0.9)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()

    light((-2.2, -2.6, 3.0), 600, 3, '#fff4e6')
    light((2.6, -1.8, 1.4), 180, 3, '#e6f0ff')
    light((0.5, 2.6, 2.6), 500, 2, '#ffffff')
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.lens = 60
    scene.collection.objects.link(cam)
    scene.camera = cam
    a = math.radians(-90 if args.side else args.angle)
    if args.pose:
        motion, _, frame = args.pose.partition(':')
        rig.animation_data.action = ACTIONS[motion]
        scene.frame_set(int(frame or 0))
    tgt, dist = (HC, 0.9) if args.face else (Vector((0, 0, 0.92)), 5.0)
    cam.location = (tgt.x + dist * math.sin(a), tgt.y - dist * math.cos(a), tgt.z + (0.05 if args.face else 0.33))
    cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
    w, h = (int(x) for x in args.size.split('x'))
    r = scene.render
    r.resolution_x, r.resolution_y = w, h
    r.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = args.samples
    scene.view_settings.view_transform = 'Standard'
    r.film_transparent = True
    if os.environ.get('HIDE_SKIN'):
        bpy.data.objects['body_skin'].hide_render = True
    r.filepath = os.path.abspath(args.render)
    bpy.ops.render.render(write_still=True)
