import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, RotateCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import type { FigureLook } from '@/components/hero/HumanFigure';
import { hero3dScene, isToggleNode } from '@/components/hero/hero3d';
import { loadModel } from '@/components/hero/Hero3D';
import { PALETTE, mat, rng, webglOk } from './Village3D';
import { VILLAGE_LAYOUT, nearestSpot, reachable, slotPosition, stepToward, type Obstacle, type Vec } from './walk';

/**
 * The village as a place to walk around in (three.js). Tap the ground and the hero walks there;
 * drag sideways to turn the view. Every building and the gym TV also has a real HTML button that
 * sends the hero there, so the scene works with a keyboard and a screen reader.
 */

export const TV_KEY = 'tv';
type Props = {
  buildings: { key: string; label: string }[];
  tvLabel: string;
  /** What the TV in the gym shows: a heading and today's exercises. */
  tvTitle: string;
  tvLines: string[];
  look: FigureLook | null;
  heroColor?: string;
  /** XP just earned: the hero jumps and the number floats up. `null` = nothing to celebrate. */
  cheer?: number | null;
  /** Start in front of the TV (coming back from a workout) instead of on the square. */
  startAtTv?: boolean;
  onNear: (key: string | null) => void;
  onArrive: (key: string) => void;
  className?: string;
};

const SPEED = 3.3;
const HERO_HEIGHT = 1.3;
const GYM = VILLAGE_LAYOUT.gym;
const TV_SPOT: Vec = { x: GYM.x, z: GYM.z + 0.7 };


type Road = { a: Vec; b: Vec; w: number };
const HORIZON = 0xcfe3ee;
const GROUND = 150;

