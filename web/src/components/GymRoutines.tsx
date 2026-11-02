import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronUp, ListChecks, Minus, Pencil, Play, Plus, Trash2, Trophy, X } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Button, Dialog, Input, useToast } from '@/components/ui';
import { GYM_LIMITS, RIR_OPTIONS, gymKey, setEstimate, type GymExerciseSummary, type GymRoutine, type RoutineItem } from '@shared/gymLog';
import { parseMetric } from '@shared/hero';

type Library = { id: string; nameNl: string; nameEn: string }[];
type GymData = { exercises: GymExerciseSummary[]; library: Library };

const ADV_KEY = 'fp.gym.advanced';
/** Advanced logging (RIR) is a display preference for this device; the RIR values themselves are stored on the server. */
export function useGymAdvanced(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(() => {
    try { return localStorage.getItem(ADV_KEY) === '1'; } catch { return false; }
  });
  return [on, (v: boolean) => {
    setOn(v);
    try { localStorage.setItem(ADV_KEY, v ? '1' : '0'); } catch { /* storage unavailable */ }
  }];
}

const kg = (n: number, nl: boolean) => `${n.toLocaleString(nl ? 'nl-NL' : 'en-GB', { maximumFractionDigits: 1 })} kg`;

/** Small stepper: − value + (min 44 px targets). */
function Stepper({ label, value, onChange, min, max, step = 1, format }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; format?: (v: number) => string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1" role="group" aria-label={label}>
      <button type="button" aria-label={t(`${label}: minder`, `${label}: less`)} onClick={() => onChange(Math.max(min, value - step))} className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-canvas"><Minus className="h-4 w-4" /></button>
      <output className="min-w-0 flex-1 text-center font-display text-[18px] font-bold tabular-nums">{format ? format(value) : value}</output>
      <button type="button" aria-label={t(`${label}: meer`, `${label}: more`)} onClick={() => onChange(Math.min(max, value + step))} className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-canvas"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

/** RIR picker: reps left in the tank (advanced). */
export function RirPicker({ value, onChange, idBase }: { value: number | null; onChange: (v: number | null) => void; idBase: string }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-labelledby={`${idBase}-rir`} className="flex flex-wrap items-center gap-1.5">
      <span id={`${idBase}-rir`} className="mr-1 text-[13.5px] font-medium text-ink-700">{t('RIR (herhalingen over)', 'RIR (reps in reserve)')}</span>
      {RIR_OPTIONS.map((r) => (
        <button key={r} type="button" role="radio" aria-checked={value === r} onClick={() => onChange(value === r ? null : r)}
          className={cn('tap h-11 min-w-[44px] rounded-lg border px-2 text-[15px] font-semibold tabular-nums', value === r ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-white text-ink-800')}>
          {r === 5 ? '5+' : r}
        </button>
      ))}
    </div>
  );
}

/**
 * Own routines ("Mijn schema's"): build a list of exercises with sets and a rep range, save it on
 * your account, start it, and log set by set with one tap (last time's weight filled in).
 */
export function GymRoutines() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const routines = useQuery({ queryKey: ['gym-routines'], queryFn: () => api.get<GymRoutine[]>('/patient/gym/routines') });
  const gym = useQuery({ queryKey: ['gym', '/patient'], queryFn: () => api.get<GymData>('/patient/gym') });
  const [editing, setEditing] = useState<GymRoutine | 'new' | null>(null);
  const [active, setActive] = useState<GymRoutine | null>(null);
  const [advanced, setAdvanced] = useGymAdvanced();

  if (active && gym.data) return <RoutineSession routine={active} gym={gym.data} advanced={advanced} onClose={() => setActive(null)} />;

  const remove = async (r: GymRoutine) => {
    try {
      await api.del(`/patient/gym/routines/${r.id}`);
      await qc.invalidateQueries({ queryKey: ['gym-routines'] });
      setEditing(null);
      toast(t('Schema verwijderd', 'Routine deleted'), 'ok');
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5" aria-labelledby="routines-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="routines-title" className="t-section flex items-center gap-2"><ListChecks className="h-5 w-5 text-accent" aria-hidden />{t('Mijn schema’s', 'My routines')}</h2>
        <Button size="lg" variant="secondary" icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setEditing('new')}>{t('Nieuw', 'New')}</Button>
      </div>
      <p className="mt-1 text-[14px] text-ink-600">{t('Bewaar je eigen trainingen en log ze set voor set. Je gewicht van vorige keer staat al klaar.', 'Save your own workouts and log them set by set. Last time’s weight is filled in.')}</p>
      {routines.data && routines.data.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {routines.data.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-xl border border-line p-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink-900">{r.name}</span>
                <span className="block truncate text-[13.5px] text-ink-600">{r.items.map((i) => i.exerciseName).join(' · ')}</span>
              </span>
              <button type="button" onClick={() => setEditing(r)} aria-label={t(`${r.name} bewerken`, `Edit ${r.name}`)} className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100"><Pencil className="h-4 w-4" /></button>
              <Button size="lg" disabled={!gym.data} onClick={() => setActive(r)} icon={<Play className="h-4 w-4 fill-current" aria-hidden />} aria-label={t(`Start ${r.name}`, `Start ${r.name}`)}>{t('Start', 'Start')}</Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl bg-canvas p-3 text-[14px] text-ink-700">{t('Nog geen schema. Maak er een met je vaste oefeningen, bijv. “Push” of “Benen”.', 'No routine yet. Make one with your usual exercises, e.g. “Push” or “Legs”.')}</p>
      )}
      <label className="mt-3 flex min-h-[44px] cursor-pointer items-center gap-3 text-[14.5px] text-ink-800">
        <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--accent))]" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} />
        <span><strong className="font-semibold">{t('Geavanceerd: RIR bijhouden', 'Advanced: track RIR')}</strong><span className="block text-[13px] text-ink-600">{t('Per set: hoeveel herhalingen had je nog over? 0 = niets meer, 2–3 = goed zwaar.', 'Per set: how many more reps could you have done? 0 = nothing left, 2–3 = hard enough.')}</span></span>
      </label>
      {editing && gym.data && (
        <RoutineEditor
          routine={editing === 'new' ? null : editing}
          library={gym.data.library}
          own={gym.data.exercises.map((e) => e.name)}
          onClose={() => setEditing(null)}
          onDelete={editing === 'new' ? undefined : () => remove(editing)}
        />
      )}
    </section>
  );
}

