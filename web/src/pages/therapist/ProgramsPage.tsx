import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Layers3, LayoutTemplate, Plus, Search, Star, X } from 'lucide-react';
import { api, qs } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { dose, fmtDate } from '@/lib/format';
import { useDocumentMeta, useLabels } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Badge, ButtonLink, Card, EmptyState, ErrorState, Input, PageHeader, Select, Skeleton, Tabs, useDebounced } from '@/components/ui';
import { ExerciseThumb } from '@/components/app/ExerciseThumb';
import { CriteriaList, Evidence, RedFlags, Warnings, useModules } from '@/components/app/PhaseInfo';
import { ProgramStatusBadge } from '@/components/app/StatusBadge';
import type { Program, ProgramModule } from '@/lib/types';

export function ProgramsPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Programma’s & sjablonen', 'Programmes & templates'));
  const [tab, setTab] = useState<'templates' | 'recent'>('templates');

  return (
    <>
      <PageHeader
        title={t('Programma’s & sjablonen', 'Programmes & templates')}
        description={<span className="hidden sm:inline">{t('Sjablonen zijn een startpunt voor professionele aanpassing — geen geautomatiseerd behandeladvies.', 'Templates are a starting point for professional customisation — not automated treatment advice.')}</span>}
        actions={
          <>
            <ButtonLink to="/app/programmas/nieuw?type=sjabloon" variant="secondary" icon={<LayoutTemplate className="h-4 w-4" />}><span className="hidden sm:inline">{t('Nieuw sjabloon', 'New template')}</span><span className="sr-only sm:hidden">{t('Nieuw sjabloon', 'New template')}</span></ButtonLink>
            <ButtonLink to="/app/programmas/nieuw" icon={<Plus className="h-4 w-4" />}>{t('Nieuw programma', 'New programme')}</ButtonLink>
          </>
        }
      />
      <Tabs className="mb-5" value={tab} onChange={setTab} tabs={[{ value: 'templates', label: t('Sjablonen', 'Templates') }, { value: 'recent', label: t('Patiëntprogramma’s', 'Patient programmes') }]} />
      {tab === 'templates' ? (
        <TemplateBrowser />
      ) : (
        <ProgramOverview />
      )}
    </>
  );
}

