import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { GAME_THEME, GOLD, GameButton, GlowBar, Hud, HudPill, Stage, StopButton, haptic, sfx } from './kit';
import type { GameProps } from './types';

const BEATS = 32;
const COUNT_IN = 4;
/** A tap this close to a beat (seconds) counts that beat. */
const WINDOW = 0.18;
/** Time from the start tap to the first count-in beat. */
const LEAD = 0.5;
/** How far ahead clicks are put on the audio clock, and how often that is checked. */
const LOOKAHEAD = 0.15;
const SCHEDULE_MS = 25;

const TEMPOS = [
  { key: 'slow', bpm: 50, nl: 'Rustig', en: 'Slow' },
  { key: 'normal', bpm: 64, nl: 'Normaal', en: 'Normal' },
] as const;
type TempoKey = (typeof TEMPOS)[number]['key'];

const EXERCISES = [
  { key: 'squat', nl: 'Squat', en: 'Squat', cueNl: 'Zak door je knieën op de ene tel, kom omhoog op de volgende.', cueEn: 'Bend your knees on one beat, come up on the next.' },
  { key: 'calf', nl: 'Kuiten heffen', en: 'Calf raises', cueNl: 'Op je tenen op de ene tel, hielen weer neer op de volgende.', cueEn: 'Up on your toes on one beat, heels down on the next.' },
  { key: 'arms', nl: 'Armen heffen', en: 'Arm raises', cueNl: 'Armen omhoog op de ene tel, weer omlaag op de volgende.', cueEn: 'Arms up on one beat, down again on the next.' },
  { key: 'march', nl: 'Marcheren op de plaats', en: 'Marching on the spot', cueNl: 'Til op elke tel een knie op, links en rechts om en om.', cueEn: 'Lift a knee on every beat, left and right in turn.' },
] as const;
type ExerciseKey = (typeof EXERCISES)[number]['key'];

