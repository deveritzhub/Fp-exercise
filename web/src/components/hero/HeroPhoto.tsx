import { lazy, Suspense, useState } from 'react';
const PhotoEquipment=lazy(()=>import('./PhotoEquipment').then(m=>({default:m.PhotoEquipment})));
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';
import { heroPhotoKey, wornOutfit } from '@shared/hero';
import { COLLECTION_OUTFIT_KEYS } from '@shared/gearCollections';
import { HumanFigure, type FigureLook } from './HumanFigure';
import { WEAR_SLOTS, wearPlacements, type BodyKind } from './wear';

/**
 * The hero as a real person: a full-body photo matching figure, skin group, body type and
 * hairstyle (generated art, see server/db/seed-data/hero-assets.ts), or the bought outfit's photo. Worn gear is drawn on the
 * photo from cut-outs at fixed places per build (wear.ts); gear without a cut-out shows as a small
 * product photo. Falls back to the drawn figure when no photo loads.
 * Decorative: callers give the surrounding element its accessible name.
 */
/**
 * Photo sources in order of preference (paths under /api/hero-assets/): the bought outfit's photo
 * (per figure, skin group and build with the base hairstyle, or per personal/guest photo), then the
 * personal/guest photo, this hairstyle, and the base photo.
 */
export function heroPhotoSources(look: FigureLook): string[] {
  const outfit = wornOutfit(look.gear ?? []);
  // The new SVG collection outfits do not have per-body photographic assets yet.
  const outfitKeys = outfit && !COLLECTION_OUTFIT_KEYS.has(outfit) ? [...(look.photo ? [`outfit/${look.photo}__${outfit}`] : []), `outfit/${heroPhotoKey(look, look.body ?? null, false)}__${outfit}`] : [];
  const plain = [...(look.photo ? [look.photo] : []), heroPhotoKey(look, look.body ?? null), heroPhotoKey(look, look.body ?? null, false)].map((k) => `avatar/${k}`);
  return [...new Set([...outfitKeys, ...plain])];
}

type HeroPhotoProps = { look: FigureLook; className?: string; gearChips?: boolean; fittedGear?: boolean };
export function HeroPhoto(props: HeroPhotoProps) {
  return <HeroPhotoContent key={heroPhotoSources(props.look).join('|')} {...props}/>;
}
function HeroPhotoContent({ look, className, gearChips = false, fittedGear = false }: HeroPhotoProps) {
  // Try the personal/guest photo, then this hairstyle, then the base photo, then the drawing.
  const keys = heroPhotoSources(look);
  const { t } = useI18n();
  const [attempt, setAttempt] = useState(0);
  const failed = attempt >= keys.length;
  const gear = look.gear ?? [];
  const kind: BodyKind | undefined = look.body?.kind ?? ({ slim: 'lean', average: 'average', athletic: 'athletic', full: 'full' } as Record<string, BodyKind>)[look.build ?? 'average'];
  const worn = wearPlacements(gear, look.frame, kind);
  const chips = gear.filter((g) => !WEAR_SLOTS[g]).slice(0, 3);
  // Walking aids (switched on by the therapist) always show as a small label.
  const aid = gear.includes('crutches');
  return (
    <span className={cn('relative block overflow-hidden rounded-2xl bg-[#ece4d6]', className)} aria-hidden>
      {failed ? (
        <HumanFigure look={look} className="h-full w-full" />
      ) : (
        // A 3:4 layer that matches the photo exactly, so the gear lands on the body at any box size.
        <span className="absolute left-1/2 top-0 block aspect-[3/4] h-full -translate-x-1/2" style={fittedGear ? {transform:"translateX(-50%) scale(.92)",transformOrigin:"50% 50%"} : undefined}>
          <img key={keys[attempt]} src={`/api/hero-assets/${keys[attempt]}`} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setAttempt((a) => a + 1)} />
          {fittedGear && <Suspense fallback={null}><PhotoEquipment look={look} source={`/api/hero-assets/${keys[attempt]}`}/></Suspense>}
          {worn.map((p, i) => <WearItem key={`${p.key}-${i}`} p={p} />)}
        </span>
      )}
      {!failed && aid && (
        <span data-gear="crutches" aria-hidden className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-white/90 py-0.5 pl-0.5 pr-2 text-[11px] font-semibold text-ink-800 shadow-sm">
          <span className="h-6 w-6 overflow-hidden rounded-full bg-white"><img src="/api/hero-assets/item/crutches" alt="" className="h-full w-full object-cover" /></span>
          {t('Krukken', 'Crutches')}
        </span>
      )}
      {!failed && gearChips && chips.length > 0 && (
        <span className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-wrap gap-1">
          {chips.map((g) => <GearChip key={g} id={g} />)}
        </span>
      )}
    </span>
  );
}

function WearItem({ p }: { p: ReturnType<typeof wearPlacements>[number] }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={`/api/hero-assets/wear/${p.key}`}
      alt=""
      data-gear={p.key}
      loading="lazy"
      onError={() => setFailed(true)}
      className="pointer-events-none absolute object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]"
      style={{ left: `${p.left * 100}%`, top: `${p.top * 100}%`, width: `${p.width * 100}%`, height: p.height ? `${p.height * 100}%` : undefined, transform: [p.height ? '' : 'translateY(-50%)', p.mirror ? 'scaleX(-1)' : ''].join(' ').trim() || undefined }}
    />
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
