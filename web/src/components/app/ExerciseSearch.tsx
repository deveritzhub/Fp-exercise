import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import { api, qs } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { taxonomy, useLabels } from '@/lib/meta';
import { Button, Dialog, Select, useDebounced } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Exercise } from '@/lib/types';

/** source (central/practice/mine), review status and favourites combine freely. */
export type ExerciseFilters = { q: string; region: string; category: string; equipment: string; difficulty: string; source: string; review: string; favorites: string };
export const emptyFilters: ExerciseFilters = { q: '', region: '', category: '', equipment: '', difficulty: '', source: 'all', review: 'all', favorites: '' };
const KEYS = Object.keys(emptyFilters) as (keyof ExerciseFilters)[];
const LAST_SEARCH = 'fp.library.search';

/** Library URL including the last used search and filters (for "back to library" links). */
export function libraryHref() {
  try {
    const s = sessionStorage.getItem(LAST_SEARCH);
    return s ? `/app/oefeningen?${s}` : '/app/oefeningen';
  } catch {
    return '/app/oefeningen';
  }
}

const toQuery = (f: ExerciseFilters) => ({
  ...f,
  source: f.source === 'all' ? undefined : f.source,
  review: f.review === 'all' ? undefined : f.review,
  favorites: f.favorites === '1' ? '1' : undefined,
});
export const scopeFiltered = (f: ExerciseFilters) => f.source !== 'all' || f.review !== 'all' || f.favorites === '1';

/**
 * Search results never show a count or an empty state that belongs to an earlier search:
 * `pending` is true while typing (debounce) and while the previous results are still on screen.
 * Superseded requests are cancelled.
 */