type Feedback = { kind: 'hit' | 'early' | 'late' | 'again'; n: number };

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** A ring that bursts outwards once when it appears (skipped for reduced motion). Stable, so React calls it once per ring. */
const burst = (el: HTMLElement | null) => {
  if (!el || reducedMotion()) return;
  el.animate?.([{ transform: 'scale(.92)', opacity: 1 }, { transform: 'scale(1.35)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
};

/**
 * Rhythm reps: choose an exercise and a tempo, then a metronome (clicks made with WebAudio, an accent on
 * every fourth beat) counts in four beats and plays 32. Move to the beat and tap the big button (or
 * Space) on each beat; a tap within 0.18 s counts that beat once. The score is the part of the 32
 * beats hit, in percent. The button lights up on every beat, so it works with the sound off too.
 */
export default function RhythmGame({ onDone }: GameProps) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<'choose' | 'play'>('choose');
  const [exercise, setExercise] = useState<ExerciseKey>('squat');
  const [tempo, setTempo] = useState<TempoKey>('slow');
  const [beat, setBeat] = useState(-COUNT_IN - 1);
  const [hits, setHits] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  /** Beat 0 of the count-in on the (audio) clock; beat k sounds at start + k × spb. */
  const startAt = useRef(0);
  const spb = useRef(60 / TEMPOS[0].bpm);
  const hitSet = useRef(new Set<number>());
  const tapBtn = useRef<HTMLButtonElement>(null);
  const pulseEl = useRef<HTMLSpanElement>(null);
  const ringEl = useRef<HTMLSpanElement>(null);
  const feedbackN = useRef(0);
  const playing = useRef(false);
  const done = useRef(false);

  /** The clock the patient hears: the audio clock minus the output delay (or the page clock without audio). */
  const clock = () => {
    const ctx = ctxRef.current;
    if (!ctx) return performance.now() / 1000;
    const latency = (ctx as AudioContext & { outputLatency?: number }).outputLatency || ctx.baseLatency || 0;
    return ctx.currentTime - latency;
  };

  const score = () => Math.round((100 * hitSet.current.size) / BEATS);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    playing.current = false;
    onDone(score());
  };

  // Close the audio when the game goes away.
  useEffect(
    () => () => {
      const ctx = ctxRef.current;
      ctxRef.current = null;
      if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => undefined);
    },
    [],
  );

  const begin = () => {
    if (phase !== 'choose' || done.current) return;
    // The audio context must be made inside the tap (autoplay rules).
    let ctx: AudioContext | null = null;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        ctx = new AC();
        void ctx.resume().catch(() => undefined);
      }
    } catch {
      ctx = null;
    }
    ctxRef.current = ctx;
    const bpm = TEMPOS.find((x) => x.key === tempo)?.bpm ?? TEMPOS[0].bpm;
    spb.current = 60 / bpm;
    startAt.current = (ctx ? ctx.currentTime : performance.now() / 1000) + LEAD;
    hitSet.current.clear();
    setHits([]);
    playing.current = true;
    setPhase('play');
  };

  // While playing: put the clicks on the audio clock ahead of time, and follow the beat on screen.
  useEffect(() => {
    if (phase !== 'play') return;
    const total = COUNT_IN + BEATS;
    const began = performance.now();
    let next = 0;
    const click = (ctx: AudioContext, at: number, k: number) => {
      const countIn = k < COUNT_IN;
      const accent = (countIn ? k : k - COUNT_IN) % 4 === 0;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = countIn ? (accent ? 990 : 660) : accent ? 1320 : 880;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(accent ? 0.6 : 0.32, at + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.1);
    };
    const schedule = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      // Audio that never starts (blocked by the phone): keep going on the page clock, silently.
      if (ctx.state !== 'running' && performance.now() - began > 1200) {
        ctxRef.current = null;
        void ctx.close().catch(() => undefined);
        startAt.current = performance.now() / 1000 + LEAD;
        return;
      }
      while (next < total && startAt.current + next * spb.current < ctx.currentTime + LOOKAHEAD) {
        const at = startAt.current + next * spb.current;
        if (at >= ctx.currentTime - 0.02) click(ctx, Math.max(at, ctx.currentTime), next);
        next++;
      }
    };
    schedule();
    const timer = window.setInterval(schedule, SCHEDULE_MS);

    const still = reducedMotion();
    let raf = 0;
    let shown = -COUNT_IN - 1;
    const frame = () => {
      if (done.current) return;
      const c = clock();
      const k = Math.floor((c - startAt.current) / spb.current);
      const j = k - COUNT_IN;
      if (j !== shown && k >= 0) setBeat((shown = Math.min(j, BEATS - 1)));
      // The pulse: bright on the beat, fading before the next.
      const pulse = k >= 0 && k < total ? Math.exp(-((c - (startAt.current + k * spb.current)) / spb.current) * 5) : 0;
      const el = pulseEl.current;
      if (el) {
        el.style.opacity = String(pulse);
        el.style.transform = still ? 'none' : `scale(${1 + 0.08 * pulse})`;
      }
      // The big ring around the pad flashes with the same pulse.
      const ring = ringEl.current;
      if (ring) {
        ring.style.opacity = String(0.25 + 0.75 * pulse);
        ring.style.transform = still ? 'none' : `scale(${1 + 0.05 * pulse})`;
      }
      if (c > startAt.current + (total - 1) * spb.current + WINDOW + 0.25) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    tapBtn.current?.focus({ preventScroll: true });
    return () => {
      window.clearInterval(timer);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const tap = () => {
    if (!playing.current || done.current) return;
    const c = clock();
    const j = Math.round((c - startAt.current) / spb.current) - COUNT_IN;
    if (j < 0 || j >= BEATS) return;
    const diff = c - (startAt.current + (j + COUNT_IN) * spb.current);
    feedbackN.current += 1;
    const n = feedbackN.current;
    if (Math.abs(diff) <= WINDOW) {
      if (hitSet.current.has(j)) {
        setFeedback({ kind: 'again', n });
        return;
      }
      hitSet.current.add(j);
      setHits(Array.from(hitSet.current));
      setFeedback({ kind: 'hit', n });
      sfx.good();
      haptic(12);
    } else {
      setFeedback({ kind: diff < 0 ? 'early' : 'late', n });
      sfx.bad();
      haptic([20, 30, 20]);
    }
  };

  // Space taps too, unless another button (like Stop) has the focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.code !== 'Space') return;
      const target = e.target as HTMLElement | null;
      if (target && target !== tapBtn.current && target.closest('button, a, input, textarea, select')) return;
      if (!playing.current) return;
      e.preventDefault();
      if (!e.repeat) tap();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ex = EXERCISES.find((x) => x.key === exercise) ?? EXERCISES[0];
  const th = GAME_THEME.rhythm;
  /** Glass chips; the chosen one is gold. */
  const chip = (on: boolean) =>
    `min-h-[44px] rounded-full px-4 text-[15px] font-bold transition-[transform,box-shadow,background-color] duration-150 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${on ? 'text-[#2b1d03] shadow-[0_8px_22px_-8px_rgba(243,207,107,.8)]' : 'border border-white/15 bg-white/[.07] text-white/90 backdrop-blur-md hover:bg-white/[.12]'}`;
  const chipStyle = (on: boolean) => (on ? { background: GOLD } : undefined);
  const pick = (fn: () => void) => () => {
    sfx.tap();
    fn();
  };

  if (phase === 'choose') {
    return (
      <Stage game="rhythm" testId="rhythm-game">
        <div className="flex flex-col gap-5 py-1">
          <fieldset>
            <legend className="mb-2.5 text-[12px] font-bold uppercase tracking-[.14em] text-white/60">{t('Kies je oefening', 'Choose your exercise')}</legend>
            <div className="flex flex-wrap gap-2">
              {EXERCISES.map((x) => (
                <button key={x.key} type="button" data-testid={`rhythm-exercise-${x.key}`} aria-pressed={exercise === x.key} className={chip(exercise === x.key)} style={chipStyle(exercise === x.key)} onClick={pick(() => setExercise(x.key))}>
                  {t(x.nl, x.en)}
                </button>
              ))}
            </div>
            <p key={ex.key} className="game-rise mt-3 rounded-2xl border border-white/10 bg-white/[.05] px-3 py-2 text-[14px] leading-snug text-white/80">{t(ex.cueNl, ex.cueEn)}</p>
          </fieldset>
          <fieldset>
            <legend className="mb-2.5 text-[12px] font-bold uppercase tracking-[.14em] text-white/60">{t('Tempo', 'Tempo')}</legend>
            <div className="flex flex-wrap gap-2">
              {TEMPOS.map((x) => (
                <button key={x.key} type="button" data-testid={`rhythm-tempo-${x.key}`} aria-pressed={tempo === x.key} className={chip(tempo === x.key)} style={chipStyle(tempo === x.key)} onClick={pick(() => setTempo(x.key))}>
                  {t(`${x.nl} (${x.bpm} per minuut)`, `${x.en} (${x.bpm} per minute)`)}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="text-[13px] leading-snug text-white/60">{t(`Eerst tellen we 4 tellen af, daarna volgen ${BEATS} tellen. Tik op elke tel op de grote knop (of druk op spatie).`, `First 4 beats count in, then ${BEATS} beats follow. Tap the big button on every beat (or press Space).`)}</p>
          <GameButton data-testid="rhythm-begin" className="w-full text-[18px]" onClick={begin}>{t('Start de maat', 'Start the beat')}</GameButton>
        </div>
        <StopButton onClick={finish} label={t('Stoppen', 'Stop')} />
      </Stage>
    );
  }

  const countIn = beat < 0;
  const inBar = countIn ? beat + COUNT_IN + 1 : (beat % 4) + 1;
  const accentNow = countIn ? beat + COUNT_IN === 0 : beat % 4 === 0;
  const feedbackText = !feedback
    ? ' '
    : feedback.kind === 'hit'
      ? t('Op de maat!', 'On the beat!')
      : feedback.kind === 'early'
        ? t('Iets te vroeg', 'A bit early')
        : feedback.kind === 'late'
          ? t('Iets te laat', 'A bit late')
          : t('Deze tel telt al', 'This beat already counts');
  // The streak: beats hit in a row, up to the latest one.
  let streak = 0;
  for (let i = hits.includes(beat) ? beat : beat - 1; i >= 0 && hits.includes(i); i--) streak++;
  const flashColor = accentNow ? '#fff1c2' : th.glow;

  return (
    <Stage game="rhythm" testId="rhythm-game" className="select-none">
      <Hud>
        <HudPill label={countIn ? t('Aftellen', 'Count-in') : t('Tel', 'Beat')} value={beat < -COUNT_IN ? '–' : countIn ? `${inBar}/${COUNT_IN}` : `${beat + 1}/${BEATS}`} />
        <HudPill testId="rhythm-hits" label={t('Raak', 'Hits')} value={hits.length} accent={th.soft} />
        <HudPill label={t('Reeks', 'Streak')} value={streak >= 2 ? `${streak}×` : streak} accent={streak >= 4 ? '#f3cf6b' : undefined} />
      </Hud>
      <GlowBar game="rhythm" value={beat >= 0 ? (beat + 1) / BEATS : 0} />
      <p className="mt-3 text-center text-[17px] font-black tracking-wide">{t(ex.nl, ex.en)}</p>
      <p className="mx-auto mt-0.5 max-w-sm text-center text-[13.5px] leading-snug text-white/65">{t(ex.cueNl, ex.cueEn)}</p>
      <div className="relative mx-auto mt-4 grid h-[264px] w-[264px] place-items-center">
        {/* The big ring: always faintly there, flashing on every beat (the first of each four brighter). */}
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full border border-white/10" />
        <span
          ref={ringEl}
          aria-hidden
          className="pointer-events-none absolute inset-1 rounded-full border-[3px]"
          style={{ opacity: 0.25, borderColor: flashColor, boxShadow: `0 0 ${accentNow ? 44 : 28}px ${flashColor}${accentNow ? 'cc' : '99'}, inset 0 0 ${accentNow ? 30 : 18}px ${flashColor}77` }}
        />
        {feedback?.kind === 'hit' && <span key={feedback.n} ref={burst} aria-hidden className="pointer-events-none absolute inset-5 rounded-full border-[3px]" style={{ borderColor: '#f3cf6b', boxShadow: '0 0 24px rgba(243,207,107,.8)' }} />}
        <button
          ref={tapBtn}
          type="button"
          data-testid="rhythm-tap"
          aria-label={t('Tik op de tel', 'Tap on the beat')}
          onPointerDown={(e) => {
            e.preventDefault();
            tap();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.repeat) {
              e.preventDefault();
              tap();
            }
          }}
          className="relative grid h-[212px] w-[212px] touch-none place-items-center overflow-hidden rounded-full text-white transition-transform duration-100 active:scale-[.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/80"
          style={{
            touchAction: 'none',
            background: `radial-gradient(circle at 50% 30%, ${th.glow}55 0%, ${th.to} 55%, ${th.from} 100%)`,
            boxShadow: `0 0 0 1px rgba(255,255,255,.16), inset 0 3px 0 rgba(255,255,255,.18), inset 0 -18px 36px rgba(0,0,0,.45), 0 18px 40px -14px rgba(0,0,0,.8), 0 0 50px -8px ${th.glow}aa`,
          }}
        >
          <span
            ref={pulseEl}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ opacity: 0, background: accentNow ? 'radial-gradient(circle, #fff6d8 0%, #f3cf6b 45%, rgba(217,168,58,.0) 80%)' : `radial-gradient(circle, ${th.soft} 0%, ${th.glow} 50%, rgba(255,95,200,0) 80%)` }}
          />
          <span aria-hidden className="pointer-events-none absolute left-[18%] top-[6%] h-[22%] w-[64%] rounded-full bg-gradient-to-b from-white/25 to-white/0" />
          <span className="relative text-center drop-shadow-[0_2px_10px_rgba(0,0,0,.45)]">
            <span className="block text-[76px] font-black leading-none tabular-nums">{beat < -COUNT_IN ? '·' : inBar}</span>
            <span className="mt-1 block text-[15px] font-extrabold uppercase tracking-[.16em] text-white/85">{countIn || beat < -COUNT_IN ? t('Luister…', 'Listen…') : t('Tik!', 'Tap!')}</span>
          </span>
        </button>
      </div>
      <p
        key={feedback?.n ?? 0}
        className={`mt-2 min-h-[28px] text-center text-[17px] font-black tracking-wide ${feedback?.kind === 'hit' ? 'game-pop' : feedback?.kind === 'early' || feedback?.kind === 'late' ? 'game-shake text-white/70' : 'text-white/70'}`}
        style={feedback?.kind === 'hit' ? { color: '#f3cf6b', textShadow: '0 0 14px rgba(243,207,107,.6)' } : undefined}
        aria-live="polite"
      >
        {feedbackText}
      </p>
      <div className="mx-auto mt-2 grid w-fit grid-cols-8 gap-2" aria-hidden>
        {Array.from({ length: BEATS }, (_, i) => {
          const hit = hits.includes(i);
          const now = i === beat;
          const past = i < beat;
          return (
            <span
              key={i}
              className={`h-3 w-3 rounded-full transition-[background-color,box-shadow,transform] duration-200 ${now ? 'scale-125' : ''} ${hit || now ? '' : past ? 'bg-white/15' : 'border border-white/20'}`}
              style={hit ? { background: `radial-gradient(circle at 35% 30%, #fff, ${th.soft} 35%, ${th.glow})`, boxShadow: `0 0 8px ${th.glow}` } : now ? { background: '#fff1c2', boxShadow: '0 0 10px rgba(243,207,107,.9)' } : undefined}
            />
          );
        })}
      </div>
      <p className="mx-auto mt-4 max-w-sm text-center text-[13px] text-white/60">{t('Geen geluid? De knop licht ook op bij elke tel.', 'No sound? The button also lights up on every beat.')}</p>
      <StopButton onClick={finish} label={t('Stoppen', 'Stop')} />
    </Stage>
  );
}
