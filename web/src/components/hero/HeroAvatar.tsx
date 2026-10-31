import { Bike, CircleDot, Dumbbell, Footprints, Mountain, Music, Shield, Target, Trophy, Waves, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { HeroLook } from '@shared/hero';

/** Skin tones and outfit colours: calm, in the FP palette. */
export const SKIN: Record<string, string> = { s1: '#f6dcc8', s2: '#eac2a4', s3: '#d6a37f', s4: '#b47c56', s5: '#8a5a3b', s6: '#5e3b25' };
export const OUTFIT: Record<string, { main: string; soft: string }> = {
  forest: { main: '#29483c', soft: '#e6eee8' },
  sand: { main: '#a88f63', soft: '#f3efe7' },
  ocean: { main: '#1d5f99', soft: '#e7f0f9' },
  berry: { main: '#8e3b5f', soft: '#f6e7ee' },
  slate: { main: '#46554e', soft: '#e8eee9' },
  sun: { main: '#b5781a', soft: '#fbf0d9' },
};
const HAIR_COLOUR = '#2b2119';
export const SPORT_ICON: Record<string, LucideIcon> = {
  running: Footprints, football: CircleDot, fitness: Dumbbell, cycling: Bike, tennis: Target,
  swimming: Waves, hockey: Shield, dance: Music, walking: Mountain, other: Trophy,
};

function Hair({ style }: { style: string }) {
  const f = HAIR_COLOUR;
  switch (style) {
    case 'short':
      return <path d="M38 46c0-15 10-24 22-24s22 9 22 24c-4-6-10-9-22-9s-18 3-22 9z" fill={f} />;
    case 'long':
      return <path d="M36 50c0-18 10-28 24-28s24 10 24 28v26c-4-2-6-6-6-12V48c-5-6-11-8-18-8s-13 2-18 8v16c0 6-2 10-6 12z" fill={f} />;
    case 'curly':
      return <path d="M36 46c-3-10 5-20 12-20 3-6 15-7 18-1 9-1 17 8 14 17 4 4 2 10-2 11-2-7-8-12-18-12s-17 5-19 12c-5-1-7-6-5-7z" fill={f} />;
    case 'bun':
      return (
        <g fill={f}>
          <circle cx="60" cy="18" r="8" />
          <path d="M38 46c0-15 10-24 22-24s22 9 22 24c-5-7-11-10-22-10s-17 3-22 10z" />
        </g>
      );
    case 'buzz':
      return <path d="M39 44c1-13 10-21 21-21s20 8 21 21c-5-5-12-7-21-7s-16 2-21 7z" fill={f} opacity=".55" />;
    default:
      return null;
  }
}

/** The patient's sports hero: face, hair, outfit and a sport emblem. Decorative (aria-hidden). */
export function HeroAvatar({ look, size = 96, className, level }: { look: Pick<HeroLook, 'skin' | 'hair' | 'outfit' | 'sport'>; size?: number; className?: string; level?: number }) {
  const skin = SKIN[look.skin] ?? SKIN.s3;
  const outfit = OUTFIT[look.outfit] ?? OUTFIT.forest;
  const Icon = SPORT_ICON[look.sport] ?? Trophy;
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <circle cx="60" cy="60" r="58" fill={outfit.soft} />
        <clipPath id="hero-clip"><circle cx="60" cy="60" r="58" /></clipPath>
        <g clipPath="url(#hero-clip)">
          <path d="M18 120c2-24 18-36 42-36s40 12 42 36z" fill={outfit.main} />
          <path d="M50 84l10 12 10-12" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" />
          <rect x="53" y="66" width="14" height="16" rx="6" fill={skin} />
          <circle cx="60" cy="50" r="22" fill={skin} />
          <Hair style={look.hair} />
          <circle cx="52" cy="52" r="2.4" fill="#202b26" />
          <circle cx="68" cy="52" r="2.4" fill="#202b26" />
          <path d="M53 60c4 4 10 4 14 0" fill="none" stroke="#202b26" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </svg>
      <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border-2 border-white text-white" style={{ background: outfit.main, width: size * 0.34, height: size * 0.34 }}>
        <Icon style={{ width: size * 0.18, height: size * 0.18 }} strokeWidth={2.2} />
      </span>
      {level !== undefined && (
        <span className="absolute -left-1 -top-1 flex min-w-[26px] items-center justify-center rounded-full border-2 border-white bg-sand px-1.5 font-display text-[12px] font-bold leading-[22px] text-sand-ink">
          {level}
        </span>
      )}
    </span>
  );
}