export function useExerciseSearch(f: ExerciseFilters, limit = 48) {
  const dq = useDebounced(f.q, 120);
  const params = { ...f, q: dq.trim() };
  const query = useQuery({
    queryKey: ['exercises', params, limit],
    queryFn: ({ signal }) => api.get<{ items: Exercise[]; total: number }>(`/exercises${qs({ ...toQuery(params), limit })}`, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  return { ...query, pending: f.q.trim() !== dq.trim() || query.isPlaceholderData || (!query.data && query.isFetching) };
}

/** Paged results for the library page ("show more" / endless lists stay fast with thousands of exercises). */
export function useExercisePages(f: ExerciseFilters, pageSize = 36) {
  const dq = useDebounced(f.q, 120);
  const params = { ...f, q: dq.trim() };
  const query = useInfiniteQuery({
    queryKey: ['exercises', 'pages', params, pageSize],
    queryFn: ({ pageParam, signal }) => api.get<{ items: Exercise[]; total: number }>(`/exercises${qs({ ...toQuery(params), limit: pageSize, offset: pageParam })}`, signal),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  return { ...query, pending: f.q.trim() !== dq.trim() || query.isPlaceholderData || (!query.data && query.isFetching) };
}

/**
 * Filters kept in the URL (?q=…&region=…): they survive opening an exercise and going back,
 * and a filtered list can be shared or bookmarked.
 */
export function useUrlFilters(): [ExerciseFilters, (f: ExerciseFilters) => void] {
  const [params, setParams] = useSearchParams();
  const f = useMemo(() => {
    const out = { ...emptyFilters };
    for (const k of KEYS) out[k] = params.get(k) ?? emptyFilters[k];
    // Old links used one ?scope= filter.
    const legacy = params.get('scope');
    if (legacy === 'favorites') out.favorites = '1';
    else if (legacy === 'reviewed' || legacy === 'unreviewed') out.review = legacy;
    else if (legacy && legacy !== 'all') out.source = legacy;
    return out;
  }, [params]);
  useEffect(() => {
    try {
      sessionStorage.setItem(LAST_SEARCH, params.toString());
    } catch {
      /* ignore */
    }
  }, [params]);
  const set = useCallback(
    (next: ExerciseFilters) => {
      const p = new URLSearchParams();
      for (const k of KEYS) if (next[k] && next[k] !== emptyFilters[k]) p.set(k, next[k]);
      setParams(p, { replace: true });
    },
    [setParams],
  );
  return [f, set];
}

export const activeFilterCount = (f: ExerciseFilters) => [f.region, f.category, f.equipment, f.difficulty].filter(Boolean).length;

/** The library's own search field: large, with clear button and a busy indicator. */
export function ExerciseSearchField({ value, onChange, busy, size = 'lg', autoFocus }: { value: string; onChange: (q: string) => void; busy?: boolean; size?: 'lg' | 'md'; autoFocus?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="relative min-w-0 flex-1">
      <Search className={cn('pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400', size === 'lg' ? 'h-5 w-5' : 'h-4 w-4')} aria-hidden />
      <input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && value && (e.preventDefault(), onChange(''))}
        aria-label={t('Oefeningen zoeken', 'Search exercises')}
        placeholder={t('Zoek oefening…', 'Search exercise…')}
        title={t('Zoek op naam (Nederlands of Engels), spier, regio, materiaal of synoniem', 'Search by name (Dutch or English), muscle, region, equipment or synonym')}
        className={cn(
          'input appearance-none pr-20 [&::-webkit-search-cancel-button]:hidden',
          size === 'lg' ? 'h-[52px] rounded-xl pl-11 text-[15.5px] shadow-card' : 'h-10 pl-9',
        )}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {busy && <Loader2 className="h-4 w-4 animate-spin text-ink-400" aria-hidden />}
        {value && (
          <button type="button" onClick={() => onChange('')} className="tap flex h-8 items-center gap-1 rounded-lg px-2 text-[12.5px] font-medium text-ink-500 hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200" aria-label={t('Zoekopdracht wissen', 'Clear search')}>
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Wissen', 'Clear')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

const QUICK_REGIONS = ['knee', 'hip', 'shoulder', 'ankle_foot', 'lumbar_spine', 'cervical_spine', 'thoracic_spine', 'elbow', 'wrist_hand', 'full_body'];

/** One-tap region filter, swipeable on phones. */
export const RegionChips = memo(function RegionChips({ value, onChange }: { value: string; onChange: (region: string) => void }) {
  const { t } = useI18n();
  const L = useLabels();
  const chip = (active: boolean) =>
    cn(
      'tap inline-flex h-11 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors md:h-9',
      active ? 'border-accent bg-accent font-semibold text-accent-ink' : 'border-line bg-white text-ink-700 hover:border-ink-300 hover:bg-canvas',
    );
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,black_88%,transparent)] sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:[mask-image:none]" role="group" aria-label={t('Lichaamsregio', 'Body region')}>
      <button type="button" aria-pressed={!value} className={chip(!value)} onClick={() => onChange('')}>{t('Alle regio’s', 'All regions')}</button>
      {QUICK_REGIONS.map((r) => (
        <button key={r} type="button" aria-pressed={value === r} className={chip(value === r)} onClick={() => onChange(value === r ? '' : r)}>
          {L.region(r)}
        </button>
      ))}
    </div>
  );
});

function FilterSelects({ value, onChange, withRegion }: { value: ExerciseFilters; onChange: (f: ExerciseFilters) => void; withRegion?: boolean }) {
  const { t, locale } = useI18n();
  const set = (k: keyof ExerciseFilters) => (e: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <>
      {withRegion && (
        <Select label={t('Lichaamsregio', 'Body region')} value={value.region} onChange={set('region')}>
          <option value="">{t('Alle regio’s', 'All regions')}</option>
          {taxonomy.BODY_REGIONS.map((r) => <option key={r.key} value={r.key}>{r[locale]}</option>)}
        </Select>
      )}
      <Select label={t('Categorie', 'Category')} value={value.category} onChange={set('category')}>
        <option value="">{t('Alle categorieën', 'All categories')}</option>
        <optgroup label={t('Training', 'Training')}>
          {taxonomy.TRAINING_CATEGORIES.map((r) => <option key={r.key} value={r.key}>{r[locale]}</option>)}
        </optgroup>
        <optgroup label={t('Bewegingspatroon', 'Movement pattern')}>
          {taxonomy.MOVEMENT_CATEGORIES.map((r) => <option key={r.key} value={r.key}>{r[locale]}</option>)}
        </optgroup>
      </Select>
      <Select label={t('Materiaal', 'Equipment')} value={value.equipment} onChange={set('equipment')}>
        <option value="">{t('Alle materialen', 'All equipment')}</option>
        {taxonomy.EQUIPMENT.map((r) => <option key={r.key} value={r.key}>{r[locale]}</option>)}
      </Select>
      <Select label={t('Niveau', 'Level')} value={value.difficulty} onChange={set('difficulty')}>
        <option value="">{t('Elk niveau', 'Any level')}</option>
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{t('Niveau', 'Level')} {n}</option>)}
      </Select>
    </>
  );
}

/** Compact "Filters (n)" button; opens a bottom sheet on phones. */
export function FilterButton({ value, onChange, total, className }: { value: ExerciseFilters; onChange: (f: ExerciseFilters) => void; total?: number; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const n = activeFilterCount(value);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          'tap relative inline-flex h-12 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[14px] font-medium shadow-card transition-colors active:bg-ink-50',
          n ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-white text-ink-700 hover:border-ink-300',
          className,
        )}
      >
        <SlidersHorizontal className="h-[18px] w-[18px]" />
        <span className="sr-only min-[360px]:not-sr-only">{t('Filters', 'Filters')}</span>
        {n > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[12px] font-semibold text-white" aria-label={t(`${n} actief`, `${n} active`)}>{n}</span>}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        sheet
        size="sm"
        title={t('Filters', 'Filters')}
        footer={
          <div className="flex w-full items-center gap-2">
            <Button variant="ghost" disabled={!n} onClick={() => onChange({ ...emptyFilters, q: value.q, source: value.source, review: value.review, favorites: value.favorites })}>{t('Wis filters', 'Clear filters')}</Button>
            <Button className="flex-1" size="lg" onClick={() => setOpen(false)}>
              {total !== undefined ? t(`Toon ${total} oefeningen`, `Show ${total} exercises`) : t('Klaar', 'Done')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FilterSelects value={value} onChange={onChange} withRegion />
        </div>
      </Dialog>
    </>
  );
}

/** Desktop: the filters inline, next to each other. */
export function InlineFilters({ value, onChange }: { value: ExerciseFilters; onChange: (f: ExerciseFilters) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3 [&_label]:sr-only">
      <FilterSelects value={value} onChange={onChange} />
    </div>
  );
}

/**
 * Source, review status and favourites as three independent filters (e.g. "practice + to review +
 * favourites"). Native selects keep it compact and keyboard friendly on every width.
 */
export function ScopeFilters({ value, onChange }: { value: ExerciseFilters; onChange: (f: ExerciseFilters) => void }) {
  const { t } = useI18n();
  const sel = 'h-11 rounded-lg border border-line bg-white px-3 pr-8 text-[13.5px] font-medium text-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50';
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('Bron, status en favorieten', 'Source, status and favourites')}>
      <label className="sr-only" htmlFor="flt-source">{t('Bron', 'Source')}</label>
      <select id="flt-source" className={sel} value={value.source} onChange={(e) => onChange({ ...value, source: e.target.value })}>
        <option value="all">{t('Alle bronnen', 'All sources')}</option>
        <option value="global">{t('Centrale bibliotheek', 'Central library')}</option>
        <option value="practice">{t('Praktijk', 'Practice')}</option>
        <option value="mine">{t('Door mij gemaakt', 'Created by me')}</option>
      </select>
      <label className="sr-only" htmlFor="flt-review">{t('Reviewstatus', 'Review status')}</label>
      <select id="flt-review" className={sel} value={value.review} onChange={(e) => onChange({ ...value, review: e.target.value })}>
        <option value="all">{t('Elke status', 'Any status')}</option>
        <option value="unreviewed">{t('Te controleren', 'To review')}</option>
        <option value="reviewed">{t('Goedgekeurd', 'Approved')}</option>
      </select>
      <button
        type="button"
        aria-pressed={value.favorites === '1'}
        onClick={() => onChange({ ...value, favorites: value.favorites === '1' ? '' : '1' })}
        className={cn('inline-flex h-11 items-center gap-1.5 rounded-lg border px-3 text-[13.5px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50', value.favorites === '1' ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-white text-ink-800 hover:border-ink-300')}
      >
        <span aria-hidden>★</span>{t('Favorieten', 'Favourites')}
      </button>
    </div>
  );
}

/** Removable chips for every active filter, plus "Clear filters". */
export function ActiveFilters({ value, onChange }: { value: ExerciseFilters; onChange: (f: ExerciseFilters) => void }) {
  const { t } = useI18n();
  const L = useLabels();
  const chips = [
    value.region && { k: 'region' as const, label: L.region(value.region) },
    value.category && { k: 'category' as const, label: taxonomyLabel(value.category, L) },
    value.equipment && { k: 'equipment' as const, label: L.equipment(value.equipment) },
    value.difficulty && { k: 'difficulty' as const, label: `${t('Niveau', 'Level')} ${value.difficulty}` },
  ].filter(Boolean) as { k: keyof ExerciseFilters; label: string }[];
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button key={c.k} type="button" onClick={() => onChange({ ...value, [c.k]: '' })} className="tap inline-flex h-8 items-center gap-1.5 rounded-full border border-accent/25 bg-accent-soft pl-3 pr-2 text-[13px] font-semibold text-accent hover:bg-accent/15" aria-label={t(`Filter ${c.label} verwijderen`, `Remove filter ${c.label}`)}>
          {c.label}
          <X className="h-3.5 w-3.5 opacity-80" />
        </button>
      ))}
      <button type="button" onClick={() => onChange({ ...emptyFilters, q: value.q, source: value.source, review: value.review, favorites: value.favorites })} className="tap h-8 rounded-full px-2 text-[12.5px] font-medium text-ink-600 underline-offset-4 hover:text-ink-900 hover:underline">
        {t('Wis filters', 'Clear filters')}
      </button>
    </div>
  );
}

