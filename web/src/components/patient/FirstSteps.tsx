import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronRight, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { useHero } from '@/pages/patient/HeroPages';
import { ProgressBar } from '@/components/ui';

/** Hidden by choice on this device; only a display preference, no health data. */
const KEY = 'fp.firststeps.v1';
const hiddenHere = () => {
  try {
    return localStorage.getItem(KEY) === 'hidden';
  } catch {
    return false;
  }
};

/**
 * "First steps" on Vandaag for new people: five small things that show what the app can do.
 * Disappears when all are done, when hidden, or after the first month.
 */
export function FirstSteps({ hasProgram }: { hasProgram: boolean }) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(hiddenHere);
  const hero = useHero();
  const quiz = useQuery({ queryKey: ['patient-atlas-quiz'], queryFn: () => api.get<{ correct: string[] }>('/patient/atlas/quiz'), staleTime: 60_000 });
  const mob = useQuery({ queryKey: ['mobility-tests', '/patient'], queryFn: () => api.get<{ results: unknown[] }>('/patient/mobility-tests'), staleTime: 5 * 60_000 });
  if (hidden || !hero.data || !quiz.data || !mob.data) return null;
  const h = hero.data;
  // After the hero is made (the hero card asks for that first), during the first month.
  if (!h.hero || Date.now() - new Date(h.hero.createdAt).getTime() > 30 * 86400_000) return null;
  const steps = [
    { done: !!h.hero, to: '/p/held/nieuw', label: t('Maak je sportheld', 'Create your sports hero') },
    { done: h.checkin.total > 0, to: '/p/held', label: t('Doe je eerste dagcheck (5 seconden)', 'Do your first daily check-in (5 seconds)') },
    { done: h.totals.sessions > 0, to: hasProgram ? null : '/p/mobiliteit', label: hasProgram ? t('Rond je eerste training af (hierboven)', 'Finish your first workout (above)') : t('Start een programma en doe je eerste training', 'Start a programme and do your first workout') },
    { done: quiz.data.correct.length > 0, to: '/p/spieren?tab=quiz', label: t('Beantwoord een quizvraag goed', 'Answer a quiz question right') },
    { done: mob.data.results.length > 0, to: '/p/mobiliteit/meten', label: t('Meet je mobiliteit (met een meetlint)', 'Measure your mobility (with a tape measure)') },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const hide = () => {
    try {
      localStorage.setItem(KEY, 'hidden');
    } catch {
      /* ignore */
    }
    setHidden(true);
  };
  return (
    <section aria-labelledby="first-steps" className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="first-steps" className="font-semibold text-ink-900">{t('Eerste stappen', 'First steps')}</h2>
          <p className="text-[13.5px] text-ink-600">{t(`${done} van ${steps.length} gedaan`, `${done} of ${steps.length} done`)}</p>
        </div>
        <button type="button" onClick={hide} aria-label={t('Eerste stappen verbergen', 'Hide first steps')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" aria-hidden /></button>
      </div>
      <ProgressBar value={done / steps.length} className="mt-2 h-2" label={t('Eerste stappen', 'First steps')} />
      <ul className="mt-3 space-y-1">
        {steps.map((s) => {
          const body = (
            <>
              <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', s.done ? 'border-ok bg-ok text-white' : 'border-ink-300')} aria-hidden>{s.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
              <span className={cn('min-w-0 flex-1 text-[14.5px]', s.done ? 'text-ink-500 line-through' : 'text-ink-900')}><span className="sr-only">{s.done ? t('Gedaan: ', 'Done: ') : t('Nog te doen: ', 'To do: ')}</span>{s.label}</span>
              {!s.done && s.to && <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />}
            </>
          );
          return (
            <li key={s.label}>
              {!s.done && s.to ? <Link to={s.to} className="tap flex min-h-[44px] items-center gap-3 rounded-lg px-1 hover:bg-ink-50">{body}</Link> : <div className="flex min-h-[44px] items-center gap-3 px-1">{body}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
