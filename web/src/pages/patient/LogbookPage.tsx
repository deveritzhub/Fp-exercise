import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Beef, Dumbbell, Footprints, Scale, Trash2 } from 'lucide-react';
import { Fold } from '@/components/app/Fold';
import { LOG_XP, STEPS, TRAINING_KINDS, type TrainingKind } from '@shared/patientLogs';
import { SKILLS as HERO_SKILLS } from '@shared/hero';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Button, ErrorState, Notice, NumberStepper, ProgressBar, Spinner, useToast } from '@/components/ui';
import type { HeroState } from '@/lib/types';
import { ProteinEntries, ProteinLevels, ProteinQuickAdd, ProteinRing, WeightLog, zoneLabel } from '@/components/patient/Nutrition';
import { useHero } from '@/pages/patient/HeroPages';

async function saved(qc: ReturnType<typeof useQueryClient>, before: number) {
  const after = await qc.fetchQuery({ queryKey: ['patient-hero'], queryFn: () => api.get<HeroState>('/patient/hero'), staleTime: 0 });
  return after.level.xp - before;
}

/** Own workouts and protein grams. */
export function LogbookPage() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Logboek', 'Logbook'));
  const q = useHero();
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner />;
  const d = q.data;
  return (
    <div className="space-y-5">
      <Link to="/p/held" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Terug naar je held', 'Back to your hero')}</Link>
      <div>
        <h1 className="t-page">{t('Logboek', 'Logbook')}</h1>
        <p className="mt-1 text-[15px] text-ink-600">{t('Een eigen training of je eiwit van vandaag. Overslaan kost niets. Een hoge pijnscore levert niet méér op, en stoppen vanwege pijn telt als herstel.', 'A workout of your own, or today’s protein. Skipping costs nothing. A high pain score does not earn more, and stopping because of pain counts as recovery.')}</p>
      </div>
      <Fold id="log-protein" defaultOpen icon={<Beef className="h-5 w-5" />} title={t('Eiwit', 'Protein')}
        summary={d.logs.protein.goal !== null ? t(`${d.logs.protein.grams} van ${d.logs.protein.goal} g vandaag`, `${d.logs.protein.grams} of ${d.logs.protein.goal} g today`) : t(`${d.logs.protein.grams} g vandaag`, `${d.logs.protein.grams} g today`)}>
        <ProteinCard d={d} />
      </Fold>
      <Fold id="log-weight" icon={<Scale className="h-5 w-5" />} title={t('Gewicht', 'Weight')}
        summary={d.logs.weight.latestKg !== null ? `${d.logs.weight.latestKg.toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB')} kg` : t('Nog niet ingevuld', 'Not filled in yet')}>
        <WeightCard d={d} />
      </Fold>
      <Fold id="log-steps" icon={<Footprints className="h-5 w-5" />} title={t('Stappen', 'Steps')}
        summary={`${d.logs.steps.today.toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB')} / ${d.logs.steps.goal.toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB')}${d.logs.steps.hit ? t(' · gehaald', ' · hit') : ''}`}>
        <StepsCard d={d} />
      </Fold>
      <Fold id="log-training" icon={<Dumbbell className="h-5 w-5" />} title={t('Eigen training', 'Your own workout')}
        summary={t(`${d.logs.trainings.length} gelogd in de laatste 2 weken`, `${d.logs.trainings.length} logged in the last 2 weeks`)}>
        <TrainingCard d={d} />
      </Fold>
    </div>
  );
}

