import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Minus, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { Button, Notice, Select, Textarea, useToast } from '@/components/ui';
import { GYM_LIMITS, gymKey, type GymExerciseSummary, type GymSet } from '@shared/gymLog';
import { TRAINING_KINDS, minutesOk, type TrainingKind } from '@shared/patientLogs';
import { parseWorkoutText, type LibraryEntry } from '@shared/workoutText';

type Gym = { sets: GymSet[]; exercises: GymExerciseSummary[]; library: LibraryEntry[] };
type Row =
  | { id: number; type: 'cardio'; kind: TrainingKind; minutes: number | null }
  | { id: number; type: 'strength'; options: { id: string | null; name: string }[]; pick: number; sets: number; reps: number | null; weightKg: number | null };

const todayIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });
let nextId = 1;

/**
 * Logging a workout the easy way. (A) type it in your own words: "5 min gefietst, 3 sets chest press
 * 10x 40 kg, 3x row, biceps curl"; it is read in the app itself (nothing leaves it) and shown as a list
 * to check before saving. (D) quick buttons: repeat the last workout, or tap a recent exercise.
 * Strength exercises go to the strength log as sets; cycling, walking and the like as a training.
 */
export function QuickWorkout({ gym }: { gym: Gym }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const nameOf = (e: LibraryEntry) => (nl ? e.nameNl : e.nameEn);

  // The last training day before today, grouped per exercise: "repeat last workout".
  const lastDay = useMemo(() => {
    const day = gym.sets.map((s) => s.day).filter((d) => d < todayIso()).sort().pop();
    if (!day) return null;
    const by = new Map<string, { id: string | null; name: string; sets: number; reps: number; weightKg: number }>();
    for (const s of gym.sets.filter((x) => x.day === day)) {
      const k = gymKey(s.exerciseName);
      const cur = by.get(k);
      if (cur) cur.sets++;
      else by.set(k, { id: s.exerciseId, name: s.exerciseName, sets: 1, reps: s.reps, weightKg: s.weightKg });
    }
    return { day, items: [...by.values()] };
  }, [gym.sets]);
  const recent = gym.exercises.filter((e) => e.last).slice(0, 6);

  const strengthRow = (options: { id: string | null; name: string }[], sets: number | null, reps: number | null, weightKg: number | null): Row => {
    // Fill in what the strength log knows about this exercise from last time.
    const prev = gym.exercises.find((e) => e.key === gymKey(options[0]?.name ?? ''))?.last;
    return { id: nextId++, type: 'strength', options, pick: 0, sets: Math.min(GYM_LIMITS.routineSets, sets ?? prev?.sets ?? 3), reps: reps ?? prev?.reps ?? 10, weightKg: weightKg ?? prev?.weightKg ?? null };
  };
  const read = () => {
    const r = parseWorkoutText(text, gym.library);
    setRows([
      ...r.cardio.map((c): Row => ({ id: nextId++, type: 'cardio', kind: c.kind, minutes: c.minutes })),
      ...r.strength.map((s) => strengthRow(s.candidates.length ? s.candidates.map((e) => ({ id: e.id, name: nameOf(e) })) : [{ id: null, name: s.text.charAt(0).toUpperCase() + s.text.slice(1) }], s.sets, s.reps, s.weightKg)),
    ]);
    setUnknown(r.unknown);
  };
  const add = (row: Row) => setRows((rs) => [...rs, row]);
  const patch = (id: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? ({ ...r, ...p } as Row) : r)));

  const problems = rows.flatMap((r) =>
    r.type === 'cardio'
      ? r.minutes === null || !minutesOk(r.minutes) ? [t('Vul bij elke cardio 5 tot 180 minuten in.', 'Fill in 5 to 180 minutes for each cardio.')] : []
      : r.reps === null || r.reps < 1 ? [t('Vul bij elke oefening het aantal herhalingen in.', 'Fill in the reps for each exercise.')] : [],
  );
  const save = async () => {
    setBusy(true);
    let sets = 0;
    let trainings = 0;
    try {
      for (const r of rows) {
        if (r.type === 'cardio') {
          await api.post('/patient/logs/trainings', { kind: r.kind, minutes: r.minutes });
          trainings++;
        } else {
          const ex = r.options[r.pick];
          for (let i = 0; i < r.sets; i++) {
            await api.post('/patient/gym/sets', { exerciseId: ex.id, exerciseName: ex.name, weightKg: r.weightKg ?? 0, reps: r.reps, place: 'gym' });
            sets++;
          }
        }
      }
      setRows([]);
      setText('');
      setUnknown([]);
      toast(t(`Opgeslagen: ${[trainings && `${trainings} cardio`, sets && `${sets} sets`].filter(Boolean).join(' en ')}.`, `Saved: ${[trainings && `${trainings} cardio`, sets && `${sets} sets`].filter(Boolean).join(' and ')}.`), 'ok');
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
      await Promise.all([qc.invalidateQueries({ queryKey: ['gym'] }), qc.invalidateQueries({ queryKey: ['patient-hero'] }), qc.invalidateQueries({ queryKey: ['patient-home'] })]);
    }
  };

  return (
    <section aria-labelledby="quick-workout-h" data-testid="quick-workout" className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-card">
      <div>
        <h2 id="quick-workout-h" className="flex items-center gap-2 text-[17px] font-bold"><Wand2 className="h-5 w-5 text-accent" aria-hidden />{t('Training snel invoeren', 'Log a workout quickly')}</h2>
        <p className="mt-0.5 text-[14px] text-ink-600">{t('Typ wat je gedaan hebt, in je eigen woorden. Je ziet eerst wat de app ervan maakt.', 'Type what you did, in your own words. You see first what the app makes of it.')}</p>
      </div>
      <Textarea
        label={t('Wat heb je gedaan?', 'What did you do?')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={400}
        placeholder={t('Bijv. 5 min gefietst, 3 sets chest press 10x 40 kg, 3x row, biceps curl', 'E.g. 5 min cycling, 3 sets chest press 10x 40 kg, 3x row, biceps curl')}
      />
      <Button variant="secondary" className="w-full" data-testid="read-workout" disabled={!text.trim()} onClick={read} icon={<Sparkles className="h-4 w-4" />}>{t('Lees mijn training', 'Read my workout')}</Button>

      {/* D: quick buttons. */}
      {(lastDay || recent.length > 0) && (
        <div className="space-y-1.5">
          <p className="text-[13.5px] font-semibold text-ink-800">{t('Of snel:', 'Or quickly:')}</p>
          <div className="flex flex-wrap gap-1.5">
            {lastDay && (
              <Button size="sm" variant="secondary" data-testid="repeat-last" icon={<History className="h-4 w-4" />}
                onClick={() => setRows(lastDay.items.map((it) => strengthRow([{ id: it.id, name: it.name }], it.sets, it.reps, it.weightKg)))}>
                {t(`Herhaal training van ${new Date(lastDay.day + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`, `Repeat workout of ${new Date(lastDay.day + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`)}
              </Button>
            )}
            {recent.map((e) => (
              <Button key={e.key} size="sm" variant="secondary" data-recent={e.key} onClick={() => add(strengthRow([{ id: e.exerciseId, name: e.name }], e.last!.sets, e.last!.reps, e.last!.weightKg))} icon={<Plus className="h-4 w-4" />}>{e.name}</Button>
            ))}
          </div>
        </div>
      )}

      {unknown.length > 0 && (
        <Notice tone="info">{t(`Niet herkend: ${unknown.join(', ')}. Typ het anders, of voeg de oefening hieronder in de krachtlog toe.`, `Not recognised: ${unknown.join(', ')}. Type it differently, or add the exercise in the strength log below.`)}</Notice>
      )}

      {rows.length > 0 && (
        <div className="space-y-2" data-testid="workout-preview">
          <p className="text-[14.5px] font-semibold text-ink-900">{t('Klopt dit?', 'Is this right?')}</p>
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} data-row={r.type} className="rounded-xl border border-line p-3">
                {r.type === 'cardio' ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <Select label={t('Cardio', 'Cardio')} value={r.kind} onChange={(e) => patch(r.id, { kind: e.target.value as TrainingKind })} className="min-w-[150px] flex-1">
                      {TRAINING_KINDS.map((k) => <option key={k.key} value={k.key}>{nl ? k.nl : k.en}</option>)}
                    </Select>
                    <label className="flex flex-col text-[13.5px] font-medium text-ink-800">
                      {t('Minuten', 'Minutes')}
                      <input type="number" inputMode="numeric" min={5} max={180} value={r.minutes ?? ''} onChange={(e) => patch(r.id, { minutes: e.target.value ? Number(e.target.value) : null })}
                        className="mt-1 h-11 w-24 rounded-lg border border-line bg-white px-2 text-[16px] text-ink-950" />
                    </label>
                    <RemoveButton label={t('Weghalen', 'Remove')} onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {r.options.length > 1 ? (
                      <Select label={t('Oefening', 'Exercise')} value={r.pick} onChange={(e) => patch(r.id, { pick: Number(e.target.value) })}>
                        {r.options.map((o, i) => <option key={`${o.id}-${i}`} value={i}>{o.name}</option>)}
                      </Select>
                    ) : (
                      <p className="text-[15px] font-semibold text-ink-950">{r.options[0].name}{r.options[0].id ? '' : t(' (eigen oefening)', ' (own exercise)')}</p>
                    )}
                    <div className="flex flex-wrap items-end gap-2">
                      <span className="flex flex-col text-[13.5px] font-medium text-ink-800">
                        {t('Sets', 'Sets')}
                        <span className="mt-1 flex items-center gap-1">
                          <button type="button" aria-label={t('Een set minder', 'One set less')} onClick={() => patch(r.id, { sets: Math.max(1, r.sets - 1) })} className="grid h-11 w-11 place-items-center rounded-lg border border-line"><Minus className="h-4 w-4" aria-hidden /></button>
                          <span className="w-6 text-center text-[16px] font-semibold tabular-nums" aria-live="polite">{r.sets}</span>
                          <button type="button" aria-label={t('Een set meer', 'One set more')} onClick={() => patch(r.id, { sets: Math.min(GYM_LIMITS.routineSets, r.sets + 1) })} className="grid h-11 w-11 place-items-center rounded-lg border border-line"><Plus className="h-4 w-4" aria-hidden /></button>
                        </span>
                      </span>
                      <label className="flex flex-col text-[13.5px] font-medium text-ink-800">
                        {t('Herhalingen', 'Reps')}
                        <input type="number" inputMode="numeric" min={1} max={GYM_LIMITS.repsMax} value={r.reps ?? ''} onChange={(e) => patch(r.id, { reps: e.target.value ? Number(e.target.value) : null })}
                          className="mt-1 h-11 w-20 rounded-lg border border-line bg-white px-2 text-[16px] text-ink-950" />
                      </label>
                      <label className="flex flex-col text-[13.5px] font-medium text-ink-800">
                        {t('Kilo', 'Kilo')}
                        <input type="number" inputMode="decimal" min={0} max={GYM_LIMITS.weightMax} step={0.5} value={r.weightKg ?? ''} placeholder="0" onChange={(e) => patch(r.id, { weightKg: e.target.value ? Number(e.target.value) : null })}
                          className="mt-1 h-11 w-20 rounded-lg border border-line bg-white px-2 text-[16px] text-ink-950" />
                      </label>
                      <RemoveButton label={t('Weghalen', 'Remove')} onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {problems.length > 0 && <p role="alert" className="text-[14px] text-bad">{problems[0]}</p>}
          <Button className="w-full" size="lg" data-testid="save-workout" loading={busy} disabled={problems.length > 0} onClick={() => void save()}>{t('Opslaan', 'Save')}</Button>
        </div>
      )}
    </section>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="ml-auto grid h-11 w-11 place-items-center rounded-lg text-ink-600 hover:bg-ink-50">
      <Trash2 className="h-4 w-4" aria-hidden />
    </button>
  );
}

/** The quick entry with its own data (the same cache as the strength log), for pages without it. */
export function QuickWorkoutCard() {
  const q = useQuery({ queryKey: ['gym', '/patient'], queryFn: () => api.get<Gym>('/patient/gym') });
  return q.data ? <QuickWorkout gym={q.data} /> : null;
}
