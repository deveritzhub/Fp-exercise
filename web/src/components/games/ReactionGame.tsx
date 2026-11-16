import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useI18n } from '@/lib/i18n';
import { GAME_THEME, GlowBar, Hud, HudPill, Stage, StopButton, haptic, sfx } from './kit';
import type { GameProps } from './types';

const ROUND = 30;
/** How long a lamp stays lit: it starts at 1.1 s and gets a little shorter with every lamp, to 0.6 s. */
const LIT_START = 1100;
const LIT_MIN = 600;
const LIT_STEP = 20;
/** Dark pause between two lamps, and before the first. */
const GAP_MIN = 150;
const GAP_MAX = 400;
const FIRST_AT = 800;
const LAMPS = 9;

type Flash = { idx: number; kind: 'hit' | 'missed' | 'wrong'; until: number };

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** A ring that bursts outwards once when it appears (skipped for reduced motion). Stable, so React calls it once per ring. */
const burst = (el: HTMLElement | null) => {
  if (!el || reducedMotion()) return;
  el.animate?.([{ transform: 'scale(.9)', opacity: 1 }, { transform: 'scale(1.7)', opacity: 0 }], { duration: 260, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
};

/**
 * Reaction lights: a 3×3 grid of round lamps. One lights up at a time in a random spot; tap it before it
 * goes out. Lamps get a little quicker over time. A lamp that goes out untouched just moves on. The
 * score is the number of lamps tapped in 30 seconds. Number keys 1–9 tap the lamps in reading order.
 */
export default function ReactionGame({ onDone }: GameProps) {
  const { t } = useI18n();
  const [lit, setLit] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(ROUND);
  const [flash, setFlash] = useState<Flash | null>(null);

  const start = useRef(performance.now());
  const lamp = useRef<{ idx: number; until: number } | null>(null);
  const nextAt = useRef(performance.now() + FIRST_AT);
  const shown = useRef(0);
  const prevIdx = useRef(-1);
  const scoreRef = useRef(0);
  const flashRef = useRef<Flash | null>(null);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    lamp.current = null;
    setLit(null);
    onDone(scoreRef.current);
  };

  const showFlash = (f: Flash | null) => {
    flashRef.current = f;
    setFlash(f);
  };

  const gap = () => GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);

  useEffect(() => {
    start.current = performance.now();
    nextAt.current = start.current + FIRST_AT;
    let shownLeft = ROUND;
    const tick = () => {
      if (done.current) return;
      const now = performance.now();
      const el = (now - start.current) / 1000;
      const l = Math.max(0, Math.ceil(ROUND - el));
      if (l !== shownLeft) setLeft((shownLeft = l));
      if (el >= ROUND) {
        finish();
        return;
      }
      if (flashRef.current && now >= flashRef.current.until) showFlash(null);
      const on = lamp.current;
      if (on && now >= on.until) {
        // Missed: no penalty, the next lamp comes.
        lamp.current = null;
        setLit(null);
        showFlash({ idx: on.idx, kind: 'missed', until: now + 250 });
        sfx.bad();
        nextAt.current = now + gap();
      }
      if (!lamp.current && now >= nextAt.current) {
        let idx = Math.floor(Math.random() * LAMPS);
        if (idx === prevIdx.current) idx = (idx + 1 + Math.floor(Math.random() * (LAMPS - 1))) % LAMPS;
        prevIdx.current = idx;
        const dur = Math.max(LIT_MIN, LIT_START - shown.current * LIT_STEP);
        shown.current += 1;
        lamp.current = { idx, until: now + dur };
        setLit(idx);
      }
    };
    const h = window.setInterval(tick, 30);
    return () => window.clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const press = (idx: number) => {
    if (done.current) return;
    const now = performance.now();
    if (lamp.current && lamp.current.idx === idx) {
      lamp.current = null;
      setLit(null);
      scoreRef.current += 1;
      setScore(scoreRef.current);
      showFlash({ idx, kind: 'hit', until: now + 220 });
      nextAt.current = now + gap();
      sfx.good();
      haptic(12);
    } else {
      showFlash({ idx, kind: 'wrong', until: now + 180 });
      sfx.bad();
      haptic([20, 30, 20]);
    }
  };

  // Number keys 1–9 tap the lamps, left to right and top to bottom.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= 9) {
        e.preventDefault();
        press(n - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The start, and a tick for each of the last three seconds.
  useEffect(() => {
    sfx.start();
  }, []);
  useEffect(() => {
    if (left > 0 && left <= 3 && !done.current) sfx.tick();
  }, [left]);

  const th = GAME_THEME.reaction;
  /** Each lamp is a glass dome: dark when off, blazing amber when lit, a bright flash on a hit. */
  const lampStyle = (i: number): React.CSSProperties => {
    if (lit === i)
      return {
        background: `radial-gradient(circle at 50% 36%, #fffbe8 0%, ${th.soft} 26%, ${th.glow} 60%, #b45f00 100%)`,
        boxShadow: `0 0 0 2px ${th.soft}, 0 0 28px 6px ${th.glow}cc, 0 0 70px 14px ${th.glow}55, inset 0 -8px 16px rgba(120,50,0,.45), inset 0 3px 0 rgba(255,255,255,.6)`,
        transform: 'scale(1.06)',
      };
    if (flash?.idx === i && flash.kind === 'hit')
      return {
        background: 'radial-gradient(circle at 50% 36%, #ffffff 0%, #fff3d0 40%, #ffd98a 100%)',
        boxShadow: `0 0 0 2px #fff3d0, 0 0 40px 10px ${th.glow}aa, inset 0 -6px 14px rgba(150,90,0,.3)`,
      };
    if (flash?.idx === i && flash.kind === 'wrong')
      return {
        background: 'radial-gradient(circle at 50% 36%, rgba(255,140,140,.28) 0%, rgba(120,30,30,.35) 70%, rgba(0,0,0,.35) 100%)',
        boxShadow: '0 0 0 1px rgba(255,140,140,.45), 0 0 18px rgba(255,90,90,.35), inset 0 -8px 16px rgba(0,0,0,.4)',
      };
    if (flash?.idx === i && flash.kind === 'missed')
      return {
        background: `radial-gradient(circle at 50% 36%, ${th.glow}33 0%, rgba(255,255,255,.05) 60%, rgba(0,0,0,.3) 100%)`,
        boxShadow: `0 0 0 1px ${th.glow}44, inset 0 -8px 16px rgba(0,0,0,.4)`,
      };
    return {
      background: 'radial-gradient(circle at 50% 34%, rgba(255,255,255,.16) 0%, rgba(255,255,255,.05) 55%, rgba(0,0,0,.3) 100%)',
      boxShadow: '0 0 0 1px rgba(255,255,255,.12), inset 0 3px 0 rgba(255,255,255,.1), inset 0 -10px 18px rgba(0,0,0,.4), 0 8px 18px -8px rgba(0,0,0,.7)',
    };
  };

  return (
    <Stage game="reaction" testId="reaction-game" className="select-none">
      <Hud>
        <HudPill label={t('Tijd', 'Time')} value={`${left}s`} />
        <div className="flex" aria-live="polite">
          <HudPill testId="reaction-score" label={t('Lampjes', 'Lights')} value={score} accent={th.soft} />
        </div>
      </Hud>
      <GlowBar game="reaction" value={left / ROUND} />
      <div className="mx-auto mt-5 grid w-full max-w-[330px] touch-none grid-cols-3 gap-3.5 p-1" style={{ touchAction: 'none' }}>
        {Array.from({ length: LAMPS }, (_, i) => {
          const on = lit === i;
          const kind = flash?.idx === i ? flash.kind : null;
          return (
            <button
              key={i}
              type="button"
              data-testid={`reaction-lamp-${i + 1}`}
              data-lit={on ? 'true' : undefined}
              aria-label={on ? t(`Lampje ${i + 1}, aan`, `Light ${i + 1}, on`) : t(`Lampje ${i + 1}`, `Light ${i + 1}`)}
              onPointerDown={(e) => {
                e.preventDefault();
                press(i);
              }}
              // Keyboard activation (Enter/Space) only; a tap was already handled on pointer down.
              onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                if (e.detail === 0) press(i);
              }}
              className={`relative aspect-square min-h-[64px] w-full rounded-full transition-[transform,box-shadow,background] duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/80 ${kind === 'wrong' ? 'game-shake' : ''}`}
              style={lampStyle(i)}
            >
              {/* The glass highlight on top of the dome. */}
              <span aria-hidden className="pointer-events-none absolute left-[22%] top-[10%] h-[24%] w-[56%] rounded-full bg-gradient-to-b from-white/45 to-white/0" />
              {on && <span aria-hidden className="game-glow pointer-events-none absolute -inset-2 rounded-full border-2" style={{ borderColor: `${th.soft}aa` }} />}
              {kind === 'hit' && <span ref={burst} aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-[3px]" style={{ borderColor: th.soft, boxShadow: `0 0 20px ${th.glow}` }} />}
              <span aria-hidden className={`absolute bottom-1.5 left-0 right-0 text-center text-[11px] font-bold tabular-nums ${on ? 'text-[#5a2c00]/70' : 'text-white/35'}`}>{i + 1}</span>
            </button>
          );
        })}
      </div>
      <p className="mx-auto mt-4 max-w-sm text-center text-[13px] leading-snug text-white/60">{t('Tik het gele lampje zo snel als je kunt. Doe het staand, of in een uitvalspas voor een extra uitdaging.', 'Tap the yellow light as fast as you can. Do it standing, or in a lunge for an extra challenge.')}</p>
      <StopButton onClick={finish} label={t('Stoppen', 'Stop')} />
    </Stage>
  );
}
