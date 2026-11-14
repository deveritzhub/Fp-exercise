import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { Button, Dialog, useToast } from '@/components/ui';
import { BELTS, DOJO_KUN, KARATE_CATS, itemKey } from '@shared/karate';

export type KarateState = { belt: number; done: string[]; examReady: boolean };
export const useKarate = (enabled = true) => useQuery({ queryKey: ['patient-karate'], queryFn: () => api.get<KarateState>('/patient/hero/karate'), enabled });

/** A belt as a small coloured bar, with a dark rim so white and black both show, and the black stripe of the second grade. */
export const BeltMark = ({ belt, className = 'h-3 w-9' }: { belt: number; className?: string }) => (
  <span aria-hidden className={`relative inline-block shrink-0 overflow-hidden rounded-sm border border-black/50 ${className}`} style={{ background: BELTS[belt]?.color }}>
    {BELTS[belt]?.stripe && <span className="absolute inset-y-0 right-[18%] w-[14%] bg-[#1d1f1e]" />}
  </span>
);

/**
 * The dojo: the belt you wear, the list for the next one to tick off, and the exam once it is done.
 * A training aid in the game; the real belt is the sensei's to give.
 */
export function KarateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const toast = useToast();
  const qc = useQueryClient();
  const q = useKarate(open);
  const [busy, setBusy] = useState(false);
  const k = q.data;
  const next = k ? BELTS[k.belt + 1] : undefined;
  const call = async (fn: () => Promise<KarateState>, after?: (s: KarateState) => void) => {
    setBusy(true);
    try {
      const s = await fn();
      qc.setQueryData(['patient-karate'], s);
      after?.(s);
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} sheet size="md" title={t('Kyokushin-dojo', 'Kyokushin dojo')}
      description={t('De eisen volgen de NKKO/KWF-syllabus. Het blijft een oefenlijst: je sensei neemt het echte examen af. Doe alleen wat je fysiotherapeut goed vindt.', 'The requirements follow the NKKO/KWF syllabus. It stays a practice list: your sensei takes the real exam. Only do what your physiotherapist approves.')}>
      {!k ? null : (
        <div className="space-y-4" data-testid="karate-sheet">
          <ol className="flex flex-wrap gap-1.5" aria-label={t('De banden', 'The belts')}>
            {BELTS.map((b, i) => (
              <li key={b.key} className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[12.5px] ${i === k.belt ? 'border-ink-900 bg-white font-semibold text-ink-950' : i < k.belt ? 'border-line bg-white text-ink-700' : 'border-line/60 text-ink-600'}`}>
                <BeltMark belt={i} className="h-2.5 w-6" /><span className="sr-only">{nl ? b.nl : b.en} · </span>{b.grade.split(' · ')[0]}{i < k.belt && <Check className="h-3.5 w-3.5 text-[#2f9e44]" aria-label={t('gehaald', 'earned')} />}
              </li>
            ))}
          </ol>
          <p className="flex items-center gap-2 text-[16px] font-semibold text-ink-950" data-testid="karate-belt"><BeltMark belt={k.belt} />{t('Je draagt:', 'You wear:')} {nl ? BELTS[k.belt].nl.toLowerCase() : BELTS[k.belt].en.toLowerCase()} <span className="text-[13.5px] font-normal text-ink-600">({BELTS[k.belt].grade})</span></p>
          {next ? (
            <>
              <h3 className="t-label">{t(`Eisen voor de ${next.nl.toLowerCase()} (${next.grade})`, `Requirements for the ${next.en.toLowerCase()} (${next.grade})`)}</h3>
              <ul className="space-y-1.5">
                {next.items.map((item, i) => {
                  const key = itemKey(k.belt + 1, i);
                  const on = k.done.includes(key);
                  return (
                    <li key={key}>
                      <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 has-[:checked]:border-[#2f9e44] has-[:checked]:bg-[#eef8ef]">
                        <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#2f9e44]" checked={on} onChange={(e) => {
                          const want = e.target.checked;
                          // The tick shows at once; the answer of the server then confirms or puts it back.
                          qc.setQueryData(['patient-karate'], { ...k, done: want ? [...k.done, key] : k.done.filter((x) => x !== key), examReady: false });
                          void call(() => api.put<KarateState>('/patient/hero/karate/item', { key, done: want }).catch((err) => { qc.setQueryData(['patient-karate'], k); throw err; }));
                        }} />
                        <span className="min-w-0"><span className="block text-[11.5px] font-semibold uppercase tracking-wide text-ink-600">{KARATE_CATS[item.cat][nl ? 'nl' : 'en']}</span><span className="block text-[14.5px] text-ink-900">{nl ? item.nl : item.en}</span></span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <Button size="lg" className="w-full" icon={<Award className="h-5 w-5" />} disabled={!k.examReady} loading={busy} data-testid="karate-exam"
                onClick={() => void call(() => api.post<KarateState>('/patient/hero/karate/exam'), (s) => toast(t(`Examen gehaald! Je draagt nu de ${BELTS[s.belt].nl.toLowerCase()}.`, `Exam passed! You now wear the ${BELTS[s.belt].en.toLowerCase()}.`)))}>
                {k.examReady ? t(`Doe examen voor de ${next.nl.toLowerCase()}`, `Take the exam for the ${next.en.toLowerCase()}`) : t(`Nog ${next.items.filter((_, i) => !k.done.includes(itemKey(k.belt + 1, i))).length} af te vinken`, `${next.items.filter((_, i) => !k.done.includes(itemKey(k.belt + 1, i))).length} left to tick`)}
              </Button>
            </>
          ) : (
            <p className="rounded-xl bg-[#fbf0d9] px-3 py-2.5 text-[15px] font-medium text-[#6b4705]">{t('Shodan: je hebt de zwarte band. Osu!', 'Shodan: you hold the black belt. Osu!')}</p>
          )}
          <details className="rounded-xl border border-line bg-white px-3 py-2" data-testid="dojo-kun">
            <summary className="min-h-[36px] cursor-pointer py-1.5 text-[14.5px] font-semibold text-ink-950">{t('Dojo kun · de eed van de dojo', 'Dojo kun · the oath of the dojo')}</summary>
            <ol className="mt-1 list-decimal space-y-1.5 pb-2 pl-5 text-[14.5px] text-ink-800">
              {DOJO_KUN.map((line) => <li key={line.en}>{nl ? line.nl : line.en}</li>)}
            </ol>
          </details>
        </div>
      )}
    </Dialog>
  );
}
