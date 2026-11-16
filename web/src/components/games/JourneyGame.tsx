import { useEffect, useRef, useState } from 'react';
import { JOURNEY, journeyReached } from '@shared/minigames';
import { useI18n } from '@/lib/i18n';
import { GAME_THEME, GameButton, Hud, HudPill, Stage, StopButton, haptic, sfx } from './kit';
import type { GameProps } from './types';

type Pt = { x: number; y: number };

const W = 360;
const H = 980;
/** The village (start, 0 steps) at the bottom, then the 12 milestones winding up to the land of light. */
const XS = [180, 92, 268, 100, 262, 94, 270, 96, 264, 92, 266, 100, 180];
const STOPS: Pt[] = XS.map((x, i) => ({ x, y: 910 - i * 68 }));
const STEPS_AT = [0, ...JOURNEY.map((m) => m.steps)];

/** Each part of the road is a cubic curve that leaves and arrives vertically. */
function controls(i: number): [Pt, Pt, Pt, Pt] {
  const a = STOPS[i] as Pt;
  const b = STOPS[i + 1] as Pt;
  const d = (a.y - b.y) / 2;
  return [a, { x: a.x, y: a.y - d }, { x: b.x, y: b.y + d }, b];
}
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
/** The first part (0..t) of a cubic curve, by de Casteljau. */
function splitCubic([p0, p1, p2, p3]: [Pt, Pt, Pt, Pt], t: number): [Pt, Pt, Pt, Pt] {
  const p01 = lerp(p0, p1, t);
  const p12 = lerp(p1, p2, t);
  const p23 = lerp(p2, p3, t);
  const p012 = lerp(p01, p12, t);
  const p123 = lerp(p12, p23, t);
  return [p0, p01, p012, lerp(p012, p123, t)];
}
/** The part (t0..t1) of a cubic curve. */
function subCubic(c: [Pt, Pt, Pt, Pt], t0: number, t1: number): [Pt, Pt, Pt, Pt] {
  const head = splitCubic(c, t1);
  // Reverse the head, cut off its last part, and turn it back.
  const rev = splitCubic([head[3], head[2], head[1], head[0]], 1 - t0 / t1);
  return [rev[3], rev[2], rev[1], rev[0]];
}
const seg = (c: [Pt, Pt, Pt, Pt]) => `C ${c[1].x} ${c[1].y} ${c[2].x} ${c[2].y} ${c[3].x} ${c[3].y}`;
/** Where the road crosses the river, just below stop 4. */
const BRIDGE = subCubic(controls(3), 0.66, 0.93);
const FULL_ROAD = `M ${STOPS[0]?.x} ${STOPS[0]?.y} ` + STOPS.slice(1).map((_, i) => seg(controls(i))).join(' ');

