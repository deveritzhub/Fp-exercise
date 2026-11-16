import { useEffect, useRef, useState } from 'react';
import { JOURNEY, journeyReached } from '@shared/minigames';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
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
const seg = (c: [Pt, Pt, Pt, Pt]) => `C ${c[1].x} ${c[1].y} ${c[2].x} ${c[2].y} ${c[3].x} ${c[3].y}`;
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

  const label = (k: number) => {
    if (k === 0) return t('Het dorp', 'The village');
    const m = JOURNEY[k - 1];
    return m ? (nl ? m.nl : m.en) : '';
  };

  return (
    <div className="flex flex-col gap-3" data-testid="journey-game">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-canvas p-2">
          <p className="text-[12px] text-ink-600">{t('Vandaag', 'Today')}</p>
          <p className="text-[17px] font-bold tabular-nums text-ink-950" data-testid="journey-today">{fmt(today)}</p>
          <p className="text-[11.5px] text-ink-500">{t('stappen', 'steps')}</p>
        </div>
        <div className="rounded-xl bg-canvas p-2">
          <p className="text-[12px] text-ink-600">{t('Totaal', 'Total')}</p>
          <p className="text-[17px] font-bold tabular-nums text-ink-950" data-testid="journey-total">{fmt(total)}</p>
          <p className="text-[11.5px] text-ink-500">{t('stappen', 'steps')}</p>
        </div>
        <div className="rounded-xl bg-canvas p-2">
          <p className="text-[12px] text-ink-600">{t('Mijlpalen', 'Milestones')}</p>
          <p className="text-[17px] font-bold tabular-nums text-ink-950" data-testid="journey-reached">{reached}/{JOURNEY.length}</p>
          <p className="text-[11.5px] text-ink-500">{t('bereikt', 'reached')}</p>
        </div>
      </div>
      <p className="text-center text-[14.5px] text-ink-800" data-testid="journey-next">
        {next
          ? t(`Volgende: ${next.nl}, nog ${fmt(next.steps - total)} stappen`, `Next: ${next.en}, ${fmt(next.steps - total)} steps to go`)
          : t('Je hebt het land van het licht bereikt. Wat een reis!', 'You have reached the land of light. What a journey!')}
      </p>
      {!steps && <p className="text-center text-[13px] text-ink-500">{t('Er zijn nog geen stappen bekend.', 'No steps are known yet.')}</p>}

      <div ref={scroller} className="mx-auto max-h-[62vh] w-full max-w-[440px] overflow-y-auto rounded-2xl border border-line">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={t(`Kaart van de stappenreis. ${reached} van de ${JOURNEY.length} mijlpalen bereikt.`, `Map of the step journey. ${reached} of ${JOURNEY.length} milestones reached.`)}>
          <defs>
            <linearGradient id="jg-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff4cf" />
              <stop offset="0.18" stopColor="#f3f6df" />
              <stop offset="0.6" stopColor="#e6f2dc" />
              <stop offset="1" stopColor="#dcedd2" />
            </linearGradient>
            <radialGradient id="jg-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#fff3b0" stopOpacity="0.95" />
              <stop offset="1" stopColor="#fff3b0" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#jg-sky)" />

          <Scenery reduced={reduced} />

          {/* The road, and the part already walked */}
          <path d={FULL_ROAD} fill="none" stroke="#d8c79f" strokeWidth={14} strokeLinecap="round" />
          <path d={FULL_ROAD} fill="none" stroke="#f3e8cc" strokeWidth={10} strokeLinecap="round" />
          <path d={FULL_ROAD} fill="none" stroke="#d6c49b" strokeWidth={1.5} strokeDasharray="4 7" />
          {total > 0 && <path d={walked} fill="none" stroke="#e09a35" strokeWidth={6} strokeLinecap="round" data-testid="journey-walked" />}

          {/* Stops */}
          {STOPS.map((p, k) => {
            const isReached = k === 0 || k <= reached;
            const isNext = k === reached + 1;
            const center = p.x === 180;
            const tx = center ? p.x : p.x < 180 ? p.x + 20 : p.x - 20;
            const anchor = center ? 'middle' : p.x < 180 ? 'start' : 'end';
            const ty = k === 0 ? p.y + 32 : k === STOPS.length - 1 ? p.y - 22 : p.y + 4;
            return (
              <g key={k} data-testid={k > 0 ? `journey-stop-${k}` : undefined} data-reached={k > 0 ? (isReached ? '1' : '0') : undefined}>
                <circle cx={p.x} cy={p.y} r={isNext ? 12 : 11} fill={isReached ? '#3f8a62' : '#ffffff'} stroke={isReached ? '#2c6a49' : isNext ? '#e09a35' : '#b9b3a3'} strokeWidth={isNext ? 3 : 2} />
                {k > 0 && <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={isReached ? '#ffffff' : '#7a7466'}>{k}</text>}
                <text x={tx} y={ty} textAnchor={anchor} fontSize={12.5} fontWeight={isNext ? 800 : 600} fill={isReached ? '#24432f' : isNext ? '#8a5200' : '#5f6a62'} stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke">
                  {label(k)}
                </text>
                {isNext && next && (
                  <text x={tx} y={ty + 15} textAnchor={anchor} fontSize={11.5} fontWeight={700} fill="#b06a0c" stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke">
                    {t(`nog ${fmt(next.steps - total)} stappen`, `${fmt(next.steps - total)} steps to go`)}
                  </text>
                )}
              </g>
            );
          })}

          {/* The hero */}
          <g transform={`translate(${hero.x} ${hero.y})`} data-testid="journey-hero">
            {!reduced && (
              <circle r={16} fill="none" stroke="#e09a35" strokeWidth={2}>
                <animate attributeName="r" values="16;27;16" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle r={16} fill="#ffffff" stroke="#e09a35" strokeWidth={3} />
            <text y={6} textAnchor="middle" fontSize={18} aria-hidden>🚶</text>
          </g>
        </svg>
      </div>

      <p className="text-center text-[13px] text-ink-600">{t('Elke stap telt. Een korte wandeling per dag brengt je al verder.', 'Every step counts. A short walk a day already takes you further.')}</p>
      <Button size="xl" className="w-full" data-testid="journey-done" onClick={finish}>{t('Klaar', 'Done')}</Button>
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" className="min-h-[44px] px-4" data-testid="game-stop" onClick={finish}>{t('Stoppen', 'Stop')}</Button>
      </div>
    </div>
  );
}

function House({ x, y, wall = '#f6efe2', roof = '#c46a4a' }: { x: number; y: number; wall?: string; roof?: string }) {
  return (
    <g>
      <rect x={x - 11} y={y - 12} width={22} height={16} fill={wall} stroke="#a8977a" strokeWidth={1} />
      <path d={`M ${x - 14} ${y - 11} L ${x} ${y - 24} L ${x + 14} ${y - 11} Z`} fill={roof} />
      <rect x={x - 3} y={y - 5} width={6} height={9} fill="#8a6a4a" />
    </g>
  );
}
function Tree({ x, y, s = 1, c = '#4f9a62' }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g>
      <rect x={x - 1.5 * s} y={y - 4 * s} width={3 * s} height={8 * s} fill="#7b5a3a" />
      <path d={`M ${x - 9 * s} ${y - 3 * s} L ${x} ${y - 24 * s} L ${x + 9 * s} ${y - 3 * s} Z`} fill={c} />
    </g>
  );
}
function Mountain({ x, y, w, h, c = '#9aa6ad' }: { x: number; y: number; w: number; h: number; c?: string }) {
  const snow = h * 0.28;
  return (
    <g>
      <path d={`M ${x - w / 2} ${y} L ${x} ${y - h} L ${x + w / 2} ${y} Z`} fill={c} />
      <path d={`M ${x - (w / 2) * (snow / h)} ${y - h + snow} L ${x} ${y - h} L ${x + (w / 2) * (snow / h)} ${y - h + snow} L ${x + 3} ${y - h + snow - 4} L ${x - 3} ${y - h + snow + 1} Z`} fill="#ffffff" />
    </g>
  );
}

