"""Round exported float attributes below visible precision to improve HTTP gzip size.
No compression extensions or extra browser decoders are needed.
"""
import json
import struct
from pathlib import Path


def compact_glb(filename):
    path = Path(filename)
    raw = bytearray(path.read_bytes())
    json_size = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + json_size])
    binary = 20 + json_size + 8
    sizes = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
    seen = set()
    for accessor in doc['accessors']:
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
                    struct.pack_into('<f', raw, offset, round(value, 4))
                    seen.add(offset)
        if 'min' in accessor or 'max' in accessor:
            values = [struct.unpack_from('<' + 'f' * count, raw, start + i * stride) for i in range(accessor['count'])]
            accessor['min'] = [min(v[j] for v in values) for j in range(count)]
            accessor['max'] = [max(v[j] for v in values) for j in range(count)]
    encoded = json.dumps(doc, separators=(',', ':')).encode('utf8')
    encoded += b' ' * (-len(encoded) % 4)
    chunks = struct.pack('<I4s', len(encoded), b'JSON') + encoded + raw[20 + json_size:]
    path.write_bytes(struct.pack('<4sII', b'glTF', 2, 12 + len(chunks)) + chunks)


if __name__ == '__main__':
    import sys
    for filename in sys.argv[1:]:
        compact_glb(filename)
