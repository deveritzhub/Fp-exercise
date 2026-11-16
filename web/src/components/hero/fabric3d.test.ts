import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { dress } from './fabric3d';

afterEach(() => vi.restoreAllMocks());
describe('fitted clothing materials', () => {
  it('preserves the authored weave, switches to a chosen pattern and restores the weave', () => {
    vi.spyOn(THREE.TextureLoader.prototype,'load').mockImplementation(() => new THREE.Texture());
    const map = new THREE.Texture(), normalMap = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({map,normalMap});
    dress(material,'kit_main','#606852',null);
    expect(material.map).toBe(map);
    expect(material.color.getHexString()).toBe('606852');
    dress(material,'kit_main','#606852','ruit');
    expect(material.map).not.toBe(map);
    expect(material.color.getHexString()).toBe('ffffff');
    dress(material,'kit_main','#29483c',null);
    expect(material.map).toBe(map);
    expect(material.normalMap).toBe(normalMap);
    expect(material.color.getHexString()).toBe('29483c');
  });
});
