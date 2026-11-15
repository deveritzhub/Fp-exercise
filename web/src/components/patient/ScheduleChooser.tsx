import { useId, useMemo, useState } from 'react';
import { CheckCircle2, Play } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';
import { DAY_OPTIONS, adviceFormat, matchSchedules, type Format, type Goal, type Level } from '@shared/strengthChooser';

type Template = { id: string; title: string; sourceKey: string | null; daysPerWeek: number | null; itemCount: number };

const FORMAT_TEXT: Record<Format, [string, string, string, string]> = {
  fullbody: ['Full body', 'Full body', 'Je hele lichaam elke training. Ideaal bij 2 of 3 keer per week.', 'Your whole body every session. Ideal for 2 or 3 times a week.'],
  bovenonder: ['Boven/onder', 'Upper/lower', 'Om en om bovenlichaam en benen. Past bij 4 keer per week.', 'Upper body and legs in turn. Suits 4 times a week.'],
  ppl: ['Push/pull/benen', 'Push/pull/legs', 'Duwen, trekken en benen op aparte dagen. Voor 3, 5 of 6 keer.', 'Pushing, pulling and legs on separate days. For 3, 5 or 6 times.'],
  thuis: ['Thuis of met dumbbells', 'At home or with dumbbells', 'Zonder sportschool: eigen lichaamsgewicht of dumbbells.', 'No gym: bodyweight or dumbbells.'],
  any: ['Weet ik niet', 'Not sure', 'Wij kiezen het format dat past bij hoe vaak je traint.', 'We pick the format that suits how often you train.'],
};
const GOAL_TEXT: Record<Goal, [string, string, string, string]> = {
  spiergroei: ['Spiergroei', 'Muscle growth', 'Meer spiermassa opbouwen', 'Build more muscle'],
  kracht: ['Sterker worden', 'Get stronger', 'Zwaarder kunnen tillen', 'Lift heavier'],
  beginnen: ['Beginnen', 'Get started', 'Rustig starten met krachttraining', 'Start strength training calmly'],
  billen: ['Billen en benen', 'Glutes and legs', 'Extra aandacht voor billen en benen', 'Extra focus on glutes and legs'],
};
const LEVEL_TEXT: Record<Level, [string, string]> = { beginner: ['beginner', 'beginner'], gemiddeld: ['gemiddeld', 'intermediate'], gevorderd: ['gevorderd', 'advanced'] };

