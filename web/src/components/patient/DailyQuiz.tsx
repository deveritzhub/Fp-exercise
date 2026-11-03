import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Brain, Check, ChevronRight, X } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/ui';
import { quizQuestions, type QuizQuestion } from '@shared/muscleAtlas';

type QuizState = { correct: string[]; todayCount: number; dailyCap: number; level2?: boolean };

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const PICK_KEY = 'fp.quiz.day';
/** Today's question id: the one picked earlier today, or a new pick by date. Only a quiz id is stored. */
function dayPick(pool: QuizQuestion[]): string | undefined {
  const day = today();
  try {
    const saved = JSON.parse(localStorage.getItem(PICK_KEY) ?? 'null') as { day: string; id: string } | null;
    if (saved?.day === day) return saved.id;
  } catch {
    /* ignore */
  }
  const id = pool[hash(day) % pool.length]?.id;
  try {
    if (id) localStorage.setItem(PICK_KEY, JSON.stringify({ day, id }));
  } catch {
    /* ignore */
  }
  return id;
}

/**
 * Question of the day: one question a day (picked from the ones still open to you), answered
 * right here. A right answer counts like any quiz answer (XP once, within the daily cap).
 */
export function DailyQuizCard() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['patient-atlas-quiz'], queryFn: () => api.get<QuizState>('/patient/atlas/quiz'), staleTime: 60_000 });
  const [result, setResult] = useState<{ id: string; correct: boolean; answer: string; picked: string; explain: [string, string]; xp: number } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!q.data) return null;
  const open = quizQuestions().filter((x) => x.level === 1 || q.data.level2);
  // The day's question: picked once a day from the questions not yet answered right (all done:
  // from every open question), and kept for the rest of the day on this device.
  const todo = open.filter((x) => !q.data.correct.includes(x.id));
  const pool = todo.length ? todo : open;
  const question: QuizQuestion | undefined = open.find((x) => x.id === (result?.id ?? dayPick(pool))) ?? pool[hash(today()) % pool.length];
  if (!question) return null;

  const answer = async (opt: string) => {
    setBusy(true);
    try {
      const r = await api.post<{ correct: boolean; answer: string; explain: [string, string]; xp: number; quiz: QuizState }>('/patient/atlas/quiz', { questionId: question.id, answer: opt });
      setResult({ id: question.id, correct: r.correct, answer: r.answer, picked: opt, explain: r.explain, xp: r.xp });
      qc.setQueryData(['patient-atlas-quiz'], r.quiz);
      if (r.xp) void qc.invalidateQueries({ queryKey: ['patient-hero'] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="daily-quiz">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-600"><Brain className="h-4 w-4 text-accent" aria-hidden />{t('Vraag van de dag', 'Question of the day')}</p>
      <h2 id="daily-quiz" className="mt-1 text-[16.5px] font-bold leading-snug text-ink-950">{nl ? question.q[0] : question.q[1]}</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {question.options.map((o) => {
          const isAnswer = result && o.id === result.answer;
          const isWrong = result && !result.correct && o.id === result.picked;
          return (
            <li key={o.id}>
              <button type="button" disabled={busy || !!result} onClick={() => answer(o.id)}
                className={cn('tap flex min-h-[48px] w-full items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-[14.5px]', isAnswer ? 'border-ok bg-ok-soft font-semibold text-ok' : isWrong ? 'border-bad bg-bad-soft text-bad' : 'border-line bg-white text-ink-900')}>
                <span className="min-w-0 flex-1">{nl ? o.label[0] : o.label[1]}</span>
                {isAnswer && <Check className="h-5 w-5 shrink-0" aria-label={t('Goed antwoord', 'Right answer')} />}
                {isWrong && <X className="h-5 w-5 shrink-0" aria-label={t('Jouw antwoord', 'Your answer')} />}
              </button>
            </li>
          );
        })}
      </ul>
      {result && (
        <div className={cn('mt-3 rounded-xl p-3 text-[14px]', result.correct ? 'bg-ok-soft' : 'bg-canvas')} role="status">
          <p className="font-semibold text-ink-900">{result.correct ? (result.xp ? t(`Goed! +${result.xp} XP`, `Right! +${result.xp} XP`) : t('Goed!', 'Right!')) : t('Bijna. Het goede antwoord staat groen.', 'Almost. The right answer is in green.')}</p>
          <p className="mt-0.5 text-ink-800">{nl ? result.explain[0] : result.explain[1]}</p>
        </div>
      )}
      <Link to="/p/spieren?tab=quiz" className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-[14px] font-medium text-accent">
        {result ? t('Meer vragen in de spierenatlas', 'More questions in the muscle atlas') : t('Naar de spierenatlas', 'To the muscle atlas')}<ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}
