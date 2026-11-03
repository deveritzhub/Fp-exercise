import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Brain, Check, ChevronDown, Dumbbell, HeartPulse, Move, Search, Sparkles, X, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Button, ErrorState, Spinner, useToast } from '@/components/ui';
import { ATLAS_REGIONS, LEVEL2_UNLOCK, MUSCLES, NERVES, antagonistsOf, nervesOf, quizQuestions, type AtlasExerciseKind, type AtlasRegion, type Muscle, type NerveKey, type QuizQuestion } from '@shared/muscleAtlas';

type AtlasExercise = { id: string; nameNl: string; nameEn: string; kind: AtlasExerciseKind; muscles: string[]; nerve: string | null; movementNl: string; movementEn: string; instructionsNl: string; instructionsEn: string };
type QuizState = { correct: string[]; todayCount: number; dailyCap: number; xpPerAnswer: number; xpPerLevel?: Record<1 | 2, number>; level2?: boolean; xp: number };
type AtlasData = { exercises: AtlasExercise[]; quiz: QuizState };
type From = 'kracht' | 'revalidatie' | 'mobiliteit';

const KIND: Record<AtlasExerciseKind, { nl: string; en: string; icon: typeof Dumbbell }> = {
  kracht: { nl: 'Kracht', en: 'Strength', icon: Dumbbell },
  rek: { nl: 'Rek en mobiliteit', en: 'Stretch and mobility', icon: Move },
  revalidatie: { nl: 'Revalidatie', en: 'Rehabilitation', icon: HeartPulse },
  zenuw: { nl: 'Zenuwmobiliteit', en: 'Nerve mobility', icon: Zap },
};
/** The order of exercise groups depends on the tab you came from. */
const ORDER: Record<From, AtlasExerciseKind[]> = {
  kracht: ['kracht', 'rek', 'revalidatie'],
  mobiliteit: ['rek', 'kracht', 'revalidatie'],
  revalidatie: ['revalidatie', 'kracht', 'rek'],
};

const useAtlas = () => useQuery({ queryKey: ['patient-atlas'], queryFn: () => api.get<AtlasData>('/patient/atlas'), staleTime: 60_000 });

/**
 * Spierenatlas: every main muscle with what it does, its nerve, and the exercises that train or
 * stretch it; nerves with their nerve-mobility exercises; and a quiz that earns hero XP.
 */
export function AtlasPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Spierenatlas', 'Muscle atlas'));
  const [params, setParams] = useSearchParams();
  const from = (['kracht', 'revalidatie', 'mobiliteit'].includes(params.get('van') ?? '') ? params.get('van') : 'kracht') as From;
  const tab = (['spieren', 'zenuwen', 'quiz'].includes(params.get('tab') ?? '') ? params.get('tab') : 'spieren') as 'spieren' | 'zenuwen' | 'quiz';
  const q = useAtlas();
  const setTab = (v: string, extra: Record<string, string> = {}) => setParams({ ...Object.fromEntries(params), tab: v, ...extra }, { replace: true });
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner />;
  const back = from === 'mobiliteit' ? '/p/mobiliteit' : from === 'revalidatie' ? '/p/revalidatie' : '/p/kracht';
  return (
    <div className="space-y-5">
      <Link to={back} className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Terug', 'Back')}</Link>
      <div>
        <h1 className="t-page flex items-center gap-2"><Brain className="h-7 w-7 text-accent" aria-hidden />{t('Spierenatlas', 'Muscle atlas')}</h1>
        <p className="mt-1 text-[15px] text-ink-600">{t('Welke spier doet wat, welke zenuw hoort erbij, en met welke oefeningen train of rek je hem.', 'Which muscle does what, which nerve belongs to it, and which exercises train or stretch it.')}</p>
      </div>
      <div role="tablist" aria-label={t('Onderdeel', 'Section')} className="grid grid-cols-3 gap-1 rounded-xl bg-canvas p-1">
        {([['spieren', t('Spieren', 'Muscles')], ['zenuwen', t('Zenuwen', 'Nerves')], ['quiz', t('Quiz', 'Quiz')]] as const).map(([k, label]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('tap min-h-[44px] rounded-lg text-[14.5px] font-semibold', tab === k ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-600')}>{label}</button>
        ))}
      </div>
      {tab === 'spieren' && <MusclesView data={q.data} from={from} focus={params.get('open')} onQuiz={(m) => setTab('quiz', { spier: m })} onNerve={(n) => setTab('zenuwen', { zenuw: n })} onMuscle={(m) => setTab('spieren', { open: m })} />}
      {tab === 'zenuwen' && <NervesView data={q.data} focus={params.get('zenuw')} onMuscle={(m) => setTab('spieren', { open: m })} />}
      {tab === 'quiz' && <QuizView data={q.data} muscle={params.get('spier')} onAll={() => { params.delete('spier'); setParams(params, { replace: true }); }} />}
      <p className="text-[12.5px] text-ink-500">{t('Uitleg over je lichaam, geen diagnose of behandeladvies. Twijfel je bij een oefening? Vraag het je fysiotherapeut.', 'Explanation about your body, not a diagnosis or treatment advice. In doubt about an exercise? Ask your physiotherapist.')}</p>
    </div>
  );
}

