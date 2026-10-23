import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronRight, Info, MessageCircle, PartyPopper, Pause, Play, Repeat, SkipForward, Timer, VideoOff, X } from 'lucide-react';
import { api, ApiError, mediaUrl } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { toISODate } from '@shared/adherence';
import { itemsForDate } from '@shared/schedule';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { useCountdown } from '@/lib/useCountdown';
import { isNetworkError, postOrQueue } from '@/lib/outbox';
import { useSession } from '@/lib/session';
import { Button, Dialog, ErrorState, Notice, NumberStepper, ProgressRing, ScaleInput, Spinner, Textarea, useToast } from '@/components/ui';
import { ExerciseThumb } from '@/components/app/ExerciseThumb';
import { ProgramItemsList } from '@/components/patient/TodayCard';
import { PausedNotice, RedFlagButton } from '@/components/patient/Safety';
import { StrengthLogger } from '@/components/patient/Strength';
import type { Program, ProgramItem } from '@/lib/types';

type PatientProgram = Program & { therapistName: string; paused?: boolean; selfStarted?: boolean; openSession: { id: string; loggedItemIds: string[] } | null };
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
      <Link to="/p" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" />{t('Terug', 'Back')}</Link>
      <div>
        <h1 className="text-2xl font-semibold">{p.title}</h1>
        <p className="mt-1 text-ink-500">{t('Van', 'From')} {p.therapistName}</p>
      </div>
      <ProgramItemsList
        items={p.items}
        instructions={p.patientInstructions}
        renderLink={(i, content) => (
          <Link to={`/p/programma/${p.id}/oefening/${i.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-3 shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
            {content}
            <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" aria-hidden />
          </Link>
        )}
      />
      {p.status === 'active' && (p.paused ? <PausedNotice /> : (
        <Link to={`/p/sessie/${p.id}`} className="flex h-14 w-full items-center justify-center rounded-xl bg-accent text-base font-semibold text-white shadow-xs">{t('Start training', 'Start workout')}</Link>
      ))}
      {p.status === 'active' && !p.paused && <RedFlagButton programId={p.id} redFlags={p.redFlags ?? []} className="w-full justify-center" />}
      {p.status === 'active' && p.selfStarted && <StopProgramButton programId={p.id} />}
    </div>
  );
}

/** A programme the patient started themselves can be stopped (kept in the history, never deleted). */
function StopProgramButton({ programId }: { programId: string }) {
  const { t, locale } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="lg" className="w-full" onClick={() => setOpen(true)}>{t('Programma stoppen', 'Stop programme')}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('Programma stoppen?', 'Stop programme?')} description={t('Je trainingen en resultaten blijven bewaard.', 'Your workouts and results are kept.')} size="sm"
        footer={<div className="grid w-full grid-cols-2 gap-2"><Button size="lg" variant="secondary" data-autofocus onClick={() => setOpen(false)}>{t('Doorgaan', 'Continue')}</Button><Button size="lg" onClick={async () => {
          try {
            await api.post(`/patient/programs/${programId}/stop`);
            qc.invalidateQueries({ queryKey: ['patient-home'] });
            nav('/p');
          } catch (e) {
            toast(errorMessage(e instanceof ApiError ? e.code : undefined, locale), 'bad');
          }
        }}>{t('Stoppen', 'Stop')}</Button></div>}
      >{null}</Dialog>
    </>
  );
}

/** One exercise from the programme, to look at without starting (or registering) a workout. */
export function PatientExercisePage() {
  const { id = '', itemId = '' } = useParams();
  const { t, locale } = useI18n();
  const q = useQuery({ queryKey: ['patient-program', id], queryFn: () => api.get<PatientProgram>(`/patient/programs/${id}`) });
  const item = q.data?.items.find((i) => i.id === itemId);
  useDocumentMeta(item ? (locale === 'nl' ? item.exercise.nameNl : item.exercise.nameEn) : t('Oefening', 'Exercise'));
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner />;
  if (!item) return <ErrorState error={new ApiError(404, 'not_found')} />;
  return (
    <div className="space-y-5">
      <Link to={`/p/programma/${id}`} className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" />{q.data.title}</Link>
      <ExerciseInfo item={item} />
      <p className="text-[14px] text-ink-600">{t('Je bekijkt deze oefening alleen; er wordt geen training geregistreerd.', 'You are only viewing this exercise; no workout is recorded.')}</p>
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
  const [leaving, setLeaving] = useState(false);
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
  // Filled in so far, including what was saved before a reload or an earlier interruption.
  const filled = new Set([...(q.data.openSession?.id === sessionId ? q.data.openSession.loggedItemIds : []), ...Object.keys(done)]).size;
  const progress = phase === 'summary' || phase === 'done' ? 1 : idx / items.length;

  return (
    <div className="min-h-screen bg-white pb-[env(safe-area-inset-bottom)]">
      {/* top bar */}
      <div className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <button type="button" onClick={() => (phase === 'done' || phase === 'intro' ? nav('/p') : setLeaving(true))} className="-ml-1 flex h-11 w-11 items-center justify-center rounded-lg text-ink-600" aria-label={t('Training sluiten', 'Close workout')}>
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
            {q.data.paused ? <PausedNotice /> : <Button size="xl" className="w-full" onClick={start}>{q.data.openSession ? t('Verder met training', 'Continue workout') : t('Beginnen', 'Begin')}</Button>}
          </div>
        )}

        {(phase === 'exercise' || phase === 'rate') && !q.data.paused && (
          <div className="mb-4 flex justify-end">
            <RedFlagButton programId={q.data.id} redFlags={q.data.redFlags ?? []} sessionId={sessionId} onReported={() => nav('/p')} className="min-h-[44px] border-transparent px-2 text-[14px]" />
          </div>
        )}
        {phase === 'exercise' && item && <ExerciseStep key={item.id} item={item} next={items[idx + 1]} onDone={() => setPhase('rate')} onSkip={() => saveLog(item, { completed: false, setsDone: 0, repsDone: null, difficulty: null, pain: null, feedback: '' })} saving={saving} strength={q.data.module === 'kracht' ? { sessionId, userId: uid } : null} />}

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

        <Dialog
          open={leaving}
          onClose={() => setLeaving(false)}
          title={t('Training onderbreken?', 'Pause workout?')}
          description={t(
            `Je hebt ${filled} van ${items.length} oefeningen ingevuld. Dat is bewaard. Via “Training hervatten” op je overzicht ga je later verder waar je was.`,
            `You filled in ${filled} of ${items.length} exercises. That is saved. Use “Resume workout” on your overview to continue later where you left off.`,
          )}
          size="sm"
          footer={
            <div className="grid w-full grid-cols-2 gap-2">
              <Button size="lg" variant="secondary" onClick={() => nav('/p')}>{t('Onderbreken', 'Pause')}</Button>
              <Button size="lg" data-autofocus onClick={() => setLeaving(false)}>{t('Doorgaan', 'Continue')}</Button>
            </div>
          }
        >
          {savedOffline && <Notice tone="warn">{t('Je hebt geen internet. Houd de app open tot je training is verstuurd.', 'You are offline. Keep the app open until your workout has been sent.')}</Notice>}
          {phase === 'exercise' && <p className="text-[14.5px] text-ink-700">{t('De oefening waar je nu mee bezig bent is nog niet ingevuld en wordt niet meegeteld.', 'The exercise you are doing now has not been filled in yet and is not counted.')}</p>}
        </Dialog>

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

/** Video, dose and instructions of one exercise: used in the workout and in the programme overview. */
export function ExerciseInfo({ item }: { item: ProgramItem }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const ex = item.exercise;
  const video = mediaUrl(ex.videoMediaId);
  const image = mediaUrl(ex.thumbnailMediaId);
  const [open, setOpen] = useState<string>('movement');
  const sections = [
    ['start', t('Startpositie', 'Starting position'), nl ? ex.startingPositionNl : ex.startingPositionEn],
    ['movement', t('Uitvoering', 'How to do it'), nl ? ex.movementNl : ex.movementEn],
    ['tips', t('Let op', 'Remember'), nl ? ex.instructionsNl : ex.instructionsEn],
  ].filter(([, , v]) => v) as [string, string, string][];
  return (
    <>
      {video ? (
        <div className="-mx-4 overflow-hidden bg-ink-950 sm:mx-0 sm:rounded-2xl">
          {/* Muted autoplay loop: the movement is visible immediately (also on iOS); sound is not needed. */}
          <video key={video} controls autoPlay muted loop playsInline preload="auto" className="aspect-video w-full" poster={image ?? undefined}>
            <source src={`${video}#t=0.1`} type="video/mp4" />
          </video>
        </div>
      ) : image ? (
        <img src={image} alt="" className="-mx-4 aspect-video w-[calc(100%+2rem)] max-w-none object-cover sm:mx-0 sm:w-full sm:rounded-2xl" />
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-ink-300 px-4 py-3 text-[14.5px] text-ink-700">
          <VideoOff className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
          {t('Voor deze oefening is nog geen video. Volg de beschrijving hieronder.', 'There is no video for this exercise yet. Follow the description below.')}
        </div>
      )}

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
        {item.frequency && <p className="mt-2 text-[15px] text-ink-700">{item.frequency}</p>}
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
            <button type="button" className="flex min-h-[48px] w-full items-center justify-between px-4 py-3 text-left text-[16px] font-semibold" aria-expanded={open === key} onClick={() => setOpen(open === key ? '' : key)}>
              {title}
              <ChevronDown className={cn('h-5 w-5 text-ink-400 transition-transform', open === key && 'rotate-180')} />
            </button>
            {open === key && <p className="animate-fade-in px-4 pb-4 text-[16px] leading-relaxed text-ink-700">{text}</p>}
          </div>
        ))}
      </div>

      {item.alternative && (
        <p className="flex items-start gap-2 text-[14.5px] text-ink-700"><Repeat className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />{t('Lukt deze oefening niet? Doe dan:', 'Can’t do this exercise? Do this instead:')} <strong className="font-semibold">{nl ? item.alternative.nameNl : item.alternative.nameEn}</strong></p>
      )}
    </>
  );
}

