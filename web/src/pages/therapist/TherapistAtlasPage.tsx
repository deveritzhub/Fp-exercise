import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Brain, ChevronDown, Dumbbell, HeartPulse, Move, Plus, Search, Send, X, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Button, Dialog, ErrorState, PageHeader, Select, Spinner, Textarea, useToast } from '@/components/ui';
import { QuickAddSheet } from '@/components/app/QuickAdd';
import type { Exercise, PatientListItem } from '@/lib/types';
import { ATLAS_REGIONS, MUSCLES, NERVES, antagonistsOf, nervesOf, type AtlasExerciseKind, type AtlasRegion, type Muscle } from '@shared/muscleAtlas';

type AtlasExercise = { id: string; nameNl: string; nameEn: string; kind: AtlasExerciseKind; muscles: string[]; nerve: string | null; own: boolean };

const KIND: Record<AtlasExerciseKind, { nl: string; en: string; icon: typeof Dumbbell; category: string }> = {
  kracht: { nl: 'Kracht', en: 'Strength', icon: Dumbbell, category: 'strength' },
  rek: { nl: 'Rek en mobiliteit', en: 'Stretch and mobility', icon: Move, category: 'mobility' },
  revalidatie: { nl: 'Revalidatie en motorische controle', en: 'Rehab and motor control', icon: HeartPulse, category: 'motor_control' },
  zenuw: { nl: 'Zenuwmobiliteit', en: 'Nerve mobility', icon: Zap, category: 'neurodynamics' },
};
const MUSCLE_KINDS: AtlasExerciseKind[] = ['kracht', 'rek', 'revalidatie'];
/** The library's body region for a new exercise made from an atlas region. */
const BODY_REGION: Record<AtlasRegion, string> = {
  nek: 'cervical_spine', schouder: 'shoulder', borst: 'shoulder', bovenarm: 'elbow', onderarm: 'wrist_hand',
  buik: 'lumbar_spine', rug: 'lumbar_spine', heup: 'hip', bovenbeen: 'knee', onderbeen: 'ankle_foot',
};
const newExerciseHref = (m: Muscle | null, kind: AtlasExerciseKind, regio?: string) =>
  `/app/oefeningen/nieuw?${new URLSearchParams({ ...(m ? { spier: m.latin, regio: BODY_REGION[m.region] } : {}), ...(regio ? { regio } : {}), soort: KIND[kind].category })}`;

/**
 * Muscle atlas for professionals: per muscle what it does and its nerve, every exercise of the
 * practice and central library that works it (one tap to add it to a programme), and the gaps:
 * a muscle without a strength or stretch exercise gets a prefilled "new exercise" link.
 */
export function TherapistAtlasPage() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  useDocumentMeta(t('Spierenatlas', 'Muscle atlas'));
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'zenuwen' ? 'zenuwen' : 'spieren';
  const focusMuscle = params.get('spier');
  const focusNerve = params.get('zenuw');
  const q = useQuery({ queryKey: ['staff-atlas'], queryFn: () => api.get<{ exercises: AtlasExercise[] }>('/atlas'), staleTime: 60_000 });
  const toast = useToast();
  const [adding, setAdding] = useState<Exercise | null>(null);
  const add = async (id: string) => {
    try {
      setAdding(await api.get<Exercise>(`/exercises/${id}`));
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    }
  };
  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2"><Brain className="h-6 w-6 text-accent" aria-hidden />{t('Spierenatlas', 'Muscle atlas')}</span>}
        description={t('Per spier de functie, de zenuw en alle oefeningen uit je bibliotheek. Zie meteen waar je bibliotheek nog dun is.', 'Per muscle its function, nerve and every exercise in your library. See at once where your library is thin.')}
      />
      <div role="tablist" aria-label={t('Onderdeel', 'Section')} className="mb-4 grid max-w-sm grid-cols-2 gap-1 rounded-xl bg-canvas p-1">
        {([['spieren', t('Spieren', 'Muscles')], ['zenuwen', t('Zenuwen', 'Nerves')]] as const).map(([k, label]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setParams(k === 'spieren' ? {} : { tab: k }, { replace: true })} className={cn('tap min-h-[44px] rounded-lg text-[14.5px] font-semibold', tab === k ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-600')}>{label}</button>
        ))}
      </div>
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data ? <Spinner /> : tab === 'spieren' ? (
        <Muscles exercises={q.data.exercises} focus={focusMuscle} onAdd={add} nl={nl} />
      ) : (
        <Nerves exercises={q.data.exercises} focus={focusNerve} onAdd={add} nl={nl} />
      )}
      <QuickAddSheet exercise={adding} open={!!adding} onClose={() => setAdding(null)} />
    </>
  );
}

