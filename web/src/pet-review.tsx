/** Development scene: the pets side by side, in a pose and coat given in the address, for review. */
import * as THREE from 'three';
import { petModel } from './components/patient/pets3d';

if (!import.meta.env.DEV) throw new Error('Development scene only');
const q = new URLSearchParams(window.location.search);
const keys = (q.get('pets') ?? 'whippet,greyhound,iggy').split(',');
const coat = Number(q.get('coat') ?? 0);
const view = q.get('view') ?? 'side';
const speed = Number(q.get('speed') ?? 0);
const sit = q.get('sit') === '1';
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
document.getElementById('root')!.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdcd6c8);
scene.add(new THREE.HemisphereLight(0xfff6ea, 0x8a8f86, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(2, 4, 3);
sun.castShadow = true;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0xbfb6a2 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const models = keys.map((k, i) => {
  const m = petModel(k, coat, { color: q.get('color'), wear: q.get('wear') })!;
  m.group.position.x = (i - (keys.length - 1) / 2) * 1.2;
  m.group.rotation.y = view === 'side' ? Math.PI / 2 : view === 'front' ? 0 : Math.PI / 4;
  scene.add(m.group);
  return m;
});
const camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 0.05, 50);
camera.position.set(0, 0.55, 5.2);
camera.lookAt(0, 0.38, 0);
let t = 0;
const tick = () => {
  t += 1 / 60;
  for (const m of models) m.update(1 / 60, speed, sit);
  renderer.render(scene, camera);
  document.body.dataset.frames = String(Math.round(t * 60));
  requestAnimationFrame(tick);
};
tick();
