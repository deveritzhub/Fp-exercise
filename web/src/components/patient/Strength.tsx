import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Dumbbell, TrendingUp, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n, describeError } from '@/lib/i18n';
import { fmtDate } from '@/lib/format';
import { postOrQueue } from '@/lib/outbox';
import { Button, Dialog, Notice, Sparkline, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { ONE_RM_SCREENING, estimate1RM, MAX_REPS_FOR_ESTIMATE } from '@shared/strength';
import type { ProgramItem } from '@/lib/types';

type SetRow = { setNo: number; weightKg: number | null; reps: number | null; rpe: number | null };
export type StrengthExercise = {
  exerciseId: string; nameNl: string; nameEn: string; main: boolean; programId: string | null; oneRmTestAllowed: boolean;
  range: { min: number; max: number } | null; best: { date: string; value: number } | null; latestIsPr: boolean;
  history: { date: string; best: number | null; topKg: number | null; topReps: number | null }[];
  directTests: { date: string; value: number }[];
  lastSets: SetRow[];
  advice: { kind: 'increase'; fromKg: number; toKgMin: number; toKgMax: number } | { kind: 'keep' | 'plateau' | 'none' };
};
export type StrengthData = { exercises: StrengthExercise[]; screeningStops: number };

export const useStrength = (enabled = true) => useQuery({ queryKey: ['patient-strength'], queryFn: () => api.get<StrengthData>('/patient/strength'), enabled });

function AdviceText({ e }: { e: StrengthExercise }) {
  const { t } = useI18n();
  const a = e.advice;
  if (a.kind === 'increase') return <>{t(`Alle sets haalden de bovenkant. Advies: ${a.toKgMin}–${a.toKgMax} kg.`, `All sets reached the top. Advice: ${a.toKgMin}–${a.toKgMax} kg.`)}</>;
  if (a.kind === 'plateau') return <>{t('Drie trainingen zonder vooruitgang. Bespreek het met je fysiotherapeut.', 'Three workouts without progress. Discuss it with your physiotherapist.')}</>;
  if (a.kind === 'keep') return <>{t('Houd dit gewicht aan tot alle sets de bovenkant halen.', 'Keep this weight until every set reaches the top.')}</>;
  return null;
}

/**
 * W04: log weight, reps and RPE per set during a strength workout. Prefilled with last time's sets;
 * shows the estimated 1RM (only up to 10 reps) and the progression advice. Saved per set.
 */
export function StrengthLogger({ item, sessionId, userId, onSetSaved }: { item: ProgramItem; sessionId: string | null; userId: string; onSetSaved?: (n: number) => void }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const strength = useStrength();
  // Last time and the advice as they were when this exercise opened; sets saved now must not change them.
  const [snapshot, setSnapshot] = useState<{ info: StrengthExercise | undefined } | null>(null);
  useEffect(() => {
    if (strength.data && !snapshot) setSnapshot({ info: strength.data.exercises.find((e) => e.exerciseId === item.exerciseId) });
  }, [strength.data, snapshot, item.exerciseId]);
  const info = snapshot?.info;
  const count = item.sets ?? 3;
  const [rows, setRows] = useState<SetRow[] | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const base: SetRow[] = Array.from({ length: count }, (_, i) => {
    const last = info?.lastSets.find((s) => s.setNo === i + 1) ?? info?.lastSets.at(-1);
    const kg = info?.advice.kind === 'increase' ? info.advice.toKgMin : last?.weightKg ?? null;
    return { setNo: i + 1, weightKg: kg, reps: last?.reps ?? item.reps ?? null, rpe: null };
  });
  const data = rows ?? base;
  const set = (i: number, patch: Partial<SetRow>) =>
    setRows(
      data.map((r, k) => {
        if (k === i) return { ...r, ...patch };
        // A weight entered for a set is carried over to later sets that are still empty and unsaved.
        // (also while typing: sets that still follow this one's previous value keep following it).
        if (k > i && 'weightKg' in patch && !saved.has(r.setNo) && (r.weightKg === null || r.weightKg === data[i].weightKg)) return { ...r, weightKg: patch.weightKg ?? null };
        return r;
      }),
    );
  const save = async (r: SetRow) => {
    if (!sessionId) return;
    try {
      await postOrQueue(userId, `/patient/sessions/${sessionId}/sets`, { programItemId: item.id, setNo: r.setNo, weightKg: r.weightKg, reps: r.reps, rpe: r.rpe });
      const next = new Set(saved).add(r.setNo);
      setSaved(next);
      onSetSaved?.(next.size);
      qc.invalidateQueries({ queryKey: ['patient-strength'] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    }
  };
  const best = data.reduce<number | null>((b, r) => {
    const x = estimate1RM(r.weightKg, r.reps);
    return 'value' in x && (b === null || x.value > b) ? x.value : b;
  }, null);
  const isPr = best !== null && info?.best && best > info.best.value;
  const num = 'h-12 w-full rounded-lg border border-line bg-white px-2 text-center text-[17px] tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50';
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[16px] font-semibold"><Dumbbell className="h-5 w-5 text-accent" aria-hidden />{t('Sets loggen', 'Log sets')}</span>
        {info?.range && <span className="text-[14px] text-ink-600">{t(`${info.range.min}–${info.range.max} herhalingen`, `${info.range.min}–${info.range.max} reps`)}</span>}
      </div>
      {info && info.lastSets.length > 0 && (
        <p className="mb-3 text-[14px] text-ink-700">
          {t('Vorige keer', 'Last time')}: {info.lastSets.map((s) => `${s.weightKg ?? '–'} kg × ${s.reps ?? '–'}`).join(', ')}. <AdviceText e={info} />
        </p>
      )}
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left text-ink-600"><th className="w-10 pb-1 font-medium">{t('Set', 'Set')}</th><th className="pb-1 font-medium">kg</th><th className="pb-1 font-medium">{t('Herh.', 'Reps')}</th><th className="pb-1 font-medium">RPE</th><th className="w-14 pb-1" /></tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={r.setNo}>
              <td className="py-1 font-semibold tabular-nums">{r.setNo}</td>
              <td className="py-1 pr-1"><input aria-label={t(`Gewicht set ${r.setNo} (kg)`, `Weight set ${r.setNo} (kg)`)} inputMode="decimal" className={num} value={r.weightKg ?? ''} onChange={(e) => set(i, { weightKg: e.target.value === '' ? null : Number(e.target.value.replace(',', '.')) || 0 })} /></td>
              <td className="py-1 pr-1"><input aria-label={t(`Herhalingen set ${r.setNo}`, `Reps set ${r.setNo}`)} inputMode="numeric" className={num} value={r.reps ?? ''} onChange={(e) => set(i, { reps: e.target.value === '' ? null : Number(e.target.value.replace(/\D/g, '')) })} /></td>
              <td className="py-1 pr-1"><input aria-label={t(`RPE set ${r.setNo} (1–10)`, `RPE set ${r.setNo} (1–10)`)} inputMode="decimal" className={num} value={r.rpe ?? ''} onChange={(e) => set(i, { rpe: e.target.value === '' ? null : Math.min(10, Math.max(1, Number(e.target.value.replace(',', '.')) || 1)) })} /></td>
              <td className="py-1">
                <button type="button" disabled={!sessionId || r.weightKg === null || r.reps === null} onClick={() => save(r)} aria-label={t(`Set ${r.setNo} opslaan`, `Save set ${r.setNo}`)} className={cn('flex h-12 w-12 items-center justify-center rounded-lg border-2 disabled:opacity-40', saved.has(r.setNo) ? 'border-accent bg-accent text-white' : 'border-line text-ink-600')}>
                  <Check className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[14px] text-ink-700" aria-live="polite">
        {best !== null
          ? <>{t(`Geschatte 1RM vandaag: ${best} kg`, `Estimated 1RM today: ${best} kg`)}{isPr && <strong className="ml-2 inline-flex items-center gap-1 text-ok"><Trophy className="h-4 w-4" />{t('Persoonlijk record!', 'Personal record!')}</strong>}</>
          : data.some((r) => (r.reps ?? 0) > MAX_REPS_FOR_ESTIMATE)
            ? t('Boven 10 herhalingen schatten we geen 1RM.', 'Above 10 reps we do not estimate a 1RM.')
            : null}
      </p>
    </div>
  );
}

/** Strength progress on the patient's progress page, with the direct 1RM test (W06, W08). */
export function StrengthProgress() {
  const { t, locale } = useI18n();
  const q = useStrength();
  const [testing, setTesting] = useState<StrengthExercise | null>(null);
  if (!q.data || q.data.exercises.length === 0) return null;
  return (
    <section aria-labelledby="strength-title" className="space-y-3">
      <h2 id="strength-title" className="text-lg font-bold">{t('Kracht', 'Strength')}</h2>
      <p className="text-[14px] text-ink-600">{t('Geschatte 1RM per training (gemiddelde van Epley en Brzycki, alleen sets tot 10 herhalingen). Een schatting, geen meting.', 'Estimated 1RM per workout (average of Epley and Brzycki, only sets up to 10 reps). An estimate, not a measurement.')}</p>
      {q.data.exercises.map((e) => (
        <div key={e.exerciseId} className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold">{locale === 'nl' ? e.nameNl : e.nameEn}</span>
            {e.latestIsPr && <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[13px] font-semibold text-ok"><Trophy className="h-4 w-4" />PR</span>}
          </div>
          <div className="mt-1 text-[14px] text-ink-700">
            {e.best ? t(`Beste: ${e.best.value} kg (${fmtDate(e.best.date, locale)})`, `Best: ${e.best.value} kg (${fmtDate(e.best.date, locale)})`) : t('Nog geen schatting', 'No estimate yet')}
          </div>
          {e.history.length > 1 && <Sparkline values={e.history.map((h) => h.best)} max={Math.max(1, ...e.history.map((h) => h.best ?? 0)) * 1.1} />}
          <p className="mt-1 flex items-start gap-1.5 text-[14px] text-ink-700"><TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden /><span><AdviceText e={e} /></span></p>
          {e.main && e.programId && (
            e.oneRmTestAllowed
              ? <Button variant="secondary" className="mt-3 w-full" onClick={() => setTesting(e)}>{t('1RM-test doen', 'Do a 1RM test')}</Button>
              : <p className="mt-2 text-[13px] text-ink-600">{t('Een echte 1RM-test kan vanaf week 5 van je programma.', 'A real 1RM test is possible from week 5 of your programme.')}</p>
          )}
        </div>
      ))}
      <OneRmTestDialog exercise={testing} onClose={() => setTesting(null)} />
    </section>
  );
}

/** W08: screening first; any "yes" stops the test and advises to see the GP first. */
function OneRmTestDialog({ exercise, onClose }: { exercise: StrengthExercise | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [kg, setKg] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'stopped' | 'saved' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const allAnswered = ONE_RM_SCREENING.every((q) => answers[q.key] !== undefined && answers[q.key] !== null);
  const anyYes = ONE_RM_SCREENING.some((q) => answers[q.key] === true);
  const close = () => {
    onClose();
    setAnswers({});
    setKg('');
    setResult(null);
    setError(null);
  };
  const submit = async () => {
    if (!exercise?.programId) return;
    setBusy(true);
    setError(null);
    try {
      const screening = Object.fromEntries(ONE_RM_SCREENING.map((q) => [q.key, !!answers[q.key]]));
      const r = await api.post<{ stopped: boolean }>('/patient/one-rm-tests', { programId: exercise.programId, exerciseId: exercise.exerciseId, screening, weightKg: anyYes ? undefined : Number(kg.replace(',', '.')) });
      setResult(r.stopped ? 'stopped' : 'saved');
      qc.invalidateQueries({ queryKey: ['patient-strength'] });
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!exercise} onClose={close} title={t('1RM-test', '1RM test')} description={exercise ? (locale === 'nl' ? exercise.nameNl : exercise.nameEn) : undefined} size="sm"
      footer={result ? <Button size="lg" className="w-full" data-autofocus onClick={close}>{t('Sluiten', 'Close')}</Button> : (
        <div className="grid w-full grid-cols-2 gap-2">
          <Button size="lg" variant="secondary" onClick={close}>{t('Annuleren', 'Cancel')}</Button>
          <Button size="lg" loading={busy} disabled={!allAnswered || (!anyYes && !(Number(kg.replace(',', '.')) > 0))} onClick={submit}>{anyYes ? t('Test stoppen', 'Stop test') : t('Resultaat opslaan', 'Save result')}</Button>
        </div>
      )}>
      {result === 'stopped' ? (
        <Notice tone="warn">{t('Doe deze test niet. Bespreek eerst met je huisarts of fysiotherapeut of maximaal tillen voor jou veilig is.', 'Do not do this test. First discuss with your GP or physiotherapist whether maximal lifting is safe for you.')}</Notice>
      ) : result === 'saved' ? (
        <Notice tone="ok">{t('Je resultaat is opgeslagen.', 'Your result has been saved.')}</Notice>
      ) : (
        <div className="space-y-4">
          {error && <Notice tone="bad">{error}</Notice>}
          <p className="text-[14.5px] text-ink-700">{t('Beantwoord eerst deze vragen. Bij één keer “ja” doe je de test niet.', 'First answer these questions. One “yes” means you do not do the test.')}</p>
          {ONE_RM_SCREENING.map((q) => (
            <fieldset key={q.key}>
              <legend className="mb-1.5 text-[15px] font-medium">{locale === 'nl' ? q.nl : q.en}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map((v) => (
                  <label key={String(v)} className={cn('flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg border text-[15px]', answers[q.key] === v ? 'border-accent bg-accent-soft font-semibold' : 'border-line')}>
                    <input type="radio" name={`s-${q.key}`} className="sr-only" checked={answers[q.key] === v} onChange={() => setAnswers({ ...answers, [q.key]: v })} />
                    {v ? t('Ja', 'Yes') : t('Nee', 'No')}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {allAnswered && anyYes && <Notice tone="warn">{t('Je hebt “ja” geantwoord. Doe de test niet; bespreek het eerst met je huisarts of fysiotherapeut.', 'You answered “yes”. Do not do the test; discuss it first with your GP or physiotherapist.')}</Notice>}
          {allAnswered && !anyYes && (
            <label className="block">
              <span className="mb-1 block text-[15px] font-medium">{t('Gewicht dat je 1 keer goed tilde (kg)', 'Weight you lifted once with good form (kg)')}</span>
              <input inputMode="decimal" className="h-12 w-full rounded-lg border border-line px-3 text-[17px]" value={kg} onChange={(e) => setKg(e.target.value)} />
            </label>
          )}
        </div>
      )}
    </Dialog>
  );
}
