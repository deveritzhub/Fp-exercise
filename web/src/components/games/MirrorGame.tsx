import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
import type { GameProps } from './types';

const ROUND = 45;
/** Seconds to step back into view (camera) or to get ready (tapping). */
const READY_CAMERA = 5;
const READY_TAP = 3;
/** The longer side of the small motion picture, in pixels. */
const SMALL = 80;
/** Target radius, as part of the shorter side of the play area. */
const TARGET_R = 0.1;
/** A cell "moves" when its average brightness change is above this (0..255). */
const LUMA_T = 22;
/** Part of the target's cells that must move. */
const CELL_FRACTION = 0.25;
/** Cells across the target. */
const CELLS = 4;
/** Motion must last this long to count as a touch; short dropouts (duplicate frames) are allowed. */
const HOLD_MS = 150;
const DROPOUT_MS = 120;
/** No new touch this soon after the last one (and after a new target appears). */
const MIN_BETWEEN_MS = 450;
/** When this part of the whole picture changes, the phone moved or the light changed: ignore. */
const GLOBAL_LIMIT = 0.45;
/** Analyse about 25 frames a second. */
const FRAME_MS = 40;

/** Where targets appear: overhead, and out to the left and right (avoids the middle, where the body is). */
const ZONES: { x: [number, number]; y: [number, number] }[] = [
  { x: [0.14, 0.86], y: [0.1, 0.24] },
  { x: [0.1, 0.24], y: [0.18, 0.62] },
  { x: [0.76, 0.9], y: [0.18, 0.62] },
];

type Phase = 'camera' | 'ready' | 'play';
type Mode = 'camera' | 'tap';
type Target = { x: number; y: number; id: number };

const pickTarget = (prev: Target | null): Target => {
  let best: Target | null = null;
  for (let i = 0; i < 12; i++) {
    const z = ZONES[Math.floor(Math.random() * ZONES.length)];
    const x = z.x[0] + Math.random() * (z.x[1] - z.x[0]);
    const y = z.y[0] + Math.random() * (z.y[1] - z.y[0]);
    best = { x, y, id: (prev?.id ?? 0) + 1 };
    if (!prev || Math.hypot(x - prev.x, y - prev.y) > 0.3) break;
  }
  return best as Target;
};

/**
 * Mirror game: the front camera shows the patient as in a mirror, and one round target at a time sits
 * overhead or out to the side. Moving a hand through the target counts as a touch (simple motion
 * detection on a tiny 80-pixel picture; nothing is stored or sent). The score is the number of targets
 * touched in 45 seconds. Without a camera, the targets are tapped on the screen instead.
 */
