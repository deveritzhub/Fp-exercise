import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CalendarClock, CheckCircle2, ChevronRight, Play, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { fmtDate, fmtRelative, greeting, pct } from '@/lib/format';
import { useDocumentMeta } from '@/lib/meta';
import { ButtonLink, ErrorState, ProgressRing, Skeleton } from '@/components/ui';
import { ExerciseThumb } from '@/components/app/ExerciseThumb';
import type { Adherence, Notification, Program } from '@/lib/types';

export type PatientHomeData = {
  patient: { firstName: string; practiceName: string };
  programs: (Program & {
    therapistName: string;
    itemCount: number;
    today: { scheduled: number; done: boolean; items: { id: string; exercise: Program['items'][number]['exercise']; sets: number | null; reps: number | null; holdS: number | null }[] };
    nextSession: string | null;
    upcoming: boolean;
  })[];
  stats: { completedSessions: number; adherence7d: Adherence; weekly: (Adherence & { weekStart: string })[] };
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
                className="-mr-1 -mt-1 rounded-lg p-2 text-ink-500 hover:bg-white/60"
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
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold">{t('Vandaag een rustdag', 'Rest day today')}</h2>
          <p className="mt-1 text-ink-500">{t('Er staan vandaag geen oefeningen gepland.', 'No exercises are scheduled today.')}</p>
          {d.programs[0].nextSession && <p className="mt-3 flex items-center gap-2 text-[15px] text-ink-700"><CalendarClock className="h-5 w-5 text-accent" />{t('Volgende sessie', 'Next session')}: {fmtDate(d.programs[0].nextSession, locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
        </div>
      ) : (
        todo.map((p) => (
          <section key={p.id} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card" aria-labelledby={`today-${p.id}`}>
            <div className="p-5">
              <div className="text-[13px] font-medium uppercase tracking-wide text-accent">{t('Vandaag', 'Today')}</div>
              <h2 id={`today-${p.id}`} className="mt-1 text-xl font-semibold">{p.title}</h2>
              <p className="mt-1 text-[15px] text-ink-500">
                {p.today.scheduled} {t('oefeningen', 'exercises')} · ±{Math.max(5, Math.round(p.today.scheduled * 4))} {t('minuten', 'minutes')}
              </p>
              <div className="mt-4 flex -space-x-2">
                {p.today.items.slice(0, 5).map((i) => (
                  <ExerciseThumb key={i.id} thumbnailId={i.exercise.thumbnailMediaId} region={i.exercise.bodyRegion} className="h-12 w-12 border-2 border-white" rounded="rounded-xl" />
                ))}
              </div>
            </div>
            {p.today.done ? (
              <div className="flex items-center gap-3 border-t border-line bg-ok-soft px-5 py-4 text-ok">
                <CheckCircle2 className="h-6 w-6" />
                <span className="font-semibold">{t('Klaar voor vandaag — goed gedaan!', 'Done for today — well done!')}</span>
              </div>
            ) : (
              <div className="border-t border-line p-4">
                <ButtonLink to={`/p/sessie/${p.id}`} size="xl" className="w-full" icon={<Play className="h-5 w-5 fill-current" />}>
                  {t('Start training', 'Start workout')}
                </ButtonLink>
              </div>
            )}
          </section>
        ))
      )}

      <section className="flex items-center gap-5 rounded-2xl border border-line bg-white p-5 shadow-card">
        <ProgressRing value={d.stats.adherence7d.rate} size={84} label={t('Voortgang deze week', 'Progress this week')}>
          <span className="text-lg font-semibold tabular-nums">{pct(d.stats.adherence7d.rate)}</span>
        </ProgressRing>
        <div>
          <h2 className="font-semibold">{t('Afgelopen 7 dagen', 'Last 7 days')}</h2>
          <p className="text-[15px] text-ink-500">
            {t(`${d.stats.adherence7d.completed} van ${d.stats.adherence7d.planned} geplande trainingen gedaan`, `${d.stats.adherence7d.completed} of ${d.stats.adherence7d.planned} planned workouts done`)}
          </p>
          <Link to="/p/voortgang" className="mt-1 inline-flex items-center gap-1 text-[15px] font-medium text-accent">{t('Bekijk voortgang', 'View progress')}<ChevronRight className="h-4 w-4" /></Link>
        </div>
      </section>

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
