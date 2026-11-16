import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { MinigameKey } from '@shared/minigames';
import { cn } from '@/lib/cn';

/**
 * The look and feel of the Speelhal: every game plays on a dark, softly glowing stage in its own colour,
 * with glass panels, gold for what counts, small sounds and a tap of vibration on hits. Shared here so
 * all nine feel like one premium set.
 */

/** Each game's colours: the stage gradient (from → to) and the glow of its play elements. */
export const GAME_THEME: Record<MinigameKey, { from: string; to: string; glow: string; soft: string }> = {
  balance: { from: '#062a2b', to: '#0d4b4a', glow: '#3fe0c5', soft: '#9ff3e4' },
  reaction: { from: '#2a1604', to: '#4d2a07', glow: '#ffb238', soft: '#ffd98a' },
  mirror: { from: '#1a0f33', to: '#33206b', glow: '#a98bff', soft: '#d6c8ff' },
  rhythm: { from: '#2b0a26', to: '#5a1650', glow: '#ff5fc8', soft: '#ffb3e6' },
  plate: { from: '#0b2615', to: '#1c4a2a', glow: '#7ee08a', soft: '#c6f3cb' },
  market: { from: '#2b1306', to: '#5b2810', glow: '#ff8a3d', soft: '#ffc49b' },
  breath: { from: '#071d33', to: '#0f3a63', glow: '#6cc6ff', soft: '#bfe6ff' },
  pain_facts: { from: '#120f2e', to: '#28246b', glow: '#8d9bff', soft: '#cdd3ff' },
  journey: { from: '#2a1d05', to: '#54400f', glow: '#ffd25e', soft: '#ffe9a8' },
};
export const GOLD = 'linear-gradient(135deg, #fff1c2 0%, #f3cf6b 38%, #d9a83a 70%, #fbe39a 100%)';

/** The dark stage a game plays on: its gradient, two slow glowing orbs, fine grain, rounded and deep. */
export function Stage({ game, children, className, testId }: { game: MinigameKey; children: ReactNode; className?: string; testId?: string }) {
  const th = GAME_THEME[game];
  return (
    <div
      data-testid={testId}
      className={cn('relative isolate overflow-hidden rounded-[28px] p-4 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,.6)] ring-1 ring-white/10 sm:p-5', className)}
      style={{ background: `radial-gradient(120% 90% at 50% 0%, ${th.to} 0%, ${th.from} 62%, #05070a 100%)` }}
    >
      <div aria-hidden className="game-orb pointer-events-none absolute -left-16 -top-20 -z-10 h-56 w-56 rounded-full blur-3xl" style={{ background: th.glow, opacity: 0.22 }} />
      <div aria-hidden className="game-orb pointer-events-none absolute -bottom-24 -right-10 -z-10 h-64 w-64 rounded-full blur-3xl [animation-delay:-6s]" style={{ background: th.soft, opacity: 0.14 }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[.07] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.9) 1px, transparent 1px)', backgroundSize: '3px 3px' }} />
      {children}
    </div>
  );
}

/** A glass pill for the head-up display: a label and a big number. */
export function HudPill({ label, value, accent, className, testId }: { label: ReactNode; value: ReactNode; accent?: string; className?: string; testId?: string }) {
  return (
    <div data-testid={testId} className={cn('flex min-w-[84px] flex-col items-center rounded-2xl border border-white/12 bg-white/[.07] px-3 py-1.5 backdrop-blur-md', className)}>
      <span className="text-[10.5px] font-semibold uppercase tracking-[.12em] text-white/60">{label}</span>
      <span className="text-[22px] font-extrabold leading-tight tabular-nums" style={{ color: accent ?? '#fff' }}>{value}</span>
    </div>
  );
}

/** The row of HUD pills along the top of a game. */
export function Hud({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex items-stretch justify-center gap-2">{children}</div>;
}

/** A thin glowing progress line (time left, breaths done…). */
export function GlowBar({ value, game }: { value: number; game: MinigameKey }) {
  const th = GAME_THEME[game];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10" role="presentation">
      <div className="h-full rounded-full transition-[width] duration-300 ease-linear" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: `linear-gradient(90deg, ${th.soft}, ${th.glow})`, boxShadow: `0 0 12px ${th.glow}` }} />
    </div>
  );
}

/** A premium button on the dark stage: gold (main action) or glass. */
export function GameButton({ tone = 'gold', className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'gold' | 'glass' }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'relative inline-flex min-h-[52px] select-none items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 text-[16px] font-extrabold tracking-wide transition-transform duration-150 active:scale-[.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
        tone === 'gold' ? 'game-shine text-[#2b1d03] shadow-[0_10px_30px_-8px_rgba(243,207,107,.7)]' : 'border border-white/15 bg-white/[.08] text-white backdrop-blur-md hover:bg-white/[.13]',
        className,
      )}
      style={tone === 'gold' ? { background: GOLD, ...rest.style } : rest.style}
    >
      {children}
    </button>
  );
}

