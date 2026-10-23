import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, ChevronRight, Play, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { fmtDate, fmtRelative, greeting, pct } from '@/lib/format';
import { useDocumentMeta } from '@/lib/meta';
import { ButtonLink, ErrorState, ProgressRing, Skeleton } from '@/components/ui';
import { RestDayCard, TodayProgramCard } from '@/components/patient/TodayCard';
import type { Adherence, Notification, Program } from '@/lib/types';
import type { DayState } from '@shared/adherence';
import { cn } from '@/lib/cn';
import { Check, Flame } from 'lucide-react';

export type PatientHomeData = {
  patient: { firstName: string; practiceName: string };
  programs: (Program & {
    therapistName: string;
    itemCount: number;
    today: { scheduled: number; done: boolean; items: { id: string; exercise: Program['items'][number]['exercise']; sets: number | null; reps: number | null; holdS: number | null }[] };
    nextSession: string | null;
    upcoming: boolean;
    openSession: { id: string; startedAt: string; logged: number } | null;
  })[];
  stats: { completedSessions: number; adherence7d: Adherence; weekly: (Adherence & { weekStart: string })[]; week: { date: string; weekday: number; state: DayState }[]; streak: number };
  recent: { id: string; completedAt: string; programTitle: string; difficulty: number | null; pain: number | null; exercisesDone: number }[];
  notifications: Notification[];
};

