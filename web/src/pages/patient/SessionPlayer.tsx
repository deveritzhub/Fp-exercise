import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, CheckCircle2, ChevronDown, Info, MessageCircle, PartyPopper, Repeat, SkipForward, VideoOff, X } from 'lucide-react';
import { api, ApiError, mediaUrl } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { toISODate } from '@shared/adherence';
import { itemsForDate } from '@shared/schedule';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { isNetworkError, postOrQueue } from '@/lib/outbox';
import { useSession } from '@/lib/session';
import { Button, ErrorState, Notice, NumberStepper, ProgressRing, ScaleInput, Spinner, Textarea } from '@/components/ui';
import { ExerciseThumb } from '@/components/app/ExerciseThumb';
import { ProgramItemsList } from '@/components/patient/TodayCard';
import type { Program, ProgramItem } from '@/lib/types';

type PatientProgram = Program & { therapistName: string; openSession: { id: string; loggedItemIds: string[] } | null };
type Phase = 'intro' | 'exercise' | 'rate' | 'summary' | 'done';

export function PatientProgramPage() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['patient-program', id], queryFn: () => api.get<PatientProgram>(`/patient/programs/${id}`) });
  useDocumentMeta(q.data?.title ?? t('Programma', 'Programme'));
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner />;
  const p = q.data;
  return (
    <div className="space-y-5">
      <Link to="/p" className="inline-flex items-center gap-1 text-[15px] font-medium text-ink-600"><ArrowLeft className="h-4 w-4" />{t('Terug', 'Back')}</Link>
      <div>
        <h1 className="text-2xl font-semibold">{p.title}</h1>
        <p className="mt-1 text-ink-500">{t('Van', 'From')} {p.therapistName}</p>
      </div>
      <ProgramItemsList items={p.items} instructions={p.patientInstructions} />
      {p.status === 'active' && (
        <Link to={`/p/sessie/${p.id}`} className="flex h-14 w-full items-center justify-center rounded-xl bg-accent text-base font-semibold text-white shadow-xs">{t('Start training', 'Start workout')}</Link>
      )}
    </div>
  );
}

type Rating = { completed: boolean; setsDone: number | null; repsDone: number | null; difficulty: number | null; pain: number | null; feedback: string };