function RoutineEditor({ routine, library, own, onClose, onDelete }: { routine: GymRoutine | null; library: Library; own: string[]; onClose: () => void; onDelete?: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(routine?.name ?? '');
  const [items, setItems] = useState<RoutineItem[]>(routine?.items ?? []);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const names = [...new Set([...own, ...library.map((l) => (nl ? l.nameNl : l.nameEn))])];
  const add = () => {
    const n = pick.trim().replace(/\s+/g, ' ');
    if (n.length < GYM_LIMITS.nameMin || items.length >= GYM_LIMITS.routineItems) return;
    const lib = library.find((l) => gymKey(l.nameNl) === gymKey(n) || gymKey(l.nameEn) === gymKey(n));
    setItems((xs) => [...xs, { exerciseId: lib?.id ?? null, exerciseName: n, sets: 3, repsMin: 8, repsMax: 12, restS: 120 }]);
    setPick('');
  };
  const upd = (i: number, p: Partial<RoutineItem>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => setItems((xs) => { const ys = [...xs]; const [x] = ys.splice(i, 1); ys.splice(i + d, 0, x); return ys; });
  const save = async () => {
    setBusy(true);
    try {
      const body = { name: name.trim(), items };
      if (routine) await api.put(`/patient/gym/routines/${routine.id}`, body);
      else await api.post('/patient/gym/routines', body);
      await qc.invalidateQueries({ queryKey: ['gym-routines'] });
      toast(t('Schema opgeslagen', 'Routine saved'), 'ok');
      onClose();
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} sheet size="md" title={routine ? t('Schema bewerken', 'Edit routine') : t('Nieuw schema', 'New routine')}
      footer={
        <div className="flex w-full flex-wrap items-center gap-2">
          {onDelete && <Button variant="secondary" size="lg" onClick={onDelete} icon={<Trash2 className="h-4 w-4" aria-hidden />}>{t('Verwijderen', 'Delete')}</Button>}
          <Button size="lg" className="ml-auto" loading={busy} disabled={name.trim().length < 2 || items.length === 0} onClick={save}>{t('Opslaan', 'Save')}</Button>
        </div>
      }>
      <div className="space-y-4">
        <Input label={t('Naam', 'Name')} value={name} maxLength={60} placeholder={t('Bijv. Push, Benen, Thuis', 'E.g. Push, Legs, Home')} onChange={(e) => setName(e.target.value)} />
        <div>
          <Input label={t('Oefening toevoegen', 'Add exercise')} value={pick} list="routine-exercises" maxLength={GYM_LIMITS.nameMax} placeholder={t('Zoek of typ een oefening', 'Search or type an exercise')} onChange={(e) => setPick(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
          <datalist id="routine-exercises">{names.map((n) => <option key={n} value={n} />)}</datalist>
          <Button size="lg" variant="secondary" className="mt-2 w-full" disabled={pick.trim().length < GYM_LIMITS.nameMin} onClick={add} icon={<Plus className="h-4 w-4" aria-hidden />}>{t('Toevoegen', 'Add')}</Button>
        </div>
        {items.length > 0 && (
          <ol className="space-y-3">
            {items.map((it, i) => (
              <li key={`${it.exerciseName}-${i}`} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-1">
                  <span className="min-w-0 flex-1 font-semibold text-ink-900">{i + 1}. {it.exerciseName}</span>
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t(`${it.exerciseName} omhoog`, `Move ${it.exerciseName} up`)} className="tap flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t(`${it.exerciseName} omlaag`, `Move ${it.exerciseName} down`)} className="tap flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} aria-label={t(`${it.exerciseName} weghalen`, `Remove ${it.exerciseName}`)} className="tap flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 hover:text-bad"><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[12.5px] text-ink-600">
                  <div><span className="mb-1 block">{t('Sets', 'Sets')}</span><Stepper label={t(`Sets ${it.exerciseName}`, `Sets ${it.exerciseName}`)} value={it.sets} min={1} max={GYM_LIMITS.routineSets} onChange={(v) => upd(i, { sets: v })} /></div>
                  <div><span className="mb-1 block">{t('Min. herh.', 'Min reps')}</span><Stepper label={t(`Minimum herhalingen ${it.exerciseName}`, `Minimum reps ${it.exerciseName}`)} value={it.repsMin} min={1} max={it.repsMax} onChange={(v) => upd(i, { repsMin: v })} /></div>
                  <div><span className="mb-1 block">{t('Max. herh.', 'Max reps')}</span><Stepper label={t(`Maximum herhalingen ${it.exerciseName}`, `Maximum reps ${it.exerciseName}`)} value={it.repsMax} min={it.repsMin} max={50} onChange={(v) => upd(i, { repsMax: v })} /></div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Dialog>
  );
}

type SetRow = { weight: string; reps: number; rir: number | null; done: boolean; estimate: number | null; pr: boolean };

/** Logging a routine: one card per exercise, a row per set, one tap (✓) saves the set. */
function RoutineSession({ routine, gym, advanced, onClose }: { routine: GymRoutine; gym: GymData; advanced: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const last = (name: string) => gym.exercises.find((e) => e.key === gymKey(name))?.last ?? null;
  const [rows, setRows] = useState<SetRow[][]>(() =>
    routine.items.map((it) => {
      const l = last(it.exerciseName);
      return Array.from({ length: it.sets }, () => ({ weight: l ? String(l.weightKg).replace('.', nl ? ',' : '.') : '', reps: l?.reps ?? it.repsMax, rir: null, done: false, estimate: null, pr: false }));
    }),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const upd = (i: number, j: number, p: Partial<SetRow>) => setRows((xs) => xs.map((r, a) => (a === i ? r.map((s, b) => (b === j ? { ...s, ...p } : s)) : r)));
  const logSet = async (i: number, j: number) => {
    const it = routine.items[i];
    const s = rows[i][j];
    const w = parseMetric(s.weight || '0');
    if (w === null) return;
    setBusy(`${i}-${j}`);
    try {
      const r = await api.post<{ estimate: number | null; pr: boolean }>('/patient/gym/sets', { exerciseName: it.exerciseName, exerciseId: it.exerciseId, weightKg: w, reps: s.reps, rir: advanced ? s.rir : null, place: 'gym' });
      upd(i, j, { done: true, estimate: r.estimate, pr: r.pr });
      // Carry the weight to the next open set of this exercise.
      setRows((xs) => xs.map((row, a) => (a === i ? row.map((x, b) => (b > j && !x.done ? { ...x, weight: s.weight } : x)) : row)));
      if (r.pr) toast(t(`Nieuw record op ${it.exerciseName}! 🏆`, `New record on ${it.exerciseName}! 🏆`), 'ok');
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(null);
    }
  };
  const all = rows.flat();
  const done = all.filter((s) => s.done);
  const volume = done.reduce((sum, s) => sum + (parseMetric(s.weight) ?? 0) * s.reps, 0);
  const prs = done.filter((s) => s.pr).length;
  const finish = async () => {
    await qc.invalidateQueries({ queryKey: ['gym', '/patient'] });
    await qc.invalidateQueries({ queryKey: ['patient-hero'] });
    setFinished(true);
  };

  if (finished) {
    return (
      <section className="rounded-2xl border border-line bg-white p-5 text-center shadow-card" aria-labelledby="routine-done">
        <Trophy className="mx-auto h-10 w-10 text-sand-ink" aria-hidden />
        <h2 id="routine-done" className="mt-2 text-[22px] font-bold">{t('Training gelogd!', 'Workout logged!')}</h2>
        <p className="mt-1 text-[15px] text-ink-700">{t(`${done.length} van ${all.length} sets · ${Math.round(volume).toLocaleString('nl-NL')} kg verzet`, `${done.length} of ${all.length} sets · ${Math.round(volume).toLocaleString('en-GB')} kg lifted`)}{prs > 0 ? t(` · ${prs} ${prs === 1 ? 'record' : 'records'}`, ` · ${prs} ${prs === 1 ? 'record' : 'records'}`) : ''}</p>
        <Button size="lg" className="mt-4 w-full" onClick={onClose}>{t('Klaar', 'Done')}</Button>
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="routine-active">
      <div className="flex items-center justify-between gap-2">
        <h2 id="routine-active" className="text-[22px] font-bold">{routine.name}</h2>
        <span className="text-[14px] font-medium tabular-nums text-ink-600">{done.length}/{all.length} {t('sets', 'sets')}</span>
      </div>
      {routine.items.map((it, i) => {
        const l = last(it.exerciseName);
        return (
          <div key={`${it.exerciseName}-${i}`} className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <p className="font-semibold text-ink-900">{it.exerciseName}</p>
            <p className="text-[13.5px] text-ink-600">
              {t(`${it.sets} × ${it.repsMin}–${it.repsMax} herhalingen`, `${it.sets} × ${it.repsMin}–${it.repsMax} reps`)}
              {l ? t(` · vorige keer ${kg(l.weightKg, true)} × ${l.reps}`, ` · last time ${kg(l.weightKg, false)} × ${l.reps}`) : ''}
            </p>
            <ol className="mt-2 space-y-2">
              {rows[i].map((s, j) => {
                const est = setEstimate(parseMetric(s.weight) ?? 0, s.reps);
                return (
                  <li key={j} className={cn('rounded-xl border p-2', s.done ? 'border-ok/40 bg-ok-soft' : 'border-line')}>
                    <div className="flex items-center gap-2">
                      <span className="w-12 shrink-0 text-[13px] font-semibold text-ink-700">{t('Set', 'Set')} {j + 1}</span>
                      <label className="sr-only" htmlFor={`rw-${i}-${j}`}>{t(`Gewicht set ${j + 1} ${it.exerciseName} (kg)`, `Weight set ${j + 1} ${it.exerciseName} (kg)`)}</label>
                      <input id={`rw-${i}-${j}`} inputMode="decimal" value={s.weight} disabled={s.done} placeholder="kg" onChange={(e) => upd(i, j, { weight: e.target.value })} className="h-11 w-20 shrink-0 rounded-lg border border-line bg-white text-center font-display text-[17px] font-bold tabular-nums disabled:bg-transparent" />
                      <span className="text-ink-500" aria-hidden>×</span>
                      <div className="min-w-0 flex-1">
                        {s.done ? <span className="font-display text-[17px] font-bold tabular-nums">{s.reps}</span> : <Stepper label={t(`Herhalingen set ${j + 1} ${it.exerciseName}`, `Reps set ${j + 1} ${it.exerciseName}`)} value={s.reps} min={1} max={GYM_LIMITS.repsMax} onChange={(v) => upd(i, j, { reps: v })} />}
                      </div>
                      <button type="button" disabled={s.done || busy !== null || parseMetric(s.weight || '0') === null} onClick={() => logSet(i, j)}
                        aria-label={s.done ? t(`Set ${j + 1} ${it.exerciseName} opgeslagen`, `Set ${j + 1} ${it.exerciseName} saved`) : t(`Set ${j + 1} ${it.exerciseName} opslaan`, `Save set ${j + 1} ${it.exerciseName}`)}
                        className={cn('tap flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', s.done ? 'bg-ok text-white' : 'bg-accent text-accent-ink disabled:opacity-40')}>
                        <Check className="h-5 w-5" strokeWidth={3} />
                      </button>
                    </div>
                    {advanced && !s.done && <div className="mt-2"><RirPicker value={s.rir} onChange={(v) => upd(i, j, { rir: v })} idBase={`r-${i}-${j}`} /></div>}
                    {s.done && (s.estimate ?? est) !== null && <p className="mt-1 text-[12.5px] text-ink-600">1RM ≈ {kg((s.estimate ?? est)!, nl)}{s.rir !== null ? ` · RIR ${s.rir}` : ''}{s.pr ? t(' · record!', ' · record!') : ''}</p>}
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="lg" onClick={onClose}>{t('Stoppen', 'Stop')}</Button>
        <Button size="lg" disabled={done.length === 0} onClick={finish}>{t('Training afronden', 'Finish workout')}</Button>
      </div>
    </section>
  );
}
