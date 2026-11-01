import { useState } from 'react';
import { cn } from '@/lib/cn';
import { heroPhotoKey } from '@shared/hero';
import { HumanFigure, type FigureLook } from './HumanFigure';

/**
 * The hero as a real person: a full-body photo matching figure, skin group and body type
 * (generated art, see server/db/seed-data/hero-assets.ts). Equipped gear shows as small product
 * photos; crutches get their own badge. Falls back to the drawn figure when a photo is missing.
 * Decorative: callers give the surrounding element its accessible name.
 */
export function HeroPhoto({ look, className, gearChips = true }: { look: FigureLook; className?: string; gearChips?: boolean }) {
  const [failed, setFailed] = useState(false);
  const gear = (look.gear ?? []).filter((g) => g !== 'crutches').slice(0, 3);
  const crutches = (look.gear ?? []).includes('crutches');
  return (
    <span className={cn('relative block overflow-hidden rounded-2xl bg-[#ece4d6]', className)} aria-hidden>
      {failed ? (
        <HumanFigure look={look} className="h-full w-full" />
      ) : (
        <img
          src={`/api/hero-assets/avatar/${heroPhotoKey(look, look.body ?? null)}`}
          alt=""
          className="h-full w-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      )}
      {!failed && gearChips && (gear.length > 0 || crutches) && (
        <span className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-wrap gap-1">
          {crutches && <GearChip id="crutches" />}
          {gear.map((g) => <GearChip key={g} id={g} />)}
        </span>
      )}
    </span>
  );
}

function GearChip({ id }: { id: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <span className="h-9 w-9 overflow-hidden rounded-lg border-2 border-white bg-white shadow-sm">
      <img src={`/api/hero-assets/item/${id}`} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} loading="lazy" />
    </span>
  );
}
