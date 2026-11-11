import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateCcw, RotateCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';

/**
 * The village and the rehab path as a small 3D island (three.js, loaded only on the world map).
 * Buildings and zone markers carry real HTML buttons/links that follow them on screen, so the
 * scene works with a keyboard and a screen reader; the canvas itself is decorative.
 */

export type VillageZone = { no: number; status: 'done' | 'current' | 'locked'; name: string };
export type VillageBuilding = { key: string; label: string; to: string };
type Props = { zones: VillageZone[]; heroZoneNo: number | null; buildings: VillageBuilding[]; onZone: (no: number) => void; heroColor?: string; className?: string };

const PALETTE = {
  grass: 0x8fbf6a, grassDark: 0x6e9e52, sand: 0xe6d3a3, water: 0x7cc4d8, path: 0xd9c08f, stone: 0xb8b2a6,
  wall: 0xf3ead8, wood: 0x8a6038, trunk: 0x7a5232, leaf: 0x4f8a4a, leafLight: 0x72a85e,
  roof: { smithy: 0xb5532c, library: 0x2759a0, hall: 0xc9a14a, board: 0x8e3b5f, guild: 0x29483c } as Record<string, number>,
  done: 0x2f8f6a, current: 0xe4bc63, locked: 0x9aa5a0, fog: 0xffffff,
};

const webglOk = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...opts });
}

function house(roofColor: number, scale = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1), mat(PALETTE.wall));
  body.position.y = 0.45;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.75, 4), mat(roofColor));
  roof.position.y = 1.27;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.05, 1, 0.9);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 0.04), mat(PALETTE.wood));
  door.position.set(0, 0.23, 0.51);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.04), mat(0xfff1b8, { emissive: 0xffd36b, emissiveIntensity: 0.5 }));
  win.position.set(0.36, 0.55, 0.51);
  const win2 = win.clone();
  win2.position.x = -0.36;
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 0.16), mat(PALETTE.stone));
  chimney.position.set(0.35, 1.45, -0.15);
  g.add(body, roof, door, win, win2, chimney);
  g.scale.setScalar(scale);
  g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  return g;
}

function tree(size = 1, light = false) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.4, 6), mat(PALETTE.trunk));
  trunk.position.y = 0.2;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.9, 7), mat(light ? PALETTE.leafLight : PALETTE.leaf));
  crown.position.y = 0.8;
  const crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.65, 7), mat(light ? PALETTE.leafLight : PALETTE.leaf));
  crown2.position.y = 1.15;
  g.add(trunk, crown, crown2);
  g.scale.setScalar(size);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

function banner(color: number) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6), mat(PALETTE.wood));
  pole.position.y = 0.65;
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.03), mat(color));
  flag.position.set(0.3, 1.1, 0);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.14, 8), mat(PALETTE.stone));
  base.position.y = 0.07;
  g.add(pole, flag, base);
  g.traverse((o) => { o.castShadow = true; });
  return { group: g, flag };
}

