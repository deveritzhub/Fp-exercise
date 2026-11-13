import { creature } from './creatures3d';
import type { CreatureKind } from '@shared/adventure';
import { dress } from '@/components/hero/fabric3d';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { RotateCcw, RotateCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import type { FigureLook } from '@/components/hero/HumanFigure';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GAIT_SPEED, hero3dScene, isToggleNode, type HeroMotion } from '@/components/hero/hero3d';
import { loadModel } from '@/components/hero/Hero3D';
import { PALETTE, mat, rng, webglOk } from './Village3D';
import { VILLAGE_LAYOUT, clampRect, findPath, nearestSpot, reachable, slotPosition, stepToward, type Obstacle, type Rect, type Site, type Vec } from './walk';
import { PRACTICE_DOOR_X, ROOM, ROOM_AT, practiceBuilding, practiceRoom, type RoomWall } from './practice3d';
import { houseRoom } from './house3d';
import { furniture } from './home3d';
import { DWELLING_TOP, dwelling } from '@/components/app/dwellings3d';
import { decorItem, type Placed } from '@shared/homeDecor';
import { VILLAGERS, routePoint } from './villagers';
import type { MapTrack } from './VillageMap';

/**
 * The village as a place to walk around in (three.js). Tap the ground and the hero walks there;
 * drag sideways to turn the view. Every building and the gym TV also has a real HTML button that
 * sends the hero there, so the scene works with a keyboard and a screen reader.
 */

export const TV_KEY = 'tv';
export const PRACTICE_KEY = 'practice';
export const EXIT_KEY = 'exit';
/** The well on the square: a place to drink. */
export const WELL_KEY = 'well';
const WELL_SPOT: Vec = { x: 1.3, z: 0.4 };
/** Inside a house: the board with that house's programme (`in:kracht`, `in:mobiliteit`). */
export const boardKey = (house: string) => `in:${house}`;
/** The patient's own home: outside in the village, and the room inside (`in:home` is its furnishing table). */
export const HOME_KEY = 'home';
/** Where the own home stands: south-east of the square, with room to grow into a villa. */
export const HOME_AT = { x: Math.cos((60 * Math.PI) / 180) * 9, z: Math.sin((60 * Math.PI) / 180) * 9 };
const HOME_REACH = [1.3, 1.5, 1.8, 2.2, 2.8, 3.1];
/** Homes along the street stand a little smaller than the patient's own, so neighbours fit side by side. */
const STREET_HOME = 0.85;
/** A room behind a door in the village. */
type Place = { group: THREE.Group; walls: RoomWall[]; at: Vec; rect: Rect; entry: Vec; face: number; exit: Vec; outside: Vec; map: Vec; obstacles: Obstacle[]; spots: { key: string; door: Vec }[] };
export type WorldApi = { goTo: (key: string) => void; use: (key: string) => void; stop: () => void; walk: (p: Vec) => void };
type Props = {
  /** Buildings round the square take the next free slot; one with a `site` stands there instead. */
  buildings: {
    key: string; label: string; site?: Site; roof?: number; kind?: 'kracht' | 'mobiliteit'; alert?: boolean;
    /** A home instead of a cottage: which of the six (0 = camp … 5 = villa). `no` varies its roof, `flag` shows a green mark. */
    stage?: number; no?: number; flag?: boolean;
  }[];
  /** How far the walkable ground reaches from the square. Wider for the practice's village with its street of homes. */
  bound?: number;
  /** Roads besides the ones to the doors on the square. */
  extraRoads?: { a: Vec; b: Vec; w: number }[];
  /** The figure by the TV and the villagers; off where the walker is the therapist. */
  people?: boolean;
  /** A room to look into another home: `use('visit:<building key>')` goes in, furnished with `homeItems`. */
  visitRoom?: boolean;
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
  /** The hero went through a door: 'village', or the key of the room now in. */
  onZone?: (zone: string) => void;
  /** Where the hero is walking to by itself (a place key), or null when standing or steered by hand. */
  onDestination?: (key: string | null) => void;
  /** Name shown above the hero's head. */
  heroName?: string;
  /** A workout waits today: the coach at the gym shows a quest marker. */
  questOpen?: boolean;
  coachLabel?: string;
  /** Creatures to beat, at fixed spots. `creaturesGone` are the beaten ones: hidden until they come back. */
  creatures?: { key: string; kind: CreatureKind; label: string; x: number; z: number }[];
  creaturesGone?: string[];
  /** The well can be walked to and used (the patient's village). */
  well?: boolean;
  /** How fast the hero moves, 1 = normal. Lower when thirsty or stiff. */
  pace?: number;
  /** How the figure by the TV looks: the patient's own therapist. Without it: the practice colours. */
  coachLook?: FigureLook | null;
  /** Filled by the scene: send the hero to a spot from outside (HUD buttons). */
  api?: MutableRefObject<WorldApi | null>;
  /** Joystick: x to the right and y forward as seen on screen, each -1..1. Zero = not in use. */
  stick?: MutableRefObject<{ x: number; y: number }>;
  /** Name on the practice building. */
  practiceLabel?: string;
  /** The own home: which of the six homes it is by now (0 = camp … 5 = villa) and its name. */
  home?: { stage: number; label: string; alert?: boolean };
  /** Furniture in the own home, in the room's own coordinates. */
  homeItems?: Placed[];
  /** While a piece is being placed: a tap on the floor of the home reports the spot instead of walking there. */
  placing?: boolean;
  onFloor?: (spot: Vec) => void;
  /** Kept up to date by the scene, for the minimap. */
  track?: MutableRefObject<MapTrack>;
  className?: string;
};

const SPEED = 3.3;
const HERO_HEIGHT = 1.3;
const GYM = VILLAGE_LAYOUT.gym;
const TV_SPOT: Vec = ROOM.tv;
/** In front of the practice's door in the village. */
const PRACTICE_DOOR: Vec = { x: GYM.x + PRACTICE_DOOR_X, z: GYM.z + 0.55 };
const COACH_KEY = 'coach';
const COACH_AT: Vec = ROOM.coach;
/** What the coach wears: the same model as the hero, in the practice colours. */
const COACH_WEAR = new Set(['hair_short', 'outfit_tracksuit', 'gear_cap', 'base_shoes']);
const COACH_TINT: Record<string, string> = { kit_main: '#29483c', kit_dark: '#1d362d', kit_soft: '#e4bc63', hair: '#3b2a1a', skin: '#c99670' };

/** Who waits by the programme board in the two training houses: a coach in the gym, a flow master in the studio. */
const TRAINERS = {
  kracht: {
    nl: 'Coach', en: 'Coach', x: 0.85, z: -0.75,
    wear: ['hair_buzz', 'outfit_tracksuit', 'gear_gloves', 'gear_belt', 'base_shoes'],
    tint: { kit_main: '#7a2f24', kit_dark: '#2f3442', kit_soft: '#f0d9a8', hair: '#1f1611', skin: '#a8754f' },
    fabric: 'honing' as string | null,
  },
  mobiliteit: {
    nl: 'Flowmeester', en: 'Flow master', x: 0.8, z: -1.2,
    wear: ['hair_bun', 'outfit_sport_running', 'gear_scarf', 'base_shoes'],
    tint: { kit_main: '#2f7f8a', kit_dark: '#215c64', kit_soft: '#e6f6f4', hair: '#5a3a22', skin: '#e0b090' },
    fabric: null as string | null,
  },
} as const;
const trainerKey = (house: string) => `trainer:${house}`;

type Road = { a: Vec; b: Vec; w: number };
const HORIZON = 0xf0dcbb;
const GROUND = 150;