/** Protein progress on the home screen. */
export function LogbookHomeCard() {
  const { t, locale } = useI18n();
  const q = useHero();
  if (!q.data?.hero) return null;
  const p = q.data.logs.protein;
  return (
    <Link to="/p/logboek" className="block rounded-2xl border border-line bg-white p-4 shadow-card">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-ink-900">{t('Logboek', 'Logbook')}</span>
        <span className="text-[13px] font-medium text-accent">{t('Bijhouden', 'Update')}</span>
      </span>
      <span className="mt-1 block text-[13.5px] text-ink-600">{t(`Stappen ${q.data.logs.steps.today} van ${q.data.logs.steps.goal}`, `Steps ${q.data.logs.steps.today} of ${q.data.logs.steps.goal}`)}{q.data.logs.steps.hit ? t(' · gehaald', ' · hit') : ''}</span>
      {p.goal === null ? (
        <span className="mt-1 block text-[14px] text-ink-600">{t('Stel je eiwitdoel in of log een eigen training.', 'Set your protein goal or log your own workout.')}</span>
      ) : (
        <>
          <span className="mt-2 flex justify-between text-[14px] text-ink-800">
            <span>{t(`Eiwit ${p.grams} van ${p.goal} g`, `Protein ${p.grams} of ${p.goal} g`)}{p.zone ? <span className="text-ink-600"> · {zoneLabel(p.zone, locale === 'nl')}</span> : null}</span>
            {p.hit && <span className="font-semibold text-ok">{t('gehaald', 'hit')}</span>}
          </span>
          <ProgressBar value={p.grams / p.goal} className="mt-1.5 h-2.5" label={t('Eiwit vandaag', 'Protein today')} />
        </>
      )}
    </Link>
  );
}

