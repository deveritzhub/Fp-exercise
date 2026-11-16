import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useI18n } from '@/lib/i18n';
import { GAME_THEME, GOLD, GlowBar, Hud, HudPill, Stage, StopButton, haptic, sfx } from './kit';
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

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** A ring that bursts outwards once when it appears (skipped for reduced motion). Stable, so React calls it once per ring. */
const burst = (el: HTMLElement | null) => {
  if (!el || reducedMotion()) return;
  el.animate?.([{ transform: 'scale(.8)', opacity: 1 }, { transform: 'scale(1.9)', opacity: 0 }], { duration: 400, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
};

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
    sfx.good();
    haptic(12);
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

  // Sounds: a tick for each second of the countdown, the start, and the last three seconds.
  useEffect(() => {
    if (phase === 'ready') sfx.tick();
  }, [phase, readyLeft]);
  useEffect(() => {
    if (phase === 'play') sfx.start();
  }, [phase]);
  useEffect(() => {
    if (phase === 'play' && left > 0 && left <= 3 && !done.current) sfx.tick();
  }, [phase, left]);

  const radiusPx = Math.max(32, TARGET_R * Math.min(size.w, size.h));
  const camera = mode === 'camera';
  const th = GAME_THEME.mirror;
  const at = (p: Target, r: number) => ({ left: `calc(${p.x * 100}% - ${r}px)`, top: `calc(${p.y * 100}% - ${r}px)`, width: r * 2, height: r * 2 });
  /** Glowing corner brackets around the mirror. */
  const corners = [
    'left-3 top-3 border-l-[3px] border-t-[3px] rounded-tl-[14px]',
    'right-3 top-3 border-r-[3px] border-t-[3px] rounded-tr-[14px]',
    'bottom-3 left-3 border-b-[3px] border-l-[3px] rounded-bl-[14px]',
    'bottom-3 right-3 border-b-[3px] border-r-[3px] rounded-br-[14px]',
  ];

  return (
    <Stage game="mirror" testId="mirror-game" className="select-none">
      <div className="flex flex-col items-center" data-mode={mode ?? 'starting'}>
        <Hud>
          <HudPill label={t('Tijd', 'Time')} value={`${phase === 'play' ? left : ROUND}s`} />
          <div className="flex" aria-live="polite">
            <HudPill testId="mirror-score" label={t('Doelen', 'Targets')} value={score} accent={th.soft} />
          </div>
        </Hud>
        <GlowBar game="mirror" value={phase === 'play' ? left / ROUND : 1} />
        <div
          ref={areaEl}
          className="relative mt-3 w-full touch-none overflow-hidden rounded-[22px]"
          style={{
            height: 'min(64vh, 560px)',
            minHeight: 300,
            touchAction: 'none',
            background: camera ? '#05030b' : `radial-gradient(120% 80% at 50% 0%, ${th.to} 0%, ${th.from} 70%, #07050f 100%)`,
            boxShadow: `0 0 0 1px rgba(255,255,255,.12), 0 0 0 6px rgba(255,255,255,.035), 0 24px 50px -20px rgba(0,0,0,.85), 0 0 50px -12px ${th.glow}99`,
          }}
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
          {!camera && (
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[.12]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '36px 36px', maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 80%)' }} />
          )}
          {/* The mirror's frame: a soft violet vignette, a sheen and glowing corners. */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 52%, ${th.from}cc 100%)`, boxShadow: `inset 0 0 70px ${th.glow}40, inset 0 0 0 1px rgba(255,255,255,.08)` }} />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[.08] via-transparent to-transparent" />
          {corners.map((c) => (
            <span key={c} aria-hidden className={`pointer-events-none absolute h-9 w-9 ${c}`} style={{ borderColor: th.soft, filter: `drop-shadow(0 0 6px ${th.glow})` }} />
          ))}
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
              className="game-pop absolute grid place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90"
              style={at(target, radiusPx)}
            >
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-2 motion-safe:animate-ping" style={{ borderColor: `${th.soft}aa`, animationDuration: '1.6s' }} />
              <span aria-hidden className="game-glow pointer-events-none absolute -inset-1.5 rounded-full border-2" style={{ borderColor: th.soft, boxShadow: `0 0 22px ${th.glow}, inset 0 0 12px ${th.glow}88` }} />
              <span aria-hidden className="pointer-events-none absolute inset-[10%] rounded-full" style={{ background: `radial-gradient(circle at 36% 30%, #ffffff 0%, ${th.soft} 22%, ${th.glow} 58%, #3b1f8f 100%)`, boxShadow: `0 0 30px ${th.glow}cc, inset 0 -6px 14px rgba(30,10,80,.5)` }} />
              <span aria-hidden className="pointer-events-none relative h-[26%] w-[26%] rounded-full bg-white/95 shadow-[0_0_12px_rgba(255,255,255,.9)]" />
            </button>
          )}
          {pop && (
            <span key={pop.id} aria-hidden className="pointer-events-none absolute" style={at(pop, radiusPx)}>
              <span ref={burst} className="absolute inset-0 rounded-full border-[3px]" style={{ borderColor: th.soft, boxShadow: `0 0 24px ${th.glow}, inset 0 0 18px ${th.glow}` }} />
              <span className="game-rise absolute inset-0 grid place-items-center text-[26px] font-black text-transparent" style={{ backgroundImage: GOLD, WebkitBackgroundClip: 'text', backgroundClip: 'text', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.5))' }}>+1</span>
            </span>
          )}
          {phase === 'camera' && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="flex flex-col items-center gap-4">
                <span aria-hidden className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/15" style={{ borderTopColor: th.glow, filter: `drop-shadow(0 0 8px ${th.glow})` }} />
                <p className="max-w-[260px] text-[15px] font-semibold text-white/85">{t('Camera starten… Geef toestemming als je telefoon erom vraagt.', 'Starting the camera… Allow it when your phone asks.')}</p>
              </div>
            </div>
          )}
          {phase === 'ready' && (
            <div className="absolute inset-0 grid place-items-center bg-[#0b0618]/55 p-6 text-center backdrop-blur-[2px]">
              <div className="flex flex-col items-center" aria-live="assertive">
                <div className="grid h-32 w-32 place-items-center rounded-full border-2" style={{ borderColor: `${th.soft}aa`, background: `radial-gradient(circle, ${th.glow}33, transparent 70%)`, boxShadow: `0 0 40px ${th.glow}88, inset 0 0 24px ${th.glow}55` }}>
                  <span key={readyLeft} className="game-pop text-[68px] font-black leading-none tabular-nums" style={{ color: '#fff', textShadow: `0 0 24px ${th.glow}` }}>{readyLeft}</span>
                </div>
                <p className="mt-4 max-w-[280px] text-[15px] font-semibold leading-snug text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,.6)]">
                  {camera
                    ? t('Zet je telefoon rechtop neer en stap naar achteren tot je armen in beeld zijn.', 'Stand your phone upright and step back until your arms are in view.')
                    : t('Tik de doelen aan zodra ze verschijnen.', 'Tap the targets as soon as they appear.')}
                </p>
              </div>
            </div>
          )}
        </div>
        {problem && (
          <p className="mt-3 w-full rounded-2xl border border-[#ffd98a]/30 bg-[#ffb238]/10 px-3 py-2 text-[13.5px] leading-snug text-white/85 backdrop-blur-md" role="status">
            {problem === 'denied'
              ? t('De camera mag niet meedoen. Je kunt toch spelen: tik de doelen aan en strek je arm er ver naar uit.', 'The camera is not allowed. You can still play: tap the targets and reach far out for them.')
              : t('Geen camera beschikbaar. Je kunt toch spelen: tik de doelen aan en strek je arm er ver naar uit.', 'No camera available. You can still play: tap the targets and reach far out for them.')}
          </p>
        )}
        <p className="mt-3 max-w-sm text-center text-[13.5px] leading-snug text-white/70">
          {camera
            ? t('Raak de doelen aan met je hand: boven je hoofd en ver opzij. Beweeg rustig en blijf stevig staan.', 'Touch the targets with your hand: above your head and far to the side. Move calmly and stand firmly.')
            : t('Tik de doelen zo snel als je kunt.', 'Tap the targets as fast as you can.')}
        </p>
        {camera && <p className="mt-1 text-center text-[12.5px] text-white/50">{t('Het beeld blijft op je telefoon: er wordt niets opgeslagen of verstuurd.', 'The picture stays on your phone: nothing is stored or sent.')}</p>}
      </div>
      <StopButton onClick={finish} label={t('Stoppen', 'Stop')} />
    </Stage>
  );
}
