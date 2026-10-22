import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { fmtDate, fmtDateTime, pct } from '@/lib/format';
import { useDocumentMeta } from '@/lib/meta';
import { Bars, ErrorState, Skeleton } from '@/components/ui';
import type { Adherence } from '@/lib/types';

type History = {
  weekly: (Adherence & { weekStart: string })[];
  sessions: { id: string; completedAt: string; programTitle: string; difficulty: number | null; pain: number | null; feedback: string | null; exercisesDone: number; exercisesTotal: number }[];
};

export function PatientProgress() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Voortgang', 'Progress'));
  const q = useQuery({ queryKey: ['patient-history'], queryFn: () => api.get<History>('/patient/history') });
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <div className="space-y-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-52 rounded-2xl" /></div>;
  const d = q.data;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('Mijn voortgang', 'My progress')}</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <div className="text-[14px] text-ink-500">{t('Trainingen gedaan', 'Workouts done')}</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{d.sessions.length}</div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <div className="text-[14px] text-ink-500">{t('Deze week', 'This week')}</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{pct(d.weekly.at(-1)?.rate)}</div>
        </div>
      </div>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="mb-1 font-semibold">{t('Per week', 'Per week')}</h2>
        <p className="mb-4 text-[14px] text-ink-500">{t('Gedaan ten opzichte van gepland', 'Done compared with planned')}</p>
        <Bars height={140} format={pct} data={d.weekly.map((w) => ({ label: fmtDate(w.weekStart, locale, { day: 'numeric', month: 'short' }), value: w.planned ? w.rate : null }))} />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">{t('Geschiedenis', 'History')}</h2>
        {d.sessions.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-5 text-ink-500">{t('Nog geen afgeronde trainingen.', 'No completed workouts yet.')}</p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white shadow-card">
            {d.sessions.map((s) => (
              <li key={s.id} className="flex gap-3 px-4 py-3.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{fmtDateTime(s.completedAt, locale)}</div>
                  <div className="text-[14px] text-ink-500">{s.programTitle} · {s.exercisesDone}/{s.exercisesTotal} {t('oefeningen', 'exercises')}</div>
                  {s.feedback && <div className="mt-1 flex items-start gap-1.5 text-[14px] italic text-ink-600"><MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{s.feedback}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
