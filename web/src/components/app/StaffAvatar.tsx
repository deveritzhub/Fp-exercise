import { lazy, Suspense, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { Button, Dialog, Select, useToast } from '@/components/ui';
import { DEFAULT_LOOK, HERO_OPTIONS } from '@shared/hero';
import { SKIN_TONES } from '@/components/hero/HumanFigure';
import { LABELS } from '@/pages/patient/HeroPages';
const Hero3D = lazy(() => import('@/components/hero/Hero3D'));

/** How a professional looks in the village: the same choices as a patient's hero, without a name. */
export type StaffLook = { frame: string; build: string; skin: string; hair: string; hairColor: string; eyeColor: string; beard: string; glasses: string; outfit: string };
export const STAFF_DEFAULT: StaffLook = { frame: DEFAULT_LOOK.frame, build: DEFAULT_LOOK.build, skin: DEFAULT_LOOK.skin, hair: 'short', hairColor: DEFAULT_LOOK.hairColor, eyeColor: DEFAULT_LOOK.eyeColor, beard: 'none', glasses: 'none', outfit: 'forest' };
export const useStaffLook = () => useQuery({ queryKey: ['staff-avatar'], queryFn: () => api.get<{ look: StaffLook | null }>('/dashboard/avatar'), staleTime: 10 * 60_000 });

const FIELDS = ['frame', 'build', 'hair', 'hairColor', 'beard', 'glasses', 'outfit'] as const;

/**
 * The therapist puts their own figure together. It walks through the practice village, and it is
 * the figure the therapist's own patients find by the TV in the practice.
 */
export default function StaffAvatar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const toast = useToast();
  const qc = useQueryClient();
  const q = useStaffLook();
  const [look, setLook] = useState<StaffLook>(STAFF_DEFAULT);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setLook(q.data?.look ?? STAFF_DEFAULT);
  }, [open, q.data]);
  const legend: Record<(typeof FIELDS)[number], string> = {
    frame: t('Figuur', 'Figure'), build: t('Bouw', 'Build'), hair: t('Haar', 'Hair'), hairColor: t('Haarkleur', 'Hair colour'),
    beard: t('Baard', 'Beard'), glasses: t('Bril', 'Glasses'), outfit: t('Kleding', 'Clothing'),
  };
  const save = async () => {
    setBusy(true);
    try {
      qc.setQueryData(['staff-avatar'], await api.put<{ look: StaffLook }>('/dashboard/avatar', look));
      toast(t('Je poppetje is opgeslagen.', 'Your figure is saved.'));
      onClose();
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} sheet size="md" title={t('Mijn poppetje', 'My figure')}
      description={t('Zo loop je door het dorp, en zo sta je in de praktijk bij je eigen patiënten.', 'This is how you walk through the village, and how you stand in the practice for your own patients.')}
      footer={<Button className="w-full" size="lg" loading={busy} onClick={save} data-testid="save-avatar">{t('Opslaan', 'Save')}</Button>}>
      <div className="space-y-4" data-testid="staff-avatar">
        <Suspense fallback={<div className="h-[260px] animate-pulse rounded-2xl bg-[#E7EFE3]" />}>
          <Hero3D look={{ ...look, gear: [] }} className="h-[260px] w-full" />
        </Suspense>
        <fieldset>
          <legend className="label mb-1.5">{t('Huidskleur', 'Skin tone')}</legend>
          <div className="flex flex-wrap gap-2">
            {HERO_OPTIONS.skin.map((s, i) => (
              <button key={s} type="button" aria-pressed={look.skin === s} aria-label={t(`Huidskleur ${i + 1}`, `Skin tone ${i + 1}`)} onClick={() => setLook({ ...look, skin: s })}
                className="h-11 w-11 rounded-full border-2 border-transparent ring-1 ring-ink-200 aria-pressed:border-accent aria-pressed:ring-2 aria-pressed:ring-accent" style={{ background: SKIN_TONES[s] }} />
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <Select key={f} label={legend[f]} value={look[f]} onChange={(e) => setLook({ ...look, [f]: e.target.value })}>
              {(HERO_OPTIONS[f] as readonly string[]).map((v) => <option key={v} value={v}>{LABELS[f]?.[v]?.[nl ? 0 : 1] ?? v}</option>)}
            </Select>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
