/** Development-only original thumbnails, rendered from the exact wearable production meshes. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { DEFAULT_LOOK, GEAR, GEAR_SLOT } from '@shared/hero';
import { loadModel } from './components/hero/Hero3D';
import { hero3dScene, TAILORED_OUTFITS } from './components/hero/hero3d';
import { dress } from './components/hero/fabric3d';
if (!import.meta.env.DEV) throw new Error('Development item render only');
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(256, 256); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .85;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, .04).texture; scene.environmentIntensity = .45;
room.dispose(); pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xfff7e9, 0xa09985, 1.1));
for (const [position, intensity, colour] of [[[-2.5,3.5,3],3.4,0xfff1df],[[3,2,3],.7,0xe8eef5],[[1.5,2.5,-3],1.2,0xe6f0ff]] as const) {
  const light = new THREE.DirectionalLight(colour,intensity); light.position.set(position[0],position[1],position[2]); scene.add(light);
}
const camera = new THREE.OrthographicCamera(-1,1,1,-1,.001,100);
let model: THREE.Object3D | undefined;
let presentation: THREE.Group | undefined;
const paired = new Set(['wristbands','gloves','crew_socks','shin_guards','gold_shoes','balance_shoes','spikes']);
export async function renderItem(key: string) {
  if (!GEAR.some(g => g.key === key)) throw new Error('Unknown shop item');
  if (!model) {
    model = clone((await loadModel(hero3dScene({...DEFAULT_LOOK,frame:'f',build:'average'}).url)).scene);
    model.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(raw => {
        const mat = raw.clone() as THREE.MeshStandardMaterial;
        const base = mat.name.replace(/\.\d+$/,'') as keyof ReturnType<typeof hero3dScene>['tints'];
        dress(mat,base,hero3dScene(DEFAULT_LOOK).tints[base],null); return mat;
      });
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    });
    scene.add(model);
  }
  const root = model.getObjectByName(`${GEAR_SLOT[key] === 'outfit' ? 'outfit' : 'gear'}_${key}`);
  if (!root) throw new Error(`Missing ${key}`);
  const selected = new Set<THREE.Object3D>(); root.traverse(o => selected.add(o));
  if (GEAR_SLOT[key] === 'outfit' && !TAILORED_OUTFITS.has(key)) {
    for (const name of ['body_shirt','body_shorts','body_study_details']) model.getObjectByName(name)?.traverse(o => selected.add(o));
  }
  model.visible = true;
  model.updateMatrixWorld(true);
  if (presentation) {
    scene.remove(presentation);
    presentation.traverse(o=>{if((o as THREE.Mesh).isMesh)(o as THREE.Mesh).geometry.dispose();});
  }
  presentation = new THREE.Group();
  const halves = [new THREE.Box3(),new THREE.Box3()];
  for (const o of selected) {
    const source=o as THREE.Mesh;
    if(!source.isMesh)continue;
    const geometry=source.geometry.clone(), positions:number[]=[], normals:number[]=[];
    const normalMatrix=new THREE.Matrix3().getNormalMatrix(source.matrixWorld);
    for(let i=0;i<geometry.attributes.position.count;i++) {
      const p=source.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(source.matrixWorld);
      positions.push(p.x,p.y,p.z); halves[p.x<0?0:1].expandByPoint(p);
      const n=new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal,i).applyMatrix3(normalMatrix).normalize();
      normals.push(n.x,n.y,n.z);
    }
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geometry.boundingBox=null;geometry.boundingSphere=null;
    presentation.add(new THREE.Mesh(geometry,source.material));
  }
  const physical=new THREE.Box3().setFromObject(presentation).getSize(new THREE.Vector3());
  // Paired gloves/bands are displayed beside one another. Keep their actual geometry/materials,
  // but remove the empty distance between a character's arms, so tiny bands remain recognisable.
  if(paired.has(key)&&halves.every(b=>!b.isEmpty())) {
    const width=Math.max(...halves.map(b=>b.getSize(new THREE.Vector3()).x));
    const centres=halves.map(b=>b.getCenter(new THREE.Vector3()).x);
    presentation.traverse(o=>{
      const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;
      const pos=mesh.geometry.attributes.position;
      for(let i=0;i<pos.count;i++) {
        const x=pos.getX(i),side=x<0?0:1;
        pos.setX(i,x-centres[side]+(side===0?-1:1)*(width*.7+.004));
      }
      pos.needsUpdate=true;mesh.geometry.boundingBox=null;mesh.geometry.boundingSphere=null;
    });
  }
  model.visible = false;
  scene.add(presentation);
  const box = new THREE.Box3().setFromObject(presentation);
  const centre = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x,size.y,size.z,.025)*.72;
  camera.left = camera.bottom = -radius; camera.right = camera.top = radius;
  camera.position.copy(centre).add(new THREE.Vector3(radius*.65,radius*.30,radius*3));
  camera.lookAt(centre); camera.updateProjectionMatrix();
  renderer.render(scene,camera);
  return { key, size:physical.toArray(), meshes:[...selected].filter(o=>(o as THREE.Mesh).isMesh).length };
}

Object.assign(window,{hero3dItemReview:{renderItem}});
