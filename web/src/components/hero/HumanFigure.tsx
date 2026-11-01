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

export type FigureLook = Pick<HeroLook, 'skin' | 'hair' | 'outfit'> & Partial<Pick<HeroLook, 'hairColor' | 'eyeColor' | 'frame' | 'build' | 'beard' | 'glasses'>> & { gear?: string[] };

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
export function figureGeometry(look: Pick<FigureLook, 'frame' | 'build'>) {
  const f = look.frame === 'f';
  const b = { slim: 0.9, average: 1, athletic: 1.04, full: 1.16 }[look.build ?? 'average'] ?? 1;
  const shoulder = (f ? 31 : 36) * (look.build === 'athletic' ? 1.1 : look.build === 'full' ? 1.08 : b);
  const chest = (f ? 28 : 31) * b;
  const waist = (f ? 21 : 26) * (look.build === 'full' ? 1.32 : look.build === 'athletic' ? 0.96 : b);
  const hip = (f ? 31 : 27) * (look.build === 'full' ? 1.2 : b);
  const neck = (f ? 6.5 : 8) * (look.build === 'athletic' ? 1.12 : b);
  const limbW = look.build === 'full' ? 1.2 : look.build === 'athletic' ? 1.12 : b;
  const legX = hip * 0.52 + 1;
  return {
    f, b, shoulder, chest, waist, hip, neck, limbW, legX,
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

/** Full figure (front or back). Decorative: the meaning is given by the surrounding labels. */
export function HumanFigure({ look, side = 'front', className, viewBox = '0 0 200 420' }: { look: FigureLook; side?: 'front' | 'back'; className?: string; viewBox?: string }) {
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

  const torso = limb([[100, 70, g.neck], [100, 79, g.shoulder * 0.74], [100, 88, g.shoulder * 0.97], [100, 100, g.shoulder * 0.96], [100, 120, g.chest], [100, 162, g.waist], [100, 198, g.hip], [100, 214, g.hip * 0.96]]);
  const arm = (s: -1 | 1) =>
    limb([[g.armX(s, 88), 88, 7.6 * L], [g.armX(s, 112), 112, 7.4 * L], [g.armX(s, 150), 150, 5.6 * L], [g.armX(s, 176), 176, 5.4 * L], [g.armX(s, 206), 206, 4 * L]]);
  const hand = (s: -1 | 1) => <ellipse cx={g.armX(s, 214)} cy={216} rx={4.6 * L} ry={8} fill={`url(#sk${uid})`} />;
  const leg = (s: -1 | 1) => {
    const x = 100 + s * g.legX;
    return limb([[x, 204, 13.5 * L], [x + s * 0.4, 240, 12 * L], [x - s * 1.5, 298, 7.6 * L], [x - s * 1.8, 330, 8.4 * L], [x - s * 2, 362, 6.4 * L], [x - s * 2.1, 386, 4.6 * L]]);
  };
  const neckPath = limb([[100, 50, g.neck * 0.9], [100, 66, g.neck], [100, 76, g.neck * 1.05]]);
  const jaw = g.f ? 'M100,13 C120,13 122,32 120,44 C118,55 109,61 100,61 C91,61 82,55 80,44 C78,32 80,13 100,13 Z' : 'M100,12 C121,12 123,32 121,45 C119,57 110,63 100,63 C90,63 81,57 79,45 C77,32 79,12 100,12 Z';

  return (
    <svg viewBox={viewBox} className={className} aria-hidden>
      <defs>
        <linearGradient id={`sk${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={skinDark} />
          <stop offset=".3" stopColor={skin} />
          <stop offset=".7" stopColor={skin} />
          <stop offset="1" stopColor={skinDark} />
        </linearGradient>
        <linearGradient id={`kt${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={kit.dark} />
          <stop offset=".35" stopColor={kit.main} />
          <stop offset=".65" stopColor={kit.main} />
          <stop offset="1" stopColor={kit.dark} />
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
      <g fill="#202b26" opacity=".92">
        <path d={torso} clipPath={`url(#shorts${uid})`} />
        <path d={leg(-1)} clipPath={`url(#shorts${uid})`} />
        <path d={leg(1)} clipPath={`url(#shorts${uid})`} />
      </g>
      <path d={`M${100 - g.hip + 2},197 L${100 + g.hip - 2},197`} stroke={kit.main} strokeWidth="2" />
      {[-1, 1].map((s) => {
        const x = 100 + s * (g.legX - 2.1);
        return (
          <g key={s}>
            <path d={`M${x - 7},396 C${x - 8},388 ${x - 5},383 ${x},383 C${x + 5},383 ${x + 8},388 ${x + 7},396 C${x + 7},401 ${x - 7},401 ${x - 7},396 Z`} fill={gold ? '#e2b84a' : '#f7f9f7'} stroke={gold ? '#a77d16' : '#b5c1ba'} strokeWidth="1" />
            <path d={`M${x - 6.5},396 h13`} stroke={kit.main} strokeWidth="2" />
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
          <ellipse cx="91" cy="50" rx="4" ry="2.4" fill="#e8846f" opacity={g.f ? 0.22 : 0.12} />
          <ellipse cx="109" cy="50" rx="4" ry="2.4" fill="#e8846f" opacity={g.f ? 0.22 : 0.12} />
          {[91.5, 108.5].map((x) => (
            <g key={x}>
              <path d={`M${x - 4.6},39 Q${x},35.2 ${x + 4.6},39 Q${x},42 ${x - 4.6},39 Z`} fill="#fff" />
              <circle cx={x} cy="38.8" r="2.15" fill={eye} />
              <circle cx={x} cy="38.8" r="1.05" fill="#141c18" />
              <circle cx={x + 0.7} cy="38.1" r=".55" fill="#fff" />
              <path d={`M${x - 4.8},38.6 Q${x},34.6 ${x + 4.8},38.6`} fill="none" stroke="#2a221c" strokeWidth={g.f ? 1.1 : 0.7} />
            </g>
          ))}
          <path d="M84.5,32.2 Q91,29.4 96.5,31.6" fill="none" stroke={hair} strokeWidth={g.f ? 1.3 : 2} strokeLinecap="round" />
          <path d="M103.5,31.6 Q109,29.4 115.5,32.2" fill="none" stroke={hair} strokeWidth={g.f ? 1.3 : 2} strokeLinecap="round" />
          <path d="M100,40 Q98.6,46 97.4,47.4 Q99.6,49 102.6,47.4" fill="none" stroke={skinDark} strokeWidth="1" strokeLinecap="round" />
          <path d="M94.4,53.2 Q100,51.8 105.6,53.2 Q100,54.4 94.4,53.2 Z" fill={shade(skin, -0.3)} />
          <path d="M94.6,53.4 Q100,57.6 105.4,53.4 Q100,55 94.6,53.4 Z" fill={shade('#c46a5e', 0)} opacity=".75" />
          {look.beard === 'stubble' && <path d={g.f ? '' : 'M80,46 C82,58 90,63 100,63 C110,63 118,58 120,46 C116,52 110,55 100,55 C90,55 84,52 80,46 Z'} fill={hair} opacity=".28" />}
          {look.beard === 'beard' && <path d="M79,44 C80,60 90,67 100,67 C110,67 120,60 121,44 C116,50 112,58 100,57.5 C88,58 84,50 79,44 Z M94,50.6 Q100,49 106,50.6 Q100,52 94,50.6 Z" fill={hair} fillRule="evenodd" />}
          {(look.beard === 'moustache' || look.beard === 'beard') && <path d="M93.4,51.4 Q100,47.6 106.6,51.4 Q100,50.2 93.4,51.4 Z" fill={hair} />}
          {look.glasses && look.glasses !== 'none' && (
            <g fill="none" stroke="#202b26" strokeWidth="1.3">
              {look.glasses === 'round' ? (
                <>
                  <circle cx="91.5" cy="38.8" r="6.2" />
                  <circle cx="108.5" cy="38.8" r="6.2" />
                </>
              ) : (
                <>
                  <rect x="84.6" y="34" width="13.4" height="9.6" rx="2" />
                  <rect x="102" y="34" width="13.4" height="9.6" rx="2" />
                </>
              )}
              <path d="M97.8,38.2 Q100,36.8 102.2,38.2 M84.6,37.6 L79.8,36.4 M115.4,37.6 L120.2,36.4" />
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
    </svg>
  );
}
