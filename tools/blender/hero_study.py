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
    neck, waist = g['NECK_H'].z, g['WAIST_Z']
    hem_z = g['BONE']['pelvis'][0].z + .05
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

    def fair(ob, iterations=12, factor=.45):
        bm = bmesh.new(); bm.from_mesh(ob.data)
        boundary = {v for e in bm.edges if e.is_boundary for v in e.verts}
        movable = [v for v in bm.verts if v not in boundary]
        for _ in range(iterations):
            bmesh.ops.smooth_vert(bm, verts=movable, factor=factor, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        bm.to_mesh(ob.data); bm.free()

    # A separate, regular garment surface. Copying anatomical topology leaves nipple-shaped folds
    # even after smoothing, so the shirt uses measured elliptical sections instead.
    old=bpy.data.objects['body_shirt'];body_root=old.parent
    bpy.data.objects.remove(old,do_unlink=True)
    torso = g['pts'](lambda c,n,b,t,groups: abs(c.x)<g['SHW'] and hem_z-.02<c.z<neck)
    rings=[]
    for i in range(13):
        z=hem_z+(neck-.065-hem_z)*i/12
        points=[p for p in torso if abs(p.z-z)<.025]
        lo,hi=g['bbox'](points)
        center=(lo+hi)/2
        rings.append((z,center.y,(hi.x-lo.x)/2+.019,(hi.y-lo.y)/2+.024))
    rings.extend([(neck-.025,g['NECK_C'].y,g['SHW']+.025,.095),
                  (neck+.009,g['NECK_C'].y,g['SHW']*.80,.068),
                  (neck+.026,g['NECK_C'].y,g['NECK_R']*1.48,g['NECK_R']*1.25)])
    verts=[];faces=[];sides=64
    for z,cy,rx,ry in rings:
        for i in range(sides):
            t=math.tau*i/sides
            # Broad, very subtle folds near the hem; no anatomical ridges.
            fold=.002*math.sin(t*7+z*9)*max(0,1-(z-hem_z)/.18)
            verts.append((math.cos(t)*(rx+fold),cy+math.sin(t)*(ry+fold),z))
    for j in range(len(rings)-1):
        for i in range(sides):
            faces.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
    mesh=bpy.data.meshes.new('tailored_shirt');mesh.from_pydata(verts,[],faces);mesh.update()
    shirt=bpy.data.objects.new('body_shirt',mesh);g['scene'].collection.objects.link(shirt);shirt.parent=body_root
    g['finish'](shirt,g['KIT'],sub=1)
    with part('body_study_sleeves'):
        for side in ('l','r'):
            a,b=g['along']('upperarm_'+side,-.08),g['along']('upperarm_'+side,.44)
            radius=g['limb_r']('upperarm_'+side,.25)+.022
            # Open sleeve ends sit inside the torso; cloth shares a single matte material.
            d=(b-a).normalized();u=d.cross(Vector((0,1,0))).normalized();v=d.cross(u)
            vv=[];ff=[]
            for j in range(5):
                center=a.lerp(b,j/4);r=radius*(1-.1*j/4)
                for i in range(32):
                    t=math.tau*i/32;vv.append(center+r*(u*math.cos(t)+v*math.sin(t)))
            for j in range(4):
                for i in range(32):ff.append((j*32+i,j*32+(i+1)%32,(j+1)*32+(i+1)%32,(j+1)*32+i))
            me=bpy.data.meshes.new('sleeve');me.from_pydata(vv,[],ff);me.update()
            ob=bpy.data.objects.new('sleeve',me);g['scene'].collection.objects.link(ob);g['finish'](ob,g['KIT'],sub=1)
            g['ring_on'](b,b+d,radius*.9,.0035,ivory,name='sleeve_binding')
    # Smooth each open garment edge and bind the actual neckline/cuffs, rather than a floating circle.
    bm=bmesh.new();bm.from_mesh(shirt.data)
    boundary=[v for v in bm.verts if any(e.is_boundary for e in v.link_edges)]
    for _ in range(5):
        coordinates={v:sum((e.other_vert(v).co for e in v.link_edges if e.is_boundary),Vector())/2 for v in boundary}
        for v,co in coordinates.items(): v.co=v.co.lerp(co,.45)
    edge_loops=[];seen=set()
    for first in boundary:
        if first in seen: continue
        loop=[];v=first;previous=None
        while v not in seen:
            seen.add(v);loop.append(v.co.copy())
            candidates=[e.other_vert(v) for e in v.link_edges if e.is_boundary and e.other_vert(v)!=previous]
            if not candidates: break
            previous,v=v,candidates[0]
        if len(loop)>5: edge_loops.append(loop+[loop[0]])
    bm.to_mesh(shirt.data);bm.free()
    with part('body_study_details'):
        for loop in edge_loops:
            low=sum(p.z for p in loop)/len(loop)<waist+.05
            tube('folded_hem' if low else 'garment_binding',loop,.0035,g['KIT'] if low else ivory)
        # Small original FP mark, flush with the front panel.
        z = g['CHEST_Z'] + .025
        y = min(v.co.y for v in shirt.data.vertices if abs(v.co.z-z)<.025) - .003
        x = .075
        for points in [[(x,y,z-.012),(x,y,z+.014),(x+.018,y,z+.014)],[(x,y,z+.002),(x+.012,y,z+.002)]]:
            tube('fp_mark',points,.002,ivory)
        # Two short diagonal shoulder seams.
        for sg in (-1,1):
            tube('shoulder_seam',[(sg*.06,y+.015,neck-.042),(sg*.12,y+.024,neck-.065),(sg*.17,y+.026,neck-.10)],.0017,piping)

    shorts = bpy.data.objects['body_shorts']
    fair(shorts, 8, .35)
    for v in shorts.data.vertices:
        # Ease around each thigh, retaining the skin weights of the original mesh.
        sg = 1 if v.co.x > 0 else -1
        hip = g['HIP'][sg]
        v.co.x = hip.x + (v.co.x-hip.x)*1.08
        v.co.y += -.016 if v.co.y < hip.y else .012
    shorts.data.update()
    wrap = shorts.modifiers.new('shorts_clearance','SHRINKWRAP')
    wrap.target=human;wrap.wrap_method='NEAREST_SURFACEPOINT';wrap.wrap_mode='OUTSIDE_SURFACE';wrap.offset=.022
    bpy.context.view_layer.objects.active=shorts
    bpy.ops.object.modifier_apply(modifier=wrap.name)
    with part('body_study_shorts_detail'):
        for sg in (-1,1):
            s = g['SIDE'][sg]
            hip = g['HIP'][sg]
            z1, z2 = hem_z-.025, g['along']('thigh_'+s,.52).z
            x = max(abs(v.co.x) for v in shorts.data.vertices if abs(v.co.z-z2)<.025)*sg
            tube('shorts_side_seam',[(x*.94,hip.y-.004,z1),(x,hip.y-.012,(z1+z2)/2),(x*.99,hip.y-.015,z2)],.002,piping)
        # Drawstrings sit below the shirt hem.
        y = min(v.co.y for v in shorts.data.vertices if abs(v.co.z-(hem_z-.012))<.035)-.005
        for sg in (-1,1):
            tube('drawstring',[(sg*.009,y,hem_z-.012),(sg*.015,y-.006,hem_z-.048),(sg*.012,y,hem_z-.075)],.002,ivory)

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
        if name.startswith('hair_') and name!='hair_bun':
            bpy.data.objects.remove(bpy.data.objects[name],do_unlink=True)

    # Remove only fully covered body faces; retain all vertices/weights so the skeleton and source indices stay stable.
    # This also prevents internal breasts/torso from casting shadows through thin clothing.
    covered_low=min(g['along']('thigh_'+s,.46).z for s in ('l','r'))
    def covered(v):
        c,n,b,t,groups=g['VX'][v.index]
        if covered_low<c.z<neck-.02 and abs(c.x)<g['SHW']*.97: return True
        if b in ('upperarm_l','upperarm_r'): return t<.32
        return False
    bm=bmesh.new();bm.from_mesh(human.data);bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm,geom=[f for f in bm.faces if all(covered(v) for v in f.verts)],context='FACES_ONLY')
    bm.to_mesh(human.data);bm.free()

    # The CC0 source skin contributes facial shading while a neutralised texture preserves selectable skin tones.
    import numpy as np
    skin_image=bpy.data.images.load(str(Path(g['args'].assets)/'system/skins/young_caucasian_female/young_lightskinned_female_diffuse.png'))
    skin_image.scale(512,512)
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
