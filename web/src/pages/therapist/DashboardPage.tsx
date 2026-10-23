import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, AlertCircle, ArrowRight, BookOpen, Layers, MessageSquareText, Plus, Star, UserPlus, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { fmtDate, fmtDateTime, fmtRelative, greeting, pct } from '@/lib/format';
import { useDocumentMeta, useLabels } from '@/lib/meta';
import { Avatar, Badge, Bars, ButtonLink, Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, Stat } from '@/components/ui';
import { ExerciseThumb } from '@/components/app/ExerciseThumb';
import { ProgramStatusBadge, useReasonLabel } from '@/components/app/StatusBadge';
import type { Exercise, Program } from '@/lib/types';

type Signal = { reason: string; date: string | null; value?: number; planned?: number; completed?: number };
type Dashboard = {
  daily: { day: string; sessions: number; list: { id: string; patientId: string; name: string; at: string; pain: number | null; program: string }[] }[];
  stats: { patients: number; activePrograms: number; adherence7d: number | null; adherence: { completed: number; planned: number; days: number }; sessions7d: number; attention: number };
  attention: { patientId: string; name: string; reasons: string[]; signals: Signal[] }[];
  alerts: { kind: 'red_flag' | 'deletion_request'; createdAt: string; patientId: string; name: string }[];
  activity: { id: string; patientId: string; patientName: string; programTitle: string; completedAt: string; pain: number | null; difficulty: number | null; hasFeedback: boolean }[];
  favorites: Exercise[];
};

