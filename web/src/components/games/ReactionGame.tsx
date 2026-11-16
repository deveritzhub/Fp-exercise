import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
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
    } else {
      showFlash({ idx, kind: 'wrong', until: now + 180 });
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

  const lampClass = (i: number) => {
    if (lit === i) return 'border-[#e0a400] bg-[#ffd75e] shadow-[0_0_24px_6px_rgba(255,200,60,0.65)]';
    if (flash?.idx === i && flash.kind === 'hit') return 'border-ok bg-ok';
    if (flash?.idx === i && flash.kind === 'wrong') return 'border-ink-300 bg-ink-200';
    return 'border-line bg-canvas';
  };

  return (
    <div className="flex select-none flex-col items-center gap-3 py-2" data-testid="reaction-game">
      <div className="flex w-full max-w-sm items-center justify-between text-[14px] text-ink-600">
        <span>{t(`Nog ${left} s`, `${left} s left`)}</span>
        <span className="font-semibold text-ink-900" data-testid="reaction-score" aria-live="polite">{t(`${score} lampjes`, `${score} lights`)}</span>
      </div>
      <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-ink-100" aria-hidden>
        <div className="h-full rounded-full bg-accent" style={{ width: `${(left / ROUND) * 100}%` }} />
      </div>
      <div className="grid w-full max-w-[330px] touch-none grid-cols-3 gap-3 p-1" style={{ touchAction: 'none' }}>
        {Array.from({ length: LAMPS }, (_, i) => (
          <button
            key={i}
            type="button"
            data-testid={`reaction-lamp-${i + 1}`}
            data-lit={lit === i ? 'true' : undefined}
            aria-label={lit === i ? t(`Lampje ${i + 1}, aan`, `Light ${i + 1}, on`) : t(`Lampje ${i + 1}`, `Light ${i + 1}`)}
            onPointerDown={(e) => {
              e.preventDefault();
              press(i);
            }}
            // Keyboard activation (Enter/Space) only; a tap was already handled on pointer down.
            onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
              if (e.detail === 0) press(i);
            }}
            className={`relative aspect-square min-h-[64px] w-full rounded-full border-4 transition-[background,box-shadow] duration-100 ${lampClass(i)}`}
          >
            <span aria-hidden className="absolute bottom-1.5 right-0 left-0 text-center text-[11px] font-semibold text-ink-400">{i + 1}</span>
          </button>
        ))}
      </div>
      <p className="max-w-sm text-center text-[13.5px] text-ink-600">{t('Tik het gele lampje zo snel als je kunt. Doe het staand, of in een uitvalspas voor een extra uitdaging.', 'Tap the yellow light as fast as you can. Do it standing, or in a lunge for an extra challenge.')}</p>
      <Button variant="ghost" size="sm" className="min-h-[44px] px-4" data-testid="game-stop" onClick={finish}>{t('Stoppen', 'Stop')}</Button>
    </div>
  );
}