export default function MirrorGame({ onDone }: GameProps) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('camera');
  const [mode, setMode] = useState<Mode | null>(null);
  const [problem, setProblem] = useState<'denied' | 'unavailable' | null>(null);
  const [readyLeft, setReadyLeft] = useState(READY_CAMERA);
  const [left, setLeft] = useState(ROUND);
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState<Target | null>(null);
  const [pop, setPop] = useState<Target | null>(null);
  const [size, setSize] = useState({ w: 320, h: 420 });

  const phaseRef = useRef<Phase>('camera');
  const modeRef = useRef<Mode | null>(null);
  const readyStart = useRef(0);
  const readyLen = useRef(READY_CAMERA);
  const playStart = useRef(0);
  const targetRef = useRef<Target | null>(null);
  const scoreRef = useRef(0);
  const lastHit = useRef(0);
  const popUntil = useRef(0);
  const areaEl = useRef<HTMLDivElement>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const done = useRef(false);

  const stopCamera = () => {
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    if (videoEl.current) videoEl.current.srcObject = null;
  };

  const finish = () => {
    if (done.current) return;
    done.current = true;
    stopCamera();
    onDone(scoreRef.current);
  };

  const startReady = (seconds: number) => {
    readyLen.current = seconds;
    readyStart.current = performance.now();
    setReadyLeft(seconds);
    phaseRef.current = 'ready';
    setPhase('ready');
  };

  const toTapMode = (why: 'denied' | 'unavailable') => {
    stopCamera();
    modeRef.current = 'tap';
    setMode('tap');
    setProblem(why);
    if (phaseRef.current === 'camera') startReady(READY_TAP);
  };

  const hit = () => {
    const tg = targetRef.current;
    if (done.current || phaseRef.current !== 'play' || !tg) return;
    const now = performance.now();
    lastHit.current = now;
    scoreRef.current += 1;
    setScore(scoreRef.current);
    popUntil.current = now + 400;
    setPop(tg);
    const next = pickTarget(tg);
    targetRef.current = next;
    setTarget(next);
  };

  // The camera: asked once on start; every track is stopped again on unmount.
  useEffect(() => {
    let alive = true;
    const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!media?.getUserMedia) {
      toTapMode('unavailable');
      return;
    }
    media
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((s) => {
        if (!alive || done.current) {
          s.getTracks().forEach((tr) => tr.stop());
          return;
        }
        stream.current = s;
        s.getVideoTracks().forEach((tr) => tr.addEventListener('ended', () => alive && !done.current && toTapMode('unavailable')));
        const v = videoEl.current;
        if (v) {
          v.srcObject = s;
          void v.play().catch(() => undefined);
        }
        modeRef.current = 'camera';
        setMode('camera');
        startReady(READY_CAMERA);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const name = e instanceof DOMException ? e.name : '';
        toTapMode(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
      });
    return () => {
      alive = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the play area's size for the targets.
  useEffect(() => {
    const el = areaEl.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // One loop: countdowns, the clock, and motion detection on a tiny offscreen picture.
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let raf = 0;
    let lastFrame = 0;
    let prev: Float32Array | null = null;
    let cur: Float32Array | null = null;
    let holdStart: number | null = null;
    let lastMove = 0;
    let shownReady = -1;
    let shownLeft = ROUND;

    const analyse = (now: number) => {
      const v = videoEl.current;
      const area = areaEl.current;
      if (!ctx || !v || !area || v.readyState < 2 || !v.videoWidth || !v.videoHeight) return;
      const W = area.clientWidth;
      const H = area.clientHeight;
      if (!W || !H) return;
      const sw = W >= H ? SMALL : Math.max(8, Math.round((SMALL * W) / H));
      const sh = W >= H ? Math.max(8, Math.round((SMALL * H) / W)) : SMALL;
      if (canvas.width !== sw || canvas.height !== sh) {
        canvas.width = sw;
        canvas.height = sh;
        prev = null;
        cur = null;
      }
      // Same crop as the screen (object-cover) and mirrored, so picture cells match the screen.
      const vw = v.videoWidth;
      const vh = v.videoHeight;
      const scale = Math.max(sw / vw, sh / vh);
      const srcW = sw / scale;
      const srcH = sh / scale;
      ctx.setTransform(-1, 0, 0, 1, sw, 0);
      ctx.drawImage(v, (vw - srcW) / 2, (vh - srcH) / 2, srcW, srcH, 0, 0, sw, sh);
      const data = ctx.getImageData(0, 0, sw, sh).data;
      const n = sw * sh;
      if (!cur || cur.length !== n) cur = new Float32Array(n);
      for (let i = 0, p = 0; i < n; i++, p += 4) cur[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      const before = prev;
      // Swap buffers: this frame becomes the previous one.
      prev = cur;
      cur = before;
      if (!before) return;
      const now0 = prev;

      // The whole picture changing at once is not a hand.
      let changed = 0;
      for (let i = 0; i < n; i += 2) if (Math.abs(now0[i] - before[i]) > LUMA_T) changed++;
      if (changed / (n / 2) > GLOBAL_LIMIT) {
        holdStart = null;
        return;
      }

      const tg = targetRef.current;
      if (phaseRef.current !== 'play' || modeRef.current !== 'camera' || !tg || now - lastHit.current < MIN_BETWEEN_MS) {
        holdStart = null;
        return;
      }
      const r = TARGET_R * Math.min(sw, sh);
      const cx = tg.x * sw;
      const cy = tg.y * sh;
      const cell = (2 * r) / CELLS;
      let cells = 0;
      let moving = 0;
      for (let gy = 0; gy < CELLS; gy++) {
        for (let gx = 0; gx < CELLS; gx++) {
          const x0 = cx - r + gx * cell;
          const y0 = cy - r + gy * cell;
          // Only cells whose middle lies within the round target.
          if (Math.hypot(x0 + cell / 2 - cx, y0 + cell / 2 - cy) > r * 1.05) continue;
          let sum = 0;
          let count = 0;
          for (let y = Math.max(0, Math.floor(y0)); y < Math.min(sh, Math.ceil(y0 + cell)); y++) {
            for (let x = Math.max(0, Math.floor(x0)); x < Math.min(sw, Math.ceil(x0 + cell)); x++) {
              const i = y * sw + x;
              sum += Math.abs(now0[i] - before[i]);
              count++;
            }
          }
          if (!count) continue;
          cells++;
          if (sum / count > LUMA_T) moving++;
        }
      }
      const isMoving = cells > 0 && moving / cells >= CELL_FRACTION;
      if (isMoving) {
        if (holdStart === null) holdStart = now;
        lastMove = now;
        if (now - holdStart >= HOLD_MS) {
          holdStart = null;
          hit();
        }
      } else if (holdStart !== null && now - lastMove > DROPOUT_MS) {
        holdStart = null;
      }
    };

    const tick = (now: number) => {
      if (!done.current) {
        if (phaseRef.current === 'ready') {
          const el = (now - readyStart.current) / 1000;
          const r = Math.max(1, Math.ceil(readyLen.current - el));
          if (r !== shownReady) setReadyLeft((shownReady = r));
          if (el >= readyLen.current) {
            playStart.current = now;
            lastHit.current = now;
            const first = pickTarget(null);
            targetRef.current = first;
            setTarget(first);
            phaseRef.current = 'play';
            setPhase('play');
          }
        } else if (phaseRef.current === 'play') {
          const el = (now - playStart.current) / 1000;
          const l = Math.max(0, Math.ceil(ROUND - el));
          if (l !== shownLeft) setLeft((shownLeft = l));
          if (popUntil.current && now >= popUntil.current) {
            popUntil.current = 0;
            setPop(null);
          }
          if (el >= ROUND) {
            finish();
            return;
          }
        }
        if (modeRef.current === 'camera' && now - lastFrame >= FRAME_MS) {
          lastFrame = now;
          analyse(now);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.width = 0;
      canvas.height = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const radiusPx = Math.max(32, TARGET_R * Math.min(size.w, size.h));
  const camera = mode === 'camera';

  return (
    <div className="flex select-none flex-col items-center gap-3 py-2" data-testid="mirror-game" data-mode={mode ?? 'starting'}>
      <div className="flex w-full items-center justify-between text-[14px] text-ink-600">
        <span>{phase === 'play' ? t(`Nog ${left} s`, `${left} s left`) : t('Klaarmaken…', 'Get ready…')}</span>
        <span className="font-semibold text-ink-900" data-testid="mirror-score" aria-live="polite">{t(`${score} doelen`, `${score} targets`)}</span>
      </div>
      <div
        ref={areaEl}
        className={`relative w-full touch-none overflow-hidden rounded-2xl ${camera ? 'bg-ink-950' : 'border border-line bg-canvas'}`}
        style={{ height: 'min(64vh, 560px)', minHeight: 300, touchAction: 'none' }}
      >
        <video
          ref={videoEl}
          className={`absolute inset-0 h-full w-full object-cover ${camera ? '' : 'hidden'}`}
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
          autoPlay
          aria-hidden
        />
        {phase === 'play' && target && (
          <button
            key={target.id}
            type="button"
            data-testid="mirror-target"
            aria-label={t('Doel', 'Target')}
            onPointerDown={(e) => {
              e.preventDefault();
              hit();
            }}
            onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
              if (e.detail === 0) hit();
            }}
            className="absolute grid place-items-center rounded-full border-4 border-white bg-[#ffb02e]/80 shadow-[0_0_0_4px_rgba(255,176,46,0.45)]"
            style={{ left: `calc(${target.x * 100}% - ${radiusPx}px)`, top: `calc(${target.y * 100}% - ${radiusPx}px)`, width: radiusPx * 2, height: radiusPx * 2 }}
          >
            <span aria-hidden className="h-1/3 w-1/3 rounded-full bg-white/90" />
          </button>
        )}
        {pop && (
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full border-4 border-ok bg-ok/40"
            style={{ left: `calc(${pop.x * 100}% - ${radiusPx}px)`, top: `calc(${pop.y * 100}% - ${radiusPx}px)`, width: radiusPx * 2, height: radiusPx * 2 }}
          />
        )}
        {phase === 'camera' && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <p className="text-[15px] text-ink-700">{t('Camera starten… Geef toestemming als je telefoon erom vraagt.', 'Starting the camera… Allow it when your phone asks.')}</p>
          </div>
        )}
        {phase === 'ready' && (
          <div className={`absolute inset-0 grid place-items-center p-6 text-center ${camera ? 'bg-black/45 text-white' : 'text-ink-900'}`}>
            <div>
              <p className="text-[56px] font-extrabold leading-none" aria-live="assertive">{readyLeft}</p>
              <p className="mt-2 text-[15px] font-semibold">
                {camera
                  ? t('Zet je telefoon rechtop neer en stap naar achteren tot je armen in beeld zijn.', 'Stand your phone upright and step back until your arms are in view.')
                  : t('Tik de doelen aan zodra ze verschijnen.', 'Tap the targets as soon as they appear.')}
              </p>
            </div>
          </div>
        )}
      </div>
      {problem && (
        <p className="w-full rounded-lg bg-warn-soft px-3 py-2 text-[13.5px] text-ink-800" role="status">
          {problem === 'denied'
            ? t('De camera mag niet meedoen. Je kunt toch spelen: tik de doelen aan en strek je arm er ver naar uit.', 'The camera is not allowed. You can still play: tap the targets and reach far out for them.')
            : t('Geen camera beschikbaar. Je kunt toch spelen: tik de doelen aan en strek je arm er ver naar uit.', 'No camera available. You can still play: tap the targets and reach far out for them.')}
        </p>
      )}
      <p className="max-w-sm text-center text-[13.5px] text-ink-600">
        {camera
          ? t('Raak de doelen aan met je hand: boven je hoofd en ver opzij. Beweeg rustig en blijf stevig staan.', 'Touch the targets with your hand: above your head and far to the side. Move calmly and stand firmly.')
          : t('Tik de doelen zo snel als je kunt.', 'Tap the targets as fast as you can.')}
      </p>
      {camera && <p className="text-center text-[12.5px] text-ink-500">{t('Het beeld blijft op je telefoon: er wordt niets opgeslagen of verstuurd.', 'The picture stays on your phone: nothing is stored or sent.')}</p>}
      <Button variant="ghost" size="sm" className="min-h-[44px] px-4" data-testid="game-stop" onClick={finish}>{t('Stoppen', 'Stop')}</Button>
    </div>
  );
}
