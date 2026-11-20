import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Play, Ruler } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';
import { GOAL_GROUPS, MOBILITY_GOALS, pathKeysForGoal, programsForGoal, type GoalGroup } from '@shared/mobilityGoals';
import { flexPath } from '@shared/flexibilityPaths';
import { CHECKS, type CheckGoal } from '@shared/flexibilityCheck';
import { FlexPathView, LimiterCheck } from './FlexPath';
import { mobilityTest } from '@shared/mobilityTests';

type Template = { id: string; title: string; sourceKey: string | null; itemCount: number };

/** Pick a mobility goal from a menu; see the whole chain behind it and the programme that fits. */
export function MobilityGoalChooser({ templates, onPick }: { templates: Template[]; onPick: (id: string) => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const tx = (x: readonly [string, string]) => (nl ? x[0] : x[1]);
  const id = useId();
  // Only goals this practice has a programme for.
  const goals = useMemo(() => MOBILITY_GOALS.filter((g) => programsForGoal(g, templates).length > 0 || pathKeysForGoal(g).some((k) => templates.some((x) => x.sourceKey === k))), [templates]);
  const groups = GOAL_GROUPS.filter((gr) => goals.some((g) => g.group === gr.key));
  const [group, setGroup] = useState<GoalGroup>(groups[0]?.key ?? 'lenigheid');
  const [goalKey, setGoalKey] = useState<string | null>(null);
  const goal = goals.find((g) => g.key === goalKey) ?? null;
  const progs = goal ? programsForGoal(goal, templates) : [];
  const test = goal?.test ? mobilityTest(goal.test) : null;
  const path = goal?.path ? flexPath(goal.path) : null;
  const checkGoal = goal && goal.key in CHECKS ? (goal.key as CheckGoal) : null;
  if (!goals.length) return null;

  return (
    <section aria-labelledby={`${id}-h`} className="space-y-4 rounded-2xl border border-line bg-white p-4 shadow-card" data-testid="mobility-goals">
      <div>
        <h3 id={`${id}-h`} className="text-[17px] font-bold">{t('Kies je doel', 'Choose your goal')}</h3>
        <p className="mt-0.5 text-[14px] text-ink-600">{t('Wat wil je kunnen? Je krijgt het programma dat de hele keten aanpakt.', 'What do you want to be able to do? You get the programme that works on the whole chain.')}</p>
      </div>

      <div role="radiogroup" aria-label={t('Soort doel', 'Kind of goal')} className="flex flex-wrap gap-2">
        {groups.map((gr) => (
          <button
            key={gr.key}
            type="button"
            role="radio"
            aria-checked={group === gr.key}
            onClick={() => { setGroup(gr.key); setGoalKey(null); }}
            className={cn('tap min-h-[44px] rounded-full border-2 px-4 text-[14.5px] font-semibold', group === gr.key ? 'border-accent bg-accent/10 text-ink-950' : 'border-line bg-white text-ink-700 hover:border-ink-300')}
          >
            {tx(gr.name)}
          </button>
        ))}
      </div>

      <fieldset>
        <legend className="sr-only">{t('Doel', 'Goal')}</legend>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          {goals.filter((g) => g.group === group).map((g) => (
            <label
              key={g.key}
              data-testid={`goal-${g.key}`}
              className={cn(
                'tap flex min-h-[56px] cursor-pointer flex-col justify-center rounded-xl border-2 px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-1',
                goalKey === g.key ? 'border-accent bg-accent/10' : 'border-line bg-white hover:border-ink-300',
              )}
            >
              <input type="radio" name={`${id}-goal`} className="sr-only" checked={goalKey === g.key} onChange={() => setGoalKey(g.key)} />
              <span className="text-[15px] font-semibold leading-tight text-ink-950">{tx(g.name)}</span>
              <span className="mt-0.5 text-[13px] leading-snug text-ink-600">{tx(g.gain)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {goal && (
        <div aria-live="polite" className="space-y-3" data-testid="goal-detail">
          <div className="rounded-xl bg-canvas p-3">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-600">{t('De hele keten', 'The whole chain')}</p>
            <ol className="mt-1.5 flex flex-wrap items-center gap-1 text-[14px] font-semibold text-ink-900" data-testid="goal-chain">
              {goal.chain.map((c, i) => (
                <li key={c[0]} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-ink-500" aria-hidden />}
                  <span className="rounded-full bg-white px-2.5 py-1 shadow-xs">{tx(c)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-700">{tx(goal.why)}</p>
          </div>
          {checkGoal && <LimiterCheck key={checkGoal} goal={checkGoal} />}
          {path && <FlexPathView key={path.key} path={path} templates={templates} onPick={onPick} />}
          {path && progs.length > 0 && <h4 className="pt-1 text-[15px] font-semibold text-ink-800">{t('Of een los programma dat erbij past', 'Or a single programme that fits')}</h4>}
          <ul className="space-y-2" data-testid="goal-programs">
            {progs.map((p, i) => (
              <li key={p.id} className={cn('rounded-xl border p-3', i === 0 && !path ? 'border-accent bg-accent/5' : 'border-line')}>
                <p className="font-semibold leading-snug">{p.title}</p>
                <p className="mt-0.5 text-[13px] text-ink-700">{p.itemCount} {t('oefeningen', 'exercises')}{i === 0 && progs.length > 1 && !path ? ` · ${t('past het best', 'best fit')}` : ''}</p>
                <Button className="mt-2 w-full" variant={i === 0 && !path ? 'primary' : 'secondary'} onClick={() => onPick(p.id)} icon={<Play className="h-4 w-4" />}>
                  {t('Bekijken en starten', 'View and start')}
                </Button>
              </li>
            ))}
          </ul>
          {test && (
            <Link to="/p/mobiliteit/meten" className="tap flex min-h-[48px] items-center gap-2 rounded-xl border border-line px-3 text-[14.5px] font-medium text-ink-800 hover:border-ink-300">
              <Ruler className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span className="flex-1">{t(`Meet je vooruitgang met de ${tx(test.name).toLowerCase()}`, `Measure your progress with the ${tx(test.name).toLowerCase()}`)}</span>
              <ChevronRight className="h-4 w-4 text-ink-500" aria-hidden />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
