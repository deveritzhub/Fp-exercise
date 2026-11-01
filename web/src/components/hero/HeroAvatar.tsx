import { Bike, CircleDot, Dumbbell, Footprints, Mountain, Music, Shield, Target, Trophy, Waves, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { HumanFigure, KIT, type FigureLook } from './HumanFigure';

export const SPORT_ICON: Record<string, LucideIcon> = {
  running: Footprints, football: CircleDot, fitness: Dumbbell, cycling: Bike, tennis: Target,
  swimming: Waves, hockey: Shield, dance: Music, walking: Mountain, other: Trophy,
};

/** The patient's sports hero as a portrait (head and shoulders of their own figure). Decorative. */
export function HeroAvatar({ look, size = 96, className, level, plain }: { look: FigureLook & { sport: string }; size?: number; className?: string; level?: number; plain?: boolean }) {
  const kit = KIT[look.outfit] ?? KIT.forest;
  const Icon = SPORT_ICON[look.sport] ?? Trophy;
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }} aria-hidden>
      <span className="absolute inset-0 overflow-hidden rounded-full" style={{ background: kit.soft }}>
        <HumanFigure look={look} viewBox="56 2 88 88" className="h-full w-full" />
      </span>
      {!plain && <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border-2 border-white text-white" style={{ background: kit.main, width: size * 0.34, height: size * 0.34 }}>
        <Icon style={{ width: size * 0.18, height: size * 0.18 }} strokeWidth={2.2} />
      </span>}
      {level !== undefined && (
        <span className="absolute -left-1 -top-1 flex min-w-[26px] items-center justify-center rounded-full border-2 border-white bg-sand px-1.5 font-display text-[12px] font-bold leading-[22px] text-sand-ink">
          {level}
        </span>
      )}
    </span>
  );
}
