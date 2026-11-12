import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Minus, Plus, RotateCcw, RotateCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { PALETTE, mat, rng, webglOk } from '@/components/patient/Village3D';
import { leafTree } from '@/components/patient/WalkVillage3D';
import { practiceBuilding } from '@/components/patient/practice3d';
import { HOME_STAGES, homeStage, plotPosition, type VillageHome } from '@shared/practiceVillage';
import { DWELLING_TOP, dwelling } from './dwellings3d';

/**
 * The practice village for staff: the practice in the middle and one home per patient around it,
 * from a camp to a villa by the hero's level. Homes carry a number, never a name. Turn it by dragging
 * or with the buttons; every home is also a real button, so it works with a keyboard.
 */
type Props = { homes: VillageHome[]; practiceName: string; selected: string | null; onPick: (id: string) => void; className?: string };

export default function PracticeVillage3D({ homes, practiceName, selected, onPick, className }: Props) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Map<string, HTMLElement>>(new Map());
  const turn = useRef<(deg: number) => void>(() => {});
  const zoom = useRef<(f: number) => void>(() => {});
  const pick = useRef<string | null>(selected);
  pick.current = selected;
  const [state, setState] = useState<'ready' | 'nogl'>(() => (webglOk() ? 'ready' : 'nogl'));
  const key = JSON.stringify([homes.map((h) => [h.id, homeStage(h.level), h.week > 0]), practiceName]);

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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.touchAction = 'pan-y';
    el.prepend(canvas);

    const plots = homes.map((_, i) => plotPosition(i));
    const reach = Math.max(14, ...plots.map((p) => Math.hypot(p.x, p.z) + 5));
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xe9ddc4, reach * 1.6, reach * 5);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, reach * 12);
    camera.position.set(0, reach * 0.95, reach * 1.7);
    scene.add(new THREE.HemisphereLight(0xd6e6ff, 0x7d8c46, 1.5));
    const sun = new THREE.DirectionalLight(0xffdca8, 3);
    sun.position.set(-reach * 0.6, reach * 0.9, reach * 0.5);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    sun.shadow.normalBias = 0.04;
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, far: reach * 4 });
    scene.add(sun);

    const R = rng(23);
    const land = new THREE.Mesh(new THREE.CylinderGeometry(reach + 3, reach + 4, 0.6, 40), mat(0x6fa046, { flatShading: false }));
    land.position.y = -0.3;
    land.receiveShadow = true;
    const water = new THREE.Mesh(new THREE.CylinderGeometry(reach * 6, reach * 6, 0.1, 40), mat(PALETTE.water, { roughness: 0.3, flatShading: false }));
    water.position.y = -0.55;
    const square = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.05, 28), mat(0xb4915f, { flatShading: false }));
    square.position.y = 0.02;
    square.receiveShadow = true;
    scene.add(water, land, square);
    // A ring road in front of each ring of homes, and the road in from the south.
    const rings = new Set(plots.map((p) => Math.round(Math.hypot(p.x, p.z) * 10) / 10));
    for (const r of rings) {
      const road = new THREE.Mesh(new THREE.RingGeometry(r - 5.2, r - 4.0, 64), mat(0xb4915f, { flatShading: false }));
      road.rotation.x = -Math.PI / 2;
      road.position.y = 0.025;
      road.receiveShadow = true;
      scene.add(road);
    }
    const lane = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, reach + 3), mat(0xb4915f, { flatShading: false }));
    lane.position.set(0, 0.02, (reach + 3) / 2);
    lane.receiveShadow = true;
    scene.add(lane);

    const practice = practiceBuilding(practiceName.replace(/\s*\(.*?\)\s*/g, ' ').trim());
    practice.position.set(0, 0, -1.2);
    scene.add(practice);

    const anchors: { id: string; x: number; y: number; z: number }[] = [];
    const flags: THREE.Mesh[] = [];
    const spot = new Map<string, { x: number; z: number }>();
    homes.forEach((h, i) => {
      const p = plots[i];
      const stage = homeStage(h.level);
      const home = dwelling(stage, h.no);
      home.position.set(p.x, 0, p.z);
      home.lookAt(0, 0, 0);
      scene.add(home);
      anchors.push({ id: h.id, x: p.x, y: DWELLING_TOP[stage] + 0.4, z: p.z });
      spot.set(h.id, p);
      // A green pennant: trained this week.
      if (h.week > 0) {
        const k = 1 - 3.4 / Math.hypot(p.x, p.z);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), mat(0x4f3520));
        pole.position.set(p.x * k - p.z * 0.14, 1.1, p.z * k + p.x * 0.14);
        pole.castShadow = true;
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.36, 0.03), mat(0x2f9e44));
        flag.position.set(pole.position.x + 0.32, 1.95, pole.position.z);
        scene.add(pole, flag);
        flags.push(flag);
      }
    });
    for (let i = 0, n = 0; i < 900 && n < Math.min(60, 18 + homes.length); i++) {
      const a = R() * Math.PI * 2;
      const r = 6.2 + R() * (reach - 4);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const onRoad = [...rings].some((rr) => r > rr - 5.6 && r < rr - 3.6) || (Math.abs(x) < 1.6 && z > 0);
      if (onRoad || plots.some((p) => Math.hypot(x - p.x, z - p.z) < 4.4)) continue;
      const tr = leafTree(R, 0.9 + R() * 0.6);
      tr.position.set(x, 0, z);
      scene.add(tr);
      n++;
    }
    const halo = new THREE.Mesh(new THREE.RingGeometry(2.9, 3.3, 40), new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.06;
    halo.visible = false;
    scene.add(halo);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0, 0);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = 0.5;
    controls.maxPolarAngle = 1.2;
    controls.enableDamping = true;
    const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotate = !reduce;
    controls.autoRotateSpeed = 0.3;
    controls.addEventListener('start', () => (controls.autoRotate = false));
    controls.update();
    turn.current = (deg) => {
      controls.autoRotate = false;
      camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg));
      controls.update();
    };
    zoom.current = (f) => {
      controls.autoRotate = false;
      const d = THREE.MathUtils.clamp(camera.position.length() * f, 12, reach * 2.4);
      camera.position.setLength(d);
      controls.update();
    };

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const v = new THREE.Vector3();
    const goal = new THREE.Vector3();
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const tt = clock.getElapsedTime();
      if (!reduce) flags.forEach((f, i) => (f.rotation.y = Math.sin(tt * 2.2 + i) * 0.25));
      const at = pick.current ? spot.get(pick.current) : null;
      halo.visible = !!at;
      if (at) halo.position.set(at.x, 0.06, at.z);
      // The view turns round the chosen home, so zooming in brings that one closer.
      goal.set(at?.x ?? 0, 0, at?.z ?? 0);
      if (reduce) controls.target.copy(goal);
      else controls.target.lerp(goal, 0.08);
      controls.update();
      renderer.render(scene, camera);
      const w = el.clientWidth;
      const h = el.clientHeight;
      for (const a of anchors) {
        const node = labels.current.get(a.id);
        if (!node) continue;
        v.set(a.x, a.y, a.z).project(camera);
        const on = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
        node.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
        node.style.opacity = on ? '1' : '0';
        node.style.pointerEvents = on ? 'auto' : 'none';
      }
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
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => {
            (x as THREE.MeshBasicMaterial).map?.dispose();
            x.dispose();
          });
        }
      });
      renderer.dispose();
      canvas.remove();
      delete el.dataset.state;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, state]);

  if (state === 'nogl') return null;
  const setLabel = (id: string) => (node: HTMLElement | null) => {
    if (node) labels.current.set(id, node);
    else labels.current.delete(id);
  };
  const round = 'tap grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-line bg-white/95 text-ink-800';
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-[#C9D3BC] bg-[linear-gradient(180deg,#bfe0ee_0%,#f1e3c8_62%)]', className)}>
      <div ref={host} data-testid="practice-village" className="absolute inset-0 cursor-grab active:cursor-grabbing">
        <div className="pointer-events-none absolute inset-0">
          {homes.map((h) => {
            const stage = HOME_STAGES[homeStage(h.level)];
            return (
              <button key={h.id} ref={setLabel(h.id)} type="button" data-home={h.no} onClick={() => onPick(h.id)} aria-pressed={selected === h.id}
                className="absolute left-0 top-0 inline-flex min-h-[28px] items-center gap-1 whitespace-nowrap rounded-full border border-white/80 bg-white/95 px-2 text-[12px] font-bold text-ink-900 shadow-card transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-pressed:border-[#c9912a] aria-pressed:bg-[#fbf0d9]"
                style={{ transform: 'translate(-9999px,0)' }}>
                {/* The name starts with what is on the badge, then says the kind of home. */}
                <span><span className="sr-only">{t('Huisje ', 'Home ')}</span>{h.no}</span>
                <span className="font-medium text-ink-600">· lv {h.level}</span>
                <span className="sr-only">, {nl ? stage.nl : stage.en}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="absolute bottom-2 right-2 flex gap-1.5">
        <button type="button" onClick={() => zoom.current(1.25)} aria-label={t('Verder weg', 'Zoom out')} className={round}><Minus size={18} aria-hidden /></button>
        <button type="button" onClick={() => zoom.current(0.8)} aria-label={t('Dichterbij', 'Zoom in')} className={round}><Plus size={18} aria-hidden /></button>
        <button type="button" onClick={() => turn.current(-40)} aria-label={t('Draai naar links', 'Turn left')} className={round}><RotateCcw size={18} aria-hidden /></button>
        <button type="button" onClick={() => turn.current(40)} aria-label={t('Draai naar rechts', 'Turn right')} className={round}><RotateCw size={18} aria-hidden /></button>
      </div>
    </div>
  );
}