/** Seeded random, so the island looks the same every visit. */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export default function Village3D({ zones, heroZoneNo, buildings, onZone, heroColor = '#e4bc63', className }: Props) {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Map<string, HTMLElement>>(new Map());
  const turnRef = useRef<(deg: number) => void>(() => {});
  const [state, setState] = useState<'ready' | 'nogl'>(() => (webglOk() ? 'ready' : 'nogl'));
  const key = JSON.stringify([zones, heroZoneNo, buildings.map((b) => b.key)]);

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
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.touchAction = 'pan-y';
    el.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xdfeee6, 18, 34);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 11, 15);

    scene.add(new THREE.HemisphereLight(0xfffbe8, 0x6e8f6a, 1.5));
    const sun = new THREE.DirectionalLight(0xfff0d6, 2.4);
    sun.position.set(-6, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
    scene.add(sun);

    const world = new THREE.Group();
    scene.add(world);
    const R = rng(7);

    // Island: water, sand rim, grass top.
    const water = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 0.2, 48), mat(PALETTE.water, { roughness: 0.3, transparent: true, opacity: 0.85 }));
    water.position.y = -0.35;
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 8.9, 0.5, 14), mat(PALETTE.sand));
    sand.position.y = -0.2;
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(7.9, 8.2, 0.4, 14), mat(PALETTE.grass));
    grass.position.y = 0.0;
    grass.receiveShadow = true;
    world.add(water, sand, grass);

    // Village square with the buildings in a ring.
    const square = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.06, 20), mat(PALETTE.path));
    square.position.set(-2.6, 0.22, 1.2);
    square.receiveShadow = true;
    world.add(square);
    const well = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.4, 10), mat(PALETTE.stone));
    well.position.set(-2.6, 0.42, 1.2);
    world.add(well);
    const anchors: { id: string; obj: THREE.Object3D; y: number }[] = [];
    buildings.forEach((b, i) => {
      const a = (i / buildings.length) * Math.PI * 2 + Math.PI * 0.15;
      const h = house(PALETTE.roof[b.key] ?? 0x8a6038, b.key === 'hall' ? 1.15 : 0.95);
      h.position.set(-2.6 + Math.cos(a) * 2.6, 0.2, 1.2 + Math.sin(a) * 2.3);
      h.lookAt(-2.6, 0.2, 1.2);
      world.add(h);
      anchors.push({ id: `b:${b.key}`, obj: h, y: 2.0 });
    });

    // Path from the village to the zones, with stepping stones.
    const pts = zones.map((_, i) => {
      const f = zones.length > 1 ? i / (zones.length - 1) : 0;
      return new THREE.Vector3(0.6 + f * 5.2, 0.22, 1.6 - f * 6.4 + Math.sin(f * Math.PI * 1.5) * 1.6);
    });
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.2, 0.22, 1.4), ...pts]);
    const steps = Math.max(10, zones.length * 8);
    for (let i = 0; i <= steps; i++) {
      const p = curve.getPoint(i / steps);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.18 + R() * 0.06, 0.2, 0.06, 7), mat(PALETTE.path));
      s.position.copy(p);
      s.receiveShadow = true;
      world.add(s);
    }

    // Zone markers: banner per zone, the hero beacon, fog over locked zones.
    const flags: THREE.Mesh[] = [];
    const fogs: THREE.Object3D[] = [];
    let beacon: THREE.Mesh | null = null;
    zones.forEach((z, i) => {
      const color = z.status === 'done' ? PALETTE.done : z.status === 'current' ? PALETTE.current : PALETTE.locked;
      const { group, flag } = banner(color);
      group.position.copy(pts[i]);
      world.add(group);
      flags.push(flag);
      anchors.push({ id: `z:${z.no}`, obj: group, y: 1.7 });
      if (z.status === 'locked') {
        const fog = new THREE.Group();
        for (let k = 0; k < 5; k++) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.45 + R() * 0.3, 10, 8), new THREE.MeshStandardMaterial({ color: PALETTE.fog, transparent: true, opacity: 0.55, roughness: 1 }));
          puff.position.set((R() - 0.5) * 1.6, 0.4 + R() * 0.5, (R() - 0.5) * 1.2);
          fog.add(puff);
        }
        fog.position.copy(pts[i]);
        world.add(fog);
        fogs.push(fog);
      }
      if (z.no === heroZoneNo) {
        beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 3.2, 12, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(heroColor), transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
        beacon.position.copy(pts[i]).add(new THREE.Vector3(0, 1.7, 0));
        world.add(beacon);
      }
    });

    // Trees and rocks, away from the square and the path.
    const near = (x: number, z: number) => Math.hypot(x + 2.6, z - 1.2) < 3.6 || pts.some((p) => Math.hypot(x - p.x, z - p.z) < 1.2) || Math.hypot(x, z) > 7.3;
    for (let i = 0, placed = 0; i < 400 && placed < 34; i++) {
      const a = R() * Math.PI * 2;
      const r = 2 + R() * 5.5;
      const x = Math.cos(a) * r;
      const zz = Math.sin(a) * r;
      if (near(x, zz)) continue;
      const tr = tree(0.7 + R() * 0.6, R() > 0.5);
      tr.position.set(x, 0.2, zz);
      tr.rotation.y = R() * Math.PI;
      world.add(tr);
      placed++;
    }
    for (let i = 0; i < 10; i++) {
      const a = R() * Math.PI * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + R() * 0.25), mat(PALETTE.stone));
      rock.position.set(Math.cos(a) * (7 + R() * 0.8), 0.15, Math.sin(a) * (7 + R() * 0.8));
      world.add(rock);
    }
    // Clouds.
    const clouds: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.6 + R() * 0.4, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92 }));
        puff.position.set(k * 0.7, R() * 0.3, R() * 0.4);
        c.add(puff);
      }
      c.position.set(-9 + i * 5, 6 + R() * 1.5, -6 + R() * 6);
      scene.add(c);
      clouds.push(c);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0.5, 0, -0.8);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = 0.55;
    controls.maxPolarAngle = 1.05;
    controls.enableDamping = true;
    const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotate = !reduce;
    controls.autoRotateSpeed = 0.35;
    controls.addEventListener('start', () => (controls.autoRotate = false));
    controls.update();
    turnRef.current = (deg: number) => {
      controls.autoRotate = false;
      const off = camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg));
      camera.position.copy(controls.target).add(off);
      controls.update();
    };

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.fov = 34;
      // Narrow phones: zoom out so the whole island and its labels fit.
      camera.zoom = w < 420 ? 0.72 : 1;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const v = new THREE.Vector3();
    const placeLabels = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      for (const a of anchors) {
        const node = labels.current.get(a.id);
        if (!node) continue;
        a.obj.getWorldPosition(v);
        v.y += a.y;
        v.project(camera);
        const behind = v.z > 1;
        const half = node.offsetWidth / 2 + 4;
        const x = Math.min(w - half, Math.max(half, ((v.x + 1) / 2) * w));
        const y = Math.min(h - 52, Math.max(node.offsetHeight + 4, ((1 - v.y) / 2) * h));
        node.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
        node.style.opacity = behind ? '0' : '1';
      }
    };

    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const tt = clock.getElapsedTime();
      if (!reduce) {
        flags.forEach((f, i) => (f.rotation.y = Math.sin(tt * 2 + i) * 0.25));
        clouds.forEach((c, i) => (c.position.x = ((c.position.x + 0.004 * (i + 1) + 12) % 24) - 12));
        fogs.forEach((f, i) => (f.position.y = Math.sin(tt * 0.8 + i) * 0.08));
        if (beacon) (beacon.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(tt * 2.2) * 0.12;
        water.position.y = -0.35 + Math.sin(tt * 0.9) * 0.02;
      }
      controls.update();
      renderer.render(scene, camera);
      placeLabels();
    };
    loop();
    el.dataset.state = 'ready';

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, state]);

  if (state === 'nogl') return null;
  const setLabel = (id: string) => (node: HTMLElement | null) => {
    if (node) labels.current.set(id, node);
    else labels.current.delete(id);
  };
  const statusText = (s: VillageZone['status']) => (s === 'done' ? t('achter de rug', 'behind you') : s === 'current' ? t('je staat hier', 'you are here') : t('in de mist', 'in the fog'));
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-[#C9D3BC] bg-[linear-gradient(180deg,#cfe8f0_0%,#e7f2e6_70%)]', className)}>
      <div ref={host} data-testid="village-3d" className="absolute inset-0 cursor-grab active:cursor-grabbing">
        <div className="pointer-events-none absolute inset-0">
          {buildings.map((b) => (
            <Link key={b.key} ref={setLabel(`b:${b.key}`)} to={b.to} className="pointer-events-auto absolute left-0 top-0 inline-flex min-h-[28px] items-center whitespace-nowrap rounded-full border border-white/80 bg-white/95 px-2 py-0.5 text-[12px] font-bold text-ink-900 shadow-card sm:px-2.5 sm:py-1 sm:text-[12.5px] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" style={{ transform: 'translate(-9999px,0)' }}>
              {b.label}
            </Link>
          ))}
          {zones.map((z) => (
            <button key={z.no} ref={setLabel(`z:${z.no}`)} type="button" onClick={() => onZone(z.no)} aria-label={`${z.name || t(`Zone ${z.no}`, `Zone ${z.no}`)}, ${statusText(z.status)}`}
              className={cn('pointer-events-auto absolute left-0 top-0 min-h-[28px] max-w-[140px] truncate rounded-full px-2 py-0.5 text-[12px] sm:px-2.5 sm:py-1 font-bold shadow-card transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                z.status === 'done' ? 'bg-[#1f6a4d] text-white' : z.status === 'current' ? 'bg-[#fbf0d9] text-[#855806] ring-2 ring-[#e4bc63]' : 'bg-white/90 text-ink-700')}
              style={{ transform: 'translate(-9999px,0)' }}>
              {z.no === heroZoneNo ? '★ ' : ''}{z.name || t(`Zone ${z.no}`, `Zone ${z.no}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="absolute bottom-2 right-2 flex gap-1.5">
        <button type="button" onClick={() => turnRef.current(-40)} aria-label={t('Draai naar links', 'Turn left')} className="tap grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-line bg-white/95 text-ink-800"><RotateCcw size={18} aria-hidden /></button>
        <button type="button" onClick={() => turnRef.current(40)} aria-label={t('Draai naar rechts', 'Turn right')} className="tap grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-line bg-white/95 text-ink-800"><RotateCw size={18} aria-hidden /></button>
      </div>
    </div>
  );
}