function MusclesView({ data, from, focus, onQuiz, onNerve, onMuscle }: { data: AtlasData; from: From; focus: string | null; onQuiz: (muscle: string) => void; onNerve: (nerve: string) => void; onMuscle: (muscle: string) => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [region, setRegion] = useState<AtlasRegion | 'alle'>('alle');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(focus);
  // Opened from a nerve or an antagonist: show that muscle, whatever the filters were.
  useEffect(() => {
    if (!focus) return;
    setRegion('alle');
    setQuery('');
    setOpen(focus);
    requestAnimationFrame(() => document.getElementById(`spier-${focus}`)?.scrollIntoView({ block: 'start' }));
  }, [focus]);
  const qn = query.trim().toLowerCase();
  const list = MUSCLES.filter((m) => (region === 'alle' || m.region === region) && (!qn || [m.nl, m.en, m.latin, ...m.functions.map((f) => f[nl ? 0 : 1])].some((s) => s.toLowerCase().includes(qn))));
  return (
    <section aria-label={t('Spieren', 'Muscles')} className="space-y-3">
      <label className="flex min-h-[48px] items-center gap-2 rounded-xl border border-line bg-white px-3">
        <Search className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
        <span className="sr-only">{t('Zoek een spier of beweging', 'Search a muscle or movement')}</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Zoek spier of beweging, bijv. "elleboog buigen"', 'Search muscle or movement, e.g. "bend elbow"')} className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label={t('Zoekveld leegmaken', 'Clear search')} className="tap flex h-9 w-9 items-center justify-center rounded-lg"><X className="h-4 w-4" /></button>}
      </label>
      <div role="group" aria-label={t('Lichaamsdeel', 'Body part')} className="flex flex-wrap gap-1.5">
        {[{ key: 'alle' as const, nl: 'Alles', en: 'All' }, ...ATLAS_REGIONS].map((r) => (
          <button key={r.key} type="button" aria-pressed={region === r.key} onClick={() => setRegion(r.key)} className={cn('tap min-h-[40px] rounded-full border px-3 text-[13.5px] font-medium', region === r.key ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-white text-ink-700')}>{nl ? r.nl : r.en}</button>
        ))}
      </div>
      {list.length === 0 && <p className="rounded-xl bg-canvas p-3 text-[14px] text-ink-700">{t('Geen spier gevonden. Probeer een ander woord.', 'No muscle found. Try another word.')}</p>}
      <ul className="space-y-2">
        {list.map((m) => <MuscleCard key={m.key} m={m} data={data} from={from} open={open === m.key} onToggle={() => setOpen(open === m.key ? null : m.key)} onQuiz={() => onQuiz(m.key)} onNerve={onNerve} onMuscle={onMuscle} />)}
      </ul>
    </section>
  );
}

function MuscleCard({ m, data, from, open, onToggle, onQuiz, onNerve, onMuscle }: { m: Muscle; data: AtlasData; from: From; open: boolean; onToggle: () => void; onQuiz: () => void; onNerve: (nerve: string) => void; onMuscle: (muscle: string) => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const nerve = NERVES.find((n) => n.key === m.nerve)!;
  // Exercises where this muscle is the main target first, then where it helps.
  const exs = data.exercises.filter((e) => e.muscles.includes(m.key) && e.kind !== 'zenuw').sort((a, b) => a.muscles.indexOf(m.key) - b.muscles.indexOf(m.key));
  const done = quizQuestions().filter((q) => q.muscle === m.key && !q.id.startsWith('zenuw:'));
  const doneCount = done.filter((q) => data.quiz.correct.includes(q.id)).length;
  const region = ATLAS_REGIONS.find((r) => r.key === m.region)!;
  return (
    <li id={`spier-${m.key}`} className="scroll-mt-20 rounded-2xl border border-line bg-white shadow-card">
      <button type="button" aria-expanded={open} onClick={onToggle} className="tap flex w-full items-center gap-3 p-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink-900">{nl ? m.nl : m.en}</span>
          <span className="block text-[13px] italic text-ink-500">{m.latin}</span>
          <span className="mt-0.5 block truncate text-[13.5px] text-ink-700">{m.functions.map((f) => (nl ? f[0] : f[1])).join(' · ')}</span>
        </span>
        {doneCount === done.length && done.length > 0 && <span className="shrink-0 rounded-full bg-ok-soft px-2 py-0.5 text-[12px] font-semibold text-ok">{t('Quiz ✓', 'Quiz ✓')}</span>}
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-ink-500 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="space-y-4 border-t border-line p-4">
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink-600">{t('Wat doet hij?', 'What does it do?')}</h3>
            <ul className="mt-1 space-y-0.5 text-[14.5px] text-ink-900">{m.functions.map((f) => <li key={f[0]}>• {nl ? f[0] : f[1]}</li>)}</ul>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-[14px]">
            <div className="rounded-xl bg-canvas p-2.5">
              <dt className="text-[12px] font-semibold text-ink-600">{t('Zenuw', 'Nerve')}</dt>
              <dd className="font-medium text-ink-900">
                <button type="button" onClick={() => onNerve(m.nerve)} className="inline-flex min-h-[44px] items-center gap-1 text-left text-accent underline-offset-2 hover:underline"><Zap className="h-3.5 w-3.5 shrink-0" aria-hidden />{nl ? nerve.nl : nerve.en}</button>
                {(m.also ?? []).length > 0 && (
                  <span className="block text-[12px] text-ink-600">{t('ook:', 'also:')} {(m.also ?? []).map((k, i) => { const n = NERVES.find((x) => x.key === k)!; return <span key={k}>{i > 0 && ', '}<button type="button" onClick={() => onNerve(k)} className="inline-flex min-h-[32px] items-center text-accent hover:underline">{nl ? n.nl : n.en}</button></span>; })}</span>
                )}
              </dd>
            </div>
            <div className="rounded-xl bg-canvas p-2.5"><dt className="text-[12px] font-semibold text-ink-600">{t('Waar', 'Where')}</dt><dd className="font-medium text-ink-900">{nl ? region.nl : region.en}</dd></div>
          </dl>
          {antagonistsOf(m.key).length > 0 && (
            <div className="rounded-xl border border-line p-2.5 text-[14px]">
              <p className="text-[12px] font-semibold text-ink-600">{t('Tegenspeler (antagonist)', 'Antagonist')}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-3">
                {antagonistsOf(m.key).map((k) => { const a = MUSCLES.find((x) => x.key === k)!; return <button key={k} type="button" onClick={() => onMuscle(k)} className="inline-flex min-h-[44px] items-center font-medium text-accent hover:underline">{nl ? a.nl : a.en}</button>; })}
              </p>
              <p className="text-[12.5px] text-ink-600">{t('Doet de tegengestelde beweging. Train je de ene, vergeet de andere niet.', 'Does the opposite movement. Train one, do not forget the other.')}</p>
            </div>
          )}
          <div className="space-y-3">
            {ORDER[from].map((kind) => {
              const list = exs.filter((e) => e.kind === kind);
              const K = KIND[kind];
              return (
                <div key={kind}>
                  <h3 className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900"><K.icon className="h-4 w-4 text-accent" aria-hidden />{nl ? K.nl : K.en} <span className="font-normal text-ink-500">({list.length})</span></h3>
                  {list.length === 0 ? (
                    <p className="mt-1 text-[13.5px] text-ink-600">{t('Nog geen oefening in je bibliotheek.', 'No exercise in your library yet.')}</p>
                  ) : (
                    <ul className="mt-1 space-y-1">{list.slice(0, 8).map((e) => <ExerciseRow key={e.id} e={e} />)}</ul>
                  )}
                </div>
              );
            })}
          </div>
          <Button variant="secondary" onClick={onQuiz} icon={<Sparkles className="h-4 w-4" aria-hidden />}>{t(`Quiz over deze spier (${doneCount}/${done.length})`, `Quiz on this muscle (${doneCount}/${done.length})`)}</Button>
        </div>
      )}
    </li>
  );
}

function ExerciseRow({ e }: { e: AtlasExercise }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const how = nl ? e.movementNl || e.instructionsNl : e.movementEn || e.instructionsEn;
  const tips = nl ? e.instructionsNl : e.instructionsEn;
  return (
    <li>
      <details className="group rounded-xl border border-line">
        <summary className="tap flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-3 py-2 text-[14.5px] text-ink-900">
          <span className="min-w-0 flex-1">{nl ? e.nameNl : e.nameEn}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-500 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-1 px-3 pb-3 text-[13.5px] text-ink-700">
          {how ? <p>{how}</p> : <p className="text-ink-500">{t('Vraag je fysiotherapeut hoe je deze oefening doet.', 'Ask your physiotherapist how to do this exercise.')}</p>}
          {tips && tips !== how && <p className="text-ink-600">{tips}</p>}
        </div>
      </details>
    </li>
  );
}

function NervesView({ data, focus, onMuscle }: { data: AtlasData; focus: string | null; onMuscle: (muscle: string) => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  useEffect(() => {
    if (focus) requestAnimationFrame(() => document.getElementById(`zenuw-${focus}`)?.scrollIntoView({ block: 'start' }));
  }, [focus]);
  // Nerves with a muscle in the atlas or an exercise; the main limb nerves first.
  const main: NerveKey[] = ['radialis', 'medianus', 'ulnaris', 'musculocutaneus', 'axillaris', 'ischiadicus', 'tibialis', 'fibularis', 'femoralis'];
  const nerves = [...NERVES].sort((a, b) => (main.indexOf(a.key) + 1 || 99) - (main.indexOf(b.key) + 1 || 99));
  return (
    <section aria-label={t('Zenuwen', 'Nerves')} className="space-y-2">
      <p className="text-[14px] text-ink-700">{t('Een zenuw stuurt spieren aan. Met zenuwmobiliteit (sliders) laat je een zenuw rustig heen en weer glijden: zonder door te drukken, en stoppen bij scherpe of uitstralende klachten.', 'A nerve drives muscles. With nerve mobility (sliders) you let a nerve glide gently back and forth: without forcing, and stop at sharp or radiating symptoms.')}</p>
      <ul className="space-y-2">
        {nerves.map((n) => {
          const muscles = MUSCLES.filter((m) => nervesOf(m).includes(n.key));
          const own = MUSCLES.filter((m) => m.nerve === n.key);
          const exs = data.exercises.filter((e) => e.nerve === n.key);
          if (!muscles.length && !exs.length) return null;
          return (
            <li key={n.key} id={`zenuw-${n.key}`} className={cn('scroll-mt-20 rounded-2xl border bg-white p-4 shadow-card', focus === n.key ? 'border-2 border-accent' : 'border-line')}>
              <h3 className="flex items-center gap-1.5 font-semibold text-ink-900"><Zap className="h-4 w-4 text-accent" aria-hidden />{nl ? n.nl : n.en}</h3>
              <p className="text-[13px] text-ink-600">{nl ? n.areaNl : n.areaEn}</p>
              {muscles.length > 0 && (
                <div className="mt-2">
                  <p className="text-[13px] font-medium text-ink-800">{t(`Stuurt aan (${muscles.length})`, `Drives (${muscles.length})`)}</p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {muscles.map((m) => (
                      <li key={m.key}>
                        <button type="button" onClick={() => onMuscle(m.key)} className={cn('tap inline-flex min-h-[40px] items-center rounded-full border px-3 text-[13.5px]', own.includes(m) ? 'border-accent/40 bg-accent-soft font-medium text-accent' : 'border-line bg-white text-ink-700')}>
                          {nl ? m.nl : m.en}{!own.includes(m) && <span className="ml-1 text-[12px] text-ink-500">({t('deels', 'partly')})</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {exs.length > 0 ? (
                <ul className="mt-2 space-y-1">{exs.map((e) => <ExerciseRow key={e.id} e={e} />)}</ul>
              ) : (
                <p className="mt-1.5 text-[13px] text-ink-500">{t('Geen aparte zenuwoefening.', 'No separate nerve exercise.')}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function QuizView({ data, muscle, onAll }: { data: AtlasData; muscle: string | null; onAll: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const all = useMemo(() => quizQuestions(), []);
  const muscleLevel = muscle ? (MUSCLES.find((x) => x.key === muscle)?.level ?? 1) : null;
  const [levelPick, setLevelPick] = useState<1 | 2>(1);
  const level = muscleLevel ?? levelPick;
  const open2 = !!data.quiz.level2;
  const l1 = all.filter((x) => x.level === 1);
  const l1Done = l1.filter((x) => data.quiz.correct.includes(x.id)).length;
  const need = Math.ceil(l1.length * LEVEL2_UNLOCK);
  const locked = level === 2 && !open2;
  const pool = locked ? [] : muscle ? all.filter((q) => q.muscle === muscle && !q.id.startsWith('zenuw:')) : all.filter((q) => q.level === level);
  const levelAll = all.filter((q) => q.level === level);
  const xpHere = data.quiz.xpPerLevel?.[level] ?? data.quiz.xpPerAnswer;
  const [skipped, setSkipped] = useState<string[]>([]);
  const [current, setCurrent] = useState<QuizQuestion | null>(null);
  const [result, setResult] = useState<{ correct: boolean; answer: string; picked: string; explain: [string, string]; xp: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const todo = pool.filter((q) => !data.quiz.correct.includes(q.id));
  // The next open question, rotating past the ones you skipped or just answered.
  const next = todo.find((q) => !skipped.includes(q.id) && q.id !== current?.id) ?? todo.find((q) => q.id !== current?.id) ?? null;
  const q = current ?? next;
  const m = muscle ? MUSCLES.find((x) => x.key === muscle) : null;
  const capped = data.quiz.todayCount >= data.quiz.dailyCap;

  const answer = async (opt: string) => {
    if (!q || result) return;
    setBusy(true);
    try {
      const r = await api.post<{ correct: boolean; answer: string; explain: [string, string]; xp: number; quiz: QuizState }>('/patient/atlas/quiz', { questionId: q.id, answer: opt });
      setCurrent(q);
      setResult({ correct: r.correct, answer: r.answer, picked: opt, explain: r.explain, xp: r.xp });
      qc.setQueryData<AtlasData>(['patient-atlas'], (old) => (old ? { ...old, quiz: r.quiz } : old));
      if (r.xp) void qc.invalidateQueries({ queryKey: ['patient-hero'] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  const goNext = () => {
    if (q && !result?.correct) setSkipped((s) => [...s.filter((x) => x !== q.id), q.id]);
    setResult(null);
    setCurrent(null);
  };

  return (
    <section aria-label={t('Quiz', 'Quiz')} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[13.5px]">
        <span className="rounded-full bg-accent-soft px-3 py-1 font-semibold text-accent">{t(`Level ${level}: ${levelAll.filter((x) => data.quiz.correct.includes(x.id)).length} van ${levelAll.length} goed`, `Level ${level}: ${levelAll.filter((x) => data.quiz.correct.includes(x.id)).length} of ${levelAll.length} right`)}</span>
        <span className="rounded-full bg-sand-soft px-3 py-1 font-semibold text-sand-ink">{t(`Vandaag ${data.quiz.todayCount}/${data.quiz.dailyCap} met XP`, `Today ${data.quiz.todayCount}/${data.quiz.dailyCap} with XP`)}</span>
        <span className="text-ink-600">{t(`+${xpHere} XP per nieuw goed antwoord`, `+${xpHere} XP per new right answer`)}</span>
      </div>
      {!muscle && (
        <div role="group" aria-label={t('Quizniveau', 'Quiz level')} className="grid grid-cols-2 gap-2">
          {([1, 2] as const).map((lv) => (
            <button key={lv} type="button" aria-pressed={level === lv} onClick={() => { setLevelPick(lv); setResult(null); setCurrent(null); }}
              className={cn('tap min-h-[48px] rounded-xl border-2 px-3 text-left text-[14px] font-semibold', level === lv ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-white text-ink-800')}>
              {t(`Level ${lv}`, `Level ${lv}`)}
              <span className="block text-[12px] font-normal text-ink-600">{lv === 1 ? t('De basis', 'The basics') : open2 ? t('Meer spieren, moeilijkere vragen', 'More muscles, harder questions') : t(`Op slot · ${l1Done}/${need}`, `Locked · ${l1Done}/${need}`)}</span>
            </button>
          ))}
        </div>
      )}
      {m && (
        <p className="flex items-center justify-between gap-2 text-[14px] text-ink-700">
          <span>{t('Vragen over', 'Questions about')} <strong>{nl ? m.nl : m.en}</strong></span>
          <button type="button" onClick={() => { onAll(); setResult(null); setCurrent(null); }} className="inline-flex min-h-[44px] items-center font-medium text-accent">{t('Alle vragen', 'All questions')}</button>
        </p>
      )}
      {capped && <p className="rounded-xl bg-canvas p-3 text-[13.5px] text-ink-700">{t('Je daglimiet voor XP is bereikt. Je kunt gewoon verder oefenen; je goede antwoorden tellen morgen weer mee.', 'You reached today’s XP limit. You can keep practising; right answers count again tomorrow.')}</p>}
      {locked ? (
        <div className="rounded-2xl border border-line bg-canvas p-5 text-center">
          <p className="font-display text-[18px] font-bold text-ink-900">{t('Level 2 zit nog op slot', 'Level 2 is still locked')}</p>
          <p className="mt-1 text-[14px] text-ink-700">{t(`Beantwoord eerst ${need} vragen van level 1 goed. Je hebt er nu ${l1Done}.`, `First answer ${need} level 1 questions right. You have ${l1Done} now.`)}</p>
          {muscle ? <Button variant="secondary" className="mt-3" onClick={onAll}>{t('Naar level 1', 'To level 1')}</Button> : <Button variant="secondary" className="mt-3" onClick={() => setLevelPick(1)}>{t('Naar level 1', 'To level 1')}</Button>}
        </div>
      ) : !q ? (
        <div className="rounded-2xl border border-ok/30 bg-ok-soft p-5 text-center">
          <p className="font-display text-[18px] font-bold text-ok">{t('Alles goed beantwoord! 🎉', 'All answered correctly! 🎉')}</p>
          {m && <Button variant="secondary" className="mt-3" onClick={onAll}>{t('Naar alle vragen', 'To all questions')}</Button>}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <p id="quiz-q" className="font-display text-[18px] font-bold leading-snug text-ink-950">{nl ? q.q[0] : q.q[1]}</p>
          <ul className="mt-3 space-y-2" aria-labelledby="quiz-q">
            {q.options.map((o) => {
              const isAnswer = result && o.id === result.answer;
              const isWrongPick = result && !result.correct && o.id === result.picked;
              return (
                <li key={o.id}>
                  <button type="button" disabled={busy || !!result} onClick={() => answer(o.id)}
                    className={cn('tap flex min-h-[52px] w-full items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-[15px]', isAnswer ? 'border-ok bg-ok-soft font-semibold text-ok' : isWrongPick ? 'border-bad bg-bad-soft text-bad' : 'border-line bg-white text-ink-900')}>
                    <span className="min-w-0 flex-1">{nl ? o.label[0] : o.label[1]}</span>
                    {isAnswer && <Check className="h-5 w-5 shrink-0" aria-label={t('Goed antwoord', 'Right answer')} />}
                    {isWrongPick && <X className="h-5 w-5 shrink-0" aria-label={t('Jouw antwoord', 'Your answer')} />}
                  </button>
                </li>
              );
            })}
          </ul>
          {result && (
            <div className={cn('mt-3 rounded-xl p-3 text-[14px]', result.correct ? 'bg-ok-soft text-ink-900' : 'bg-canvas text-ink-900')} role="status">
              <p className="font-semibold">{result.correct ? (result.xp ? t(`Goed! +${result.xp} XP`, `Right! +${result.xp} XP`) : t('Goed!', 'Right!')) : t('Bijna. Het goede antwoord staat groen.', 'Almost. The right answer is in green.')}</p>
              <p className="mt-0.5">{nl ? result.explain[0] : result.explain[1]}</p>
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <Button onClick={goNext} variant={result ? 'primary' : 'ghost'}>{result ? t('Volgende vraag', 'Next question') : t('Overslaan', 'Skip')}</Button>
          </div>
        </div>
      )}
    </section>
  );
}