/** All patient programmes of the practice: search title or patient, filter on status and therapist. */
function ProgramOverview() {
  const { t, locale } = useI18n();
  const { practice, user } = useSession();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('active');
  const [therapist, setTherapist] = useState('me');
  const dq = useDebounced(q.trim(), 200);
  const members = useQuery({ queryKey: ['members'], queryFn: () => api.get<{ items: { userId: string; fullName: string; active: boolean }[] }>('/practice/members'), staleTime: 60_000 });
  const list = useQuery({
    queryKey: ['programs-overview', practice?.practiceId, dq, status, therapist],
    queryFn: ({ signal }) => api.get<{ total: number; items: (Program & { therapistName: string | null })[] }>(`/programs/overview${qs({ q: dq, status, therapist })}`, signal),
    placeholderData: keepPreviousData,
  });
  const pending = q.trim() !== dq || list.isPlaceholderData || (!list.data && list.isFetching);
  const sel = 'h-11 rounded-lg border border-line bg-white px-3 text-[13.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50';
  return (
    <Card>
      <div className="flex flex-wrap items-end gap-2 border-b border-line p-4">
        <div className="min-w-[14rem] flex-1">
          <Input leading={<Search className="h-4 w-4" />} aria-label={t('Zoek op programma of patiënt', 'Search programme or patient')} placeholder={t('Zoek op programma of patiënt…', 'Search programme or patient…')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="sr-only" htmlFor="po-status">{t('Status', 'Status')}</label>
        <select id="po-status" className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">{t('Alle statussen', 'All statuses')}</option>
          <option value="active">{t('Actief', 'Active')}</option>
          <option value="draft">{t('Concept', 'Draft')}</option>
          <option value="completed">{t('Afgerond', 'Completed')}</option>
          <option value="archived">{t('Gearchiveerd', 'Archived')}</option>
        </select>
        <label className="sr-only" htmlFor="po-therapist">{t('Therapeut', 'Therapist')}</label>
        <select id="po-therapist" className={sel} value={therapist} onChange={(e) => setTherapist(e.target.value)}>
          <option value="me">{t('Door mij gemaakt', 'Made by me')}</option>
          <option value="all">{t('Alle therapeuten', 'All therapists')}</option>
          {members.data?.items.filter((m) => m.active && m.userId !== user?.id).map((m) => <option key={m.userId} value={m.userId}>{m.fullName}</option>)}
        </select>
      </div>
      <div className="flex min-h-[2.25rem] items-center px-5 pt-3 text-[13px] text-ink-600" aria-live="polite">
        {pending ? t('Zoeken…', 'Searching…') : list.data ? t(`${list.data.total} programma’s`, `${list.data.total} programmes`) : null}
      </div>
      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data || (pending && !list.data.items.length) ? (
        <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : list.data.items.length === 0 ? (
        <EmptyState title={t('Geen programma’s gevonden', 'No programmes found')} description={t('Pas de zoekterm of filters aan.', 'Adjust the search or filters.')} />
      ) : (
        <ul className={cn('divide-y divide-line', pending && 'opacity-60')}>
          {list.data.items.map((p) => (
            <li key={p.id}>
              <Link to={`/app/programmas/${p.id}`} className="flex min-h-[56px] flex-wrap items-center gap-3 px-5 py-3 hover:bg-ink-50/60">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{p.title}</span>
                  <span className="text-[12.5px] text-ink-600">
                    {p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : ''} · {p.itemCount} {t('oefeningen', 'exercises')}{p.therapistName ? ` · ${p.therapistName}` : ''} · {t('bijgewerkt', 'updated')} {fmtDate(p.updatedAt, locale)}
                  </span>
                </span>
                <ProgramStatusBadge status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

type Group = { kind: 'series'; key: string; title: string; module: ProgramModule; phases: Program[] } | { kind: 'single'; key: string; module: ProgramModule; tpl: Program };
const MODULE_ORDER: ProgramModule[] = ['revalidatie', 'kracht', 'mobiliteit'];

/** Templates grouped per programme (series of phases) and module, with search and filters. */
function TemplateBrowser() {
  const { t } = useI18n();
  const L = useLabels();
  const modules = useModules();
  const [q, setQ] = useState('');
  const [mod, setMod] = useState<'' | ProgramModule>('');
  const [scope, setScope] = useState<'all' | 'favorites' | 'practice' | 'global' | 'phased'>('all');
  const [region, setRegion] = useState('');
  const dq = useDebounced(q.trim().toLowerCase(), 120);
  const templates = useQuery({ queryKey: ['templates'], queryFn: () => api.get<{ items: Program[] }>('/programs/templates'), staleTime: 30_000 });
  const all = templates.data?.items ?? [];

  const regions = useMemo(() => [...new Set(all.flatMap((p) => p.regions ?? []))].sort(), [all]);
  const groups = useMemo(() => {
    const match = (p: Program) => {
      if (mod && (p.module ?? 'revalidatie') !== mod) return false;
      if (scope === 'favorites' && !p.favorite) return false;
      if ((scope === 'practice' || scope === 'global') && p.scope !== scope) return false;
      if (scope === 'phased' && !p.series) return false;
      if (region && !(p.regions ?? []).includes(region)) return false;
      if (!dq) return true;
      const hay = [p.title, p.series?.title, p.indication, p.series?.goal, ...(p.criteria ?? []).flatMap((g) => g.items.flatMap((i) => [i.label, i.test]))].join(' ').toLowerCase();
      return dq.split(/\s+/).every((w) => hay.includes(w));
    };
    const out: Group[] = [];
    const series = new Map<string, Program[]>();
    for (const p of all) {
      if (p.series) series.set(`${p.practiceId ?? 'g'}:${p.series.key}`, [...(series.get(`${p.practiceId ?? 'g'}:${p.series.key}`) ?? []), p]);
    }
    const seen = new Set<string>();
    for (const p of all) {
      if (p.series) {
        const k = `${p.practiceId ?? 'g'}:${p.series.key}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const phases = series.get(k)!.sort((a, b) => a.series!.phaseNo - b.series!.phaseNo);
        // A series is shown when any of its phases matches (so you can still pick the phase you need).
        if (phases.some(match)) out.push({ kind: 'series', key: k, title: p.series.title, module: p.module ?? 'revalidatie', phases });
      } else if (match(p)) out.push({ kind: 'single', key: p.id, module: p.module ?? 'revalidatie', tpl: p });
    }
    return out;
  }, [all, dq, mod, scope, region]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of all) c[p.module ?? 'revalidatie'] = (c[p.module ?? 'revalidatie'] ?? 0) + 1;
    return c;
  }, [all]);
  const active = [mod, region, scope !== 'all' ? scope : ''].filter(Boolean).length;
  const chip = (on: boolean) => cn('tap inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors', on ? 'border-accent bg-accent text-white' : 'border-line bg-white text-ink-700 hover:border-ink-300');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('Sjablonen zoeken', 'Search templates')} placeholder={t('Zoek programma, klacht, fase of test…', 'Search programme, condition, phase or test…')} className="input h-12 rounded-xl pl-11 pr-10 text-[15px] shadow-card [&::-webkit-search-cancel-button]:hidden" />
          {q && <button type="button" onClick={() => setQ('')} aria-label={t('Zoekopdracht wissen', 'Clear search')} className="tap absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100"><X className="h-4 w-4" /></button>}
        </div>
        <div className="flex gap-2 [&_label]:sr-only">
          <Select label={t('Regio', 'Region')} value={region} onChange={(e) => setRegion(e.target.value)} className="h-12 rounded-xl">
            <option value="">{t('Alle regio’s', 'All regions')}</option>
            {regions.map((r) => <option key={r} value={r}>{L.region(r)}</option>)}
          </Select>
          <Select label={t('Toon', 'Show')} value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className="h-12 rounded-xl">
            <option value="all">{t('Alle sjablonen', 'All templates')}</option>
            <option value="phased">{t('Met fases', 'With phases')}</option>
            <option value="favorites">{t('Favorieten', 'Favourites')}</option>
            <option value="practice">{t('Praktijk', 'Practice')}</option>
            <option value="global">{t('Centraal', 'Central')}</option>
          </Select>
        </div>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={t('Module', 'Module')}>
        <button type="button" aria-pressed={!mod} className={chip(!mod)} onClick={() => setMod('')}>{t('Alle modules', 'All modules')}</button>
        {MODULE_ORDER.map((m) => {
          const M = modules[m];
          return (
            <button key={m} type="button" aria-pressed={mod === m} className={chip(mod === m)} onClick={() => setMod(mod === m ? '' : m)}>
              <M.icon className="h-4 w-4" aria-hidden />
              {M.label}
              {counts[m] ? <span className={cn('text-[12px] tabular-nums', mod === m ? 'text-white/80' : 'text-ink-400')}>{counts[m]}</span> : null}
            </button>
          );
        })}
        {active > 0 && <button type="button" className="tap h-9 shrink-0 px-2 text-[13px] font-medium text-ink-600 underline-offset-4 hover:underline" onClick={() => { setMod(''); setRegion(''); setScope('all'); }}>{t('Wis filters', 'Clear filters')}</button>}
      </div>

      {templates.isError ? (
        <Card><ErrorState error={templates.error} onRetry={() => templates.refetch()} /></Card>
      ) : !templates.data ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : groups.length === 0 ? (
        <Card><EmptyState icon={<LayoutTemplate className="h-5 w-5" />} title={t('Geen sjablonen gevonden', 'No templates found')} description={t('Pas je zoekterm of filters aan.', 'Adjust your search or filters.')} /></Card>
      ) : (
        MODULE_ORDER.filter((m) => groups.some((g) => g.module === m)).map((m) => (
          <section key={m} aria-labelledby={`mod-${m}`} className="space-y-3">
            <h2 id={`mod-${m}`} className="pt-2 font-sans text-[13px] font-semibold uppercase tracking-wide text-ink-500">{modules[m].label}</h2>
            {groups.filter((g) => g.module === m).map((g) => (g.kind === 'series' ? <SeriesCard key={g.key} title={g.title} phases={g.phases} /> : <SingleTemplateCard key={g.key} tpl={g.tpl} />))}
          </section>
        ))
      )}
    </div>
  );
}

/** One programme with its phases: pick a phase to see goal, exercises, criteria (with tests) and red flags. */
function SeriesCard({ title, phases }: { title: string; phases: Program[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState(0);
  const first = phases[0];
  const totalWeeks = phases.at(-1)?.series?.weeks?.split('-').at(-1);
  const sel = phases[phase];
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="tap flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-ink-50/50 sm:px-5">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><Layers3 className="h-5 w-5" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-[15.5px] font-semibold leading-snug text-ink-950">{title}</span>
          {first.indication && <span className="mt-0.5 block text-[13px] text-ink-500">{first.indication}</span>}
          <span className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="accent">{t(`${phases.length} fases`, `${phases.length} phases`)}</Badge>
            {totalWeeks && <Badge tone="outline">{t(`${totalWeeks} weken`, `${totalWeeks} weeks`)}</Badge>}
            {first.scope === 'practice' ? <Badge tone="outline">{t('Praktijk', 'Practice')}</Badge> : <Badge tone="outline">{t('Centraal', 'Central')}</Badge>}
            <WarningBadge warnings={first.warnings} />
          </span>
        </span>
        <ChevronDown className={cn('mt-2 h-5 w-5 shrink-0 text-ink-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="border-t border-line">
          <div className="no-scrollbar flex gap-1 overflow-x-auto px-4 pt-3 sm:px-5" role="tablist" aria-label={t('Fase', 'Phase')}>
            {phases.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={phase === i}
                onClick={() => setPhase(i)}
                className={cn('tap shrink-0 rounded-lg px-3 py-2 text-left transition-colors', phase === i ? 'bg-ink-900 text-white' : 'bg-ink-50 text-ink-700 hover:bg-ink-100')}
              >
                <span className="block text-[13px] font-semibold">{p.series?.phaseName}</span>
                {p.series?.weeks && <span className={cn('block text-[12px]', phase === i ? 'text-white/75' : 'text-ink-500')}>{t(`week ${p.series.weeks}`, `week ${p.series.weeks}`)}</span>}
              </button>
            ))}
          </div>
          <PhaseDetail key={sel.id} tpl={sel} />
        </div>
      )}
    </article>
  );
}

function PhaseDetail({ tpl }: { tpl: Program }) {
  const { t, locale } = useI18n();
  const full = useQuery({ queryKey: ['program', tpl.id], queryFn: () => api.get<Program>(`/programs/${tpl.id}`), staleTime: 60_000 });
  const items = full.data?.items ?? [];
  return (
    <div className="grid gap-5 px-4 py-4 sm:px-5 lg:grid-cols-2">
      <div className="space-y-4">
        {tpl.series?.goal && (
          <p className="text-[14px] text-ink-800"><span className="font-semibold">{t('Doel', 'Goal')}:</span> {tpl.series.goal}</p>
        )}
        <div>
          <h4 className="mb-2 text-[13.5px] font-semibold text-ink-900">{t(`Oefeningen (${tpl.itemCount ?? items.length})`, `Exercises (${tpl.itemCount ?? items.length})`)}</h4>
          {!full.data ? <Skeleton className="h-24 rounded-lg" /> : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-3 py-2">
                  <ExerciseThumb thumbnailId={i.exercise.thumbnailMediaId} videoId={i.exercise.videoMediaId} region={i.exercise.bodyRegion} name={locale === 'nl' ? i.exercise.nameNl : i.exercise.nameEn} className="h-9 w-9 shrink-0" hideBadge />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink-900">{locale === 'nl' ? i.exercise.nameNl : i.exercise.nameEn}</span>
                  <span className="shrink-0 text-[12.5px] tabular-nums text-ink-500">{dose(i, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Warnings items={tpl.warnings ?? []} />
        <RedFlags flags={tpl.redFlags ?? []} />
      </div>
      <div className="space-y-4">
        {(tpl.criteria ?? []).length > 0 ? (
          <CriteriaList groups={tpl.criteria!} />
        ) : (
          <p className="text-[13px] text-ink-500">{t('Geen criteria vastgelegd voor deze fase.', 'No criteria recorded for this phase.')}</p>
        )}
        <Evidence text={tpl.evidence ?? ''} />
        <div className="flex flex-wrap gap-2 pt-1">
          <ButtonLink to={`/app/programmas/nieuw?sjabloon=${tpl.id}`} icon={<Plus className="h-4 w-4" />}>{t(`Gebruik ${tpl.series?.phaseName ?? 'sjabloon'}`, `Use ${tpl.series?.phaseName ?? 'template'}`)}</ButtonLink>
          <ButtonLink to={`/app/programmas/${tpl.id}`} variant="secondary">{t('Bekijken', 'View')}</ButtonLink>
        </div>
      </div>
    </div>
  );
}

function SingleTemplateCard({ tpl }: { tpl: Program }) {
  const { t } = useI18n();
  const L = useLabels();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const toggleFav = async () => {
    if (tpl.favorite) await api.del(`/programs/${tpl.id}/favorite`);
    else await api.post(`/programs/${tpl.id}/favorite`);
    qc.invalidateQueries({ queryKey: ['templates'] });
  };
  const hasMore = (tpl.criteria ?? []).length > 0 || (tpl.redFlags ?? []).length > 0 || (tpl.warnings ?? []).length > 0;
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-600"><LayoutTemplate className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <Link to={`/app/programmas/${tpl.id}`} className="block font-sans text-[15.5px] font-semibold leading-snug text-ink-950 hover:underline">{tpl.title}</Link>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-500">{tpl.indication || tpl.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tpl.itemCount ? <Badge tone="outline">{tpl.itemCount} {t('oefeningen', 'exercises')}</Badge> : <Badge tone="info">{t('Kader — jij kiest oefeningen en dosering', 'Framework — you choose exercises and dose')}</Badge>}
            {tpl.regions?.slice(0, 2).map((r) => <Badge key={r} tone="outline">{L.region(r)}</Badge>)}
            <Badge tone="outline">{tpl.scope === 'practice' ? t('Praktijk', 'Practice') : t('Centraal', 'Central')}</Badge>
            <WarningBadge warnings={tpl.warnings} />
          </div>
        </div>
        <button type="button" onClick={toggleFav} aria-pressed={!!tpl.favorite} aria-label={tpl.favorite ? t('Verwijder uit favorieten', 'Remove from favourites') : t('Voeg toe aan favorieten', 'Add to favourites')} className={cn('tap rounded-full p-2', tpl.favorite ? 'text-amber-500' : 'text-ink-300 hover:text-ink-600')}>
          <Star className={cn('h-5 w-5', tpl.favorite && 'fill-current')} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 sm:px-5">
        <ButtonLink size="sm" to={`/app/programmas/nieuw?sjabloon=${tpl.id}`}>{t('Gebruiken', 'Use')}</ButtonLink>
        <ButtonLink size="sm" variant="ghost" to={`/app/programmas/${tpl.id}`}>{t('Bekijken', 'View')}</ButtonLink>
        {hasMore && (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="tap ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-ink-600 hover:text-ink-900">
            {t('Voorwaarden en veiligheid', 'Requirements and safety')}
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {open && (
        <div className="grid gap-4 border-t border-line px-4 py-4 sm:px-5 lg:grid-cols-2">
          <div className="space-y-3"><Warnings items={tpl.warnings ?? []} /><RedFlags flags={tpl.redFlags ?? []} /></div>
          <div className="space-y-3"><CriteriaList groups={tpl.criteria ?? []} /><Evidence text={tpl.evidence ?? ''} /></div>
        </div>
      )}
    </article>
  );
}

/** The concrete warning instead of a bare "Let op" (full text on hover and for screen readers). */
function WarningBadge({ warnings }: { warnings?: string[] | null }) {
  const { t } = useI18n();
  const w = (warnings ?? []).filter(Boolean);
  if (!w.length) return null;
  const first = w[0].replace(/\.$/, '');
  const short = first.length > 60 ? `${first.slice(0, 57).trimEnd()}…` : first;
  return (
    <span title={w.join('\n')} className="inline-flex max-w-full items-center gap-1 rounded-md bg-warn-soft px-1.5 py-0.5 text-[12px] font-medium text-warn">
      <span className="truncate" aria-hidden>{t('Let op', 'Note')}: {short}</span>
      {w.length > 1 && <span className="shrink-0" aria-hidden>+{w.length - 1}</span>}
      <span className="sr-only">{w.join('. ')}</span>
    </span>
  );
}
