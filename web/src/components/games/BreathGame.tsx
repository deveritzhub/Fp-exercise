import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
import type { GameProps } from './types';

const IN = 4;
const OUT = 6;
const CYCLE = IN + OUT;
const BREATHS = 10;
/** How far off (seconds) pressing or letting go may be and still count as calm. */
const SLACK = 1.1;

/**
 * Breathing orb: the orb grows for four seconds (breathe in, hold the button) and shrinks for six
 * (breathe out, let go). A breath counts as calm when the press and the release are each within about
 * a second of the orb. Ten breaths a round; stopping early keeps what was done.
 */
export default function BreathGame({ onDone }: GameProps) {
  const { t } = useI18n();
  const [now, setNow] = useState(0);
  const [calm, setCalm] = useState(0);
  const [held, setHeld] = useState(false);
  const start = useRef(performance.now());
  const pressAt = useRef<number | null>(null);
  const releaseAt = useRef<number | null>(null);
  const counted = useRef(-1);
  const calmRef = useRef(0);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone(calmRef.current);
  };

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = (performance.now() - start.current) / 1000;
      setNow(s);
      // At the end of each cycle: was the press near its start and the release near the turn?
      const cycle = Math.floor(s / CYCLE);
      if (cycle > counted.current && cycle > 0) {
        const c0 = (cycle - 1) * CYCLE;
        const p = pressAt.current;
        const r = releaseAt.current;
        if (p !== null && r !== null && Math.abs(p - c0) < SLACK && Math.abs(r - (c0 + IN)) < SLACK) {
          calmRef.current += 1;
          setCalm(calmRef.current);
        }
        counted.current = cycle;
        // A press just before this new breath starts belongs to it.
        if (!(p !== null && p > cycle * CYCLE - SLACK && p > (r ?? -1))) pressAt.current = null;
        releaseAt.current = null;
      }
      if (cycle >= BREATHS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const press = () => {
    if (held) return;
    setHeld(true);
    pressAt.current = (performance.now() - start.current) / 1000;
  };
  const release = () => {
    if (!held) return;
    setHeld(false);
    releaseAt.current = (performance.now() - start.current) / 1000;
  };

  const inCycle = now % CYCLE;
  const breathingIn = inCycle < IN;
  const grow = breathingIn ? inCycle / IN : 1 - (inCycle - IN) / OUT;
  const size = 90 + grow * 130;
  const breath = Math.min(BREATHS, Math.floor(now / CYCLE) + 1);

  return (
    <div className="flex flex-col items-center gap-4 py-2 select-none" data-testid="breath-game">
      <p className="text-[14px] text-ink-600">{t(`Ademhaling ${breath} van ${BREATHS}`, `Breath ${breath} of ${BREATHS}`)} · <span className="font-semibold text-ink-900">{t(`${calm} rustig`, `${calm} calm`)}</span></p>
      <div className="relative grid h-[240px] w-[240px] place-items-center">
        <div
          aria-hidden
          className="rounded-full transition-[background] duration-500"
          style={{
            width: size,
            height: size,
            background: breathingIn ? 'radial-gradient(circle at 35% 35%, #d8f1ff, #5aa9d6 70%)' : 'radial-gradient(circle at 35% 35%, #e8f7ec, #69b38a 70%)',
            boxShadow: `0 0 ${20 + grow * 40}px ${breathingIn ? '#5aa9d6' : '#69b38a'}66`,
          }}
        />
        <span className="pointer-events-none absolute text-[20px] font-bold text-white drop-shadow" aria-live="polite">{breathingIn ? t('Adem in', 'Breathe in') : t('Adem uit', 'Breathe out')}</span>
      </div>
      <button
        type="button"
        data-testid="breath-hold"
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); } }}
        onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') release(); }}
        className={`min-h-[64px] w-full max-w-xs touch-none rounded-2xl border-2 text-[17px] font-bold ${held ? 'border-[#3f87b4] bg-[#dff0fb] text-[#1f5677]' : 'border-line bg-canvas text-ink-800'}`}
      >
        {held ? t('Inademen… (laat los bij uitademen)', 'Breathing in… (let go to breathe out)') : t('Houd vast tijdens het inademen', 'Hold while breathing in')}
      </button>
      <p className="max-w-sm text-center text-[13px] text-ink-600">{t('Vier tellen in, zes tellen uit. Langzaam uitademen kalmeert je zenuwstelsel.', 'Four counts in, six counts out. Breathing out slowly calms your nervous system.')}</p>
      <Button variant="ghost" size="sm" className="min-h-[44px] px-4" data-testid="game-stop" onClick={finish}>{t('Stoppen', 'Stop')}</Button>
    </div>
  );
}
