"""Fitted CC0 cloth topology with original FP Flow tailoring, not a copy of skin faces.
Sources and original release headers live in assets/system/clothes. Only geometry is reused;
colours, fine weave, piping, zipper and FP mark are authored here. Preserve the MHCLO weights.
"""
import math
from pathlib import Path
import bpy
import bmesh
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree


def load_clothes(human, service, assets):
    clothes = []
    for key in ('female_casualsuit02', 'male_casualsuit02', 'shoes05'):
        ob = service.add_mhclo_asset(str(Path(assets) / 'system/clothes' / key / (key + '.mhclo')),
                                   human, asset_type='Clothes', subdiv_levels=0,
                                   material_type='NONE', set_up_rigging=True)
        ob.name = 'tailoring_source_' + key
        clothes.append(ob)
    # MHCLO creates non-destructive body masks intended for a permanently dressed human.
    # Keep the full body during fitting/measurement. Cull only the always-covered base-kit
    # and shoe faces after all attachments have been calculated below.
    for mod in list(human.modifiers):
        if mod.type == 'MASK' and mod.name.startswith('Delete.'):
            human.modifiers.remove(mod)
    return clothes


def finish_clothes(g, sources):
    """Use fitted cloth for the base kit and long outfits, preserving the existing node contract."""
    human = g['human']
    body_bvh = BVHTree.FromPolygons([v.co for v in human.data.vertices],
                                  [list(p.vertices) for p in human.data.polygons])
    for ob in sources:
        ob.data.transform(ob.matrix_world)
        ob.matrix_world = Matrix()
        # The closed sneaker last already has the CC0 foot-helper fit. Projecting its sole
        # onto individual toes would destroy that last; keep the fitted shoe silhouette.
        if ob is sources[2]:
            continue
        # Fit the four macro shapes without collapsing the cloth's own drape to the skin.
        for v in ob.data.vertices:
            hit, normal, _, _ = body_bvh.find_nearest(v.co)
            distance = (v.co - hit).dot(normal)
            if distance < .012:
                v.co += normal * (.012 - distance)
        ob.data.update()

    # A fine weave in the actual cloth UVs, small enough to read as fabric on a phone.
    import numpy as np
    n = 128
    yy, xx = np.mgrid[:n, :n]
    weave = .975 + .025 * np.cos(xx * math.pi / 2) * np.cos(yy * math.pi / 2)
    shade = np.ones((n, n, 4), dtype=np.float32)
    shade[:, :, :3] = weave[:, :, None]
    normal = np.ones((n, n, 4), dtype=np.float32)
    normal[:, :, 0] = .5 + .07 * np.sin(xx * math.pi / 2)
    normal[:, :, 1] = .5 + .07 * np.sin(yy * math.pi / 2)
    for material in (g['KIT'], g['KIT_D']):
        bsdf = material.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Roughness'].default_value = .86
        bsdf.inputs['Sheen Weight'].default_value = .18
        for label, pixels, is_normal in (('fp_weave', shade, False), ('fp_weave_normal', normal, True)):
            image = bpy.data.images.get(label)
            if image is None:
                image = bpy.data.images.new(label, width=n, height=n)
                if is_normal: image.colorspace_settings.name = 'Non-Color'
                image.pixels.foreach_set(pixels.ravel()); image.pack()
            tex = material.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = image
            uv = material.node_tree.nodes.new('ShaderNodeTexCoord')
            mapping = material.node_tree.nodes.new('ShaderNodeMapping')
            mapping.inputs['Scale'].default_value = (6, 6, 1)
            material.node_tree.links.new(uv.outputs['UV'], mapping.inputs['Vector'])
            material.node_tree.links.new(mapping.outputs['Vector'], tex.inputs['Vector'])
            if is_normal:
                bump = material.node_tree.nodes.new('ShaderNodeNormalMap')
                bump.inputs['Strength'].default_value = .22
                material.node_tree.links.new(tex.outputs['Color'], bump.inputs['Color'])
                material.node_tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
            else:
                material.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])

    def remove_tree(ob):
        for child in list(ob.children): remove_tree(child)
        bpy.data.objects.remove(ob, do_unlink=True)

    fitted = {}

    def cloth(source, name, parent, upper):
        cached = fitted.get((source.name, upper))
        if cached:
            ob = cached.copy(); g['scene'].collection.objects.link(ob)
            ob.parent = parent; ob.name = name
            return ob
        ob = source.copy(); ob.data = source.data.copy()
        g['scene'].collection.objects.link(ob); ob.parent = parent; ob.name = name
        bm = bmesh.new(); bm.from_mesh(ob.data)
        # Both source kits have independent shirt/trouser components. Classify connected
        # components, not vertex heights: the shirt hem and waistband legitimately overlap.
        seen = set()
        for first in list(bm.verts):
            if first in seen: continue
            pending = [first]; component = []
            while pending:
                v = pending.pop()
                if v in seen: continue
                seen.add(v); component.append(v)
                pending.extend(e.other_vert(v) for e in v.link_edges)
            is_top = max(v.co.z for v in component) > g['CHEST_Z']
            if is_top != upper:
                bmesh.ops.delete(bm, geom=component, context='VERTS')
        bm.to_mesh(ob.data); bm.free()
        ob.data.materials.clear(); ob.data.materials.append(g['KIT'] if upper else g['KIT_D'])
        for p in ob.data.polygons: p.material_index = 0; p.use_smooth = True
        fitted[(source.name, upper)] = ob
        return ob

    cloth_weights = {}

    def bind_to_cloth(ob, source):
        # Garment hems can sit beside a relaxed wrist. Body-nearest transfer would then
        # pull the hem up with the hand; use the fitted garment's MHCLO weights instead.
        if source.name not in cloth_weights:
            kd=KDTree(len(source.data.vertices))
            for v in source.data.vertices:kd.insert(v.co,v.index)
            kd.balance();cloth_weights[source.name]=kd
        for group in source.vertex_groups:ob.vertex_groups.new(name=group.name)
        for v in ob.data.vertices:
            index=cloth_weights[source.name].find(v.co)[1]
            for weight in source.data.vertices[index].groups:
                ob.vertex_groups[weight.group].add([v.index],weight.weight,'REPLACE')

    def tube(name, points, radius, material, parent, source=None):
        if len(points) < 2: return
        curve = bpy.data.curves.new(name, 'CURVE'); curve.dimensions = '3D'
        curve.bevel_depth = radius; curve.bevel_resolution = 1; curve.resolution_u = 2
        line = curve.splines.new('POLY'); line.points.add(len(points)-1)
        for p, co in zip(line.points, points): p.co = (*co, 1)
        ob = bpy.data.objects.new(name, curve); g['scene'].collection.objects.link(ob)
        ob.parent = parent; ob.data.materials.append(material)
        bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
        bpy.context.view_layer.objects.active = ob; bpy.ops.object.convert(target='MESH')
        ob=bpy.context.object
        if source:bind_to_cloth(ob,source)
        return ob

    ivory = g['mat']('tailor_ivory', '#e3d9bd', .74)
    zipper = g['mat']('tailor_zipper', '#b9b4a4', .35, .65)
    dark = g['mat']('tailor_rib', '#303c32', .9)

    def bindings(ob, root):
        bm = bmesh.new(); bm.from_mesh(ob.data)
        boundary = {v for e in bm.edges if e.is_boundary for v in e.verts}
        seen = set()
        for first in boundary:
            if first in seen: continue
            loop = []; v = first; previous = None
            while v not in seen:
                seen.add(v); loop.append(v.co + v.normal * .0015)
                candidates = [e.other_vert(v) for e in v.link_edges if e.is_boundary and e.other_vert(v) != previous]
                if not candidates: break
                previous, v = v, candidates[0]
            if len(loop) > 5:
                tube('tailored_binding', loop + [loop[0]], .0012,
                     g['GOLD'] if root.name == 'outfit_champion' else dark, root, ob)
                # A real folded band, rather than a painted line on a skin-shaped shell.
                centre = sum(loop, Vector()) / len(loop)
                collar = centre.z > g['CHEST_Z'] + .10 and abs(centre.x) < .04
                verts = []
                for p in loop:
                    if collar:
                        q = p + Vector((0, 0, .014))
                    else:
                        nearest = min(ob.data.vertices, key=lambda v: (v.co-p).length_squared)
                        neighbours = [ob.data.vertices[e.vertices[1] if e.vertices[0] == nearest.index else e.vertices[0]].co
                                      for e in ob.data.edges if nearest.index in e.vertices]
                        direction = sum((q-p for q in neighbours), Vector())
                        q = p + direction.normalized() * .010 if direction.length else p
                    verts.extend((p, q))
                faces = [(2*i, 2*((i+1)%len(loop)), 2*((i+1)%len(loop))+1, 2*i+1) for i in range(len(loop))]
                mesh = bpy.data.meshes.new('folded_cloth_band'); mesh.from_pydata(verts, [], faces)
                band = bpy.data.objects.new('tailored_collar' if collar else 'tailored_cuff', mesh)
                g['scene'].collection.objects.link(band); band.parent = root
                mesh.materials.append(dark)
                for face in mesh.polygons: face.use_smooth = True
                bind_to_cloth(band,ob)
        bm.free()

    def embellish(shirt, root, zipped):
        bvh = BVHTree.FromPolygons([v.co for v in shirt.data.vertices], [list(p.vertices) for p in shirt.data.polygons])
        def front(x, z, offset=.0025):
            hit, normal, _, _ = bvh.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)), 2)
            return hit + normal * offset if hit else None
        bindings(shirt, root)
        # Original small FP monogram follows the garment surface, rather than floating
        # in front of the breastbone. All detail meshes inherit the skin rig below.
        z = g['CHEST_Z'] + .015; x = .065
        for line in [[(x,z-.009),(x,z+.011),(x+.015,z+.011)],[(x,z),(x+.011,z)]]:
            points = [front(a,b) for a,b in line]
            if all(p is not None for p in points): tube('tailored_fp', points, .0014, ivory, root, shirt)
        if zipped:
            low = min(v.co.z for v in shirt.data.vertices if abs(v.co.x) < .03) + .006
            high = max(v.co.z for v in shirt.data.vertices if abs(v.co.x) < .03) - .007
            points = [front(0, low + (high-low)*i/48) for i in range(49)]
            # Stop at the actual collar, leaving the neck open.
            runs = []; run = []
            for p in points:
                if p is not None: run.append(p)
                elif run: runs.append(run); run=[]
            if run: runs.append(run)
            for run in runs:
                tube('tailored_zip_tape', run, .0032, dark, root, shirt)
                tube('tailored_zip_teeth', [p+Vector((0,-.0015,0)) for p in run], .0009, zipper, root, shirt)
            # Curved pocket mouths, fitted separately on each side.
            for sign in (-1,1):
                points = [front(sign*(.07+i*.004), low+.075+i*.007) for i in range(10)]
                if all(p is not None for p in points): tube('tailored_pocket', points, .0016, dark, root, shirt)

    # Base kit uses real open-sleeved T-shirt and loose shorts topology.
    body = bpy.data.objects['body']
    for name in ('body_shirt', 'body_shorts', 'body_study_details'):
        old = bpy.data.objects.get(name)
        if old: remove_tree(old)
    shirt = cloth(sources[0], 'body_shirt', body, True)
    cloth(sources[0], 'body_shorts', body, False)
    details = bpy.data.objects.new('body_study_details', None); g['scene'].collection.objects.link(details); details.parent=body
    embellish(shirt, details, False)

    # Tracksuit and ski kit now replace the entire base kit. Their own fitted shirt/pants
    # form one coherent garment; the champion kit retains its existing decorative armour.
    for key in ('tracksuit', 'sport_ski', 'champion'):
        root = bpy.data.objects['outfit_'+key]
        if key != 'champion':
            for ob in list(root.children):
                if ob.name.startswith(('sleeves','pants','zip')): remove_tree(ob)
        else:
            # The old skin-shell sash clips through a real jacket. Its gold hem binding
            # supplies the trim; a separately equipped belt keeps its own complete design.
            for ob in list(root.children):
                if ob.name.startswith('sash'): remove_tree(ob)
        top = cloth(sources[1], 'tailored_jacket_'+key, root, True)
        trousers = cloth(sources[1], 'tailored_trousers_'+key, root, False)
        bindings(trousers, root)
        embellish(top, root, key != 'champion')
    from hero_equipment import polish_equipment
    polish_equipment(g, list(fitted.values()), remove_tree, tube)

    # The base T-shirt/shorts are worn in every mode (or replaced by a longer complete kit).
    # Cull only their conservative CC0 coverage faces, after all measurements and fitting.
    # Keep vertices/weights intact for attachment calculations; never cull hands/face/legs
    # using the long-outfit mask, since those remain exposed without a long outfit.
    coverages = [human.vertex_groups.get(name) for name in ('Delete.female_casualsuit02','Delete.shoes05')]
    for coverage in filter(None, coverages):
        bm = bmesh.new(); bm.from_mesh(human.data)
        layer = bm.verts.layers.deform.active
        covered = [f for f in bm.faces if all(v[layer].get(coverage.index, 0) > .5 for v in f.verts)]
        bmesh.ops.delete(bm, geom=covered, context='FACES_ONLY')
        bm.to_mesh(human.data); bm.free()
    for ob in sources: bpy.data.objects.remove(ob, do_unlink=True)
    print('TAILOR fitted base kit and three complete outfits, original weave, bindings, pockets and zipper')