const buzz = () => {
  try {
    navigator.vibrate?.(200);
  } catch {
    /* not supported */
  }
};

function ExerciseStep({ item, next, onDone, onSkip, saving, strength }: { item: ProgramItem; next?: ProgramItem; onDone: () => void; onSkip: () => void; saving: boolean; strength: { sessionId: string | null; userId: string } | null }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const sets = item.sets ?? 1;
  const [setsDone, setSetsDone] = useState(0);
  const [holdEnded, setHoldEnded] = useState(false);
  // Timers only inform: ending a timer never ticks off a set or the exercise.
  const hold = useCountdown(() => { buzz(); setHoldEnded(true); });
  const rest = useCountdown(buzz);
  const [restOpen, setRestOpen] = useState(false);
  const tick = (i: number) => {
    const n = i < setsDone ? i : i + 1;
    setSetsDone(n);
    hold.stop();
    setHoldEnded(false);
    if (n > setsDone && n < sets && item.restS) {
      rest.start(item.restS);
      setRestOpen(true);
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <ExerciseInfo item={item} />

      {item.holdS ? (
        <div className="rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[16px] font-semibold">{t('Vasthouden', 'Hold')}</span>
            <span className="text-[28px] font-semibold tabular-nums" aria-live="polite" aria-atomic="true">
              {hold.left ?? item.holdS}<span className="text-[15px] font-normal text-ink-600"> s</span>
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {hold.left === null || hold.left === 0 ? (
              <Button size="lg" className="col-span-2" icon={<Timer className="h-5 w-5" />} onClick={() => { setHoldEnded(false); hold.start(item.holdS!); }}>
                {holdEnded ? t('Opnieuw starten', 'Start again') : t(`Start ${item.holdS} seconden`, `Start ${item.holdS} seconds`)}
              </Button>
            ) : (
              <>
                {hold.running
                  ? <Button size="lg" variant="secondary" icon={<Pause className="h-5 w-5" />} onClick={hold.pause}>{t('Pauzeren', 'Pause')}</Button>
                  : <Button size="lg" variant="secondary" icon={<Play className="h-5 w-5" />} onClick={hold.resume}>{t('Hervatten', 'Resume')}</Button>}
                <Button size="lg" variant="ghost" onClick={() => { hold.stop(); setHoldEnded(false); }}>{t('Stoppen', 'Stop')}</Button>
              </>
            )}
          </div>
          {holdEnded && <p className="mt-2 text-[14.5px] text-ink-700" role="status">{sets > 1 ? t('Tijd! Tik de set af als je hem hebt gedaan.', 'Time! Tick off the set if you did it.') : t('Tijd! Tik op “Oefening gedaan” als je klaar bent.', 'Time! Tap “Exercise done” when you are finished.')}</p>}
        </div>
      ) : null}

      {/* Strength module: weight and reps per set (W04); otherwise the simple set tracker. */}
      {strength && <StrengthLogger item={item} sessionId={strength.sessionId} userId={strength.userId} onSetSaved={(n) => { setSetsDone(n); if (n < sets && item.restS) { rest.start(item.restS); setRestOpen(true); } }} />}
      {!strength && sets > 1 && (
        <div className="rounded-2xl border border-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[16px] font-semibold">{t('Sets', 'Sets')}</span>
            <span className="text-[15px] tabular-nums text-ink-700" aria-live="polite">{t(`${setsDone} van ${sets} gedaan`, `${setsDone} of ${sets} done`)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: sets }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={i < setsDone}
                aria-label={t(`Set ${i + 1} gedaan`, `Set ${i + 1} done`)}
                onClick={() => tick(i)}
                className={cn('flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-lg font-semibold transition-all', i < setsDone ? 'border-accent bg-accent text-white' : 'border-line text-ink-700')}
              >
                {i < setsDone ? <Check className="h-6 w-6" /> : i + 1}
              </button>
            ))}
          </div>
          {item.restS && !restOpen && setsDone > 0 && setsDone < sets ? (
            <Button size="sm" variant="ghost" className="mt-2" icon={<Timer className="h-4 w-4" />} onClick={() => { rest.start(item.restS!); setRestOpen(true); }}>{t(`Rust ${item.restS} s`, `Rest ${item.restS} s`)}</Button>
          ) : null}
        </div>
      )}

      {next && (
        <div className="flex items-center gap-3 rounded-2xl bg-ink-50 p-3">
          <ExerciseThumb thumbnailId={next.exercise.thumbnailMediaId} videoId={next.exercise.videoMediaId} region={next.exercise.bodyRegion} className="h-12 w-12 shrink-0" rounded="rounded-xl" />
          <div className="min-w-0">
            <div className="text-[13px] font-medium uppercase tracking-wide text-ink-600">{t('Hierna', 'Up next')}</div>
            <div className="truncate font-semibold">{nl ? next.exercise.nameNl : next.exercise.nameEn}</div>
          </div>
        </div>
      )}

      {restOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-950/40 backdrop-blur-sm animate-fade-in sm:items-center" role="dialog" aria-modal="true" aria-label={t('Rustpauze', 'Rest break')} onKeyDown={(e) => e.key === 'Escape' && (rest.stop(), setRestOpen(false))}>
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-center shadow-pop sm:rounded-3xl">
            <div className="text-[13px] font-semibold uppercase tracking-widest text-accent">{rest.left === 0 ? t('Rust voorbij', 'Rest over') : t('Even rusten', 'Take a rest')}</div>
            <div className="my-5 flex justify-center">
              <ProgressRing value={(rest.left ?? 0) / Math.max(1, rest.total)} size={168} stroke={10} label={t(`Nog ${rest.left ?? 0} seconden rust`, `${rest.left ?? 0} seconds of rest left`)}>
                <span className="text-[44px] font-semibold tabular-nums leading-none">{rest.left ?? 0}</span>
                <span className="mt-1 text-[13px] text-ink-600">{rest.paused ? t('gepauzeerd', 'paused') : t('seconden', 'seconds')}</span>
              </ProgressRing>
            </div>
            <p className="text-[15px] text-ink-700">{t(`Volgende: set ${Math.min(setsDone + 1, sets)} van ${sets}`, `Next: set ${Math.min(setsDone + 1, sets)} of ${sets}`)}</p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {rest.running
                ? <Button variant="secondary" size="lg" onClick={rest.pause} icon={<Pause className="h-4 w-4" />}>{t('Pauze', 'Pause')}</Button>
                : <Button variant="secondary" size="lg" onClick={rest.resume} disabled={rest.left === 0} icon={<Play className="h-4 w-4" />}>{t('Verder', 'Resume')}</Button>}
              <Button variant="secondary" size="lg" onClick={() => rest.add(15)}>+15 s</Button>
              <Button size="lg" autoFocus onClick={() => { rest.stop(); setRestOpen(false); }}>{t('Klaar', 'Done')}</Button>
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
  const colors = ['#29483c', '#1d362d', '#5b8a74', '#a9c4b2', '#d8ccb6', '#e6eee8'];
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