const segDist = (x: number, z: number, r: Road) => {
  const dx = r.b.x - r.a.x;
  const dz = r.b.z - r.a.z;
  const t = Math.max(0, Math.min(1, ((x - r.a.x) * dx + (z - r.a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - (r.a.x + dx * t), z - (r.a.z + dz * t));
};

/** The ground picture: meadow with lighter and darker patches, dirt roads and the village square. */
function groundTexture(roads: Road[], R: () => number) {
  const S = 2048;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  const px = (v: number) => (v / GROUND + 0.5) * S;
  const u = S / GROUND;
  if (g) {
    g.fillStyle = '#5f8f3e';
    g.fillRect(0, 0, S, S);
    const greens = ['#6fa046', '#557f37', '#7aa84e', '#4c7632', '#689a42'];
    for (let i = 0; i < 2600; i++) {
      g.globalAlpha = 0.1 + R() * 0.16;
      g.fillStyle = greens[Math.floor(R() * greens.length)];
      g.beginPath();
      g.ellipse(R() * S, R() * S, 8 + R() * 46, 6 + R() * 30, R() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.lineCap = 'round';
    const stroke = (color: string, grow: number, blur: number) => {
      g.strokeStyle = color;
      g.shadowColor = color;
      g.shadowBlur = blur;
      for (const r of roads) {
        g.lineWidth = Math.max(2, (r.w + grow) * u);
        g.beginPath();
        g.moveTo(px(r.a.x), px(r.a.z));
        g.lineTo(px(r.b.x), px(r.b.z));
        g.stroke();
      }
      g.fillStyle = color;
      g.beginPath();
      g.arc(px(0), px(0), (3.2 + grow / 2) * u, 0, Math.PI * 2);
      g.fill();
    };
    stroke('#7d6a45', 0.5, 14);
    stroke('#9a7850', 0, 8);
    stroke('#ab8a5f', -0.7, 10);
    g.shadowBlur = 0;
    // Pebbles and darker tracks on the dirt.
    for (const r of roads.concat([{ a: { x: -2.4, z: 0 }, b: { x: 2.4, z: 0 }, w: 4.6 }])) {
      const len = Math.hypot(r.b.x - r.a.x, r.b.z - r.a.z);
      for (let i = 0; i < len * 26; i++) {
        const t = R();
        const off = (R() - 0.5) * r.w;
        const nx = -(r.b.z - r.a.z) / (len || 1);
        const nz = (r.b.x - r.a.x) / (len || 1);
        g.globalAlpha = 0.18 + R() * 0.3;
        g.fillStyle = R() > 0.5 ? '#6b5236' : '#c4a67c';
        g.beginPath();
        g.arc(px(r.a.x + (r.b.x - r.a.x) * t + nx * off), px(r.a.z + (r.b.z - r.a.z) * t + nz * off), 1 + R() * 2.4, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Timber cottage: stone footing, plastered walls with beams, a pitched roof. The front faces +z. */
function cottage(roofColor: number, scale = 1) {
  const g = new THREE.Group();
  const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  box(2.5, 0.36, 2.1, 0x8d8a82, 0, 0.18, 0);
  box(2.3, 1.5, 1.9, 0xe9dcc0, 0, 1.1, 0);
  for (const [x, z] of [[-1.15, -0.95], [1.15, -0.95], [-1.15, 0.95], [1.15, 0.95]]) box(0.16, 1.5, 0.16, 0x6b4a2b, x, 1.1, z);
  box(2.46, 0.14, 2.06, 0x6b4a2b, 0, 1.85, 0);
  box(2.46, 0.1, 0.1, 0x6b4a2b, 0, 1.1, 0.96);
  const tri = new THREE.Shape();
  tri.moveTo(-1.5, 0);
  tri.lineTo(1.5, 0);
  tri.lineTo(0, 1.2);
  tri.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(tri, { depth: 2.5, bevelEnabled: false });
  roofGeo.translate(0, 0, -1.25);
  const roof = new THREE.Mesh(roofGeo, mat(roofColor));
  roof.position.y = 1.9;
  g.add(roof);
  box(0.52, 0.98, 0.07, 0x4f3520, 0, 0.85, 0.97);
  for (const x of [-0.74, 0.74]) box(0.44, 0.44, 0.07, 0xfff1b8, x, 1.3, 0.97, { emissive: 0xffd36b, emissiveIntensity: 0.55 });
  box(0.32, 1.0, 0.32, 0x8d8a82, 0.75, 2.7, -0.35);
  g.scale.setScalar(scale);
  g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  return g;
}

const LEAVES = [0x3f7d3a, 0x4d8f43, 0x5c9c4c, 0x356e36, 0x6aa350];
/** Round leafy tree, about 3–4 hero heights. */
function leafTree(R: () => number, size = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 1.5, 6), mat(0x5d4027));
  trunk.position.y = 0.75;
  g.add(trunk);
  const n = 4 + Math.floor(R() * 2);
  for (let i = 0; i < n; i++) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62 + R() * 0.3, 1), mat(LEAVES[Math.floor(R() * LEAVES.length)]));
    const a = (i / n) * Math.PI * 2 + R();
    const r = i === 0 ? 0 : 0.5 + R() * 0.25;
    blob.position.set(Math.cos(a) * r, 1.9 + (i === 0 ? 0.55 : R() * 0.5), Math.sin(a) * r);
    blob.scale.y = 0.85;
    g.add(blob);
  }
  g.scale.setScalar(size);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

/** The TV picture: drawn on a canvas, so it always shows today's real exercises. */
function tvTexture(title: string, lines: string[]) {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 360;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#0f211a';
    g.fillRect(0, 0, 640, 360);
    g.fillStyle = '#29483c';
    g.fillRect(0, 0, 640, 96);
    g.fillStyle = '#e4bc63';
    g.fillRect(0, 96, 640, 6);
    g.fillStyle = '#ffffff';
    g.font = '700 58px "Manrope Variable", "Inter Variable", system-ui, sans-serif';
    g.textBaseline = 'middle';
    g.fillText(title, 26, 52, 588);
    const shown = lines.slice(0, lines.length > 4 ? 3 : 4);
    g.font = '600 44px "Inter Variable", system-ui, sans-serif';
    shown.forEach((line, i) => {
      const y = 140 + i * 60;
      g.fillStyle = '#e4bc63';
      g.beginPath();
      g.arc(40, y, 11, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#f3f7f1';
      g.fillText(line, 68, y, 548);
    });
    if (lines.length > shown.length) {
      g.fillStyle = '#b9c8bd';
      g.font = '500 36px "Inter Variable", system-ui, sans-serif';
      g.fillText(`+ ${lines.length - shown.length}`, 68, 140 + shown.length * 60);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Open-air gym: a wooden floor, a wall with the TV, a mat and some weights. */
function gym(title: string, lines: string[]) {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, 3.8), mat(0xc9a877));
  floor.position.set(0, 0.06, -0.2);
  floor.receiveShadow = true;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.7, 0.28), mat(PALETTE.wall));
  wall.position.set(0, 1.35, -1.95);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.18, 0.9), mat(PALETTE.roof.guild));
  cap.position.set(0, 2.78, -1.7);
  cap.rotation.x = 0.18;
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.7, 0.22), mat(PALETTE.wood));
  postL.position.set(-2.6, 1.35, -1.6);
  const postR = postL.clone();
  postR.position.x = 2.6;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.86, 1.68, 0.12), mat(0x1c2420, { roughness: 0.5 }));
  frame.position.set(0, 1.55, -1.76);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.64, 1.485), new THREE.MeshBasicMaterial({ map: tvTexture(title, lines), toneMapped: false }));
  screen.position.set(0, 1.55, -1.69);
  const yoga = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 2.1), mat(0x3f8f7a));
  yoga.position.set(0, 0.14, 0.45);
  yoga.receiveShadow = true;
  const dumbbell = (x: number, z: number) => {
    const d = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 6), mat(0x8c8f8a, { metalness: 0.6, roughness: 0.4 }));
    bar.rotation.z = Math.PI / 2;
    const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 8), mat(0x2b2f2c));
    w1.rotation.z = Math.PI / 2;
    w1.position.x = -0.17;
    const w2 = w1.clone();
    w2.position.x = 0.17;
    d.add(bar, w1, w2);
    d.position.set(x, 0.23, z);
    return d;
  };
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), mat(0xb5532c, { flatShading: false }));
  ball.position.set(2.0, 0.46, -1.0);
  g.add(floor, wall, cap, postL, postR, frame, screen, yoga, dumbbell(-1.7, -0.9), dumbbell(-2.1, -0.5), ball);
  g.traverse((o) => { if (o !== screen && o !== floor && o !== yoga) o.castShadow = true; });
  return g;
}