function Options<T extends string | number>({ legend, name, value, onChange, options, cols }: {
  legend: string; name: string; value: T | null; onChange: (v: T) => void; options: { value: T; label: string; hint?: string }[]; cols: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[15px] font-semibold text-ink-900">{legend}</legend>
      <div className={cn('grid gap-2', cols)}>
        {options.map((o) => (
          <label
            key={String(o.value)}
            className={cn(
              'tap flex min-h-[48px] cursor-pointer flex-col justify-center rounded-xl border-2 px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-1',
              value === o.value ? 'border-accent bg-accent/10' : 'border-line bg-white hover:border-ink-300',
            )}
          >
            <input type="radio" name={name} className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="text-[15px] font-semibold leading-tight text-ink-950">{o.label}</span>
            {o.hint && <span className="mt-0.5 text-[13px] leading-snug text-ink-600">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Format → days per week → goal, then the shipped schedules that fit, best first. */
export function ScheduleChooser({ templates, onPick, disabled }: { templates: Template[]; onPick: (id: string) => void; disabled?: boolean }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const id = useId();
  const [format, setFormat] = useState<Format | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const ready = format !== null && days !== null && goal !== null;
  const matches = useMemo(() => (ready ? matchSchedules(templates, { format: format!, days: days!, goal: goal! }).slice(0, 4) : []), [ready, templates, format, days, goal]);
  const pick = <T,>(x: [string, string, string, string]) => ({ label: nl ? x[0] : x[1], hint: nl ? x[2] : x[3] }) as T;
  const fmtLabel = (f: Format) => (nl ? FORMAT_TEXT[f][0] : FORMAT_TEXT[f][1]);

  return (
    <section aria-labelledby={`${id}-h`} className="space-y-4 rounded-2xl border border-line bg-white p-4 shadow-card">
      <div>
        <h3 id={`${id}-h`} className="text-[17px] font-bold">{t('Kies je schema', 'Choose your schedule')}</h3>
        <p className="mt-0.5 text-[14px] text-ink-600">{t('Drie vragen, dan zie je welke schema’s bij je passen.', 'Three questions, then you see which schedules suit you.')}</p>
      </div>
      <Options<Format>
        legend={t('1. Welk format wil je?', '1. Which format do you want?')}
        name={`${id}-format`}
        value={format}
        onChange={setFormat}
        cols="grid-cols-1 min-[420px]:grid-cols-2"
        options={(['fullbody', 'bovenonder', 'ppl', 'thuis', 'any'] as Format[]).map((f) => ({ value: f, ...pick<{ label: string; hint: string }>(FORMAT_TEXT[f]) }))}
      />
      <Options<number>
        legend={t('2. Hoe vaak per week train je?', '2. How often a week do you train?')}
        name={`${id}-days`}
        value={days}
        onChange={setDays}
        cols="grid-cols-5"
        options={DAY_OPTIONS.map((d) => ({ value: d, label: `${d}×` }))}
      />
      <Options<Goal>
        legend={t('3. Wat is je doel?', '3. What is your goal?')}
        name={`${id}-goal`}
        value={goal}
        onChange={setGoal}
        cols="grid-cols-1 min-[420px]:grid-cols-2"
        options={(['spiergroei', 'kracht', 'beginnen', 'billen'] as Goal[]).map((g) => ({ value: g, ...pick<{ label: string; hint: string }>(GOAL_TEXT[g]) }))}
      />
      {ready && (
        <div aria-live="polite">
          <h4 className="mb-1.5 text-[15px] font-semibold text-ink-900">{t('4. Schema’s die bij je passen', '4. Schedules that suit you')}</h4>
          {format === 'any' && <p className="mb-2 text-[14px] text-ink-700">{t(`Bij ${days}× per week past ${fmtLabel(adviceFormat(days!)).toLowerCase()} het best.`, `At ${days}× a week, ${fmtLabel(adviceFormat(days!)).toLowerCase()} suits best.`)}</p>}
          {matches.length === 0 ? (
            <p className="text-[14px] text-ink-700">{t('Geen schema dat hierbij past. Kies een ander aantal dagen of doel, of kies hieronder uit alle programma’s.', 'No schedule fits this. Pick another number of days or goal, or choose from all programmes below.')}</p>
          ) : (
            <ul className="space-y-2" data-testid="schedule-matches">
              {matches.map((m, i) => (
                <li key={m.template.id} className={cn('rounded-xl border p-3', i === 0 ? 'border-accent bg-accent/5' : 'border-line')}>
                  <p className="font-semibold leading-snug">{m.template.title}</p>
                  <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[13px] text-ink-700">
                    <span>{m.info.days}× {t('per week', 'a week')}</span>·<span>{fmtLabel(m.info.formats[0])}</span>·<span>{nl ? LEVEL_TEXT[m.info.level][0] : LEVEL_TEXT[m.info.level][1]}</span>·<span>{m.template.itemCount} {t('oefeningen', 'exercises')}</span>
                  </p>
                  <p className={cn('mt-1 flex items-center gap-1 text-[13px] font-semibold', m.exact ? 'text-ok' : 'text-ink-700')}>
                    {m.exact && <CheckCircle2 className="h-4 w-4" aria-hidden />}
                    {m.exact
                      ? t('Past precies', 'Exact fit')
                      : m.daysOff
                        ? m.info.days > days! ? t('Eén dag per week meer', 'One more day a week') : t('Eén dag per week minder', 'One day a week less')
                        : t('Past bijna', 'Close fit')}
                  </p>
                  <Button className="mt-2 w-full" variant={i === 0 ? 'primary' : 'secondary'} disabled={disabled} onClick={() => onPick(m.template.id)} icon={<Play className="h-4 w-4" />}>
                    {t('Bekijken en starten', 'View and start')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