/** The quiet "Stop" link at the bottom of every game. */
export function StopButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="mt-3 flex justify-center">
      <button type="button" data-testid="game-stop" onClick={onClick} className="min-h-[44px] rounded-xl px-5 text-[14px] font-semibold text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">{label}</button>
    </div>
  );
}

/* ---- Sound and touch ---- */

const SOUND_KEY = 'fp.games.sound';
export function soundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}
export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    /* storage optional */
  }
}
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (!soundOn()) return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}
/** A short synthesized tone: no sound files, nothing to load. */
function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, slideTo?: number, delay = 0) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}
/** Little sounds for the games (quiet, short, pleasant). */
export const sfx = {
  tap: () => tone(660, 0.07, 'triangle', 0.08),
  good: () => { tone(880, 0.09, 'triangle', 0.1); tone(1320, 0.12, 'sine', 0.07, undefined, 0.06); },
  bad: () => tone(220, 0.16, 'sawtooth', 0.05, 140),
  tick: () => tone(1200, 0.03, 'square', 0.03),
  beat: (accent = false) => tone(accent ? 1046 : 784, 0.05, 'square', accent ? 0.09 : 0.06),
  start: () => { tone(523, 0.1, 'triangle', 0.08); tone(784, 0.14, 'triangle', 0.08, undefined, 0.1); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, undefined, i * 0.11)),
  star: (n: number) => tone(660 + n * 220, 0.18, 'sine', 0.09, undefined, 0),
};
/** A small buzz on phones that can (ignored elsewhere). */
export function haptic(pattern: number | number[] = 12) {
  try {
    if (soundOn()) navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

/** A toggle for sound and vibration, remembered on this device. */
export function SoundToggle({ labelOn, labelOff }: { labelOn: string; labelOff: string }) {
  const [on, setOn] = useState(soundOn);
  return (
    <button
      type="button"
      data-testid="game-sound"
      aria-pressed={on}
      onClick={() => { setSoundOn(!on); setOn(!on); if (!on) sfx.tap(); }}
      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/15 bg-white/[.07] px-3 text-[13px] font-semibold text-white/85 backdrop-blur-md hover:bg-white/[.12]"
    >
      <span aria-hidden>{on ? '🔊' : '🔇'}</span>
      {on ? labelOn : labelOff}
    </button>
  );
}

/* ---- Celebration ---- */

/** A number that counts up to its value. */
export function CountUp({ value, ms = 900, className, testId }: { value: number; ms?: number; className?: string; testId?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || value <= 0) {
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / ms);
      setShown(Math.round(value * (1 - Math.pow(1 - u, 3))));
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <span data-testid={testId} data-value={value} className={className}>{shown}</span>;
}

/** A burst of gold and coloured confetti over its parent (off for reduced motion). */
export function Confetti({ fire, colors }: { fire: boolean; colors: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const cv = ref.current;
    const g = cv?.getContext('2d');
    if (!cv || !g) return;
    const W = (cv.width = cv.offsetWidth * devicePixelRatio);
    const H = (cv.height = cv.offsetHeight * devicePixelRatio);
    const bits = Array.from({ length: 90 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.2,
      y: H * 0.35,
      vx: (Math.random() - 0.5) * W * 0.022,
      vy: -Math.random() * H * 0.03 - H * 0.008,
      r: (4 + Math.random() * 5) * devicePixelRatio,
      a: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let raf = 0;
    const t0 = performance.now();
    const step = () => {
      g.clearRect(0, 0, W, H);
      const life = (performance.now() - t0) / 2200;
      for (const b of bits) {
        b.vy += H * 0.0009;
        b.x += b.vx;
        b.y += b.vy;
        b.a += b.va;
        g.save();
        g.globalAlpha = Math.max(0, 1 - life);
        g.translate(b.x, b.y);
        g.rotate(b.a);
        g.fillStyle = b.c;
        g.fillRect(-b.r, -b.r * 0.45, b.r * 2, b.r * 0.9);
        g.restore();
      }
      if (life < 1) raf = requestAnimationFrame(step);
      else g.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [fire, colors]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full" />;
}

/** A gold star (filled or empty), for results and goals. */
export function GoldStar({ on, size = 28, className, style }: { on: boolean; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={className} style={style}>
      <defs>
        <linearGradient id="gstar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset=".45" stopColor="#f3cf6b" />
          <stop offset="1" stopColor="#c8932a" />
        </linearGradient>
      </defs>
      <path d="M12 2.6l2.86 5.8 6.4.93-4.63 4.51 1.09 6.37L12 17.2l-5.72 3.01 1.09-6.37L2.74 9.33l6.4-.93z" fill={on ? 'url(#gstar)' : 'rgba(255,255,255,.12)'} stroke={on ? '#fff2c0' : 'rgba(255,255,255,.25)'} strokeWidth="0.8" strokeLinejoin="round" style={on ? { filter: 'drop-shadow(0 0 6px rgba(243,207,107,.8))' } : undefined} />
    </svg>
  );
}
