import { useId } from 'react';
import type { HeroLook } from '@shared/hero';

/**
 * A full-body human figure, drawn from the patient's own choices (body type, build, skin, face,
 * hair, kit). The same geometry places the pain points of the body map on the patient's own
 * character. Coordinates: 200 × 420, centre line x = 100; left/right are the person's own sides.
 */

export const SKIN_TONES: Record<string, string> = {
  s1: '#f8e0d0', s2: '#f1d0b5', s3: '#e6b994', s4: '#d9a77f', s5: '#c68e66',
  s6: '#ad7550', s7: '#8f5c3c', s8: '#74472d', s9: '#5a3522', s10: '#432719',
};
export const HAIR_COLOURS: Record<string, string> = {
  black: '#1e1a17', darkbrown: '#3b2a20', brown: '#6b4a2f', blond: '#c9a15a', red: '#a2482a', grey: '#a19f9a',
};
export const EYE_COLOURS: Record<string, string> = {
  brown: '#5a3a22', darkbrown: '#2f2016', blue: '#4a7aa8', green: '#5f8a5a', hazel: '#8a6a3a', grey: '#7d8a92',
};
export const KIT: Record<string, { main: string; dark: string; soft: string }> = {
  forest: { main: '#29483c', dark: '#1d362d', soft: '#e6eee8' },
  sand: { main: '#a88f63', dark: '#7d6a47', soft: '#f3efe7' },
  ocean: { main: '#1d5f99', dark: '#164a78', soft: '#e7f0f9' },
  berry: { main: '#8e3b5f', dark: '#6d2d49', soft: '#f6e7ee' },
  slate: { main: '#46554e', dark: '#34433c', soft: '#e8eee9' },
  sun: { main: '#b5781a', dark: '#8a5b12', soft: '#fbf0d9' },
};

export type FigureLook = Pick<HeroLook, 'skin' | 'hair' | 'outfit'> & Partial<Pick<HeroLook, 'hairColor' | 'eyeColor' | 'frame' | 'build' | 'beard' | 'glasses' | 'sport'>> & {
  gear?: string[];
  /** Personal photo key (custom_*), shown instead of the generated photo. */
  photo?: string | null;
  /** Body composition from the patient's own measurements (0–1 each); overrides `build`. */
  body?: { fat: number; muscle: number; kind?: 'lean' | 'athletic' | 'muscular' | 'average' | 'soft' | 'full' } | null;
};

type Pt = [number, number, number]; // x, y, half width

/** Darken (amount < 0) or lighten a hex colour. */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Smooth closed outline around a centre line with a width per point (limbs, torso). */
function limb(points: Pt[]) {
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  points.forEach(([x, y, w], i) => {
    const [px, py] = points[Math.max(0, i - 1)];
    const [nx, ny] = points[Math.min(points.length - 1, i + 1)];
    let dx = nx - px;
    let dy = ny - py;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    left.push([x - dy * w * -1, y - dx * w]);
    right.push([x + dy * w * -1, y + dx * w]);
  });
  const ring = [...left, ...right.reverse()];
  // Catmull-Rom → cubic Bézier through all outline points.
  const p = (i: number) => ring[(i + ring.length) % ring.length];
  let d = `M${p(0)[0].toFixed(1)},${p(0)[1].toFixed(1)}`;
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = p(i - 1);
    const [x1, y1] = p(i);
    const [x2, y2] = p(i + 1);
    const [x3, y3] = p(i + 2);
    const c1 = [x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6];
    const c2 = [x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }
  return d + 'Z';
}

