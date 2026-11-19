import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Card, Notice } from '@/components/ui';
import { DEFAULT_LOOK } from '@shared/hero';
import type { HeroState } from '@/lib/types';
import { MOVES } from '@/components/exercise3d/moves';

const ExerciseDemo = lazy(() => import('@/components/exercise3d/ExerciseDemo'));

/**
 * A trial: exercises shown as a 3D demonstration by the patient's own hero (/p/proef/oefeningen).
 * Five movements, for the physiotherapist to check before they are shown with a programme.
 */
export function ExerciseDemoPage() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  useDocumentMeta(t('Oefeningen in 3D', 'Exercises in 3D'));
  const hero = useQuery({ queryKey: ['patient-hero'], queryFn: () => api.get<HeroState>('/patient/hero') });
  const [key, setKey] = useState(MOVES[0].key);
  const move = MOVES.find((m) => m.key === key) ?? MOVES[0];
  // The hero in plain sports kit, without gear in the way of the movement.
  const look = { ...(hero.data?.hero ?? DEFAULT_LOOK), gear: [] };
  return (
    <div className="space-y-4">
      <div>
        <h1 className="t-page">{t('Oefeningen in 3D', 'Exercises in 3D')}</h1>
        <p className="mt-1 text-[15px] text-ink-700">{t('Je eigen held doet de oefening voor. Sleep over het beeld om van een andere kant te kijken.', 'Your own hero shows the exercise. Drag across the picture to look from another side.')}</p>
      </div>
      <div role="radiogroup" aria-label={t('Kies een oefening', 'Choose an exercise')} className="flex flex-wrap gap-2">
        {MOVES.map((m) => (
          <button key={m.key} type="button" role="radio" aria-checked={m.key === key} data-testid={`move-${m.key}`} onClick={() => setKey(m.key)}
            className={cn('tap min-h-[44px] rounded-full border px-4 text-[14.5px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent', m.key === key ? 'border-accent bg-accent text-white' : 'border-line bg-white text-ink-900 hover:border-ink-300')}>
            {nl ? m.nl : m.en}
          </button>
        ))}
      </div>
      <Suspense fallback={<div className="h-[min(50vh,440px)] w-full rounded-2xl bg-canvas" />}>
        {hero.isLoading ? <div className="h-[min(50vh,440px)] w-full rounded-2xl bg-canvas" /> : <ExerciseDemo move={move} look={look} className="h-[min(50vh,440px)] w-full" />}
      </Suspense>
      <Card className="p-5">
        <h2 className="t-section">{nl ? move.nl : move.en}</h2>
        <p className="mt-1 text-[13.5px] text-ink-700">{t(`Rustig tempo: ongeveer ${move.seconds} seconden per herhaling.`, `A calm pace: about ${move.seconds} seconds per repetition.`)}</p>
        <ul className="mt-3 space-y-2" data-testid="move-cues">
          {move.cues.map(([a, b]) => (
            <li key={a} className="flex gap-2 text-[15px] leading-snug text-ink-900"><span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{nl ? a : b}</li>
          ))}
        </ul>
      </Card>
      <Notice tone="info">{t('Dit is een proef met vijf oefeningen. De bewegingen worden eerst door je fysiotherapeut nagekeken.', 'This is a trial with five exercises. The movements are checked by your physiotherapist first.')}</Notice>
    </div>
  );
}