/** The landscape along the road. Animation (windmill, lighthouse beam, clouds) only without reduced motion. */
function Scenery({ reduced }: { reduced: boolean }) {
  return (
    <g aria-hidden>
      {/* Land of light: sun and glow */}
      <circle cx={180} cy={70} r={90} fill="url(#jg-glow)" />
      <g transform="translate(304 52)">
        <g>
          {Array.from({ length: 12 }, (_, k) => (
            <rect key={k} x={-1.5} y={-36} width={3} height={10} rx={1.5} fill="#f2c94c" transform={`rotate(${k * 30})`} />
          ))}
          {!reduced && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="40s" repeatCount="indefinite" />}
        </g>
        <circle r={20} fill="#f7d35c" stroke="#f2b93b" strokeWidth={2} />
      </g>
      {/* Clouds */}
      <g opacity={0.9}>
        <g>
          <ellipse cx={60} cy={40} rx={22} ry={9} fill="#ffffff" />
          <ellipse cx={74} cy={34} rx={14} ry={9} fill="#ffffff" />
          {!reduced && <animateTransform attributeName="transform" type="translate" values="0 0; 14 0; 0 0" dur="16s" repeatCount="indefinite" />}
        </g>
      </g>

      {/* Summit (stop 11): a big peak with a flag */}
      <Mountain x={42} y={198} w={92} h={86} c="#8f9ca4" />
      <line x1={42} y1={112} x2={42} y2={94} stroke="#5b432b" strokeWidth={1.5} />
      <path d="M 42 94 L 56 98 L 42 103 Z" fill="#e05a47" />

      {/* Highlands (stop 10): grass, rocks and a sheep */}
      <ellipse cx={318} cy={262} rx={44} ry={12} fill="#b7d79a" />
      <ellipse cx={300} cy={258} rx={7} ry={4} fill="#b9b6ad" />
      <g>
        <ellipse cx={330} cy={252} rx={9} ry={6} fill="#ffffff" stroke="#d6d2c8" />
        <circle cx={339} cy={250} r={3.5} fill="#4a4a4a" />
      </g>

      {/* Mountain pass (stop 9) */}
      <Mountain x={30} y={318} w={70} h={56} />
      <Mountain x={62} y={322} w={52} h={40} c="#a9b4ba" />
      <Mountain x={332} y={312} w={64} h={48} c="#a9b4ba" />

      {/* Lighthouse (stop 8) */}
      <g>
        <path d="M 314 392 L 318 340 L 326 340 L 330 392 Z" fill="#ffffff" stroke="#c9c2b4" />
        <path d="M 316.2 368 L 317.4 356 L 326.6 356 L 327.8 368 Z" fill="#d9534f" />
        <path d="M 314.6 386 L 315.4 377 L 328.6 377 L 329.4 386 Z" fill="#d9534f" />
        <rect x={316} y={330} width={12} height={10} fill="#ffe28a" stroke="#5b5b5b" />
        <path d="M 314 330 L 322 322 L 330 330 Z" fill="#3d4a52" />
        <path d="M 316 335 L 262 318 L 262 352 Z" fill="#fff0a8" opacity={0.55}>
          {!reduced && <animate attributeName="opacity" values="0.15;0.6;0.15" dur="3s" repeatCount="indefinite" />}
        </path>
        <path d="M 306 392 Q 322 386 340 392 Z" fill="#c9b98f" />
      </g>

      {/* Coast (stop 7): sea on the left with a little boat */}
      <path d="M 0 392 L 34 392 Q 46 412 36 432 Q 26 452 40 472 L 0 472 Z" fill="#8cc6e3" />
      <path d="M 34 392 Q 46 412 36 432 Q 26 452 40 472 L 48 472 Q 34 452 44 432 Q 54 412 42 392 Z" fill="#efe0b6" />
      <path d="M 8 418 q 5 -3 10 0 q 5 3 10 0" fill="none" stroke="#ffffff" strokeWidth={1.2} />
      <path d="M 6 452 q 5 -3 10 0 q 5 3 10 0" fill="none" stroke="#ffffff" strokeWidth={1.2} />
      <g>
        <path d="M 10 440 L 26 440 L 23 445 L 13 445 Z" fill="#8a5a3a" />
        <path d="M 18 439 L 18 425 L 25 439 Z" fill="#ffffff" />
      </g>

      {/* Lake (stop 6) */}
      <ellipse cx={326} cy={530} rx={30} ry={14} fill="#8cc6e3" />
      <path d="M 312 528 q 4 -2 8 0 M 328 534 q 4 -2 8 0" fill="none" stroke="#ffffff" strokeWidth={1.2} />
      <Tree x={296} y={526} s={0.7} c="#5ba36d" />

      {/* Hills (stop 5) */}
      <ellipse cx={30} cy={600} rx={62} ry={24} fill="#b4d998" />
      <ellipse cx={346} cy={590} rx={52} ry={20} fill="#bfdea4" />
      <ellipse cx={40} cy={612} rx={50} ry={16} fill="#a6cf8a" />

      {/* River (between the forest and stop 4), with a bridge where the road crosses */}
      <path d="M 0 662 C 60 650 110 684 180 670 C 250 656 300 684 360 668 L 360 688 C 300 704 250 676 180 690 C 110 704 60 670 0 682 Z" fill="#8cc6e3" />
      <path d="M 30 670 q 6 -3 12 0 M 250 668 q 6 -3 12 0" fill="none" stroke="#ffffff" strokeWidth={1.2} />
      <rect x={166} y={664} width={30} height={32} rx={3} fill="#b98a5c" />
      <path d="M 166 668 L 196 668 M 166 692 L 196 692" stroke="#7b5a3a" strokeWidth={2} />

      {/* Forest (stop 3) */}
      <Tree x={22} y={726} />
      <Tree x={44} y={712} s={1.15} c="#3f8a54" />
      <Tree x={60} y={736} s={0.85} />
      <Tree x={312} y={728} s={0.9} c="#3f8a54" />
      <Tree x={336} y={716} />
      <Tree x={346} y={740} s={0.8} />

      {/* Windmill (stop 2) */}
      <g>
        <path d="M 312 798 L 316 764 L 328 764 L 332 798 Z" fill="#8a6a4a" />
        <path d="M 313 764 L 322 752 L 331 764 Z" fill="#5b432b" />
        <g transform="translate(322 760)">
          <g>
            {[0, 90, 180, 270].map((a) => (
              <rect key={a} x={-2} y={-24} width={4} height={24} fill="#f3ead8" stroke="#a8977a" strokeWidth={0.8} transform={`rotate(${a + 45})`} />
            ))}
            {!reduced && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite" />}
          </g>
          <circle r={2.5} fill="#5b432b" />
        </g>
      </g>

      {/* Edge of the village (stop 1) */}
      <House x={36} y={846} wall="#f1e7d3" roof="#b0563c" />
      <path d="M 10 862 L 70 862 M 14 856 L 14 866 M 26 856 L 26 866 M 38 856 L 38 866 M 50 856 L 50 866 M 62 856 L 62 866" stroke="#a8977a" strokeWidth={1.5} />

      {/* The village (start) */}
      <House x={92} y={918} />
      <House x={124} y={932} wall="#f8f1e4" roof="#d0804a" />
      <House x={242} y={930} roof="#b0563c" />
      <House x={274} y={916} wall="#f1e7d3" />
      <Tree x={306} y={934} s={0.8} />
      <Tree x={62} y={936} s={0.8} />
    </g>
  );
}
