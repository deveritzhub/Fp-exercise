import { useId, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, ChevronDown, RotateCcw, Stethoscope } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Button, Notice, PageHeader } from '@/components/ui';
import { CHECKS, LIMITERS, scoreCheck, type CheckGoal } from '@shared/flexibilityCheck';
import { EXAM, LIMITER_CLINICAL } from '@shared/flexibilityExam';
import { EX_NAMES, flexPath } from '@shared/flexibilityPaths';

type Fn = readonly [string, string];
const GOALS: { key: CheckGoal; name: Fn }[] = [
  { key: 'tenen', name: ['Tenen aantikken', 'Touching the toes'] },
  { key: 'pancake', name: ['Pancake', 'Pancake'] },
  { key: 'spagaat_voor', name: ['Spagaat voorwaarts', 'Front split'] },
  { key: 'spagaat_zij', name: ['Spagaat zijwaarts', 'Side split'] },
];
/** The patient wording of an answer, read by the therapist ("mijn kuit" → "de kuit"). */
const third = (s: string) => s.replace(/\bmijn\b/g, 'de').replace(/\bMijn\b/g, 'De').replace(/\bmy\b/g, 'the').replace(/\bMy\b/g, 'The');

/**
 * Flexibility exam for therapists: per goal the differentiation tests with their clinical name and how
 * to read them, a live result with the likely limiter and how to confirm it, and one tap from the
 * proposed library exercises to a programme. The same scoring as the patient's self-check. A clinical
 * reasoning aid, not a diagnosis; nothing is stored.
 */