function StepsCard({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const s = d.logs.steps;
  const flag = params.get('steps');
  const [goal, setGoal] = useState(String(s.goal));
  const [count, setCount] = useState<number | null>(s.today || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const note = flag === 'connected' ? t('Google Health is gekoppeld. Je stappen van de afgelopen week zijn opgehaald.', 'Google Health is connected. Your steps from the past week were fetched.')
    : flag === 'denied' ? t('Je hebt de koppeling afgewezen. Stappen zelf invullen kan nog steeds.', 'You declined the connection. You can still enter steps yourself.')
    : flag === 'not_linked' ? t('Dit Google-account is nog niet gekoppeld aan Google Health. Koppel het daar eerst (ook voor een Fitbit), en probeer het hier opnieuw.', 'This Google account is not linked to Google Health yet. Link it there first (also for a Fitbit), then try again here.')
    : flag === 'off' ? t('Google Health is op deze server nog niet ingesteld.', 'Google Health is not set up on this server yet.')
    : flag === 'error' ? t('Koppelen is niet gelukt. Probeer het opnieuw.', 'Connecting did not work. Please try again.')
    : null;
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      const delta = await saved(qc, d.level.xp);
      toast(delta > 0 ? t(`Opgeslagen: +${delta} XP`, `Saved: +${delta} XP`) : t('Opgeslagen', 'Saved'));
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section id="stappen" className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="steps-title">
      <h2 id="steps-title" className="t-section">{t('Stappen', 'Steps')}</h2>
      <p className="mt-1 text-[14px] text-ink-600">{t(`Het dagoel levert één keer +${LOG_XP.stepGoal} XP op, plus Conditie. Meer stappen geven niet méér, en een dag missen kost niets.`, `The daily goal earns +${LOG_XP.stepGoal} XP once, plus Endurance. More steps do not earn more, and missing a day costs nothing.`)}</p>
      {note && <Notice tone={flag === 'connected' ? 'ok' : 'warn'} className="mt-3">{note}</Notice>}
      {error && <Notice tone="bad" className="mt-3">{error}</Notice>}
      <div className="mt-3">
        <div className="flex justify-between text-[14px]">
          <span className="font-semibold">{s.today.toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB')} / {s.goal.toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB')}</span>
          <span className={s.hit ? 'font-semibold text-ok' : 'text-ink-600'}>{s.hit ? t('Doel gehaald', 'Goal hit') : t(`nog ${Math.max(0, s.goal - s.today).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB')}`, `${Math.max(0, s.goal - s.today).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB')} to go`)}</span>
        </div>
        <ProgressBar value={s.today / s.goal} className="mt-1.5 h-3" label={t('Stappen vandaag', 'Steps today')} />
        {s.source && <p className="mt-1 text-[13px] text-ink-500">{s.source === 'google_health' ? t('Bron: Google Health', 'Source: Google Health') : t('Bron: zelf ingevuld', 'Source: entered by you')}</p>}
      </div>
      <div className="mt-4 rounded-xl border border-line p-3">
        <h3 className="text-[15px] font-semibold">{t('Google Health', 'Google Health')}</h3>
        <p className="mt-1 text-[13.5px] text-ink-600">{t('Live: stappen uit Google Health, inclusief een Fitbit of Pixel Watch die daar staat. Apple Gezondheid, Health Connect rechtstreeks, Strava en Garmin zitten hier nog niet in.', 'Live: steps from Google Health, including a Fitbit or Pixel Watch that shows up there. Apple Health, Health Connect directly, Strava and Garmin are not in here yet.')}</p>
        {s.google.connected ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="lg" loading={busy} onClick={() => run(() => api.post('/patient/logs/steps/google/sync'))}>{t('Stappen ophalen', 'Fetch steps')}</Button>
            <Button size="lg" variant="secondary" loading={busy} onClick={() => run(() => api.del('/patient/logs/steps/google'))}>{t('Ontkoppelen', 'Disconnect')}</Button>
          </div>
        ) : s.google.configured ? (
          <a href="/api/patient/logs/steps/google/start" className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-ink">{t('Koppel Google Health', 'Connect Google Health')}</a>
        ) : (
          <p className="mt-2 text-[14px] text-ink-700">{t('Koppelen staat op deze server nog uit. Vul je stappen hieronder zelf in.', 'Connecting is still off on this server. Enter your steps below.')}</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-[14px] font-medium text-ink-800">
          {t('Dagelijks doel', 'Daily goal')}
          <input inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value.replace(/[^\d]/g, ''))} className="mt-1 h-11 w-28 rounded-lg border border-line px-3 text-[16px]" />
        </label>
        <Button size="lg" variant="secondary" loading={busy} onClick={() => {
          const n = Number(goal);
          if (!Number.isInteger(n) || n < STEPS.goalMin || n > STEPS.goalMax) {
            setError(t(`Kies tussen ${STEPS.goalMin} en ${STEPS.goalMax} stappen.`, `Choose between ${STEPS.goalMin} and ${STEPS.goalMax} steps.`));
            return;
          }
          return run(() => api.put('/patient/logs/steps/goal', { steps: n }));
        }}>{t('Doel bijwerken', 'Update goal')}</Button>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="w-44">
          <NumberStepper large label={t('Stappen vandaag', 'Steps today')} min={0} max={STEPS.maxSteps} value={count} onChange={setCount} />
        </div>
        <Button size="lg" loading={busy} disabled={count === null} onClick={() => count !== null && run(() => api.put('/patient/logs/steps', { steps: count }))}>{t('Zelf invullen', 'Enter yourself')}</Button>
      </div>
      <p className="mt-2 text-[12.5px] text-ink-500">{t('Een gekoppelde bron overschrijft deze dag bij de volgende sync. Alleen jij ziet deze stappen.', 'A connected source overwrites this day on the next sync. Only you see these steps.')}</p>
    </section>
  );
}

function ProteinCard({ d }: { d: HeroState }) {
  const { t } = useI18n();
  return (
    <section id="eiwit" className="scroll-mt-24 space-y-4 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="protein-title">
      <div>
        <h2 id="protein-title" className="t-section">{t('Eiwit', 'Protein')}</h2>
        <p className="mt-1 text-[14px] text-ink-600">{t('Je doel is afgestemd op je eigen gewicht: minimaal, suboptimaal of optimaal.', 'Your goal is matched to your own weight: minimum, sub-optimal or optimal.')}</p>
      </div>
      <ProteinRing d={d} />
      <ProteinQuickAdd d={d} />
      <ProteinEntries d={d} />
      <ProteinLevels d={d} />
    </section>
  );
}

function WeightCard({ d }: { d: HeroState }) {
  const { t } = useI18n();
  return (
    <section id="gewicht" className="scroll-mt-24 space-y-3 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="weight-title">
      <h2 id="weight-title" className="t-section">{t('Gewicht', 'Weight')}</h2>
      <WeightLog d={d} />
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