export function PatientHome() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Vandaag', 'Today'));
  const q = useQuery({ queryKey: ['patient-home'], queryFn: () => api.get<PatientHomeData>('/patient/home') });
  const qc = useQueryClient();
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <div className="space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>;
  const d = q.data;
  const todo = d.programs.filter((p) => p.today.scheduled > 0);
  // A workout started on a day without planned exercises (all exercises) can be resumed as well.
  const resumeOther = d.programs.filter((p) => p.openSession && p.today.scheduled === 0);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[15px] text-ink-500">{new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
        <h1 className="mt-0.5 text-[28px] font-semibold leading-tight">{greeting(locale)}, {d.patient.firstName}</h1>
      </div>

      {d.notifications.length > 0 && (
        <div className="space-y-2">
          {d.notifications.slice(0, 2).map((n) => (
            <div key={n.id} className="flex items-start gap-3 rounded-2xl border border-accent/15 bg-accent-soft px-4 py-3">
              <Bell className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink-900">{n.title}</div>
                <div className="text-[14.5px] text-ink-600">{n.body}</div>
              </div>
              <button
                type="button"
                aria-label={t('Melding sluiten', 'Dismiss notification')}
                className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 hover:bg-white/60"
                onClick={async () => {
                  await api.post(`/me/notifications/${n.id}/read`);
                  qc.invalidateQueries({ queryKey: ['patient-home'] });
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {d.programs.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-6 text-center shadow-card">
          <h2 className="text-lg font-semibold">{t('Nog geen programma', 'No programme yet')}</h2>
          <p className="mt-1 text-ink-500">{t('Je fysiotherapeut zet je oefenprogramma hier voor je klaar.', 'Your physiotherapist will set up your exercise programme here.')}</p>
        </div>
      ) : todo.length === 0 ? (
        <RestDayCard
          status={d.programs.every((p) => p.upcoming) ? 'not_started' : 'rest'}
          startDate={d.programs[0].startDate}
          nextSession={d.programs.map((p) => p.nextSession).filter(Boolean).sort()[0] ?? null}
        />
      ) : (
        todo.map((p) => (
          <TodayProgramCard
            key={p.id}
            id={p.id}
            title={p.title}
            items={p.today.items}
            done={p.today.done && !p.openSession}
            action={<StartOrResume programId={p.id} open={p.openSession} total={p.today.scheduled} />}
          />
        ))
      )}
      {resumeOther.map((p) => (
        <div key={p.id} className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <p className="mb-3 font-semibold">{p.title}</p>
          <StartOrResume programId={p.id} open={p.openSession} total={p.itemCount} />
        </div>
      ))}

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="week-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="week-title" className="font-semibold">{t('Deze week', 'This week')}</h2>
          {d.stats.streak > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3e9dc] px-3 py-1 text-[14px] font-semibold text-brand-wood">
              <Flame className="h-4 w-4" />
              {t(`${d.stats.streak} ${d.stats.streak === 1 ? 'training' : 'trainingen'} op rij`, `${d.stats.streak} in a row`)}
            </span>
          )}
        </div>
        <WeekStrip days={d.stats.week} />
        <div className="mt-4 flex items-center gap-4 border-t border-line pt-4">
          <ProgressRing value={d.stats.adherence7d.rate} size={56} stroke={6} label={t('Voortgang afgelopen 7 dagen', 'Progress last 7 days')}>
            <span className="text-[13px] font-semibold tabular-nums">{pct(d.stats.adherence7d.rate)}</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-ink-600">
              {t(`${d.stats.adherence7d.completed} van ${d.stats.adherence7d.planned} geplande trainingen gedaan (7 dagen)`, `${d.stats.adherence7d.completed} of ${d.stats.adherence7d.planned} planned workouts done (7 days)`)}
            </p>
            <Link to="/p/voortgang" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-accent">{t('Bekijk voortgang', 'View progress')}<ChevronRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <ReminderNudge />

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t('Mijn programma’s', 'My programmes')}</h2>
        <div className="space-y-2">
          {d.programs.map((p) => (
            <Link key={p.id} to={`/p/programma/${p.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-card">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{p.title}</span>
                <span className="block text-[14px] text-ink-500">{p.itemCount} {t('oefeningen', 'exercises')} · {p.therapistName}</span>
                {p.endDate && <span className="block text-[13px] text-ink-400">{t('Tot', 'Until')} {fmtDate(p.endDate, locale)}</span>}
              </span>
              <ChevronRight className="h-5 w-5 text-ink-300" />
            </Link>
          ))}
        </div>
      </section>

      {d.recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t('Eerdere trainingen', 'Previous workouts')}</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white shadow-card">
            {d.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.programTitle}</span>
                  <span className="text-[14px] text-ink-500">{r.exercisesDone} {t('oefeningen', 'exercises')}</span>
                </span>
                <span className="text-[13px] text-ink-400">{fmtRelative(r.completedAt, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** "Start training", or "Training hervatten" with how far the patient got. */
function StartOrResume({ programId, open, total }: { programId: string; open: { logged: number } | null; total: number }) {
  const { t } = useI18n();
  if (!open) {
    return (
      <ButtonLink to={`/p/sessie/${programId}`} size="xl" className="w-full" icon={<Play className="h-5 w-5 fill-current" />}>
        {t('Start training', 'Start workout')}
      </ButtonLink>
    );
  }
  const done = Math.min(open.logged, total);
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex justify-between text-[14px] text-ink-700">
          <span>{t('Je was al begonnen', 'You already started')}</span>
          <span className="tabular-nums">{t(`${done} van ${total} oefeningen`, `${done} of ${total} exercises`)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={t('Voortgang training', 'Workout progress')}>
          <div className="h-full rounded-full bg-accent" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>
      <ButtonLink to={`/p/sessie/${programId}`} size="xl" className="w-full" icon={<Play className="h-5 w-5 fill-current" />}>
        {t('Training hervatten', 'Resume workout')}
      </ButtonLink>
    </div>
  );
}

/** One-time hint to turn on reminders; hidden once on or dismissed. */
function ReminderNudge() {
  const { t } = useI18n();
  const KEY = 'fp.reminder-nudge-dismissed';
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  const q = useQuery({ queryKey: ['reminders'], queryFn: () => api.get<{ enabled: boolean }>('/reminders'), enabled: !hidden });
  if (hidden || !q.data || q.data.enabled) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Bell className="h-5 w-5" /></span>
      <Link to="/p/account" className="min-w-0 flex-1">
        <span className="block font-semibold">{t('Wil je een herinnering?', 'Want a reminder?')}</span>
        <span className="block text-[14px] text-ink-500">{t('Een seintje op dagen met oefeningen.', 'A nudge on exercise days.')}</span>
      </Link>
      <button type="button" className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:text-ink-700" aria-label={t('Niet meer tonen', 'Don’t show again')} onClick={() => {
        try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
        setHidden(true);
      }}><X className="h-5 w-5" /></button>
    </div>
  );
}

function WeekStrip({ days }: { days: { date: string; weekday: number; state: DayState }[] }) {
  const { t, locale } = useI18n();
  const names = locale === 'nl' ? ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const label: Record<DayState, string> = {
    done: t('gedaan', 'done'),
    'today-done': t('vandaag gedaan', 'done today'),
    today: t('vandaag gepland', 'planned today'),
    planned: t('gepland', 'planned'),
    missed: t('niet gedaan', 'missed'),
    rest: t('rustdag', 'rest day'),
  };
  return (
    <ol className="mt-4 grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const isToday = d.state === 'today' || d.state === 'today-done';
        const done = d.state === 'done' || d.state === 'today-done';
        return (
          <li key={d.date} className="flex flex-col items-center gap-1.5" aria-label={`${names[d.weekday - 1]}: ${label[d.state]}`}>
            <span className={cn('text-[12.5px] font-medium', isToday ? 'text-ink-950' : 'text-ink-500')}>{names[d.weekday - 1]}</span>
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold transition-all',
                done && 'bg-accent text-white',
                d.state === 'today' && 'border-2 border-accent text-accent',
                d.state === 'planned' && 'border-2 border-dashed border-ink-300 text-ink-500',
                d.state === 'missed' && 'bg-ink-100 text-ink-400',
                d.state === 'rest' && 'text-ink-300',
                isToday && 'ring-4 ring-accent/10',
              )}
            >
              {done ? <Check className="h-5 w-5" strokeWidth={3} /> : d.state === 'rest' ? '·' : new Date(d.date + 'T12:00:00').getDate()}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
