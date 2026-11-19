import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Pause, Play } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { loadModel } from '@/components/hero/Hero3D';
import { dress, waitForFabric } from '@/components/hero/fabric3d';
import { FABRIC_PLAIN, hero3dScene, isToggleNode, withBaseKit } from '@/components/hero/hero3d';
import type { FigureLook } from '@/components/hero/HumanFigure';
import { Rig } from './rig';
import { depth, partOf, type Move } from './moves';

/**
 * An exercise shown by the patient's own hero: the movement plays in a loop at its own pace, with the
 * instruction of the moment under it. Drag to look from another side. With reduced motion it starts
 * paused at the turning point of the movement; the button plays it.
 */
export default function ExerciseDemo({ move, look, className, at }: { move: Move; look: FigureLook; className?: string; /** A fixed moment of the repetition (0–1), for a still. */ at?: number }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [playing, setPlaying] = useState(!reduce && at === undefined);
  const playRef = useRef(playing);
  playRef.current = playing;
  const [part, setPart] = useState(0);
  const moveRef = useRef(move);
  moveRef.current = move;
  const lookKey = JSON.stringify(look);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setState('error');
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x8a8f86, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.3);
    key.position.set(2.2, 4.5, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2.2, bottom: -1, near: 0.5, far: 12 });
    scene.add(key);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), new THREE.ShadowMaterial({ opacity: 0.22 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    // The mat for exercises on the floor.
    const mat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.016, 1.95), new THREE.MeshStandardMaterial({ color: 0x3f6f5c, roughness: 0.95 }));
    mat.position.set(0, 0.008, -0.2);
    mat.receiveShadow = true;
    scene.add(mat);
    const space = new THREE.Group();
    scene.add(space);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = 0.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.enableDamping = true;
    let framed = '';
    const frame = () => {
      const m = moveRef.current;
      if (framed === m.key) return;
      framed = m.key;
      const a = (m.camera.turn * Math.PI) / 180;
      controls.target.set(0, m.camera.look, m.lying ? -0.15 : 0);
      camera.position.set(Math.sin(a) * m.camera.far, m.camera.height, Math.cos(a) * m.camera.far + (m.lying ? -0.15 : 0));
      controls.update();
      mat.visible = !!m.lying;
    };
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let rig: Rig | null = null;
    let cancelled = false;
    const scene3d = hero3dScene(look);
    (async () => {
      try {
        const gltf = await loadModel(scene3d.url);
        await waitForFabric(scene3d.fabric ?? FABRIC_PLAIN);
        if (cancelled) return;
        const model = cloneSkinned(gltf.scene);
        const visible = withBaseKit(scene3d.visible, !!model.getObjectByName('tailored_jacket_tracksuit'));
        model.traverse((o) => {
          if (isToggleNode(o.name)) o.visible = visible.has(o.name);
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            const mm = (m.material as THREE.MeshStandardMaterial).clone();
            dress(mm, mm.name.replace(/\.\d+$/, ''), scene3d.tints[mm.name.replace(/\.\d+$/, '') as keyof typeof scene3d.tints], scene3d.fabric);
            m.material = mm;
            m.castShadow = true;
            // Posed far from where the mesh was bound (lying down): never culled by its old bounds.
            m.frustumCulled = false;
          }
        });
        space.add(model);
        rig = new Rig(model, space);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();

    let raf = 0;
    let last = performance.now();
    let p = at ?? (reduce ? 0.45 : 0);
    let shownPart = -1;
    let visibleNow = true;
    const io = new IntersectionObserver(([e]) => (visibleNow = e.isIntersecting));
    io.observe(el);
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visibleNow || document.hidden) return;
      const m = moveRef.current;
      frame();
      if (playRef.current && at === undefined) p = (p + dt / m.seconds) % 1;
      if (rig) {
        rig.apply(m.pose(rig, p));
        el.dataset.depth = depth(p).toFixed(2);
        el.dataset.pelvis = rig.at('pelvis').y.toFixed(2);
      }
      const now2 = partOf(p);
      if (now2 !== shownPart) {
        shownPart = now2;
        setPart(now2);
      }
      controls.update();
      renderer.render(scene, camera);
    };
    loop();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
      });
      floor.geometry.dispose();
      mat.geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookKey, at]);

  const label = move.parts[Math.max(0, part)]?.[nl ? 0 : 1] ?? '';
  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#f3efe6] to-[#e3dccd]', className)} data-testid="exercise-demo" data-state={state} data-move={move.key}>
      <div ref={host} className="h-full w-full touch-pan-y" role="img" aria-label={t(`3D-voorbeeld van de oefening ${move.nl}`, `3D demonstration of the exercise ${move.en}`)} />
      {state === 'loading' && <p className="absolute inset-0 grid place-items-center text-[14px] text-ink-700">{t('Voorbeeld laden…', 'Loading demonstration…')}</p>}
      {state === 'error' && <p className="absolute inset-0 grid place-items-center px-6 text-center text-[14px] text-ink-700">{t('Het 3D-voorbeeld kan hier niet worden getoond. De uitleg staat eronder.', 'The 3D demonstration cannot be shown here. The explanation is below.')}</p>}
      {state === 'ready' && (
        <>
          <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl bg-[#1c2420]/85 px-3 py-2 text-center text-[15px] font-semibold text-white" data-testid="exercise-part" aria-live="off">{label}</p>
          {at === undefined && (
            <button type="button" onClick={() => setPlaying((v) => !v)} data-testid="exercise-play" aria-pressed={playing}
              className="tap absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-ink-900 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={playing ? t('Pauzeer het voorbeeld', 'Pause the demonstration') : t('Speel het voorbeeld af', 'Play the demonstration')}>
              {playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
            </button>
          )}
        </>
      )}
    </div>
  );
}