export function FlexExamPage() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const L = (f: Fn) => (nl ? f[0] : f[1]);
  useDocumentMeta(t('Lenigheidsonderzoek', 'Flexibility exam'));
  const id = useId();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const goal = (GOALS.some((g) => g.key === params.get('doel')) ? params.get('doel') : 'tenen') as CheckGoal;
  const patient = params.get('patient');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const qs = CHECKS[goal];
  const result = scoreCheck(goal, answers);
  const answered = qs.filter((q) => answers[q.key] !== undefined).length;
  const setGoal = (g: CheckGoal) => {
    const p = new URLSearchParams(params);
    p.set('doel', g);
    setParams(p, { replace: true });
    setAnswers({});
  };

  const keys = useMemo(() => [...new Set(Object.values(LIMITERS).flatMap((l) => l.exercises))], []);
  const lib = useQuery({
    queryKey: ['exercises-by-source', keys.join(',')],
    queryFn: () => api.get<{ items: { id: string; sourceKey: string; nameNl: string; nameEn: string }[] }>(`/exercises/by-source?keys=${keys.join(',')}`),
    staleTime: 10 * 60_000,
  });
  const bySource = new Map((lib.data?.items ?? []).map((x) => [x.sourceKey, x]));
  // Proposed: the exercises of every limiter in the result, the strongest first.
  const proposed = [...new Set(result.limiters.flatMap((l) => LIMITERS[l.key].exercises))];
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const chosen = proposed.filter((k) => bySource.has(k) && !unticked.has(k));
  const toggle = (k: string) => setUnticked((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const makeProgram = () => {
    const top = result.limiters[0] ? L(LIMITERS[result.limiters[0].key].name) : '';
    const p = new URLSearchParams({
      oefeningen: chosen.map((k) => bySource.get(k)!.id).join(','),
      titel: `${L(GOALS.find((g) => g.key === goal)!.name)}${top ? ` · ${top}` : ''}`.slice(0, 120),
    });
    if (patient) p.set('patient', patient);
    nav(`/app/programmas/nieuw?${p}`);
  };
  const path = flexPath(goal);
  const [showPath, setShowPath] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><Stethoscope className="h-6 w-6 text-accent" aria-hidden />{t('Lenigheidsonderzoek', 'Flexibility exam')}</span>}
        description={t('Welke spier, zenuw of welk gewricht beperkt de beweging? Differentiatietests met knie, nek en enkel, een uitslag met hoe je het bevestigt, en in één klik een programma. Een hulpmiddel bij je klinisch redeneren, geen diagnose.', 'Which muscle, nerve or joint limits the movement? Differentiation tests with knee, neck and ankle, a result with how to confirm it, and a programme in one click. An aid to clinical reasoning, not a diagnosis.')}
      />

      <div role="radiogroup" aria-label={t('Doel', 'Goal')} className="flex flex-wrap gap-2">
        {GOALS.map((g) => (
          <button key={g.key} type="button" role="radio" aria-checked={goal === g.key} onClick={() => setGoal(g.key)} data-testid={`exam-goal-${g.key}`}
            className={cn('tap min-h-[44px] rounded-full border-2 px-4 text-[14.5px] font-semibold', goal === g.key ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-white text-ink-800 hover:border-ink-300')}>
            {L(g.name)}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <ol className="space-y-3" aria-label={t('Tests', 'Tests')}>
          {qs.map((q, i) => {
            const exam = EXAM[goal][q.key];
            return (
              <li key={`${goal}-${q.key}`} className="rounded-2xl border border-line bg-white p-4 shadow-card" data-testid={`exam-test-${q.key}`}>
                <fieldset>
                  <legend className="flex gap-2 text-[15.5px] font-semibold text-ink-950">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-canvas text-[13px] font-bold text-ink-700">{i + 1}</span>
                    {exam ? L(exam.name) : L(q.text)}
                  </legend>
                  {exam && <p className="mt-1.5 text-[14px] leading-relaxed text-ink-700">{L(exam.how)}</p>}
                  <p className="mt-1.5 text-[13px] text-ink-500">{t('Vraag aan de patiënt', 'Ask the patient')}: “{L(q.text)}”</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {q.answers.map((a) => (
                      <label key={a.key} className={cn('tap inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border-2 px-3 text-[14px] font-semibold focus-within:ring-2 focus-within:ring-accent', answers[q.key] === a.key ? 'border-accent bg-accent-soft text-ink-950' : 'border-line text-ink-800 hover:border-ink-300')}>
                        <input type="radio" name={`${id}-${goal}-${q.key}`} className="sr-only" checked={answers[q.key] === a.key} onChange={() => setAnswers((x) => ({ ...x, [q.key]: a.key }))} />
                        {third(L(a.label))}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ol>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-labelledby={`${id}-res`} data-testid="exam-result">
          <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id={`${id}-res`} className="text-[17px] font-bold">{t('Uitslag', 'Result')}</h2>
              <span className="text-[13px] text-ink-600">{t(`${answered} van ${qs.length} tests`, `${answered} of ${qs.length} tests`)}</span>
            </div>
            <div aria-live="polite" className="mt-3 space-y-3">
              {result.stop && (
                <Notice tone="warn" icon={<AlertTriangle className="h-5 w-5" />} title={t('Neurologische symptomen', 'Neurological symptoms')}>
                  {t('Stop met rekken. Doe een neurologisch onderzoek (kracht, sensibiliteit, reflexen) en verwijs bij progressieve uitval.', 'Stop stretching. Do a neurological examination (strength, sensation, reflexes) and refer with progressive deficit.')}
                </Notice>
              )}
              {answered === 0 ? (
                <p className="text-[14px] text-ink-600">{t('Vul de tests in; de uitslag groeit mee.', 'Fill in the tests; the result grows as you go.')}</p>
              ) : result.limiters.length === 0 ? (
                <p className="text-[14px] text-ink-700">{t('Nog geen duidelijke beperker. Doe de overige tests of start met de opbouw in fases.', 'No clear limiter yet. Do the other tests or start with the phased build-up.')}</p>
              ) : (
                <ul className="space-y-2">
                  {result.limiters.map((l) => {
                    const lim = LIMITERS[l.key];
                    return (
                      <li key={l.key} className={cn('rounded-xl border p-3', lim.joint || lim.nerve ? 'border-warn/40 bg-warn-soft/40' : 'border-line')} data-testid={`exam-limiter-${l.key}`}>
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{L(lim.name)}</span>
                          <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', l.level === 'waarschijnlijk' ? 'bg-accent text-accent-ink' : 'bg-canvas text-ink-700')}>{l.level === 'waarschijnlijk' ? t('waarschijnlijk', 'likely') : t('mogelijk', 'possible')}</span>
                          <span className="text-[12px] text-ink-500">{t(`score ${l.score}`, `score ${l.score}`)}</span>
                        </p>
                        <p className="mt-1 text-[14px] leading-relaxed text-ink-800">{L(LIMITER_CLINICAL[l.key])}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {proposed.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <h3 className="font-semibold">{t('Oefenvoorstel uit je bibliotheek', 'Exercise proposal from your library')}</h3>
              <ul className="mt-2 space-y-1">
                {proposed.map((k) => {
                  const ex = bySource.get(k);
                  const inputId = `${id}-ex-${k}`;
                  return (
                    <li key={k}>
                      {ex ? (
                        <label htmlFor={inputId} className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-[14.5px]">
                          <input id={inputId} type="checkbox" className="h-5 w-5 accent-[rgb(var(--accent))]" checked={!unticked.has(k)} onChange={() => toggle(k)} />
                          <Link to={`/app/oefeningen/${ex.id}`} target="_blank" className="text-ink-900 hover:underline">{nl ? ex.nameNl : ex.nameEn}</Link>
                        </label>
                      ) : (
                        <p className="flex min-h-[40px] items-center gap-2.5 text-[14px] text-ink-500">{EX_NAMES[k] ? L(EX_NAMES[k]) : k} · {t('niet in je bibliotheek', 'not in your library')}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <Button className="mt-3 w-full" disabled={!chosen.length} onClick={makeProgram} icon={<ArrowRight className="h-4 w-4" />} data-testid="exam-make-program">
                {patient ? t(`Programma maken voor deze patiënt (${chosen.length})`, `Make a programme for this patient (${chosen.length})`) : t(`Programma maken (${chosen.length})`, `Make a programme (${chosen.length})`)}
              </Button>
            </div>
          )}

          {path && (
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <button type="button" aria-expanded={showPath} onClick={() => setShowPath(!showPath)} className="tap flex min-h-[44px] w-full items-center justify-between gap-2 text-left font-semibold">
                {t('Opbouw in fases en criteria', 'Phased build-up and criteria')}
                <ChevronDown className={cn('h-4 w-4 text-ink-500 transition-transform', showPath && 'rotate-180')} aria-hidden />
              </button>
              {showPath && (
                <ol className="mt-2 space-y-3" data-testid="exam-path">
                  {path.phases.map((ph, i) => (
                    <li key={i}>
                      <p className="text-[14.5px] font-semibold">{t(`Fase ${i + 1}`, `Phase ${i + 1}`)} · {L(ph.name)} <span className="font-normal text-ink-600">({t('week', 'week')} {ph.weeks}, {ph.perWeek}× {t('per week', 'a week')})</span></p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13.5px] text-ink-700">
                        {ph.criteria.map((c) => <li key={c.key}>{L(c.text)}</li>)}
                      </ul>
                    </li>
                  ))}
                  <li className="text-[13px] text-ink-600">{t('De fases staan als sjablonen in je bibliotheek (Programma’s), en de patiënt ziet dezelfde opbouw bij Mobiliteit.', 'The phases are templates in your library (Programmes), and the patient sees the same build-up under Mobility.')}</li>
                </ol>
              )}
            </div>
          )}

          {answered > 0 && <Button variant="secondary" onClick={() => { setAnswers({}); setUnticked(new Set()); }} icon={<RotateCcw className="h-4 w-4" />}>{t('Opnieuw beginnen', 'Start over')}</Button>}
        </aside>
      </div>
    </div>
  );
}