/** Body proportions for a body type and build (all positions in the 200 × 420 frame). */
export function figureGeometry(look: Pick<FigureLook, 'frame' | 'build' | 'body'>) {
  const f = look.frame === 'f';
  const b = { slim: 0.9, average: 1, athletic: 1.04, full: 1.16 }[look.build ?? 'average'] ?? 1;
  let shoulder = (f ? 31 : 36) * (look.build === 'athletic' ? 1.1 : look.build === 'full' ? 1.08 : b);
  let chest = (f ? 28 : 31) * b;
  let waist = (f ? 21 : 26) * (look.build === 'full' ? 1.32 : look.build === 'athletic' ? 0.96 : b);
  let hip = (f ? 31 : 27) * (look.build === 'full' ? 1.2 : b);
  let neck = (f ? 6.5 : 8) * (look.build === 'athletic' ? 1.12 : b);
  let limbW = look.build === 'full' ? 1.2 : look.build === 'athletic' ? 1.12 : b;
  let armW = limbW;
  let legW = limbW;
  let belly = look.build === 'full' ? 0.12 : 0;
  // Own measurements win: fat mostly widens waist and hips, muscle mostly shoulders, neck and limbs.
  if (look.body) {
    const fat = Math.min(1, Math.max(0, look.body.fat));
    const mus = Math.min(1, Math.max(0, look.body.muscle));
    shoulder = (f ? 31 : 36) * (0.86 + 0.42 * mus + 0.1 * fat);
    chest = (f ? 28 : 31) * (0.84 + 0.3 * mus + 0.42 * fat);
    waist = (f ? 21 : 26) * (0.78 + 0.02 * mus + 1.3 * fat);
    hip = (f ? 31 : 27) * (0.84 + 0.05 * mus + 0.6 * fat);
    neck = (f ? 6.5 : 8) * (0.86 + 0.5 * mus + 0.25 * fat);
    limbW = 0.82 + 0.45 * mus + 0.5 * fat;
    armW = 0.76 + 0.75 * mus + 0.45 * fat;
    legW = 0.8 + 0.42 * mus + 0.75 * fat;
    belly = 0.45 * fat;
  }
  const legX = hip * 0.52 + 1;
  return {
    f, b, shoulder, chest, waist, hip, neck, limbW, armW, legW, belly, legX,
    armX: (side: -1 | 1, y: number) => 100 + side * (shoulder - 3 + (y - 92) * 0.14),
    /** Where each body-map area sits on this figure. */
    points: {
      head: [100, 34], neck: [100, 66],
      shoulder_r: [100 - shoulder + 4, 94], shoulder_l: [100 + shoulder - 4, 94],
      chest: [100, 118], upper_back: [100, 116],
      elbow_r: [100 - shoulder - 7, 152], elbow_l: [100 + shoulder + 7, 152],
      abdomen: [100, 166], lower_back: [100, 176],
      wrist_r: [100 - shoulder - 12, 214], wrist_l: [100 + shoulder + 12, 214],
      hip_r: [100 - hip + 6, 206], hip_l: [100 + hip - 6, 206],
      buttock_l: [100 - legX, 222], buttock_r: [100 + legX, 222],
      thigh_r: [100 - legX, 256], thigh_l: [100 + legX, 256],
      hamstring_l: [100 - legX, 262], hamstring_r: [100 + legX, 262],
      knee_r: [100 - legX * 0.82, 300], knee_l: [100 + legX * 0.82, 300],
      calf_l: [100 - legX * 0.8, 340], calf_r: [100 + legX * 0.8, 340],
      ankle_r: [100 - legX * 0.8, 388], ankle_l: [100 + legX * 0.8, 388],
    } as Record<string, [number, number]>,
  };
}

