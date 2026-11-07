import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookmarkPlus, Check, Shirt, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui';
import { PhotoGearThumbnail } from './PhotoEquipment';
import { GearArtwork } from './RpgGear';
import { GEAR, gearTier } from '@shared/hero';
import { sameWardrobeLook, WARDROBE_SLOTS, type WardrobePreset } from '@shared/heroLoadouts';
import type { HeroState } from '@/lib/types';

/**
 * Three saved, account-scoped cosmetic outfits. All data is fetched from the patient-only API.
 * Loading a saved look uses the existing authenticated gear PUT (ownership checked on the server).
 * No medical or therapy data is stored here, and no reward or phase is unlocked.
 */
export function WardrobeSets({
  gear, disabled, onApply,
}: {
  gear: HeroState['gear'];
  disabled: boolean;
  onApply: (items: string[]) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState<number | null>(null);
  const q = useQuery({
    queryKey: ['hero-wardrobe-presets'],
    queryFn: () => api.get<{ presets: WardrobePreset[] }>('/patient/hero/loadouts'),
    retry: 1,
  });
  const slots = q.data?.presets ?? [];
  const pending = saving !== null || disabled;

  const save = async (slot: number) => {
    setSaving(slot);
    try {
      await api.put(`/patient/hero/loadouts/${slot}`, { equipped: gear.equipped });
      await qc.invalidateQueries({ queryKey: ['hero-wardrobe-presets'] });
      toast(t(`Look ${slot} bewaard`, `Look ${slot} saved`), 'ok');
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setSaving(null);
    }
  };
  const apply = async (preset: WardrobePreset) => {
    setSaving(preset.slot);
    try {
      await onApply(preset.gear);
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-[#d6dac9] bg-[linear-gradient(145deg,#f6f3e8,#eff3ed)] p-4 sm:p-5" aria-labelledby="wardrobe-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#343f2a] text-[#f2dfac]" aria-hidden="true">
          <Shirt className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="wardrobe-title" className="font-display text-[17px] font-bold text-ink-950">
            {t('Mijn uitrustingssets', 'My equipment sets')}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-700">
            {t('Bewaar drie looks en wissel met één tik. Je sets blijven bewaard op je account. Alleen cosmetisch: je behandelprogramma verandert niet.', 'Save three looks and switch with one tap. Your sets are saved to your account. Cosmetic only: your treatment programme does not change.')}
          </p>
        </div>
      </div>

      {q.isError && (
        <p className="mt-3 rounded-lg border border-line bg-white p-3 text-[13px] text-ink-700" role="status">
          {t('Je sets kunnen nu niet geladen worden. Probeer het opnieuw.', 'Your sets could not be loaded. Please retry.')}
          <button type="button" onClick={() => void q.refetch()} className="ml-2 min-h-[40px] font-semibold underline">
            {t('Opnieuw', 'Retry')}
          </button>
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {WARDROBE_SLOTS.map(slot => {
          const preset = slots.find(p => p.slot === slot);
          const equipped = preset?.gear ?? [];
          const wearing = !!preset && sameWardrobeLook(equipped, gear.equipped);
          const count = equipped.length;
          return (
            <div key={slot} className="min-w-0 rounded-xl border border-[#cbd1c4] bg-white/95 p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink-950">{t(`Look ${slot}`, `Look ${slot}`)}</p>
                {wearing && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                    <Check className="h-3 w-3" aria-hidden="true" />{t('Aangetrokken', 'Equipped')}
                  </span>
                )}
              </div>
              <div role="group" className="mt-3 flex min-h-[52px] items-center gap-1 overflow-hidden rounded-lg bg-[#f5f2ea] px-2" aria-label={preset ? t(`${count} bewaarde items`, `${count} saved items`) : t('Lege uitrustingsset', 'Empty equipment set')}>
                {preset && count > 0 ? (
                  <>
                    {equipped.slice(0, 4).map(key => (
                      <span key={key} className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-white" style={{ borderColor: gearTier(key).glow }} title={GEAR.find(g => g.key === key)?.[locale === 'nl' ? 'nl' : 'en'] ?? key} aria-hidden="true">
                        <PhotoGearThumbnail item={key} className="h-9 w-9" fallback={<GearArtwork item={key} className="h-9 w-9" />} />
                      </span>
                    ))}
                    {count > 4 && <span className="text-[12px] font-semibold text-ink-700">+{count - 4}</span>}
                  </>
                ) : <span className="flex items-center gap-1 text-[12px] text-ink-600"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{preset ? t('Zonder accessoires', 'No accessories') : t('Nog niet bewaard', 'Not saved yet')}</span>}
              </div>

              <div className="mt-3 grid gap-2">
                {preset && (
                  <button type="button" onClick={() => void apply(preset)} disabled={pending || wearing} className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#343f2a] px-2 py-2 text-[13px] font-semibold text-white disabled:opacity-55 hover:bg-[#4d6240] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#343f2a]">
                    {wearing ? t('Deze look draag je', 'Currently wearing') : t('Trek deze look aan', 'Equip this look')}
                  </button>
                )}
                <button type="button" onClick={() => void save(slot)} disabled={pending || q.isLoading || q.isError} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-[#b8c5b0] bg-white px-2 py-2 text-[13px] font-semibold text-[#343f2a] hover:bg-[#eef1e9] disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#343f2a]">
                  <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                  {preset ? t('Huidige look bewaren', 'Save current look') : t('Huidige look opslaan', 'Save current look')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-ink-600">
        {t('Alleen items die je bezit kunnen worden bewaard of aangetrokken. Medische hulpmiddelen blijven onder controle van je fysiotherapeut.', 'Only owned items can be saved or equipped. Medical aids remain under your physiotherapist’s control.')}
      </p>
    </section>
  );
}
