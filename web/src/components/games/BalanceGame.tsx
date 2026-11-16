import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
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

  return (
    <div className="flex select-none flex-col items-center gap-3 py-2" data-testid="balance-game" data-mode={mode ?? 'detecting'}>
      {phase === 'permission' ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-3 py-6 text-center">
          <p className="text-[15px] text-ink-800">{t('Je telefoon vraagt eerst toestemming voor de bewegingssensor. Daarmee stuur je het balletje door je telefoon te kantelen.', 'Your phone first asks permission for the motion sensor. With it you steer the ball by tilting your phone.')}</p>
          <Button size="xl" className="w-full" data-testid="balance-sensor" loading={asking} onClick={() => void askSensor()}>{t('Sensor aanzetten', 'Turn on sensor')}</Button>
          <Button variant="secondary" size="lg" className="w-full" onClick={withoutSensor}>{t('Zonder sensor spelen', 'Play without sensor')}</Button>
        </div>
      ) : (
        <>
          <div className="flex w-full max-w-sm items-center justify-between text-[14px] text-ink-600" aria-live="off">
            <span>{phase === 'play' ? t(`Nog ${left} s`, `${left} s left`) : t('Klaarmaken…', 'Get ready…')}</span>
            <span className="font-semibold text-ink-900" data-testid="balance-points">{t(`${points} punten`, `${points} points`)}</span>
          </div>
          <p className="text-center text-[15px] font-semibold text-ink-900" aria-live="polite">
            {secondHalf ? t('Nu op je andere been', 'Now on your other leg') : t('Sta op één been', 'Stand on one leg')}
          </p>
          <div
            ref={plateEl}
            className="relative aspect-square w-full max-w-[300px] touch-none rounded-full border-4 border-line bg-canvas shadow-inner"
            style={{ touchAction: 'none', cursor: mode === 'manual' ? 'grab' : undefined }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            role="img"
            aria-label={t('Een rond plateau met een balletje. Houd het balletje in de middelste ring.', 'A round plate with a ball. Keep the ball in the middle ring.')}
          >
            <div
              aria-hidden
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-dashed ${inside ? 'border-ok bg-ok-soft/60' : 'border-ink-300 bg-white/40'}`}
              style={{ width: `${ZONE * 100}%`, height: `${ZONE * 100}%` }}
            />
            <div className="pointer-events-none absolute left-1/2 top-1/2" style={{ width: `${BALL * 100}%`, height: `${BALL * 100}%`, marginLeft: `${-BALL * 50}%`, marginTop: `${-BALL * 50}%` }}>
              <div
                ref={ballEl}
                aria-hidden
                className="h-full w-full rounded-full shadow-md"
                style={{ background: inside ? 'radial-gradient(circle at 35% 35%, #e9f8ee, #3f9a68 70%)' : 'radial-gradient(circle at 35% 35%, #fff1df, #d9822b 70%)' }}
              />
            </div>
            {phase === 'ready' && (
              <div className="absolute inset-0 grid place-items-center rounded-full bg-white/70">
                <div className="text-center">
                  <p className="text-[56px] font-extrabold leading-none text-ink-950" aria-live="assertive">{readyLeft}</p>
                  <p className="mt-1 px-6 text-[14px] text-ink-700">{t('Ga op één been staan', 'Stand on one leg')}</p>
                </div>
              </div>
            )}
            {switchBanner && (
              <div className="absolute inset-x-0 top-[38%] mx-auto w-[80%] rounded-xl bg-[#1f5677] px-3 py-2 text-center text-[17px] font-bold text-white shadow-lg" role="status">
                {t('Wissel van been!', 'Switch legs!')}
              </div>
            )}
          </div>
          <p className="max-w-sm text-center text-[13.5px] text-ink-600">
            {mode === 'manual'
              ? noteText
              : t('Houd je telefoon plat voor je borst. Kantel heel licht om het balletje in de ring te houden.', 'Hold your phone flat in front of your chest. Tilt very gently to keep the ball in the ring.')}
          </p>
          <p className="max-w-sm text-center text-[12.5px] text-ink-500">{t('Houd je zo nodig vast aan een stoel of aanrecht.', 'Hold on to a chair or counter if you need to.')}</p>
          {mode === 'sensor' && phase === 'play' && (
            <Button variant="secondary" size="sm" className="min-h-[44px] px-4" onClick={recenter}>{t('Midden opnieuw instellen', 'Reset the middle')}</Button>
          )}
        </>
      )}
      <Button variant="ghost" size="sm" className="min-h-[44px] px-4" data-testid="game-stop" onClick={finish}>{t('Stoppen', 'Stop')}</Button>
    </div>
  );
}
