import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, Dumbbell, Minus, Plus, Trash2, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Badge, Button, Input, Notice, Segmented, Sparkline, Spinner, ErrorState, useToast } from '@/components/ui';
import { GYM_LIMITS, PERCENT_TABLE, gymKey, loadFor, setEstimate, type GymExerciseSummary, type GymPlace, type GymSet } from '@shared/gymLog';
import { parseMetric } from '@shared/hero';

type GymData = { sets: GymSet[]; exercises: GymExerciseSummary[]; library: { id: string; nameNl: string; nameEn: string }[]; sharedByPatient?: boolean };

const kg = (n: number, nl: boolean) => `${n.toLocaleString(nl ? 'nl-NL' : 'en-GB', { maximumFractionDigits: 1 })} kg`;
const todayIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });
const PLACE_LABEL: Record<GymPlace, [string, string]> = { gym: ['Sportschool', 'Gym'], home: ['Thuis', 'Home'], practice: ['Praktijk', 'Practice'] };

/**
 * Krachtlog with 1RM meter. `base` is '/patient' (the patient's own log) or '/patients/:id' (a
 * professional logging in the practice). Every set shows its estimated 1RM; a new best is celebrated.
 */
export function GymLog({ base, staff = false }: { base: string; staff?: boolean }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['gym', base], queryFn: () => api.get<GymData>(`${base}/gym`) });
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('20');
  const [reps, setReps] = useState(8);
  const [place, setPlace] = useState<GymPlace>(staff ? 'practice' : 'gym');
  const [busy, setBusy] = useState(false);
  const [calc, setCalc] = useState(false);

  const data = q.data;
  const recent = useMemo(() => (data?.exercises ?? []).slice(0, 8), [data]);
  const w = parseMetric(weight);
  const est = w !== null && reps > 0 ? setEstimate(w, reps) : null;
  const current = data?.exercises.find((e) => e.key === gymKey(name));
  const today = (data?.sets ?? []).filter((s) => s.day === todayIso());

  if (q.isError) return <ErrorState error={q.error} />;
  if (!data) return <Spinner />;

  const pick = (n: string) => {
    setName(n);
    const ex = data.exercises.find((e) => e.key === gymKey(n));
    if (ex?.last) {
      setWeight(String(ex.last.weightKg).replace('.', nl ? ',' : '.'));
      setReps(ex.last.reps);
    }
  };
  const step = (d: number) => setWeight((v) => String(Math.max(0, Math.min(GYM_LIMITS.weightMax, (parseMetric(v) ?? 0) + d))).replace('.', nl ? ',' : '.'));

  const save = async () => {
    if (name.trim().length < GYM_LIMITS.nameMin || w === null) return;
    setBusy(true);
    try {
      const lib = data.library.find((l) => gymKey(l.nameNl) === gymKey(name) || gymKey(l.nameEn) === gymKey(name));
      const r = await api.post<{ setNo: number; estimate: number | null; pr: boolean }>(`${base}/gym/sets`, {
        exerciseName: name.trim(), exerciseId: lib?.id ?? null, weightKg: w, reps, place: staff ? 'practice' : place,
      });
      await qc.invalidateQueries({ queryKey: ['gym', base] });
      if (r.pr) toast(t(`Nieuw record! Geschat 1RM ${kg(r.estimate!, true)} 🏆`, `New record! Estimated 1RM ${kg(r.estimate!, false)} 🏆`), 'ok');
      else toast(t(`Set ${r.setNo} opgeslagen`, `Set ${r.setNo} saved`), 'ok');
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    try {
      await api.del(`${base}/gym/sets/${id}`);
      await qc.invalidateQueries({ queryKey: ['gym', base] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    }
  };

  return (
    <div className="space-y-5">
      {staff && (
        <Notice tone={data.sharedByPatient ? 'ok' : 'info'}>
          {data.sharedByPatient
            ? t('De patiënt deelt de krachtmodule: je ziet ook wat in de sportschool of thuis is gelogd.', 'The patient shares the strength module: you also see what was logged in the gym or at home.')
            : t('Je ziet alleen wat in de praktijk is gelogd. De patiënt kan de krachtmodule delen om ook de sportschool-log te tonen.', 'You only see what was logged in the practice. The patient can share the strength module to show the gym log too.')}
        </Notice>
      )}

      <section className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5" aria-labelledby="gym-add">
        <h2 id="gym-add" className="t-section flex items-center gap-2"><Dumbbell className="h-5 w-5 text-accent" aria-hidden />{t('Set loggen', 'Log a set')}</h2>
        <div className="mt-3 space-y-4">
          <div>
            <Input label={t('Oefening', 'Exercise')} value={name} maxLength={GYM_LIMITS.nameMax} list="gym-exercises" placeholder={t('Bijv. Squat, Leg press', 'E.g. Squat, Leg press')} onChange={(e) => pick(e.target.value)} />
            <datalist id="gym-exercises">
              {[...new Set([...data.exercises.map((e) => e.name), ...data.library.map((l) => (nl ? l.nameNl : l.nameEn))])].map((n) => <option key={n} value={n} />)}
            </datalist>
            {recent.length > 0 && (
              <div role="group" className="mt-2 flex flex-wrap gap-1.5" aria-label={t('Recente oefeningen', 'Recent exercises')}>
                {recent.map((e) => (
                  <button key={e.key} type="button" onClick={() => pick(e.name)} className={cn('tap min-h-[40px] rounded-full border px-3 text-[13.5px] font-medium', gymKey(name) === e.key ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-white text-ink-700')}>{e.name}</button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="label mb-1.5 block" id="gym-w">{t('Gewicht', 'Weight')}</span>
              <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
                <button type="button" aria-label={t('2,5 kg minder', '2.5 kg less')} onClick={() => step(-2.5)} className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-canvas"><Minus className="h-4 w-4" /></button>
                <input aria-labelledby="gym-w" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className="min-w-0 flex-1 bg-transparent text-center font-display text-[20px] font-bold tabular-nums outline-none" />
                <button type="button" aria-label={t('2,5 kg meer', '2.5 kg more')} onClick={() => step(2.5)} className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-canvas"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <div>
              <span className="label mb-1.5 block" id="gym-r">{t('Herhalingen', 'Reps')}</span>
              <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
                <button type="button" aria-label={t('1 herhaling minder', '1 rep less')} onClick={() => setReps((r) => Math.max(1, r - 1))} className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-canvas"><Minus className="h-4 w-4" /></button>
                <output aria-labelledby="gym-r" className="min-w-0 flex-1 text-center font-display text-[20px] font-bold tabular-nums">{reps}</output>
                <button type="button" aria-label={t('1 herhaling meer', '1 rep more')} onClick={() => setReps((r) => Math.min(GYM_LIMITS.repsMax, r + 1))} className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-canvas"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          {/* The 1RM meter: live, before saving. */}
          <OneRmMeter est={est} best={current?.best?.value ?? null} reps={reps} />

          {!staff && (
            <Segmented label={t('Waar train je?', 'Where are you training?')} value={place} onChange={setPlace}
              options={(['gym', 'home', 'practice'] as const).map((p) => ({ value: p, label: PLACE_LABEL[p][nl ? 0 : 1] }))} />
          )}
          <Button size="lg" className="w-full" loading={busy} disabled={name.trim().length < GYM_LIMITS.nameMin || w === null} onClick={save} icon={<Plus className="h-4 w-4" aria-hidden />}>
            {t('Set opslaan', 'Save set')}
          </Button>
          <button type="button" onClick={() => setCalc((v) => !v)} aria-expanded={calc} className="tap inline-flex min-h-[44px] items-center gap-2 text-[14.5px] font-medium text-accent">
            <Calculator className="h-4 w-4" aria-hidden />{calc ? t('Rekenhulp verbergen', 'Hide calculator') : t('Rekenhulp: gewicht per percentage van je 1RM', 'Calculator: weight per percentage of your 1RM')}
          </button>
          {calc && <PercentTable oneRm={current?.best?.value ?? est} />}
        </div>
      </section>

      {today.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5" aria-labelledby="gym-today">
          <h2 id="gym-today" className="t-section">{t('Vandaag', 'Today')}</h2>
          <ul className="mt-2 divide-y divide-line">
            {today.map((s) => {
              const e = setEstimate(s.weightKg, s.reps);
              return (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink-900">{s.exerciseName} · {t('set', 'set')} {s.setNo}</span>
                    <span className="block text-[13.5px] text-ink-600">
                      {kg(s.weightKg, nl)} × {s.reps}{e !== null && <> · 1RM ≈ {kg(e, nl)}</>} · {PLACE_LABEL[s.place][nl ? 0 : 1]}{!s.byPatient && !staff && <> · {t('door je praktijk', 'by your practice')}</>}
                    </span>
                  </span>
                  {s.mine && (
                    <button type="button" onClick={() => remove(s.id)} aria-label={t(`Set ${s.setNo} van ${s.exerciseName} verwijderen`, `Delete set ${s.setNo} of ${s.exerciseName}`)} className="tap flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-bad">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="gym-records">
        <h2 id="gym-records" className="t-section mb-2">{t('Je records en voortgang', 'Your records and progress')}</h2>
        {data.exercises.length === 0 ? (
          <p className="text-[14.5px] text-ink-600">{t('Nog niets gelogd. Log je eerste set hierboven: je ziet meteen je geschatte 1RM.', 'Nothing logged yet. Log your first set above: you immediately see your estimated 1RM.')}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.exercises.map((e) => (
              <li key={e.key} className="rounded-2xl border border-line bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => pick(e.name)} className="min-w-0 text-left">
                    <span className="block truncate text-[15.5px] font-semibold text-ink-900">{e.name}</span>
                    <span className="block text-[13px] text-ink-600">
                      {t('Laatst', 'Last')}: {e.last && `${kg(e.last.weightKg, nl)} × ${e.last.reps}`} · {new Date(e.last!.day).toLocaleDateString(nl ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </button>
                  {e.latestIsPr && <Badge tone="ok"><Trophy className="h-3.5 w-3.5" aria-hidden />{t('Record', 'Record')}</Badge>}
                </div>
                {e.best ? (
                  <p className="mt-2 text-[14px] text-ink-700">{t('Beste geschatte 1RM', 'Best estimated 1RM')}: <strong className="font-display text-[18px] text-ink-950">{kg(e.best.value, nl)}</strong></p>
                ) : (
                  <p className="mt-2 text-[13.5px] text-ink-600">{t('Nog geen schatting (alleen sets tot 10 herhalingen tellen).', 'No estimate yet (only sets up to 10 reps count).')}</p>
                )}
                {e.history.length > 1 && (
                  <Sparkline values={e.history.map((h) => h.value)} max={Math.max(...e.history.map((h) => h.value)) * 1.1} className="mt-2 h-12 w-full" />
                )}
                <p className="mt-1 text-[12.5px] text-ink-500">{t(`${e.totalSets} ${e.totalSets === 1 ? 'set' : 'sets'} · ${e.volumeKg.toLocaleString('nl-NL')} kg totaal verzet`, `${e.totalSets} ${e.totalSets === 1 ? 'set' : 'sets'} · ${e.volumeKg.toLocaleString('en-GB')} kg lifted in total`)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-[12.5px] text-ink-500">
        {t('De 1RM is een schatting (gemiddelde van Epley en Brzycki) uit sets van 1 tot 10 herhalingen. Test je maximum alleen onder begeleiding.', 'The 1RM is an estimate (mean of Epley and Brzycki) from sets of 1 to 10 reps. Only test your maximum under supervision.')}
      </p>
    </div>
  );
}

function OneRmMeter({ est, best, reps }: { est: number | null; best: number | null; reps: number }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const pct = est !== null && best ? Math.min(130, Math.round((est / best) * 100)) : null;
  return (
    <div className="rounded-2xl bg-[linear-gradient(135deg,#29483c_0%,#3d6150_100%)] p-4 text-white" aria-live="polite">
      <p className="text-[12.5px] font-semibold uppercase tracking-wide text-white/75">{t('1RM-meter', '1RM meter')}</p>
      {est !== null ? (
        <>
          <p className="font-display text-[30px] font-extrabold leading-tight tabular-nums">{kg(est, nl)}</p>
          <p className="text-[13.5px] text-white/85">
            {best
              ? pct! > 100
                ? t(`Dit wordt een nieuw record (${pct}% van je beste ${kg(best, true)})`, `This will be a new record (${pct}% of your best ${kg(best, false)})`)
                : t(`${pct}% van je beste ${kg(best, true)}`, `${pct}% of your best ${kg(best, false)}`)
              : t('Geschat maximum voor 1 herhaling', 'Estimated maximum for 1 rep')}
          </p>
          {pct !== null && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20" aria-hidden>
              <div className={cn('h-full rounded-full', pct > 100 ? 'bg-sand' : 'bg-white')} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          )}
        </>
      ) : (
        <p className="mt-1 text-[14.5px] text-white/90">
          {reps > 10 ? t('Boven 10 herhalingen is een schatting niet betrouwbaar. De set telt wel mee als volume.', 'Above 10 reps an estimate is not reliable. The set still counts as volume.') : t('Vul een gewicht in.', 'Enter a weight.')}
        </p>
      )}
    </div>
  );
}

function PercentTable({ oneRm }: { oneRm: number | null }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [manual, setManual] = useState('');
  const base = parseMetric(manual) ?? oneRm;
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-canvas p-3">
      <Input label={t('1RM (kg)', '1RM (kg)')} inputMode="decimal" value={manual} placeholder={oneRm ? String(oneRm).replace('.', nl ? ',' : '.') : ''} onChange={(e) => setManual(e.target.value)} hint={t('Leeg = je beste geschatte 1RM van deze oefening.', 'Empty = your best estimated 1RM for this exercise.')} />
      {base ? (
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr className="text-ink-600"><th className="py-1 font-medium">%</th><th className="py-1 font-medium">{t('Gewicht', 'Weight')}</th><th className="py-1 font-medium">{t('± herhalingen', '± reps')}</th></tr>
          </thead>
          <tbody>
            {PERCENT_TABLE.map((p) => {
              const load = Math.round((base * p) / 100 * 2) / 2;
              const r = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].find((n) => loadFor(base, n) <= load + 0.25) ?? 12;
              return (
                <tr key={p} className="border-t border-line">
                  <td className="py-1.5 font-semibold tabular-nums">{p}%</td>
                  <td className="py-1.5 tabular-nums">{kg(load, nl)}</td>
                  <td className="py-1.5 tabular-nums text-ink-600">{r}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-[13.5px] text-ink-600">{t('Kies een oefening met een record of vul een 1RM in.', 'Pick an exercise with a record or enter a 1RM.')}</p>
      )}
    </div>
  );
}
