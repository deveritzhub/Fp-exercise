"""Round exported float attributes below visible precision to improve HTTP gzip size.
Packed attributes need no decoder. Optional lossless WebP uses the browser and built-in glTF support.
"""
import json
import struct
from pathlib import Path


def compact_glb(filename, polished=False):
    path = Path(filename)
    raw = bytearray(path.read_bytes())
    json_size = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + json_size])
    binary = 20 + json_size + 8
    sizes = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
    seen = set()
    normals = {p['attributes']['NORMAL'] for m in doc.get('meshes', []) for p in m['primitives'] if 'NORMAL' in p['attributes']}
    for index, accessor in enumerate(doc['accessors']):
        # 0.01 normal components retain sub-degree surface directions; geometry stays at 0.1 mm.
        precision = 2 if polished and index in normals else 4
        if accessor['componentType'] != 5126 or 'bufferView' not in accessor:
            continue
        view = doc['bufferViews'][accessor['bufferView']]
        count = sizes[accessor['type']]
        stride = view.get('byteStride', count * 4)
        start = binary + view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        for i in range(accessor['count']):
            for j in range(count):
                offset = start + i * stride + j * 4
                if offset not in seen:
                    value = struct.unpack_from('<f', raw, offset)[0]
                    struct.pack_into('<f', raw, offset, round(value, precision))
                    seen.add(offset)
        if 'min' in accessor or 'max' in accessor:
            values = [struct.unpack_from('<' + 'f' * count, raw, start + i * stride) for i in range(accessor['count'])]
            accessor['min'] = [min(v[j] for v in values) for j in range(count)]
            accessor['max'] = [max(v[j] for v in values) for j in range(count)]
    encoded = json.dumps(doc, separators=(',', ':')).encode('utf8')
    encoded += b' ' * (-len(encoded) % 4)
    chunks = struct.pack('<I4s', len(encoded), b'JSON') + encoded + raw[20 + json_size:]
    path.write_bytes(struct.pack('<4sII', b'glTF', 2, 12 + len(chunks)) + chunks)



