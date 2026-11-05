import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Check, ClipboardList, Link2, Ruler, Search, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Button, ErrorState, PageHeader, Spinner } from '@/components/ui';
import { CompensationCard, MuscleChips } from '@/components/app/Compensation';
import { MUSCLES } from '@shared/muscleAtlas';
import { mobilityTest } from '@shared/mobilityTests';
import { CHAINS, REGIONS, chainOf, complaintMuscles, complaintOf, complaintsIn, compensationOf, proposeExercises, searchComplaints, whyFor, type Compensation, type Complaint, type ProposalExercise, type RegionKey } from '@shared/complaints';

type AtlasData = { exercises: (ProposalExercise & { own: boolean })[] };
type Fn = readonly [string, string];

/**
 * Complaint guide for therapists: region → complaint → card with the chain, compensations to check
 * (with a quick test), red flags and an exercise proposal from the practice library; one tap turns
 * the ticked exercises into a programme. A proposal, never a diagnosis.
 */
export function ComplaintGuidePage() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const L = (f: Fn) => (nl ? f[0] : f[1]);
  useDocumentMeta(t('Klachtwijzer', 'Complaint guide'));
  const [params, setParams] = useSearchParams();
  const regionKey = params.get('regio') as RegionKey | null;
  const complaint = complaintOf(params.get('klacht') ?? '');
  const region = REGIONS.find((r) => r.key === (complaint?.region ?? regionKey)) ?? null;
  const patient = params.get('patient');
  const [q, setQ] = useState('');
  const results = searchComplaints(q);
  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) (v ? p.set(k, v) : p.delete(k));
    setParams(p);
    setQ('');
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('Klachtwijzer', 'Complaint guide')} description={t('Kies een regio en een klacht: je ziet de keten, de compensaties om te checken en een oefenvoorstel uit je eigen bibliotheek. Een voorstel, geen diagnose.', 'Pick a region and a complaint: you see the chain, the compensations to check and an exercise proposal from your own library. A proposal, not a diagnosis.')} />

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Zoek een klacht, bijv. loperknie, tennisarm, ischias', 'Search a complaint, e.g. runner\'s knee, tennis elbow, sciatica')} aria-label={t('Klacht zoeken', 'Search complaint')} className="input pl-9" />
        {q.trim().length >= 2 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-white shadow-card">
            {results.length === 0 && <li className="px-4 py-3 text-[14px] text-ink-600">{t('Geen klacht gevonden. Kies hieronder een regio.', 'No complaint found. Pick a region below.')}</li>}
            {results.slice(0, 8).map((c) => (
              <li key={c.key}>
                <button type="button" onClick={() => go({ klacht: c.key, regio: c.region })} className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-ink-50">
                  <span className="font-medium text-ink-900">{L(c.name)}</span>
                  <span className="text-[13px] text-ink-500">{L(REGIONS.find((r) => r.key === c.region)!.name)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <nav aria-label={t('Regio', 'Region')}>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REGIONS.map((r) => (
            <li key={r.key}>
              <button type="button" aria-pressed={region?.key === r.key} onClick={() => go({ regio: r.key, klacht: null })}
                className={cn('tap flex min-h-[52px] w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-[14.5px] font-semibold', region?.key === r.key ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-white text-ink-900 hover:bg-ink-50')}>
                {L(r.name)}
                <span className="text-[12.5px] font-medium text-ink-500">{complaintsIn(r.key).length}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {region && !complaint && (
        <section aria-labelledby="complaints-title">
          <h2 id="complaints-title" className="t-section mb-2">{L(region.name)}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {complaintsIn(region.key).map((c) => (
              <li key={c.key}>
                <button type="button" onClick={() => go({ klacht: c.key })} className="tap flex w-full items-start justify-between gap-3 rounded-2xl border border-line bg-white p-4 text-left shadow-card hover:border-accent">
                  <span>
                    <span className="block font-semibold text-ink-900">{L(c.name)}</span>
                    <span className="mt-0.5 block text-[13.5px] text-ink-600">{L(c.what)}</span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {complaint && region && <ComplaintCard complaint={complaint} redFlags={region.redFlags} patient={patient} onBack={() => go({ klacht: null })} />}

      {!region && (
        <p className="text-[14px] text-ink-600">{t(`${REGIONS.length} regio's, ${CHAINS.length} ketens en de meest voorkomende compensaties. Begin met een regio of zoek een klacht.`, `${REGIONS.length} regions, ${CHAINS.length} chains and the most common compensations. Start with a region or search a complaint.`)}</p>
      )}
    </div>
  );
}

function ComplaintCard({ complaint, redFlags, patient, onBack }: { complaint: Complaint; redFlags: readonly Fn[]; patient: string | null; onBack: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const L = (f: Fn) => (nl ? f[0] : f[1]);
  const nav = useNavigate();
  const atlas = useQuery({ queryKey: ['atlas-staff'], queryFn: () => api.get<AtlasData>('/atlas'), staleTime: 5 * 60_000 });
  const comps = complaint.compensations.map(compensationOf).filter((x): x is Compensation => !!x);
  const muscles = complaintMuscles(complaint);
  const proposal = useMemo(() => (atlas.data ? proposeExercises(complaint, atlas.data.exercises) : null), [atlas.data, complaint]);
  // Ticked by default: the first three of each block.
  const [ticked, setTicked] = useState<Set<string> | null>(null);
  const defaults = useMemo(() => new Set(proposal ? [...proposal.calm.slice(0, 2), ...proposal.activate.slice(0, 3), ...proposal.function.slice(0, 2)].map((e) => e.id) : []), [proposal]);
  const chosen = ticked ?? defaults;
  const toggle = (id: string) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTicked(next);
  };
  const ordered = proposal ? [...proposal.calm, ...proposal.activate, ...proposal.function].filter((e) => chosen.has(e.id)) : [];
  const makeProgram = () => {
    // Plain-language "why" per exercise, handed to the builder as the exercise note (editable there).
    // Only generic texts, no patient data.
    const blockOf = (id: string): 'calm' | 'activate' | 'function' => (proposal!.calm.some((e) => e.id === id) ? 'calm' : proposal!.activate.some((e) => e.id === id) ? 'activate' : 'function');
    try {
      sessionStorage.setItem('fp.guide.notes', JSON.stringify(Object.fromEntries(ordered.map((e) => [e.id, whyFor(complaint, e, blockOf(e.id), nl)]))));
    } catch {
      /* storage unavailable: no notes */
    }
    const p = new URLSearchParams({ oefeningen: ordered.map((e) => e.id).join(','), titel: L(complaint.name) });
    if (patient) p.set('patient', patient);
    nav(`/app/programmas/nieuw?${p}`);
  };
  const tests = [...new Set([...(complaint.mobilityTests ?? []), ...comps.map((c) => c.mobilityTest).filter(Boolean)])] as string[];

  return (
    <article aria-labelledby="complaint-title" className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex min-h-[44px] items-center gap-1 text-[14.5px] font-medium text-accent">← {t('Andere klacht', 'Other complaint')}</button>
      <header>
        <h2 id="complaint-title" className="t-page">{L(complaint.name)}</h2>
        <p className="mt-1 max-w-2xl text-[15px] text-ink-700">{L(complaint.what)}</p>
      </header>

      <section aria-labelledby="chain-title" className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <h3 id="chain-title" className="flex items-center gap-2 font-semibold text-ink-900"><Link2 className="h-4 w-4 text-accent" aria-hidden />{t('Keten', 'Chain')}</h3>
        <div className="mt-2 space-y-3">
          {complaint.chains.map((k) => {
            const c = chainOf(k)!;
            return (
              <div key={k}>
                <p className="font-medium text-ink-900">{L(c.name)}</p>
                <p className="text-[14px] text-ink-700">{L(c.what)}</p>
                <ol className="mt-1.5 flex flex-wrap items-center gap-1 text-[12.5px] text-ink-700" aria-label={t('Schakels', 'Links')}>
                  {c.links.map((m, i) => (
                    <li key={m} className="flex items-center gap-1">
                      {i > 0 && <span className="text-ink-400" aria-hidden>→</span>}
                      <Link to={`/app/spieren?spier=${m}`} className="inline-flex min-h-[28px] items-center rounded-md bg-canvas px-2 hover:bg-ink-100">{(nl ? MUSCLES.find((x) => x.key === m)?.nl : MUSCLES.find((x) => x.key === m)?.en) ?? m}</Link>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[13.5px] text-ink-700">
          <span className="font-medium">{t('Versterken', 'Strengthen')}:</span> <MuscleChips keys={muscles.train} tone="train" />
          {muscles.calm.length > 0 && <><span className="ml-3 font-medium">{t('Ontlasten', 'Offload')}:</span> <MuscleChips keys={muscles.calm} tone="calm" /></>}
        </p>
      </section>

      {comps.length > 0 && (
        <section aria-labelledby="comp-title">
          <h3 id="comp-title" className="t-section mb-2">{t('Check deze compensaties', 'Check these compensations')}</h3>
          <div className="space-y-2">{comps.map((c, i) => <CompensationCard key={c.key} c={c} open={i === 0} />)}</div>
          <p className="mt-2 text-[12.5px] text-ink-600">{t('Compensatiepatronen zijn denkmodellen: toets ze met de test, ze zijn zelden de enige oorzaak.', 'Compensation patterns are reasoning models: test them, they are rarely the only cause.')}</p>
        </section>
      )}

      {complaint.avoid && (
        <p className="rounded-xl border border-warn/30 bg-warn-soft/60 px-4 py-3 text-[14px] text-ink-900"><span className="font-semibold">{t('Let op bij deze klacht', 'Mind this with this complaint')}: </span>{L(complaint.avoid.why)}</p>
      )}

      <section aria-labelledby="flags-title" className="rounded-2xl border border-bad/30 bg-bad-soft/40 p-4">
        <h3 id="flags-title" className="flex items-center gap-2 font-semibold text-ink-900"><AlertTriangle className="h-4 w-4 text-bad" aria-hidden />{t('Rode vlaggen: niet oefenen maar verwijzen', 'Red flags: refer instead of exercising')}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-ink-800">{redFlags.map((f, i) => <li key={i}>{L(f)}</li>)}</ul>
      </section>

      {tests.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 text-[14px] text-ink-700">
          <Ruler className="h-4 w-4 text-accent" aria-hidden />{t('Meetbaar met de mobiliteitstest', 'Measurable with the mobility test')}:
          {tests.map((k) => <span key={k} className="rounded-full bg-accent-soft px-2 py-0.5 text-[13px] font-medium text-accent">{L(mobilityTest(k)!.name)}</span>)}
          <span className="text-ink-500">{t('(de patiënt meet thuis; jij ziet het als Mobiliteit gedeeld is)', '(the patient measures at home; you see it when Mobility is shared)')}</span>
        </p>
      )}

      <section aria-labelledby="prop-title" className="rounded-2xl border border-line bg-white p-5 shadow-card">
        <h3 id="prop-title" className="flex items-center gap-2 font-semibold text-ink-900"><Sparkles className="h-4 w-4 text-accent" aria-hidden />{t('Oefenvoorstel uit je bibliotheek', 'Exercise proposal from your library')}</h3>
        {atlas.isLoading && <Spinner className="py-8" />}
        {atlas.isError && <ErrorState error={atlas.error} onRetry={() => void atlas.refetch()} />}
        {proposal && (
          <>
            <div className="mt-3 grid gap-4 lg:grid-cols-3">
              <Block title={t('1. Ontlasten en mobiliseren', '1. Offload and mobilise')} hint={t('wat overneemt of stijf is', 'what takes over or is stiff')} list={proposal.calm} chosen={chosen} onToggle={toggle} />
              <Block title={t('2. Activeren en versterken', '2. Activate and strengthen')} hint={t('de zwakke schakel', 'the weak link')} list={proposal.activate} chosen={chosen} onToggle={toggle} />
              <Block title={t('3. Functioneel', '3. Functional')} hint={t('de beweging waarin het misgaat', 'the movement where it goes wrong')} list={proposal.function} chosen={chosen} onToggle={toggle} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <Button onClick={makeProgram} disabled={ordered.length === 0} icon={<ClipboardList className="h-4 w-4" />}>{t(`Programma maken (${ordered.length})`, `Create programme (${ordered.length})`)}</Button>
              <span className="text-[13px] text-ink-600">{t('Dosering en planning stel je daarna zelf in.', 'You set dose and schedule afterwards.')}</span>
            </div>
          </>
        )}
      </section>
    </article>
  );
}

function Block({ title, hint, list, chosen, onToggle }: { title: string; hint: string; list: ProposalExercise[]; chosen: Set<string>; onToggle: (id: string) => void }) {
  const { t, locale } = useI18n();
  return (
    <fieldset>
      <legend className="font-medium text-ink-900">{title}</legend>
      <p className="text-[12.5px] text-ink-500">{hint}</p>
      {list.length === 0 ? (
        <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-[13px] text-ink-600">{t('Nog geen passende oefening in je bibliotheek. Kijk in de spierenatlas bij "Gaten in je bibliotheek".', 'No matching exercise in your library yet. See "Gaps in your library" in the muscle atlas.')}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {list.map((e) => {
            const on = chosen.has(e.id);
            return (
              <li key={e.id}>
                <label className={cn('flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[14px]', on ? 'border-accent bg-accent-soft' : 'border-line bg-white hover:bg-ink-50')}>
                  <input type="checkbox" checked={on} onChange={() => onToggle(e.id)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
                  <span className="min-w-0 flex-1">{locale === 'nl' ? e.nameNl : e.nameEn}</span>
                  {on && <Check className="h-4 w-4 text-accent" aria-hidden />}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
