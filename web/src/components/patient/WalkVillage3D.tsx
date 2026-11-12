import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, RotateCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import type { FigureLook } from '@/components/hero/HumanFigure';
import { hero3dScene, isToggleNode } from '@/components/hero/hero3d';
import { loadModel } from '@/components/hero/Hero3D';
import { PALETTE, house, mat, rng, tree, webglOk } from './Village3D';
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.touchAction = 'pan-y';
    el.prepend(canvas);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xdfeee6, 24, 46);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    scene.add(new THREE.HemisphereLight(0xfffbe8, 0x6e8f6a, 1.5));
    const sun = new THREE.DirectionalLight(0xfff0d6, 2.4);
    sun.position.set(-9, 16, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, far: 50 });
    scene.add(sun);

    const R = rng(11);
    const B = VILLAGE_LAYOUT.bound;
    const water = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 0.2, 48), mat(PALETTE.water, { roughness: 0.3 }));
    water.position.y = -0.5;
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(B + 1.4, B + 2.2, 0.5, 20), mat(PALETTE.sand));
    sand.position.y = -0.3;
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(B + 0.7, B + 1, 0.4, 20), mat(PALETTE.grass));
    grass.position.y = -0.2;
    grass.receiveShadow = true;
    scene.add(water, sand, grass);

    const obstacles: Obstacle[] = [];
    const anchors: { id: string; obj: THREE.Object3D; y: number }[] = [];
    const spots: { key: string; door: Vec }[] = [];
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

    // The square with the well.
    const square = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.06, 24), mat(PALETTE.path));
    square.position.y = 0.02;
    square.receiveShadow = true;
    const well = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.6, 10), mat(PALETTE.stone));
    well.position.y = 0.3;
    well.castShadow = true;
    const wellWater = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.02, 10), mat(PALETTE.water));
    wellWater.position.y = 0.6;
    scene.add(square, well, wellWater);
    obstacles.push({ x: 0, z: 0, r: 0.95 });

    const stones = (from: Vec, to: Vec) => {
      const n = Math.max(2, Math.round(Math.hypot(to.x - from.x, to.z - from.z) / 0.62));
      for (let i = 1; i < n; i++) {
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.2 + R() * 0.08, 0.24, 0.05, 7), mat(PALETTE.path));
        s.position.set(from.x + ((to.x - from.x) * i) / n + (R() - 0.5) * 0.14, 0.02, from.z + ((to.z - from.z) * i) / n + (R() - 0.5) * 0.14);
        s.receiveShadow = true;
        scene.add(s);
      }
    };

    buildings.forEach((b, i) => {
      const p = slotPosition(i);
      const h = house(PALETTE.roof[b.key] ?? 0x8a6038, b.key === 'hall' ? 2.2 : 2);
      h.position.set(p.x, 0, p.z);
      h.lookAt(0, 0, 0);
      scene.add(h);
      obstacles.push({ x: p.x, z: p.z, r: 1.75 });
      occluder(h, p.x, p.z, 1.9);
      anchors.push({ id: b.key, obj: h, y: 3.5 });
      spots.push({ key: b.key, door: p.door });
      const k = 3 / Math.hypot(p.door.x, p.door.z);
      stones({ x: p.door.x * k, z: p.door.z * k }, p.door);
    });

    const hall = gym(tvTitle, tvLines);
    hall.position.set(GYM.x, 0, GYM.z);
    scene.add(hall);
    [-1.9, 0, 1.9].forEach((dx) => obstacles.push({ x: GYM.x + dx, z: GYM.z - 1.95, r: 1.0 }));
    anchors.push({ id: TV_KEY, obj: hall, y: 3.5 });
    spots.push({ key: TV_KEY, door: TV_SPOT });
    stones({ x: 0, z: -3 }, { x: GYM.x, z: GYM.z + 1.7 });

    // Trees around the edge and between the buildings; each one is something to walk around.
    for (let i = 0, placed = 0; i < 500 && placed < 30; i++) {
      const a = R() * Math.PI * 2;
      const r = 4.2 + R() * (B - 4.4);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 1.5) || spots.some((s) => Math.hypot(x - s.door.x, z - s.door.z) < 2.2)) continue;
      if (Math.abs(x) < 1.6 && z < 0) continue; // keep the path to the gym open
      const tr = tree(1.5 + R() * 0.9, R() > 0.5);
      tr.position.set(x, 0, z);
      tr.rotation.y = R() * Math.PI;
      scene.add(tr);
      obstacles.push({ x, z, r: 0.45 });
      occluder(tr, x, z, 1.0);
      placed++;
    }
    const clouds: THREE.Group[] = [];
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.9 + R() * 0.6, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9 }));
        puff.position.set(k * 1.1, R() * 0.4, R() * 0.6);
        c.add(puff);
      }
      c.userData.angle = (i / 5) * Math.PI * 2 + R();
      c.userData.radius = 20 + R() * 6;
      c.position.y = 13 + R() * 2;
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
      if (ray.ray.intersectPlane(ground, hit)) walkTo.current({ x: hit.x, z: hit.z }, null);
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
      const dt = Math.min(clock.getDelta(), 0.05);
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
      const zoom = narrow ? 1.12 : 1;
      camPos.set(p.x + Math.sin(camAngle.current) * 7.6 * zoom, 6.2 * zoom, p.z + Math.cos(camAngle.current) * 7.6 * zoom);
      if (first || reduce) camera.position.copy(camPos);
      else camera.position.lerp(camPos, Math.min(1, dt * 6));
      first = false;
      camera.lookAt(p.x, 1.1, p.z);

      // A tree or house between the camera and the hero fades, so the hero stays in view.
      const cx = camera.position.x - p.x;
      const cz = camera.position.z - p.z;
      const cl2 = cx * cx + cz * cz || 1;
      for (const o of occluders) {
        const f = ((o.x - p.x) * cx + (o.z - p.z) * cz) / cl2;
        const off = Math.hypot(o.x - (p.x + cx * f), o.z - (p.z + cz * f));
        const want = f > 0.04 && f < 1 && off < o.r ? 0.22 : 1;
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
        const front = place(node, a.obj.position.x, a.y, a.obj.position.z);
        node.style.opacity = front ? '1' : '0';
        node.style.pointerEvents = front ? 'auto' : 'none';
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
