"""Original FP Flow sports detailing and attachment to the fitted garment envelope."""
import math
import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def polish_equipment(g, garments, remove_tree, tube):
    vertices, faces, torso_faces = [], [], []
    for cloth in garments:
        start = len(vertices)
        vertices.extend(v.co.copy() for v in cloth.data.vertices)
        names={group.index:group.name for group in cloth.vertex_groups}
        for p in cloth.data.polygons:
            face=[start+i for i in p.vertices];faces.append(face)
            arm=max(sum(x.weight for x in cloth.data.vertices[i].groups
                        if names.get(x.group,'').startswith(('upperarm','lowerarm','hand','index','middle','ring','pinky','thumb')))
                    for i in p.vertices)
            if arm < .25:torso_faces.append(face)
    cloth_bvh = BVHTree.FromPolygons(vertices, faces)
    torso_bvh = BVHTree.FromPolygons(vertices, torso_faces)
    scene = g['scene']
    def front(x,z):
        hit,normal,_,_ = cloth_bvh.ray_cast(Vector((x,-1,z)),Vector((0,1,0)),2)
        return hit,normal

    # A closed captain's band wraps the sleeve; a cropped patch of body faces left gaps.
    sleeve_faces=[]
    for cloth in garments:
        start=sum(len(c.data.vertices) for c in garments[:garments.index(cloth)])
        arm=cloth.vertex_groups.get('upperarm_l')
        if not arm:continue
        for p in cloth.data.polygons:
            if max(sum(x.weight for x in cloth.data.vertices[i].groups if x.group==arm.index) for i in p.vertices)>.3:
                sleeve_faces.append([start+i for i in p.vertices])
    sleeve_bvh=BVHTree.FromPolygons(vertices,sleeve_faces)
    remove_tree(bpy.data.objects['gear_captain'])
    with g['part']('gear_captain') as root:
        h,t=g['BONE']['upperarm_l'];axis=(t-h).normalized()
        u=Vector((0,-1,0));v=axis.cross(u).normalized();u=v.cross(axis).normalized()
        rows=[]
        for progress in (.43,.64):
            centre=h.lerp(t,progress);row=[]
            for i in range(48):
                angle=math.tau*i/48;direction=u*math.cos(angle)+v*math.sin(angle)
                hit,normal,_,_=sleeve_bvh.ray_cast(centre+direction*.4,-direction,.8)
                row.append(hit+normal*.006 if hit else centre+direction*(g['limb_r']('upperarm_l',progress)+.026))
            rows.append(row)
        mesh=bpy.data.meshes.new('woven_captain_band');mesh.from_pydata(rows[0]+rows[1],[],[(i,(i+1)%48,(i+1)%48+48,i+48) for i in range(48)])
        ob=bpy.data.objects.new('captain_band',mesh);scene.collection.objects.link(ob);ob.parent=root
        mesh.materials.append(g['mat']('captain_weave','#b89748',.86))
        for p in mesh.polygons:p.use_smooth=True
        for row in rows:tube('captain_seam',row+[row[0]],.001,g['SAND'],root)
        centre=(rows[0][0]+rows[1][0])/2+u*.002
        tube('captain_c',[centre+v*(.008*math.cos(a))-axis*(.010*math.sin(a)) for a in [math.pi*(.25+i*1.5/16) for i in range(17)]],.0015,g['SAND'],root)

    # Soft bands and guards follow the outer cloth, keeping their original rig weights.
    for key in ('captain','wristbands','shin_guards','sleeve','iron_brace','rune_guard','watch'):
        root = bpy.data.objects['gear_'+key]
        if key=='watch':
            case=next(ob for ob in root.children if ob.name.startswith('case'))
            hit,_=front(case.location.x,case.location.z)
            if hit is not None and case.location.y > hit.y-.014:
                delta=hit.y-.014-case.location.y
                # Move case and glass together, preserving the glass's original 5 mm lead.
                for ob in root.children:
                    if ob.name.startswith(('case','face')):ob.location.y+=delta
        for ob in root.children_recursive:
            if ob.type != 'MESH': continue
            if key=='shin_guards':
                bpy.context.view_layer.objects.active=ob
                for mod in list(ob.modifiers):
                    if mod.type=='SUBSURF':bpy.ops.object.modifier_apply(modifier=mod.name)
                ob.data.materials[0]=g['mat']('guard_shell','#4a5d4d',.62)
            if key == 'watch' and ob.name.startswith(('case','face')):
                continue
            # Do not bend the hard hinge/rune decoration; only conform the original soft shell.
            if ob.name.startswith(('bar','hinge','plate','rune')): continue
            for v in ob.data.vertices:
                co = ob.matrix_world @ v.co
                hit,normal,_,distance = cloth_bvh.find_nearest(co)
                signed = (co-hit).dot(normal)
                if signed < .006 and distance < .09:
                    v.co += ob.matrix_world.inverted().to_3x3() @ (normal*(.006-signed))
            ob.data.update()

    guard=bpy.data.objects['gear_shin_guards']
    for ob in list(guard.children_recursive):
        if ob.type!='MESH':continue
        bm=bmesh.new();bm.from_mesh(ob.data);seen=set()
        for edge in bm.edges:
            if not edge.is_boundary:continue
            first=edge.verts[0]
            if first in seen:continue
            loop=[];vertex=first;previous=None
            while vertex not in seen:
                seen.add(vertex);loop.append(vertex.co+vertex.normal*.002)
                neighbours=[e.other_vert(vertex) for e in vertex.link_edges if e.is_boundary and e.other_vert(vertex)!=previous]
                if not neighbours:break
                previous,vertex=vertex,neighbours[0]
            if len(loop)>4:tube('guard_binding',loop+[loop[0]],.0015,g['SAND'],guard)
        bm.free()

    # Continuous shaped belts/chest straps: no gaps at body-bone boundaries.
    def body_band(key,z,height,material,buckle):
        remove_tree(bpy.data.objects['gear_'+key])
        with g['part']('gear_'+key) as root:
            rows=[];points=[]
            centre=Vector((0,g['WAIST_C'].y,z))
            for zz in (z-height/2,z+height/2):
                row=[]
                for i in range(64):
                    angle=math.tau*i/64;direction=Vector((math.cos(angle),math.sin(angle),0))
                    start=Vector((centre.x,centre.y,zz))+direction
                    hit,normal,_,_=torso_bvh.ray_cast(start,-direction,2)
                    if hit is None: hit=Vector((centre.x,centre.y,zz))+direction*.16;normal=direction
                    row.append(hit+normal*.007)
                rows.append(row)
            points=rows[0]+rows[1]
            mesh=bpy.data.meshes.new('continuous_sport_band')
            mesh.from_pydata(points,[],[(i,(i+1)%64,(i+1)%64+64,i+64) for i in range(64)])
            ob=bpy.data.objects.new('fitted_band',mesh);scene.collection.objects.link(ob);ob.parent=root;mesh.materials.append(material)
            for p in mesh.polygons:p.use_smooth=True
            for row in rows: tube('band_stitch',row+[row[0]],.0008,g['SAND'],root)
            hit,_=front(0,z); y=hit.y-.014 if hit else g['CHEST_FRONT']-.03
            if buckle:
                for dx in (-.026,.026):g['cube']((dx,y,z),(.003,.004,.018),g['BRASS'],sub=0,bevel=.15,name='buckle_rail')
                for dz in (-.018,.018):g['cube']((0,y,z+dz),(.026,.004,.003),g['BRASS'],sub=0,bevel=.15,name='buckle_rail')
                g['cube']((0,y-.002,z),(.002,.003,.017),g['BRASS'],sub=0,bevel=.1,name='buckle_pin')
                for i in range(4):g['sphere']((.06+i*.012,y+.005,z),.0018,g['LEATHER_D'],sub=0,seg=8,name='belt_eyelet')
            else:
                g['cube']((0,y-.003,z),(.024,.007,.012),g['RUBBER'],sub=0,bevel=.2,name='sensor_case')
                g['cube']((0,y-.011,z),(.010,.001,.004),g['ACCENT'],sub=0,name='sensor_led')
    body_band('belt',g['BONE']['pelvis'][0].z+.06,.038,g['LEATHER'],True)
    body_band('hr_band',g['CHEST_Z']-.06,.023,g['RUBBER'],False)

    # Give the small pin enough cloth clearance to remain visible on both the kit and jacket.
    pin=bpy.data.objects['gear_pin']; cos=[o.matrix_world@v.co for o in pin.children_recursive if o.type=='MESH' for v in o.data.vertices]
    if cos:
        x=sum(p.x for p in cos)/len(cos);z=sum(p.z for p in cos)/len(cos);hit,_=front(x,z)
        if hit is not None:
            delta=hit.y-.003-max(p.y for p in cos)
            for ob in pin.children:ob.location.y+=delta

    # Over-ear headphones with a padded headband above the cap, not a hoop around the neck.
    remove_tree(bpy.data.objects['gear_headphones'])
    with g['part']('gear_headphones') as root:
        hc,hr=g['HC'],g['HR'];ear_z=g['EYE_Z']-.006
        rx=hr.x+.014;rz=g['TOP']-ear_z+.018
        points=[Vector((hc.x+rx*math.sin(-math.pi/2+i*math.pi/28),hc.y+.008,ear_z+rz*math.cos(-math.pi/2+i*math.pi/28))) for i in range(29)]
        tube('padded_headband',points,.007,g['RUBBER'],root)
        for dy in (-.005,.005):tube('headband_rail',[p+Vector((0,dy,.002)) for p in points],.0012,g['STEEL'],root)
        for sign in (-1,1):
            p=Vector((hc.x+rx*sign,hc.y+.008,ear_z))
            g['sphere'](p,.031,g['RUBBER'],scale=(.46,.83,1.13),sub=1,name='ear_cushion')
            g['sphere'](p+Vector((sign*.009,0,0)),.031,g['KIT_D'],scale=(.34,.85,1.15),sub=1,name='ear_shell')
            g['cyl'](p+Vector((sign*.020,-.001,0)),.012,.003,g['BRASS'],rot=(0,math.pi/2,0),name='ear_emblem')
    # Sport gloves retain their fitted fingers, with a restrained technical leather finish.
    glove_mat=g['mat']('sport_glove','#394239',.7)
    for ob in bpy.data.objects['gear_gloves'].children_recursive:
        if ob.type=='MESH' and ob.name.startswith('glove'):ob.data.materials[0]=glove_mat

    # Original closed trainer last, built from each foot's measurements. The shoe's upper
    # bridges toes instead of inheriting toe anatomy; separate shaped soles, heel counters
    # and surface-fitted laces make the variants recognisable in thumbnails and on the hero.
    chalk=g['mat']('trainer_chalk','#e8e5db',.8)
    sole=g['mat']('trainer_sole','#cecec4',.92)
    heel=g['mat']('trainer_heel','#35423a',.8)
    gold=g['mat']('trainer_brushed_gold','#c9a35a',.33,.75)
    navy=g['mat']('trainer_balance','#344f67',.8)
    lace=g['mat']('trainer_laces','#b5b2a6',.92)
    stations=[(0,.28,.25),(.04,.75,.36),(.16,1,.48),(.36,1,.62),(.57,.94,.88),(.74,.84,1),(.91,.75,.91),(1,.42,.68)]

    def mesh_object(name,verts,faces,parent,materials,sub=0):
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
        ob=bpy.data.objects.new(name,mesh);scene.collection.objects.link(ob);ob.parent=parent
        for material in materials:mesh.materials.append(material)
        for p in mesh.polygons:p.use_smooth=True
        if sub:
            mod=ob.modifiers.new('shaped_last','SUBSURF');mod.levels=mod.render_levels=sub
            bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name)
        return ob

    for key,upper,bottom in [('base_shoes',chalk,sole),('gear_gold_shoes',gold,sole),('gear_balance_shoes',navy,g['BLUE']),('gear_spikes',g['RED'],g['RUBBER']),('gear_wing_shoes',chalk,g['ACCENT'])]:
        root=bpy.data.objects[key]
        for child in list(root.children):
            if child.name.startswith(('shoe','sole','stripe','pad','cross_lace','heel_tab')):remove_tree(child)
        for sign in (-1,1):
            lo,hi=g['FOOT'][sign];cx=(lo.x+hi.x)/2
            width=(hi.x-lo.x)/2+.011;length=hi.y-lo.y+.025
            y0=lo.y-.012;rise=max(.085,min(.12,hi.z))
            verts=[];sides=15
            for t,w,h in stations:
                for i in range(sides-2):
                    angle=math.pi*i/(sides-3)
                    verts.append((cx+width*w*math.cos(angle),y0+t*length,.024+rise*h*math.sin(angle)))
                verts.extend([(cx-width*w,y0+t*length,.018),(cx+width*w,y0+t*length,.018)])
            faces=[(j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i) for j in range(len(stations)-1) for i in range(sides)]
            faces.extend([tuple(reversed(range(sides))),tuple((len(stations)-1)*sides+i for i in range(sides))])
            faces=[tuple(reversed(face)) for face in faces]
            shoe=mesh_object('fitted_trainer_'+key,verts,faces,root,[upper,heel],sub=1)
            for p in shoe.data.polygons:
                if p.center.y>y0+length*.85 and p.center.z<.08:p.material_index=1
            # A continuous anatomical footprint, extruded into a rounded athletic midsole.
            outline=[(cx+width*w,y0+t*length) for t,w,h in stations]+[(cx-width*w,y0+t*length) for t,w,h in reversed(stations)]
            count=len(outline);sole_verts=[]
            extra=1.06 if key=='gear_balance_shoes' else 1
            for z,scale in [(0,.97),(.005,1.02),(.021,1.025),(.025,1)]:
                sole_verts.extend((cx+(x-cx)*scale*extra,y,z) for x,y in outline)
            sole_faces=[(j*count+i,j*count+(i+1)%count,(j+1)*count+(i+1)%count,(j+1)*count+i) for j in range(3) for i in range(count)]
            sole_faces.extend([tuple(reversed(range(count))),tuple(3*count+i for i in range(count))])
            mesh_object('trainer_midsole',sole_verts,sole_faces,root,[bottom],sub=1)
            bvh=BVHTree.FromPolygons([v.co for v in shoe.data.vertices],[list(p.vertices) for p in shoe.data.polygons])
            def top(x,y):
                hit,normal,_,_=bvh.ray_cast(Vector((x,y,.5)),Vector((0,0,-1)),1)
                return hit+normal*.0025 if hit else None
            for i in range(4):
                y=y0+length*(.46+i*.055)
                half=width*.43
                for side in (-1,1):
                    a=top(cx+half*side,y);b=top(cx-half*side,y+.011)
                    if a is not None and b is not None:tube('trainer_cross_lace',[a,(a+b)/2+Vector((0,0,.002)),b],.0015,lace,root)
            seam=[top(cx+width*(i/8-.5)*1.6,y0+length*.25) for i in range(9)]
            if all(p is not None for p in seam):tube('trainer_toe_stitch',seam,.0008,lace,root)
            stripe=[]
            for i in range(8):
                y=y0+length*(.31+i*.048);z=.048+i*.001
                hit,normal,_,_=bvh.ray_cast(Vector((cx+sign*.5,y,z)),Vector((-sign,0,0)),1)
                if hit is not None:stripe.append(hit+normal*.002)
            tube('trainer_side_piping',stripe,.002,heel if key in ('base_shoes','gear_gold_shoes') else chalk,root)
            with g['part']('trainer_heel_detail') as detail:
                detail.parent=root
                g['cube']((cx,hi.y+.012,.065),(.012,.004,.013),heel,sub=0,bevel=.2,name='trainer_pull_tab')
    print('EQUIPMENT fitted straps/guards, continuous belt, over-ear headphones and five original trainer variants')
