import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { fmtDate, fmtDateTime, pct } from '@/lib/format';
import { useDocumentMeta } from '@/lib/meta';
import { Bars, ErrorState, Skeleton, Sparkline } from '@/components/ui';
import type { Adherence } from '@/lib/types';
import { StrengthProgress } from '@/components/patient/Strength';
import { MobilitySummary } from '@/components/MobilityTests';
import { Link } from 'react-router-dom';
import { quizQuestions } from '@shared/muscleAtlas';

/** The patient's own effort and pain after workouts, oldest → newest, with a plain summary. */
function ScoresCard({ sessions }: { sessions: History['sessions'] }) {
  const { t } = useI18n();
  const scored = sessions.filter((x) => x.difficulty !== null || x.pain !== null).slice(0, 12).reverse();
  if (scored.length < 3) return null;
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };
  const first = scored.slice(0, 3);
  const last = scored.slice(-3);
  const p0 = avg(first.map((x) => x.pain));
  const p1 = avg(last.map((x) => x.pain));
  const line = p0 !== null && p1 !== null
    ? p1 < p0
      ? t(`Je pijn na het trainen daalt: van gemiddeld ${p0} naar ${p1}.`, `Your pain after training is going down: from an average of ${p0} to ${p1}.`)
      : p1 > p0
        ? t(`Je pijn na het trainen is wat hoger dan eerst (${p0} → ${p1}). Blijft dat zo, bespreek het met je fysiotherapeut.`, `Your pain after training is a bit higher than before (${p0} → ${p1}). If it stays that way, discuss it with your physiotherapist.`)
        : t(`Je pijn na het trainen is gelijk gebleven (gemiddeld ${p1}).`, `Your pain after training has stayed the same (average ${p1}).`)
    : null;
  return (
    <section aria-labelledby="scores-title" className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 id="scores-title" className="font-bold">{t('Zwaarte en pijn na je trainingen', 'Effort and pain after your workouts')}</h2>
      <p className="mb-2 text-[14px] text-ink-500">{t(`Je laatste ${scored.length} trainingen, 0–10`, `Your last ${scored.length} workouts, 0–10`)}</p>
      <p className="text-[13px] font-medium text-ink-700">{t('Zwaarte', 'Effort')}</p>
      <Sparkline values={scored.map((x) => x.difficulty)} />
      <p className="mt-2 text-[13px] font-medium text-ink-700">{t('Pijn', 'Pain')}</p>
      <Sparkline values={scored.map((x) => x.pain)} tone="bad" />
      {line && <p className="mt-2 text-[14px] text-ink-800" role="status">{line}</p>}
    </section>
  );
}

/** The anatomy quiz in numbers, with a link to go on. */
function QuizSummary() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['patient-atlas-quiz'], queryFn: () => api.get<{ correct: string[] }>('/patient/atlas/quiz'), staleTime: 60_000 });
  if (!q.data) return null;
  const total = quizQuestions().length;
  const right = q.data.correct.length;
  return (
    <section aria-labelledby="quiz-summary" className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="quiz-summary" className="font-bold">{t('Kennis', 'Knowledge')}</h2>
        <Link to="/p/spieren?tab=quiz" className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-accent">{t('Naar de quiz', 'To the quiz')}</Link>
      </div>
      <p className="text-[14px] text-ink-700">{t(`${right} van ${total} quizvragen goed over spieren, zenuwen en oefeningen.`, `${right} of ${total} quiz questions right on muscles, nerves and exercises.`)}</p>
    </section>
  );
}

type History = {
  weekly: (Adherence & { weekStart: string })[];
  sessions: { id: string; completedAt: string; programTitle: string; difficulty: number | null; pain: number | null; feedback: string | null; reply?: string | null; exercisesDone: number; exercisesTotal: number }[];
};

export function PatientProgress() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Voortgang', 'Progress'));
  const q = useQuery({ queryKey: ['patient-history'], queryFn: () => api.get<History>('/patient/history') });
  const [shown, setShown] = useState(10);
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <div className="space-y-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-52 rounded-2xl" /></div>;
  const d = q.data;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('Mijn voortgang', 'My progress')}</h1>
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
        <h2 className="mb-1 font-bold">{t('Per week', 'Per week')}</h2>
        <p className="mb-4 text-[14px] text-ink-500">{t('Gedaan ten opzichte van gepland', 'Done compared with planned')}</p>
        <Bars height={140} format={pct} data={d.weekly.map((w) => ({ label: fmtDate(w.weekStart, locale, { day: 'numeric', month: 'short' }), value: w.planned ? w.rate : null }))} />
      </section>
      <ScoresCard sessions={d.sessions} />
      <StrengthProgress />
      <MobilitySummary />
      <QuizSummary />
      <section>
        <h2 className="mb-3 text-lg font-bold">{t('Geschiedenis', 'History')}</h2>
        {d.sessions.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-5 text-ink-500">{t('Nog geen afgeronde trainingen.', 'No completed workouts yet.')}</p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white shadow-card">
            {d.sessions.slice(0, shown).map((s) => (
              <li key={s.id} className="flex gap-3 px-4 py-3.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{fmtDateTime(s.completedAt, locale)}</div>
                  <div className="text-[14px] text-ink-500">{s.programTitle} · {s.exercisesDone}/{s.exercisesTotal} {t('oefeningen', 'exercises')}</div>
                  {s.feedback && <div className="mt-1 flex items-start gap-1.5 text-[14px] italic text-ink-600"><MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{s.feedback}</div>}
                  {s.reply && <div className="mt-1.5 rounded-lg bg-accent-soft px-3 py-2 text-[14px] text-ink-800"><span className="font-semibold">{t('Je fysiotherapeut', 'Your physiotherapist')}: </span>{s.reply}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {d.sessions.length > shown && (
          <button type="button" onClick={() => setShown((n) => n + 20)} className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-line bg-white text-[15px] font-semibold text-ink-900 shadow-card">
            {t(`Meer tonen (${d.sessions.length - shown} over)`, `Show more (${d.sessions.length - shown} left)`)}
          </button>
        )}
      </section>
    </div>
  );
}