export function SessionPlayer() {
  const { id = '' } = useParams();
  const { t, locale } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  useDocumentMeta(t('Training', 'Workout'));
  const q = useQuery({ queryKey: ['patient-program', id], queryFn: () => api.get<PatientProgram>(`/patient/programs/${id}`), staleTime: Infinity });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<Record<string, Rating>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const { user } = useSession();
  const uid = user?.id ?? '';

  const items = useMemo(() => {
    if (!q.data) return [];
    const today = itemsForDate({ startDate: q.data.startDate, endDate: q.data.endDate }, q.data.items, toISODate(new Date()));
    // Not a planned day: the patient may still train, then with every exercise (said on the intro).
    return today.length ? today : q.data.items;
  }, [q.data]);
  const unplanned = !!q.data && items.length === q.data.items.length && !itemsForDate({ startDate: q.data.startDate, endDate: q.data.endDate }, q.data.items, toISODate(new Date())).length;

  const begin = (sid: string) => {
    setSessionId(sid);
    const logged = new Set(q.data?.openSession?.id === sid ? q.data.openSession.loggedItemIds : []);
    const first = items.findIndex((i) => !logged.has(i.id!));
    setIdx(first === -1 ? 0 : first);
    setPhase(first === -1 && logged.size ? 'summary' : 'exercise');
  };

  const start = async () => {
    setError(null);
    try {
      begin((await api.post<{ id: string }>('/patient/sessions', { programId: id })).id);
    } catch (e) {
      if (!isNetworkError(e)) return setError(errorMessage(e instanceof ApiError ? e.code : undefined, locale));
      // No connection: train anyway. The workout gets its id here and is sent later.
      const open = q.data?.openSession?.id;
      const sid = open ?? crypto.randomUUID();
      if (!open) await postOrQueue(uid, '/patient/sessions', { programId: id, id: sid, startedAt: new Date().toISOString() });
      setSavedOffline(true);
      begin(sid);
    }
  };

  const saveLog = async (item: ProgramItem, r: Rating) => {
    setSaving(true);
    setError(null);
    try {
      const how = await postOrQueue(uid, `/patient/sessions/${sessionId}/logs`, {
        programItemId: item.id, completed: r.completed, setsDone: r.setsDone, repsDone: r.repsDone, difficulty: r.difficulty, pain: r.pain, feedback: r.feedback.trim() || null,
      });
      if (how === 'queued') setSavedOffline(true);
      setDone((d) => ({ ...d, [item.id!]: r }));
      if (idx + 1 < items.length) {
        setIdx(idx + 1);
        setPhase('exercise');
      } else setPhase('summary');
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(errorMessage(e instanceof ApiError ? e.code : undefined, locale));
    } finally {
      setSaving(false);
    }
  };

  if (q.isError) return <div className="p-4"><ErrorState error={q.error} /></div>;
  if (!q.data) return <Spinner className="min-h-screen" />;
  const item = items[idx];
  const progress = phase === 'summary' || phase === 'done' ? 1 : idx / items.length;

  return (
    <div className="min-h-screen bg-white pb-[env(safe-area-inset-bottom)]">
      {/* top bar */}
      <div className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <button type="button" onClick={() => (phase === 'done' || confirm(t('Training onderbreken? Je voortgang is opgeslagen.', 'Pause workout? Your progress is saved.'))) && nav('/p')} className="-ml-1 rounded-lg p-2 text-ink-600" aria-label={t('Training sluiten', 'Close workout')}>
            <X className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t('Voortgang training', 'Workout progress')}>
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          {phase === 'exercise' || phase === 'rate' ? <span className="text-[15px] font-medium tabular-nums text-ink-600">{idx + 1}/{items.length}</span> : null}
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 py-5">
        {error && <Notice tone="bad" className="mb-4">{error}</Notice>}

        {phase === 'intro' && (
          <div className="space-y-5">
            <h1 className="text-[26px] font-semibold leading-tight">{q.data.title}</h1>
            <p className="text-[16px] text-ink-600">{t(`${items.length} oefeningen. Neem de tijd en luister naar je lichaam.`, `${items.length} exercises. Take your time and listen to your body.`)}</p>
            {unplanned && <Notice tone="info">{t('Vandaag staat er geen training gepland. Wil je toch oefenen, dan doe je alle oefeningen van dit programma.', 'No workout is planned today. If you want to exercise anyway, you do all exercises of this programme.')}</Notice>}
            {q.data.patientInstructions && <div className="rounded-2xl bg-accent-soft p-4 text-[15.5px] leading-relaxed text-ink-800">{q.data.patientInstructions}</div>}
            <Notice tone="info" icon={<Info className="h-4 w-4" />}>
              {t('Stop een oefening als je scherpe of toenemende pijn voelt en neem contact op met je fysiotherapeut. Deze app vervangt geen medisch advies.', 'Stop an exercise if you feel sharp or increasing pain and contact your physiotherapist. This app does not replace medical advice.')}
            </Notice>
            <Button size="xl" className="w-full" onClick={start}>{q.data.openSession ? t('Verder met training', 'Continue workout') : t('Beginnen', 'Begin')}</Button>
          </div>
        )}

        {phase === 'exercise' && item && <ExerciseStep key={item.id} item={item} next={items[idx + 1]} onDone={() => setPhase('rate')} onSkip={() => saveLog(item, { completed: false, setsDone: 0, repsDone: null, difficulty: null, pain: null, feedback: '' })} saving={saving} />}

        {phase === 'rate' && item && <RateStep key={`r-${item.id}`} item={item} saving={saving} onSave={(r) => saveLog(item, r)} onBack={() => setPhase('exercise')} />}

        {phase === 'summary' && (
          <SummaryStep
            completed={Object.values(done).filter((d) => d.completed).length}
            total={items.length}
            saving={saving}
            onFinish={async (s) => {
              setSaving(true);
              setError(null);
              try {
                const how = await postOrQueue(uid, `/patient/sessions/${sessionId}/complete`, { ...s, feedback: s.feedback.trim() || null, completedAt: new Date().toISOString() });
                if (how === 'queued') setSavedOffline(true);
                setPhase('done');
                qc.invalidateQueries({ queryKey: ['patient-home'] });
                qc.invalidateQueries({ queryKey: ['patient-history'] });
              } catch (e) {
                setError(errorMessage(e instanceof ApiError ? e.code : undefined, locale));
              } finally {
                setSaving(false);
              }
            }}
          />
        )}

        {phase === 'done' && (
          <div className="relative flex flex-col items-center py-10 text-center">
            <Confetti />
            <div className="mb-5 flex h-20 w-20 animate-scale-in items-center justify-center rounded-full bg-ok-soft text-ok">
              <PartyPopper className="h-10 w-10" />
            </div>
            <h1 className="text-[26px] font-semibold">{t('Training afgerond!', 'Workout complete!')}</h1>
            <p className="mt-2 max-w-xs text-[16px] text-ink-600">
              {savedOffline
                ? t('Goed bezig! Houd de app open: je training wordt automatisch verstuurd zodra je weer internet hebt.', 'Great work! Keep the app open: your workout is sent automatically once you are back online.')
                : t('Goed bezig. Je fysiotherapeut kan je voortgang en feedback nu bekijken.', 'Great work. Your physiotherapist can now see your progress and feedback.')}
            </p>
            <Button size="xl" className="mt-8 w-full max-w-xs" onClick={() => nav('/p')}>{t('Terug naar overzicht', 'Back to overview')}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseStep({ item, next, onDone, onSkip, saving }: { item: ProgramItem; next?: ProgramItem; onDone: () => void; onSkip: () => void; saving: boolean }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const ex = item.exercise;
  const video = mediaUrl(ex.videoMediaId);
  const sets = item.sets ?? 1;
  const [setsDone, setSetsDone] = useState(0);
  const [rest, setRest] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(1);
  const [open, setOpen] = useState<string>('movement');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const startRest = () => {
    if (!item.restS) return;
    if (timer.current) clearInterval(timer.current);
    setRest(item.restS);
    setRestTotal(item.restS);
    timer.current = setInterval(() => setRest((r) => {
      if (r === null || r <= 1) {
        if (timer.current) clearInterval(timer.current);
        if (navigator.vibrate) navigator.vibrate(200);
        return null;
      }
      return r - 1;
    }), 1000);
  };
  const sections = [
    ['start', t('Startpositie', 'Starting position'), nl ? ex.startingPositionNl : ex.startingPositionEn],
    ['movement', t('Uitvoering', 'How to do it'), nl ? ex.movementNl : ex.movementEn],
    ['tips', t('Let op', 'Remember'), nl ? ex.instructionsNl : ex.instructionsEn],
  ].filter(([, , v]) => v) as [string, string, string][];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="-mx-4 overflow-hidden bg-ink-950 sm:mx-0 sm:rounded-2xl">
        {video ? (
          // Muted autoplay loop: the movement is visible immediately (also on iOS); sound is not needed.
          <video key={video} controls autoPlay muted loop playsInline preload="auto" className="aspect-video w-full" poster={mediaUrl(ex.thumbnailMediaId) ?? undefined}>
            <source src={`${video}#t=0.1`} type="video/mp4" />
          </video>
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-gradient-to-br from-ink-100 to-ink-200 px-6 text-center text-ink-500">
            <VideoOff className="h-8 w-8" />
            <span className="text-[14px]">{t('Voor deze oefening is nog geen video beschikbaar. Volg de beschrijving hieronder.', 'No video is available for this exercise yet. Follow the description below.')}</span>
          </div>
        )}
      </div>

      <div>
        <h1 className="text-[24px] font-semibold leading-tight">{nl ? ex.nameNl : ex.nameEn}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {item.sets && <Pill label={t('Sets', 'Sets')} value={String(item.sets)} />}
          {item.reps && <Pill label={t('Herhalingen', 'Repetitions')} value={String(item.reps)} />}
          {item.holdS && <Pill label={t('Vasthouden', 'Hold')} value={`${item.holdS} s`} />}
          {item.restS ? <Pill label={t('Rust', 'Rest')} value={`${item.restS} s`} /> : null}
          {item.tempo && <Pill label={t('Tempo', 'Tempo')} value={item.tempo} />}
          {item.load && <Pill label={t('Belasting', 'Load')} value={item.load} />}
        </div>
      </div>

      {item.notes && (
        <div className="rounded-2xl border border-accent/15 bg-accent-soft p-4 text-[16px] leading-relaxed text-ink-800">
          <div className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-accent"><MessageCircle className="h-4 w-4" />{t('Notitie van je fysiotherapeut', 'Note from your physiotherapist')}</div>
          {item.notes}
        </div>
      )}

      <div className="divide-y divide-line rounded-2xl border border-line">
        {sections.map(([key, title, text]) => (
          <div key={key}>
            <button type="button" className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[16px] font-semibold" aria-expanded={open === key} onClick={() => setOpen(open === key ? '' : key)}>
              {title}
              <ChevronDown className={cn('h-5 w-5 text-ink-400 transition-transform', open === key && 'rotate-180')} />
            </button>
            {open === key && <p className="animate-fade-in px-4 pb-4 text-[16px] leading-relaxed text-ink-700">{text}</p>}
          </div>
        ))}
      </div>

      {item.alternative && (
        <p className="flex items-start gap-2 text-[14.5px] text-ink-600"><Repeat className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />{t('Lukt deze oefening niet? Alternatief:', 'Can’t do this exercise? Alternative:')} <strong className="font-semibold">{nl ? item.alternative.nameNl : item.alternative.nameEn}</strong></p>
      )}

      {/* set tracker */}
      {sets > 1 && (
        <div className="rounded-2xl border border-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[16px] font-semibold">{t('Sets', 'Sets')}</span>

          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: sets }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={i < setsDone}
                aria-label={t(`Set ${i + 1} gedaan`, `Set ${i + 1} done`)}
                onClick={() => {
                  const next = i < setsDone ? i : i + 1;
                  setSetsDone(next);
                  if (next > setsDone && next < sets) startRest();
                }}
                className={cn('flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-lg font-semibold transition-all', i < setsDone ? 'border-accent bg-accent text-white' : 'border-line text-ink-600')}
              >
                {i < setsDone ? <Check className="h-6 w-6" /> : i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {next && (
        <div className="flex items-center gap-3 rounded-2xl bg-ink-50 p-3">
          <ExerciseThumb thumbnailId={next.exercise.thumbnailMediaId} videoId={next.exercise.videoMediaId} region={next.exercise.bodyRegion} className="h-12 w-12 shrink-0" rounded="rounded-xl" />
          <div className="min-w-0">
            <div className="text-[13px] font-medium uppercase tracking-wide text-ink-500">{t('Hierna', 'Up next')}</div>
            <div className="truncate font-semibold">{nl ? next.exercise.nameNl : next.exercise.nameEn}</div>
          </div>
        </div>
      )}

      {rest !== null && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-950/40 backdrop-blur-sm animate-fade-in sm:items-center" role="dialog" aria-modal="true" aria-label={t('Rustpauze', 'Rest break')}>
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-center shadow-pop sm:rounded-3xl">
            <div className="text-[13px] font-semibold uppercase tracking-widest text-accent">{t('Even rusten', 'Take a rest')}</div>
            <div className="my-5 flex justify-center">
              <ProgressRing value={rest / restTotal} size={168} stroke={10} label={t(`Nog ${rest} seconden rust`, `${rest} seconds of rest left`)}>
                <span className="text-[44px] font-semibold tabular-nums leading-none" aria-live="polite">{rest}</span>
                <span className="mt-1 text-[13px] text-ink-500">{t('seconden', 'seconds')}</span>
              </ProgressRing>
            </div>
            <p className="text-[15px] text-ink-600">{t(`Volgende: set ${Math.min(setsDone + 1, sets)} van ${sets}`, `Next: set ${Math.min(setsDone + 1, sets)} of ${sets}`)}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="lg" onClick={() => { setRest((r) => (r ?? 0) + 15); setRestTotal((x) => x + 15); }}>+15 s</Button>
              <Button size="lg" onClick={() => { if (timer.current) clearInterval(timer.current); setRest(null); }}>{t('Verder', 'Continue')}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur">
        <Button size="xl" className="w-full" icon={<CheckCircle2 className="h-5 w-5" />} onClick={onDone}>{t('Oefening gedaan', 'Exercise done')}</Button>
        <Button size="lg" variant="ghost" className="w-full" icon={<SkipForward className="h-4 w-4" />} onClick={onSkip} loading={saving}>{t('Overslaan', 'Skip')}</Button>
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 px-3.5 py-2">
      <div className="text-[12.5px] text-ink-500">{label}</div>
      <div className="text-[18px] font-semibold tabular-nums text-ink-950">{value}</div>
    </div>
  );
}

function RateStep({ item, saving, onSave, onBack }: { item: ProgramItem; saving: boolean; onSave: (r: Rating) => void; onBack: () => void }) {
  const { t, locale } = useI18n();
  const [r, setR] = useState<Rating>({ completed: true, setsDone: item.sets, repsDone: item.reps, difficulty: null, pain: null, feedback: '' });
  const [showFeedback, setShowFeedback] = useState(false);
  return (
    <div className="animate-slide-up space-y-7">
      <div>
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-[15px] font-medium text-ink-600"><ArrowLeft className="h-4 w-4" />{t('Terug', 'Back')}</button>
        <h1 className="text-[24px] font-semibold leading-tight">{t('Hoe ging het?', 'How did it go?')}</h1>
        <p className="mt-1 text-ink-500">{locale === 'nl' ? item.exercise.nameNl : item.exercise.nameEn} · {t('alles is optioneel', 'everything is optional')}</p>
      </div>
      {(item.sets || item.reps) && (
        <div className="flex flex-wrap gap-6">
          {item.sets ? <div><div className="mb-2 text-[15px] font-semibold">{t('Sets gedaan', 'Sets done')}</div><NumberStepper label={t('Sets gedaan', 'Sets done')} value={r.setsDone} onChange={(v) => setR({ ...r, setsDone: v })} min={0} max={50} /></div> : null}
          {item.reps ? <div><div className="mb-2 text-[15px] font-semibold">{t('Herhalingen per set', 'Reps per set')}</div><NumberStepper label={t('Herhalingen', 'Repetitions')} value={r.repsDone} onChange={(v) => setR({ ...r, repsDone: v })} min={0} max={500} /></div> : null}
        </div>
      )}
      <ScaleInput label={t('Hoe zwaar was het?', 'How hard was it?')} lowLabel={t('0 = heel licht', '0 = very easy')} highLabel={t('10 = maximaal', '10 = maximal')} value={r.difficulty} onChange={(v) => setR({ ...r, difficulty: v })} />
      <ScaleInput tone="pain" label={t('Pijn of ongemak tijdens de oefening', 'Pain or discomfort during the exercise')} lowLabel={t('0 = geen', '0 = none')} highLabel={t('10 = ergst denkbaar', '10 = worst imaginable')} value={r.pain} onChange={(v) => setR({ ...r, pain: v })} />
      {(r.pain ?? 0) >= 7 && (
        <Notice tone="warn">{t('Bij veel pijn: stop met deze oefening en bespreek het met je fysiotherapeut. Je melding wordt aan je fysiotherapeut getoond.', 'If you have a lot of pain: stop this exercise and discuss it with your physiotherapist. Your report is shown to your physiotherapist.')}</Notice>
      )}
      {showFeedback ? (
        <Textarea label={t('Bericht voor je fysiotherapeut', 'Message for your physiotherapist')} value={r.feedback} onChange={(e) => setR({ ...r, feedback: e.target.value })} rows={3} maxLength={2000} className="text-[16px]" autoFocus />
      ) : (
        <button type="button" onClick={() => setShowFeedback(true)} className="inline-flex items-center gap-2 text-[16px] font-medium text-accent"><MessageCircle className="h-5 w-5" />{t('Opmerking toevoegen', 'Add a comment')}</button>
      )}
      <div className="sticky bottom-0 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur">
        <Button size="xl" className="w-full" loading={saving} onClick={() => onSave(r)}>{t('Opslaan en verder', 'Save and continue')}</Button>
      </div>
    </div>
  );
}

function SummaryStep({ completed, total, saving, onFinish }: { completed: number; total: number; saving: boolean; onFinish: (s: { difficulty: number | null; pain: number | null; feedback: string }) => void }) {
  const { t } = useI18n();
  const [s, setS] = useState({ difficulty: null as number | null, pain: null as number | null, feedback: '' });
  return (
    <div className="animate-slide-up space-y-7">
      <div>
        <h1 className="text-[24px] font-semibold leading-tight">{t('Bijna klaar', 'Almost done')}</h1>
        <p className="mt-1 text-[16px] text-ink-600">{t(`Je hebt ${completed} van de ${total} oefeningen gedaan.`, `You completed ${completed} of ${total} exercises.`)}</p>
      </div>
      <ScaleInput label={t('Hoe zwaar was de hele training?', 'How hard was the whole workout?')} lowLabel={t('0 = heel licht', '0 = very easy')} highLabel={t('10 = maximaal', '10 = maximal')} value={s.difficulty} onChange={(v) => setS({ ...s, difficulty: v })} />
      <ScaleInput tone="pain" label={t('Pijn of ongemak na de training', 'Pain or discomfort after the workout')} lowLabel={t('0 = geen', '0 = none')} highLabel={t('10 = ergst denkbaar', '10 = worst imaginable')} value={s.pain} onChange={(v) => setS({ ...s, pain: v })} />
      <Textarea label={t('Bericht voor je fysiotherapeut (optioneel)', 'Message for your physiotherapist (optional)')} rows={3} className="text-[16px]" value={s.feedback} onChange={(e) => setS({ ...s, feedback: e.target.value })} maxLength={2000} />
      <div className="sticky bottom-0 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur">
        <Button size="xl" className="w-full" loading={saving} onClick={() => onFinish(s)}>{t('Training afronden', 'Finish workout')}</Button>
      </div>
    </div>
  );
}

/** Lightweight CSS confetti in brand colours (disabled automatically with prefers-reduced-motion). */
function Confetti() {
  const colors = ['#413d28', '#5b432b', '#64614d', '#bbb9a1', '#dbd3c0', '#9a3b2c'];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {Array.from({ length: 48 }, (_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 12) * 0.08;
        const dur = 2.2 + ((i * 13) % 10) / 10;
        const size = 6 + (i % 4) * 2;
        return (
          <span
            key={i}
            className="absolute top-[-20px] block rounded-[2px]"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 0.45,
              background: colors[i % colors.length],
              animation: `confetti-fall ${dur}s cubic-bezier(.2,.6,.4,1) ${delay}s forwards`,
            }}
          />
        );
      })}
    </div>
  );
}