function taxonomyLabel(key: string, L: ReturnType<typeof useLabels>) {
  return taxonomy.TRAINING_CATEGORIES.some((c) => c.key === key) ? L.training(key) : L.movement(key);
}

/** Compact search + filters used inside the programme builder's library panel. */
export function ExerciseFilterBar({ value, onChange }: { value: ExerciseFilters; onChange: (f: ExerciseFilters) => void; compact?: boolean }) {
  const [showMore, setShowMore] = useState(false);
  const { t } = useI18n();
  const n = activeFilterCount(value);
  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <ExerciseSearchField size="md" value={value.q} onChange={(q) => onChange({ ...value, q })} />
        <button type="button" onClick={() => setShowMore((s) => !s)} aria-expanded={showMore} className={cn('relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium', showMore || n ? 'border-ink-300 bg-ink-50' : 'border-line bg-white')}>
          <SlidersHorizontal className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">{t('Filters', 'Filters')}</span>
          {n > 0 && <span className="rounded bg-accent px-1 text-2xs text-white">{n}</span>}
        </button>
      </div>
      {showMore && (
        <div className="grid grid-cols-2 gap-2 [&_label]:sr-only">
          <FilterSelects value={value} onChange={onChange} withRegion />
        </div>
      )}
      <ActiveFilters value={value} onChange={onChange} />
    </div>
  );
}
