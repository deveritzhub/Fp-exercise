import { Link, Navigate } from 'react-router-dom';
import { MOBILITY_MEASURE_XP, mobilityDue } from '@shared/mobilityTests';
import { progressionSignal } from '@shared/progression';
import { cn } from '@/lib/cn';
import { localToday } from '@/components/MobilityTests';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, ChevronRight, Dumbbell, Lock, Play, ShieldCheck, Ruler } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { fmtDate, fmtRelative } from '@/lib/format';
import { useDocumentMeta } from '@/lib/meta';
import { ErrorState, Skeleton } from '@/components/ui';
import { TodayProgramCard } from '@/components/patient/TodayCard';
import { PausedNotice } from '@/components/patient/Safety';
import { StartTemplates, useModes } from '@/components/patient/Modules';
import { StrengthProgress } from '@/components/patient/Strength';
import { RehabRoute } from '@/components/hero/RehabRoute';
import type { HeroState } from '@/lib/types';
import { MODULE_ICON, moduleLabel, moduleOf, StartOrResume, type PatientHomeData, type PatientModule } from '@/pages/patient/PatientHome';

type History = { sessions: { id: string; completedAt: string; programTitle: string; module?: string | null; exercisesDone: number; exercisesTotal: number; difficulty?: number | null; pain?: number | null }[] };

const INTRO: Record<PatientModule, [string, string]> = {
  revalidatie: ['Het programma dat je fysiotherapeut voor je klaarzet, met je fases en doelen.', 'The programme your physiotherapist sets up for you, with your phases and goals.'],
  kracht: ['Krachttraining in de sportschool, thuis of in de praktijk. Log je sets en zie je 1RM groeien.', 'Strength training in the gym, at home or in the practice. Log your sets and watch your 1RM grow.'],
  mobiliteit: ['Rekken en soepel blijven. Start zelf een programma; een paar minuten per dag is genoeg.', 'Stretching and staying supple. Start a programme yourself; a few minutes a day is enough.'],
};

/**
 * One part of the patient app (rehabilitation, strength or mobility): today's workout for this part,
 * the programmes, starting one yourself, and progress. Vandaag shows all parts together.
 */
