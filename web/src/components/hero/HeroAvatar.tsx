import { heroPhotoSources } from './HeroPhoto';
import { Bike, CircleDot, Dumbbell, Footprints, Mountain, Music, Shield, Target, Trophy, Waves, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { HumanFigure, KIT, type FigureLook } from './HumanFigure';

export const SPORT_ICON: Record<string, LucideIcon> = {
  running: Footprints, football: CircleDot, fitness: Dumbbell, cycling: Bike, tennis: Target,
  swimming: Waves, hockey: Shield, dance: Music, walking: Mountain, other: Trophy,
};

/** The patient's sports hero as a portrait: a photo of a real person by default, the drawing with photo={false}. Decorative. */
export function HeroAvatar({ look, size = 96, className, level, plain, photo = true }: { look: FigureLook & { sport: string }; size?: number; className?: string; level?: number; plain?: boolean; photo?: boolean }) {
  const kit = KIT[look.outfit] ?? KIT.forest;
  // Photorealistic portrait (generated art matching figure, skin and build); falls back to the drawing.
  const keys = heroPhotoSources(look);
  const [attempt, setAttempt] = useState(0);
  const usePhoto = photo && attempt < keys.length;
  const Icon = SPORT_ICON[look.sport] ?? Trophy;
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }} aria-hidden>
      <span className="absolute inset-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(32,43,38,0.14)]" style={{ background: `radial-gradient(120% 90% at 50% 18%, #fff 0%, ${kit.soft} 58%)` }}>
        {/* Tight crop so eyes, hair and kit read sharply inside the circle. */}
        {usePhoto ? (
          <img key={keys[attempt]} src={`/api/hero-assets/${keys[attempt]}`} alt="" className="h-full w-full scale-[2.4] object-cover object-[50%_0%] [transform-origin:50%_8%]" onError={() => setAttempt((a) => a + 1)} loading="lazy" />
        ) : (
          <HumanFigure look={look} portrait viewBox="68 -4 64 78" className="h-full w-full" />
        )}
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