function Muscles({ exercises, focus, onAdd, nl }: { exercises: AtlasExercise[]; focus: string | null; onAdd: (id: string) => void; nl: boolean }) {
  const { t } = useI18n();
  const [region, setRegion] = useState<AtlasRegion | 'alle'>('alle');
  const [query, setQuery] = useState('');
  const [gapsOnly, setGapsOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(focus);
  const [sending, setSending] = useState<Muscle | null>(null);
  useEffect(() => {
    if (!focus) return;
    // Jumped here (from a nerve, an antagonist or an exercise): show it whatever the filters were.
    setRegion('alle');
    setQuery('');
    setGapsOnly(false);
    setOpen(focus);
    requestAnimationFrame(() => document.getElementById(`spier-${focus}`)?.scrollIntoView({ block: 'start' }));
  }, [focus]);
  const forMuscle = (m: Muscle) => exercises.filter((e) => e.muscles.includes(m.key) && e.kind !== 'zenuw');
  const gaps = (m: Muscle) => (['kracht', 'rek'] as const).filter((k) => !forMuscle(m).some((e) => e.kind === k));
  const withGaps = MUSCLES.filter((m) => gaps(m).length > 0).length;
  const qn = query.trim().toLowerCase();
  const list = MUSCLES.filter((m) => (region === 'alle' || m.region === region) && (!gapsOnly || gaps(m).length > 0)
    && (!qn || [m.nl, m.en, m.latin, ...m.functions.map((f) => f[nl ? 0 : 1])].some((s) => s.toLowerCase().includes(qn))));
  return (
    <section aria-label={t('Spieren', 'Muscles')} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex min-h-[48px] flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3">
          <Search className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
          <span className="sr-only">{t('Zoek een spier of beweging', 'Search a muscle or movement')}</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Zoek spier of beweging, bijv. "exorotatie"', 'Search muscle or movement, e.g. "external rotation"')} className="min-w-0 flex-1 bg-transparent text-[16px] outline-none" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label={t('Zoekveld leegmaken', 'Clear search')} className="tap flex h-9 w-9 items-center justify-center rounded-lg"><X className="h-4 w-4" /></button>}
        </label>
        <button type="button" aria-pressed={gapsOnly} onClick={() => setGapsOnly((v) => !v)} className={cn('tap inline-flex min-h-[48px] items-center gap-2 rounded-xl border px-3 text-[14px] font-semibold', gapsOnly ? 'border-warn bg-warn-soft text-warn' : 'border-line bg-white text-ink-700')}>
          <AlertCircle className="h-4 w-4" aria-hidden />{t(`Gaten in je bibliotheek (${withGaps})`, `Gaps in your library (${withGaps})`)}
        </button>
      </div>
      <div role="group" aria-label={t('Lichaamsdeel', 'Body part')} className="flex flex-wrap gap-1.5">
        {[{ key: 'alle' as const, nl: 'Alles', en: 'All' }, ...ATLAS_REGIONS].map((r) => (
          <button key={r.key} type="button" aria-pressed={region === r.key} onClick={() => setRegion(r.key)} className={cn('tap min-h-[40px] rounded-full border px-3 text-[13.5px] font-medium', region === r.key ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-white text-ink-700')}>{nl ? r.nl : r.en}</button>
        ))}
      </div>
      {list.length === 0 && <p className="rounded-xl bg-canvas p-3 text-[14px] text-ink-700">{t('Geen spier gevonden.', 'No muscle found.')}</p>}
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 lg:grid-cols-[repeat(2,minmax(0,1fr))] lg:items-start">
        {list.map((m) => {
          const exs = forMuscle(m).sort((a, b) => a.muscles.indexOf(m.key) - b.muscles.indexOf(m.key));
          const g = gaps(m);
          const nerve = NERVES.find((n) => n.key === m.nerve)!;
          const isOpen = open === m.key;
          return (
            <li key={m.key} id={`spier-${m.key}`} className="scroll-mt-20 rounded-2xl border border-line bg-white shadow-card">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : m.key)} className="tap flex w-full items-center gap-3 p-4 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink-900">{nl ? m.nl : m.en} <span className="font-normal italic text-ink-500">· {m.latin}</span></span>
                  <span className="mt-0.5 block truncate text-[13.5px] text-ink-700">{m.functions.map((f) => (nl ? f[0] : f[1])).join(' · ')}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5 text-[12px]">
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-ink-700">{nl ? nerve.nl : nerve.en}</span>
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-ink-700">{t(`${exs.length} oefeningen`, `${exs.length} exercises`)}</span>
                    {g.map((k) => <span key={k} className="rounded-full bg-warn-soft px-2 py-0.5 font-semibold text-warn">{t(`Geen ${KIND[k].nl.toLowerCase()}`, `No ${KIND[k].en.toLowerCase()}`)}</span>)}
                  </span>
                </span>
                <ChevronDown className={cn('h-5 w-5 shrink-0 text-ink-500 transition-transform', isOpen && 'rotate-180')} aria-hidden />
              </button>
              {isOpen && (
                <div className="space-y-4 border-t border-line p-4">
                  <div className="grid gap-2 text-[14px] sm:grid-cols-2">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-600">{t('Functies', 'Functions')}</p>
                      <ul className="mt-1 space-y-0.5 text-ink-900">{m.functions.map((f) => <li key={f[0]}>• {nl ? f[0] : f[1]}</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-600">{t('Innervatie', 'Innervation')}</p>
                      <p className="mt-1 text-ink-900">
                        <Link to={`/app/spieren?tab=zenuwen&zenuw=${m.nerve}`} className="inline-flex min-h-[40px] items-center gap-1 font-medium text-accent hover:underline"><Zap className="h-3.5 w-3.5" aria-hidden />{nl ? nerve.nl : nerve.en}</Link>
                        {(m.also ?? []).length > 0 && <span className="block text-[13px] text-ink-600">{t('ook:', 'also:')} {(m.also ?? []).map((k, i) => { const n = NERVES.find((x) => x.key === k)!; return <span key={k}>{i > 0 && ', '}<Link to={`/app/spieren?tab=zenuwen&zenuw=${k}`} className="text-accent hover:underline">{nl ? n.nl : n.en}</Link></span>; })}</span>}
                      </p>
                    </div>
                  </div>
                  {antagonistsOf(m.key).length > 0 && (
                    <div className="rounded-xl border border-line p-3 text-[14px]">
                      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-600">{t('Tegenspeler (antagonist)', 'Antagonist')}</p>
                      <ul className="mt-1 space-y-1">
                        {antagonistsOf(m.key).map((k) => {
                          const a = MUSCLES.find((x) => x.key === k)!;
                          const mine = exs.filter((e) => e.kind === 'kracht').length;
                          const theirs = exercises.filter((e) => e.muscles.includes(k) && e.kind === 'kracht').length;
                          const off = Math.max(mine, theirs) >= 3 && Math.min(mine, theirs) * 3 <= Math.max(mine, theirs);
                          return (
                            <li key={k} className="flex flex-wrap items-center gap-x-2">
                              <Link to={`/app/spieren?spier=${k}`} className="inline-flex min-h-[40px] items-center font-medium text-accent hover:underline">{nl ? a.nl : a.en}</Link>
                              <span className={cn('text-[13px]', off ? 'font-semibold text-warn' : 'text-ink-600')}>
                                {t(`Krachtoefeningen: ${mine} hier, ${theirs} voor de ${a.nl.toLowerCase()}`, `Strength exercises: ${mine} here, ${theirs} for the ${a.en.toLowerCase()}`)}{off && t(' · scheef verdeeld', ' · unbalanced')}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {MUSCLE_KINDS.map((kind) => <KindGroup key={kind} kind={kind} list={exs.filter((e) => e.kind === kind)} newHref={newExerciseHref(m, kind)} onAdd={onAdd} nl={nl} />)}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <Button variant="secondary" icon={<Send className="h-4 w-4" aria-hidden />} onClick={() => setSending(m)}>{t('Stuur naar patiënt', 'Send to a patient')}</Button>
                    <Link to={`/app/oefeningen?muscle=${m.key}`} className="inline-flex min-h-[44px] items-center gap-1 text-[14.5px] font-medium text-accent">{t('Alle oefeningen voor deze spier in de bibliotheek', 'All exercises for this muscle in the library')}</Link>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <SendMuscleDialog muscle={sending} onClose={() => setSending(null)} />
    </section>
  );
}

/** Send a muscle card to a patient: it arrives as a message on their Vandaag, opening the card. */
function SendMuscleDialog({ muscle, onClose }: { muscle: Muscle | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [patientId, setPatientId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useQuery({ queryKey: ['patients', 'atlas-send'], queryFn: () => api.get<{ items: PatientListItem[] }>('/patients?status=active&scope=practice'), enabled: !!muscle });
  useEffect(() => {
    if (muscle) { setPatientId(''); setNote(''); }
  }, [muscle]);
  if (!muscle) return null;
  const patients = list.data?.items ?? [];
  const chosen = patients.find((p) => p.id === patientId);
  const send = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ delivered: boolean }>('/atlas/send', { patientId, muscle: muscle.key, note });
      toast(r.delivered ? t('Verstuurd: de patiënt ziet het op Vandaag', 'Sent: the patient sees it on Today') : t('De patiënt heeft nog geen account; het bericht komt niet aan', 'The patient has no account yet; the message does not arrive'), r.delivered ? 'ok' : 'bad');
      if (r.delivered) onClose();
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title={t(`Stuur "${muscle.nl}" naar een patiënt`, `Send "${muscle.en}" to a patient`)} description={t('De patiënt krijgt een bericht op Vandaag dat deze spierkaart opent.', 'The patient gets a message on Today that opens this muscle card.')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Annuleren', 'Cancel')}</Button><Button onClick={send} loading={busy} disabled={!patientId} icon={<Send className="h-4 w-4" aria-hidden />}>{t('Versturen', 'Send')}</Button></>}>
      <div className="space-y-3">
        <Select label={t('Patiënt', 'Patient')} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">{list.isLoading ? t('Laden…', 'Loading…') : t('Kies een patiënt', 'Choose a patient')}</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.hasAccount ? '' : t(' (nog geen account)', ' (no account yet)')}</option>)}
        </Select>
        {chosen && !chosen.hasAccount && <p className="text-[13px] text-warn">{t('Deze patiënt heeft de uitnodiging nog niet geaccepteerd.', 'This patient has not accepted the invitation yet.')}</p>}
        <Textarea label={t('Korte toelichting (optioneel)', 'Short note (optional)')} maxLength={200} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Bijv. "Deze spier trainen we met de bilbrug."', 'E.g. "We train this muscle with the glute bridge."')} />
        <p className="text-[12.5px] text-ink-600">{t('Zet hier geen diagnose of medische details in; het bericht is een herinnering, geen dossier.', 'Do not put a diagnosis or medical details here; the message is a reminder, not a record.')}</p>
      </div>
    </Dialog>
  );
}

function KindGroup({ kind, list, newHref, onAdd, nl }: { kind: AtlasExerciseKind; list: AtlasExercise[]; newHref: string; onAdd: (id: string) => void; nl: boolean }) {
  const { t } = useI18n();
  const K = KIND[kind];
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900"><K.icon className="h-4 w-4 text-accent" aria-hidden />{nl ? K.nl : K.en} <span className="font-normal text-ink-500">({list.length})</span></h3>
      {list.length === 0 ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13.5px] text-ink-600">
          {t('Nog geen oefening in je bibliotheek.', 'No exercise in your library yet.')}
          <Link to={newHref} className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-accent"><Plus className="h-4 w-4" aria-hidden />{t('Nieuwe oefening maken', 'Create a new exercise')}</Link>
        </p>
      ) : (
        <ul className="mt-1 divide-y divide-line rounded-xl border border-line">
          {list.slice(0, 12).map((e) => (
            <li key={e.id} className="flex items-center gap-2 px-3 py-1.5">
              <Link to={`/app/oefeningen/${e.id}`} className="min-h-[44px] min-w-0 flex-1 py-2.5 text-[14.5px] text-ink-900 hover:text-accent hover:underline">
                {nl ? e.nameNl : e.nameEn}{e.own && <span className="ml-1.5 rounded bg-sage px-1.5 py-0.5 text-[11px] font-semibold text-accent">{t('Praktijk', 'Practice')}</span>}
              </Link>
              <Button size="sm" variant="secondary" onClick={() => onAdd(e.id)} aria-label={t(`${nl ? e.nameNl : e.nameEn} toevoegen aan programma`, `Add ${nl ? e.nameNl : e.nameEn} to a programme`)}>{t('Toevoegen', 'Add')}</Button>
            </li>
          ))}
          {list.length > 12 && <li className="px-3 py-2 text-[13px] text-ink-600">{t(`en nog ${list.length - 12}`, `and ${list.length - 12} more`)}</li>}
        </ul>
      )}
    </div>
  );
}

function Nerves({ exercises, focus, onAdd, nl }: { exercises: AtlasExercise[]; focus: string | null; onAdd: (id: string) => void; nl: boolean }) {
  const { t } = useI18n();
  useEffect(() => {
    if (focus) requestAnimationFrame(() => document.getElementById(`zenuw-${focus}`)?.scrollIntoView({ block: 'start' }));
  }, [focus]);
  const limb = ['radialis', 'medianus', 'ulnaris', 'musculocutaneus', 'axillaris', 'ischiadicus', 'tibialis', 'fibularis', 'femoralis', 'obturatorius'];
  const nerves = [...NERVES].sort((a, b) => (limb.indexOf(a.key) + 1 || 99) - (limb.indexOf(b.key) + 1 || 99));
  return (
    <ul aria-label={t('Zenuwen', 'Nerves')} className="grid grid-cols-[minmax(0,1fr)] gap-2 lg:grid-cols-[repeat(2,minmax(0,1fr))] lg:items-start">
      {nerves.map((n) => {
        const own = MUSCLES.filter((m) => m.nerve === n.key);
        const also = MUSCLES.filter((m) => m.nerve !== n.key && nervesOf(m).includes(n.key) && (m.also ?? []).includes(n.key));
        const exs = exercises.filter((e) => e.nerve === n.key);
        if (!own.length && !exs.length) return null;
        // A nerve exercise is only expected for the main limb nerves.
        const expectExercise = limb.includes(n.key);
        return (
          <li key={n.key} id={`zenuw-${n.key}`} className={cn('scroll-mt-20 rounded-2xl border bg-white p-4 shadow-card', focus === n.key ? 'border-accent' : 'border-line')}>
            <h2 className="flex items-center gap-1.5 font-semibold text-ink-900"><Zap className="h-4 w-4 text-accent" aria-hidden />{nl ? n.nl : n.en}</h2>
            <p className="text-[13px] text-ink-600">{nl ? n.areaNl : n.areaEn}</p>
            {'noteNl' in n && <p className="mt-1 text-[13px] text-ink-700">{nl ? n.noteNl : n.noteEn}</p>}
            {own.length > 0 && (
              <p className="mt-2 text-[14px] text-ink-800">
                <span className="font-medium">{t('Spieren:', 'Muscles:')}</span>{' '}
                {own.map((m, i) => <span key={m.key}>{i > 0 && ', '}<Link to={`/app/spieren?spier=${m.key}`} className="text-accent hover:underline">{(nl ? m.nl : m.en).toLowerCase()}</Link></span>)}
                {also.length > 0 && <span className="text-ink-600"> · {t('deels:', 'partly:')} {also.map((m) => (nl ? m.nl : m.en).toLowerCase()).join(', ')}</span>}
              </p>
            )}
            <div className="mt-3">
              {exs.length > 0 || expectExercise ? (
                <KindGroup kind="zenuw" list={exs} newHref={newExerciseHref(null, 'zenuw', own[0] ? BODY_REGION[own[0].region] : undefined)} onAdd={onAdd} nl={nl} />
              ) : null}
            </div>
            <Link to={`/app/oefeningen?nerve=${n.key}`} className="mt-1 inline-flex min-h-[44px] items-center text-[14px] font-medium text-accent">{t('Oefeningen in de bibliotheek', 'Exercises in the library')}</Link>
          </li>
        );
      })}
    </ul>
  );
}
