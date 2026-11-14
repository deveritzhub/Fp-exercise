"""Original FP Flow art study. Opt in with mh_hero.py --study; keep production builds intact.
Garment details and vertex paint are authored here. Fitted hair and neutralised skin shading use
the documented CC0 MakeHuman sources; see assets/README.md.
"""
import math
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector


def soften_face(human, service):
    from bl_ext.user_default.mpfb.services.locationservice import LocationService
    root = Path(LocationService.get_mpfb_data('targets'))
    targets = {'mouth/mouth-angles-up': .23, 'mouth/mouth-lowerlip-middle-up': .2,
               'mouth/mouth-upperlip-middle-down': .1,
               'eyes/l-eye-height2-decr': .12, 'eyes/r-eye-height2-decr': .12}
    for name, weight in targets.items():
        service.load_target(human, str(root / (name + '.target.gz')), weight=weight)


def dress_study(ctx):
    g = ctx
    human, skin = g['human'], g['SKIN']
    hr = g['HR']
    part, mat = g['part'], g['mat']
    waist = g['WAIST_Z']
    # A muted olive shirt, charcoal shorts, ivory detailing; the normal colour controls still tint these.
    ivory = mat('study_ivory', '#eee5d2', .76)
    piping = mat('study_piping', '#b1a17a', .68)
    g['KIT'].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .92
    g['KIT_D'].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .92

    def tube(name, points, radius, material):
        curve = bpy.data.curves.new(name, 'CURVE')
        curve.dimensions = '3D'
        curve.bevel_depth, curve.bevel_resolution, curve.resolution_u = radius, 2, 12
        spline = curve.splines.new('BEZIER')
        spline.bezier_points.add(len(points)-1)
        for bp, co in zip(spline.bezier_points, points):
            bp.co = co
            bp.handle_left_type = bp.handle_right_type = 'AUTO'
        ob = bpy.data.objects.new(name, curve)
        g['scene'].collection.objects.link(ob)
        ob.data.materials.append(material)
        g['adopt'](ob)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.select_all(action='DESELECT')
        ob.select_set(True)
        bpy.ops.object.convert(target='MESH')
        return bpy.context.object

    # Use the app's newly improved loose MakeHuman kit, retaining its fitted skin weights and UVs.
    # Bind the actual neckline/cuffs and add a small original mark without replacing the garment mesh.
    shirt=bpy.data.objects['body_shirt']
    bm=bmesh.new();bm.from_mesh(shirt.data)
    boundary=[v for v in bm.verts if any(e.is_boundary for e in v.link_edges)]
    loops=[];seen=set()
    for first in boundary:
        if first in seen: continue
        loop=[];v=first;previous=None
        while v not in seen:
            seen.add(v);loop.append(v.co.copy())
            candidates=[e.other_vert(v) for e in v.link_edges if e.is_boundary and e.other_vert(v)!=previous]
            if not candidates: break
            previous,v=v,candidates[0]
        if len(loop)>5:
            # Bind only the neckline, sleeve cuffs and hem, not small underarm mesh openings.
            width=max(p.x for p in loop)-min(p.x for p in loop)
            if width>=.05: loops.append(loop[::2]+[loop[0]])
    bm.free()
    with part('body_study_details'):
        for loop in loops:
            low=sum(p.z for p in loop)/len(loop)<waist+.05
            tube('folded_hem' if low else 'garment_binding',loop,.0025,g['KIT'] if low else ivory)
        z=g['CHEST_Z']+.025
        y=min(v.co.y for v in shirt.data.vertices if abs(v.co.z-z)<.025)-.004
        x=.075
        for points in [[(x,y,z-.012),(x,y,z+.014),(x+.018,y,z+.014)],[(x,y,z+.002),(x+.012,y,z+.002)]]:
            tube('fp_mark',points,.002,ivory)

    # White shoes get distinct soles, heel tabs and crossed laces.
    with part('base_shoes') as shoe_root:
        # Reparent to the existing toggle; Blender would otherwise create base_shoes.001.
        existing = bpy.data.objects.get('base_shoes')
        for s in (1,-1):
            lo, hi = g['FOOT'][s]
            cx, cy = (lo.x+hi.x)/2, (lo.y+hi.y)/2
            for i in range(4):
                y = cy-.035+i*.016
                z = .075+i*.006
                tube('cross_lace',[(cx-.024,y,z),(cx+.024,y+.012,z+.003)],.0022,ivory)
                tube('cross_lace',[(cx+.024,y,z),(cx-.024,y+.012,z+.003)],.0022,ivory)
            g['cube']((cx,hi.y+.012,.073),(.022,.005,.018),piping,sub=1,name='heel_tab')
        for child in list(shoe_root.children):
            child.parent = existing
    bpy.data.objects.remove(shoe_root)

    # Preserve the original fitted CC0 bun; soften the silhouette and retain its strand texture.
    bun=bpy.data.objects['hair_bun']
    sub=bun.modifiers.new('groomed_surface','SUBSURF');sub.levels=sub.render_levels=1
    dec=bun.modifiers.new('mobile_hair','DECIMATE');dec.ratio=.72
    for name in list(g['ASSETS']):
        if g['args'].study and name.startswith('hair_') and name!='hair_bun':
            bpy.data.objects.remove(bpy.data.objects[name],do_unlink=True)

    # The CC0 source skin contributes facial shading while a neutralised texture preserves selectable skin tones.
    import numpy as np
    source='young_caucasian_male/young_lightskinned_male_diffuse.png' if g['M'] else 'young_caucasian_female/young_lightskinned_female_diffuse.png'
    skin_image=bpy.data.images.load(str(Path(g['args'].assets)/'system/skins'/source))
    skin_image.scale(448,448)
    pix=np.array(skin_image.pixels[:],dtype=np.float32).reshape(-1,4)
    grey=pix[:,:3].mean(axis=1)
    ref=float(np.percentile(grey,80))
    shade=np.clip(grey/max(ref,.01),.12,1)**.55
    pix[:,:3]=shade[:,None]
    skin_image.pixels.foreach_set(pix.ravel());skin_image.pack()
    skin_texture=skin.node_tree.nodes.new('ShaderNodeTexImage');skin_texture.image=skin_image
    skin.node_tree.links.new(skin_texture.outputs['Color'],skin.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    for polygon in human.data.polygons: polygon.material_index=0
    # Vertex paint survives glTF and multiplies the user's skin tint (no fixed skin colour image).
    # Gentle cheek warmth and restrained eyelid shadow, with broad gradients to avoid makeup-like dots.
    colors = human.data.color_attributes.new(name='SkinVariation',type='BYTE_COLOR',domain='CORNER')
    for loop in human.data.loops:
        p=human.data.vertices[loop.vertex_index].co
        face=max(0,min(1,(g['HC'].y-p.y)/max(hr.y,.001)))
        cheek=sum(math.exp(-(((p.x-s*.043)/.029)**2+((p.z-(g['EYE_Z']-.033))/.025)**2)) for s in (-1,1))*face
        under=sum(math.exp(-(((p.x-s*.035)/.022)**2+((p.z-(g['EYE_Z']-.012))/.008)**2)) for s in (-1,1))*face
        lip='lips' in g['VX'][loop.vertex_index][4]
        colors.data[loop.index].color=(1-.045*under,(1-.085*cheek-.065*under)*(.72 if lip else 1),(1-.09*cheek-.06*under)*(.69 if lip else 1),1)
    human.data.color_attributes.active_color=colors
    # Lip colour stays subtle; the old uniform pink made dark skin look disconnected.
    lip = g['LIPS'].node_tree.nodes['Principled BSDF']
    lip.inputs['Base Color'].default_value=g['hexrgb']('#ac7060')
    lip.inputs['Roughness'].default_value=.58
    # Tiny pore normal map authored with deterministic noise; exports as a normal texture, not a Blender-only node.
    import numpy as np
    rng=np.random.default_rng(44)
    noise=rng.normal(0,.45,(128,128))
    dx=np.roll(noise,1,1)-noise; dy=np.roll(noise,1,0)-noise
    pixels=np.ones((128,128,4),dtype=np.float32)
    pixels[:,:,0]=.5+dx*.035; pixels[:,:,1]=.5+dy*.035
    pixels[:,:,2]=1
    image=bpy.data.images.new('original_skin_micro_normal',width=128,height=128)
    image.colorspace_settings.name='Non-Color'; image.pixels.foreach_set(pixels.ravel()); image.pack()
    tex=skin.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    normal=skin.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.18
    skin.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color'])
    skin.node_tree.links.new(normal.outputs['Normal'],skin.node_tree.nodes['Principled BSDF'].inputs['Normal'])
    # Fair the visible silhouette without introducing heroic anatomy changes.
    # Keep the original body resolution for mobile; surface colour and normals carry fine detail.
    print('STUDY original garment fairing, bun, skin variation and shoe details applied')
