import { useEffect, useId, useState } from 'react';
import { levelFor, levelTier, type LevelTier } from '@shared/hero';
import { cn } from '@/lib/cn';

/**
 * Game feel for the sports hero: rank badge, XP bar, podium and count-up numbers. All motion is
 * decorative and stops under "prefers-reduced-motion" (see index.css); the numbers and labels are
 * always the real values, so nothing depends on an animation finishing.
 */

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts from `from` to `to` once; shows `to` straight away with reduced motion. */
export function useCountUp(to: number, from = to, ms = 900, delay = 0) {
  const [v, setV] = useState(() => (reducedMotion() ? to : from));
  useEffect(() => {
    if (reducedMotion() || from === to) {
      setV(to);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now + delay;
      const p = Math.min(1, Math.max(0, (now - start) / ms));
      setV(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, from, ms, delay]);
  return v;
}

/** Shield with the hero level in the colours of its rank. Decorative: callers name the level in text. */
export function LevelBadge({ level, size = 44, className, pop = false }: { level: number; size?: number; className?: string; pop?: boolean }) {
  const tier = levelTier(level);
  const id = useId();
  return (
    <span className={cn('relative inline-block shrink-0', pop && 'animate-level-pop', className)} style={{ width: size, height: size * 1.12 }} aria-hidden data-tier={tier.key}>
      <svg viewBox="0 0 50 56" className="h-full w-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]">
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={tier.light} />
            <stop offset="0.55" stopColor={tier.glow} />
            <stop offset="1" stopColor={tier.color} />
          </linearGradient>
        </defs>
        <path d="M25 2 46 10v20c0 13-9 20-21 24C13 50 4 43 4 30V10Z" fill={`url(#${id}g)`} stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M25 7 41 13v17c0 10-7 16-16 19-9-3-16-9-16-19V13Z" fill="#fff" opacity="0.92" />
        <path d="M9 14 25 8v6L9 20Z" fill={tier.light} opacity="0.7" />
      </svg>
      <span className="absolute inset-x-0 top-[22%] text-center font-display font-bold leading-none tabular-nums" style={{ color: tier.color, fontSize: size * (level >= 10 ? 0.36 : 0.42) }}>{level}</span>
    </span>
  );
}

/**
 * XP bar to the next level: thick, in the rank's colours, with a soft shine. `fromXp` animates the
 * fill and the number from an earlier total (e.g. before this workout), also across a level-up.
 */
export function XpBar({ xp, fromXp, label, className, compact = false }: { xp: number; fromXp?: number; label: string; className?: string; compact?: boolean }) {
  const L = levelFor(xp);
  const start = fromXp !== undefined && fromXp < xp ? fromXp : xp;
  const shown = useCountUp(xp, start, 1400, 350);
  const S = levelFor(shown);
  const tier = levelTier(S.level);
  return (
    <div className={className}>
      <div
        className={cn('relative w-full overflow-hidden rounded-full bg-ink-100 shadow-[inset_0_1px_2px_rgba(20,28,24,0.18)]', compact ? 'h-2.5' : 'h-4')}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(L.progress * 100)}
        aria-label={label}
      >
        <div className="relative h-full overflow-hidden rounded-full" style={{ width: `${Math.max(S.progress * 100, 3)}%`, background: `linear-gradient(90deg, ${tier.color}, ${tier.glow})` }}>
          <span className="absolute inset-x-0 top-0 h-1/2 rounded-full bg-white/25" />
          <span className="xp-shine absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        </div>
        {!compact && [0.25, 0.5, 0.75].map((x) => <span key={x} className="absolute inset-y-0 w-px bg-white/60" style={{ left: `${x * 100}%` }} />)}
      </div>
    </div>
  );
}

/** A number that counts up when it changes into view (coins, XP). The final value is the text for screen readers. */
export function CountUp({ value, from = 0, prefix = '', className }: { value: number; from?: number; prefix?: string; className?: string }) {
  const v = useCountUp(value, from, 900, 500);
  return (
    <span className={className}>
      <span aria-hidden>{prefix}{v}</span>
      <span className="sr-only">{prefix}{value}</span>
    </span>
  );
}

/**
 * Podium for the hero: a glow in the rank's colour, slow sparkles and a floor shadow. The child
 * (photo or drawing) "breathes" a little, so the hero feels alive.
 */
export function HeroStage({ level, children, className, cheer = false }: { level: number; children: React.ReactNode; className?: string; cheer?: boolean }) {
  const tier = levelTier(level);
  return (
    <span className={cn('relative inline-block', className)} data-tier={tier.key}>
      <span aria-hidden className="hero-aura pointer-events-none absolute -inset-3 rounded-[28px]" style={{ background: `radial-gradient(60% 55% at 50% 45%, ${tier.glow}66, transparent 70%)` }} />
      <span className={cn('relative block', cheer ? 'animate-hero-cheer' : 'hero-breathe')}>{children}</span>
      <Sparkles tier={tier} />
    </span>
  );
}

function Sparkles({ tier }: { tier: LevelTier }) {
  const spots = [
    { l: '-6%', t: '12%', s: 10, d: 0 },
    { l: '96%', t: '26%', s: 8, d: 1.1 },
    { l: '2%', t: '70%', s: 7, d: 2.0 },
    { l: '92%', t: '78%', s: 11, d: 0.6 },
  ];
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {spots.map((p, i) => (
        <svg key={i} viewBox="0 0 12 12" className="hero-sparkle absolute" style={{ left: p.l, top: p.t, width: p.s, height: p.s, animationDelay: `${p.d}s` }}>
          <path d="M6 0 7.4 4.6 12 6 7.4 7.4 6 12 4.6 7.4 0 6 4.6 4.6Z" fill={tier.glow} stroke="#fff" strokeWidth="0.6" />
        </svg>
      ))}
    </span>
  );
}

/** Rays behind a level-up badge. */
export function LevelUpBurst({ level }: { level: number }) {
  const tier = levelTier(level);
  return (
    <span className="relative inline-flex h-28 w-28 items-center justify-center" aria-hidden>
      <svg viewBox="0 0 100 100" className="level-rays absolute inset-0 h-full w-full">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M50 50 46 4h8Z" fill={tier.glow} opacity={i % 2 ? 0.35 : 0.6} transform={`rotate(${i * 30} 50 50)`} />
        ))}
      </svg>
      <LevelBadge level={level} size={64} pop />
    </span>
  );
}
