import { useState } from 'react';
import { cn } from '@/lib/cn';

/** Painted icons for loot, weapons and tools (web/public/village/icons). Bump when a file changes. */
const ICONS = new Set(['axe', 'bone', 'button', 'chest', 'club', 'crown', 'egg', 'feather', 'fists', 'gel', 'gloves', 'hammer', 'hatchet', 'hero_sword', 'hide', 'horn', 'meat', 'spear', 'staff', 'sword', 'tusk', 'wood']);
const ICONS_VERSION = 1;

/** The painted icon for an item, or its emoji when there is no picture (yet, or it does not load). */
export function ItemIcon({ k, emoji, className, dim = false }: { k: string; emoji: string; className?: string; dim?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (!ICONS.has(k) || broken) return <span aria-hidden className={cn('leading-none', dim && 'opacity-60')}>{emoji}</span>;
  return <img src={`/village/icons/${k}.webp?v=${ICONS_VERSION}`} alt="" aria-hidden draggable={false} onError={() => setBroken(true)} className={cn('h-[80%] w-[80%] object-contain', dim && 'opacity-60 grayscale', className)} />;
}
