import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
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
    } else {
      setFeedback({ kind: diff < 0 ? 'early' : 'late', n });
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
  const chip = (on: boolean) =>
    `min-h-[44px] rounded-full border-2 px-4 text-[15px] font-semibold ${on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-canvas text-ink-800'}`;

  if (phase === 'choose') {
    return (
      <div className="flex flex-col gap-4 py-2" data-testid="rhythm-game">
        <fieldset>
          <legend className="mb-2 text-[15px] font-semibold text-ink-900">{t('Kies je oefening', 'Choose your exercise')}</legend>
          <div className="flex flex-wrap gap-2">
            {EXERCISES.map((x) => (
              <button key={x.key} type="button" data-testid={`rhythm-exercise-${x.key}`} aria-pressed={exercise === x.key} className={chip(exercise === x.key)} onClick={() => setExercise(x.key)}>
                {t(x.nl, x.en)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[14px] text-ink-600">{t(ex.cueNl, ex.cueEn)}</p>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-[15px] font-semibold text-ink-900">{t('Tempo', 'Tempo')}</legend>
          <div className="flex flex-wrap gap-2">
            {TEMPOS.map((x) => (
              <button key={x.key} type="button" data-testid={`rhythm-tempo-${x.key}`} aria-pressed={tempo === x.key} className={chip(tempo === x.key)} onClick={() => setTempo(x.key)}>
                {t(`${x.nl} (${x.bpm} per minuut)`, `${x.en} (${x.bpm} per minute)`)}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="text-[14px] text-ink-600">{t(`Eerst tellen we 4 tellen af, daarna volgen ${BEATS} tellen. Tik op elke tel op de grote knop (of druk op spatie).`, `First 4 beats count in, then ${BEATS} beats follow. Tap the big button on every beat (or press Space).`)}</p>
        <Button size="xl" className="w-full" data-testid="rhythm-begin" onClick={begin}>{t('Start de maat', 'Start the beat')}</Button>
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" className="min-h-[44px] px-4" data-testid="game-stop" onClick={finish}>{t('Stoppen', 'Stop')}</Button>
        </div>
      </div>
    );
  }

  const countIn = beat < 0;
  const inBar = countIn ? beat + COUNT_IN + 1 : (beat % 4) + 1;
  const accentNow = countIn ? beat + COUNT_IN === 0 : beat % 4 === 0;
  const feedbackText = !feedback
    ? ' '
    : feedback.kind === 'hit'
      ? t('Op de maat!', 'On the beat!')
      : feedback.kind === 'early'
        ? t('Iets te vroeg', 'A bit early')
        : feedback.kind === 'late'
          ? t('Iets te laat', 'A bit late')
          : t('Deze tel telt al', 'This beat already counts');

  return (
    <div className="flex select-none flex-col items-center gap-3 py-2" data-testid="rhythm-game">
      <div className="flex w-full max-w-sm items-center justify-between text-[14px] text-ink-600">
        <span>
          {beat < -COUNT_IN ? t('Klaar…', 'Ready…') : countIn ? t(`Aftellen: ${inBar}`, `Count-in: ${inBar}`) : t(`Tel ${beat + 1} van ${BEATS}`, `Beat ${beat + 1} of ${BEATS}`)}
        </span>
        <span className="font-semibold text-ink-900" data-testid="rhythm-hits">{t(`${hits.length} raak`, `${hits.length} hit`)}</span>
      </div>
      <p className="text-center text-[15px] font-semibold text-ink-900">{t(ex.nl, ex.en)} · <span className="font-normal text-ink-600">{t(ex.cueNl, ex.cueEn)}</span></p>
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
        className="relative grid h-[220px] w-[220px] touch-none place-items-center overflow-hidden rounded-full border-4 border-line bg-canvas text-ink-900 shadow-card"
        style={{ touchAction: 'none' }}
      >
        <span
          ref={pulseEl}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ opacity: 0, background: accentNow ? 'radial-gradient(circle, #ffd27a 0%, #f0a13a 75%)' : 'radial-gradient(circle, #cfe9ff 0%, #5aa9d6 75%)' }}
        />
        <span className="relative text-center">
          <span className="block text-[64px] font-extrabold leading-none">{beat < -COUNT_IN ? '·' : inBar}</span>
          <span className="mt-1 block text-[15px] font-semibold">{countIn || beat < -COUNT_IN ? t('Luister…', 'Listen…') : t('Tik!', 'Tap!')}</span>
        </span>
      </button>
      <p key={feedback?.n ?? 0} className={`min-h-[24px] text-[16px] font-semibold ${feedback?.kind === 'hit' ? 'text-ok' : 'text-ink-600'}`} aria-live="polite">{feedbackText}</p>
      <div className="grid grid-cols-8 gap-1.5" aria-hidden>
        {Array.from({ length: BEATS }, (_, i) => {
          const hit = hits.includes(i);
          const past = i < beat;
          return <span key={i} className={`h-3 w-3 rounded-full ${hit ? 'bg-ok' : i === beat ? 'bg-accent' : past ? 'bg-ink-200' : 'border border-line bg-white'}`} />;
        })}
      </div>
      <p className="max-w-sm text-center text-[13px] text-ink-600">{t('Geen geluid? De knop licht ook op bij elke tel.', 'No sound? The button also lights up on every beat.')}</p>
      <Button variant="ghost" size="sm" className="min-h-[44px] px-4" data-testid="game-stop" onClick={finish}>{t('Stoppen', 'Stop')}</Button>
    </div>
  );
}