const segDist = (x: number, z: number, r: Road) => {
  const dx = r.b.x - r.a.x;
  const dz = r.b.z - r.a.z;
  const t = Math.max(0, Math.min(1, ((x - r.a.x) * dx + (z - r.a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - (r.a.x + dx * t), z - (r.a.z + dz * t));
};

// ---- Ground: patches of different kinds of ground instead of a field of loose blades. ----
const hash2 = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x: number, y: number) => vnoise(x, y) * 0.6 + vnoise(x * 2.1 + 5.2, y * 2.1 + 1.3) * 0.3 + vnoise(x * 4.3 + 9.1, y * 4.3 + 3.7) * 0.1;
const step = (lo: number, hi: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};
/** The kinds of ground and their colours: lush meadow, tall dark grass, dry grass, clover, bare earth. */
const GROUNDS = [[104, 164, 64], [54, 106, 44], [196, 182, 98], [66, 152, 92], [152, 120, 80]] as const;
/** How much of each kind of ground there is at a spot in the village (the five weights add up to 1). */
export function terrainAt(x: number, z: number): [number, number, number, number, number] {
  const dry = step(0.5, 0.62, fbm(x * 0.09 + 3.1, z * 0.09 - 7.4));
  const dark = step(0.55, 0.68, fbm(x * 0.15 + 40.2, z * 0.15 - 17.3)) * (1 - dry);
  const clover = step(0.6, 0.72, fbm(x * 0.2 - 30.5, z * 0.2 + 60.8)) * (1 - dry) * (1 - dark);
  const earth = step(0.63, 0.72, fbm(x * 0.33 + 90.4, z * 0.33 + 12.9)) * (1 - dark);
  const rest = Math.max(0, 1 - dry - dark - clover);
  const lush = rest * (1 - earth);
  return [lush, dark, dry * (1 - earth), clover * (1 - earth), earth * (rest + dry + clover)];
}

/** The ground picture: patches of meadow, tall grass, dry grass, clover and bare earth; dirt roads and the square on top. */
function groundTexture(roads: Road[], R: () => number, S: number, bare = false) {
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  const px = (v: number) => (v / GROUND + 0.5) * S;
  const u = S / GROUND;
  if (g) {
    // `bare`: only the roads and the square, on a see-through sheet that lies over the painted ground.
    if (!bare) {
    // The kinds of ground on a coarse grid; every pixel takes its mix from there and gets its own grain.
    const N = 192;
    const grid = new Float32Array(N * N * 5);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const w = terrainAt((i / (N - 1) - 0.5) * GROUND, (j / (N - 1) - 0.5) * GROUND);
        grid.set(w, (j * N + i) * 5);
      }
    }
    const img = g.createImageData(S, S);
    const d = img.data;
    for (let y = 0; y < S; y++) {
      const gy = (y / (S - 1)) * (N - 1);
      const j0 = Math.min(N - 2, Math.floor(gy));
      const fy = gy - j0;
      for (let x = 0; x < S; x++) {
        const gx = (x / (S - 1)) * (N - 1);
        const i0 = Math.min(N - 2, Math.floor(gx));
        const fx = gx - i0;
        const a = (j0 * N + i0) * 5;
        const b = a + 5;
        const e = a + N * 5;
        const f = e + 5;
        let r = 0;
        let gr = 0;
        let bl = 0;
        let earth = 0;
        let clover = 0;
        for (let k = 0; k < 5; k++) {
          const w = (grid[a + k] * (1 - fx) + grid[b + k] * fx) * (1 - fy) + (grid[e + k] * (1 - fx) + grid[f + k] * fx) * fy;
          r += GROUNDS[k][0] * w;
          gr += GROUNDS[k][1] * w;
          bl += GROUNDS[k][2] * w;
          if (k === 4) earth = w;
          if (k === 3) clover = w;
        }
        // Grain: fine speckle everywhere, light dots in the clover, pebbles on bare earth.
        const h = hash2(x, y);
        let shade = 0.86 + h * 0.26;
        if (clover > 0.5 && h > 0.955) shade = 1.45;
        if (earth > 0.5 && h > 0.965) shade = h > 0.985 ? 1.35 : 0.6;
        const o = (y * S + x) * 4;
        d[o] = Math.min(255, r * shade);
        d[o + 1] = Math.min(255, gr * shade);
        d[o + 2] = Math.min(255, bl * shade);
        d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    // Soft lighter and darker sweeps over it, so no patch is one flat tone.
    for (let i = 0; i < 700; i++) {
      g.globalAlpha = 0.05 + R() * 0.07;
      g.fillStyle = R() > 0.5 ? '#f4ffd0' : '#1f3a14';
      g.beginPath();
      g.ellipse(R() * S, R() * S, (10 + R() * 60) * (S / 2048), (8 + R() * 36) * (S / 2048), R() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
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

/** The five painted ground pictures (web/public/village/ground), in the order of GROUNDS. Loaded once. */
const GROUND_FILES = ['gras', 'hoog-gras', 'droog-gras', 'klaver', 'aarde', 'zand', 'plein'] as const;
/** Bump when the pictures change, so phones fetch the new ones. */
const GROUND_VERSION = 1;
/** How much ground one picture covers, in world units (about two metres). */
const GROUND_TILE = 4.4;
let groundTiles: Promise<THREE.Texture[]> | null = null;
function loadGroundTiles() {
  groundTiles ??= Promise.all(
    GROUND_FILES.map((name) =>
      new THREE.TextureLoader().loadAsync(`/village/ground/${name}.webp?v=${GROUND_VERSION}`).then((t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 8;
        return t;
      }),
    ),
  );
  groundTiles.catch(() => (groundTiles = null));
  return groundTiles;
}

/** Where which ground lies, as a small map the shader reads: tall, dry, clover, earth (the rest is meadow). */
function splatMap() {
  const N = 256;
  const data = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      // Row 0 is the south edge: the picture is not flipped, the ground's v runs from south to north.
      const w = terrainAt((i / (N - 1) - 0.5) * GROUND, (0.5 - j / (N - 1)) * GROUND);
      const o = (j * N + i) * 4;
      data[o] = w[1] * 255;
      data[o + 1] = w[2] * 255;
      data[o + 2] = w[3] * 255;
      data[o + 3] = w[4] * 255;
    }
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/**
 * The ground with the painted pictures: each kind of ground repeats its own picture, mixed where the
 * map says so, with the roads laid over it. Standard lighting and shadows stay as they are.
 */
function paintedGround(tiles: THREE.Texture[], splat: THREE.Texture, roadsOver: THREE.Texture) {
  const m = new THREE.MeshStandardMaterial({ map: roadsOver, roughness: 1 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSplat = { value: splat };
    tiles.forEach((t, i) => (sh.uniforms[`uG${i}`] = { value: t }));
    sh.uniforms.uTile = { value: GROUND / GROUND_TILE };
    sh.uniforms.uSize = { value: GROUND };
    sh.fragmentShader = [
      'uniform sampler2D uSplat;',
      ...tiles.map((_, i) => `uniform sampler2D uG${i};`),
      'uniform float uTile;',
      'uniform float uSize;',
      sh.fragmentShader.replace(
        '#include <map_fragment>',
        [
          '#ifdef USE_MAP',
          '  vec4 over = texture2D(map, vMapUv);',
          '  vec4 kind = texture2D(uSplat, vMapUv);',
          '  vec2 tuv = vMapUv * uTile;',
          '  float meadow = clamp(1.0 - kind.r - kind.g - kind.b - kind.a, 0.0, 1.0);',
          '  vec3 ground = texture2D(uG0, tuv).rgb * meadow + texture2D(uG1, tuv).rgb * kind.r + texture2D(uG2, tuv).rgb * kind.g + texture2D(uG3, tuv).rgb * kind.b + texture2D(uG4, tuv).rgb * kind.a;',
          '  ground /= max(0.001, meadow + kind.r + kind.g + kind.b + kind.a);',
          // The same picture again, much larger: slow light and dark that hides the repeat.
          '  float wide = dot(texture2D(uG0, tuv * 0.083 + 0.31).rgb, vec3(0.333));',
          // Daylight flattens fine paint: deepen the dark strokes so blades and crumbs stay readable.
          '  ground = pow(ground, vec3(1.45)) * 1.7;',
          '  float mid = dot(texture2D(uG0, tuv * 0.29 + 0.57).rgb, vec3(0.333));',
          '  ground *= (0.8 + wide * 1.0) * (0.72 + mid * 1.4);',
          // Roads are painted sand, the square packed earth with pebbles; the sheet over the ground
          // says where they lie and keeps its darker edges and tracks.
          '  float square = 1.0 - smoothstep(3.0, 4.4, length((vMapUv - 0.5) * uSize));',
          '  vec3 path = mix(texture2D(uG5, tuv * 1.3).rgb * vec3(0.92, 0.84, 0.74), texture2D(uG6, tuv * 1.6).rgb * vec3(0.9, 0.88, 0.84), square);',
          '  path *= clamp(dot(over.rgb, vec3(0.333)) / 0.25, 0.5, 1.15) * (0.8 + wide * 0.8);',
          '  diffuseColor.rgb *= mix(ground, path, over.a);',
          '#endif',
        ].join('\n'),
      ),
    ].join('\n');
  };
  return m;
}

/** Hand-painted surface textures, in grey so each material can tint them. Made once, reused. */
const TEX: Record<string, THREE.CanvasTexture> = {};
/** Bump when the surface pictures change, so phones fetch the new ones. */
const SURFACE_VERSION = 1;
export function painted(kind: 'plaster' | 'shingle' | 'stone' | 'wood' | 'bark' | 'leaves', rx = 1, ry = 1) {
  const key = `${kind}:${rx}:${ry}`;
  if (TEX[key]) return TEX[key];
  const S = 256;
  const c = document.createElement('canvas');
  // Drawn at 256 and stored twice as large, so the painted picture that replaces it keeps its detail.
  c.width = S * 2;
  c.height = S * 2;
  const g = c.getContext('2d');
  g?.scale(2, 2);
  const R = rng(kind.length * 31 + 5);
  if (g) {
    g.fillStyle = '#e6e6e6';
    g.fillRect(0, 0, S, S);
    const blot = (n: number, lo: number, hi: number, a: number) => {
      for (let i = 0; i < n; i++) {
        const v = Math.round(lo + R() * (hi - lo));
        g.globalAlpha = a;
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.beginPath();
        g.ellipse(R() * S, R() * S, 6 + R() * 26, 4 + R() * 16, R() * 3, 0, 7);
        g.fill();
      }
      g.globalAlpha = 1;
    };
    if (kind === 'plaster') blot(90, 190, 255, 0.18);
    if (kind === 'shingle') {
      const rows = 8;
      const h = S / rows;
      for (let r = 0; r < rows; r++) {
        for (let i = -1; i < 7; i++) {
          const w = S / 6;
          const x = i * w + (r % 2 ? w / 2 : 0);
          const v = Math.round(150 + R() * 90);
          g.fillStyle = `rgb(${v},${v},${v})`;
          g.beginPath();
          g.roundRect(x + 1, r * h, w - 2, h + 6, [0, 0, 9, 9]);
          g.fill();
          g.fillStyle = 'rgba(0,0,0,0.28)';
          g.fillRect(x, r * h + h - 2, w, 4);
        }
      }
    }
    if (kind === 'stone') {
      g.fillStyle = '#8a8a8a';
      g.fillRect(0, 0, S, S);
      for (let r = 0; r < 5; r++) {
        for (let i = -1; i < 4; i++) {
          const w = S / 3.2;
          const v = Math.round(170 + R() * 80);
          g.fillStyle = `rgb(${v},${v},${v})`;
          g.beginPath();
          g.roundRect(i * w + (r % 2 ? w / 2 : 0) + 3, r * (S / 5) + 3, w - 6, S / 5 - 6, 8);
          g.fill();
        }
      }
      blot(40, 120, 255, 0.12);
    }
    if (kind === 'wood') {
      for (let i = 0; i < 6; i++) {
        const v = Math.round(185 + R() * 60);
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(i * (S / 6), 0, S / 6 - 2, S);
      }
      g.strokeStyle = 'rgba(0,0,0,0.16)';
      for (let i = 0; i < 40; i++) {
        g.beginPath();
        const x = R() * S;
        g.moveTo(x, R() * S);
        g.lineTo(x + (R() - 0.5) * 6, R() * S);
        g.stroke();
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  TEX[key] = t;
  // The painted picture (web/public/village/surface) takes over once it has loaded; the drawing above
  // stays when it does not come.
  if (g && typeof Image !== 'undefined') {
    const img = new Image();
    img.onload = () => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.drawImage(img, 0, 0, c.width, c.height);
      t.needsUpdate = true;
    };
    img.src = `/village/surface/${kind}.webp?v=${SURFACE_VERSION}`;
  }
  return t;
}

/** Soft round dot for smoke, glow and drifting motes. */
export function softDot() {
  if (TEX.dot) return TEX.dot;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  }
  TEX.dot = new THREE.CanvasTexture(c);
  return TEX.dot;
}

/** What stands in front of the strength house (bar on a rack, kettlebells, tyre) and the mobility house (mats, ball, stretch frame). */
function yard(scene: THREE.Scene, kind: 'kracht' | 'mobiliteit', site: Site, obstacles: Obstacle[]) {
  const ring = Math.hypot(site.x, site.z);
  const out = { x: site.x / ring, z: site.z / ring };
  const side = { x: -out.z, z: out.x };
  const g = new THREE.Group();
  g.position.set(site.x - out.x * 2.3 + side.x * 2.1, 0, site.z - out.z * 2.3 + side.z * 2.1);
  g.rotation.y = Math.atan2(-out.x, -out.z);
  scene.add(g);
  const put = (geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    const m = new THREE.Mesh(geo, mat(color, { flatShading: false, ...opts }));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  if (kind === 'kracht') {
    for (const x of [-0.55, 0.55]) put(new THREE.BoxGeometry(0.09, 1.25, 0.09), 0x1d1f1e, x, 0.62, 0);
    for (const x of [-0.55, 0.55]) put(new THREE.BoxGeometry(0.09, 0.07, 0.7), 0x1d1f1e, x, 0.035, 0.1);
    put(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 8), 0xc9cccc, 0, 1.2, 0.08, { metalness: 0.8, roughness: 0.3 }).rotation.z = Math.PI / 2;
    for (const x of [-0.82, 0.82]) put(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 16), 0xb5532c, x, 1.2, 0.08).rotation.z = Math.PI / 2;
    for (const [x, r] of [[-0.3, 0.13], [0, 0.11], [0.28, 0.09]]) {
      put(new THREE.SphereGeometry(r, 12, 10), 0x1d1f1e, x, r, 0.9);
      put(new THREE.TorusGeometry(r * 0.6, r * 0.18, 6, 12), 0x1d1f1e, x, r * 2, 0.9);
    }
    put(new THREE.TorusGeometry(0.42, 0.17, 8, 18), 0x2a2c2b, 1.35, 0.17, 0.5).rotation.x = Math.PI / 2;
  } else {
    [0x3f8f7a, 0x8e3b5f, 0x2759a0].forEach((c, i) => {
      const roll = put(new THREE.CylinderGeometry(0.11, 0.11, 0.7, 12), c, -0.5 + i * 0.26, 0.11 + (i === 1 ? 0.19 : 0), 0.1 + (i === 1 ? 0 : 0));
      roll.rotation.x = Math.PI / 2;
    });
    put(new THREE.BoxGeometry(0.75, 0.03, 1.7), 0x3f8f7a, 0.75, 0.02, 0.6);
    put(new THREE.SphereGeometry(0.34, 16, 12), 0x2759a0, 1.55, 0.34, 0.1);
    for (const x of [-0.45, 0.45]) put(new THREE.BoxGeometry(0.08, 1.9, 0.08), 0xc79a62, x - 1.6, 0.95, 0.2);
    for (let i = 0; i < 6; i++) put(new THREE.CylinderGeometry(0.022, 0.022, 0.9, 6), 0xc79a62, -1.6, 0.4 + i * 0.28, 0.2).rotation.z = Math.PI / 2;
  }
  obstacles.push({ x: g.position.x, z: g.position.z, r: 0.95 });
}

/** Timber cottage: stone footing, plastered walls with beams, a pitched roof. The front faces +z. */
export function cottage(roofColor: number, scale = 1) {
  const g = new THREE.Group();
  const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  box(2.5, 0.36, 2.1, 0xa9a59b, 0, 0.18, 0, { map: painted('stone', 2, 0.5), flatShading: false });
  box(2.3, 1.5, 1.9, 0xf3e6c8, 0, 1.1, 0, { map: painted('plaster'), flatShading: false });
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
  const roof = new THREE.Mesh(roofGeo, mat(roofColor, { map: painted('shingle', 0.5, 0.9), flatShading: false }));
  roof.position.y = 1.9;
  g.add(roof);
  box(0.62, 1.08, 0.05, 0x6b4a2b, 0, 0.88, 0.96);
  box(0.52, 0.98, 0.07, 0x7a5232, 0, 0.85, 0.97, { map: painted('wood'), flatShading: false });
  // Flower boxes under the windows and a hanging sign in the roof colour.
  for (const x of [-0.74, 0.74]) {
    box(0.5, 0.1, 0.14, 0x6b4a2b, x, 1.03, 1.02);
    for (const [dx, c] of [[-0.15, 0xe8536b], [0, 0xf4c542], [0.15, 0xf2f0ea]] as const) box(0.09, 0.09, 0.09, c, x + dx, 1.12, 1.03);
  }
  box(0.07, 0.07, 0.6, 0x4f3520, 1.0, 1.72, 1.25);
  box(0.05, 0.36, 0.46, roofColor, 1.0, 1.48, 1.34);
  box(0.06, 0.14, 0.14, 0xe4bc63, 1.0, 1.48, 1.34, { metalness: 0.6, roughness: 0.35 });
  for (const x of [-0.74, 0.74]) box(0.44, 0.44, 0.07, 0xfff1b8, x, 1.3, 0.97, { emissive: 0xffd36b, emissiveIntensity: 0.55 });
  box(0.32, 1.0, 0.32, 0x8d8a82, 0.75, 2.7, -0.35);
  g.scale.setScalar(scale);
  g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  return g;
}

const LEAVES = [0x3f8a3a, 0x4f9d43, 0x62ad4c, 0x357a36, 0x76b850];
/** Painted light: tops of the foliage catch the sun, the undersides stay dark. */
function shaded<T extends THREE.BufferGeometry>(geo: T) {
  const pos = geo.attributes.position;
  geo.computeBoundingBox();
  const lo = geo.boundingBox!.min.y;
  const span = geo.boundingBox!.max.y - lo || 1;
  const col: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const k = 0.55 + 0.6 * ((pos.getY(i) - lo) / span);
    col.push(k, k * 1.02, k * 0.9);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}
/** Round leafy tree, about 3–4 hero heights. */
export function leafTree(R: () => number, size = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 1.5, 6), mat(0x8a6038, { map: painted('bark', 2, 1.5), flatShading: false }));
  trunk.position.y = 0.75;
  g.add(trunk);
  const n = 6 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const blob = new THREE.Mesh(shaded(new THREE.IcosahedronGeometry(0.62 + R() * 0.3, 2)), mat(LEAVES[Math.floor(R() * LEAVES.length)], { vertexColors: true, flatShading: false, map: painted('leaves', 3, 2) }));
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

export default function WalkVillage3D({ buildings, tvLabel, tvTitle, tvLines, look, heroColor = '#e4bc63', cheer = null, startAtTv = false, onNear, onArrive, onZone, onDestination, heroName, questOpen = false, coachLabel, coachLook, well = false, pace: paceProp = 1, creatures, creaturesGone, api, track, stick, practiceLabel = 'Praktijk', home, homeItems, placing = false, onFloor, bound, extraRoads, people = true, visitRoom = false, className }: Props) {
  const { t } = useI18n();
  const coachName = coachLabel ?? t('Fysiotherapeut', 'Physiotherapist');
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Map<string, HTMLElement>>(new Map());
  const xpLabel = useRef<HTMLDivElement>(null);
  const nameLabel = useRef<HTMLDivElement>(null);
  const walkTo = useRef<(p: Vec, key: string | null, then?: string) => void>(() => {});
  const goTo = useRef<(key: string) => void>(() => {});
  const fade = useRef<HTMLDivElement>(null);
  const zone = useRef<string>(startAtTv ? PRACTICE_KEY : 'village');
  const turn = useRef<(deg: number) => void>(() => {});
  const pos = useRef<Vec>(startAtTv ? { ...TV_SPOT } : { ...VILLAGE_LAYOUT.spawn });
  const facing = useRef(startAtTv ? Math.PI : 0);
  const camAngle = useRef(0);
  const cb = useRef<{ onNear: Props["onNear"]; onArrive: Props["onArrive"]; onZone?: Props["onZone"]; onDestination?: Props["onDestination"] }>({ onNear, onArrive, onZone, onDestination });
  cb.current = { onNear, onArrive, onZone, onDestination };
  const cheerRef = useRef<{ xp: number; at: number | null } | null>(null);
  const [state, setState] = useState<'ready' | 'nogl'>(() => (webglOk() ? 'ready' : 'nogl'));
  const heroScene = look ? hero3dScene(look) : null;
  const heroKey = heroScene ? JSON.stringify([heroScene.url, [...heroScene.visible].sort(), heroScene.tints, heroScene.fabric]) : '';
  const key = JSON.stringify([buildings.map((b) => [b.key, b.stage ?? -1]), tvTitle, tvLines, heroColor, heroKey, practiceLabel, home?.stage ?? -1, bound ?? 0, people, visitRoom, coachLook ?? null, (creatures ?? []).map((c) => [c.key, c.kind, c.x, c.z])]);
  // Read at the moment of use, so new furniture or a new mode never rebuilds the whole village.
  const slow = Math.min(1, Math.max(0.5, paceProp));
  const gone = useMemo(() => new Set(creaturesGone ?? []), [creaturesGone]);
  const live = useRef({ homeItems: homeItems ?? [], placing, onFloor, slow, gone });
  live.current = { homeItems: homeItems ?? [], placing, onFloor, slow, gone };
  const furnish = useRef<(items: Placed[]) => void>(() => {});
  const itemsKey = JSON.stringify(homeItems ?? []);
  useEffect(() => {
    furnish.current(live.current.homeItems);
  }, [itemsKey]);
  let slot = 0;
  const sites = buildings.map((b) => {
    const s = b.site ?? slotPosition(slot++);
    if (b.stage == null) return s;
    // A home's door lies as far out as the home is deep.
    const len = Math.hypot(s.x, s.z) || 1;
    const k = 1 - (HOME_REACH[Math.max(0, Math.min(5, b.stage))] * STREET_HOME + 0.75) / len;
    return { ...s, door: { x: s.x * k, z: s.z * k } };
  });

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
    const skyLight = new THREE.HemisphereLight(0xd6e6ff, 0x7d8c46, 1.55);
    scene.add(skyLight);
    const sun = new THREE.DirectionalLight(0xffdca8, 3.1);
    sun.position.set(-15, 17, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar((el.clientWidth || 400) < 520 ? 1024 : 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, far: 70 });
    scene.add(sun);

    const R = rng(11);
    const B = bound ?? VILLAGE_LAYOUT.bound;
    const phone = (el.clientWidth || 400) < 520;

    // Sky: blue above, hazy at the horizon. It travels with the camera.
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(300, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(0x3a7fd2) }, bottom: { value: new THREE.Color(HORIZON) } },
        vertexShader: 'varying float h;\nvoid main() {\n  h = normalize(position).y;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}',
        fragmentShader: 'uniform vec3 top;\nuniform vec3 bottom;\nvarying float h;\nvoid main() {\n  gl_FragColor = vec4(mix(bottom, top, pow(clamp(h, 0.0, 1.0), 0.5)), 1.0);\n  #include <colorspace_fragment>\n}',
      }),
    );
    scene.add(sky);
    // The low sun with a glow around it.
    const sunDir = sun.position.clone().normalize();
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xffe2a6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    glow.scale.setScalar(150);
    const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xfff6d8, depthWrite: false, fog: false, transparent: true }));
    disc.scale.setScalar(38);
    scene.add(glow, disc);

    const obstacles: Obstacle[] = [];
    const anchors: { id: string; obj: THREE.Object3D; y: number; zone?: string }[] = [];
    const spots: { key: string; door: Vec }[] = [];
    const roads: Road[] = [...(extraRoads ?? [])];
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
    const well3d = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.6, 10), mat(0x8d8a82));
    well3d.position.y = 0.3;
    well3d.castShadow = true;
    const wellWater = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.02, 10), mat(PALETTE.water, { roughness: 0.2 }));
    wellWater.position.y = 0.6;
    scene.add(well3d, wellWater);
    obstacles.push({ x: 0, z: 0, r: 0.95 });
    // Creatures: each at its spot, with a place beside it to stand and strike from.
    const mobs: { key: string; g: THREE.Group; door: Vec }[] = [];
    for (const c of creatures ?? []) {
      const g = creature(c.kind);
      g.position.set(c.x, 0, c.z);
      g.lookAt(0, 0, 0);
      scene.add(g);
      const len = Math.hypot(c.x, c.z) || 1;
      const door = { x: c.x * (1 - 0.85 / len), z: c.z * (1 - 0.85 / len) };
      anchors.push({ id: c.key, obj: g, y: 1.0 });
      spots.push({ key: c.key, door });
      obstacles.push({ x: c.x, z: c.z, r: 0.38 });
      mobs.push({ key: c.key, g, door });
    }
    if (well) {
      anchors.push({ id: WELL_KEY, obj: well3d, y: 2.55 });
      spots.push({ key: WELL_KEY, door: WELL_SPOT });
    }

    buildings.forEach((b, i) => {
      const p = sites[i];
      const stage = b.stage == null ? -1 : Math.max(0, Math.min(5, b.stage));
      const h = stage >= 0 ? dwelling(stage, b.no ?? i) : cottage(b.roof ?? PALETTE.roof[b.key] ?? 0x8a6038, b.key === 'hall' || b.kind ? 1.12 : 1);
      if (stage >= 0) h.scale.setScalar(STREET_HOME);
      h.position.set(p.x, 0, p.z);
      h.lookAt(0, 0, 0);
      scene.add(h);
      const reach = stage >= 0 ? HOME_REACH[stage] * STREET_HOME : 1.9;
      obstacles.push({ x: p.x, z: p.z, r: reach });
      occluder(h, p.x, p.z, reach + 0.2);
      anchors.push({ id: b.key, obj: h, y: stage >= 0 ? DWELLING_TOP[stage] * STREET_HOME + 0.5 : 3.9 });
      spots.push({ key: b.key, door: p.door });
      // Homes stand along the street the page lays out; the others get their own path from the square.
      const k = 2.6 / Math.hypot(p.door.x, p.door.z);
      if (stage < 0) roads.push({ a: { x: p.door.x * k, z: p.door.z * k }, b: p.door, w: 1.3 });
      if (b.kind) yard(scene, b.kind, p, obstacles);
    });

    // The practice: a building in the village, and behind its door the exercise room with the TV.
    const hall = practiceBuilding(practiceLabel.replace(/\s*\(.*?\)\s*/g, ' ').trim());
    hall.position.set(GYM.x, 0, GYM.z - 1.6);
    scene.add(hall);
    [-1.9, 0, 1.9].forEach((dx) => obstacles.push({ x: GYM.x + dx, z: GYM.z - 1.95, r: 1.0 }));
    occluder(hall, GYM.x, GYM.z - 1.6, 2.9);
    anchors.push({ id: PRACTICE_KEY, obj: hall, y: 4.15 });
    spots.push({ key: PRACTICE_KEY, door: PRACTICE_DOOR });
    const room = practiceRoom(tvTexture(tvTitle, tvLines));
    scene.add(room.group);
    const mark = (id: string, v: Vec, y: number, where: string) => {
      const o = new THREE.Object3D();
      o.position.set(v.x, 0, v.z);
      scene.add(o);
      anchors.push({ id, obj: o, y, zone: where });
    };
    // Every room behind a door: the practice, and the houses that can be entered.
    const places: Record<string, Place> = {
      [PRACTICE_KEY]: {
        group: room.group, walls: room.walls, at: ROOM_AT, rect: ROOM.rect, entry: ROOM.entry, face: -Math.PI / 2, exit: ROOM.exit,
        outside: { x: PRACTICE_DOOR.x, z: PRACTICE_DOOR.z + 0.9 }, map: { x: GYM.x, z: GYM.z - 1.6 }, obstacles: [...ROOM.obstacles],
        spots: [{ key: TV_KEY, door: TV_SPOT }, { key: EXIT_KEY, door: ROOM.exit }],
      },
    };
    mark(TV_KEY, ROOM.tvWall, 2.75, PRACTICE_KEY);
    mark(EXIT_KEY, { x: ROOM.exit.x + 0.7, z: ROOM.exit.z }, 2.45, PRACTICE_KEY);
    const trainers: { at: THREE.Vector3; wear: Set<string>; tint: Record<string, string>; face: number; fabric: string | null }[] = [];
    buildings.forEach((b, i) => {
      if (!b.kind) return;
      const origin = { x: 0, z: 560 + Object.keys(places).length * 160 };
      const h = houseRoom(b.kind, origin);
      scene.add(h.group);
      const k = 0.85 / Math.hypot(sites[i].door.x, sites[i].door.z);
      places[b.key] = {
        group: h.group, walls: h.walls, at: origin, rect: h.rect, entry: h.entry, face: Math.PI / 2, exit: h.exit,
        outside: { x: sites[i].door.x * (1 - k), z: sites[i].door.z * (1 - k) }, map: sites[i], obstacles: h.obstacles,
        spots: [{ key: boardKey(b.key), door: h.board }, { key: EXIT_KEY, door: h.exit }],
      };
      mark(boardKey(b.key), h.boardMark, 2.55, b.key);
      if (heroScene) {
        const tr = TRAINERS[b.kind];
        const stand = new THREE.Object3D();
        stand.position.set(origin.x + tr.x, 0, origin.z + tr.z);
        scene.add(stand);
        anchors.push({ id: trainerKey(b.key), obj: stand, y: HERO_HEIGHT + 0.55, zone: b.key });
        h.obstacles.push({ x: origin.x + tr.x, z: origin.z + tr.z, r: 0.4 });
        trainers.push({ at: stand.position, wear: new Set(tr.wear), tint: tr.tint, fabric: tr.fabric, face: Math.atan2(h.board.x - stand.position.x, h.board.z + 1.4 - stand.position.z) });
      }
      mark(EXIT_KEY, h.exitMark, 2.45, b.key);
    });
    // The patient's own home: outside it is the home that fits the level, inside a room to furnish.
    let homeDoor: Vec | null = null;
    if (home) {
      const stage = Math.max(0, Math.min(5, home.stage));
      const len = Math.hypot(HOME_AT.x, HOME_AT.z);
      const reach = HOME_REACH[stage];
      const outside = dwelling(stage, 3);
      outside.position.set(HOME_AT.x, 0, HOME_AT.z);
      outside.lookAt(0, 0, 0);
      scene.add(outside);
      obstacles.push({ x: HOME_AT.x, z: HOME_AT.z, r: reach });
      occluder(outside, HOME_AT.x, HOME_AT.z, reach + 0.3);
      homeDoor = { x: HOME_AT.x * (1 - (reach + 0.75) / len), z: HOME_AT.z * (1 - (reach + 0.75) / len) };
      anchors.push({ id: HOME_KEY, obj: outside, y: DWELLING_TOP[stage] + 0.5 });
      spots.push({ key: HOME_KEY, door: homeDoor });
      const kk = 2.6 / Math.hypot(homeDoor.x, homeDoor.z);
      roads.push({ a: { x: homeDoor.x * kk, z: homeDoor.z * kk }, b: homeDoor, w: 1.3 });
    }
    // The room behind the door: the patient's own, or the one a visitor looks into.
    if (home || visitRoom) {
      const hd: Vec = homeDoor ?? { x: 0, z: 3 };
      const origin = { x: 0, z: 560 + Object.keys(places).length * 160 };
      const h = houseRoom('home', origin);
      scene.add(h.group);
      const base = [...h.obstacles];
      const pieces = new THREE.Group();
      h.group.add(pieces);
      places[HOME_KEY] = {
        group: h.group, walls: h.walls, at: origin, rect: h.rect, entry: h.entry, face: Math.PI / 2, exit: h.exit,
        outside: { x: hd.x * (1 - 0.85 / Math.hypot(hd.x, hd.z)), z: hd.z * (1 - 0.85 / Math.hypot(hd.x, hd.z)) }, map: home ? HOME_AT : hd, obstacles: base,
        spots: [{ key: boardKey(HOME_KEY), door: h.board }, { key: EXIT_KEY, door: h.exit }],
      };
      mark(boardKey(HOME_KEY), h.boardMark, 2.55, HOME_KEY);
      mark(EXIT_KEY, h.exitMark, 2.45, HOME_KEY);
      furnish.current = (items) => {
        pieces.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.geometry.dispose();
            (m.material as THREE.Material).dispose();
          }
        });
        pieces.clear();
        const blocks: Obstacle[] = [];
        for (const it of items) {
          const piece = furniture(it.key);
          piece.position.set(it.x, 0, it.z);
          piece.rotation.y = (-it.rot * Math.PI) / 180;
          pieces.add(piece);
          const r = decorItem(it.key)?.r ?? 0;
          if (r > 0) blocks.push({ x: origin.x + it.x, z: origin.z + it.z, r: r * 0.9 });
        }
        places[HOME_KEY].obstacles = [...base, ...blocks];
        el.dataset.furniture = String(items.length);
      };
      furnish.current(live.current.homeItems);
    }
    const inObstacles = places[PRACTICE_KEY].obstacles;
    const inside = () => zone.current !== 'village';
    const here = () => places[zone.current];
    roads.push({ a: { x: 0, z: -2.6 }, b: { x: GYM.x, z: GYM.z + 1.9 }, w: 1.6 });
    const staffMixers: THREE.AnimationMixer[] = [];
    // The villagers: each walks its own round and rests at its stops.
    type Npc = { g: THREE.Group; mixer: THREE.AnimationMixer; walk: THREE.AnimationAction | null; idle: THREE.AnimationAction | null; path: Vec[]; at: number; rest: number; wait: number; moving: boolean };
    const npcs: Npc[] = [];
    if (heroScene && people) {
      const stand = new THREE.Object3D();
      stand.position.set(COACH_AT.x, 0, COACH_AT.z);
      scene.add(stand);
      anchors.push({ id: COACH_KEY, obj: stand, y: HERO_HEIGHT + 0.55, zone: PRACTICE_KEY });
      inObstacles.push({ x: COACH_AT.x, z: COACH_AT.z, r: 0.42 });
    }
    roads.push({ a: { x: 0, z: 2.6 }, b: { x: 0, z: GROUND / 2 }, w: 2.3 });

    // Well roof, lanterns round the square, crates by the houses and banners at the gym.
    const prop = (geo: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, ry = 0) => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      return m;
    };
    const woodM = mat(0x8a5f38, { map: painted('wood'), flatShading: false });
    const darkWood = mat(0x4f3520);
    for (const x of [-0.5, 0.5]) prop(new THREE.BoxGeometry(0.09, 1.5, 0.09), darkWood, x, 0.95, 0);
    const wellRoof = prop(new THREE.ConeGeometry(0.85, 0.5, 4), mat(0x8e3b5f, { map: painted('shingle', 2, 1), flatShading: false }), 0, 1.92, 0, Math.PI / 4);
    wellRoof.scale.z = 0.8;
    const lampM = new THREE.MeshStandardMaterial({ color: 0xfff1b8, emissive: 0xffc35a, emissiveIntensity: 1.6 });
    const lamps: THREE.Sprite[] = [];
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const x = Math.cos(a) * 3.5;
      const z = Math.sin(a) * 3.5;
      prop(new THREE.CylinderGeometry(0.05, 0.07, 2.1, 6), darkWood, x, 1.05, z);
      prop(new THREE.BoxGeometry(0.24, 0.3, 0.24), lampM, x, 2.2, z).castShadow = false;
      prop(new THREE.ConeGeometry(0.24, 0.2, 4), darkWood, x, 2.45, z, Math.PI / 4);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xffc35a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
      halo.position.set(x, 2.2, z);
      halo.scale.setScalar(1.6);
      scene.add(halo);
      lamps.push(halo);
      obstacles.push({ x, z, r: 0.3 });
    }
    buildings.forEach((b, i) => {
      if (b.kind) return; // these have their own yard
      const p = sites[i];
      const ring = Math.hypot(p.x, p.z);
      const side = { x: -p.z / ring, z: p.x / ring };
      const cx = p.x * 0.74 + side.x * 1.5;
      const cz = p.z * 0.74 + side.z * 1.5;
      // Never on a road: the way to the houses further out runs between these buildings.
      if (roads.some((r) => segDist(cx + side.x * 0.3, cz + side.z * 0.3, r) < r.w / 2 + 1.0)) return;
      prop(new THREE.BoxGeometry(0.5, 0.5, 0.5), woodM, cx, 0.25, cz, i);
      prop(new THREE.CylinderGeometry(0.24, 0.24, 0.6, 10), woodM, cx + side.x * 0.6, 0.3, cz + side.z * 0.6);
      obstacles.push({ x: cx + side.x * 0.3, z: cz + side.z * 0.3, r: 0.6 });
    });
    const flags: THREE.Mesh[] = [];
    for (const sx of [-3.3, 3.3]) {
      prop(new THREE.CylinderGeometry(0.05, 0.06, 3.4, 6), darkWood, GYM.x + sx, 1.7, GYM.z + 1.7);
      const flag = prop(new THREE.BoxGeometry(0.03, 1.3, 0.62), mat(0x29483c), GYM.x + sx, 2.6, GYM.z + 2.05);
      prop(new THREE.BoxGeometry(0.04, 0.3, 0.3), mat(0xe4bc63, { metalness: 0.5, roughness: 0.4 }), GYM.x + sx, 2.75, GYM.z + 2.05).castShadow = false;
      flags.push(flag);
      obstacles.push({ x: GYM.x + sx, z: GYM.z + 1.7, r: 0.3 });
    }
    // Chimney smoke and motes drifting in the light.
    const smoke: THREE.Sprite[] = [];
    buildings.forEach((_, i) => {
      const p = sites[i];
      for (let k = 0; k < 3; k++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xf2efe8, transparent: true, opacity: 0, depthWrite: false }));
        sp.userData = { x: p.x, z: p.z, off: k / 3 + i * 0.13 };
        scene.add(sp);
        smoke.push(sp);
      }
    });
    const moteGeo = new THREE.BufferGeometry();
    const motePos: number[] = [];
    for (let i = 0; i < 140; i++) motePos.push((R() - 0.5) * 30, 0.4 + R() * 3.4, (R() - 0.5) * 30);
    moteGeo.setAttribute('position', new THREE.Float32BufferAttribute(motePos, 3));
    const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ map: softDot(), color: 0xffe9a8, size: 0.14, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(motes);

    const groundGeo = new THREE.PlaneGeometry(GROUND, GROUND, 110, 110);
    groundGeo.rotateX(-Math.PI / 2);
    const gp = groundGeo.attributes.position;
    for (let i = 0; i < gp.count; i++) gp.setY(i, hillAt(gp.getX(i), gp.getZ(i)));
    groundGeo.computeVertexNormals();
    const ground3d = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: groundTexture(roads, R, phone ? 1024 : 2048), roughness: 1 }));
    // The painted ground pictures take over as soon as they have loaded; until then (or without them)
    // the ground drawn in code stays.
    const groundExtras: THREE.Texture[] = [];
    let groundGone = false;
    loadGroundTiles()
      .then((tiles) => {
        if (groundGone) return;
        const splat = splatMap();
        const roadsOver = groundTexture(roads, rng(5), phone ? 1024 : 2048, true);
        groundExtras.push(splat);
        const old = ground3d.material as THREE.MeshStandardMaterial;
        ground3d.material = paintedGround(tiles, splat, roadsOver);
        old.map?.dispose();
        old.dispose();
        el.dataset.ground = 'painted';
      })
      .catch(() => undefined);
    ground3d.receiveShadow = true;
    scene.add(ground3d);

    const onDirt = (x: number, z: number) =>
      Math.hypot(x, z) < 3.5 || roads.some((r) => segDist(x, z, r) < r.w / 2 + 0.3) || (Math.abs(x - GYM.x) < 3.1 && z > GYM.z - 2.6 && z < GYM.z + 1.9);

    // Trees in the village: each one is something to walk around (and a dot on the map).
    const villageTrees: Vec[] = [];
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
      villageTrees.push({ x, z });
      occluder(tr, x, z, 1.3);
      placed++;
    }

    // Woods on the hills: two instanced meshes for all of them.
    const far = phone ? 110 : 190;
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 1.6, 5), mat(0x5d4027), far);
    const crowns = new THREE.InstancedMesh(shaded(new THREE.IcosahedronGeometry(1, 1)), mat(0xffffff, { vertexColors: true, flatShading: false }), far * 3);
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

    // Grass: tens of thousands of fine, curved blades in one draw call. Each blade is dark at the root
    // and light at the tip, leans over, and moves with gusts that travel across the meadow.
    const bladeGeo = new THREE.PlaneGeometry(0.075, 1, 1, 4);
    bladeGeo.translate(0, 0.5, 0);
    const bp = bladeGeo.attributes.position;
    const shade: number[] = [];
    for (let i = 0; i < bp.count; i++) {
      const y = bp.getY(i);
      bp.setX(i, bp.getX(i) * (1 - Math.pow(y, 1.6) * 0.94));
      shade.push(0.6 + y * 0.62, 0.66 + y * 0.5, 0.5 + y * 0.22);
    }
    bladeGeo.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
    bladeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(bp.count).fill([0, 1, 0]).flat(), 3));
    const wind = { value: 0 };
    const bladeMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, vertexColors: true });
    bladeMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = wind;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          '#ifdef USE_INSTANCING',
          '  vec4 root = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);',
          '  float lift = position.y * position.y;',
          '  float gust = 0.5 + 0.5 * sin(uTime * 0.6 + root.x * 0.11 + root.z * 0.08);',
          '  float sway = (sin(uTime * 1.9 + root.x * 1.3 + root.z * 0.9) * 0.35 + gust * 0.9) * lift;',
          // z is scaled with the blade's height, x is not: the lean and the sway stay in proportion.
          '  transformed.z += lift * 0.35 + sway * 0.45;',
          '  transformed.x += sway * 0.07;',
          '#endif',
        ].join('\n'),
      );
    };
    // Only tufts: clumps of taller grass where the ground picture shows tall or lush grass. A whole
    // field of loose blades cost a lot of drawing for little; the patches on the ground do that work now.
    const blades = phone ? 5000 : 12000;
    const grass = new THREE.InstancedMesh(bladeGeo, bladeMat, blades);
    grass.frustumCulled = false; // its bounds are those of one blade
    const TALL = new THREE.Color(0x4f9a3a);
    const LUSH = new THREE.Color(0x76bd48);
    const DRY = new THREE.Color(0xb9c05a);
    const E = new THREE.Euler();
    let made = 0;
    const blade = (x: number, z: number, tall: number, w: readonly number[]) => {
      const hgt = (0.16 + R() * 0.16) * tall;
      grass.setMatrixAt(made, M.compose(new THREE.Vector3(x, hillAt(x, z), z), Q.setFromEuler(E.set((R() - 0.5) * 0.5, R() * Math.PI * 2, 0)), new THREE.Vector3(1.2 + R() * 0.9, hgt, hgt)));
      col.copy(LUSH).lerp(TALL, Math.min(1, w[1] * 1.4)).lerp(DRY, Math.min(1, w[2]) * 0.8);
      grass.setColorAt(made, col);
      made++;
    };
    for (let i = 0; i < blades * 6 && made < blades - 6; i++) {
      const a = R() * Math.PI * 2;
      const r = Math.sqrt(R()) * 26;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (onDirt(x, z) || obstacles.some((o) => o.r > 0.9 && Math.hypot(x - o.x, z - o.z) < o.r - 0.3)) continue;
      const w = terrainAt(x, z);
      // Many in tall grass, some in the meadow and the dry grass, none on clover or bare earth.
      if (R() > w[1] * 0.9 + w[0] * 0.16 + w[2] * 0.22) continue;
      const tall = 1 + w[1] * 0.9 + R() * 0.4;
      for (let k = 0; k < 6; k++) blade(x + (R() - 0.5) * 0.24, z + (R() - 0.5) * 0.24, tall, w);
    }
    grass.count = made;
    grass.receiveShadow = true;
    scene.add(grass);
    // Bushes along the edges of the meadow and between the houses.
    const bushes = new THREE.InstancedMesh(shaded(new THREE.IcosahedronGeometry(0.5, 2)), mat(0xffffff, { vertexColors: true, flatShading: false }), phone ? 46 : 80);
    let bushN = 0;
    for (let i = 0; i < 3000 && bushN < bushes.count; i++) {
      const a = R() * Math.PI * 2;
      const r = 5 + R() * 17;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (onDirt(x, z) || roads.some((rd) => segDist(x, z, rd) < rd.w / 2 + 1.3) || obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.7) || spots.some((sp) => Math.hypot(x - sp.door.x, z - sp.door.z) < 2.6)) continue;
      const w = 0.6 + R() * 0.6;
      bushes.setMatrixAt(bushN, M.compose(new THREE.Vector3(x, hillAt(x, z) + 0.2 * w, z), Q.setFromEuler(E.set(0, R() * 6, 0)), new THREE.Vector3(w, w * (0.6 + R() * 0.25), w * (0.8 + R() * 0.4))));
      bushes.setColorAt(bushN, col.setHex(LEAVES[Math.floor(R() * LEAVES.length)]));
      bushN++;
    }
    bushes.count = bushN;
    bushes.castShadow = true;
    bushes.receiveShadow = true;
    scene.add(bushes);
    // Flowers in the meadow and stones along the roads.
    const petals = [0xf2f0ea, 0xf4c542, 0xe8536b, 0xb07ae0, 0xff9a52];
    const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshLambertMaterial(), phone ? 320 : 600);
    let fl = 0;
    for (let i = 0; i < 4000 && fl < flowers.count; i++) {
      const a = R() * Math.PI * 2;
      const r = 3.6 + Math.sqrt(R()) * 20;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (onDirt(x, z) || obstacles.some((o) => o.r > 0.9 && Math.hypot(x - o.x, z - o.z) < o.r)) continue;
      flowers.setMatrixAt(fl, M.compose(new THREE.Vector3(x, hillAt(x, z) + 0.22 + R() * 0.12, z), Q.identity(), new THREE.Vector3(1, 0.7, 1)));
      flowers.setColorAt(fl, col.setHex(petals[Math.floor(R() * petals.length)]));
      fl++;
    }
    flowers.count = fl;
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.3, 0), mat(0x9a968c), 46);
    for (let i = 0; i < rocks.count; i++) {
      const rd = roads[Math.floor(R() * roads.length)];
      const u = R();
      const sideways = (rd.w / 2 + 0.35 + R() * 0.5) * (R() > 0.5 ? 1 : -1);
      const len = Math.hypot(rd.b.x - rd.a.x, rd.b.z - rd.a.z) || 1;
      const x = rd.a.x + (rd.b.x - rd.a.x) * u - ((rd.b.z - rd.a.z) / len) * sideways;
      const z = rd.a.z + (rd.b.z - rd.a.z) * u + ((rd.b.x - rd.a.x) / len) * sideways;
      const sc = 0.4 + R() * 0.9;
      rocks.setMatrixAt(i, M.compose(new THREE.Vector3(x, hillAt(x, z) + 0.05, z), Q.setFromEuler(E.set(R(), R() * 3, R())), new THREE.Vector3(sc, sc * 0.7, sc)));
    }
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    scene.add(flowers, rocks);

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
    // The model's own motions (walk and run from gait analysis, idle, cheer); null while the stand-in shows.
    let mixer: THREE.AnimationMixer | null = null;
    const motions: Partial<Record<HeroMotion, THREE.AnimationAction>> = {};
    let motion: HeroMotion | null = null;
    const play = (next: HeroMotion) => {
      const to = motions[next];
      if (!to || motion === next) return;
      const from = motion ? motions[motion] : null;
      to.reset().setEffectiveWeight(1).play();
      if (from) from.crossFadeTo(to, 0.22, false);
      motion = next;
    };
    if (heroScene) {
      loadModel(heroScene.url)
        .then((gltf) => {
          if (cancelled) return;
          const model = cloneSkinned(gltf.scene);
          model.traverse((o) => {
            if (isToggleNode(o.name)) o.visible = heroScene.visible.has(o.name);
            const m = o as THREE.Mesh;
            if (m.isMesh) {
              const mm = (m.material as THREE.MeshStandardMaterial).clone();
              const base = mm.name.replace(/\.\d+$/, '');
              dress(mm, base, heroScene.tints[base as keyof typeof heroScene.tints], heroScene.fabric);
              m.material = mm;
              m.castShadow = true;
              m.frustumCulled = false; // the bounds are those of the rest pose
            }
          });
          const box = new THREE.Box3().setFromObject(model.getObjectByName('body') ?? model);
          const k = HERO_HEIGHT / Math.max(0.5, box.max.y - box.min.y);
          const holder = new THREE.Group();
          holder.add(model);
          holder.scale.setScalar(k);
          holder.position.y = -box.min.y * k;
          figure.clear();
          figure.add(holder);
          mixer = new THREE.AnimationMixer(model);
          for (const clip of gltf.animations) motions[clip.name as HeroMotion] = mixer.clipAction(clip);
          play('idle');
          // The coach waits by the TV: the same model in the practice colours, breathing quietly.
          const breathe = gltf.animations.find((c) => c.name === 'idle');
          const staff = (x: number, z: number, wear: Set<string>, tints: Record<string, string>, face: number, fabric: string | null = null, src = gltf) => {
            const cm = cloneSkinned(src.scene);
            cm.traverse((o) => {
              if (isToggleNode(o.name)) o.visible = wear.has(o.name);
              const m = o as THREE.Mesh;
              if (m.isMesh) {
                const mm = (m.material as THREE.MeshStandardMaterial).clone();
                const base = mm.name.replace(/\.\d+$/, '');
                dress(mm, base, tints[base], fabric);
                m.material = mm;
                m.castShadow = true;
                m.frustumCulled = false;
              }
            });
            // Another body has another height: every figure stands as tall as the hero, a touch more.
            const own = src === gltf ? box : new THREE.Box3().setFromObject(cm.getObjectByName('body') ?? cm);
            const kk = (src === gltf ? k : HERO_HEIGHT / Math.max(0.5, own.max.y - own.min.y)) * 1.05;
            const g = new THREE.Group();
            g.add(cm);
            g.scale.setScalar(kk);
            g.position.set(x, -own.min.y * kk, z);
            g.rotation.y = face;
            scene.add(g);
            const still = src.animations.find((c) => c.name === 'idle') ?? breathe;
            if (still) {
              const mx = new THREE.AnimationMixer(cm);
              mx.clipAction(still).play();
              // Not all breathing in step.
              mx.setTime(staffMixers.length * 0.9);
              staffMixers.push(mx);
            }
          };
          if (people) {
            const face = Math.atan2(TV_SPOT.x - COACH_AT.x, TV_SPOT.z + 1.6 - COACH_AT.z);
            const plain = () => staff(COACH_AT.x, COACH_AT.z, COACH_WEAR, COACH_TINT, face);
            // The patient's own therapist, as they made themselves; else a figure in the practice colours.
            const cs = coachLook ? hero3dScene(coachLook) : null;
            if (cs) {
              loadModel(cs.url)
                .then((g2) => { if (!cancelled) staff(COACH_AT.x, COACH_AT.z, cs.visible, cs.tints, face, cs.fabric, g2); })
                .catch(() => { if (!cancelled) plain(); });
            } else plain();
          }
          // And one by the programme board in each training house.
          for (const tr of trainers) staff(tr.at.x, tr.at.z, tr.wear, tr.tint, tr.face, tr.fabric);
          // Villagers. Their own model when they have one; until then this model in other clothes.
          (people ? VILLAGERS : []).forEach((v, n) => {
            const doorOf = (key: string) => {
              const i = buildings.findIndex((b) => b.key === key);
              if (i < 0) return null;
              // Beside the door, not on it: that spot is where the hero stands.
              const d = sites[i].door;
              const len = Math.hypot(d.x, d.z) || 1;
              return { x: d.x + (-d.z / len) * 1.1, z: d.z + (d.x / len) * 1.1 };
            };
            const path = v.route.map((stop) => routePoint(stop, doorOf)).filter((pt): pt is Vec => !!pt);
            if (path.length < 2) return;
            const place = (src: typeof gltf, own: boolean) => {
              if (cancelled) return;
              const fig = cloneSkinned(src.scene);
              const wear = new Set(v.wear);
              fig.traverse((o) => {
                if (!own && isToggleNode(o.name)) o.visible = wear.has(o.name);
                const m = o as THREE.Mesh;
                if (m.isMesh) {
                  if (!own) {
                    const mm = (m.material as THREE.MeshStandardMaterial).clone();
                    const base = mm.name.replace(/\.\d+$/, '');
                    dress(mm, base, v.tint[base], v.fabric ?? null);
                    m.material = mm;
                  }
                  m.castShadow = true;
                  m.frustumCulled = false;
                }
              });
              const fb = own ? new THREE.Box3().setFromObject(fig) : box;
              const fk = own ? HERO_HEIGHT / Math.max(0.5, fb.max.y - fb.min.y) : k;
              const g = new THREE.Group();
              const inner = new THREE.Group();
              inner.add(fig);
              inner.scale.setScalar(fk * (0.96 + n * 0.03));
              inner.position.y = -fb.min.y * fk;
              g.add(inner);
              g.position.set(path[0].x, 0, path[0].z);
              scene.add(g);
              const mx = new THREE.AnimationMixer(fig);
              const clip = (name: string) => src.animations.find((c) => c.name.toLowerCase().includes(name)) ?? null;
              const walk = clip('walk') ? mx.clipAction(clip('walk')!) : null;
              const idle = clip('idle') ? mx.clipAction(clip('idle')!) : null;
              idle?.play();
              npcs.push({ g, mixer: mx, walk, idle, path, at: 0, rest: v.rest, wait: 1 + n * 1.7, moving: false });
              anchors.push({ id: `npc:${v.key}`, obj: g, y: HERO_HEIGHT + 0.3 });
              el.dataset.villagers = String(npcs.length);
            };
            if (v.model) loadModel(v.model).then((own) => place(own, true)).catch(() => place(gltf, false));
            else place(gltf, false);
          });
          el.dataset.hero = 'model';
        })
        .catch((err) => { if (import.meta.env.DEV) console.warn("village figures", err); /* the stand-in stays */ });
    }

    // Where the hero is going: a ring on the ground.
    const marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(heroColor), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    marker.rotation.x = -Math.PI / 2;
    // The route to a chosen place: a trail of gold dots on the ground and a beam of light at the end.
    const TRAIL = 90;
    const trail = new THREE.InstancedMesh(new THREE.CircleGeometry(0.11, 10), new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.95, depthWrite: false }), TRAIL);
    trail.count = 0;
    trail.frustumCulled = false;
    scene.add(trail);
    const trailAt: (Vec | null)[] = [];
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.5, 5, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(beam);
    const flat = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    const dotM = new THREE.Matrix4();
    const layTrail = (points: Vec[]) => {
      trailAt.length = 0;
      for (let i = 1; i < points.length && trailAt.length < TRAIL; i++) {
        const a = points[i - 1];
        const b = points[i];
        const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 0.7));
        for (let k = 1; k <= n && trailAt.length < TRAIL; k++) trailAt.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
      }
      trailAt.forEach((d, i) => trail.setMatrixAt(i, dotM.copy(flat).setPosition(d!.x, 0.07, d!.z)));
      trail.count = trailAt.length;
      trail.instanceMatrix.needsUpdate = true;
    };
    const clearTrail = () => {
      trail.count = 0;
      trailAt.length = 0;
      (beam.material as THREE.MeshBasicMaterial).opacity = 0;
      if (track) track.current.target = null;
    };
    let destination: string | null = null;
    const announce = (k: string | null) => {
      if (k === destination) return;
      destination = k;
      if (k) el.dataset.destination = k;
      else delete el.dataset.destination;
      cb.current.onDestination?.(k);
    };
    marker.position.y = 0.06;
    scene.add(marker);

    let goal: { target: Vec; path: Vec[]; key: string | null; run: boolean; then?: string } | null = null;
    let stuck = 0;
    walkTo.current = (p, k, then) => {
      const target = inside() ? clampRect(reachable(p, here().obstacles, 1e6), here().rect) : reachable(p, obstacles, B);
      // A few steps are walked; anything further is a run.
      // Round the buildings, not into them: corner points first, the target last.
      const path = findPath(pos.current, target, inside() ? here().obstacles : obstacles, inside() ? { rect: here().rect } : { bound: B });
      goal = { target: path.shift() ?? target, path, key: k, then, run: !inside() && Math.hypot(target.x - pos.current.x, target.z - pos.current.z) > 4.5 };
      stuck = 0;
      marker.position.set(target.x, 0.06, target.z);
      (marker.material as THREE.MeshBasicMaterial).opacity = k ? 0 : 0.9;
      el.dataset.walking = '1';
      // A walk to a place shows its route; a tap on the ground is just a tap.
      if (k) {
        layTrail([pos.current, goal.target, ...path]);
        beam.position.set(target.x, 2.5, target.z);
        (beam.material as THREE.MeshBasicMaterial).opacity = 0.32;
        if (track) track.current.target = inside() ? null : target;
      } else clearTrail();
      announce(k ? then ?? k : null);
    };
    turn.current = (deg) => { camAngle.current += THREE.MathUtils.degToRad(deg); };
    // Through the practice door: a short fade, then the hero stands in the other place.
    let switching = 0;
    const travel = (to: string, then?: string) => {
      clearTrail();
      if (!then) announce(null);
      const veil = fade.current;
      if (veil) veil.style.opacity = '1';
      goal = null;
      delete el.dataset.walking;
      (marker.material as THREE.MeshBasicMaterial).opacity = 0;
      window.clearTimeout(switching);
      switching = window.setTimeout(() => {
        const spot = to === 'village' ? (here()?.outside ?? VILLAGE_LAYOUT.spawn) : places[to].entry;
        zone.current = to;
        pos.current.x = spot.x;
        pos.current.z = spot.z;
        // Into a room: facing in. Out again: facing the square.
        facing.current = to === 'village' ? Math.atan2(-spot.x, -spot.z) : places[to].face;
        hero.rotation.y = facing.current;
        camAngle.current = 0;
        first = true;
        el.dataset.zone = to;
        cb.current.onZone?.(to);
        if (veil) veil.style.opacity = '0';
        if (then) goTo.current(then);
      }, reduce ? 0 : 260);
    };
    goTo.current = (k) => {
      if (inside()) {
        const local = here().spots.find((sp) => sp.key === k);
        if (local) walkTo.current(local.door, k);
        else walkTo.current(here().exit, EXIT_KEY, k === zone.current ? undefined : k);
        return;
      }
      // The board inside a house, asked for from the village: to the door, in, and on to the board.
      if (k === HOME_KEY && homeDoor) {
        walkTo.current(homeDoor, HOME_KEY);
        return;
      }
      if (k === boardKey(HOME_KEY) && homeDoor) {
        walkTo.current(homeDoor, HOME_KEY, k);
        return;
      }
      if (k.startsWith('in:') && places[k.slice(3)]) {
        const j = buildings.findIndex((b) => b.key === k.slice(3));
        if (j >= 0) walkTo.current(sites[j].door, k.slice(3), k);
        return;
      }
      const i = buildings.findIndex((b) => b.key === k);
      const mob = mobs.find((x) => x.key === k);
      if (mob) walkTo.current(mob.door, k);
      else if (k === WELL_KEY && well) walkTo.current(WELL_SPOT, WELL_KEY);
      else if (k === TV_KEY) walkTo.current(PRACTICE_DOOR, PRACTICE_KEY, TV_KEY);
      else if (k === PRACTICE_KEY) walkTo.current(PRACTICE_DOOR, PRACTICE_KEY);
      else if (i >= 0) walkTo.current(sites[i].door, k);
    };
    if (api) {
      api.current = {
        goTo: (k) => goTo.current(k),
        walk: (pt) => {
          // A tap on the map: only in the village itself, where the map is of.
          if (!inside()) walkTo.current(pt, null);
        },
        stop: () => {
          goal = null;
          clearTrail();
          announce(null);
          (marker.material as THREE.MeshBasicMaterial).opacity = 0;
          delete el.dataset.walking;
        },
        use: (k) => {
          // Looking into a home on the street: the one room, with that home's door to come back out of.
          if (k.startsWith('visit:')) {
            const j = buildings.findIndex((b) => b.key === k.slice(6));
            if (j < 0 || inside() || !places[HOME_KEY]) return;
            const d = sites[j].door;
            const len = Math.hypot(d.x, d.z) || 1;
            places[HOME_KEY].outside = { x: d.x * (1 - 0.85 / len), z: d.z * (1 - 0.85 / len) };
            places[HOME_KEY].map = sites[j];
            travel(HOME_KEY);
            return;
          }
          if (!inside() && places[k]) travel(k);
          if (k === EXIT_KEY && inside()) travel('village');
        },
      };
    }
    el.dataset.zone = zone.current;
    if (track) {
      track.current.trees = villageTrees;
      track.current.roads = roads;
      track.current.bound = B;
    }
    const sunBase = sun.position.clone();
    scene.add(sun.target);

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
      // Placing furniture: the tap is a spot on the floor of the home, not somewhere to walk to.
      if (live.current.placing && zone.current === HOME_KEY) {
        const rect = canvas.getBoundingClientRect();
        ray.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
        const floor = new THREE.Vector3();
        if (ray.ray.intersectPlane(ground, floor)) live.current.onFloor?.({ x: floor.x - places[HOME_KEY].at.x, z: floor.z - places[HOME_KEY].at.z });
        return;
      }
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
      // Names stay below the frame with the hero's level at the top of the view.
      // ...and below the minimap and the daily quest on the right, so every name can be tapped.
      const top = px + half > w - 170 ? 206 : 62;
      const py = Math.min(h - 8, Math.max(node.offsetHeight + top, ((1 - v.y) / 2) * h)) - lift;
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
      const dt = Math.min(clock.getDelta(), 0.2);
      if (!visible || document.hidden) return;
      tt += dt;
      const p = pos.current;

      let walking = false;
      const push = stick?.current;
      const force = push ? Math.min(1, Math.hypot(push.x, push.y)) : 0;
      if (push && force > 0.18) {
        // The joystick steers by hand, relative to the view; it takes over from a tapped target.
        if (goal) {
          goal = null;
          (marker.material as THREE.MeshBasicMaterial).opacity = 0;
          clearTrail();
          announce(null);
        }
        el.dataset.walking = '1';
        const run = force > 0.8;
        // Thirsty or stiff: the same gait, slower, so the feet still fit the ground.
        const pace = (run ? 1.12 : 1.1) * live.current.slow;
        const speed = motions.walk && motions.run ? GAIT_SPEED[run ? 'run' : 'walk'] * HERO_HEIGHT * pace : SPEED * (run ? 1 : 0.5) * live.current.slow;
        if (mixer) {
          play(run ? 'run' : 'walk');
          mixer.timeScale = pace;
        }
        const ca = Math.cos(camAngle.current);
        const sa = Math.sin(camAngle.current);
        const dx = (push.x * ca - push.y * sa) / force;
        const dz = (-push.x * sa - push.y * ca) / force;
        const indoors = inside();
        const ahead = { x: p.x + dx * 2, z: p.z + dz * 2 };
        const n = indoors ? { ...stepToward(p, ahead, speed * dt, here().obstacles, 1e6) } : stepToward(p, ahead, speed * dt, obstacles, B);
        if (indoors) Object.assign(n, clampRect({ x: n.x, z: n.z }, here().rect));
        if (Math.hypot(n.x - p.x, n.z - p.z) > 1e-4) facing.current = Math.atan2(dx, dz);
        p.x = n.x;
        p.z = n.z;
        walking = true;
      } else if (goal) {
        // With the model the ground speed is the one its gait was made for, so the feet do not slide.
        const pace = (goal.run ? 1.12 : 1.1) * live.current.slow;
        const speed = motions.walk && motions.run ? GAIT_SPEED[goal.run ? 'run' : 'walk'] * HERO_HEIGHT * pace : SPEED * live.current.slow;
        if (mixer) {
          play(goal.run ? 'run' : 'walk');
          mixer.timeScale = pace;
        }
        const indoors = inside();
        const n = indoors ? { ...stepToward(p, goal.target, speed * dt, here().obstacles, 1e6) } : stepToward(p, goal.target, speed * dt, obstacles, B);
        if (indoors) Object.assign(n, clampRect({ x: n.x, z: n.z }, here().rect));
        const moved = Math.hypot(n.x - p.x, n.z - p.z);
        if (moved > 1e-4) facing.current = Math.atan2(n.x - p.x, n.z - p.z);
        stuck = moved < speed * dt * 0.2 ? stuck + 1 : 0;
        p.x = n.x;
        p.z = n.z;
        walking = true;
        if (n.arrived && goal.path.length) {
          goal.target = goal.path.shift()!;
        } else if (n.arrived || stuck > 40) {
          const k = goal.key;
          const next = goal.then;
          goal = null;
          clearTrail();
          if (!next) announce(null);
          walking = false;
          delete el.dataset.walking;
          (marker.material as THREE.MeshBasicMaterial).opacity = 0;
          if (k === TV_KEY) facing.current = Math.PI;
          if (k === PRACTICE_KEY && n.arrived) travel(PRACTICE_KEY, next);
          else if (k === EXIT_KEY && n.arrived) travel('village', next);
          else if (k && next && places[k] && n.arrived) travel(k, next);
          else if (k && n.arrived) cb.current.onArrive(k);
        }
      }
      if (!walking && !goal && el.dataset.walking) delete el.dataset.walking;
      if (goal?.key && trail.count) {
        // Dots the hero has passed disappear; the beam breathes.
        let changed = false;
        for (let i = 0; i < trailAt.length; i++) {
          const d = trailAt[i];
          if (d && Math.hypot(d.x - p.x, d.z - p.z) < 0.75) {
            for (let j = 0; j <= i; j++) {
              if (trailAt[j]) {
                trailAt[j] = null;
                trail.setMatrixAt(j, dotM.makeScale(0, 0, 0));
                changed = true;
              }
            }
          }
        }
        if (changed) trail.instanceMatrix.needsUpdate = true;
        if (!reduce) (beam.material as THREE.MeshBasicMaterial).opacity = 0.26 + Math.sin(tt * 3) * 0.08;
        // On the way to a place the view swings in behind the hero, unless a finger is turning it.
        if (!down && !reduce) {
          const want = facing.current + Math.PI;
          const turnBy = Math.atan2(Math.sin(want - camAngle.current), Math.cos(want - camAngle.current));
          camAngle.current += turnBy * Math.min(1, dt * 1.4);
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
      if (mixer) {
        if (!walking) {
          mixer.timeScale = 1;
          play(since < 2.6 ? 'cheer' : 'idle');
        }
        if (!reduce || walking) mixer.update(dt);
        figure.position.y = jump * 0.6;
      } else {
        figure.position.y = jump + (walking && !reduce ? Math.abs(Math.sin(tt * 11)) * 0.07 : 0);
        figure.rotation.z = walking && !reduce ? Math.sin(tt * 11) * 0.05 : 0;
      }
      if ((marker.material as THREE.MeshBasicMaterial).opacity > 0) marker.scale.setScalar(1 + Math.sin(tt * 6) * 0.12);

      // The camera follows from behind and above.
      const zoom = narrow ? 1.08 : 1;
      // In the room the camera looks down from higher up, over the wall that is left out.
      const indoor = inside();
      const far2 = (indoor ? 6.6 : 6.6) * zoom;
      camPos.set(p.x + Math.sin(camAngle.current) * far2, (indoor ? 5.6 : 3.5) * zoom, p.z + Math.cos(camAngle.current) * far2);
      if (first || reduce) camera.position.copy(camPos);
      else camera.position.lerp(camPos, Math.min(1, dt * 6));
      first = false;
      camera.lookAt(p.x, indoor ? 1.0 : 1.5, p.z);
      for (const id in places) {
        const pl = places[id];
        pl.group.visible = id === zone.current;
        if (pl.group.visible) for (const wl of pl.walls) wl.group.visible = (camera.position.x - wl.point.x) * wl.normal.x + (camera.position.z - wl.point.z) * wl.normal.z < 0.1;
      }
      // White walls and ceiling spots: the room is brighter and more even than the evening outside.
      skyLight.intensity = indoor ? 2.5 : 1.55;
      sun.intensity = indoor ? 1.6 : 3.1;
      sun.target.position.set(indoor ? here().at.x : 0, 0, indoor ? here().at.z : 0);
      sun.position.copy(sunBase).add(sun.target.position);
      sky.position.copy(camera.position);
      glow.position.copy(camera.position).addScaledVector(sunDir, 250);
      disc.position.copy(glow.position);
      if (track) {
        track.current.x = indoor ? here().map.x : p.x;
        track.current.z = indoor ? here().map.z : p.z;
        track.current.facing = hero.rotation.y;
        track.current.cam = indoor ? 0 : camAngle.current;
        track.current.people = npcs.map((n) => ({ x: n.g.position.x, z: n.g.position.z }));
      }
      if (!reduce) {
        for (const mx of staffMixers) mx.update(dt);
        // Creatures hop on the spot; a beaten one is away until it comes back.
        mobs.forEach((mob, i) => {
          mob.g.visible = !live.current.gone.has(mob.key);
          const hop = Math.abs(Math.sin(performance.now() / 380 + i * 1.7));
          mob.g.position.y = hop * 0.09;
          mob.g.scale.set(1 + (1 - hop) * 0.06, 0.94 + hop * 0.1, 1 + (1 - hop) * 0.06);
        });
        // Villagers only live while the hero is in the village: indoors nobody sees them.
        if (!indoor) {
          for (const npc of npcs) {
            const to = npc.path[(npc.at + 1) % npc.path.length];
            if (npc.wait > 0) {
              npc.wait -= dt;
              if (npc.wait <= 0) {
                npc.moving = true;
                if (npc.walk && npc.idle) npc.walk.reset().play().crossFadeFrom(npc.idle, 0.3, false);
              }
            } else {
              const dx = to.x - npc.g.position.x;
              const dz = to.z - npc.g.position.z;
              const left = Math.hypot(dx, dz);
              const stepLen = GAIT_SPEED.walk * HERO_HEIGHT * dt;
              if (left <= stepLen) {
                npc.g.position.set(to.x, 0, to.z);
                npc.at = (npc.at + 1) % npc.path.length;
                npc.wait = npc.rest;
                npc.moving = false;
                if (npc.walk && npc.idle) npc.idle.reset().play().crossFadeFrom(npc.walk, 0.3, false);
              } else {
                npc.g.position.x += (dx / left) * stepLen;
                npc.g.position.z += (dz / left) * stepLen;
                const want = Math.atan2(dx, dz);
                npc.g.rotation.y += Math.atan2(Math.sin(want - npc.g.rotation.y), Math.cos(want - npc.g.rotation.y)) * Math.min(1, dt * 8);
              }
            }
            npc.mixer.update(dt);
          }
        }
        flags.forEach((f, i) => (f.rotation.y = Math.sin(tt * 2.2 + i) * 0.22));
        lamps.forEach((l, i) => ((l.material as THREE.SpriteMaterial).opacity = 0.5 + Math.sin(tt * 5 + i * 2) * 0.07));
        for (const sp of smoke) {
          const u = (tt * 0.11 + sp.userData.off) % 1;
          sp.position.set(sp.userData.x + u * 0.9, 3.3 + u * 2.8, sp.userData.z + u * 0.3);
          sp.scale.setScalar(0.5 + u * 1.5);
          (sp.material as THREE.SpriteMaterial).opacity = 0.42 * (1 - u) * Math.min(1, u * 6);
        }
        motes.rotation.y = tt * 0.012;
        motes.position.y = Math.sin(tt * 0.35) * 0.18;
      }
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

      // A name shows when its place is the one the hero is in, in view and not too far off; the
      // button itself stays reachable by keyboard.
      const drawn = new Set<string>();
      for (const a of anchors) {
        const node = labels.current.get(a.id);
        if (!node || drawn.has(a.id)) continue;
        if ((a.zone ?? 'village') !== zone.current) {
          if (anchors.some((o) => o.id === a.id && (o.zone ?? 'village') === zone.current)) continue;
          node.style.opacity = '0';
          node.style.pointerEvents = 'none';
          continue;
        }
        drawn.add(a.id);
        const inFront = place(node, a.obj.position.x, a.y, a.obj.position.z);
        const show = inFront && Math.abs(v.x) < 1.05 && v.y < 1.1 && Math.hypot(a.obj.position.x - p.x, a.obj.position.z - p.z) < 19;
        node.style.opacity = show ? '1' : '0';
        node.style.pointerEvents = show ? 'auto' : 'none';
      }
      const plate = nameLabel.current;
      if (plate) place(plate, p.x, HERO_HEIGHT + 0.3 + figure.position.y, p.z);
      const xp = xpLabel.current;
      if (xp) {
        if (c && c.xp > 0 && since < 3.2) {
          xp.textContent = `+${c.xp} XP`;
          place(xp, p.x, HERO_HEIGHT + 0.5, p.z, since * 26);
          xp.style.opacity = String(Math.max(0, Math.min(1, 3.2 - since)));
        } else xp.style.opacity = '0';
      }

      const spot = nearestSpot(p, indoor ? here().spots : spots, indoor ? 1.25 : 1.6)?.key ?? null;
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
      groundGone = true;
      groundExtras.forEach((t) => t.dispose());
      walkTo.current = () => {};
      goTo.current = () => {};
      window.clearTimeout(switching);
      if (api) api.current = null;
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
  const go = (k: string) => goTo.current(k);
  // Nameplates as in an online world: bright letters with a dark outline, straight over the scene.
  const plate = 'absolute left-0 top-0 inline-flex min-h-[32px] items-center whitespace-nowrap rounded-md px-1.5 font-display text-[13.5px] font-extrabold tracking-wide transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a] [text-shadow:0_1px_0_#000,0_-1px_0_#000,1px_0_0_#000,-1px_0_0_#000,0_2px_6px_rgba(0,0,0,.75)]';
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border-2 border-[#3a2f1c] bg-[#1b2a22] shadow-lift', className)}>
      <div ref={host} data-testid="walk-village" className="absolute inset-0 cursor-pointer">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(10,14,8,.38)_100%)]" />
        <div className="pointer-events-none absolute inset-0">
          {buildings.map((b) => (
            <button key={b.key} ref={setLabel(b.key)} type="button" data-spot={b.key} onClick={() => go(b.key)} aria-label={t(`Loop naar ${b.label}`, `Walk to ${b.label}`)}
              className={cn(plate, 'flex-col !items-center leading-none', b.kind ? 'text-white' : 'text-[#ffd76a]')} style={{ transform: 'translate(-9999px,0)' }}>
              {b.alert && <span aria-hidden className="quest-mark text-[26px] leading-none text-[#ffd21f]">!</span>}
              <span className="inline-flex items-center gap-1">{b.flag && <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#4ad06a] ring-1 ring-black/40" />}{b.label}</span>
            </button>
          ))}
          {(creatures ?? []).map((c) => (
            <button key={c.key} ref={setLabel(c.key)} type="button" data-spot={c.key} hidden={gone.has(c.key)} onClick={() => go(c.key)} aria-label={t(`Loop naar ${c.label}`, `Walk to ${c.label}`)}
              className={cn(plate, '!min-h-[28px] text-[12.5px] text-[#ffb3a1]')} style={{ transform: 'translate(-9999px,0)' }}>
              {c.label}
            </button>
          ))}
          {well && (
            <button ref={setLabel(WELL_KEY)} type="button" data-spot={WELL_KEY} onClick={() => go(WELL_KEY)} aria-label={t('Loop naar de waterput', 'Walk to the well')}
              className={cn(plate, 'text-[#9fd8ff]')} style={{ transform: 'translate(-9999px,0)' }}>
              {t('Waterput', 'Well')}
            </button>
          )}
          <button ref={setLabel(TV_KEY)} type="button" data-spot={TV_KEY} onClick={() => go(TV_KEY)} aria-label={t(`Loop naar ${tvLabel}`, `Walk to ${tvLabel}`)}
            className={cn(plate, 'text-white')} style={{ transform: 'translate(-9999px,0)' }}>
            {tvLabel}
          </button>
          <button ref={setLabel(PRACTICE_KEY)} type="button" data-spot={PRACTICE_KEY} onClick={() => go(PRACTICE_KEY)} aria-label={t(`Loop naar ${practiceLabel}`, `Walk to ${practiceLabel}`)}
            className={cn(plate, 'flex-col !items-center leading-none text-white')} style={{ transform: 'translate(-9999px,0)' }}>
            {questOpen && <span aria-hidden className="quest-mark text-[26px] leading-none text-[#ffd21f]">!</span>}
            <span>{practiceLabel}</span>
          </button>
          {buildings.filter((b) => b.kind).map((b) => (
            <button key={boardKey(b.key)} ref={setLabel(boardKey(b.key))} type="button" data-spot={boardKey(b.key)} onClick={() => go(boardKey(b.key))} aria-label={t(`Loop naar het programmabord van ${b.label}`, `Walk to the programme board of ${b.label}`)}
              className={cn(plate, 'flex-col !items-center leading-none text-white')} style={{ transform: 'translate(-9999px,0)' }}>
              {b.alert && <span aria-hidden className="quest-mark text-[26px] leading-none text-[#ffd21f]">!</span>}
              <span>{t('Programma', 'Programme')}</span>
            </button>
          ))}
          {home && (
            <>
              <button ref={setLabel(HOME_KEY)} type="button" data-spot={HOME_KEY} onClick={() => go(HOME_KEY)} aria-label={t(`Loop naar ${home.label}`, `Walk to ${home.label}`)}
                className={cn(plate, 'flex-col !items-center leading-none text-[#b8f0a8]')} style={{ transform: 'translate(-9999px,0)' }}>
                {home.alert && <span aria-hidden className="quest-mark text-[26px] leading-none text-[#ffd21f]">!</span>}
                <span>{home.label}</span>
              </button>
              <button ref={setLabel(boardKey(HOME_KEY))} type="button" data-spot={boardKey(HOME_KEY)} onClick={() => go(boardKey(HOME_KEY))} aria-label={t('Loop naar de inrichtingstafel', 'Walk to the furnishing table')}
                className={cn(plate, 'text-white')} style={{ transform: 'translate(-9999px,0)' }}>
                {t('Inrichten', 'Furnish')}
              </button>
            </>
          )}
          <button ref={setLabel(EXIT_KEY)} type="button" data-spot={EXIT_KEY} onClick={() => go(EXIT_KEY)} aria-label={t('Loop naar de uitgang', 'Walk to the exit')}
            className={cn(plate, 'text-[#ffd76a]')} style={{ transform: 'translate(-9999px,0)' }}>
            {t('Uitgang', 'Exit')}
          </button>
          {heroKey && people && (
            <button ref={setLabel(COACH_KEY)} type="button" data-spot={COACH_KEY} onClick={() => go(TV_KEY)}
              aria-label={questOpen ? t(`${coachName}: je training van vandaag wacht`, `${coachName}: today's workout is waiting`) : t(`Loop naar ${coachName}`, `Walk to ${coachName}`)}
              className={cn(plate, 'flex-col !items-center leading-none text-[#b8f0a8]')} style={{ transform: 'translate(-9999px,0)' }}>
              {questOpen && <span aria-hidden className="quest-mark text-[26px] leading-none text-[#ffd21f]">!</span>}
              <span>{coachName}</span>
            </button>
          )}
          {heroKey && buildings.filter((b) => b.kind).map((b) => {
            const tr = TRAINERS[b.kind!];
            return (
              <button key={trainerKey(b.key)} ref={setLabel(trainerKey(b.key))} type="button" data-spot={trainerKey(b.key)} onClick={() => go(boardKey(b.key))}
                aria-label={t(`Loop naar ${tr.nl}`, `Walk to ${tr.en}`)}
                className={cn(plate, 'text-[#b8f0a8]')} style={{ transform: 'translate(-9999px,0)' }}>
                {t(tr.nl, tr.en)}
              </button>
            );
          })}
          {heroKey && people && VILLAGERS.map((v) => (
            <div key={v.key} ref={setLabel(`npc:${v.key}`)} aria-hidden data-npc={v.key} className={cn(plate, '!min-h-0 text-[12px] text-[#cfe8ff]')} style={{ transform: 'translate(-9999px,0)' }}>{t(v.nl, v.en)}</div>
          ))}
          {heroName && <div ref={nameLabel} aria-hidden className={cn(plate, '!min-h-0 text-[12.5px] text-[#9dff9a]')} style={{ transform: 'translate(-9999px,0)' }}>{heroName}</div>}
          <div ref={fade} aria-hidden className="absolute inset-0 bg-black transition-opacity duration-200" style={{ opacity: 0 }} />
          <div ref={xpLabel} aria-hidden className="absolute left-0 top-0 whitespace-nowrap font-display text-[22px] font-extrabold text-[#ffe27a] [text-shadow:0_2px_0_#000,0_-1px_0_#000,1px_0_0_#000,-1px_0_0_#000,0_0_12px_rgba(255,200,60,.8)]" style={{ opacity: 0, transform: 'translate(-9999px,0)' }} />
        </div>
      </div>
      {/* Stacked on the right edge, clear of the action bar. */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1.5">
        <button type="button" onClick={() => turn.current(-45)} aria-label={t('Draai naar links', 'Turn left')} className="tap grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-[#e4bc63]/70 bg-[#1c2420]/85 text-[#f6e2a6]"><RotateCcw size={18} aria-hidden /></button>
        <button type="button" onClick={() => turn.current(45)} aria-label={t('Draai naar rechts', 'Turn right')} className="tap grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-[#e4bc63]/70 bg-[#1c2420]/85 text-[#f6e2a6]"><RotateCw size={18} aria-hidden /></button>
      </div>
    </div>
  );
}