export function ModulePage({ module }: { module: PatientModule }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  useDocumentMeta(moduleLabel(module, nl));
  const home = useQuery({ queryKey: ['patient-home'], queryFn: () => api.get<PatientHomeData>('/patient/home'), refetchOnMount: 'always' });
  const history = useQuery({ queryKey: ['patient-history'], queryFn: () => api.get<History>('/patient/history') });
  const modes = useModes();
  // The phase route of the rehabilitation programme (same data as the hero's main quest).
  const hero = useQuery({ queryKey: ['patient-hero'], queryFn: () => api.get<HeroState>('/patient/hero'), enabled: module === 'revalidatie' });
  // Mobility self-tests: when to measure again (same query as the measuring page).
  const mob = useQuery({ queryKey: ['mobility-tests', '/patient'], queryFn: () => api.get<{ results: { day: string }[] }>('/patient/mobility-tests'), enabled: module === 'mobiliteit' });
  const due = mob.data ? mobilityDue(mob.data.results.map((r) => r.day), localToday()) : null;
  const mobilityLine = !due || due.last === null
    ? t('Vier tests met een meetlint: enkel, rug, schouders en achterkant been', 'Four tests with a tape measure: ankle, back, shoulders and back of the leg')
    : due.due
      ? t(`Tijd om opnieuw te meten · +${MOBILITY_MEASURE_XP} XP`, `Time to measure again · +${MOBILITY_MEASURE_XP} XP`)
      : t(`Laatst gemeten ${due.daysSince === 0 ? 'vandaag' : `${due.daysSince} ${due.daysSince === 1 ? 'dag' : 'dagen'} geleden`}`, `Last measured ${due.daysSince === 0 ? 'today' : `${due.daysSince} ${due.daysSince === 1 ? 'day' : 'days'} ago`}`);
  if (home.isError) return <ErrorState error={home.error} onRetry={() => home.refetch()} />;
  if (!home.data || !modes.data) return <div className="space-y-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-40 rounded-2xl" /></div>;
  // Coach and personal accounts have no rehabilitation.
  if (!modes.data.modules.includes(module)) return <Navigate to="/p" replace />;
  const programs = home.data.programs.filter((p) => moduleOf(p) === module);
  const todo = programs.filter((p) => p.today.scheduled > 0);
  const resumeOther = programs.filter((p) => (p.openSession || p.paused) && p.today.scheduled === 0);
  const templates = modes.data.templates.filter((x) => x.module === module);
  const sessions = (history.data?.sessions ?? []).filter((s) => moduleOf(s) === module);
  const Icon = MODULE_ICON[module];
  // One programme: every row would repeat its title, so the date leads instead.
  const oneProgram = new Set(sessions.map((s) => s.programTitle)).size === 1;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-[28px] font-bold leading-tight"><Icon className="h-7 w-7 text-accent" aria-hidden />{moduleLabel(module, nl)}</h1>
        <p className="mt-1 text-[15px] text-ink-600">{t(...INTRO[module])}</p>
      </div>

      {module !== 'revalidatie' && modes.data.kind !== 'personal' && (
        // Sharing is changed in Instellingen; here only a short status.
        <Link to="/p/instellingen#delen" className="inline-flex min-h-[44px] items-center gap-2 text-[14.5px] text-ink-700">
          {modes.data.consents[module] ? <ShieldCheck className="h-4 w-4 text-ok" aria-hidden /> : <Lock className="h-4 w-4 text-ink-500" aria-hidden />}
          {modes.data.consents[module] ? t('Gedeeld met je fysiotherapeut', 'Shared with your physiotherapist') : t('Alleen voor jou', 'Just for you')}
          <span className="font-medium text-accent">{t('· wijzigen', '· change')}</span>
        </Link>
      )}

      {/* Today in this part */}
      {todo.map((p) => (
        <TodayProgramCard
          key={p.id}
          id={p.id}
          title={p.title}
          items={p.today.items}
          done={p.today.done && !p.openSession && !p.paused}
          action={p.paused ? <PausedNotice /> : <StartOrResume programId={p.id} open={p.openSession} total={p.today.scheduled} />}
        />
      ))}
      {resumeOther.map((p) => (
        <div key={p.id} className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <p className="mb-3 font-semibold">{p.title}</p>
          {p.paused ? <PausedNotice /> : <StartOrResume programId={p.id} open={p.openSession} total={p.itemCount} />}
        </div>
      ))}
      {programs.length > 0 && todo.length === 0 && resumeOther.length === 0 && (
        <p className="rounded-2xl border border-line bg-white p-4 text-[15px] text-ink-600 shadow-card">
          {(() => {
            const next = programs.map((p) => p.nextSession).filter(Boolean).sort()[0];
            return next ? t(`Vandaag niets gepland. Volgende training: ${fmtDate(next, locale, { weekday: 'long', day: 'numeric', month: 'long' })}.`, `Nothing planned today. Next workout: ${fmtDate(next, locale, { weekday: 'long', day: 'numeric', month: 'long' })}.`) : t('Vandaag niets gepland.', 'Nothing planned today.');
          })()}
        </p>
      )}

      {module === 'revalidatie' && hero.data?.quest && hero.data.quest.phases.length > 0 && (
        <RehabRoute phases={hero.data.quest.phases} currentNo={hero.data.quest.phaseNo} />
      )}

      {module === 'kracht' && (
        <Link to="/p/krachtlog" className="tap flex items-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#29483c_0%,#3d6150_100%)] p-4 text-white shadow-card">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><Dumbbell className="h-6 w-6" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t('Krachtlog, eigen schema’s en 1RM', 'Strength log, own routines and 1RM')}</span>
            <span className="block text-[14px] text-white/80">{t('Bewaar je eigen trainingen en log ze set voor set', 'Save your own workouts and log them set by set')}</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
        </Link>
      )}

      {module === 'mobiliteit' && (
        <Link to="/p/mobiliteit/meten" className="tap flex items-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#29483c_0%,#3d6150_100%)] p-4 text-white shadow-card">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><Ruler className="h-6 w-6" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t('Mobiliteit meten', 'Measure mobility')}</span>
            <span className="block text-[14px] text-white/80">{mobilityLine}</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
        </Link>
      )}

      {/* Own programmes (strength, mobility): a tip from the patient's own scores. Rehab stays with the therapist. */}
      {module !== 'revalidatie' && programs.filter((p) => p.selfStarted).map((p) => {
        const mine = sessions.filter((x) => x.programTitle === p.title).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
        const sig = progressionSignal(mine.map((x) => ({ difficulty: x.difficulty ?? null, pain: x.pain ?? null })));
        if (!sig) return null;
        return (
          <p key={p.id} role="status" className={cn('rounded-2xl border p-4 text-[15px] shadow-card', sig.kind === 'ready_heavier' ? 'border-accent/30 bg-accent-soft text-ink-900' : 'border-warn/30 bg-warn-soft/60 text-ink-900')}>
            <span className="block font-semibold">{sig.kind === 'ready_heavier' ? t('Dit gaat je makkelijk af', 'This is going easily') : t('Dit is nu erg zwaar', 'This is very heavy right now')}</span>
            {sig.kind === 'ready_heavier'
              ? t(`Je laatste ${sig.sessions} trainingen van "${p.title}" voelden licht. Tijd voor een stapje meer: één set extra, wat meer herhalingen of een zwaarder programma hieronder.`, `Your last ${sig.sessions} workouts of "${p.title}" felt light. Time for a step up: one extra set, a few more reps or a harder programme below.`)
              : t(`Je laatste ${sig.sessions} trainingen van "${p.title}" voelden erg zwaar. Doe minder herhalingen of een lichtere variant. Bouw rustig op; pijn hoort niet op te lopen.`, `Your last ${sig.sessions} workouts of "${p.title}" felt very heavy. Do fewer reps or a lighter variation. Build up gradually; pain should not increase.`)}
          </p>
        );
      })}

      {/* Programmes in this part */}
      <section aria-labelledby="mod-programs">
        <h2 id="mod-programs" className="mb-3 text-lg font-bold">{t('Mijn programma’s', 'My programmes')}</h2>
        {programs.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-4 text-[15px] text-ink-600 shadow-card">
            {module === 'revalidatie' ? t('Je fysiotherapeut zet je revalidatieprogramma hier voor je klaar.', 'Your physiotherapist will set up your rehabilitation programme here.') : t('Je hebt hier nog geen programma. Start er hieronder een.', 'No programme here yet. Start one below.')}
          </p>
        ) : (
          <div className="space-y-2">
            {programs.map((p) => (
              <Link key={p.id} to={`/p/programma/${p.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-card">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{p.title}</span>
                  <span className="block text-[14px] text-ink-500">{p.itemCount} {t('oefeningen', 'exercises')}{p.selfStarted ? t(' · zelf gestart', ' · started yourself') : ` · ${p.therapistName}`}</span>
                  {p.endDate && <span className="block text-[13px] text-ink-500">{t('Tot', 'Until')} {fmtDate(p.endDate, locale)}</span>}
                </span>
                <ChevronRight className="h-5 w-5 text-ink-400" aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Start one yourself (strength and mobility) */}
      {module !== 'revalidatie' && templates.length > 0 && (programs.length === 0 ? (
        <section aria-labelledby="mod-start">
          <h2 id="mod-start" className="mb-2 text-lg font-bold">{module === 'kracht' ? t('Start een krachtprogramma', 'Start a strength programme') : t('Start een mobiliteitsprogramma', 'Start a mobility programme')}</h2>
          <StartTemplates modes={modes.data} module={module} />
        </section>
      ) : (
        <details id="mod-start" className="group scroll-mt-20 rounded-2xl border border-line bg-white shadow-card">
          <summary className="tap flex min-h-[48px] cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold text-ink-900">
            <Play className="h-4 w-4 text-accent" aria-hidden />
            <span className="flex-1">{t(`Nog een programma starten (${templates.length})`, `Start another programme (${templates.length})`)}</span>
            <ChevronDown className="h-4 w-4 text-ink-500 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="px-3 pb-3"><StartTemplates modes={modes.data} module={module} /></div>
        </details>
      ))}

      {/* Progress in this part */}
      <section aria-labelledby="mod-progress" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="mod-progress" className="text-lg font-bold">{t('Voortgang', 'Progress')}</h2>
          <Link to="/p/voortgang" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-accent">{t('Alles', 'All')}<ChevronRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        {module === 'kracht' && <StrengthProgress />}
        {sessions.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-4 text-[15px] text-ink-600 shadow-card">{t('Nog geen afgeronde trainingen in dit onderdeel.', 'No completed workouts in this part yet.')}</p>
        ) : (
          <div className="rounded-2xl border border-line bg-white shadow-card">
            <p className="border-b border-line px-4 py-3 text-[15px] text-ink-700">{t(`${sessions.length} ${sessions.length === 1 ? 'training' : 'trainingen'} gedaan`, `${sessions.length} ${sessions.length === 1 ? 'workout' : 'workouts'} done`)}{oneProgram && <span className="block truncate text-[13.5px] text-ink-500">{sessions[0].programTitle}</span>}</p>
            <ul className="divide-y divide-line">
              {sessions.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium first-letter:uppercase">{oneProgram ? fmtDate(s.completedAt, locale, { weekday: 'long', day: 'numeric', month: 'long' }) : s.programTitle}</span>
                    <span className="text-[14px] text-ink-500">{s.exercisesDone}/{s.exercisesTotal} {t('oefeningen', 'exercises')}</span>
                  </span>
                  {!oneProgram && <span className="shrink-0 text-[13px] text-ink-500">{fmtRelative(s.completedAt, locale)}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
