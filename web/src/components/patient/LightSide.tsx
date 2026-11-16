import { useQuery } from '@tanstack/react-query';
import { BookOpen, Lock, Sparkles } from 'lucide-react';
import { CREATURES, DROPS, LIGHT, LOOT, alphaAdvised, isAlpha, isHarvest, type CreatureKind } from '@shared/adventure';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui';

const WEAK_NL: Record<string, string> = { trained: 'trainen', hydrated: 'water drinken', moving: 'bewegen', rested: 'goed slapen', fed: 'goed eten' };
const WEAK_EN: Record<string, string> = { trained: 'training', hydrated: 'drinking water', moving: 'moving', rested: 'sleeping well', fed: 'eating well' };

/**
 * The light side: the helpers set free by beating a shadow creature, and the book of creatures that
 * Reason opens. What is not free yet says what sets it free.
 */
export function LightCard() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const q = useQuery({ queryKey: ['patient-adventure'], queryFn: () => api.get<{ light?: string[] }>('/patient/hero/adventure') });
  const light = new Set(q.data?.light ?? []);
  const kinds = (Object.keys(CREATURES) as CreatureKind[]).filter((k) => !isHarvest(k));
  return (
    <Card className="p-5">
      <h2 id="light-title" className="t-section flex items-center gap-2 scroll-mt-20"><Sparkles className="h-5 w-5 text-[#b8892a]" aria-hidden />{t('De lichtkant', 'The light side')}</h2>
      <p className="mt-1 text-[13.5px] text-ink-700">{t('Versla een schaduwmonster voor het eerst en je bevrijdt zijn tegenhanger. Die staat als schrijn in je stad en helpt je held voor altijd.', 'Beat a shadow creature for the first time and you set its counterpart free. It stands as a shrine in your town and helps your hero for good.')}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="light">
        {LIGHT.map((l) => {
          const free = light.has(l.key);
          const foe = CREATURES[l.from as CreatureKind];
          return (
            <li key={l.key} data-light={l.key} data-state={free ? 'free' : 'locked'} className={cn('flex items-start gap-3 rounded-xl border p-2.5', free ? 'border-[#e4bc63] bg-[#fffaf0]' : 'border-line bg-white')}>
              <span aria-hidden className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full text-[20px]', free ? '' : 'opacity-50 grayscale')} style={{ background: free ? `${l.color}55` : '#f0eee8' }}>{l.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-ink-950">{nl ? l.nl : l.en}</span>
                <span className="block text-[12.5px] text-ink-700">
                  {free ? (nl ? l.doesNl : l.doesEn) : <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" aria-hidden />{t(`Versla de ${foe.nl}`, `Beat the ${foe.en}`)}</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <h3 className="mt-5 flex items-center gap-1.5 text-[15px] font-semibold text-ink-950"><BookOpen className="h-4 w-4" aria-hidden />{t('Monsterboek', 'Book of creatures')}</h3>
      {light.has('reason') ? (
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line" data-testid="bestiary">
          {kinds.sort((a, b) => (isAlpha(a) ? alphaAdvised(a) : CREATURES[a].level) - (isAlpha(b) ? alphaAdvised(b) : CREATURES[b].level)).map((k) => {
            const c = CREATURES[k];
            return (
              <li key={k} data-creature={k} className="px-3 py-2 text-[13px] text-ink-800">
                <span className="font-semibold text-ink-950">{nl ? c.nl : c.en}</span> · {t('level', 'level')} {isAlpha(k) ? alphaAdvised(k) : c.level} · {c.hp} {t('leven', 'life')}
                <span className="block text-[12.5px] text-ink-700">
                  {t(`Zwak tegen ${WEAK_NL[c.weakTo] ?? c.weakTo}`, `Weak to ${WEAK_EN[c.weakTo] ?? c.weakTo}`)} · {t('buit', 'loot')}: {DROPS[k].map((d) => `${LOOT[d.item].icon} ${(nl ? LOOT[d.item].nl : LOOT[d.item].en).toLowerCase()}`).join(', ')}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-1 text-[13px] text-ink-600" data-testid="bestiary-locked">{t('Rede opent het monsterboek: versla het Tranenslijk in de onderwereld.', 'Reason opens the book of creatures: beat the Tear sludge in the underworld.')}</p>
      )}
    </Card>
  );
}
