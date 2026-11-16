import * as THREE from 'three';

type Textures = { wood?: THREE.Texture | null; stone?: THREE.Texture | null };
const STONE=[0xa39d8f,0xb5ad9b,0x938d80];
const material=(color:number,extra:THREE.MeshStandardMaterialParameters={})=>
  new THREE.MeshStandardMaterial({color,roughness:.87,...extra});

function put(parent:THREE.Group,name:string,geometry:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number){
  const mesh=new THREE.Mesh(geometry,mat);
  mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
  parent.add(mesh);return mesh;
}

function rimGeometry(outer:number,inner:number,depth:number){
  const shape=new THREE.Shape();
  shape.absarc(0,0,outer,0,Math.PI*2,false);
  const hole=new THREE.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
  const geo=new THREE.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:24,bevelEnabled:true,bevelSegments:1,bevelSize:.005,bevelThickness:.005});
  return geo.rotateX(-Math.PI/2);
}

/** A radial stone closes the outer wall too; rectangular blocks leave wide triangular gaps. */
function wellStoneGeometry(){
  const half=Math.PI/12-.009;
  const shape=new THREE.Shape();
  shape.absarc(0,0,.645,-half,half,false);
  shape.lineTo(Math.cos(half)*.445,Math.sin(half)*.445);
  shape.absarc(0,0,.445,half,-half,true);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape,{depth:.18,steps:1,curveSegments:3,
    bevelEnabled:true,bevelSegments:1,bevelSize:.003,bevelThickness:.003}).rotateX(-Math.PI/2);
}

/** Stonework, an inset pool, windlass and bucket beneath the existing square's roof.
 * Everything stays within the existing 0.95 m collision circle. Static: also for reduced motion.
 */
export function villageWell(textures:Textures={}){
  const group=new THREE.Group();group.name='village-well';group.userData.mergeRoot=true;
  const stone=STONE.map(c=>material(c,{map:textures.stone??null}));
  const wood=material(0x785337,{map:textures.wood??null});
  const iron=material(0x343e3a,{metalness:.42,roughness:.65});
  const rope=material(0xb5a17a);
  put(group,'well-plinth',new THREE.CylinderGeometry(.84,.90,.055,32),stone[2],0,.025,0);
  // Recessed mortar seals the narrow joints without hiding the hollow centre.
  put(group,'well-mortar',rimGeometry(.632,.447,.54),material(0x747469),0,.065,0);
  const block=wellStoneGeometry();
  for(let row=0;row<3;row++)for(let i=0;i<12;i++){
    const angle=(i+(row%2)*.5)*Math.PI*2/12;
    const brick=put(group,'well-stone',block,stone[(i+row*2)%stone.length],0,.06+row*.185,0);
    brick.rotation.y=angle;
  }
  put(group,'well-inner-wall',new THREE.CylinderGeometry(.445,.445,.47,32,1,true),material(0x696e62,{side:THREE.DoubleSide}),0,.30,0);
  put(group,'well-coping',rimGeometry(.68,.445,.065),stone[1],0,.59,0);
  const water=put(group,'well-water',new THREE.CircleGeometry(.441,40),material(0x367c7b,{roughness:.22,metalness:.12}),0,.385,0);
  water.rotation.x=-Math.PI/2;water.castShadow=false;
  const glint=material(0xb6dad0,{transparent:true,opacity:.28,depthWrite:false});
  for(const r of [.15,.29]){
    const ripple=put(group,'well-water-ring',new THREE.RingGeometry(r,r+.003,40),glint,.015,.387,-.02);
    ripple.rotation.x=-Math.PI/2;ripple.castShadow=false;
  }
  const axle=put(group,'well-windlass',new THREE.CylinderGeometry(.047,.047,1.18,12),wood,0,1.34,0);
  axle.rotation.z=Math.PI/2;
  for(const x of [-.49,.49]){
    const collar=put(group,'well-axle-collar',new THREE.TorusGeometry(.052,.009,6,16),iron,x,1.34,0);collar.rotation.y=Math.PI/2;
  }
  for(const x of [-.02,0,.02]){
    const turn=put(group,'well-rope-coil',new THREE.TorusGeometry(.052,.009,6,16),rope,x,1.34,0);turn.rotation.y=Math.PI/2;
  }
  // The rope ends at the top of the handle, rather than passing through the bucket.
  put(group,'well-rope',new THREE.CylinderGeometry(.007,.007,.195,6),rope,0,1.1875,.05);
  put(group,'well-bucket',new THREE.CylinderGeometry(.11,.085,.18,12,1,true),wood,0,.90,.05);
  const bottom=put(group,'well-bucket-bottom',new THREE.CircleGeometry(.085,12),wood,0,.812,.05);bottom.rotation.x=-Math.PI/2;
  for(const y of [.825,.965]){
    const band=put(group,'well-bucket-band',new THREE.TorusGeometry(y<.9?.09:.108,.007,5,12),iron,0,y,.05);band.rotation.x=Math.PI/2;
  }
  put(group,'well-bucket-handle',new THREE.TorusGeometry(.105,.007,6,16,Math.PI),iron,0,.985,.05);
  const crank=put(group,'well-crank',new THREE.TorusGeometry(.11,.012,6,18),iron,.63,1.34,0);crank.rotation.y=Math.PI/2;
  const grip=put(group,'well-crank-grip',new THREE.CylinderGeometry(.022,.022,.12,8),wood,.69,1.23,0);grip.rotation.z=Math.PI/2;
  return group;
}

