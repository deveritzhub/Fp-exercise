import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useI18n } from '@/lib/i18n';
import { GAME_THEME, GOLD, GameButton, GlowBar, Hud, HudPill, Stage, StopButton, haptic, sfx } from './kit';
import type { GameProps } from './types';

/** Seconds of play, and the moment to switch legs. */
const ROUND = 30;
const SWITCH_AT = 15;
/** Seconds to get onto one leg before the clock runs. */
const READY = 3;
/** No sensor data within this time: play with keys or dragging. */
const DETECT_MS = 1500;
/** Sizes as part of the plate radius: the centre ring (the ball's middle must be inside) and the ball. */
const ZONE = 0.32;
const BALL = 0.11;
/** Tilt: degrees counted at most, and how hard each degree pushes (plate radii per s²). */
const MAX_TILT = 25;
const TILT_GAIN = 0.11;
/** Rolling friction per second. */
const DAMP = 1.4;
/** Without a sensor: how hard a held arrow key pushes, how strong the drift can get, and the pull of a drag. */
const KEY_PUSH = 1.7;
const DRIFT_MIN = 0.35;
const DRIFT_MAX = 0.85;
const DRAG_PULL = 7;

type Phase = 'permission' | 'ready' | 'play';
type Mode = 'sensor' | 'manual';
type Note = 'nosensor' | 'denied' | 'chosen';
type Tilt = { beta: number; gamma: number };
type PermissionFn = () => Promise<'granted' | 'denied' | 'default'>;

const requestPermissionFn = (): PermissionFn | null => {
  if (typeof window === 'undefined' || typeof window.DeviceOrientationEvent === 'undefined') return null;
  const fn = (window.DeviceOrientationEvent as unknown as { requestPermission?: PermissionFn }).requestPermission;
  return typeof fn === 'function' ? fn.bind(window.DeviceOrientationEvent) : null;
};

