import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { LOG_XP, PROTEIN, TRAINING_KINDS, type TrainingKind } from '@shared/patientLogs';
import { SKILLS as HERO_SKILLS } from '@shared/hero';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Button, ErrorState, Notice, NumberStepper, ProgressBar, Spinner, useToast } from '@/components/ui';
import type { HeroState } from '@/lib/types';
import { useHero } from '@/pages/patient/HeroPages';

const LABELS = [
  ['Ontbijt', 'Breakfast'],
  ['Lunch', 'Lunch'],
  ['Diner', 'Dinner'],
  ['Shake', 'Shake'],
  ['Tussendoor', 'Snack'],
] as const;

async function saved(qc: ReturnType<typeof useQueryClient>, before: number) {
  const after = await qc.fetchQuery({ queryKey: ['patient-hero'], queryFn: () => api.get<HeroState>('/patient/hero'), staleTime: 0 });
  return after.level.xp - before;
}

/** Own workouts and protein grams. */
export function LogbookPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Logboek', 'Logbook'));
  const q = useHero();
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner />;
  return (
    <div className="space-y-5">
      <Link to="/p/held" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Terug naar je held', 'Back to your hero')}</Link>
      <div>
        <h1 className="t-page">{t('Logboek', 'Logbook')}</h1>
        <p className="mt-1 text-[15px] text-ink-600">{t('Een eigen training of je eiwit van vandaag. Overslaan kost niets. Een hoge pijnscore levert niet méér op, en stoppen vanwege pijn telt als herstel.', 'A workout of your own, or today’s protein. Skipping costs nothing. A high pain score does not earn more, and stopping because of pain counts as recovery.')}</p>
      </div>
      <ProteinCard d={q.data} />
      <TrainingCard d={q.data} />
    </div>
  );
}

/** Protein progress on the home screen. */
export function LogbookHomeCard() {
  const { t } = useI18n();
  const q = useHero();
  if (!q.data?.hero) return null;
  const p = q.data.logs.protein;
  return (
    <Link to="/p/logboek" className="block rounded-2xl border border-line bg-white p-4 shadow-card">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-ink-900">{t('Logboek', 'Logbook')}</span>
        <span className="text-[13px] font-medium text-accent">{t('Bijhouden', 'Update')}</span>
      </span>
      {p.goal === null ? (
        <span className="mt-1 block text-[14px] text-ink-600">{t('Stel je eiwitdoel in of log een eigen training.', 'Set your protein goal or log your own workout.')}</span>
      ) : (
        <>
          <span className="mt-2 flex justify-between text-[14px] text-ink-800">
            <span>{t(`Eiwit ${p.grams} van ${p.goal} g`, `Protein ${p.grams} of ${p.goal} g`)}</span>
            {p.hit && <span className="font-semibold text-ok">{t('gehaald', 'hit')}</span>}
          </span>
          <ProgressBar value={p.grams / p.goal} className="mt-1.5 h-2.5" label={t('Eiwit vandaag', 'Protein today')} />
        </>
      )}
    </Link>
  );
}