def close_shirt_holes(doc, payloads):
    """Close only the two small side openings of the copied shirt topology.

    Neck, hem, sleeve cuffs and UV seams are larger components and stay open. Reuse existing
    positions, UVs and skin weights; triangulate each side polygon in the Y/Z plane.
    """
    from collections import Counter, defaultdict
    for node in doc.get('nodes', []):
        if node.get('name') != 'body_shirt' or 'mesh' not in node: continue
        for primitive in doc['meshes'][node['mesh']]['primitives']:
            pa=doc['accessors'][primitive['attributes']['POSITION']]
            pv=doc['bufferViews'][pa['bufferView']]
            posdata=bytearray(payloads[pa['bufferView']])
            positions=[struct.unpack_from('<fff',posdata,pa.get('byteOffset',0)+i*pv.get('byteStride',12)) for i in range(pa['count'])]
            ia=doc['accessors'][primitive['indices']];iv=doc['bufferViews'][ia['bufferView']]
            fmt={5123:'H',5125:'I'}[ia['componentType']];size=struct.calcsize(fmt)
            indices=[struct.unpack_from('<'+fmt,payloads[ia['bufferView']],ia.get('byteOffset',0)+i*iv.get('byteStride',size))[0] for i in range(ia['count'])]
            counts=Counter()
            for i in range(0,len(indices),3):
                triangle=indices[i:i+3]
                for j in range(3):counts[tuple(sorted((triangle[j],triangle[(j+1)%3])))]+=1
            neighbours=defaultdict(set)
            for (a,b),count in counts.items():
                if count==1:neighbours[a].add(b);neighbours[b].add(a)
            seen=set();added=[]
            for first in neighbours:
                if first in seen:continue
                component=[];todo=[first]
                while todo:
                    v=todo.pop()
                    if v in seen:continue
                    seen.add(v);component.append(v);todo.extend(neighbours[v]-seen)
                points=[positions[v] for v in component]
                span=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
                cx=sum(p[0] for p in points)/len(points)
                if not (5<len(points)<48 and span[0]<.05 and span[1]>.025 and span[2]>.04 and abs(cx)>.06):continue
                if any(len(neighbours[v])!=2 for v in component):continue
                loop=[];v=component[0];previous=None
                while v not in loop:
                    loop.append(v)
                    nexts=neighbours[v]-({previous} if previous is not None else set())
                    previous,v=v,next(iter(nexts))
                def cross(a,b,c):
                    return (b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1])
                area=sum(positions[loop[i]][1]*positions[loop[(i+1)%len(loop)]][2]-positions[loop[(i+1)%len(loop)]][1]*positions[loop[i]][2] for i in range(len(loop)))
                if area<0:loop.reverse()
                # Bridge outside the convex torso, giving cloth a little breathing room. Keeping
                # a flat patch inside the torso makes skin poke through its centre.
                outer=(max(abs(positions[v][0]) for v in loop)+.008)*(1 if cx>0 else -1)
                for v in loop:
                    positions[v]=(outer,positions[v][1],positions[v][2])
                    struct.pack_into('<fff',posdata,pa.get('byteOffset',0)+v*pv.get('byteStride',12),*positions[v])
                triangles=[];remaining=loop[:]
                while len(remaining)>3:
                    found=False
                    for i,b in enumerate(remaining):
                        a,c=remaining[i-1],remaining[(i+1)%len(remaining)]
                        aa,bb,cc=positions[a],positions[b],positions[c]
                        if cross(aa,bb,cc)<=1e-10:continue
                        if any(cross(aa,bb,positions[p])>=-1e-10 and cross(bb,cc,positions[p])>=-1e-10 and cross(cc,aa,positions[p])>=-1e-10 for p in remaining if p not in (a,b,c)):continue
                        triangles.append((a,b,c));remaining.pop(i);found=True;break
                    if not found:raise ValueError('Cannot triangulate the shirt side opening')
                triangles.append(tuple(remaining))
                for triangle in triangles:added.extend(triangle if cx>0 else tuple(reversed(triangle)))
            if added:
                payloads[pa['bufferView']]=posdata
                pa['min']=[min(p[i] for p in positions) for i in range(3)]
                pa['max']=[max(p[i] for p in positions) for i in range(3)]
                indices.extend(added)
                payloads[ia['bufferView']]=struct.pack('<'+fmt*len(indices),*indices)
                ia.update(count=len(indices),byteOffset=0)
                iv.pop('byteStride',None)
                print('Closed shirt side openings:',len(added)//3,'triangles')


def encode_webp_images(doc, payloads):
    """Losslessly encode embedded maps; verify decoded RGBA pixels before replacing them.
    EXT_texture_webp is handled by the existing Three.js loader and browser, without a new decoder.
    """
    from io import BytesIO
    from PIL import Image
    converted=set()
    for index,image in enumerate(doc.get('images', [])):
        if 'bufferView' not in image or image.get('mimeType') not in ('image/png','image/jpeg'): continue
        original=Image.open(BytesIO(payloads[image['bufferView']])).convert('RGBA')
        stream=BytesIO()
        original.save(stream,format='WEBP',lossless=True,quality=100,method=6,exact=True)
        encoded=stream.getvalue()
        decoded=Image.open(BytesIO(encoded)).convert('RGBA')
        if decoded.size!=original.size or decoded.tobytes()!=original.tobytes():
            raise ValueError('WebP must preserve every decoded texture pixel')
        if len(encoded)>=len(payloads[image['bufferView']]): continue
        payloads[image['bufferView']]=encoded
        image['mimeType']='image/webp'
        converted.add(index)
    if not converted: return
    for texture in doc.get('textures', []):
        if texture.get('source') in converted:
            texture.setdefault('extensions', {})['EXT_texture_webp']={'source':texture.pop('source')}
    for key in ('extensionsUsed','extensionsRequired'):
        if 'EXT_texture_webp' not in doc.setdefault(key,[]): doc[key].append('EXT_texture_webp')
    print('Lossless WebP maps:',len(converted),'(decoded pixels verified)')


def quantize_skin_positions(doc, payloads):
    """Store skinned positions as normalised shorts, dequantised by inverse bind matrices.

    KHR_mesh_quantization supports this representation directly. A shared uniform scale is
    right-multiplied into every inverse bind matrix, so bones, animation and world sizes stay
    in metres. At a 2 m scale the extra position error is at most 0.031 mm.
    """
    import math
    extras=doc.setdefault('asset',{}).setdefault('extras',{})
    if 'fpFlowPositionScale' in extras: return
    if any('mesh' in n and 'skin' not in n for n in doc['nodes']):
        raise ValueError('Position packing requires all meshes to be skinned')
    indices={p['attributes']['POSITION'] for m in doc['meshes'] for p in m['primitives']}
    uses={}
    for accessor in doc['accessors']:
        if 'bufferView' in accessor: uses[accessor['bufferView']]=uses.get(accessor['bufferView'],0)+1
    rows={}
    for index in indices:
        a=doc['accessors'][index];view=doc['bufferViews'][a['bufferView']]
        if a['componentType']!=5126 or uses[a['bufferView']]!=1:
            raise ValueError('Position packing expects separate float accessors')
        data=payloads[a['bufferView']]
        rows[index]=[struct.unpack_from('<fff',data,a.get('byteOffset',0)+i*view.get('byteStride',12)) for i in range(a['count'])]
    scale=max(1,math.ceil(max(abs(x) for values in rows.values() for row in values for x in row)))
    for index,values in rows.items():
        a=doc['accessors'][index];view=doc['bufferViews'][a['bufferView']]
        packed=[tuple(round(x/scale*32767) for x in row) for row in values]
        payloads[a['bufferView']]=b''.join(struct.pack('<hhh',*row) for row in packed)
        view.pop('byteStride',None)
        a.update(componentType=5122,normalized=True,byteOffset=0)
        a['min']=[min(row[j] for row in packed) for j in range(3)]
        a['max']=[max(row[j] for row in packed) for j in range(3)]
    for index in {skin['inverseBindMatrices'] for skin in doc['skins']}:
        a=doc['accessors'][index];view=doc['bufferViews'][a['bufferView']]
        if a['componentType']!=5126 or a['type']!='MAT4': raise ValueError('Expected float inverse bind matrices')
        data=bytearray(payloads[a['bufferView']])
        for i in range(a['count']):
            offset=a.get('byteOffset',0)+i*view.get('byteStride',64)
            matrix=list(struct.unpack_from('<16f',data,offset))
            # glTF matrices are column-major: the first three columns are right-multiplied.
            for j in range(12): matrix[j]*=scale
            struct.pack_into('<16f',data,offset,*matrix)
        payloads[a['bufferView']]=data
    extras['fpFlowPositionScale']=scale
    for key in ('extensionsUsed','extensionsRequired'):
        if 'KHR_mesh_quantization' not in doc.setdefault(key,[]): doc[key].append('KHR_mesh_quantization')
    print('Position step in metres:',scale/32767)


def quantize_normal_attributes(doc, payloads):
    """KHR_mesh_quantization normal vectors: < 0.000016 component error, no image loss."""
    indices={p['attributes']['NORMAL'] for m in doc['meshes'] for p in m['primitives'] if 'NORMAL' in p['attributes']}
    uses={}
    for a in doc['accessors']:
        if 'bufferView' in a: uses[a['bufferView']]=uses.get(a['bufferView'],0)+1
    for index in indices:
        a=doc['accessors'][index]
        if a['componentType']==5122: continue
        view=doc['bufferViews'][a['bufferView']]
        if a['componentType']!=5126 or uses[a['bufferView']]!=1: raise ValueError('Expected separate float normals')
        data=payloads[a['bufferView']]
        values=[struct.unpack_from('<fff',data,a.get('byteOffset',0)+i*view.get('byteStride',12)) for i in range(a['count'])]
        packed=[tuple(max(-32767,min(32767,round(x*32767))) for x in row) for row in values]
        payloads[a['bufferView']]=b''.join(struct.pack('<hhh',*row) for row in packed)
        view.pop('byteStride',None)
        a.update(componentType=5122,normalized=True,byteOffset=0)
        if 'min' in a: a['min']=[min(row[j] for row in packed) for j in range(3)]
        if 'max' in a: a['max']=[max(row[j] for row in packed) for j in range(3)]


def pack_core_attributes(filename, webp=False, quantize_positions=False):
    """Use glTF 2.0's native normalised UV/weight encodings. No extension or decoder.

    UV error is < 1/65535; joint weights are distributed to sum to 255 exactly.
    Positions, normals, joint indices and animation data keep their existing encodings.
    """
    path = Path(filename)
    raw = path.read_bytes()
    json_size = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + json_size])
    binary = raw[28 + json_size:]
    payloads = [binary[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']] for v in doc['bufferViews']]
    if 'fpFlowPositionScale' not in doc.get('asset',{}).get('extras',{}):
        close_shirt_holes(doc, payloads)
    if webp: encode_webp_images(doc, payloads)
    # Older study sources bound every mesh opening. Omit the two narrow underarm trims;
    # neckline/cuffs/hem remain. The exporter stores these skinned meshes in world units.
    omitted=set()
    for index,node in enumerate(doc.get('nodes', [])):
        if not node.get('name','').startswith('garment_binding') or 'mesh' not in node: continue
        primitive=doc['meshes'][node['mesh']]['primitives'][0]
        accessor=doc['accessors'][primitive['attributes']['POSITION']]
        lo,hi=accessor.get('min'),accessor.get('max')
        if lo and hi and hi[0]-lo[0]<.05: omitted.add(index)
    for node in doc.get('nodes', []):
        if 'children' in node: node['children']=[i for i in node['children'] if i not in omitted]
    for scene in doc.get('scenes', []): scene['nodes']=[i for i in scene.get('nodes', []) if i not in omitted]

    uv, weights = set(), set()
    for mesh in doc.get('meshes', []):
        for primitive in mesh['primitives']:
            for name, index in primitive['attributes'].items():
                if name.startswith('TEXCOORD_'): uv.add(index)
                if name == 'WEIGHTS_0': weights.add(index)
    uses = {}
    for a in doc['accessors']:
        if 'bufferView' in a: uses[a['bufferView']] = uses.get(a['bufferView'], 0) + 1
    for index in uv | weights:
        a = doc['accessors'][index]
        if a['componentType'] != 5126 or uses[a['bufferView']] != 1: continue
        view = doc['bufferViews'][a['bufferView']]
        count = 2 if index in uv else 4
        stride = view.get('byteStride', count * 4)
        data = payloads[a['bufferView']]
        values = [struct.unpack_from('<'+'f'*count, data, a.get('byteOffset', 0)+i*stride) for i in range(a['count'])]
        if any(x < 0 or x > 1 for row in values for x in row): continue
        output = bytearray()
        for row in values:
            if index in uv:
                output += struct.pack('<HH', *(round(x*65535) for x in row))
            else:
                total = sum(row)
                scaled = [x/max(total, 1e-9)*255 for x in row] if total else [255,0,0,0]
                ints = [int(x) for x in scaled]
                for j in sorted(range(4), key=lambda j: scaled[j]-ints[j], reverse=True)[:255-sum(ints)]: ints[j] += 1
                output += bytes(ints)
        payloads[a['bufferView']] = output
        view.pop('byteStride', None)
        a.update(componentType=5123 if index in uv else 5121, normalized=True, byteOffset=0)
        a.pop('min', None); a.pop('max', None)
    if quantize_positions:
        quantize_skin_positions(doc, payloads)
        quantize_normal_attributes(doc, payloads)
    blob = bytearray()
    for view, payload in zip(doc['bufferViews'], payloads):
        blob += b'\0'*(-len(blob)%4)
        view.update(byteOffset=len(blob), byteLength=len(payload))
        blob += payload
    blob += b'\0'*(-len(blob)%4)
    doc['buffers'][0]['byteLength'] = len(blob)
    encoded = json.dumps(doc, separators=(',', ':')).encode()
    encoded += b' '*(-len(encoded)%4)
    chunks = struct.pack('<I4s',len(encoded),b'JSON')+encoded+struct.pack('<I4s',len(blob),b'BIN\0')+blob
    path.write_bytes(struct.pack('<4sII',b'glTF',2,12+len(chunks))+chunks)


if __name__ == '__main__':
    import sys
    for filename in sys.argv[1:]:
        compact_glb(filename)
