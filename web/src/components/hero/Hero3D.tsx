import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RotateCcw, RotateCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import type { FigureLook } from './HumanFigure';
import { hero3dScene, isToggleNode } from './hero3d';

/** One download per model per app session; every viewer clones it. */
const models = new Map<string, Promise<GLTF>>();
export const loadModel = (url: string) => {
  let p = models.get(url);
  if (!p) {
    p = new GLTFLoader().loadAsync(url);
    p.catch(() => models.delete(url));
    models.set(url, p);
  }
  return p;
};

const webglOk = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

type Stage = { root: THREE.Group; base: THREE.Group; model: THREE.Object3D | null; url: string | null; controls: OrbitControls };

/**
 * Turnable 3D figurine of the hero with the worn gear (model: tools/blender/mh_hero.py). Drag to turn,
 * or use the buttons; it turns slowly by itself unless the person prefers reduced motion.
 */
export default function Hero3D({ look, className }: { look: FigureLook; className?: string }) {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'nogl'>(() => (webglOk() ? 'loading' : 'nogl'));
  const scene3d = hero3dScene(look);
  const key = JSON.stringify([scene3d.url, [...scene3d.visible].sort(), scene3d.tints]);

  // Renderer, camera, lights and the render loop: once per mount.
  useEffect(() => {
    const el = host.current;
    if (!el || state === 'nogl') return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.touchAction = 'pan-y';
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 1.25, 5.4);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8a82, 1.6));
    const key = new THREE.DirectionalLight(0xfff4e6, 2.2);
    key.position.set(-2.5, 3.5, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xe6f0ff, 1.2);
    rim.position.set(1.5, 2.5, -3);
    scene.add(rim);
    const root = new THREE.Group();
    scene.add(root);
    // Pedestal in the brand colours.
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0x46554e, roughness: 0.9 }));
    ped.position.y = -0.06;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.03, 8), new THREE.MeshStandardMaterial({ color: 0x29483c, roughness: 0.8 }));
    top.position.y = 0.01;
    const base = new THREE.Group();
    base.add(ped, top);
    scene.add(base);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.05, 0);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = Math.PI / 2 - 0.35;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.enableDamping = true;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotate = !reduce;
    controls.autoRotateSpeed = 1.2;
    controls.addEventListener('start', () => (controls.autoRotate = false));
    controls.update();
    stage.current = { root, base, model: null, url: null, controls };

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
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      controls.update();
      renderer.render(scene, camera);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          if (m === ped || m === top) m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      stage.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state === 'nogl']);

  // Model, gear and colours: whenever the look changes.
  useEffect(() => {
    const st = stage.current;
    if (!st) return;
    let cancelled = false;
    (async () => {
      try {
        if (st.url !== scene3d.url) {
          setState('loading');
          const gltf = await loadModel(scene3d.url);
          if (cancelled) return;
          if (st.model) {
            // Geometry/textures belong to the shared GLTF cache; only cloned materials are local.
            st.model.traverse(o => {
              const mesh = o as THREE.Mesh;
              if (mesh.isMesh) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => material.dispose());
            });
            st.root.remove(st.model);
          }
          const model = cloneSkinned(gltf.scene);
          model.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh) m.material = (m.material as THREE.Material).clone();
          });
          st.root.add(model);
          st.model = model;
          st.url = scene3d.url;
          // Frame the figure, whatever the model's height.
          const box = new THREE.Box3().setFromObject(model.getObjectByName('body') ?? model);
          const h = Math.max(0.5, box.max.y - box.min.y);
          st.controls.target.set(0, box.min.y + h * 0.5, 0);
          st.controls.object.position.set(0, box.min.y + h * 0.6, h * 2.55);
          st.controls.update();
          st.base.scale.setScalar(h / 2.15);
        }
        const model = st.model!;
        model.traverse((o) => {
          if (isToggleNode(o.name)) o.visible = scene3d.visible.has(o.name);
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            const mat = m.material as THREE.MeshStandardMaterial;
            const base = mat.name.replace(/\.\d+$/, '') as keyof typeof scene3d.tints;
            if (scene3d.tints[base]) mat.color.set(scene3d.tints[base]);
          }
        });
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, state === 'nogl']);

  const turn = (deg: number) => {
    const st = stage.current;
    if (!st) return;
    st.controls.autoRotate = false;
    const c = st.controls;
    const cam = c.object;
    const off = cam.position.clone().sub(c.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg));
    cam.position.copy(c.target).add(off);
    c.update();
  };

  if (state === 'nogl')
    return (
      <div className={cn('flex items-center justify-center rounded-2xl bg-canvas p-4 text-center text-[13px] text-ink-700', className)}>
        {t('3D werkt niet op dit apparaat of in deze browser. De foto- en RPG-weergave werken wel.', '3D does not work on this device or browser. The photo and RPG views do.')}
      </div>
    );
  return (
    <div className={cn('relative min-w-0 overflow-hidden rounded-2xl rpg-podium', className)}>
      <div
        ref={host}
        role="img"
        aria-label={t('Je 3D-held met je gedragen uitrusting. Sleep om te draaien.', 'Your 3D hero wearing equipped items. Drag to turn.')}
        data-state={state}
        data-testid="hero-3d"
        className="h-full w-full cursor-grab active:cursor-grabbing"
      />
      {state === 'loading' && <p className="absolute inset-x-0 top-1/2 text-center text-[13px] font-semibold text-ink-700" role="status">{t('3D-held laden…', 'Loading 3D hero…')}</p>}
      {state === 'error' && <p className="absolute inset-x-3 top-1/2 text-center text-[13px] text-ink-700" role="alert">{t('De 3D-held kon niet laden. Probeer het later opnieuw.', 'The 3D hero could not load. Please try again later.')}</p>}
      <div className="absolute bottom-2 right-2 flex gap-1.5">
        <button type="button" onClick={() => turn(-45)} aria-label={t('Draai naar links', 'Turn left')} className="tap grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-line bg-white/95 text-ink-800 hover:bg-white"><RotateCcw size={18} aria-hidden /></button>
        <button type="button" onClick={() => turn(45)} aria-label={t('Draai naar rechts', 'Turn right')} className="tap grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-line bg-white/95 text-ink-800 hover:bg-white"><RotateCw size={18} aria-hidden /></button>
      </div>
    </div>
  );
}