function ProteinCard({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const p = d.logs.protein;
  const [gramsGoal, setGramsGoal] = useState(String(p.goal ?? p.suggested));
  const [add, setAdd] = useState<number | null>(25);
  const [label, setLabel] = useState<string>(LABELS[0][0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>, removed = false) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      const delta = await saved(qc, d.level.xp);
      toast(removed ? t('Verwijderd', 'Removed') : delta > 0 ? t(`Opgeslagen: +${delta} XP`, `Saved: +${delta} XP`) : t('Opgeslagen', 'Saved'));
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section id="eiwit" className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="protein-title">
      <h2 id="protein-title" className="t-section">{t('Eiwit', 'Protein')}</h2>
      <p className="mt-1 text-[14px] text-ink-600">{t(`Alleen grammen. Het dagoel levert één keer +${LOG_XP.proteinGoal} XP op, plus Discipline. Niet per hap.`, `Grams only. The daily goal earns +${LOG_XP.proteinGoal} XP once, plus Discipline. Not per bite.`)}</p>
      {error && <Notice tone="bad" className="mt-3">{error}</Notice>}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-[14px] font-medium text-ink-800">
          {t('Dagelijks doel (g)', 'Daily goal (g)')}
          <input inputMode="numeric" value={gramsGoal} onChange={(e) => setGramsGoal(e.target.value.replace(/[^\d]/g, ''))} className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-[16px]" />
        </label>
        <Button size="lg" variant="secondary" loading={busy} onClick={() => {
          const n = Number(gramsGoal);
          if (!Number.isInteger(n) || n < PROTEIN.min || n > PROTEIN.max) {
            setError(t(`Kies tussen ${PROTEIN.min} en ${PROTEIN.max} gram.`, `Choose between ${PROTEIN.min} and ${PROTEIN.max} grams.`));
            return;
          }
          return run(() => api.put('/patient/logs/protein-goal', { grams: n }));
        }}>{p.goal === null ? t('Doel instellen', 'Set goal') : t('Doel bijwerken', 'Update goal')}</Button>
      </div>
      {p.goal === null && <p className="mt-2 text-[13.5px] text-ink-600">{t(`Voorstel: ${p.suggested} g. Je mag het aanpassen.`, `Suggestion: ${p.suggested} g. You can change it.`)}</p>}
      {p.goal !== null && (
        <div className="mt-4">
          <div className="flex justify-between text-[14px]">
            <span className="font-semibold">{p.grams} / {p.goal} g</span>
            <span className={p.hit ? 'font-semibold text-ok' : 'text-ink-600'}>{p.hit ? t('Doel gehaald', 'Goal hit') : t(`nog ${Math.max(0, p.goal - p.grams)} g`, `${Math.max(0, p.goal - p.grams)} g to go`)}</span>
          </div>
          <ProgressBar value={p.grams / p.goal} className="mt-1.5 h-3" label={t('Eiwit vandaag', 'Protein today')} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="w-36">
          <NumberStepper large label={t('Grammen toevoegen', 'Grams to add')} suffix="g" min={PROTEIN.perEntryMin} max={PROTEIN.perEntryMax} value={add} onChange={setAdd} />
        </div>
        <label className="min-w-[8rem] flex-1 text-[14px] font-medium text-ink-800">
          {t('Moment', 'When')}
          <select value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-2 text-[15px]">
            {LABELS.map(([nl, en]) => <option key={nl} value={nl}>{t(nl, en)}</option>)}
          </select>
        </label>
        <Button size="lg" loading={busy} disabled={!add} onClick={() => add && run(() => api.post('/patient/logs/protein', { grams: add, label }))}>{t('Toevoegen', 'Add')}</Button>
      </div>
      {p.entries.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
          {p.entries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 px-3 py-1">
              <span className="min-w-0 flex-1 text-[15px]">{e.grams} g{e.label ? ` · ${e.label}` : ''}</span>
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 hover:bg-canvas" aria-label={t(`Verwijder ${e.grams} g`, `Remove ${e.grams} g`)} onClick={() => run(() => api.del(`/patient/logs/protein/${e.id}`), true)}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TrainingCard({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const [kind, setKind] = useState<TrainingKind>('walk');
  const [minutes, setMinutes] = useState<number | null>(30);
  const [pain, setPain] = useState<number | null>(null);
  const [stopped, setStopped] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = TRAINING_KINDS.find((k) => k.key === kind)!;
  const skillName = HERO_SKILLS.find((s) => s.key === meta.skill);
  const save = async () => {
    if (minutes === null) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/patient/logs/trainings', { kind, minutes, pain, stoppedForPain: stopped, note: note.trim() || undefined });
      const delta = await saved(qc, d.level.xp);
      toast(delta > 0 ? t(`Training gelogd: +${delta} XP`, `Workout logged: +${delta} XP`) : t('Training gelogd', 'Workout logged'));
      setNote('');
      setPain(null);
      setStopped(false);
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.del(`/patient/logs/trainings/${id}`);
      await saved(qc, d.level.xp);
      toast(t('Verwijderd', 'Removed'));
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section id="training" className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="train-title">
      <h2 id="train-title" className="t-section">{t('Eigen training', 'Your own workout')}</h2>
      <p className="mt-1 text-[14px] text-ink-600">{t(`Naast je programma. +${LOG_XP.selfSession} XP, maximaal twee per dag, plus de skill die erbij hoort. Minuten geven niet méér.`, `Besides your programme. +${LOG_XP.selfSession} XP, at most two a day, plus the skill it belongs to. Minutes do not add more.`)}</p>
      {error && <Notice tone="bad" className="mt-3">{error}</Notice>}
      <fieldset className="mt-3">
        <legend className="text-[14px] font-semibold text-ink-900">{t('Soort', 'Kind')}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {TRAINING_KINDS.map((k) => (
            <label key={k.key} className={cn('flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border px-3 text-[14px]', kind === k.key ? 'border-accent bg-accent-soft font-semibold' : 'border-line')}>
              <input type="radio" name="train-kind" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={kind === k.key} onChange={() => setKind(k.key)} />
              {nl ? k.nl : k.en}
            </label>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-ink-600">{t(`Dit telt voor ${skillName ? (nl ? skillName.nl : skillName.en) : meta.skill} en Discipline.`, `This counts for ${skillName ? (nl ? skillName.nl : skillName.en) : meta.skill} and Discipline.`)}</p>
      </fieldset>
      <div className="mt-3 w-40">
        <p className="mb-1 text-[14px] font-medium text-ink-800">{t('Minuten', 'Minutes')}</p>
        <NumberStepper large label={t('Minuten', 'Minutes')} min={5} max={180} value={minutes} onChange={setMinutes} />
      </div>
      <fieldset className="mt-4">
        <legend className="text-[14px] font-semibold text-ink-900">{t('Pijn tijdens de training (optioneel)', 'Pain during the workout (optional)')}</legend>
        <p className="text-[13px] text-ink-600">{t('Eerlijk doorgeven levert Herstel-XP op. De score zelf maakt niet uit.', 'Reporting it honestly earns Recovery XP. The score itself does not matter.')}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <button type="button" aria-pressed={pain === null} onClick={() => setPain(null)} className={cn('h-11 rounded-lg border px-3 text-[14px]', pain === null ? 'border-accent bg-accent-soft font-semibold' : 'border-line')}>{t('Niet doorgeven', 'Skip')}</button>
          {Array.from({ length: 11 }, (_, i) => (
            <button key={i} type="button" aria-pressed={pain === i} onClick={() => setPain(i)} className={cn('h-11 w-11 rounded-lg border text-[14px] font-semibold', pain === i ? 'border-accent bg-accent-soft' : 'border-line')}>{i}</button>
          ))}
        </div>
      </fieldset>
      <label className="mt-3 flex min-h-[44px] items-start gap-2 text-[15px]"><input type="checkbox" className="mt-1 h-5 w-5" checked={stopped} onChange={(e) => setStopped(e.target.checked)} />{t('Ik ben gestopt vanwege pijn. Dat telt voor Herstel, niet voor de trainingsskill.', 'I stopped because of pain. That counts for Recovery, not for the training skill.')}</label>
      <label className="mt-2 block text-[14px] font-medium text-ink-800">
        {t('Notitie (optioneel)', 'Note (optional)')}
        <input value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-[16px]" />
      </label>
      <Button size="xl" className="mt-3 w-full" loading={busy} disabled={minutes === null} onClick={save}>{t('Training opslaan', 'Save workout')}</Button>
      {d.logs.trainings.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line" aria-label={t('Gelogde trainingen', 'Logged workouts')}>
          {d.logs.trainings.map((tr) => {
            const kindMeta = TRAINING_KINDS.find((k) => k.key === tr.kind);
            return (
              <li key={tr.id} className="flex items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1 text-[14.5px]">
                  <span className="font-semibold">{kindMeta ? (nl ? kindMeta.nl : kindMeta.en) : tr.kind}</span>
                  <span className="text-ink-600"> · {tr.minutes} min{tr.stoppedForPain ? t(' · gestopt', ' · stopped') : ''}</span>
                  <span className="block text-[12.5px] text-ink-500">{tr.day}</span>
                </span>
                <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 hover:bg-canvas" aria-label={t('Verwijder deze training', 'Remove this workout')} onClick={() => remove(tr.id)}><Trash2 className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
