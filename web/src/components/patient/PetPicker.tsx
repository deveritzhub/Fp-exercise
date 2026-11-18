import { lazy, Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronRight, Coins, Lock, PawPrint, Scissors } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PETS, PET_COLORS, PET_LEVEL, PET_NAME_MAX, PET_WEAR, petByKey, petCoat, petWearByKey } from '@shared/pets';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Button, Dialog, Input, Segmented, useToast } from '@/components/ui';

const PetPreview = lazy(() => import('./PetPreview'));

type Pet = { key: string; coat: number; name: string | null; color?: string | null; wear?: string | null };
type AdventurePet = { level: number; coins?: number; pet?: Pet | null; petLevel?: number; petWear?: string[] };

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
                ? t('Loopt met je mee door het dorp. Tik om te wisselen; aankleden doe je in de Trimsalon.', 'Walks with you through the village. Tap to change; dress it up at the Grooming salon.')
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
            <PetPreview k={breed.key} coat={coat} color={current?.color} wear={current?.wear} />
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

/**
 * The grooming salon (/p/winkel/trimsalon): the pet on a turntable, a free colour for its collar, and
 * things to wear: bought once with coins, then put on and taken off freely. Coat and name change here too.
 */
export function PetSalon() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['patient-adventure'], queryFn: () => api.get<AdventurePet>('/patient/hero/adventure') });
  const [busy, setBusy] = useState<string | null>(null);
  const [choose, setChoose] = useState(false);
  if (!q.data) return null;
  const a = q.data;
  const pet = a.pet ?? null;
  const breed = petByKey(pet?.key);
  if (!pet || !breed) {
    return (
      <div className="mt-3" data-testid="salon-no-pet">
        <p className="mb-2 text-[14px] text-ink-700">{t('Hier wordt je huisdier geknipt en aangekleed. Kies eerst een hond of kat.', 'This is where your pet is groomed and dressed up. Choose a dog or cat first.')}</p>
        <PetCard />
      </div>
    );
  }
  const owned = a.petWear ?? [];
  const coins = a.coins ?? 0;
  const name = pet.name ?? (nl ? breed.nl : breed.en);
  const act = async (key: string, run: () => Promise<AdventurePet>, done: string) => {
    setBusy(key);
    try {
      const r = await run();
      qc.setQueryData(['patient-adventure'], (old: object | undefined) => ({ ...(old ?? {}), ...r }));
      void qc.invalidateQueries({ queryKey: ['patient-adventure'] });
      void qc.invalidateQueries({ queryKey: ['patient-hero'] });
      toast(done);
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(null);
    }
  };
  const look = (body: { color?: string; wear?: string | null }, done: string, key: string) => act(key, () => api.put<AdventurePet>('/patient/hero/adventure/pet/look', body), done);
  return (
    <div className="mt-3" data-testid="salon">
      <div className="relative h-52 overflow-hidden rounded-xl bg-gradient-to-b from-[#f6eee4] to-[#e9dccb]">
        <Suspense fallback={null}>
          <PetPreview k={breed.key} coat={pet.coat} color={pet.color} wear={pet.wear} />
        </Suspense>
        <p className="absolute left-3 top-2 text-[14px] font-semibold text-ink-900">{name}</p>
        <Button size="sm" variant="secondary" className="absolute right-2 top-2" onClick={() => setChoose(true)} icon={<Scissors className="h-3.5 w-3.5" />} data-testid="salon-coat">{t('Vacht en naam', 'Coat and name')}</Button>
      </div>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-[14px] font-semibold text-ink-900">{t('Kleur van de halsband', 'Collar colour')} <span className="font-normal text-ink-700">· {t('gratis', 'free')}</span></legend>
        <div className="flex flex-wrap gap-2">
          {PET_COLORS.map((c) => {
            const on = (pet.color ?? 'red') === c.key;
            return (
              <button key={c.key} type="button" data-testid={`salon-color-${c.key}`} aria-pressed={on} disabled={!!busy} onClick={() => !on && void look({ color: c.key }, t(`Halsband nu ${c.nl.toLowerCase()}.`, `Collar now ${c.en.toLowerCase()}.`), `color:${c.key}`)}
                className={cn('tap grid h-11 w-11 place-items-center rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent', on ? 'border-ink-900' : 'border-white shadow-xs')} style={{ background: hex(c.hex) }}>
                <span className="sr-only">{nl ? c.nl : c.en}</span>
                {on && <Check className="h-5 w-5 text-white drop-shadow" aria-hidden />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <h3 className="mt-5 text-[14px] font-semibold text-ink-900">{t('Aankleden', 'Dress up')}</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2" data-testid="salon-wear">
        {PET_WEAR.map((w) => {
          const has = owned.includes(w.key);
          const on = pet.wear === w.key;
          const label = nl ? w.nl : w.en;
          const short = coins < w.price;
          return (
            <li key={w.key} data-wear={w.key} data-state={on ? 'on' : has ? 'owned' : 'shop'} className={cn('flex min-w-0 items-center gap-3 rounded-xl border p-2.5', on ? 'border-[#b8892a] bg-[#fbf0d9]' : 'border-line bg-white')}>
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]">{w.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold leading-snug text-ink-950">{label}</span>
                <span className="block text-[12.5px] leading-snug text-ink-700">{nl ? w.aboutNl : w.aboutEn}</span>
              </span>
              <span className="shrink-0">
                {on ? (
                  <Button size="sm" variant="secondary" loading={busy === `wear:${w.key}`} onClick={() => void look({ wear: null }, t(`${label} uit.`, `${label} off.`), `wear:${w.key}`)} aria-label={t(`Doe ${label} uit`, `Take ${label} off`)}>{t('Uit', 'Off')}</Button>
                ) : has ? (
                  <Button size="sm" loading={busy === `wear:${w.key}`} onClick={() => void look({ wear: w.key }, t(`${label} aan!`, `${label} on!`), `wear:${w.key}`)} aria-label={t(`Doe ${label} aan`, `Put ${label} on`)}>{t('Aan', 'On')}</Button>
                ) : (
                  <Button size="sm" disabled={short || !!busy} loading={busy === `buy:${w.key}`} onClick={() => void act(`buy:${w.key}`, () => api.post<AdventurePet>('/patient/hero/adventure/pet/wear/buy', { key: w.key }), t(`${label} gekocht en aan!`, `${label} bought and on!`))} aria-label={t(`Koop ${label} voor ${w.price} muntjes`, `Buy ${label} for ${w.price} coins`)}>
                    <Coins className="h-3.5 w-3.5" aria-hidden />{short ? t(`Nog ${w.price - coins}`, `${w.price - coins} short`) : w.price}
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[13px] text-ink-700">{petWearByKey(pet.wear) ? t(`${name} draagt nu: ${(nl ? petWearByKey(pet.wear)?.nl : petWearByKey(pet.wear)?.en)?.toLowerCase()}.`, `${name} now wears: ${petWearByKey(pet.wear)?.en.toLowerCase()}.`) : t(`${name} draagt alleen de halsband.`, `${name} wears just the collar.`)} <Link to="/p/dorp" className="font-semibold text-ink-900 underline">{t('Ga wandelen in het dorp', 'Go for a walk in the village')}</Link></p>
      {choose && <PetDialog current={pet} onClose={() => setChoose(false)} />}
    </div>
  );
}
