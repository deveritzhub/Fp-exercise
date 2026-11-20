import { useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ChevronDown, ListChecks, Play, Search, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Notice, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { describeError, useI18n } from '@/lib/i18n';
import { EX_NAMES, autoMet, formChecks, phaseSourceKey, type FlexPath, type PathPhase } from '@shared/flexibilityPaths';
import { CHECKS, LIMITERS, scoreCheck, type CheckGoal } from '@shared/flexibilityCheck';
import type { MobilityResult } from '@shared/mobilityTests';

type Fn = readonly [string, string];
type Template = { id: string; title: string; sourceKey: string | null; itemCount: number };
type Check = { path: string; phase: number; item: string };

/** Tick list for one exercise while doing it. Not stored: it is a reminder, not a record. */
export function FormChecklist({ exerciseKey, className }: { exerciseKey: string | null | undefined; className?: string }) {
  const { t, locale } = useI18n();
  const id = useId();
  const items = formChecks(exerciseKey);
  const [done, setDone] = useState<Record<number, boolean>>({});
  if (!items.length) return null;
  return (
    <fieldset className={cn('rounded-xl border border-line bg-white p-3', className)} data-testid="form-checklist">
      <legend className="flex items-center gap-1.5 px-1 text-[14px] font-semibold text-ink-900"><ListChecks className="h-4 w-4 text-accent" aria-hidden />{t('Afvinklijst', 'Checklist')}</legend>
      <ul className="space-y-1">
        {items.map((c, i) => (
          <li key={i}>
            <label htmlFor={`${id}-${i}`} className="flex min-h-[40px] cursor-pointer items-start gap-2.5 py-1 text-[14.5px] leading-snug text-ink-800">
              <input id={`${id}-${i}`} type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--accent))]" checked={!!done[i]} onChange={(e) => setDone((d) => ({ ...d, [i]: e.target.checked }))} />
              <span className={cn(done[i] && 'text-ink-500 line-through')}>{locale === 'nl' ? c[0] : c[1]}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

const useFlexChecks = () => useQuery({ queryKey: ['flex-checks'], queryFn: () => api.get<{ checks: Check[] }>('/patient/flex-checks'), staleTime: 60_000 });
const useMobilityResults = () => useQuery({ queryKey: ['mobility-tests', '/patient'], queryFn: () => api.get<{ results: MobilityResult[] }>('/patient/mobility-tests'), staleTime: 5 * 60_000 });

/** Phased build-up of a flexibility goal: phases, exercises with their tick list, and criteria to move on. */
export function FlexPathView({ path, templates, onPick }: { path: FlexPath; templates: Template[]; onPick: (id: string) => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const tx = (x: Fn) => (nl ? x[0] : x[1]);
  const toast = useToast();
  const qc = useQueryClient();
  const checks = useFlexChecks();
  const mob = useMobilityResults();
  const results = mob.data?.results ?? [];
  const ticked = useMemo(() => new Set((checks.data?.checks ?? []).filter((c) => c.path === path.key).map((c) => `${c.phase}:${c.item}`)), [checks.data, path.key]);
  // A tick shows at once (React state in the click itself); the server answer then takes over.
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const met = (phaseNo: number, phase: PathPhase) =>
    phase.criteria.map((c) => (c.auto ? autoMet(c, results) : local[`${phaseNo}:${c.key}`] ?? ticked.has(`${phaseNo}:${c.key}`)));
  // The first phase whose criteria are not all met is where you are.
  const current = Math.max(0, path.phases.findIndex((p, i) => met(i + 1, p).some((x) => !x)));
  const [open, setOpen] = useState<number | null>(null);
  const shown = open ?? current;
  const toggle = useMutation({
    mutationFn: (v: { phase: number; item: string; on: boolean }) =>
      v.on ? api.put<{ checks: Check[] }>('/patient/flex-checks', { path: path.key, phase: v.phase, item: v.item })
        : api.del<{ checks: Check[] }>(`/patient/flex-checks?path=${path.key}&phase=${v.phase}&item=${encodeURIComponent(v.item)}`),
    // The tick shows at once; it is put back if saving fails.
    onMutate: (v) => {
      const prev = qc.getQueryData<{ checks: Check[] }>(['flex-checks']);
      const rest = (prev?.checks ?? []).filter((c) => !(c.path === path.key && c.phase === v.phase && c.item === v.item));
      qc.setQueryData(['flex-checks'], { checks: v.on ? [...rest, { path: path.key, phase: v.phase, item: v.item }] : rest });
      return { prev };
    },
    onSuccess: (d) => qc.setQueryData(['flex-checks'], d),
    onSettled: (_d, _e, v) => setLocal((l) => { const n = { ...l }; delete n[`${v.phase}:${v.item}`]; return n; }),
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['flex-checks'], ctx.prev);
      toast(describeError(e, locale), 'bad');
    },
  });

  return (
    <div className="space-y-3" data-testid={`flex-path-${path.key}`}>
      <div>
        <h4 className="text-[16px] font-bold">{t('Opbouw in fases', 'Phased build-up')}</h4>
        <p className="mt-0.5 text-[14px] leading-relaxed text-ink-700">{tx(path.intro)}</p>
      </div>
      {path.anatomy && <Notice tone="info">{tx(path.anatomy)}</Notice>}
      <ol className="space-y-2">
        {path.phases.map((phase, i) => {
          const no = i + 1;
          const flags = met(no, phase);
          const allMet = flags.every(Boolean);
          const tpl = templates.find((x) => x.sourceKey === phaseSourceKey(path, i));
          const isOpen = shown === i;
          const last = i === path.phases.length - 1;
          const status = allMet ? (last ? t('Doel bereikt', 'Goal reached') : t('Gehaald', 'Done')) : i === current ? t('Nu', 'Now') : i < current ? t('Gehaald', 'Done') : t('Later', 'Later');
          return (
            <li key={no} className={cn('rounded-xl border', i === current ? 'border-accent' : 'border-line')} data-testid={`phase-${no}`}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)} className="tap flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left">
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold', allMet ? 'bg-ok text-white' : i === current ? 'bg-accent text-accent-ink' : 'bg-canvas text-ink-700')}>
                  {allMet ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : no}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-tight">{t(`Fase ${no}`, `Phase ${no}`)} · {tx(phase.name)}</span>
                  <span className="block text-[13px] text-ink-600">{t(`week ${phase.weeks}`, `week ${phase.weeks}`)} · {phase.perWeek}× {t('per week', 'a week')} · {status}</span>
                </span>
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-500 transition-transform', isOpen && 'rotate-180')} aria-hidden />
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-line px-3 pb-3 pt-2">
                  <p className="text-[14.5px] font-medium text-ink-900">{tx(phase.goal)}</p>
                  <p className="flex gap-2 rounded-lg bg-canvas p-2.5 text-[13.5px] leading-relaxed text-ink-700"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />{tx(phase.physiology)}</p>
                  <div>
                    <h5 className="mb-1 text-[14px] font-semibold text-ink-900">{t('Oefeningen', 'Exercises')}</h5>
                    <ul className="space-y-2">
                      {phase.items.map((it) => (
                        <ExerciseRow key={it.ex} exKey={it.ex} name={EX_NAMES[it.ex] ? tx(EX_NAMES[it.ex]) : it.ex}
                          dose={[`${it.sets}×`, it.reps ? `${it.reps} ${t('herhalingen', 'reps')}` : '', it.holdS ? `${it.holdS} s` : '', it.note ? tx(it.note) : ''].filter(Boolean).join(' · ')} />
                      ))}
                    </ul>
                  </div>
                  {tpl ? (
                    <Button className="w-full" onClick={() => onPick(tpl.id)} icon={<Play className="h-4 w-4" />}>{t(`Start fase ${no}`, `Start phase ${no}`)}</Button>
                  ) : (
                    <p className="text-[13.5px] text-ink-600">{t('Je praktijk heeft deze fase nog niet klaargezet.', 'Your practice has not set up this phase yet.')}</p>
                  )}
                  <fieldset>
                    <legend className="mb-1 text-[14px] font-semibold text-ink-900">{last ? t('Doel bereikt als…', 'Goal reached when…') : t(`Naar fase ${no + 1} als…`, `On to phase ${no + 1} when…`)}</legend>
                    <ul className="space-y-1" data-testid={`criteria-${no}`}>
                      {phase.criteria.map((c, ci) => {
                        const inputId = `crit-${path.key}-${no}-${c.key}`;
                        return (
                          <li key={c.key}>
                            <label htmlFor={inputId} className={cn('flex min-h-[44px] items-start gap-2.5 py-1 text-[14.5px] leading-snug text-ink-800', c.auto ? 'cursor-default' : 'cursor-pointer')}>
                              <input id={inputId} type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--accent))]" checked={flags[ci]} disabled={!!c.auto}
                                onChange={(e) => { const on = e.target.checked; setLocal((l) => ({ ...l, [`${no}:${c.key}`]: on })); toggle.mutate({ phase: no, item: c.key, on }); }} />
                              <span>
                                {tx(c.text)}
                                {c.how && <span className="mt-0.5 block text-[13px] text-ink-600">{tx(c.how)}</span>}
                                {c.auto && <span className="mt-0.5 block text-[13px] font-medium text-accent">{flags[ci] ? t('Gehaald volgens je laatste meting', 'Met by your latest measurement') : t('Vinkt vanzelf af na je meting', 'Ticks itself after you measure')}</span>}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                  {allMet && !last && (
                    <Notice tone="ok" title={t(`Klaar voor fase ${no + 1}`, `Ready for phase ${no + 1}`)}>{t('Alle criteria gehaald. Start de volgende fase hierboven in de lijst.', 'All criteria met. Start the next phase from the list above.')}</Notice>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ExerciseRow({ exKey, name, dose }: { exKey: string; name: string; dose: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const has = formChecks(exKey).length > 0;
  return (
    <li className="rounded-lg border border-line p-2.5">
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold leading-snug">{name}</span>
          <span className="block text-[13px] text-ink-600">{dose}</span>
        </span>
        {has && (
          <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="tap inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-lg px-2 text-[13.5px] font-semibold text-accent">
            <ListChecks className="h-4 w-4" aria-hidden />{t('Afvinklijst', 'Checklist')}
          </button>
        )}
      </div>
      {open && <FormChecklist exerciseKey={exKey} className="mt-2" />}
    </li>
  );
}

/** "Wat houdt je tegen?": a few tests one by one, then the likely limiter and what to do about it. */
export function LimiterCheck({ goal }: { goal: CheckGoal }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const tx = (x: Fn) => (nl ? x[0] : x[1]);
  const id = useId();
  const qs = CHECKS[goal];
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const result = scoreCheck(goal, answers);
  const q = qs[step];
  const finished = step >= qs.length;
  const restart = () => { setAnswers({}); setStep(0); };

  if (!started) {
    return (
      <button type="button" onClick={() => setStarted(true)} data-testid="limiter-start"
        className="tap flex min-h-[56px] w-full items-center gap-3 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 px-3 text-left">
        <Search className="h-5 w-5 shrink-0 text-accent" aria-hidden />
        <span className="flex-1">
          <span className="block text-[15px] font-semibold">{t('Wat houdt je tegen?', 'What holds you back?')}</span>
          <span className="block text-[13px] text-ink-600">{t(`${qs.length} korte tests: welke spier of zenuw je remt`, `${qs.length} short tests: which muscle or nerve brakes you`)}</span>
        </span>
      </button>
    );
  }

  return (
    <section aria-labelledby={`${id}-h`} className="space-y-3 rounded-xl border border-line bg-white p-3" data-testid="limiter-check">
      <div className="flex items-baseline justify-between gap-2">
        <h4 id={`${id}-h`} className="text-[16px] font-bold">{t('Wat houdt je tegen?', 'What holds you back?')}</h4>
        {!finished && <span className="text-[13px] text-ink-600">{t(`Test ${step + 1} van ${qs.length}`, `Test ${step + 1} of ${qs.length}`)}</span>}
      </div>
      {!finished ? (
        <fieldset key={q.key}>
          <legend className="text-[15px] font-medium leading-snug text-ink-900">{tx(q.text)}</legend>
          {q.how && <p className="mt-1 text-[13.5px] text-ink-600">{tx(q.how)}</p>}
          <div className="mt-2 grid gap-2">
            {q.answers.map((a) => (
              <label key={a.key} className={cn('tap flex min-h-[48px] cursor-pointer items-center rounded-xl border-2 px-3 text-[15px] font-semibold focus-within:ring-2 focus-within:ring-accent', answers[q.key] === a.key ? 'border-accent bg-accent/10' : 'border-line hover:border-ink-300')}>
                <input type="radio" name={`${id}-${q.key}`} className="sr-only" checked={answers[q.key] === a.key}
                  onChange={() => { setAnswers((x) => ({ ...x, [q.key]: a.key })); setStep((s) => s + 1); }} />
                {tx(a.label)}
              </label>
            ))}
          </div>
          {step > 0 && <button type="button" className="mt-2 min-h-[44px] text-[14px] font-medium text-ink-700 underline" onClick={() => setStep((s) => s - 1)}>{t('Vorige test', 'Previous test')}</button>}
        </fieldset>
      ) : (
        <div className="space-y-3" aria-live="polite" data-testid="limiter-result">
          {result.stop && (
            <Notice tone="warn" icon={<AlertTriangle className="h-5 w-5" />} title={t('Stop met deze rek', 'Stop this stretch')}>
              {t('Tintelingen, een doof gevoel of schietende pijn horen er niet bij. Rek niet door en overleg met je fysiotherapeut.', 'Tingling, numbness or shooting pain do not belong here. Do not keep stretching and talk to your physiotherapist.')}
            </Notice>
          )}
          {result.limiters.length === 0 ? (
            <p className="text-[14.5px] text-ink-800">{t('Er springt niets duidelijk uit. Volg de opbouw in fases: die pakt de hele keten aan.', 'Nothing stands out clearly. Follow the phased build-up: it works on the whole chain.')}</p>
          ) : (
            <ul className="space-y-2">
              {result.limiters.map((l) => {
                const lim = LIMITERS[l.key];
                return (
                  <li key={l.key} className={cn('rounded-xl border p-3', lim.joint || lim.nerve ? 'border-warn/40 bg-warn-soft/40' : 'border-line')} data-testid={`limiter-${l.key}`}>
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold">{tx(lim.name)}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', l.level === 'waarschijnlijk' ? 'bg-accent text-accent-ink' : 'bg-canvas text-ink-700')}>{l.level === 'waarschijnlijk' ? t('waarschijnlijk', 'likely') : t('mogelijk', 'possibly')}</span>
                    </p>
                    <p className="mt-1 text-[14px] text-ink-700">{tx(lim.what)}</p>
                    <p className="mt-1 text-[14px] font-medium text-ink-900">{tx(lim.advice)}</p>
                    <p className="mt-1 text-[13.5px] text-ink-700">{t('Oefeningen', 'Exercises')}: {lim.exercises.map((k) => (EX_NAMES[k] ? tx(EX_NAMES[k]) : k)).join(', ')}</p>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[13px] text-ink-600">{t('Dit is een richting om mee te werken, geen diagnose. Twijfel je, of blijft het hetzelfde na een paar weken? Vraag je fysiotherapeut.', 'This is a direction to work with, not a diagnosis. In doubt, or no change after a few weeks? Ask your physiotherapist.')}</p>
          <Button variant="secondary" onClick={restart}>{t('Opnieuw doen', 'Do it again')}</Button>
        </div>
      )}
    </section>
  );
}