export function DashboardPage() {
  const { t, locale } = useI18n();
  const { user, practice } = useSession();
  const L = useLabels();
  useDocumentMeta(t('Dashboard', 'Dashboard'));
  const q = useQuery({ queryKey: ['dashboard', practice?.practiceId], queryFn: () => api.get<Dashboard>('/dashboard') });
  const recent = useQuery({ queryKey: ['programs-recent', practice?.practiceId], queryFn: () => api.get<{ items: Program[] }>('/programs/recent') });
  const d = q.data;

  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
        title={`${greeting(locale)}, ${user?.fullName.split(' ')[0]}`}
        description={t('Overzicht van je patiënten en hun oefenprogramma’s.', 'Overview of your patients and their exercise programmes.')}
        actions={
          <>
            <ButtonLink to="/app/patienten?nieuw=1" variant="secondary" icon={<UserPlus className="h-4 w-4" />}>{t('Patiënt', 'Patient')}</ButtonLink>
            <ButtonLink to="/app/oefeningen/nieuw" variant="secondary" icon={<BookOpen className="h-4 w-4" />}>{t('Oefening', 'Exercise')}</ButtonLink>
            <ButtonLink to="/app/programmas/nieuw" icon={<Plus className="h-4 w-4" />}>{t('Nieuw programma', 'New programme')}</ButtonLink>
          </>
        }
      />

      {q.isError ? (
        <Card><ErrorState error={q.error} onRetry={() => q.refetch()} /></Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {d ? (
            <>
              <Stat label={t('Mijn patiënten', 'My patients')} value={d.stats.patients} icon={<Users className="h-4 w-4" />} hint={d.stats.activePrograms === 1 ? t('1 actief programma', '1 active programme') : t(`${d.stats.activePrograms} actieve programma’s`, `${d.stats.activePrograms} active programmes`)} />
              <Stat label={t('Therapietrouw 7 dagen', 'Adherence 7 days')} value={pct(d.stats.adherence7d)} icon={<Activity className="h-4 w-4" />} hint={t(`${d.stats.adherence.completed} van ${d.stats.adherence.planned} geplande trainingsdagen gedaan`, `${d.stats.adherence.completed} of ${d.stats.adherence.planned} planned training days done`)} />
              <Stat label={t('Sessies 7 dagen', 'Sessions 7 days')} value={d.stats.sessions7d} icon={<Layers className="h-4 w-4" />} hint={t('Afgeronde oefensessies', 'Completed exercise sessions')} />
              <Stat label={t('Vraagt aandacht', 'Needs attention')} value={d.stats.attention + d.alerts.length} tone="warn" icon={<AlertCircle className="h-4 w-4" />} hint={t('Werklijst hieronder', 'Work list below')} />
            </>
          ) : (
            Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[112px] rounded-xl" />)
          )}
        </div>
      )}

      <WorkList d={d} />

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">{d && <ActivityChart daily={d.daily} />}</div>

        <Card className="lg:col-span-2">
          <CardHeader title={t('Recente activiteit', 'Recent activity')} />
          {!d ? (
            <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : d.activity.length === 0 ? (
            <EmptyState title={t('Nog geen activiteit', 'No activity yet')} description={t('Afgeronde sessies van je patiënten verschijnen hier.', 'Completed sessions from your patients appear here.')} />
          ) : (
            <ul className="divide-y divide-line">
              {d.activity.map((a) => (
                <li key={a.id}>
                  <Link to={`/app/patienten/${a.patientId}?tab=sessies`} className="flex gap-3 px-5 py-3 hover:bg-ink-50/60">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok"><Activity className="h-3.5 w-3.5" /></span>
                    <span className="min-w-0 flex-1 text-[13.5px]">
                      <span className="font-medium">{a.patientName}</span>{' '}
                      <span className="text-ink-500">{t('rondde een sessie af', 'completed a session')}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-500">
                        <span className="truncate">{a.programTitle}</span>
                        {a.pain !== null && <Badge tone={a.pain >= 6 ? 'bad' : 'neutral'}>{t('Pijn', 'Pain')} {a.pain}/10</Badge>}
                        {a.hasFeedback && <MessageSquareText className="h-3.5 w-3.5 text-info" aria-label={t('Bevat feedback', 'Has feedback')} />}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] text-ink-400">{fmtRelative(a.completedAt, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('Recent gebruikte programma’s', 'Recently used programmes')} action={<Link to="/app/programmas" className="text-[13px] font-medium text-accent hover:underline">{t('Alles bekijken', 'View all')}</Link>} />
          {!recent.data ? (
            <div className="space-y-3 p-5">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>
          ) : recent.data.items.length === 0 ? (
            <EmptyState title={t('Nog geen programma’s', 'No programmes yet')} action={<ButtonLink to="/app/programmas/nieuw" size="sm">{t('Programma maken', 'Create programme')}</ButtonLink>} />
          ) : (
            <ul className="divide-y divide-line">
              {recent.data.items.map((p) => (
                <li key={p.id}>
                  <Link to={`/app/programmas/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.title}</span>
                      <span className="text-[12.5px] text-ink-500">
                        {p.isTemplate ? t('Sjabloon', 'Template') : p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : ''} · {p.itemCount} {t('oefeningen', 'exercises')}
                      </span>
                    </span>
                    {!p.isTemplate && <ProgramStatusBadge status={p.status} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title={t('Favoriete oefeningen', 'Favourite exercises')} action={ <Link to="/app/oefeningen?favorites=1" className="text-[13px] font-medium text-accent hover:underline">{t('Bibliotheek', 'Library')}</Link>} />
          {!d ? (
            <div className="space-y-3 p-5">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>
          ) : d.favorites.length === 0 ? (
            <EmptyState icon={<Star className="h-5 w-5" />} title={t('Nog geen favorieten', 'No favourites yet')} description={t('Markeer oefeningen met een ster om ze hier snel terug te vinden.', 'Star exercises to find them here quickly.')} />
          ) : (
            <ul className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
              {d.favorites.map((e) => (
                <li key={e.id} className="bg-white">
                  <Link to={`/app/oefeningen/${e.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50/60">
                    <ExerciseThumb thumbnailId={e.thumbnailMediaId} videoId={e.videoMediaId} region={e.bodyRegion} className="h-10 w-10 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium">{locale === 'nl' ? e.nameNl : e.nameEn}</span>
                      <span className="text-[12px] text-ink-500">{L.region(e.bodyRegion)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

/**
 * "Vraagt aandacht": one row per patient, every signal with its reason, date and the next step.
 * Safety items (red-flag reports, deletion requests) come first.
 */
function WorkList({ d }: { d?: Dashboard }) {
  const { t, locale } = useI18n();
  const reason = useReasonLabel();
  const date = (x: string | null) => (x ? fmtDate(x, locale, { day: 'numeric', month: 'long' }) : null);
  const explain = (s: Signal, patientId: string): { text: string; action: { label: string; to: string } } => {
    const p = `/app/patienten/${patientId}`;
    switch (s.reason) {
      case 'high_pain':
        return { text: t(`Pijnscore ${s.value}/10 gemeld${s.date ? ` op ${date(s.date)}` : ''}.`, `Pain score ${s.value}/10 reported${s.date ? ` on ${date(s.date)}` : ''}.`), action: { label: t('Bekijk sessie', 'View session'), to: `${p}?tab=sessies` } };
      case 'new_feedback':
        return { text: t(`${s.value} ${s.value === 1 ? 'sessie' : 'sessies'} met feedback te beoordelen${s.date ? `, laatste ${date(s.date)}` : ''}.`, `${s.value} session(s) with feedback to review${s.date ? `, latest ${date(s.date)}` : ''}.`), action: { label: t('Feedback beoordelen', 'Review feedback'), to: `${p}?tab=sessies` } };
      case 'no_registration':
        return { text: t(`Geen training geregistreerd: 0 van ${s.planned} geplande dagen (7 dagen)${s.date ? `; laatst actief ${date(s.date)}` : '; nog nooit getraind'}.`, `No workout registered: 0 of ${s.planned} planned days (7 days)${s.date ? `; last active ${date(s.date)}` : '; never trained'}.`), action: { label: t('Contact opnemen', 'Get in touch'), to: p } };
      case 'low_adherence':
        return { text: t(`${s.completed} van ${s.planned} geplande trainingsdagen gedaan (7 dagen).`, `${s.completed} of ${s.planned} planned training days done (7 days).`), action: { label: t('Bekijk voortgang', 'View progress'), to: `${p}?tab=overzicht` } };
      case 'program_ending':
        return { text: t(`Programma eindigt op ${date(s.date)}.`, `Programme ends on ${date(s.date)}.`), action: { label: t('Programma bekijken', 'View programme'), to: `${p}?tab=programmas` } };
      case 'not_activated':
        return { text: t(`Uitgenodigd op ${date(s.date)}, account nog niet geactiveerd. De patiënt kan nog niets registreren.`, `Invited on ${date(s.date)}, account not activated yet. The patient cannot register anything yet.`), action: { label: t('Uitnodiging bekijken', 'View invitation'), to: p } };
      case 'no_active_program':
        return { text: t('Geen actief programma.', 'No active programme.'), action: { label: t('Programma maken', 'Create programme'), to: `/app/programmas/nieuw?patient=${patientId}` } };
      default:
        return { text: reason(s.reason).text, action: { label: t('Openen', 'Open'), to: p } };
    }
  };
  return (
    <Card className="mt-6">
      <CardHeader title={t('Vraagt aandacht', 'Needs attention')} description={t('Werklijst op basis van meldingen, scores en activiteit — geen diagnose.', 'Work list based on reports, scores and activity — not a diagnosis.')} />
      {!d ? (
        <div className="space-y-3 p-5">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : d.attention.length === 0 && d.alerts.length === 0 ? (
        <EmptyState icon={<Activity className="h-5 w-5" />} title={t('Alles loopt volgens plan', 'Everything is on track')} description={t('Er zijn geen patiënten die nu extra aandacht vragen.', 'No patients currently need extra attention.')} />
      ) : (
        <ul className="divide-y divide-line">
          {d.alerts.map((a) => (
            <li key={a.kind + a.patientId + a.createdAt} className="flex flex-wrap items-center gap-3 bg-bad-soft/40 px-5 py-3">
              <Avatar name={a.name} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{a.name}</span>
                <span className="text-[13px] text-ink-700">
                  {a.kind === 'red_flag'
                    ? t(`Alarmsignaal gemeld op ${fmtDateTime(a.createdAt, locale)}. De oefeningen zijn gestopt tot je contact hebt gehad.`, `Red flag reported on ${fmtDateTime(a.createdAt, locale)}. Exercises are stopped until you have been in touch.`)
                    : t(`Verzoek tot verwijdering van gegevens op ${fmtDate(a.createdAt, locale)}.`, `Data deletion request on ${fmtDate(a.createdAt, locale)}.`)}
                </span>
              </span>
              <ButtonLink to={`/app/patienten/${a.patientId}?tab=modules`} size="sm">{a.kind === 'red_flag' ? t('Melding afhandelen', 'Handle report') : t('Verzoek bekijken', 'View request')}</ButtonLink>
            </li>
          ))}
          {d.attention.map((a) => (
            <li key={a.patientId} className="flex gap-3 px-5 py-3">
              <Avatar name={a.name} />
              <div className="min-w-0 flex-1">
                <Link to={`/app/patienten/${a.patientId}`} className="text-sm font-semibold hover:underline">{a.name}</Link>
                <ul className="mt-1 space-y-1.5">
                  {a.signals.map((s) => {
                    const x = reason(s.reason);
                    const e = explain(s, a.patientId);
                    return (
                      <li key={s.reason} className="flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
                        <Badge tone={x.tone}>{x.text}</Badge>
                        <span className="min-w-0 text-[13px] text-ink-700 sm:flex-1">{e.text}</span>
                        <Link to={e.action.to} className="inline-flex min-h-[44px] items-center gap-1 text-[13px] font-medium text-accent hover:underline sm:min-h-0">{e.action.label}<ArrowRight className="h-3.5 w-3.5" /></Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Completed workouts per day with dates, a scale and the sessions of a selected day. */
function ActivityChart({ daily }: { daily: Dashboard['daily'] }) {
  const { t, locale } = useI18n();
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map((x) => x.sessions));
  const day = sel === null ? null : daily[sel];
  const loc = locale === 'nl' ? 'nl-NL' : 'en-GB';
  return (
    <Card>
      <CardHeader
        title={t('Activiteit van je patiënten', 'Your patients’ activity')}
        description={t(`Afgeronde trainingen per dag, ${fmtDate(daily[0].day, locale, { day: 'numeric', month: 'short' })} – ${fmtDate(daily.at(-1)!.day, locale, { day: 'numeric', month: 'short' })}. Kies een dag voor details.`, `Completed workouts per day, ${fmtDate(daily[0].day, locale, { day: 'numeric', month: 'short' })} – ${fmtDate(daily.at(-1)!.day, locale, { day: 'numeric', month: 'short' })}. Pick a day for details.`)}
        action={<span className="text-[13px] tabular-nums text-ink-600">{daily.reduce((a, x) => a + x.sessions, 0)} {t('totaal', 'total')}</span>}
      />
      <div className="px-5 pb-4 pt-5">
        <Bars
          height={110}
          highlightLast
          showValues
          axisMax={String(max)}
          selected={sel}
          onSelect={(i) => setSel(sel === i ? null : i)}
          data={daily.map((x) => {
            const dt = new Date(x.day + 'T12:00:00');
            return {
              label: new Intl.DateTimeFormat(loc, { weekday: 'narrow' }).format(dt),
              sub: String(dt.getDate()),
              value: x.sessions ? x.sessions / max : 0,
              display: String(x.sessions),
              ariaLabel: `${new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' }).format(dt)}: ${x.sessions} ${t('trainingen', 'workouts')}`,
            };
          })}
        />
        {day && (
          <div className="mt-4 rounded-lg border border-line" role="region" aria-label={t('Trainingen op de gekozen dag', 'Workouts on the chosen day')}>
            <div className="border-b border-line px-3 py-2 text-[13px] font-semibold">{fmtDate(day.day, locale, { weekday: 'long', day: 'numeric', month: 'long' })} · {day.sessions} {t('trainingen', 'workouts')}</div>
            {day.list.length === 0 ? (
              <p className="px-3 py-2 text-[13px] text-ink-600">{t('Geen afgeronde trainingen op deze dag.', 'No completed workouts on this day.')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {day.list.map((x) => (
                  <li key={x.id}>
                    <Link to={`/app/patienten/${x.patientId}?tab=sessies`} className="flex min-h-[44px] flex-wrap items-center gap-x-3 px-3 py-2 text-[13px] hover:bg-ink-50">
                      <span className="tabular-nums text-ink-600">{new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' }).format(new Date(x.at))}</span>
                      <span className="font-medium">{x.name}</span>
                      <span className="min-w-0 flex-1 truncate text-ink-600">{x.program}</span>
                      {x.pain !== null && <Badge tone={x.pain >= 6 ? 'bad' : 'neutral'}>{t('Sessiepijn', 'Session pain')} {x.pain}/10</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