/** Where the hero stands for these steps: the segment and how far along it. */
function progressOf(total: number): { i: number; t: number } {
  const last = STOPS.length - 1;
  if (total >= (STEPS_AT[last] ?? Infinity)) return { i: last - 1, t: 1 };
  for (let i = 0; i < last; i++) {
    const a = STEPS_AT[i] ?? 0;
    const b = STEPS_AT[i + 1] ?? a + 1;
    if (total < b) return { i, t: Math.max(0, (total - a) / (b - a)) };
  }
  return { i: last - 1, t: 1 };
}

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const TH = GAME_THEME.journey;
/** Fixed little stars in the dusk sky (x, y, size), so the map looks the same every time. */
const SKY_STARS: [number, number, number][] = Array.from({ length: 46 }, (_, k) => {
  const r = (n: number) => ((Math.sin(k * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return [Math.round(r(1) * W), Math.round(140 + r(2) * 780), 0.6 + r(3) * 1.1];
});

/**
 * Step journey: the patient's real total steps put the hero on an illustrated road from the village
 * to the land of light, past twelve milestones. Not timed; "Klaar" (or Stop) ends with the number of
 * milestones reached.
 */
export default function JourneyGame({ onDone, steps }: GameProps) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const total = Math.max(0, Math.floor(steps?.total ?? 0));
  const today = Math.max(0, Math.floor(steps?.today ?? 0));
  const reached = journeyReached(total);
  const next = JOURNEY[reached];
  const [reduced] = useState(prefersReducedMotion);
  const scroller = useRef<HTMLDivElement>(null);
  const walkedRef = useRef<SVGPathElement>(null);
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const fmt = (n: number) => n.toLocaleString(nl ? 'nl-NL' : 'en-GB');

  const { i: segI, t: segT } = progressOf(total);
  const part = splitCubic(controls(segI), segT);
  const hero = part[3];
  const walked = `M ${STOPS[0]?.x} ${STOPS[0]?.y} ` + [...Array.from({ length: segI }, (_, k) => seg(controls(k))), seg(part)].join(' ');

  const finish = () => {
    if (done.current) return;
    done.current = true;
    sfx.tap();
    haptic(12);
    onDoneRef.current(reached);
  };

  // Scroll the map (not the page) so the hero is in view.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const svg = el.querySelector('svg');
    const scale = svg ? svg.clientHeight / H : 1;
    el.scrollTop = Math.max(0, hero.y * scale - el.clientHeight / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The walked road draws itself in once, in glowing gold.
  useEffect(() => {
    if (reduced) return;
    const anim = walkedRef.current?.animate?.([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1600, easing: 'cubic-bezier(.3,.7,.3,1)' });
    return () => anim?.cancel();
  }, [reduced]);

  const label = (k: number) => {
    if (k === 0) return t('Het dorp', 'The village');
    const m = JOURNEY[k - 1];
    return m ? (nl ? m.nl : m.en) : '';
  };
  /** Long numbers get a slightly smaller size so three pills fit on a phone. */
  const num = (n: number, testId: string) => {
    const s = fmt(n);
    return <span data-testid={testId} className={s.length > 7 ? 'text-[16px]' : s.length > 5 ? 'text-[19px]' : undefined}>{s}</span>;
  };

  return (
    <Stage game="journey" testId="journey-game">
      <Hud>
        <HudPill className="min-w-0 flex-1" label={t('Vandaag', 'Today')} value={num(today, 'journey-today')} />
        <HudPill className="min-w-0 flex-1" label={t('Totaal', 'Total')} value={num(total, 'journey-total')} />
        <HudPill className="min-w-0 flex-1" label={t('Mijlpalen', 'Milestones')} accent={TH.glow} value={<span data-testid="journey-reached">{reached}/{JOURNEY.length}</span>} />
      </Hud>
      <p
        className="mx-auto max-w-md rounded-2xl border px-4 py-2.5 text-center text-[14.5px] font-semibold leading-snug backdrop-blur-md"
        style={{ borderColor: `${TH.glow}40`, background: `linear-gradient(135deg, ${TH.glow}1f, rgba(255,255,255,.04))`, color: TH.soft, boxShadow: `0 0 28px -14px ${TH.glow}` }}
        data-testid="journey-next"
      >
        {next
          ? t(`Volgende: ${next.nl}, nog ${fmt(next.steps - total)} stappen`, `Next: ${next.en}, ${fmt(next.steps - total)} steps to go`)
          : t('Je hebt het land van het licht bereikt. Wat een reis!', 'You have reached the land of light. What a journey!')}
      </p>
      {!steps && <p className="mt-2 text-center text-[13px] text-white/55">{t('Er zijn nog geen stappen bekend.', 'No steps are known yet.')}</p>}

      {/* The map: a dusk landscape in a gold-edged frame */}
      <div className="relative mx-auto mt-3 w-full max-w-[440px] rounded-[22px] p-[3px]" style={{ background: `linear-gradient(160deg, ${TH.soft}99, ${TH.glow}33 30%, rgba(255,255,255,.06) 60%, ${TH.glow}55)`, boxShadow: `0 22px 44px -18px rgba(0,0,0,.9), 0 0 40px -16px ${TH.glow}` }}>
        <div ref={scroller} className="max-h-[62vh] w-full overflow-y-auto rounded-[19px] bg-[#0b1020]">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={t(`Kaart van de stappenreis. ${reached} van de ${JOURNEY.length} mijlpalen bereikt.`, `Map of the step journey. ${reached} of ${JOURNEY.length} milestones reached.`)}>
            <defs>
              <linearGradient id="jg-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#6b4c14" />
                <stop offset="0.1" stopColor="#3b2a32" />
                <stop offset="0.3" stopColor="#1e1d3d" />
                <stop offset="0.7" stopColor="#121a33" />
                <stop offset="1" stopColor="#0b1324" />
              </linearGradient>
              <radialGradient id="jg-glow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.9" />
                <stop offset="0.4" stopColor="#ffd25e" stopOpacity="0.35" />
                <stop offset="1" stopColor="#ffd25e" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="jg-halo" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.75" />
                <stop offset="1" stopColor="#ffd25e" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="jg-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff1c2" />
                <stop offset="0.45" stopColor="#f3cf6b" />
                <stop offset="1" stopColor="#c8932a" />
              </linearGradient>
              <linearGradient id="jg-medal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2c3350" />
                <stop offset="1" stopColor="#161b2e" />
              </linearGradient>
              <filter id="jg-blur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
              <filter id="jg-soft" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.2" />
              </filter>
            </defs>
            <rect width={W} height={H} fill="url(#jg-sky)" />

            <Scenery reduced={reduced} />

            {/* The road, and the part already walked */}
            <path d={FULL_ROAD} fill="none" stroke="#0a0d18" strokeWidth={16} strokeLinecap="round" opacity={0.6} />
            <path d={FULL_ROAD} fill="none" stroke="#4a3e2c" strokeWidth={12} strokeLinecap="round" />
            <path d={FULL_ROAD} fill="none" stroke="#6b5a3e" strokeWidth={8} strokeLinecap="round" />
            <path d={FULL_ROAD} fill="none" stroke="#a08a5c" strokeWidth={1.4} strokeDasharray="4 7" opacity={0.7} />
            {total > 0 && (
              <>
                <path d={walked} fill="none" stroke={TH.glow} strokeWidth={14} strokeLinecap="round" opacity={0.55} filter="url(#jg-blur)" />
                <path ref={walkedRef} d={walked} pathLength={1} strokeDasharray="1 1" fill="none" stroke="url(#jg-gold)" strokeWidth={6} strokeLinecap="round" data-testid="journey-walked" />
              </>
            )}

            {/* Milestone medallions */}
            {STOPS.map((p, k) => {
              const isReached = k === 0 || k <= reached;
              const isNext = k === reached + 1;
              const center = p.x === 180;
              const tx = center ? p.x : p.x < 180 ? p.x + 22 : p.x - 22;
              const anchor = center ? 'middle' : p.x < 180 ? 'start' : 'end';
              const ty = k === 0 ? p.y + 34 : k === STOPS.length - 1 ? p.y - 24 : p.y + 4;
              return (
                <g key={k} data-testid={k > 0 ? `journey-stop-${k}` : undefined} data-reached={k > 0 ? (isReached ? '1' : '0') : undefined}>
                  {isReached && <circle cx={p.x} cy={p.y} r={17} fill={TH.glow} opacity={0.45} filter="url(#jg-soft)" />}
                  {isNext && (
                    <circle cx={p.x} cy={p.y} r={15} fill="none" stroke={TH.glow} strokeWidth={2}>
                      {!reduced && <animate attributeName="r" values="14;20;14" dur="2.2s" repeatCount="indefinite" />}
                      {!reduced && <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2.2s" repeatCount="indefinite" />}
                    </circle>
                  )}
                  <circle cx={p.x} cy={p.y} r={12.5} fill={isReached ? 'url(#jg-gold)' : 'url(#jg-medal)'} stroke={isReached ? '#fff2c0' : isNext ? TH.glow : 'rgba(255,255,255,.35)'} strokeWidth={isNext ? 2.5 : 1.6} />
                  {isReached && <circle cx={p.x} cy={p.y} r={9} fill="none" stroke="#a7771d" strokeWidth={0.8} opacity={0.7} />}
                  {k > 0 && <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill={isReached ? '#3a2604' : 'rgba(255,255,255,.75)'}>{k}</text>}
                  <text x={tx} y={ty} textAnchor={anchor} fontSize={12.5} fontWeight={isNext ? 800 : 650} fill={isReached ? TH.soft : isNext ? TH.glow : 'rgba(235,238,255,.72)'} stroke="#0b0f1d" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke">
                    {label(k)}
                  </text>
                  {isNext && next && (
                    <text x={tx} y={ty + 15} textAnchor={anchor} fontSize={11.5} fontWeight={700} fill="#ffb347" stroke="#0b0f1d" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke">
                      {t(`nog ${fmt(next.steps - total)} stappen`, `${fmt(next.steps - total)} steps to go`)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* The hero, with a soft halo */}
            <g transform={`translate(${hero.x} ${hero.y})`} data-testid="journey-hero">
              <circle r={34} fill="url(#jg-halo)" />
              {!reduced && (
                <circle r={18} fill="none" stroke={TH.glow} strokeWidth={2}>
                  <animate attributeName="r" values="18;30;18" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
                </circle>
              )}
              <circle r={17} fill="#fffaf0" stroke="url(#jg-gold)" strokeWidth={3.5} />
              <text y={6} textAnchor="middle" fontSize={18} aria-hidden>🚶</text>
            </g>
          </svg>
        </div>
        {/* Soft vignette over the frame's inner edge */}
        <div aria-hidden className="pointer-events-none absolute inset-[3px] rounded-[19px] shadow-[inset_0_0_30px_rgba(0,0,0,.65)]" />
      </div>

      <p className="mx-auto mt-3 max-w-sm text-center text-[13px] leading-snug text-white/60">{t('Elke stap telt. Een korte wandeling per dag brengt je al verder.', 'Every step counts. A short walk a day already takes you further.')}</p>
      <GameButton className="mt-3 w-full text-[18px]" data-testid="journey-done" onClick={finish}>{t('Klaar', 'Done')}</GameButton>
      <StopButton onClick={finish} label={t('Stoppen', 'Stop')} />
    </Stage>
  );
}

function House({ x, y, wall = '#3d3226', roof = '#6e3426' }: { x: number; y: number; wall?: string; roof?: string }) {
  return (
    <g>
      <rect x={x - 11} y={y - 12} width={22} height={16} fill={wall} stroke="#1c150e" strokeWidth={1} />
      <path d={`M ${x - 14} ${y - 11} L ${x} ${y - 24} L ${x + 14} ${y - 11} Z`} fill={roof} />
      <rect x={x - 3} y={y - 5} width={6} height={9} fill="#1e1610" />
      {/* A lit window */}
      <rect x={x + 4} y={y - 9} width={5} height={5} fill="#ffd25e" />
      <rect x={x + 1.5} y={y - 11.5} width={10} height={10} fill="#ffd25e" opacity={0.35} filter="url(#jg-soft)" />
    </g>
  );
}
function Tree({ x, y, s = 1, c = '#1f5a3a' }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g>
      <rect x={x - 1.5 * s} y={y - 4 * s} width={3 * s} height={8 * s} fill="#3a2a1a" />
      <path d={`M ${x - 9 * s} ${y - 3 * s} L ${x} ${y - 24 * s} L ${x + 9 * s} ${y - 3 * s} Z`} fill={c} />
    </g>
  );
}
function Mountain({ x, y, w, h, c = '#3b4660' }: { x: number; y: number; w: number; h: number; c?: string }) {
  const snow = h * 0.28;
  return (
    <g>
      <path d={`M ${x - w / 2} ${y} L ${x} ${y - h} L ${x + w / 2} ${y} Z`} fill={c} />
      <path d={`M ${x} ${y - h} L ${x + w / 2} ${y} L ${x + w / 8} ${y} Z`} fill="#000000" opacity={0.18} />
      <path d={`M ${x - (w / 2) * (snow / h)} ${y - h + snow} L ${x} ${y - h} L ${x + (w / 2) * (snow / h)} ${y - h + snow} L ${x + 3} ${y - h + snow - 4} L ${x - 3} ${y - h + snow + 1} Z`} fill="#dfe6f5" />
    </g>
  );
}

/** The landscape along the road, at dusk. Animation (windmill, lighthouse beam, clouds, stars) only without reduced motion. */
function Scenery({ reduced }: { reduced: boolean }) {
  return (
    <g aria-hidden>
      {/* Stars */}
      {SKY_STARS.map(([x, y, r], k) => (
        <circle key={k} cx={x} cy={y} r={r} fill="#ffffff" opacity={0.55}>
          {!reduced && k % 4 === 0 && <animate attributeName="opacity" values="0.15;0.85;0.15" dur={`${2.5 + (k % 5)}s`} repeatCount="indefinite" />}
        </circle>
      ))}

      {/* Land of light: sun and glow */}
      <circle cx={180} cy={70} r={130} fill="url(#jg-glow)" />
      <g transform="translate(304 52)">
        <circle r={34} fill="#ffd25e" opacity={0.35} filter="url(#jg-blur)" />
        <g>
          {Array.from({ length: 12 }, (_, k) => (
            <rect key={k} x={-1.5} y={-36} width={3} height={10} rx={1.5} fill="#ffd25e" transform={`rotate(${k * 30})`} />
          ))}
          {!reduced && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="40s" repeatCount="indefinite" />}
        </g>
        <circle r={20} fill="url(#jg-gold)" stroke="#fff1c2" strokeWidth={1.5} />
      </g>
      {/* Clouds */}
      <g opacity={0.22}>
        <g>
          <ellipse cx={60} cy={40} rx={22} ry={9} fill="#ffe9c8" />
          <ellipse cx={74} cy={34} rx={14} ry={9} fill="#ffe9c8" />
          {!reduced && <animateTransform attributeName="transform" type="translate" values="0 0; 14 0; 0 0" dur="16s" repeatCount="indefinite" />}
        </g>
      </g>

      {/* Summit (stop 11): a big peak with a flag */}
      <Mountain x={42} y={198} w={92} h={86} c="#414c69" />
      <line x1={42} y1={112} x2={42} y2={94} stroke="#c9b48a" strokeWidth={1.5} />
      <path d="M 42 94 L 56 98 L 42 103 Z" fill="#ff6b5b" />

      {/* Highlands (stop 10): grass, rocks and a sheep */}
      <ellipse cx={318} cy={262} rx={44} ry={12} fill="#1f3b2b" />
      <ellipse cx={300} cy={258} rx={7} ry={4} fill="#4a4f5a" />
      <g>
        <ellipse cx={330} cy={252} rx={9} ry={6} fill="#e6e2d8" stroke="#a9a49a" />
        <circle cx={339} cy={250} r={3.5} fill="#2a2a2a" />
      </g>

      {/* Mountain pass (stop 9) */}
      <Mountain x={30} y={318} w={70} h={56} />
      <Mountain x={62} y={322} w={52} h={40} c="#465272" />
      <Mountain x={332} y={312} w={64} h={48} c="#465272" />

      {/* Lighthouse (stop 8) */}
      <g>
        <path d="M 316 335 L 262 318 L 262 352 Z" fill="#ffe9a8" opacity={0.45}>
          {!reduced && <animate attributeName="opacity" values="0.1;0.55;0.1" dur="3s" repeatCount="indefinite" />}
        </path>
        <path d="M 314 392 L 318 340 L 326 340 L 330 392 Z" fill="#e9e4da" stroke="#8d877b" />
        <path d="M 316.2 368 L 317.4 356 L 326.6 356 L 327.8 368 Z" fill="#c9473f" />
        <path d="M 314.6 386 L 315.4 377 L 328.6 377 L 329.4 386 Z" fill="#c9473f" />
        <circle cx={322} cy={335} r={12} fill="#ffd25e" opacity={0.5} filter="url(#jg-soft)" />
        <rect x={316} y={330} width={12} height={10} fill="#ffe28a" stroke="#3a3a3a" />
        <path d="M 314 330 L 322 322 L 330 330 Z" fill="#2a3340" />
        <path d="M 306 392 Q 322 386 340 392 Z" fill="#5a4c33" />
      </g>

      {/* Coast (stop 7): sea on the left with a little boat */}
      <path d="M 0 392 L 34 392 Q 46 412 36 432 Q 26 452 40 472 L 0 472 Z" fill="#1d4a66" />
      <path d="M 34 392 Q 46 412 36 432 Q 26 452 40 472 L 48 472 Q 34 452 44 432 Q 54 412 42 392 Z" fill="#6b5a3a" />
      <path d="M 8 418 q 5 -3 10 0 q 5 3 10 0" fill="none" stroke="#7fc3e6" strokeWidth={1.2} opacity={0.7} />
      <path d="M 6 452 q 5 -3 10 0 q 5 3 10 0" fill="none" stroke="#7fc3e6" strokeWidth={1.2} opacity={0.7} />
      <g>
        <path d="M 10 440 L 26 440 L 23 445 L 13 445 Z" fill="#5a3a24" />
        <path d="M 18 439 L 18 425 L 25 439 Z" fill="#e9e4da" />
      </g>

      {/* Lake (stop 6), catching the moonlight */}
      <ellipse cx={326} cy={530} rx={30} ry={14} fill="#1d4a66" />
      <ellipse cx={322} cy={526} rx={14} ry={4} fill="#9fd4f0" opacity={0.25} />
      <path d="M 312 528 q 4 -2 8 0 M 328 534 q 4 -2 8 0" fill="none" stroke="#7fc3e6" strokeWidth={1.2} opacity={0.7} />
      <Tree x={296} y={526} s={0.7} c="#235f40" />

      {/* Hills (stop 5) */}
      <ellipse cx={30} cy={600} rx={62} ry={24} fill="#1d3a2a" />
      <ellipse cx={346} cy={590} rx={52} ry={20} fill="#21402e" />
      <ellipse cx={40} cy={612} rx={50} ry={16} fill="#183224" />

      {/* River at stop 4, with a bridge where the road crosses it */}
      <path d="M 0 640 C 80 628 140 656 220 644 C 280 636 320 652 360 642 L 360 658 C 320 668 280 652 220 660 C 140 672 80 644 0 656 Z" fill="#1d4a66" />
      <path d="M 40 646 q 6 -3 12 0 M 150 654 q 6 -3 12 0 M 316 652 q 6 -3 12 0" fill="none" stroke="#7fc3e6" strokeWidth={1.2} opacity={0.7} />
      <path d={`M ${BRIDGE[0].x} ${BRIDGE[0].y} ${seg(BRIDGE)}`} fill="none" stroke="#5e4128" strokeWidth={22} />

      {/* Forest (stop 3) */}
      <Tree x={22} y={726} />
      <Tree x={44} y={712} s={1.15} c="#17482f" />
      <Tree x={60} y={736} s={0.85} />
      <Tree x={312} y={728} s={0.9} c="#17482f" />
      <Tree x={336} y={716} />
      <Tree x={346} y={740} s={0.8} />

      {/* Windmill (stop 2) */}
      <g>
        <path d="M 312 798 L 316 764 L 328 764 L 332 798 Z" fill="#4a3828" />
        <path d="M 313 764 L 322 752 L 331 764 Z" fill="#2c2018" />
        <rect x={320} y={782} width={4} height={6} fill="#ffd25e" />
        <g transform="translate(322 760)">
          <g>
            {[0, 90, 180, 270].map((a) => (
              <rect key={a} x={-2} y={-24} width={4} height={24} fill="#d8ccb0" stroke="#5e4a30" strokeWidth={0.8} transform={`rotate(${a + 45})`} />
            ))}
            {!reduced && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite" />}
          </g>
          <circle r={2.5} fill="#2c2018" />
        </g>
      </g>

      {/* Edge of the village (stop 1) */}
      <House x={36} y={846} wall="#43372a" roof="#5e2c20" />
      <path d="M 10 862 L 70 862 M 14 856 L 14 866 M 26 856 L 26 866 M 38 856 L 38 866 M 50 856 L 50 866 M 62 856 L 62 866" stroke="#5e4c36" strokeWidth={1.5} />

      {/* The village (start) */}
      <House x={92} y={918} />
      <House x={124} y={932} wall="#45382a" roof="#7a4126" />
      <House x={242} y={930} roof="#5e2c20" />
      <House x={274} y={916} wall="#43372a" />
      <Tree x={306} y={934} s={0.8} />
      <Tree x={62} y={936} s={0.8} />
    </g>
  );
}
