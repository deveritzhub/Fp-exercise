import * as THREE from 'three';
import { sign, type Pose, type Rig, type Side } from './rig';

/**
 * The exercises shown as a 3D demonstration: each one a pose for every moment of one repetition.
 * A trial of five, to be checked by the physiotherapist before patients see them with a programme.
 */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const both = <T,>(f: (s: Side) => T): Record<Side, T> => ({ l: f('l'), r: f('r') });

/** One repetition in four parts: go (0–0.4), hold (–0.52), back (–0.9), rest (–1). */
export const PARTS = [0.4, 0.52, 0.9, 1] as const;
export const partOf = (p: number) => PARTS.findIndex((end) => p < end);
/** How far into the movement the figure is (0 at the start, 1 at the turning point). */
export function depth(p: number) {
  if (p < PARTS[0]) return ease(p / PARTS[0]);
  if (p < PARTS[1]) return 1;
  if (p < PARTS[2]) return 1 - ease((p - PARTS[1]) / (PARTS[2] - PARTS[1]));
  return 0;
}

export type Move = {
  key: string;
  nl: string;
  en: string;
  /** Seconds for one repetition. */
  seconds: number;
  /** What to do in each of the four parts. */
  parts: [nl: string, en: string][];
  /** Points to watch. */
  cues: [nl: string, en: string][];
  /** Lying on a mat. */
  lying?: boolean;
  /** Where the camera stands: degrees round the figure (0 = in front, 90 = at its left), height and what it looks at. */
  camera: { turn: number; height: number; look: number; far: number };
  pose: (rig: Rig, p: number) => Pose;
};

const standing = (rig: Rig) => V(0, rig.hipHeight + rig.pelvisDrop, 0);
const armsDown = (s: Side) => ({ upper: V(sign(s) * 0.1, -1, 0.02) });

