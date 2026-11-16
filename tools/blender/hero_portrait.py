"""Face/hair study 02: original iris art and hair wisps on the fitted CC0 MakeHuman base.
Use --portrait-study for a separate reference, or --portrait-finish for all approved variants.
"""
import math
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def refine_expression(human, service):
    from bl_ext.user_default.mpfb.services.locationservice import LocationService
    root=Path(LocationService.get_mpfb_data('targets'))
    # A restrained closed-mouth smile and relaxed eyelids, blended for the existing mixed base.
    for race, blend in [('asian',.33),('caucasian',.34),('african',.33)]:
        for unit, value in [('mouth-corner-puller',.20),('eye-left-slit',.10),('eye-right-slit',.10)]:
            service.load_target(human,str(root/'expression/units'/race/(unit+'.target.gz')),weight=value*blend)


def refine_portrait(g):
    eyes=g['eyes'];scene=g['scene'];iris=g['IRIS'];bun=bpy.data.objects['hair_bun']
    # Neutral grey iris texture multiplies the existing selectable iris colour. Original radial
    # fibres, a dark limbal edge and a soft pupil boundary replace flat colour caps.
    size=256
    y,x=np.mgrid[0:size,0:size].astype(np.float32)
    x=(x+.5-size/2)/(size/2);y=(y+.5-size/2)/(size/2)
    r=np.sqrt(x*x+y*y);theta=np.arctan2(y,x)
    fibres=(np.sin(theta*97+r*13)+.5*np.sin(theta*173-r*25)+.3*np.sin(theta*251+r*44))/1.8
    collarette=np.exp(-((r-.48)/.075)**2)
    shade=np.clip(.66+.19*fibres+.10*np.sin(r*27+theta*8)+.12*collarette,.20,1)
    limbal=np.clip((1-r)/.11,0,1)
    shade=shade*(.20+.80*limbal)
    pupil=np.clip((r-.35)/.035,0,1)
    shade=shade*pupil+.012*(1-pupil)
    pixels=np.ones((size,size,4),dtype=np.float32);pixels[:,:,:3]=shade[:,:,None]
    image=bpy.data.images.new('original_radial_iris',width=size,height=size)
    image.pixels.foreach_set(pixels.ravel());image.pack()
    nodes=iris.node_tree.nodes;links=iris.node_tree.links
    texture=nodes.new('ShaderNodeTexImage');texture.image=image
    bsdf=nodes['Principled BSDF'];links.new(texture.outputs['Color'],bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value=.28
    bsdf.inputs['Coat Weight'].default_value=.65
    bsdf.inputs['Coat Roughness'].default_value=.06
    # Preserve the original eyeballs and eyelids, adding fitted curved iris surfaces on their front.
    for polygon in eyes.data.polygons:polygon.material_index=0
    eye_surface=BVHTree.FromPolygons([v.co.copy() for v in eyes.data.vertices],[tuple(p.vertices) for p in eyes.data.polygons])
    for sg,label in [(1,'l'),(-1,'r')]:
        points=[v.co.copy() for v in eyes.data.vertices if v.co.x*sg>0]
        center=sum(points,Vector())/len(points)
        radius=max((p-center).length for p in points)
        iris_radius=min(.0063,radius*.52)
        front=min(p.y for p in points)-.02
        def point(rad,angle):
            x,z=center.x+rad*math.cos(angle),center.z+rad*math.sin(angle)
            hit,_,_,_=eye_surface.ray_cast(Vector((x,front,z)),Vector((0,1,0)),.08)
            if hit is None: raise ValueError('Iris falls outside the fitted eyeball')
            return (x,hit.y-.00015,z)
        vertices=[point(0,0)];uvs=[(.5,.5)];faces=[];sides=64;rings=12
        for j in range(1,rings+1):
            rad=iris_radius*j/rings
            for i in range(sides):
                angle=math.tau*i/sides
                vertices.append(point(rad,angle));uvs.append((.5+.5*j/rings*math.cos(angle),.5+.5*j/rings*math.sin(angle)))
        for i in range(sides):faces.append((0,1+i,1+(i+1)%sides))
        for j in range(rings-1):
            for i in range(sides):
                a=1+j*sides+i;b=1+j*sides+(i+1)%sides
                faces.append((a,a+sides,b+sides,b))
        mesh=bpy.data.meshes.new('curved_iris_'+label);mesh.from_pydata(vertices,[],faces);mesh.update()
        layer=mesh.uv_layers.new(name='IrisUV')
        for loop in mesh.loops:layer.data[loop.index].uv=uvs[loop.vertex_index]
        ob=bpy.data.objects.new('body_iris_'+label,mesh);scene.collection.objects.link(ob)
        mesh.materials.append(iris)
        for polygon in mesh.polygons:polygon.use_smooth=True
    sclera=g['SCLERA'].node_tree.nodes['Principled BSDF']
    sclera.inputs['Roughness'].default_value=.19
    # Strand-scale relief uses the actual fitted hair UVs and preserves its alpha hairline.
    material=bun.data.materials[0];bsdf=material.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value=.66
    bsdf.inputs['Coat Weight'].default_value=.03
    bsdf.inputs['Coat Roughness'].default_value=.55
    texture=next(n for n in material.node_tree.nodes if n.type=='TEX_IMAGE' and n.image)
    source=texture.image.copy();source.scale(512,512)
    pixels=np.array(source.pixels[:],dtype=np.float32).reshape(512,512,4)
    height=pixels[:,:,:3].mean(axis=2)
    dx=(np.roll(height,1,1)-np.roll(height,-1,1))*2.0
    dy=(np.roll(height,1,0)-np.roll(height,-1,0))*2.0
    normal=np.ones((512,512,4),dtype=np.float32)
    normal[:,:,0]=.5+dx;normal[:,:,1]=.5+dy;normal[:,:,2]=1
    image=bpy.data.images.new('fitted_hair_strand_normal',width=512,height=512)
    image.colorspace_settings.name='Non-Color';image.pixels.foreach_set(normal.ravel());image.pack()
    tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    mapping=material.node_tree.nodes.new('ShaderNodeNormalMap');mapping.inputs['Strength'].default_value=.6
    material.node_tree.links.new(tex.outputs['Color'],mapping.inputs['Color'])
    material.node_tree.links.new(mapping.outputs['Normal'],bsdf.inputs['Normal'])
    # Sparse face-framing flyaways have tapered ends and inherit the fitted bun's head weights.
    hc,hr=g['HC'],g['HR'];hair_points=[v.co.copy() for v in bun.data.vertices]
    body=g['human'];head_surface=BVHTree.FromPolygons([v.co.copy() for v in body.data.vertices],[tuple(p.vertices) for p in body.data.polygons])
    wisp_material=g['HAIR'].copy();wisp_material.name='hair'
    wisp_material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.72
    for sg in (-1,1):
        for index in range(3):
            desired=Vector((hc.x+sg*(.053+index*.006),hc.y-hr.y*.72,g['TOP']-.055-index*.009))
            root=min(hair_points,key=lambda p:(p-desired).length_squared)
            end=root+Vector((sg*.002,-.001,-(.009+index*.002)))
            curve=bpy.data.curves.new('temple_wisp','CURVE');curve.dimensions='3D'
            curve.resolution_u=10;curve.bevel_depth=.00025;curve.bevel_resolution=2
            spline=curve.splines.new('BEZIER');spline.bezier_points.add(5)
            points=[root]
            for step in range(1,6):
                t=step/5
                target=root.lerp(end,t)+Vector((sg*.0015*math.sin(math.pi*t),-.001*math.sin(math.pi*t),0))
                hit,normal,_,_=head_surface.find_nearest(target)
                points.append(hit+normal*.0004)
            for j,(bp,co) in enumerate(zip(spline.bezier_points,points)):
                bp.co=co;bp.radius=max(.025,(1-j/5)**1.2)
                bp.handle_left_type=bp.handle_right_type='AUTO'
            ob=bpy.data.objects.new('temple_wisp',curve);scene.collection.objects.link(ob);ob.parent=bun
            curve.materials.append(wisp_material)
            bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
            bpy.ops.object.convert(target='MESH')
    print('PORTRAIT study: original iris fibres, curved eyes, hair relief and tapered temple wisps')