/** Simple figure shown until the hero model has loaded (or when it cannot load). */
function standIn(color: string) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 10), mat(new THREE.Color(color).getHex(), { flatShading: false }));
  body.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), mat(0xe8c39e, { flatShading: false }));
  head.position.y = 1.1;
  g.add(body, head);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

export default function WalkVillage3D({ buildings, tvLabel, tvTitle, tvLines, look, heroColor = '#e4bc63', cheer = null, startAtTv = false, onNear, onArrive, className }: Props) {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Map<string, HTMLElement>>(new Map());
  const xpLabel = useRef<HTMLDivElement>(null);
  const walkTo = useRef<(p: Vec, key: string | null) => void>(() => {});
  const turn = useRef<(deg: number) => void>(() => {});
  const pos = useRef<Vec>(startAtTv ? { ...TV_SPOT } : { ...VILLAGE_LAYOUT.spawn });
  const facing = useRef(startAtTv ? Math.PI : 0);
  const camAngle = useRef(0);
  const cb = useRef({ onNear, onArrive });
  cb.current = { onNear, onArrive };
  const cheerRef = useRef<{ xp: number; at: number | null } | null>(null);
  const [state, setState] = useState<'ready' | 'nogl'>(() => (webglOk() ? 'ready' : 'nogl'));
  const heroScene = look ? hero3dScene(look) : null;
  const heroKey = heroScene ? JSON.stringify([heroScene.url, [...heroScene.visible].sort(), heroScene.tints, heroScene.width]) : '';
  const key = JSON.stringify([buildings.map((b) => b.key), tvTitle, tvLines, heroColor, heroKey]);

  useEffect(() => {
    if (cheer !== null) cheerRef.current = { xp: cheer, at: null };
  }, [cheer]);

  useEffect(() => {
    const el = host.current;
    if (!el || state === 'nogl') return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch {
      setState('nogl');
      return;
    }
    // Phones render a little below their full sharpness: the meadow costs more than the old island.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, (el.clientWidth || 400) < 520 ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.touchAction = 'pan-y';
    el.prepend(canvas);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(HORIZON, 28, 140);
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 420);
    scene.add(new THREE.HemisphereLight(0xdcecff, 0x5d7a45, 1.2));
    const sun = new THREE.DirectionalLight(0xffe9c4, 3);
    sun.position.set(-14, 20, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar((el.clientWidth || 400) < 520 ? 1024 : 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, far: 70 });
    scene.add(sun);

    const R = rng(11);
    const B = VILLAGE_LAYOUT.bound;
    const phone = (el.clientWidth || 400) < 520;

    // Sky: blue above, hazy at the horizon. It travels with the camera.
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(300, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(0x3f86d4) }, bottom: { value: new THREE.Color(HORIZON) } },
        vertexShader: 'varying float h;\nvoid main() {\n  h = normalize(position).y;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}',
        fragmentShader: 'uniform vec3 top;\nuniform vec3 bottom;\nvarying float h;\nvoid main() {\n  gl_FragColor = vec4(mix(bottom, top, pow(clamp(h, 0.0, 1.0), 0.5)), 1.0);\n  #include <colorspace_fragment>\n}',
      }),
    );
    scene.add(sky);

    const obstacles: Obstacle[] = [];
    const anchors: { id: string; obj: THREE.Object3D; y: number }[] = [];
    const spots: { key: string; door: Vec }[] = [];
    const roads: Road[] = [];
    /** Things that can stand between the camera and the hero; they turn see-through then. */
    const occluders: { obj: THREE.Object3D; x: number; z: number; r: number; mats: THREE.Material[]; a: number }[] = [];
    const occluder = (obj: THREE.Object3D, x: number, z: number, r: number) => {
      const mats: THREE.Material[] = [];
      obj.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          (m.material as THREE.Material).transparent = true;
          mats.push(m.material as THREE.Material);
        }
      });
      occluders.push({ obj, x, z, r, mats, a: 1 });
    };

    // The village is flat; around it the land rolls up into hills, with a valley for the road south.
    const hillAt = (x: number, z: number) => {
      const k = THREE.MathUtils.smoothstep(Math.hypot(x, z), B + 2.5, B + 22);
      const valley = z > 0 ? THREE.MathUtils.smoothstep(Math.abs(x), 1.6, 11) : 1;
      return k * valley * (1.6 + 3.4 * (0.5 + 0.5 * Math.sin(x * 0.13 + 1.7) * Math.cos(z * 0.11 + 0.4)) + 1.1 * Math.sin(x * 0.31 + z * 0.27));
    };

    // Well on the square.
    const well = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.6, 10), mat(0x8d8a82));
    well.position.y = 0.3;
    well.castShadow = true;
    const wellWater = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.02, 10), mat(PALETTE.water, { roughness: 0.2 }));
    wellWater.position.y = 0.6;
    scene.add(well, wellWater);
    obstacles.push({ x: 0, z: 0, r: 0.95 });

    buildings.forEach((b, i) => {
      const p = slotPosition(i);
      const h = cottage(PALETTE.roof[b.key] ?? 0x8a6038, b.key === 'hall' ? 1.12 : 1);
      h.position.set(p.x, 0, p.z);
      h.lookAt(0, 0, 0);
      scene.add(h);
      obstacles.push({ x: p.x, z: p.z, r: 1.9 });
      occluder(h, p.x, p.z, 2.1);
      anchors.push({ id: b.key, obj: h, y: 3.9 });
      spots.push({ key: b.key, door: p.door });
      const k = 2.6 / Math.hypot(p.door.x, p.door.z);
      roads.push({ a: { x: p.door.x * k, z: p.door.z * k }, b: p.door, w: 1.3 });
    });

    const hall = gym(tvTitle, tvLines);
    hall.position.set(GYM.x, 0, GYM.z);
    scene.add(hall);
    [-1.9, 0, 1.9].forEach((dx) => obstacles.push({ x: GYM.x + dx, z: GYM.z - 1.95, r: 1.0 }));
    occluder(hall, GYM.x, GYM.z - 1.6, 2.9);
    anchors.push({ id: TV_KEY, obj: hall, y: 3.5 });
    spots.push({ key: TV_KEY, door: TV_SPOT });
    roads.push({ a: { x: 0, z: -2.6 }, b: { x: GYM.x, z: GYM.z + 1.9 }, w: 1.6 });
    roads.push({ a: { x: 0, z: 2.6 }, b: { x: 0, z: GROUND / 2 }, w: 2.3 });

    const groundGeo = new THREE.PlaneGeometry(GROUND, GROUND, 110, 110);
    groundGeo.rotateX(-Math.PI / 2);
    const gp = groundGeo.attributes.position;
    for (let i = 0; i < gp.count; i++) gp.setY(i, hillAt(gp.getX(i), gp.getZ(i)));
    groundGeo.computeVertexNormals();
    const ground3d = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: groundTexture(roads, R), roughness: 1 }));
    ground3d.receiveShadow = true;
    scene.add(ground3d);

    const onDirt = (x: number, z: number) =>
      Math.hypot(x, z) < 3.5 || roads.some((r) => segDist(x, z, r) < r.w / 2 + 0.3) || (Math.abs(x - GYM.x) < 3.1 && z > GYM.z - 2.6 && z < GYM.z + 1.9);

    // Trees in the village: each one is something to walk around.
    for (let i = 0, placed = 0; i < 600 && placed < 22; i++) {
      const a = R() * Math.PI * 2;
      const r = 4.4 + R() * (B - 4.2);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (onDirt(x, z) || obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 1.7) || spots.some((s) => Math.hypot(x - s.door.x, z - s.door.z) < 2.4)) continue;
      const tr = leafTree(R, 0.95 + R() * 0.5);
      tr.position.set(x, 0, z);
      tr.rotation.y = R() * Math.PI;
      scene.add(tr);
      obstacles.push({ x, z, r: 0.5 });
      occluder(tr, x, z, 1.3);
      placed++;
    }

    // Woods on the hills: two instanced meshes for all of them.
    const far = phone ? 110 : 190;
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 1.6, 5), mat(0x5d4027), far);
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat(0xffffff), far * 3);
    const M = new THREE.Matrix4();
    const Q = new THREE.Quaternion();
    const col = new THREE.Color();
    for (let i = 0, n = 0; i < 4000 && n < far; i++) {
      const a = R() * Math.PI * 2;
      const r = B + 3 + R() * 52;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (roads.some((rd) => segDist(x, z, rd) < 3.2)) continue;
      const y = hillAt(x, z);
      const sc = 1 + R() * 0.9;
      trunks.setMatrixAt(n, M.compose(new THREE.Vector3(x, y + 0.8 * sc, z), Q, new THREE.Vector3(sc, sc, sc)));
      for (let k = 0; k < 3; k++) {
        const br = (0.75 + R() * 0.35) * sc;
        crowns.setMatrixAt(n * 3 + k, M.compose(new THREE.Vector3(x + (k - 1) * 0.55 * sc * (R() + 0.4), y + (2.1 + (k === 1 ? 0.6 : R() * 0.4)) * sc, z + (R() - 0.5) * 0.9 * sc), Q, new THREE.Vector3(br, br * 0.85, br)));
        crowns.setColorAt(n * 3 + k, col.setHex(LEAVES[Math.floor(R() * LEAVES.length)]));
      }
      n++;
      trunks.count = n;
      crowns.count = n * 3;
    }
    trunks.castShadow = true;
    crowns.castShadow = true;
    scene.add(trunks, crowns);

    // Blue mountains on the horizon.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + R() * 0.3;
      const d = 135 + R() * 45;
      const hgt = 34 + R() * 34;
      const m = new THREE.Mesh(new THREE.ConeGeometry(34 + R() * 24, hgt, 6), new THREE.MeshLambertMaterial({ color: i % 3 ? 0x6f8fa8 : 0x86a1b6, flatShading: true }));
      m.position.set(Math.cos(a) * d, hgt / 2 - 3, Math.sin(a) * d);
      m.rotation.y = R() * Math.PI;
      scene.add(m);
    }

    // Grass: thousands of blades in one draw call, moving in the wind.
    const bladeGeo = new THREE.PlaneGeometry(0.1, 1, 1, 3);
    bladeGeo.translate(0, 0.5, 0);
    const bp = bladeGeo.attributes.position;
    const shade: number[] = [];
    for (let i = 0; i < bp.count; i++) {
      const y = bp.getY(i);
      bp.setX(i, bp.getX(i) * (1 - y * 0.85));
      shade.push(0.62 + y * 0.38, 0.62 + y * 0.38, 0.62 + y * 0.38);
    }
    bladeGeo.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
    bladeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(bp.count).fill([0, 1, 0]).flat(), 3));
    const wind = { value: 0 };
    const bladeMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, vertexColors: true });
    bladeMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = wind;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n#ifdef USE_INSTANCING\n  vec4 root = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);\n  transformed.x += sin(uTime * 1.6 + root.x * 0.8 + root.z * 0.6) * 0.32 * position.y * position.y;\n#endif',
      );
    };
    const blades = phone ? 14000 : 30000;
    const grass = new THREE.InstancedMesh(bladeGeo, bladeMat, blades);
    const greens = [0x6fae3f, 0x5c9a36, 0x86bd4c, 0x4f8a30, 0x9cc75a];
    const E = new THREE.Euler();
    let made = 0;
    for (let i = 0; i < blades * 3 && made < blades; i++) {
      const a = R() * Math.PI * 2;
      const r = Math.sqrt(R()) * 26;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (onDirt(x, z) || obstacles.some((o) => o.r > 0.9 && Math.hypot(x - o.x, z - o.z) < o.r - 0.3)) continue;
      const hgt = 0.16 + R() * 0.26;
      grass.setMatrixAt(made, M.compose(new THREE.Vector3(x, hillAt(x, z), z), Q.setFromEuler(E.set((R() - 0.5) * 0.4, R() * Math.PI, 0)), new THREE.Vector3(1 + R(), hgt, 1)));
      grass.setColorAt(made, col.setHex(greens[Math.floor(R() * greens.length)]));
      made++;
    }
    grass.count = made;
    grass.receiveShadow = true;
    scene.add(grass);

    const clouds: THREE.Group[] = [];
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 5; k++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(3 + R() * 2.4, 10, 8), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false }));
        puff.position.set(k * 3.6, R() * 1.4, R() * 2);
        puff.scale.y = 0.55;
        c.add(puff);
      }
      c.userData.angle = (i / 6) * Math.PI * 2 + R();
      c.userData.radius = 70 + R() * 50;
      c.position.y = 38 + R() * 14;
      scene.add(c);
      clouds.push(c);
    }

    // The hero: a stand-in at once, the real model with the worn gear when it has loaded.
    const hero = new THREE.Group();
    const figure = new THREE.Group();
    figure.add(standIn(heroColor));
    hero.add(figure);
    const shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.03;
    hero.add(shadowDisc);
    scene.add(hero);
    let cancelled = false;
    if (heroScene) {
      loadModel(heroScene.url)
        .then((gltf) => {
          if (cancelled) return;
          const model = gltf.scene.clone(true);
          model.traverse((o) => {
            if (isToggleNode(o.name)) o.visible = heroScene.visible.has(o.name);
            const m = o as THREE.Mesh;
            if (m.isMesh) {
              const mm = (m.material as THREE.MeshStandardMaterial).clone();
              const tint = heroScene.tints[mm.name.replace(/\.\d+$/, '') as keyof typeof heroScene.tints];
              if (tint) mm.color.set(tint);
              m.material = mm;
              m.castShadow = true;
            }
          });
          model.scale.set(heroScene.width, 1, (1 + heroScene.width) / 2);
          const box = new THREE.Box3().setFromObject(model.getObjectByName('body') ?? model);
          const k = HERO_HEIGHT / Math.max(0.5, box.max.y - box.min.y);
          const holder = new THREE.Group();
          holder.add(model);
          holder.scale.setScalar(k);
          holder.position.y = -box.min.y * k;
          figure.clear();
          figure.add(holder);
          el.dataset.hero = 'model';
        })
        .catch(() => { /* the stand-in stays */ });
    }

    // Where the hero is going: a ring on the ground.
    const marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(heroColor), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.06;
    scene.add(marker);

    let goal: { target: Vec; key: string | null } | null = null;
    let stuck = 0;
    walkTo.current = (p, k) => {
      goal = { target: reachable(p, obstacles, B), key: k };
      stuck = 0;
      marker.position.set(goal.target.x, 0.06, goal.target.z);
      (marker.material as THREE.MeshBasicMaterial).opacity = k ? 0 : 0.9;
      el.dataset.walking = '1';
    };
    turn.current = (deg) => { camAngle.current += THREE.MathUtils.degToRad(deg); };

    // Tap = walk there; sideways drag = turn the view.
    const ray = new THREE.Raycaster();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const limit = new THREE.Vector3();
    let down: { x: number; y: number; moved: boolean } | null = null;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, moved: false }; };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 9) down.moved = true;
      if (down.moved) camAngle.current -= e.movementX * 0.008;
    };
    const onUp = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (!d || d.moved) return;
      const rect = canvas.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
      const hit = new THREE.Vector3();
      // A tap on the sky or far hills: walk in that direction, as far as the village goes.
      if (!ray.ray.intersectPlane(ground, hit)) hit.copy(limit.copy(ray.ray.direction).setY(0).normalize().multiplyScalar(B * 2).add(camera.position)).setY(0);
      walkTo.current({ x: hit.x, z: hit.z }, null);
    };
    const onCancel = () => { down = null; };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', onCancel);

    let narrow = false;
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      camera.aspect = w / h;
      narrow = w < 520;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const v = new THREE.Vector3();
    const place = (node: HTMLElement, x: number, y: number, z: number, lift = 0) => {
      v.set(x, y, z).project(camera);
      const w = el.clientWidth;
      const h = el.clientHeight;
      const half = node.offsetWidth / 2 + 4;
      const px = Math.min(w - half, Math.max(half, ((v.x + 1) / 2) * w));
      const py = Math.min(h - 8, Math.max(node.offsetHeight + 4, ((1 - v.y) / 2) * h)) - lift;
      node.style.transform = `translate(-50%, -100%) translate(${px}px, ${py}px)`;
      return v.z <= 1;
    };

    const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const camPos = new THREE.Vector3();
    let first = true;
    let near: string | null = null;
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const clock = new THREE.Clock();
    let tt = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.1);
      if (!visible || document.hidden) return;
      tt += dt;
      const p = pos.current;

      let walking = false;
      if (goal) {
        const n = stepToward(p, goal.target, SPEED * dt, obstacles, B);
        const moved = Math.hypot(n.x - p.x, n.z - p.z);
        if (moved > 1e-4) facing.current = Math.atan2(n.x - p.x, n.z - p.z);
        stuck = moved < SPEED * dt * 0.2 ? stuck + 1 : 0;
        p.x = n.x;
        p.z = n.z;
        walking = true;
        if (n.arrived || stuck > 40) {
          const k = goal.key;
          goal = null;
          walking = false;
          delete el.dataset.walking;
          (marker.material as THREE.MeshBasicMaterial).opacity = 0;
          if (k === TV_KEY) facing.current = Math.PI;
          if (k && n.arrived) cb.current.onArrive(k);
        }
      }
      hero.position.set(p.x, 0, p.z);
      // Turn the short way round toward where the hero walks.
      const diff = Math.atan2(Math.sin(facing.current - hero.rotation.y), Math.cos(facing.current - hero.rotation.y));
      hero.rotation.y += diff * Math.min(1, dt * 12);

      // The celebration starts once the hero is on screen, so the jump and the XP are not missed.
      const c = cheerRef.current;
      if (c && c.at === null && (!heroScene || el.dataset.hero === 'model' || tt > 4)) c.at = performance.now();
      const since = c && c.at !== null ? (performance.now() - c.at) / 1000 : 99;
      const jump = since < 1.8 && !reduce ? Math.abs(Math.sin(since * 7)) * 0.38 * (1 - since / 1.8) : 0;
      figure.position.y = jump + (walking && !reduce ? Math.abs(Math.sin(tt * 11)) * 0.07 : 0);
      figure.rotation.z = walking && !reduce ? Math.sin(tt * 11) * 0.05 : 0;
      if ((marker.material as THREE.MeshBasicMaterial).opacity > 0) marker.scale.setScalar(1 + Math.sin(tt * 6) * 0.12);

      // The camera follows from behind and above.
      const zoom = narrow ? 1.08 : 1;
      camPos.set(p.x + Math.sin(camAngle.current) * 6.6 * zoom, 3.5 * zoom, p.z + Math.cos(camAngle.current) * 6.6 * zoom);
      if (first || reduce) camera.position.copy(camPos);
      else camera.position.lerp(camPos, Math.min(1, dt * 6));
      first = false;
      camera.lookAt(p.x, 1.5, p.z);
      sky.position.copy(camera.position);
      if (!reduce) wind.value = tt;

      // A tree or house between the camera and the hero fades, so the hero stays in view.
      const cx = camera.position.x - p.x;
      const cz = camera.position.z - p.z;
      const cl2 = cx * cx + cz * cz || 1;
      for (const o of occluders) {
        const f = ((o.x - p.x) * cx + (o.z - p.z) * cz) / cl2;
        const off = Math.hypot(o.x - (p.x + cx * f), o.z - (p.z + cz * f));
        // Also anything right next to the camera: with the camera this low it would fill the view.
        const want = (f > 0.04 && f < 1 && off < o.r) || Math.hypot(o.x - camera.position.x, o.z - camera.position.z) < o.r + 3.2 ? 0.16 : 1;
        if (Math.abs(o.a - want) < 0.01) continue;
        o.a = reduce ? want : o.a + (want - o.a) * Math.min(1, dt * 8);
        for (const m of o.mats) {
          m.opacity = o.a;
          m.depthWrite = o.a > 0.9;
        }
      }

      if (!reduce) {
        clouds.forEach((cl, i) => {
          const a = cl.userData.angle + tt * 0.008 * (1 + i * 0.2);
          cl.position.x = Math.cos(a) * cl.userData.radius;
          cl.position.z = Math.sin(a) * cl.userData.radius;
        });
      }
      renderer.render(scene, camera);

      for (const a of anchors) {
        const node = labels.current.get(a.id);
        if (!node) continue;
        // A name shows when its building is in view and not too far off; the button itself stays reachable by keyboard.
        const inFront = place(node, a.obj.position.x, a.y, a.obj.position.z);
        const show = inFront && Math.abs(v.x) < 1.05 && v.y < 1.1 && Math.hypot(a.obj.position.x - p.x, a.obj.position.z - p.z) < 19;
        node.style.opacity = show ? '1' : '0';
        node.style.pointerEvents = show ? 'auto' : 'none';
      }
      const xp = xpLabel.current;
      if (xp) {
        if (c && c.xp > 0 && since < 3.2) {
          xp.textContent = `+${c.xp} XP`;
          place(xp, p.x, HERO_HEIGHT + 0.5, p.z, since * 26);
          xp.style.opacity = String(Math.max(0, Math.min(1, 3.2 - since)));
        } else xp.style.opacity = '0';
      }

      const spot = nearestSpot(p, spots, 1.6)?.key ?? null;
      if (spot !== near) {
        near = spot;
        if (spot) el.dataset.near = spot;
        else delete el.dataset.near;
        cb.current.onNear(spot);
      }
    };
    loop();
    el.dataset.state = 'ready';

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onCancel);
      walkTo.current = () => {};
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => {
            (x as THREE.MeshBasicMaterial).map?.dispose();
            x.dispose();
          });
        }
      });
      renderer.dispose();
      canvas.remove();
      delete el.dataset.state;
      delete el.dataset.hero;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, state]);

  if (state === 'nogl') return null;
  const setLabel = (id: string) => (node: HTMLElement | null) => {
    if (node) labels.current.set(id, node);
    else labels.current.delete(id);
  };
  const go = (k: string, i: number) => walkTo.current(k === TV_KEY ? TV_SPOT : slotPosition(i).door, k);
  const pill = 'absolute left-0 top-0 inline-flex min-h-[32px] items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[12.5px] font-bold shadow-card transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-[#C9D3BC] bg-[linear-gradient(180deg,#cfe8f0_0%,#e7f2e6_70%)]', className)}>
      <div ref={host} data-testid="walk-village" className="absolute inset-0 cursor-pointer">
        <div className="pointer-events-none absolute inset-0">
          {buildings.map((b, i) => (
            <button key={b.key} ref={setLabel(b.key)} type="button" data-spot={b.key} onClick={() => go(b.key, i)} aria-label={t(`Loop naar ${b.label}`, `Walk to ${b.label}`)}
              className={cn(pill, 'border-white/80 bg-white/95 text-ink-900')} style={{ transform: 'translate(-9999px,0)' }}>
              {b.label}
            </button>
          ))}
          <button ref={setLabel(TV_KEY)} type="button" data-spot={TV_KEY} onClick={() => go(TV_KEY, 0)} aria-label={t(`Loop naar ${tvLabel}`, `Walk to ${tvLabel}`)}
            className={cn(pill, 'border-[#e4bc63] bg-[#fbf0d9] text-[#855806]')} style={{ transform: 'translate(-9999px,0)' }}>
            {tvLabel}
          </button>
          <div ref={xpLabel} aria-hidden className="absolute left-0 top-0 whitespace-nowrap rounded-full bg-[#29483c] px-3 py-1 text-[17px] font-extrabold text-[#f6e2a6] shadow-lift" style={{ opacity: 0, transform: 'translate(-9999px,0)' }} />
        </div>
      </div>
      <div className="absolute bottom-2 right-2 flex gap-1.5">
        <button type="button" onClick={() => turn.current(-45)} aria-label={t('Draai naar links', 'Turn left')} className="tap grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-line bg-white/95 text-ink-800"><RotateCcw size={18} aria-hidden /></button>
        <button type="button" onClick={() => turn.current(45)} aria-label={t('Draai naar rechts', 'Turn right')} className="tap grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-line bg-white/95 text-ink-800"><RotateCw size={18} aria-hidden /></button>
      </div>
    </div>
  );
}
