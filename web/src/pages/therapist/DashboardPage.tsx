import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, AlertCircle, ArrowRight, BookOpen, Layers, MessageSquareText, Plus, Star, UserPlus, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { fmtRelative, greeting, pct } from '@/lib/format';
import { useDocumentMeta, useLabels } from '@/lib/meta';
import { Avatar, Badge, Bars, ButtonLink, Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, Stat } from '@/components/ui';
import { ExerciseThumb } from '@/components/app/ExerciseThumb';
import { ProgramStatusBadge, useReasonLabel } from '@/components/app/StatusBadge';
import type { Exercise, Program } from '@/lib/types';

type Dashboard = {
  daily: { day: string; sessions: number }[];
  stats: { patients: number; activePrograms: number; adherence7d: number | null; sessions7d: number; attention: number };
  attention: { patientId: string; name: string; reasons: string[] }[];
  activity: { id: string; patientId: string; patientName: string; programTitle: string; completedAt: string; pain: number | null; difficulty: number | null; hasFeedback: boolean }[];
  favorites: Exercise[];
};

export function DashboardPage() {
  const { t, locale } = useI18n();
  const { user, practice } = useSession();
  const L = useLabels();
  const reason = useReasonLabel();
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
              <Stat label={t('Therapietrouw 7 dagen', 'Adherence 7 days')} value={pct(d.stats.adherence7d)} icon={<Activity className="h-4 w-4" />} hint={t('Uitgevoerde vs. geplande sessies', 'Completed vs planned sessions')} />
              <Stat label={t('Sessies 7 dagen', 'Sessions 7 days')} value={d.stats.sessions7d} icon={<Layers className="h-4 w-4" />} hint={t('Afgeronde oefensessies', 'Completed exercise sessions')} />
              <Stat label={t('Vraagt aandacht', 'Needs attention')} value={d.stats.attention} tone="warn" icon={<AlertCircle className="h-4 w-4" />} hint={t('Zie lijst hieronder', 'See list below')} />
            </>
          ) : (
            Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[112px] rounded-xl" />)
          )}
        </div>
      )}

      {d && d.daily.length > 0 && (
        <Card className="mt-6">
          <CardHeader
            title={t('Activiteit van je patiënten', 'Your patients’ activity')}
            description={t('Afgeronde trainingen per dag, laatste 14 dagen', 'Completed workouts per day, last 14 days')}
            action={<span className="text-[13px] tabular-nums text-ink-500">{d.daily.reduce((a, x) => a + x.sessions, 0)} {t('totaal', 'total')}</span>}
          />
          <div className="px-5 pb-4 pt-5">
            <Bars
              height={110}
              highlightLast
              data={(() => {
                const max = Math.max(1, ...d.daily.map((x) => x.sessions));
                return d.daily.map((x) => ({
                  label: new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'narrow' }).format(new Date(x.day + 'T12:00:00')),
                  value: x.sessions ? x.sessions / max : 0,
                  display: String(x.sessions),
                }));
              })()}
            />
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title={t('Vraagt aandacht', 'Needs attention')} description={t('Signalen op basis van gemelde scores en activiteit — geen diagnose.', 'Signals based on reported scores and activity — not a diagnosis.')} />
          {!d ? (
            <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : d.attention.length === 0 ? (
            <EmptyState icon={<Activity className="h-5 w-5" />} title={t('Alles loopt volgens plan', 'Everything is on track')} description={t('Er zijn geen patiënten die nu extra aandacht vragen.', 'No patients currently need extra attention.')} />
          ) : (
            <ul className="divide-y divide-line">
              {d.attention.map((a) => (
                <li key={a.patientId}>
                  <Link to={`/app/patienten/${a.patientId}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ink-50/60">
                    <Avatar name={a.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.name}</span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {a.reasons.map((r) => {
                          const x = reason(r);
                          return <Badge key={r} tone={x.tone}>{x.text}</Badge>;
                        })}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-ink-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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
          <CardHeader title={t('Favoriete oefeningen', 'Favourite exercises')} action={<Link to="/app/oefeningen?scope=favorites" className="text-[13px] font-medium text-accent hover:underline">{t('Bibliotheek', 'Library')}</Link>} />
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
