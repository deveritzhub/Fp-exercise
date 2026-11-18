import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { petModel } from './pets3d';

/**
 * The chosen pet on a small turntable: it trots for a moment, then sits and wags. Loaded on demand,
 * so the hero page does not carry the 3D code until the pet is chosen.
 */
export default function PetPreview({ k, coat, color = null, wear = null }: { k: string; coat: number; color?: string | null; wear?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    const w = el.clientWidth || 300;
    const h = el.clientHeight || 180;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff6e8, 0x6a7a58, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(2, 4, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(512, 512);
    scene.add(sun);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.ShadowMaterial({ opacity: 0.22 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const pet = petModel(k, coat, { color, wear });
    if (pet) scene.add(pet.group);
    // Frame the pet: small cats and big greyhounds both fill the view.
    const size = pet ? pet.height : 0.5;
    floor.scale.setScalar(size * 2.2);
    const camera = new THREE.PerspectiveCamera(32, w / h, 0.01, 50);
    camera.position.set(size * 2.6, size * 1.5, size * 2.6);
    camera.lookAt(0, size * 0.55, 0);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const clock = new THREE.Clock();
    let t = 0;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, clock.getDelta());
      t += dt;
      if (pet) {
        if (!reduce) {
          pet.group.rotation.y += dt * 0.5;
          // Trots for two seconds of every eight, sits the rest.
          const trot = t % 8 < 2;
          pet.update(dt, trot ? 2.2 : 0, !trot);
        }
      }
      renderer.render(scene, camera);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      pet?.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [k, coat, color, wear]);
  return <div ref={ref} aria-hidden className="h-full w-full" />;
}
