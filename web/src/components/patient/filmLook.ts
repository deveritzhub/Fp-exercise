import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** A warm colour grade with a soft vignette: richer colour, golden highlights, darker corners. */
const GRADE = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 1 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 g = mix(vec3(l), c.rgb, 1.0 + 0.18 * amount);             // a little more colour
      g *= mix(vec3(1.0), vec3(1.05, 1.0, 0.92), amount * smoothstep(0.15, 1.2, l)); // golden light
      g = mix(g, g * vec3(0.92, 0.97, 1.08), amount * (1.0 - smoothstep(0.0, 0.35, l))); // cool shade
      vec2 d = vUv - 0.5;
      g *= 1.0 - amount * 0.32 * smoothstep(0.32, 0.85, dot(d, d) * 2.2); // soft dark corners
      gl_FragColor = vec4(g, c.a);
    }`,
};

export type FilmLook = {
  render: (scene: THREE.Scene, camera: THREE.Camera) => void;
  setSize: (w: number, h: number) => void;
  /** Whether the effects are on (they switch off by themselves when the device is too slow). */
  on: () => boolean;
  /** Tell it how long the last frame took, in seconds. */
  frame: (dt: number) => void;
  dispose: () => void;
};

/**
 * The town drawn like a film still: light that glows (sun, lanterns, magic), a warm colour grade and
 * a vignette. A device that cannot keep up (frames slower than ~28 a second for a few seconds) falls
 * back to plain drawing, so the game stays smooth. `localStorage['fp.village.fx']` = 'on' or 'off'
 * forces it either way.
 */
export function filmLook(renderer: THREE.WebGLRenderer, phone: boolean): FilmLook {
  let forced: string | null = null;
  try {
    forced = localStorage.getItem('fp.village.fx');
  } catch {
    forced = null;
  }
  let enabled = forced !== 'off' && renderer.capabilities.isWebGL2;
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), {
    type: THREE.HalfFloatType,
    samples: phone ? 2 : 4,
  });
  const composer = new EffectComposer(renderer, target);
  const pass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  composer.addPass(pass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.22, 0.3, 1.25);
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(GRADE));
  composer.addPass(new OutputPass());

  let slow = 0;
  let watched = 0;
  return {
    render(scene, camera) {
      if (!enabled) {
        renderer.render(scene, camera);
        return;
      }
      pass.scene = scene;
      pass.camera = camera;
      composer.render();
    },
    setSize(w, h) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
    },
    on: () => enabled,
    frame(dt) {
      if (!enabled || forced === 'on') return;
      watched += dt;
      // Give the first seconds (loading, building the town) a pass.
      if (watched < 6) return;
      slow = dt > 0.036 ? slow + dt : Math.max(0, slow - dt * 0.5);
      if (slow > 3) enabled = false;
    },
    dispose() {
      composer.dispose();
      target.dispose();
      bloom.dispose();
    },
  };
}
