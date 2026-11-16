import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { GAME_THEME, GlowBar, Hud, HudPill, Stage, StopButton, haptic, sfx } from './kit';
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
          sfx.good();
          haptic([10, 40, 10]);
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
    sfx.tap();
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
  const breath = Math.min(BREATHS, Math.floor(now / CYCLE) + 1);
  const th = GAME_THEME.breath;
  const left = breathingIn ? Math.ceil(IN - inCycle) : Math.ceil(CYCLE - inCycle);
  const size = 120 + grow * 120;

  return (
    <Stage game="breath" testId="breath-game" className="select-none">
      <Hud>
        <HudPill label={t('Adem', 'Breath')} value={`${breath}/${BREATHS}`} />
        <HudPill label={t('Rustig', 'Calm')} value={calm} accent={th.soft} />
      </Hud>
      <GlowBar game="breath" value={now / (CYCLE * BREATHS)} />
      <div className="relative mx-auto mt-4 grid h-[280px] w-[280px] place-items-center">
        {/* The guide ring: where the orb grows to. */}
        <div aria-hidden className="absolute h-[244px] w-[244px] rounded-full border border-white/15" />
        <div aria-hidden className="absolute h-[124px] w-[124px] rounded-full border border-dashed border-white/15" />
        <div
          aria-hidden
          className="rounded-full"
          style={{
            width: size,
            height: size,
            background: breathingIn
              ? `radial-gradient(circle at 35% 30%, #ffffff, ${th.soft} 30%, ${th.glow} 70%, #1b4f86)`
              : 'radial-gradient(circle at 35% 30%, #ffffff, #c9f3dc 30%, #5fd39a 70%, #1d6b48)',
            boxShadow: `0 0 ${30 + grow * 60}px ${breathingIn ? th.glow : '#5fd39a'}aa, inset 0 -10px 30px rgba(0,0,0,.25)`,
            transition: 'background 600ms ease',
          }}
        />
        <div className="pointer-events-none absolute flex flex-col items-center" aria-live="polite">
          <span className="text-[22px] font-black tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,.5)]">{breathingIn ? t('Adem in', 'Breathe in') : t('Adem uit', 'Breathe out')}</span>
          <span className="text-[40px] font-black leading-none tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,.5)]">{left}</span>
        </div>
      </div>
      <button
        type="button"
        data-testid="breath-hold"
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(); } }}
        onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') release(); }}
        className="mx-auto mt-3 flex min-h-[68px] w-full max-w-xs touch-none items-center justify-center rounded-2xl border text-[17px] font-extrabold backdrop-blur-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        style={held ? { background: `linear-gradient(135deg, ${th.soft}, ${th.glow})`, color: '#06243f', borderColor: th.soft, boxShadow: `0 0 30px ${th.glow}99` } : { background: 'rgba(255,255,255,.08)', color: '#fff', borderColor: 'rgba(255,255,255,.18)' }}
      >
        {held ? t('Inademen… laat los bij uitademen', 'Breathing in… let go to breathe out') : t('Houd vast tijdens het inademen', 'Hold while breathing in')}
      </button>
      <p className="mx-auto mt-3 max-w-sm text-center text-[13px] text-white/60">{t('Vier tellen in, zes tellen uit. Langzaam uitademen kalmeert je zenuwstelsel.', 'Four counts in, six counts out. Breathing out slowly calms your nervous system.')}</p>
      <StopButton onClick={finish} label={t('Stoppen', 'Stop')} />
    </Stage>
  );
}