export const MOVES: Move[] = [
  {
    key: 'squat', nl: 'Squat', en: 'Squat', seconds: 5,
    parts: [['Zak rustig door je knieën', 'Lower slowly, bending your knees'], ['Even vasthouden', 'Hold for a moment'], ['Duw jezelf omhoog', 'Push yourself up'], ['Rust', 'Rest']],
    cues: [
      ['Voeten op schouderbreedte, tenen iets naar buiten.', 'Feet shoulder-width apart, toes slightly out.'],
      ['Billen naar achteren, alsof je op een stoel gaat zitten.', 'Hips back, as if sitting down on a chair.'],
      ['Knieën boven je voeten, rug recht, hielen op de grond.', 'Knees over your feet, back straight, heels on the floor.'],
    ],
    camera: { turn: 55, height: 1.2, look: 0.85, far: 4.3 },
    pose: (rig, p) => {
      const u = depth(p);
      return {
        pelvis: standing(rig).add(V(0, -u * rig.hipHeight * 0.42, -u * 0.26)),
        pitch: u * 0.5,
        spine: u * 0.08,
        head: -u * 0.45,
        legs: both((s) => ({ ankle: V(sign(s) * 0.2, rig.ankleHeight, 0), knee: V(sign(s) * 0.4, 0, 1), foot: rig.footDir.clone().add(V(sign(s) * 0.22, 0, 0)) })),
        // The arms come forward as a counterweight.
        arms: both((s) => ({ upper: V(sign(s) * 0.1, lerp(-1, -0.08, u), lerp(0.02, 1, u)) })),
      };
    },
  },
  {
    key: 'split_squat', nl: 'Split squat', en: 'Split squat', seconds: 5,
    parts: [['Zak recht naar beneden', 'Lower straight down'], ['Even vasthouden', 'Hold for a moment'], ['Duw omhoog via je voorste voet', 'Push up through your front foot'], ['Rust', 'Rest']],
    cues: [
      ['Grote stap: één voet voor, de andere achter op de bal van de voet.', 'A big step: one foot in front, the other behind on the ball of the foot.'],
      ['Romp rechtop, achterste knie zakt richting de grond.', 'Trunk upright, the back knee lowers towards the floor.'],
      ['Voorste knie blijft boven de voet.', 'The front knee stays over the foot.'],
    ],
    camera: { turn: 80, height: 1.15, look: 0.85, far: 4.4 },
    pose: (rig, p) => {
      const u = depth(p);
      return {
        pelvis: standing(rig).add(V(0, -0.07 - u * rig.hipHeight * 0.3, -0.06)),
        pitch: 0.07,
        head: -0.05,
        legs: {
          l: { ankle: V(0.1, rig.ankleHeight, 0.36), knee: V(0.05, 0, 1) },
          // The back foot stands on its ball, heel up.
          r: { ankle: V(-0.1, rig.ankleHeight + 0.1, -0.5), knee: V(0, -0.35, 1), foot: V(0, -0.78, 0.62) },
        },
        // Hands on the hips.
        arms: both((s) => ({ upper: V(sign(s) * 0.55, -1, -0.25), lower: V(-sign(s) * 0.6, -0.3, 0.75) })),
      };
    },
  },
  {
    key: 'glute_bridge', nl: 'Bekkenbrug', en: 'Glute bridge', seconds: 5, lying: true,
    parts: [['Til je bekken op', 'Lift your hips'], ['Span je billen aan en houd vast', 'Squeeze your glutes and hold'], ['Zak rustig terug', 'Lower slowly'], ['Rust', 'Rest']],
    cues: [
      ['Lig op je rug, knieën gebogen, voeten plat op heupbreedte.', 'Lie on your back, knees bent, feet flat hip-width apart.'],
      ['Til je bekken op tot schouders, heupen en knieën één lijn vormen.', 'Lift your hips until shoulders, hips and knees form one line.'],
      ['Niet doorduwen in je onderrug; armen blijven ontspannen naast je liggen.', 'Do not arch your lower back; arms stay relaxed beside you.'],
    ],
    camera: { turn: 70, height: 1.0, look: 0.25, far: 3.6 },
    pose: (rig, p) => {
      const u = depth(p);
      const back = 0.115;
      const lift = u * rig.trunk * 0.42;
      const tau = Math.asin(lift / rig.trunk);
      return {
        // The shoulders stay where they lie; the pelvis rises on the arc round them.
        pelvis: V(0, back + lift, -rig.trunk * (1 - Math.cos(tau))),
        pitch: -(Math.PI / 2 + tau),
        head: tau,
        legs: both((s) => ({ ankle: V(sign(s) * rig.hipWidth * 0.6, rig.ankleHeight, rig.pelvisDrop + rig.thigh * 1.38), knee: V(0, 1, 0), foot: V(0, rig.footDir.y, rig.footDir.z) })),
        arms: both((s) => ({ upper: V(sign(s) * 0.2, -0.1, 1), lower: V(sign(s) * 0.02, -0.02, 1) })),
      };
    },
  },
  {
    key: 'calf_raise', nl: 'Hielheffen staand', en: 'Standing calf raise', seconds: 4,
    parts: [['Kom omhoog op je tenen', 'Rise onto your toes'], ['Even vasthouden', 'Hold for a moment'], ['Zak rustig terug', 'Lower slowly'], ['Rust', 'Rest']],
    cues: [
      ['Sta rechtop, voeten op heupbreedte.', 'Stand tall, feet hip-width apart.'],
      ['Kom zo hoog mogelijk op je tenen, knieën gestrekt.', 'Rise as high as you can onto your toes, knees straight.'],
      ['Zak langzaam terug; houd je zo nodig licht vast.', 'Lower slowly; hold on lightly if you need to.'],
    ],
    camera: { turn: 65, height: 1.1, look: 0.9, far: 4.4 },
    pose: (rig, p) => {
      const u = depth(p);
      const phi = u * 0.6;
      // The heel turns up round the ball of the foot.
      const heel = (s: Side) => {
        const r = rig.ankle[s].clone().sub(rig.ball[s]);
        return rig.ball[s].clone().add(V(r.x, r.y * Math.cos(phi) - r.z * Math.sin(phi), r.y * Math.sin(phi) + r.z * Math.cos(phi)));
      };
      const a = heel('l');
      const rise = a.y - rig.ankle.l.y;
      const fwd = a.z - rig.ankle.l.z;
      return {
        pelvis: standing(rig).add(V(0, rise, fwd)),
        legs: both((s) => {
          const ankle = heel(s);
          return { ankle, foot: rig.ball[s].clone().sub(ankle) };
        }),
        arms: both(armsDown),
      };
    },
  },
  {
    key: 'shoulder_abduction', nl: 'Schouderabductie', en: 'Shoulder abduction', seconds: 5,
    parts: [['Hef je armen zijwaarts', 'Raise your arms sideways'], ['Even vasthouden', 'Hold for a moment'], ['Laat rustig zakken', 'Lower slowly'], ['Rust', 'Rest']],
    cues: [
      ['Sta rechtop, armen langs je lichaam, duimen naar voren.', 'Stand tall, arms by your sides, thumbs forward.'],
      ['Hef je gestrekte armen zijwaarts tot schouderhoogte.', 'Raise your straight arms sideways to shoulder height.'],
      ['Schouders laag: trek ze niet op naar je oren.', 'Shoulders low: do not shrug them towards your ears.'],
    ],
    camera: { turn: 15, height: 1.25, look: 0.92, far: 4.6 },
    pose: (rig, p) => {
      const u = depth(p);
      const alpha = 0.1 + u * 1.47;
      return {
        pelvis: standing(rig),
        legs: both((s) => ({ ankle: rig.ankle[s].clone() })),
        arms: both((s) => {
          const dir = V(sign(s) * Math.sin(alpha), -Math.cos(alpha), 0.04);
          return { upper: dir, lower: dir.clone() };
        }),
      };
    },
  },
];

export const moveByKey = (key: string | null | undefined) => MOVES.find((m) => m.key === key);