/** Flowers, herbs and small benches replacing the existing crate/barrel footprints.
 * The caller retains exactly the old road checks and collision circles, then batches these
 * static pieces with the town's other props. No extra lights, textures, events or frame loop.
 */
export function doorstepDecor(seed:number,textures:Textures={}){
  const group=new THREE.Group();group.name='doorstep-garden';
  const wood=material(0x785337,{map:textures.wood??null}),iron=material(0x3f4940,{metalness:.25});
  const soil=material(0x4b3d2c),leaf=material(0x506e48);
  const petals=[material(0xe5dec2),material(0xa18aad),material(0xc9ac64)];
  const stemGeo=new THREE.CylinderGeometry(.004,.005,.14,5);
  const leafGeo=new THREE.SphereGeometry(.035,6,4);
  const petalGeo=new THREE.SphereGeometry(.022,6,4);
  function pot(x:number,z:number,r:number,kind:number){
    const barrel=put(group,'garden-barrel',new THREE.CylinderGeometry(r*.92,r*.82,.31,12,1,true),wood,x,.17,z);
    for(const y of [.055,.29]){
      const band=put(group,'garden-barrel-band',new THREE.TorusGeometry(r*.90,.009,5,12),iron,x,y,z);band.rotation.x=Math.PI/2;
    }
    const dirt=put(group,'garden-soil',new THREE.CircleGeometry(r*.88,12),soil,x,.317,z);dirt.rotation.x=-Math.PI/2;
    for(let i=0;i<7;i++){
      const angle=(i*2.399963)+(seed%7)*.2;
      const distance=r*(i===0?0:.52);
      const px=x+Math.cos(angle)*distance,pz=z+Math.sin(angle)*distance;
      const high=.39+(i%3)*.025;
      put(group,'garden-stem',stemGeo,leaf,px,high-.025,pz);
      const foliage=put(group,'garden-leaf',leafGeo,leaf,px+.018,high-.02,pz);foliage.scale.set(1,.3,.55);foliage.rotation.z=.3;
      for(let j=0;j<5;j++){
        const a=j*Math.PI*2/5;
        const p=put(group,'garden-petal',petalGeo,petals[kind%petals.length],px+Math.cos(a)*.022,high+.045,pz+Math.sin(a)*.022);p.scale.y=.35;
      }
      const centre=put(group,'garden-centre',petalGeo,petals[2],px,high+.049,pz);centre.scale.set(.45,.3,.45);
    }
    return barrel;
  }
  if(seed%3===0){
    // Bench and one pot together fit in the same old radius of 0.6 m.
    const cx=-.18;
    for(const z of [-.09,0,.09])put(group,'garden-bench-seat',new THREE.BoxGeometry(.61,.035,.074),wood,cx,.30,z);
    for(const x of [cx-.24,cx+.24]){
      put(group,'garden-bench-leg',new THREE.BoxGeometry(.045,.30,.25),iron,x,.15,0);
      put(group,'garden-bench-back-post',new THREE.BoxGeometry(.04,.30,.04),iron,x,.44,-.12);
    }
    for(const y of [.43,.53])put(group,'garden-bench-back',new THREE.BoxGeometry(.61,.065,.027),wood,cx,y,-.12);
    pot(.34,.04,.16,seed);
  }else{
    pot(-.20,0,.24,seed);
    pot(.28,.06,.16,seed+1);
  }
  return group;
}