const screenAngle = () => {
  const a = typeof screen !== 'undefined' ? screen.orientation?.angle : undefined;
  if (typeof a === 'number') return a;
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The ball's short glowing trail (drawn only): how many ghosts, and how many frames apart. */
const TRAIL = 5;
const TRAIL_STEP = 3;
/** Sounds for entering and leaving the ring are at most this often (ms), so a ball on the edge stays quiet. */
const RING_SOUND_MS = 700;
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Balance ball: stand on one leg and hold the phone flat in front of the chest. Tilting the phone rolls
 * the ball over a round plate; keep it in the centre ring. 30 seconds, switch legs halfway. The score
 * is the part of the 30 seconds the ball was in the ring (0..100). Without a motion sensor (a computer,
 * or permission refused) the arrow keys or dragging push the ball against a slow, wandering wind.
 */
export default function BalanceGame({ onDone }: GameProps) {
  const { t } = useI18n();
  const permission = useRef<PermissionFn | null>(requestPermissionFn());
  const [phase, setPhase] = useState<Phase>(permission.current ? 'permission' : 'ready');
  const [mode, setMode] = useState<Mode | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [readyLeft, setReadyLeft] = useState(READY);
  const [left, setLeft] = useState(ROUND);
  const [points, setPoints] = useState(0);
  const [inside, setInside] = useState(true);
  const [secondHalf, setSecondHalf] = useState(false);
  const [switchBanner, setSwitchBanner] = useState(false);
  const [asking, setAsking] = useState(false);

  const phaseRef = useRef<Phase>(phase);
  const modeRef = useRef<Mode | null>(null);
  const readyStart = useRef(0);
  const playStart = useRef(0);
  const pos = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const latest = useRef<Tilt | null>(null);
  const base = useRef<Tilt>({ beta: 0, gamma: 0 });
  const insideTime = useRef(0);
  const insideRef = useRef(true);
  const keys = useRef(new Set<string>());
  const drag = useRef<{ x: number; y: number } | null>(null);
  const drift = useRef({ x: 0, y: 0, tx: 0, ty: 0, next: 0 });
  const plateEl = useRef<HTMLDivElement>(null);
  const ballEl = useRef<HTMLDivElement>(null);
  const trailEls = useRef<(HTMLDivElement | null)[]>([]);
  const trailPath = useRef<{ x: number; y: number }[]>([]);
  const [showTrail] = useState(() => !reducedMotion());
  const stopListening = useRef<(() => void) | null>(null);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone(Math.min(100, Math.round((100 * insideTime.current) / ROUND)));
  };

  const goManual = (why: Note) => {
    if (modeRef.current) return;
    modeRef.current = 'manual';
    setMode('manual');
    setNote(why);
  };

  const startReady = () => {
    readyStart.current = performance.now();
    phaseRef.current = 'ready';
    setPhase('ready');
  };

  /** Listen for the tilt; with no data in time, fall back to keys and dragging. */
  const listen = () => {
    stopListening.current?.();
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      latest.current = { beta: e.beta, gamma: e.gamma };
      if (!modeRef.current) {
        modeRef.current = 'sensor';
        setMode('sensor');
      }
    };
    window.addEventListener('deviceorientation', onTilt);
    const timer = window.setTimeout(() => goManual('nosensor'), DETECT_MS);
    stopListening.current = () => {
      window.removeEventListener('deviceorientation', onTilt);
      window.clearTimeout(timer);
    };
  };

  // Without a permission question the sensor is tried right away.
  useEffect(() => {
    if (!permission.current) {
      listen();
      startReady();
    }
    return () => {
      stopListening.current?.();
      stopListening.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askSensor = async () => {
    const ask = permission.current;
    if (!ask || asking) return;
    setAsking(true);
    try {
      const answer = await ask();
      if (done.current) return;
      if (answer === 'granted') listen();
      else goManual('denied');
    } catch {
      goManual('denied');
    } finally {
      setAsking(false);
    }
    if (!done.current) startReady();
  };

  const withoutSensor = () => {
    goManual('chosen');
    startReady();
  };

  // Arrow keys (only used without the sensor, but they never scroll the page while playing).
  useEffect(() => {
    const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    const down = (e: KeyboardEvent) => {
      if (!arrows.includes(e.key)) return;
      e.preventDefault();
      keys.current.add(e.key);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key);
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  // One loop for the countdown, the rolling ball and the clock.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let shownReady = READY;
    let shownLeft = ROUND;
    let shownPoints = 0;
    let half = false;
    let banner = false;

    const physics = (dt: number, now: number) => {
      let ax = 0;
      let ay = 0;
      const p = pos.current;
      const v = vel.current;
      if (modeRef.current === 'sensor' && latest.current) {
        // Device frame: gamma tilts left/right (x), beta tilts the top up/down (y, down is positive on screen).
        const gx = clamp(latest.current.gamma - base.current.gamma, -MAX_TILT, MAX_TILT);
        const gy = clamp(latest.current.beta - base.current.beta, -MAX_TILT, MAX_TILT);
        const a = (screenAngle() * Math.PI) / 180;
        ax = (gx * Math.cos(a) + gy * Math.sin(a)) * TILT_GAIN;
        ay = (-gx * Math.sin(a) + gy * Math.cos(a)) * TILT_GAIN;
      } else {
        const d = drift.current;
        if (now >= d.next) {
          const angle = Math.random() * Math.PI * 2;
          const strength = DRIFT_MIN + Math.random() * (DRIFT_MAX - DRIFT_MIN);
          d.tx = Math.cos(angle) * strength;
          d.ty = Math.sin(angle) * strength;
          d.next = now + 1200 + Math.random() * 1600;
        }
        const k = Math.min(1, dt * 1.2);
        d.x += (d.tx - d.x) * k;
        d.y += (d.ty - d.y) * k;
        ax = d.x;
        ay = d.y;
        const held = keys.current;
        ax += KEY_PUSH * ((held.has('ArrowRight') ? 1 : 0) - (held.has('ArrowLeft') ? 1 : 0));
        ay += KEY_PUSH * ((held.has('ArrowDown') ? 1 : 0) - (held.has('ArrowUp') ? 1 : 0));
        if (drag.current) {
          ax += (drag.current.x - p.x) * DRAG_PULL - v.x * 2.5;
          ay += (drag.current.y - p.y) * DRAG_PULL - v.y * 2.5;
        }
      }
      const f = Math.exp(-DAMP * dt);
      v.x = (v.x + ax * dt) * f;
      v.y = (v.y + ay * dt) * f;
      p.x += v.x * dt;
      p.y += v.y * dt;
      // The rim: stop at the edge and bounce back a little.
      const r = Math.hypot(p.x, p.y);
      const lim = 1 - BALL;
      if (r > lim) {
        const nx = p.x / r;
        const ny = p.y / r;
        p.x = nx * lim;
        p.y = ny * lim;
        const radial = v.x * nx + v.y * ny;
        if (radial > 0) {
          v.x -= 1.3 * radial * nx;
          v.y -= 1.3 * radial * ny;
        }
      }
    };

    const draw = () => {
      const plate = plateEl.current;
      const ball = ballEl.current;
      if (!plate || !ball) return;
      const radius = plate.clientWidth / 2;
      ball.style.transform = `translate(${pos.current.x * radius}px, ${pos.current.y * radius}px)`;
      // The trail: a few fading ghosts where the ball just was.
      const path = trailPath.current;
      path.unshift({ x: pos.current.x, y: pos.current.y });
      if (path.length > TRAIL * TRAIL_STEP + 1) path.length = TRAIL * TRAIL_STEP + 1;
      trailEls.current.forEach((el, i) => {
        const p = path[Math.min(path.length - 1, (i + 1) * TRAIL_STEP)];
        if (el && p) el.style.transform = `translate(${p.x * radius}px, ${p.y * radius}px) scale(${1 - (i + 1) * 0.12})`;
      });
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!done.current) {
        if (phaseRef.current === 'ready') {
          const el = (now - readyStart.current) / 1000;
          const r = Math.max(1, Math.ceil(READY - el));
          if (r !== shownReady) setReadyLeft((shownReady = r));
          if (el >= READY) {
            if (!modeRef.current) goManual('nosensor');
            if (latest.current) base.current = { ...latest.current };
            pos.current = { x: 0, y: 0 };
            vel.current = { x: 0, y: 0 };
            drift.current.next = 0;
            playStart.current = now;
            last = now;
            phaseRef.current = 'play';
            setPhase('play');
          }
        } else if (phaseRef.current === 'play') {
          physics(dt, now);
          const el = (now - playStart.current) / 1000;
          const isIn = Math.hypot(pos.current.x, pos.current.y) <= ZONE;
          if (isIn) insideTime.current += dt;
          if (isIn !== insideRef.current) setInside((insideRef.current = isIn));
          const l = Math.max(0, Math.ceil(ROUND - el));
          if (l !== shownLeft) setLeft((shownLeft = l));
          const pts = Math.min(100, Math.round((100 * insideTime.current) / ROUND));
          if (pts !== shownPoints) setPoints((shownPoints = pts));
          if (!half && el >= SWITCH_AT) {
            half = true;
            setSecondHalf(true);
            try {
              navigator.vibrate?.(250);
            } catch {
              /* no vibration: the banner is enough */
            }
          }
          const showBanner = el >= SWITCH_AT && el < SWITCH_AT + 4;
          if (showBanner !== banner) setSwitchBanner((banner = showBanner));
          if (el >= ROUND) finish();
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dragging (without the sensor): the ball is pulled towards the finger or mouse.
  const toPlate = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const half = r.width / 2;
    return { x: (e.clientX - r.left - half) / half, y: (e.clientY - r.top - half) / half };
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (modeRef.current !== 'manual') return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = toPlate(e);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current) drag.current = toPlate(e);
  };
  const endDrag = () => {
    drag.current = null;
  };

  const recenter = () => {
    if (latest.current) base.current = { ...latest.current };
  };

  const noteText =
    note === 'denied'
      ? t('De bewegingssensor mag niet meedoen. Sleep het balletje of gebruik de pijltjestoetsen, tegen de wind in.', 'The motion sensor is not allowed. Drag the ball or use the arrow keys, against the wind.')
      : note === 'chosen'
        ? t('Je speelt zonder sensor: sleep het balletje of gebruik de pijltjestoetsen, tegen de wind in.', 'You play without the sensor: drag the ball or use the arrow keys, against the wind.')
        : t('Geen bewegingssensor gevonden. Sleep het balletje of gebruik de pijltjestoetsen, tegen de wind in.', 'No motion sensor found. Drag the ball or use the arrow keys, against the wind.');

  // Sounds and touch: the countdown ticks, the start, the switch, the ring, and the last seconds.
  const lastRingSound = useRef(0);
  useEffect(() => {
    if (phase === 'ready') sfx.tick();
  }, [phase, readyLeft]);
  useEffect(() => {
    if (phase !== 'play') return;
    sfx.start();
    haptic(12);
  }, [phase]);
  useEffect(() => {
    if (secondHalf) sfx.start();
  }, [secondHalf]);
  useEffect(() => {
    if (phaseRef.current !== 'play' || done.current) return;
    const now = performance.now();
    if (now - lastRingSound.current < RING_SOUND_MS) return;
    lastRingSound.current = now;
    if (inside) {
      sfx.good();
      haptic(12);
    } else {
      sfx.bad();
      haptic([20, 30, 20]);
    }
  }, [inside]);
  useEffect(() => {
    if (phase === 'play' && left > 0 && left <= 3) sfx.tick();
  }, [phase, left]);

  const th = GAME_THEME.balance;
  const tone = inside ? { glow: th.glow, soft: th.soft, deep: '#0a6b5d' } : { glow: '#ffb238', soft: '#ffd98a', deep: '#8a4a00' };
  const sphere = (c: { glow: string; soft: string; deep: string }) => `radial-gradient(circle at 34% 30%, #ffffff 0%, ${c.soft} 22%, ${c.glow} 58%, ${c.deep} 100%)`;
  const plateBg = `radial-gradient(circle at 50% 36%, rgba(255,255,255,.14) 0%, rgba(255,255,255,.05) 45%, rgba(0,0,0,.3) 100%), radial-gradient(circle, ${th.to}, ${th.from})`;
  const playing = phase === 'play';

  return (
    <Stage game="balance" testId="balance-game" className="select-none">
      <div className="flex flex-col items-center" data-mode={mode ?? 'detecting'}>
        {phase === 'permission' ? (
          <div className="game-rise flex w-full max-w-sm flex-col items-center gap-3 py-4 text-center">
            <div aria-hidden className="relative mb-1 grid h-28 w-28 place-items-center rounded-full" style={{ background: plateBg, boxShadow: `inset 0 2px 0 rgba(255,255,255,.14), 0 0 0 1px rgba(255,255,255,.12), 0 0 44px -6px ${th.glow}99` }}>
              <div className="h-12 w-12 rounded-full border-2" style={{ borderColor: th.glow, boxShadow: `0 0 16px ${th.glow}, inset 0 0 12px ${th.glow}66` }} />
              <div className="game-float absolute h-6 w-6 rounded-full" style={{ background: sphere({ glow: th.glow, soft: th.soft, deep: '#0a6b5d' }), boxShadow: `0 0 14px ${th.glow}` }} />
            </div>
            <h2 className="text-[21px] font-black tracking-wide text-white">{t('Kantel om te sturen', 'Tilt to steer')}</h2>
            <p className="text-[15px] leading-snug text-white/75">{t('Je telefoon vraagt eerst toestemming voor de bewegingssensor. Daarmee stuur je het balletje door je telefoon te kantelen.', 'Your phone first asks permission for the motion sensor. With it you steer the ball by tilting your phone.')}</p>
            <GameButton data-testid="balance-sensor" className="mt-2 w-full" disabled={asking} aria-busy={asking} onClick={() => void askSensor()}>
              {asking && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-[#2b1d03]/25 border-t-[#2b1d03]" />}
              {t('Sensor aanzetten', 'Turn on sensor')}
            </GameButton>
            <GameButton tone="glass" className="w-full" onClick={withoutSensor}>{t('Zonder sensor spelen', 'Play without sensor')}</GameButton>
          </div>
        ) : (
          <>
            <Hud>
              <HudPill label={t('Tijd', 'Time')} value={`${playing ? left : ROUND}s`} />
              <HudPill testId="balance-points" label={t('Punten', 'Points')} value={points} accent={th.soft} />
              <HudPill label={t('Been', 'Leg')} value={secondHalf ? '2/2' : '1/2'} />
            </Hud>
            <GlowBar game="balance" value={playing ? left / ROUND : 1} />
            <p className="mt-3 text-center text-[17px] font-black tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,.5)]" aria-live="polite">
              {secondHalf ? t('Nu op je andere been', 'Now on your other leg') : t('Sta op één been', 'Stand on one leg')}
            </p>
            <div
              ref={plateEl}
              className="relative mt-3 aspect-square w-full max-w-[300px] touch-none rounded-full"
              style={{
                touchAction: 'none',
                cursor: mode === 'manual' ? 'grab' : undefined,
                background: plateBg,
                boxShadow: `inset 0 2px 0 rgba(255,255,255,.16), inset 0 -18px 40px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.12), 0 0 0 8px rgba(255,255,255,.03), 0 26px 50px -18px rgba(0,0,0,.85), 0 0 60px -12px ${th.glow}${inside ? 'aa' : '55'}`,
                transition: 'box-shadow 400ms ease',
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              role="img"
              aria-label={t('Een rond plateau met een balletje. Houd het balletje in de middelste ring.', 'A round plate with a ball. Keep the ball in the middle ring.')}
            >
              {/* Fine concentric rings and a faint crosshair, like an instrument. */}
              {[0.9, 0.7, 0.5].map((f) => (
                <div key={f} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.08]" style={{ width: `${f * 100}%`, height: `${f * 100}%` }} />
              ))}
              <div aria-hidden className="pointer-events-none absolute bottom-[7%] left-1/2 top-[7%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
              <div aria-hidden className="pointer-events-none absolute left-[7%] right-[7%] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              {/* The target ring: glows brighter while the ball is inside. */}
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[box-shadow,border-color,opacity] duration-300"
                style={{
                  width: `${ZONE * 100}%`,
                  height: `${ZONE * 100}%`,
                  border: `2px solid ${inside ? th.glow : 'rgba(255,255,255,.3)'}`,
                  background: `radial-gradient(circle, ${th.glow}${inside ? '44' : '12'} 0%, ${th.glow}${inside ? '18' : '06'} 60%, transparent 76%)`,
                  boxShadow: inside ? `0 0 28px ${th.glow}aa, inset 0 0 24px ${th.glow}77` : 'inset 0 0 14px rgba(0,0,0,.4)',
                }}
              >
                {inside && playing && <div className="game-glow absolute -inset-2.5 rounded-full border" style={{ borderColor: `${th.soft}88`, boxShadow: `0 0 18px ${th.glow}88` }} />}
                <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
              </div>
              {/* The ball: a glossy sphere with a highlight, a soft shadow and a short fading trail. */}
              <div className="pointer-events-none absolute left-1/2 top-1/2" style={{ width: `${BALL * 100}%`, height: `${BALL * 100}%`, marginLeft: `${-BALL * 50}%`, marginTop: `${-BALL * 50}%` }}>
                {showTrail &&
                  Array.from({ length: TRAIL }, (_, i) => (
                    <div
                      key={i}
                      ref={(el) => {
                        trailEls.current[i] = el;
                      }}
                      aria-hidden
                      className="absolute inset-0 rounded-full blur-[2px] transition-[background-color] duration-300"
                      style={{ backgroundColor: tone.glow, opacity: 0.34 - i * 0.06 }}
                    />
                  ))}
                <div ref={ballEl} aria-hidden className="relative h-full w-full">
                  <div className="absolute inset-0 translate-x-[14%] translate-y-[36%] scale-90 rounded-full bg-black/60 blur-[5px]" />
                  <div className="absolute inset-0 rounded-full transition-[box-shadow] duration-300" style={{ background: sphere(tone), boxShadow: `0 0 18px ${tone.glow}cc, 0 0 4px ${tone.soft}, inset -3px -5px 10px rgba(0,0,0,.35)` }} />
                  <div className="absolute left-[20%] top-[14%] h-[30%] w-[38%] rounded-full bg-white/85 blur-[1.5px]" />
                </div>
              </div>
              {phase === 'ready' && (
                <div className="absolute inset-0 grid place-items-center rounded-full bg-[#031615]/70 backdrop-blur-[3px]">
                  <div className="text-center" aria-live="assertive">
                    <p key={readyLeft} className="game-pop text-[76px] font-black leading-none tabular-nums" style={{ color: th.soft, textShadow: `0 0 30px ${th.glow}, 0 0 8px ${th.glow}` }}>{readyLeft}</p>
                    <p className="mt-2 px-6 text-[15px] font-semibold text-white/80">{t('Ga op één been staan', 'Stand on one leg')}</p>
                  </div>
                </div>
              )}
              {switchBanner && (
                <div className="pointer-events-none absolute inset-x-0 top-[36%] flex justify-center px-6" role="status">
                  <div className="game-pop rounded-2xl px-5 py-2.5 text-center text-[19px] font-black tracking-wide text-[#2b1d03] shadow-[0_10px_30px_-6px_rgba(243,207,107,.85)]" style={{ background: GOLD }}>
                    {t('Wissel van been!', 'Switch legs!')}
                  </div>
                </div>
              )}
            </div>
            <p className="mt-4 max-w-sm text-center text-[13.5px] leading-snug text-white/70">
              {mode === 'manual'
                ? noteText
                : t('Houd je telefoon plat voor je borst. Kantel heel licht om het balletje in de ring te houden.', 'Hold your phone flat in front of your chest. Tilt very gently to keep the ball in the ring.')}
            </p>
            <p className="mt-1 max-w-sm text-center text-[12.5px] text-white/50">{t('Houd je zo nodig vast aan een stoel of aanrecht.', 'Hold on to a chair or counter if you need to.')}</p>
            {mode === 'sensor' && playing && (
              <GameButton tone="glass" className="mt-3 min-h-[44px] px-4 text-[14px]" onClick={recenter}>{t('Midden opnieuw instellen', 'Reset the middle')}</GameButton>
            )}
          </>
        )}
      </div>
      <StopButton onClick={finish} label={t('Stoppen', 'Stop')} />
    </Stage>
  );
}
