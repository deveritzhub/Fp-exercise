import { lazy, Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Lock, PawPrint } from 'lucide-react';
import { PETS, PET_LEVEL, PET_NAME_MAX, petByKey, petCoat } from '@shared/pets';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Button, Dialog, Input, Segmented, useToast } from '@/components/ui';

const PetPreview = lazy(() => import('./PetPreview'));

type Pet = { key: string; coat: number; name: string | null };
type AdventurePet = { level: number; pet?: Pet | null; petLevel?: number };

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/**
 * The pet: from adventure level 2 a dog or a cat walks along with the hero through the village.
 * A row that opens the choice: breed, coat and a name.
 */
export function PetCard({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const q = useQuery({ queryKey: ['patient-adventure'], queryFn: () => api.get<AdventurePet>('/patient/hero/adventure') });
  const [open, setOpen] = useState(false);
  if (!q.data) return null;
  const a = q.data;
  const locked = a.level < PET_LEVEL;
  const breed = petByKey(a.pet?.key);
  return (
    <>
      <button
        type="button"
        data-testid="pet-card"
        data-state={locked ? 'locked' : breed ? 'chosen' : 'open'}
        disabled={locked}
        onClick={() => setOpen(true)}
        className={cn('tap flex w-full items-center gap-3 rounded-xl border p-3 text-left', locked ? 'cursor-default border-line bg-canvas' : 'border-[#e4bc63] bg-[#fbf0d9] hover:border-[#b8892a]', className)}
      >
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-[22px]">{locked ? <Lock className="h-5 w-5 text-ink-500" /> : breed ? (breed.kind === 'cat' ? '🐈' : '🐕') : <PawPrint className="h-5 w-5 text-[#6b4705]" />}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold text-ink-950">
            {breed ? (a.pet?.name ? `${a.pet.name} · ${nl ? breed.nl : breed.en}` : nl ? breed.nl : breed.en) : t('Huisdier', 'Pet')}
          </span>
          <span className="block text-[12.5px] text-ink-700">
            {locked
              ? t(`Vanaf avonturier level ${PET_LEVEL} kies je een hond of kat die met je meeloopt.`, `From adventurer level ${PET_LEVEL} you choose a dog or cat that walks with you.`)
              : breed
                ? t('Loopt met je mee door het dorp. Tik om te wisselen.', 'Walks with you through the village. Tap to change.')
                : t('Kies een hond of kat die met je meeloopt door het dorp.', 'Choose a dog or cat that walks with you through the village.')}
          </span>
        </span>
        {!locked && <ChevronRight className="h-5 w-5 shrink-0 text-ink-600" aria-hidden />}
      </button>
      {open && <PetDialog current={a.pet ?? null} onClose={() => setOpen(false)} />}
    </>
  );
}

function PetDialog({ current, onClose }: { current: Pet | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const [key, setKey] = useState(current?.key ?? 'whippet');
  const breed = petByKey(key) ?? PETS[0];
  const [kind, setKind] = useState<'dog' | 'cat'>(breed.kind);
  const [coat, setCoat] = useState(current?.key === key ? current.coat : 0);
  const [name, setName] = useState(current?.name ?? '');
  const [busy, setBusy] = useState(false);
  const pick = (k: string) => {
    setKey(k);
    setCoat(0);
  };
  const save = async (none = false) => {
    setBusy(true);
    try {
      const r = await api.put<AdventurePet>('/patient/hero/adventure/pet', none ? { key: null } : { key: breed.key, coat, name: name.trim() || null });
      qc.setQueryData(['patient-adventure'], (old: object | undefined) => ({ ...(old ?? {}), ...r }));
      void qc.invalidateQueries({ queryKey: ['patient-adventure'] });
      toast(none ? t('Je huisdier blijft voortaan thuis.', 'Your pet stays at home from now on.') : t(`${name.trim() || (nl ? breed.nl : breed.en)} loopt nu met je mee!`, `${name.trim() || breed.en} now walks with you!`));
      onClose();
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  const c = petCoat(breed, coat);
  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={t('Kies je huisdier', 'Choose your pet')}
      footer={
        <>
          {current && <Button variant="ghost" disabled={busy} onClick={() => void save(true)} data-testid="pet-none">{t('Geen huisdier', 'No pet')}</Button>}
          <Button onClick={() => void save()} disabled={busy} data-testid="pet-save">{t('Kiezen', 'Choose')}</Button>
        </>
      }
    >
      <div data-testid="pet-dialog">
        <div className="relative h-44 overflow-hidden rounded-xl bg-gradient-to-b from-[#eef4e6] to-[#dfe9cf]">
          <Suspense fallback={null}>
            <PetPreview k={breed.key} coat={coat} />
          </Suspense>
          <p className="absolute left-3 top-2 text-[13px] font-semibold text-ink-800">{nl ? breed.nl : breed.en} · {nl ? c.nl : c.en}</p>
        </div>
        <div className="mt-3">
          <Segmented
            label={t('Hond of kat', 'Dog or cat')}
            value={kind}
            onChange={(v) => {
              setKind(v);
              pick(v === 'cat' ? 'siberian' : 'whippet');
            }}
            options={[
              { value: 'dog', label: t('Honden', 'Dogs') },
              { value: 'cat', label: t('Katten', 'Cats') },
            ]}
          />
        </div>
        <fieldset className="mt-3">
          <legend className="mb-1.5 text-[13px] font-semibold text-ink-800">{t('Ras', 'Breed')}</legend>
          <div className="grid max-h-[30vh] grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3" tabIndex={0} aria-label={t('Rassen', 'Breeds')}>
            {PETS.filter((p) => p.kind === kind).map((p) => (
              <label key={p.key} data-testid={`pet-${p.key}`} className={cn('tap relative flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13.5px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent', key === p.key ? 'border-[#b8892a] bg-[#fbf0d9] font-semibold text-ink-950' : 'border-line bg-white text-ink-800')}>
                <input type="radio" name="pet-breed" value={p.key} checked={key === p.key} onChange={() => pick(p.key)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                <span aria-hidden className="h-4 w-4 shrink-0 rounded-full border border-ink-200" style={{ background: hex(p.coats[0].base) }} />
                {nl ? p.nl : p.en}
              </label>
            ))}
          </div>
        </fieldset>
        {breed.coats.length > 1 && (
          <fieldset className="mt-3">
            <legend className="mb-1.5 text-[13px] font-semibold text-ink-800">{t('Vacht', 'Coat')}</legend>
            <div className="flex flex-wrap gap-1.5">
              {breed.coats.map((co, i) => (
                <label key={i} data-testid={`pet-coat-${i}`} className={cn('tap relative flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[13px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent', coat === i ? 'border-[#b8892a] bg-[#fbf0d9] font-semibold text-ink-950' : 'border-line bg-white text-ink-800')}>
                  <input type="radio" name="pet-coat" value={i} checked={coat === i} onChange={() => setCoat(i)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                  <span aria-hidden className="h-4 w-4 shrink-0 rounded-full border border-ink-200" style={{ background: co.mark !== undefined && co.pattern !== 'none' ? `linear-gradient(135deg, ${hex(co.base)} 50%, ${hex(co.mark)} 50%)` : hex(co.base) }} />
                  {nl ? co.nl : co.en}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="mt-3">
          <Input label={t('Naam (mag leeg)', 'Name (may be empty)')} value={name} maxLength={PET_NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder={kind === 'cat' ? 'Misha' : 'Bolt'} data-testid="pet-name" />
        </div>
      </div>
    </Dialog>
  );
}
