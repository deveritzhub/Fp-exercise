import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { doorstepDecor, villageWell } from './townScenery';
import { mergeStatic } from './mergeStatic';

// Check actual transformed vertices, not a bounding-box corner outside a circular collision zone.
function extent(root:THREE.Object3D){
  root.updateMatrixWorld(true);
  let radius=0,top=0,vertices=0,meshes=0;
  const point=new THREE.Vector3();
  root.traverse(node=>{
    if(!(node instanceof THREE.Mesh))return;
    meshes++;
    const positions=node.geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++){
      point.fromBufferAttribute(positions,i).applyMatrix4(node.matrixWorld);
      if(![point.x,point.y,point.z].every(Number.isFinite))throw Error('Non-finite scenery vertex');
      radius=Math.max(radius,Math.hypot(point.x,point.z));
      top=Math.max(top,point.y);vertices++;
    }
  });
  return {radius,top,vertices,meshes};
}

describe('static town scenery inside existing collision footprints',()=>{
  it('closes the curved masonry at both the stones and their staggered joints',()=>{
    const well=villageWell();
    well.updateMatrixWorld(true);
    const ray=new THREE.Raycaster();
    for(const y of [.15,.335,.52])for(let i=0;i<24;i++){
      const angle=i*Math.PI/12;
      const origin=new THREE.Vector3(Math.cos(angle),y,Math.sin(angle));
      ray.set(origin,new THREE.Vector3(-origin.x,0,-origin.z));
      const first=ray.intersectObject(well,true)[0];
      expect(first,'The outer wall must cover every stone joint').toBeDefined();
      expect(first.distance).toBeLessThan(.38);
    }
  });

  it('keeps all well details inside its existing collision circle, with recessed water',()=>{
    const well=villageWell();
    expect(extent(well).radius).toBeLessThanOrEqual(.95);
    expect(extent(well).top).toBeLessThan(1.5); // existing roof and posts stay in WalkVillage3D
    expect(well.getObjectByName('well-water')!.position.y).toBeLessThan(well.getObjectByName('well-coping')!.position.y);
    expect(well.getObjectByName('well-bucket')).toBeDefined();
    const before=extent(well);
    mergeStatic(well);
    const after=extent(well);
    expect(after.vertices).toBe(before.vertices);
    expect(after.radius).toBeCloseTo(before.radius,5);
    expect(after.meshes).toBeLessThanOrEqual(12);
  });

  it.each([0,1,2,3,4,5,6,7,8])('keeps doorstep variant %i within the old barrel/crate collision radius',seed=>{
    const garden=doorstepDecor(seed);
    const before=extent(garden);
    expect(before.radius).toBeLessThanOrEqual(.6);
    expect(before.top).toBeLessThan(.7);
    expect(before.vertices).toBeLessThan(15000);
    mergeStatic(garden);
    const after=extent(garden);
    expect(after.vertices).toBe(before.vertices);
    expect(after.radius).toBeCloseTo(before.radius,5);
    expect(after.meshes).toBeLessThanOrEqual(8);
  });
});