function Hair({ style, colour, back }: { style: string; colour: string; back: boolean }) {
  const hi = shade(colour, 0.18);
  if (style === 'none') return back ? null : <ellipse cx="94" cy="20" rx="6" ry="3" fill="#fff" opacity=".18" />;
  // Behind the head (long hair, afro, ponytail).
  if (back) {
    if (style === 'long') return <path d="M77,36 C74,14 90,8 100,8 C112,8 127,14 123,38 L127,92 C118,99 82,99 73,92 Z" fill={colour} />;
    if (style === 'afro') return <circle cx="100" cy="32" r="31" fill={colour} />;
    if (style === 'ponytail') return <path d="M116,26 C134,32 136,62 128,86 C124,70 120,50 112,36 Z" fill={colour} />;
    if (style === 'curly') return <path d="M76,40 C70,20 84,6 100,6 C118,6 132,20 124,42 C126,56 120,62 116,58 L84,58 C80,62 72,56 76,40 Z" fill={colour} />;
    return null;
  }
  switch (style) {
    case 'short':
      return <path d="M78,40 C75,16 89,8 100,8 C113,8 126,15 122,40 C121,30 117,24 112,22 C104,26 92,25 84,22 C80,26 79,32 78,40 Z" fill={colour} />;
    case 'buzz':
      return <path d="M79,36 C78,18 89,11 100,11 C112,11 122,18 121,36 C116,22 84,22 79,36 Z" fill={colour} opacity=".75" />;
    case 'long':
      return <path d="M78,46 C74,16 90,8 100,8 C114,8 127,16 122,46 C120,30 114,22 104,20 C98,26 88,30 80,30 C79,35 78,40 78,46 Z" fill={colour} />;
    case 'ponytail':
    case 'bun':
      return (
        <g fill={colour}>
          {style === 'bun' && <circle cx="100" cy="8" r="9" />}
          <path d="M78,40 C75,16 89,9 100,9 C113,9 126,16 122,40 C120,26 112,19 100,19 C88,19 80,26 78,40 Z" />
          <path d="M84,17 C92,13 108,13 116,17" stroke={hi} strokeWidth="1.2" fill="none" opacity=".6" />
        </g>
      );
    case 'curly':
      return (
        <g fill={colour}>
          {[[82, 22], [90, 14], [100, 11], [110, 14], [118, 22], [79, 32], [121, 32], [95, 19], [106, 19]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7.5" />)}
        </g>
      );
    case 'afro':
      return <path d="M76,36 C76,18 88,12 100,12 C112,12 124,18 124,36 C118,24 82,24 76,36 Z" fill={shade(colour, 0.08)} />;
    default:
      return null;
  }
}

/** Small chest mark for the technique item. The shape follows the sport the patient chose. */
function SportMark({ sport }: { sport: string }) {
  const common = { stroke: '#1c2622', strokeWidth: 1.1, fill: '#f4f7f5' };
  if (sport === 'football') return <circle cx="118" cy="128" r="6" {...common} />;
  if (sport === 'cycling') return <g {...common} fill="none"><circle cx="114" cy="132" r="4" /><circle cx="124" cy="132" r="4" /><path d="M114,132 L124,124 L124,132" /></g>;
  if (sport === 'swimming') return <path d="M110,128 q4,-6 8,0 q4,6 8,0" fill="none" stroke="#1d5f99" strokeWidth="1.6" />;
  if (sport === 'tennis') return <g {...common}><circle cx="118" cy="128" r="5" /><path d="M114,124 q4,4 8,0" fill="none" /></g>;
  if (sport === 'hockey') return <path d="M122,118 v12 h-6" fill="none" stroke="#1c2622" strokeWidth="1.6" strokeLinecap="round" />;
  if (sport === 'dance') return <path d="M118,120 v10 M118,122 h4" fill="none" stroke="#8e3b5f" strokeWidth="1.6" strokeLinecap="round" />;
  if (sport === 'fitness') return <path d="M112,128 h4 v-3 h4 v3 h4" fill="none" stroke="#1c2622" strokeWidth="1.5" strokeLinecap="round" />;
  return <path d="M118,122 l1.4,3 3.2,.4 -2.4,2.2 .6,3.2 -2.8,-1.6 -2.8,1.6 .6,-3.2 -2.4,-2.2 3.2,-.4 z" fill="#e2b84a" stroke="#a77d16" strokeWidth=".6" />;
}

/** Full figure (front or back). Decorative: the meaning is given by the surrounding labels. */
export function HumanFigure({ look, side = 'front', className, viewBox = '0 0 200 420', portrait = false }: { look: FigureLook; side?: 'front' | 'back'; className?: string; viewBox?: string; portrait?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const g = figureGeometry(look);
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES.s4;
  const skinDark = shade(skin, -0.16);
  const hair = HAIR_COLOURS[look.hairColor ?? 'darkbrown'] ?? HAIR_COLOURS.darkbrown;
  const eye = EYE_COLOURS[look.eyeColor ?? 'brown'] ?? EYE_COLOURS.brown;
  const kit = KIT[look.outfit] ?? KIT.forest;
  const front = side === 'front';
  const L = g.limbW;
  const gear = new Set(look.gear ?? []);
  const gold = gear.has('gold_shoes');

  // A fuller body gets a belly between chest and waist; a muscular one a V-shape (wide shoulders, narrow waist).
  const torso = limb([[100, 70, g.neck], [100, 79, g.shoulder * 0.74], [100, 88, g.shoulder * 0.97], [100, 100, g.shoulder * 0.96], [100, 120, g.chest], [100, 144, (g.chest + g.waist) / 2 * (1 + g.belly)], [100, 166, g.waist * (1 + g.belly * 0.6)], [100, 198, g.hip], [100, 214, g.hip * 0.96]]);
  const A = g.armW;
  const arm = (s: -1 | 1) =>
    limb([[g.armX(s, 88), 88, 7.6 * A], [g.armX(s, 112), 112, 7.6 * A], [g.armX(s, 150), 150, 5.6 * A], [g.armX(s, 176), 176, 5.6 * A], [g.armX(s, 206), 206, 4 * Math.min(A, 1.15)]]);
  const hand = (s: -1 | 1) => <ellipse cx={g.armX(s, 214)} cy={216} rx={4.6 * L} ry={8} fill={`url(#sk${uid})`} />;
  const leg = (s: -1 | 1) => {
    const x = 100 + s * g.legX;
    const W = g.legW;
    return limb([[x, 204, 13.5 * W], [x + s * 0.4, 240, 12 * W], [x - s * 1.5, 298, 7.6 * Math.min(W, 1.2)], [x - s * 1.8, 330, 8.4 * W], [x - s * 2, 362, 6.4 * Math.min(W, 1.2)], [x - s * 2.1, 386, 4.6]]);
  };
  const neckPath = limb([[100, 50, g.neck * 0.9], [100, 66, g.neck], [100, 76, g.neck * 1.05]]);
  const jaw = g.f ? 'M100,13 C120,13 122,32 120,44 C118,55 109,61 100,61 C91,61 82,55 80,44 C78,32 80,13 100,13 Z' : 'M100,12 C121,12 123,32 121,45 C119,57 110,63 100,63 C90,63 81,57 79,45 C77,32 79,12 100,12 Z';

  return (
    <svg viewBox={viewBox} className={className} aria-hidden shapeRendering="geometricPrecision">
      <defs>
        <linearGradient id={`sk${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={skinDark} />
          <stop offset=".3" stopColor={skin} />
          <stop offset=".7" stopColor={skin} />
          <stop offset="1" stopColor={skinDark} />
        </linearGradient>
        <linearGradient id={`kt${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={kit.dark} />
          <stop offset=".28" stopColor={kit.main} />
          <stop offset=".55" stopColor={shade(kit.main, 0.16)} />
          <stop offset=".78" stopColor={kit.main} />
          <stop offset="1" stopColor={kit.dark} />
        </linearGradient>
        <radialGradient id={`iris${uid}`} cx="38%" cy="32%" r="68%">
          <stop offset="0" stopColor={shade(eye, 0.42)} />
          <stop offset=".55" stopColor={eye} />
          <stop offset="1" stopColor={shade(eye, -0.38)} />
        </radialGradient>
        <linearGradient id={`face${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset=".42" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".14" />
        </linearGradient>
        <clipPath id={`top${uid}`}><rect x="0" y={front ? 80 : 74} width="200" height={front ? 118 : 124} /></clipPath>
        <clipPath id={`sleeve${uid}`}><rect x="0" y="80" width="200" height="46" /></clipPath>
        <clipPath id={`shorts${uid}`}><rect x="0" y="194" width="200" height="60" /></clipPath>
      </defs>

      <ellipse cx="100" cy="410" rx={46 * g.b} ry="5" fill="#202b26" opacity=".08" />
      <Hair style={look.hair} colour={hair} back />

      {/* Skin: arms, legs, neck, torso */}
      <g fill={`url(#sk${uid})`}>
        <path d={arm(-1)} />
        <path d={arm(1)} />
        {hand(-1)}
        {hand(1)}
        <path d={leg(-1)} />
        <path d={leg(1)} />
        <path d={neckPath} />
        <path d={torso} />
      </g>
      {front && (
        <g fill="none" stroke={skinDark} strokeWidth="1" opacity=".55">
          <path d={`M${100 - g.legX + 4},300 q4,4 8,0`} />
          <path d={`M${100 + g.legX - 12},300 q4,4 8,0`} />
        </g>
      )}

      {/* Kit: shirt with sleeves, shorts, shoes */}
      <g fill={`url(#kt${uid})`}>
        <path d={torso} clipPath={`url(#top${uid})`} />
        <path d={arm(-1)} clipPath={`url(#sleeve${uid})`} />
        <path d={arm(1)} clipPath={`url(#sleeve${uid})`} />
      </g>
      {front ? (
        <path d={`M${100 - g.neck - 3},80 Q100,${g.f ? 94 : 90} ${100 + g.neck + 3},80`} fill={`url(#sk${uid})`} stroke={kit.dark} strokeWidth="1.2" />
      ) : (
        <path d={`M${100 - g.neck - 2},76 Q100,80 ${100 + g.neck + 2},76`} fill="none" stroke={kit.dark} strokeWidth="1.2" />
      )}
      {front && (
        <g fill="none" stroke={skinDark} strokeWidth=".9" opacity=".6">
          <path d={`M${100 - g.neck - 2},80 q-6,1 -11,4`} />
          <path d={`M${100 + g.neck + 2},80 q6,1 11,4`} />
        </g>
      )}
      {front && g.f && <path d={`M${100 - g.chest + 8},122 q${g.chest - 8},10 ${g.chest * 2 - 16},0`} fill="none" stroke={kit.dark} strokeWidth="1" opacity=".5" />}
      <path d="M100,92 L100,188" stroke={kit.dark} strokeWidth="1.1" opacity=".28" />
      <path d={`M${100 - g.chest * 0.45},108 Q${100 - g.waist * 0.55},150 ${100 - g.hip * 0.35},190`} fill="none" stroke="#fff" strokeWidth="1.4" opacity=".16" />
      <g fill="#202b26" opacity=".92">
        <path d={torso} clipPath={`url(#shorts${uid})`} />
        <path d={leg(-1)} clipPath={`url(#shorts${uid})`} />
        <path d={leg(1)} clipPath={`url(#shorts${uid})`} />
      </g>
      <path d={`M${100 - g.hip + 2},197 L${100 + g.hip - 2},197`} stroke={kit.main} strokeWidth="2" />
      {gear.has('knee_support') && [-1, 1].map((s) => {
        const x = 100 + s * g.legX * 0.82;
        return <rect key={s} x={x - 9 * L} y={290} width={18 * L} height={18} rx={5} fill={kit.main} stroke="#fff" strokeWidth=".8" />;
      })}
      {gear.has('shin_guards') && [-1, 1].map((s) => {
        const x = 100 + s * g.legX * 0.8;
        return <path key={s} d={`M${x - 7},322 h14 v30 q-7,5 -14,0 Z`} fill="#e4ebe7" stroke="#8ea099" strokeWidth=".9" />;
      })}
      {gear.has('crew_socks') && [-1, 1].map((s) => {
        const x = 100 + s * (g.legX - 2);
        return (
          <g key={s}>
            <path d={`M${x - 6.5},362 h13 v28 q-6.5,4 -13,0 Z`} fill={kit.main} />
            <path d={`M${x - 6.5},370 h13 M${x - 6.5},378 h13`} stroke="#fff" strokeWidth="1.6" opacity=".85" />
          </g>
        );
      })}
      {[-1, 1].map((s) => {
        const x = 100 + s * (g.legX - 2.1);
        return (
          <g key={s}>
            <path d={`M${x - 8.2},397 C${x - 9.2},386 ${x - 4},380 ${x + 1},380 C${x + 6.4},380 ${x + 9.4},386 ${x + 8.2},397 C${x + 9},404 ${x - 9},404 ${x - 8.2},397 Z`} fill={gold ? '#f2d56a' : '#f7faf8'} stroke={gold ? '#a77d16' : '#9aaba3'} strokeWidth="1.1" />
            <path d={`M${x - 7.4},396.5 h15`} stroke={gold ? '#e2b84a' : kit.main} strokeWidth="2.6" strokeLinecap="round" />
            <path d={`M${x - 5.5},388 h6`} stroke="#fff" strokeWidth="1.2" opacity=".7" strokeLinecap="round" />
            <path d={`M${x - 8.6},402 h17.2`} stroke={gold ? '#8a6410' : '#66756e'} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );
      })}

      {/* Head */}
      <ellipse cx="79.5" cy="41" rx="3.6" ry="6" fill={skin} stroke={skinDark} strokeWidth=".6" />
      <ellipse cx="120.5" cy="41" rx="3.6" ry="6" fill={skin} stroke={skinDark} strokeWidth=".6" />
      <ellipse cx="100" cy="64" rx={g.neck + 1} ry="3.2" fill={skinDark} opacity=".45" />
      <path d={jaw} fill={`url(#sk${uid})`} />
      {front ? (
        <g>
          <path d={jaw} fill={`url(#face${uid})`} />
          <ellipse cx="100" cy="26" rx="16" ry="9" fill="#fff" opacity=".16" />
          <ellipse cx="91" cy="51" rx="5" ry="2.8" fill="#e8846f" opacity={g.f ? 0.28 : 0.14} />
          <ellipse cx="109" cy="51" rx="5" ry="2.8" fill="#e8846f" opacity={g.f ? 0.28 : 0.14} />
          {[91.5, 108.5].map((x) => (
            <g key={x}>
              <path d={`M${x - 6.4},${portrait ? 39.4 : 40} Q${x},${portrait ? 33.6 : 34.6} ${x + 6.4},${portrait ? 39.4 : 40} Q${x},${portrait ? 45.6 : 44.8} ${x - 6.4},${portrait ? 39.4 : 40} Z`} fill="#fff" />
              <circle cx={x} cy={portrait ? 39.6 : 40} r={portrait ? 3.5 : 3.15} fill={`url(#iris${uid})`} />
              <circle cx={x} cy={portrait ? 39.6 : 40} r={portrait ? 1.7 : 1.5} fill="#141c18" />
              <circle cx={x + 1.05} cy={portrait ? 38.5 : 38.9} r=".75" fill="#fff" />
              <path d={`M${x - 6.6},${portrait ? 38.8 : 39.4} Q${x},${portrait ? 32.8 : 33.8} ${x + 6.6},${portrait ? 38.8 : 39.4}`} fill="none" stroke="#2a221c" strokeWidth={g.f ? 1.55 : 1.2} strokeLinecap="round" />
              <path d={`M${x - 5.4},44 Q${x},45.6 ${x + 5.4},44`} fill="none" stroke={skinDark} strokeWidth=".7" opacity=".65" />
            </g>
          ))}
          <path d="M83,33.2 Q91,29.2 97.2,32.4" fill="none" stroke={hair} strokeWidth={g.f ? 1.7 : 2.3} strokeLinecap="round" />
          <path d="M102.8,32.4 Q109,29.2 117,33.2" fill="none" stroke={hair} strokeWidth={g.f ? 1.7 : 2.3} strokeLinecap="round" />
          <path d="M100,41.2 Q98.2,47.6 96.4,49.6" fill="none" stroke={skinDark} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M96.6,49.8 Q99.2,51.2 103.2,49.8" fill="none" stroke={skinDark} strokeWidth="1" strokeLinecap="round" />
          <circle cx="96.6" cy="50.2" r=".65" fill={skinDark} opacity=".6" />
          <circle cx="103.2" cy="50.2" r=".65" fill={skinDark} opacity=".6" />
          <path d="M92.6,54.4 Q100,52.8 107.4,54.4 Q100,56 92.6,54.4 Z" fill={shade(skin, -0.28)} />
          <path d="M92.8,54.6 Q100,59.8 107.2,54.6 Q100,56.8 92.8,54.6 Z" fill="#c46a5e" />
          <path d="M96.2,55.2 Q100,56.6 103.8,55.2" fill="none" stroke="#fff" strokeWidth=".7" opacity=".5" strokeLinecap="round" />
          {look.beard === 'stubble' && <path d={g.f ? '' : 'M80,46 C82,58 90,63 100,63 C110,63 118,58 120,46 C116,52 110,55 100,55 C90,55 84,52 80,46 Z'} fill={hair} opacity=".28" />}
          {look.beard === 'beard' && <path d="M79,44 C80,60 90,67 100,67 C110,67 120,60 121,44 C116,50 112,58 100,57.5 C88,58 84,50 79,44 Z M94,50.6 Q100,49 106,50.6 Q100,52 94,50.6 Z" fill={hair} fillRule="evenodd" />}
          {(look.beard === 'moustache' || look.beard === 'beard') && <path d="M93.4,51.4 Q100,47.6 106.6,51.4 Q100,50.2 93.4,51.4 Z" fill={hair} />}
          {look.glasses && look.glasses !== 'none' && (
            <g fill="none" stroke="#202b26" strokeWidth="1.45">
              {look.glasses === 'round' ? (
                <>
                  <circle cx="91.5" cy="40" r="7.5" fill="#fff" fillOpacity=".08" />
                  <circle cx="108.5" cy="40" r="7.5" fill="#fff" fillOpacity=".08" />
                </>
              ) : (
                <>
                  <rect x="83.4" y="33.6" width="15.2" height="12.2" rx="2.2" fill="#fff" fillOpacity=".08" />
                  <rect x="101.4" y="33.6" width="15.2" height="12.2" rx="2.2" fill="#fff" fillOpacity=".08" />
                </>
              )}
              <path d="M99,39.2 Q100,37.6 101,39.2 M83.4,38.4 L78.4,36.8 M116.6,38.4 L121.6,36.8" />
            </g>
          )}
        </g>
      ) : (
        <path d="M86,58 Q100,64 114,58" fill="none" stroke={skinDark} strokeWidth=".8" opacity=".5" />
      )}
      {front ? (
        <Hair style={look.hair} colour={hair} back={false} />
      ) : look.hair !== 'none' ? (
        <path d="M78,42 C74,14 90,8 100,8 C112,8 128,14 122,42 C120,52 112,56 100,56 C88,56 80,52 78,42 Z" fill={hair} opacity={look.hair === 'buzz' ? 0.75 : 1} />
      ) : null}
      {!front && look.hair === 'ponytail' && <path d="M96,40 C88,62 92,84 100,92 C108,84 112,62 104,40 Z" fill={hair} />}
      {!front && look.hair === 'bun' && <circle cx="100" cy="14" r="9" fill={hair} />}
      {!front && look.hair === 'long' && <path d="M78,40 C76,70 80,92 84,98 L116,98 C120,92 124,70 122,40 Z" fill={hair} />}
      {/* Gear unlocked by progress */}
      {gear.has('wristbands') && [-1, 1].map((sd) => (
        <rect key={sd} x={g.armX(sd as -1 | 1, 200) - 5 * L} y="196" width={10 * L} height="6" rx="2" fill={kit.main} stroke="#fff" strokeWidth=".8" />
      ))}
      {gear.has('captain') && (
        <g>
          <rect x={g.armX(1, 112) - 8 * L} y="110" width={16 * L} height="8" rx="2" fill="#e2b84a" stroke="#a77d16" strokeWidth=".8" />
          <text x={g.armX(1, 112)} y="116.6" textAnchor="middle" fontSize="7" fontWeight="700" fill="#5b4a2e">C</text>
        </g>
      )}
      {front && gear.has('medal') && (
        <g>
          <path d="M94,80 L100,108 L106,80" fill="none" stroke="#b42318" strokeWidth="3" />
          <circle cx="100" cy="112" r="7" fill="#e2b84a" stroke="#a77d16" strokeWidth="1.2" />
          <path d="M100,108 l1.3,2.7 3,.4 -2.2,2.1 .5,3 -2.6,-1.4 -2.6,1.4 .5,-3 -2.2,-2.1 3,-.4z" fill="#fff" opacity=".85" />
        </g>
      )}
      {gear.has('headband') && <path d="M78.6,30 Q100,22 121.4,30 L121,35.5 Q100,28 79,35.5 Z" fill={kit.main} stroke="#fff" strokeWidth=".6" />}
      {front && look.hair !== 'none' && look.hair !== 'buzz' && (
        <path d="M88,18 Q98,12 108,19" stroke="#fff" strokeWidth="1.6" fill="none" opacity=".28" strokeLinecap="round" />
      )}
      {gear.has('scarf') && (
        <path d={`M${100 - g.neck - 10},72 Q100,96 ${100 + g.neck + 10},72 L${100 + g.neck + 2},88 Q100,102 ${100 - g.neck - 4},90 Z`} fill={kit.main} stroke="#fff" strokeWidth=".7" />
      )}
      {gear.has('sleeve') && <path d={limb([[g.armX(1, 98), 98, 8.4 * L], [g.armX(1, 128), 128, 7.4 * L], [g.armX(1, 156), 156, 6.4 * L]])} fill={kit.dark} />}
      {gear.has('gloves') && [-1, 1].map((sd) => <ellipse key={sd} cx={g.armX(sd as -1 | 1, 214)} cy={214} rx={6.4 * L} ry={9.2} fill={kit.dark} stroke="#fff" strokeWidth=".7" />)}
      {gear.has('watch') && (
        <g>
          <rect x={g.armX(-1, 192) - 5.5} y={184} width={11} height={12} rx={2.5} fill="#1c2622" />
          <circle cx={g.armX(-1, 192)} cy={190} r={3.4} fill="#e7f3fb" stroke="#d7e4ee" strokeWidth=".4" />
          <path d={`M${g.armX(-1, 192)},190 l1.2,-2.1`} stroke="#1c2622" strokeWidth=".7" />
        </g>
      )}
      {front && gear.has('pin') && (
        <g>
          <circle cx="112" cy="108" r="5.4" fill="#e2b84a" stroke="#a77d16" strokeWidth=".9" />
          <path d="M112,104.2 l1.1,2.3 2.5.3 -1.8,1.7.5,2.4 -2.3,-1.2 -2.3,1.2 .5,-2.4 -1.8,-1.7 2.5,-.3 z" fill="#fff" />
        </g>
      )}
      {gear.has('cap') && (
        <g>
          <path d="M74,36 C74,12 88,2 100,2 C114,2 128,12 126,36 C116,22 84,22 74,36 Z" fill={kit.dark} />
          <path d="M116,26 C130,30 140,36 142,40 C130,36 120,33 114,30 Z" fill={kit.main} />
          <path d="M86,14 Q100,8 116,15" stroke="#fff" strokeWidth="1.3" fill="none" opacity=".35" strokeLinecap="round" />
        </g>
      )}
      {gear.has('visor') && !gear.has('cap') && <path d="M70,30 Q100,20 130,30 L132,37 Q100,28 68,37 Z" fill={kit.main} stroke="#fff" strokeWidth=".6" />}
      {gear.has('headphones') && (
        <g fill="#1c2622">
          <path d="M78,38 Q100,6 122,38" fill="none" stroke="#1c2622" strokeWidth="3.4" />
          <rect x="70" y="32" width="12" height="18" rx="4" />
          <rect x="118" y="32" width="12" height="18" rx="4" />
          <rect x="72.2" y="36" width="7.6" height="10" rx="2" fill="#3d4a44" />
          <rect x="120.2" y="36" width="7.6" height="10" rx="2" fill="#3d4a44" />
        </g>
      )}
      {gear.has('crown') && <path d="M76,20 L85,3 L94,16 L100,1 L106,16 L115,3 L124,20 L118,23 L82,23 Z" fill="#f0d56e" stroke="#a77d16" strokeWidth=".9" />}
      {gear.has('yoga_mat') && (
        <g>
          <path d={`M${100 + g.shoulder * 0.2},86 Q${118 + g.shoulder},120 ${112},190`} fill="none" stroke="#6d8f78" strokeWidth="2.2" strokeLinecap="round" />
          {!front && <rect x={118} y={96} width="16" height="78" rx="6" fill="#6d8f78" stroke="#3e5c4a" strokeWidth="1" />}
        </g>
      )}
      {gear.has('belt') && <rect x={100 - g.waist + 4} y={186} width={g.waist * 2 - 8} height={8} rx={2} fill="#2a241c" stroke="#c7a15a" strokeWidth="1.2" />}
      {gear.has('towel') && (
        <path d={`M${100 - g.neck - 8},70 Q100,92 ${100 + g.neck + 8},70 L${100 + g.neck + 6},108 Q${100 + g.neck},96 ${100 + g.neck - 2},112 L${100 + 4},78 Q100,90 ${100 - 6},78 L${100 - g.neck + 2},112 Q${100 - g.neck},96 ${100 - g.neck - 6},108 Z`} fill="#d7ebe4" stroke="#7fa396" strokeWidth=".8" />
      )}
      {gear.has('hr_band') && <rect x={100 - g.chest * 0.55} y={118} width={g.chest * 1.1} height={7} rx={3} fill="#1c2622" />}
      {gear.has('balance_shoes') && [-1, 1].map((s) => {
        const x = 100 + s * (g.legX - 2.1);
        return <path key={s} d={`M${x - 11},400 h22 v6 h-22 Z`} fill="#2f6f9f" stroke="#16324a" strokeWidth=".8" />;
      })}
      {gear.has('spikes') && [-1, 1].map((s) => {
        const x = 100 + s * (g.legX - 2.1);
        return (
          <g key={s} fill="#e2b84a">
            <path d={`M${x - 7},406 l2,6 h-4 Z`} />
            <path d={`M${x},406 l2,6 h-4 Z`} />
            <path d={`M${x + 7},406 l2,6 h-4 Z`} />
          </g>
        );
      })}
      {/* Forearm crutches (walking aid switched on by the professional, e.g. after ACL surgery). */}
      {gear.has('crutches') && [-1, 1].map((sd) => {
        const hx = g.armX(sd as -1 | 1, 214);
        const top = { x: hx - sd * 1, y: 178 };
        const foot = { x: hx + sd * 11, y: 410 };
        return (
          <g key={`crutch${sd}`} data-gear="crutches">
            <line x1={top.x} y1={top.y} x2={foot.x} y2={foot.y} stroke="#7f8f97" strokeWidth="3.4" strokeLinecap="round" />
            <path d={`M${top.x - 6},${top.y + 2} q6,-9 12,0`} fill="none" stroke="#5b6a72" strokeWidth="3" strokeLinecap="round" />
            <line x1={hx - sd * 5} y1={214} x2={hx + sd * 6} y2={215} stroke="#3d4a50" strokeWidth="3.6" strokeLinecap="round" />
            <rect x={foot.x - 3.2} y={foot.y - 3} width={6.4} height={7} rx={2} fill="#2b3236" />
          </g>
        );
      })}
      {front && gear.has('sport_item') && <SportMark sport={look.sport ?? 'other'} />}
    </svg>
  );
}
