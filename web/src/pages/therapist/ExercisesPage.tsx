import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Dumbbell, Loader2, Play, Plus, SearchX } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta, useLabels } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Button, ButtonLink, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { ExerciseThumb } from '@/components/app/ExerciseThumb';
import { ActiveFilters, ExerciseSearchField, FilterButton, InlineFilters, RegionChips, ScopeFilters, activeFilterCount, emptyFilters, scopeFiltered, useExercisePages, useUrlFilters } from '@/components/app/ExerciseSearch';
import { FavoriteToggle, PreviewSheet, QuickAddSheet } from '@/components/app/QuickAdd';
import type { Exercise } from '@/lib/types';

export function ExercisesPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Oefenbibliotheek', 'Exercise library'));
  const [f, setF] = useUrlFilters();
  const q = useExercisePages(f);
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  // Never show a count that belongs to the previous search.
  const total = q.pending ? undefined : q.data?.pages[0]?.total;
  const [preview, setPreview] = useState<Exercise | null>(null);
  const [adding, setAdding] = useState<Exercise | null>(null);
  const onPreview = useCallback((e: Exercise) => setPreview(e), []);
  const onAdd = useCallback((e: Exercise) => setAdding(e), []);
  const filtered = !!f.q || activeFilterCount(f) > 0 || scopeFiltered(f);

  // Coming back from an exercise: same search, filters (URL) and scroll position.
  const SCROLL_KEY = 'fp.library.scroll';
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !q.data) return;
    restored.current = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? 'null') as { key: string; y: number } | null;
      if (saved && saved.key === window.location.search && saved.y > 0) requestAnimationFrame(() => window.scrollTo({ top: saved.y }));
    } catch {
      /* ignore */
    }
  }, [q.data]);
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ key: window.location.search, y: window.scrollY }));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, []);

  // Load the next page shortly before the end of the list is reached.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !q.hasNextPage) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && !q.isFetchingNextPage && q.fetchNextPage(), { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [q.hasNextPage, q.isFetchingNextPage, q.fetchNextPage]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader
        title={t('Oefenbibliotheek', 'Exercise library')}
        description={<span className="hidden sm:inline">{t('Centrale bibliotheek plus de eigen oefeningen van je praktijk.', 'Central library plus your practice’s own exercises.')}</span>}
        actions={
          <ButtonLink to="/app/oefeningen/nieuw" variant="secondary" icon={<Plus className="h-4 w-4" />}>
            <span className="hidden sm:inline">{t('Eigen oefening', 'Custom exercise')}</span>
            <span className="sr-only min-[360px]:not-sr-only sm:hidden">{t('Nieuw', 'New')}</span>
          </ButtonLink>
        }
      />

      {/* Search stays in reach while scrolling on phones. */}
      <div className="sticky top-14 z-10 -mx-4 bg-canvas/95 px-4 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-canvas/80 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
        <div className="flex gap-2">
          <ExerciseSearchField value={f.q} onChange={(qv) => setF({ ...f, q: qv })} busy={q.isFetching && !q.isFetchingNextPage} />
          <FilterButton value={f} onChange={setF} total={total} className="lg:hidden" />
        </div>
      </div>
      <div className="space-y-3">
        <RegionChips value={f.region} onChange={(region) => setF({ ...f, region })} />
        <div className="hidden lg:block"><InlineFilters value={f} onChange={setF} /></div>
        <div className="lg:hidden"><ActiveFilters value={{ ...f, region: '' }} onChange={(next) => setF({ ...next, region: f.region })} /></div>
        <div className="hidden lg:block"><ActiveFilters value={f} onChange={setF} /></div>
      </div>

      <ScopeFilters value={f} onChange={setF} />

      <div className="mb-3 flex h-5 items-center gap-2 text-[13px] text-ink-500" aria-live="polite">
        {q.pending && !q.isError ? (
          <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />{f.q.trim() ? t(`Zoeken naar “${f.q.trim()}”…`, `Searching for “${f.q.trim()}”…`) : t('Oefeningen laden…', 'Loading exercises…')}</span>
        ) : total !== undefined && (
          <span>
            {f.q ? t(`${total} resultaten voor “${f.q}”`, `${total} results for “${f.q}”`) : t(`${total} oefeningen`, `${total} exercises`)}
          </span>
        )}
      </div>

      {q.isError ? (
        <Card><ErrorState error={q.error} onRetry={() => q.refetch()} /></Card>
      ) : !q.data || (q.pending && items.length === 0) ? (
        <CardGrid aria-busy="true">{Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} />)}</CardGrid>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={f.q ? <SearchX className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
            title={f.q ? t(`Niets gevonden voor “${f.q}”`, `Nothing found for “${f.q}”`) : t('Geen oefeningen gevonden', 'No exercises found')}
            description={t('Probeer een ander woord (Nederlands of Engels), minder filters, of maak een eigen oefening.', 'Try another word (Dutch or English), fewer filters, or create a custom exercise.')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {filtered && <Button variant="secondary" onClick={() => setF({ ...emptyFilters })}>{t('Alles wissen', 'Clear everything')}</Button>}
                <ButtonLink to="/app/oefeningen/nieuw" variant="ghost">{t('Eigen oefening maken', 'Create custom exercise')}</ButtonLink>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <CardGrid className={cn(q.pending && 'opacity-60')} aria-busy={q.pending}>
            {items.map((e) => <ExerciseCard key={e.id} e={e} onPreview={onPreview} onAdd={onAdd} />)}
          </CardGrid>
          <div ref={sentinel} className="flex h-16 items-center justify-center">
            {q.isFetchingNextPage ? (
              <Loader2 className="h-5 w-5 animate-spin text-ink-400" aria-label={t('Meer laden…', 'Loading more…')} />
            ) : q.hasNextPage ? (
              <Button variant="ghost" onClick={() => q.fetchNextPage()}>{t('Meer laden', 'Load more')}</Button>
            ) : items.length > 12 ? (
              <span className="text-[12.5px] text-ink-400">{t('Einde van de lijst', 'End of the list')}</span>
            ) : null}
          </div>
        </>
      )}

      <PreviewSheet exercise={preview} open={!!preview} onClose={() => setPreview(null)} onAdd={(e) => { setPreview(null); setAdding(e); }} />
      <QuickAddSheet exercise={adding} open={!!adding} onClose={() => setAdding(null)} />
    </>
  );
}

function CardGrid({ children, className, ...rest }: { children: React.ReactNode; className?: string; 'aria-busy'?: boolean | 'true' }) {
  return <div {...rest} className={cn('grid grid-cols-1 gap-2 transition-opacity sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4', className)}>{children}</div>;
}

function CardSkeleton() {
  return (
    <div className="card flex overflow-hidden sm:flex-col">
      <Skeleton className="m-2 h-20 w-20 shrink-0 rounded-lg sm:m-0 sm:aspect-[16/10] sm:h-auto sm:w-full sm:rounded-none" />
      <div className="flex-1 space-y-2 p-3 sm:p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

// Only devices with a real pointer get hover-to-play (no accidental video loads on touch screens).
const canHover = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

/** Kept for other pages (exercise detail). */
export { FavoriteToggle as FavoriteButton } from '@/components/app/QuickAdd';

/**
 * Phone: compact row (thumbnail left, info right). From `sm`: card with a larger image.
 * The whole card opens the exercise; the thumbnail plays a quick preview; + adds to a programme.
 */
const ExerciseCard = memo(function ExerciseCard({ e, onPreview, onAdd }: { e: Exercise; onPreview: (e: Exercise) => void; onAdd: (e: Exercise) => void }) {
  const { locale, t } = useI18n();
  const L = useLabels();
  const name = locale === 'nl' ? e.nameNl : e.nameEn;
  const other = locale === 'nl' ? e.nameEn : e.nameNl;
  const category = e.trainingCategories[0] ? L.training(e.trainingCategories[0]) : e.movementCategory ? L.movement(e.movementCategory) : null;
  const [hover, setHover] = useState(false);
  return (
    <article
      onMouseEnter={canHover ? () => setHover(true) : undefined}
      onMouseLeave={canHover ? () => setHover(false) : undefined}
      className="cv-auto group relative flex overflow-hidden rounded-xl border border-line bg-white shadow-card transition-[box-shadow,border-color,transform] duration-150 hover:border-ink-200 hover:shadow-pop active:scale-[0.995] sm:flex-col">
      <Link to={`/app/oefeningen/${e.id}`} className="tap absolute inset-0 z-0 rounded-xl" aria-label={name} />
      {/* Image is part of the card link; only the play button opens the quick preview. */}
      <div className="pointer-events-none relative m-2 h-20 w-20 shrink-0 overflow-hidden rounded-lg sm:m-0 sm:aspect-[16/10] sm:h-auto sm:w-full sm:rounded-none">
        <ExerciseThumb thumbnailId={e.thumbnailMediaId} videoId={e.videoMediaId} region={e.bodyRegion} name={name} className="h-full w-full" rounded="rounded-none" active={hover} hideBadge />
        {e.videoMediaId && (
          <button
            type="button"
            onClick={() => onPreview(e)}
            className="tap pointer-events-auto absolute bottom-1 left-1 z-10 flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full bg-ink-950/70 px-2 text-white backdrop-blur-sm transition-transform hover:bg-ink-950/85 active:scale-90 sm:bottom-2 sm:left-2 sm:px-3"
            aria-label={t(`Bekijk preview: ${name}`, `Watch preview: ${name}`)}
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
            <span className="hidden text-[12px] font-medium sm:inline">{t('Preview', 'Preview')}</span>
          </button>
        )}
      </div>

      <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col py-2 pr-1 sm:p-4 sm:pt-3">
        <h3 className="line-clamp-2 font-sans text-[15px] font-semibold leading-snug tracking-normal text-ink-950">{name}</h3>
        {other && other !== name && <p className="truncate text-[12px] text-ink-400">{other}</p>}
        <p className="mt-1 truncate text-[12.5px] text-ink-600">
          {L.region(e.bodyRegion)}
          {category && <span className="text-ink-400"> · </span>}
          {category}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[12px] text-ink-500">
          <Dumbbell className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
          <span className="truncate">{L.equipmentList(e.equipment)}</span>
        </p>
        <div className="mt-auto flex items-center gap-1.5 pt-1.5 sm:pt-3">
          <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium', e.scope === 'practice' ? 'bg-accent-soft text-accent' : 'bg-ink-100 text-ink-700')}>{e.scope === 'practice' ? t('Praktijk', 'Practice') : t('Centraal', 'Central')}</span>
          {e.reviewStatus === 'reviewed' && (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ok">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {t('Goedgekeurd', 'Approved')}
            </span>
          )}
          {!!e.variantCount && (
            <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] font-medium text-ink-600" title={t('Zelfde oefening in een andere bron; vergelijk op de detailpagina', 'Same exercise in another source; compare on the detail page')}>
              +{e.variantCount} {e.variantCount === 1 ? t('variant', 'variant') : t('varianten', 'variants')}
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 flex-col items-center justify-between py-1.5 pr-1.5 sm:absolute sm:right-2 sm:top-2 sm:flex-row sm:gap-1.5 sm:p-0">
        <FavoriteToggle e={e} className="bg-white/90 backdrop-blur sm:shadow-xs" />
        <button
          type="button"
          onClick={() => onAdd(e)}
          className="tap inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-xs transition-transform hover:bg-accent-strong active:scale-90"
          aria-label={t(`${name} toevoegen aan programma`, `Add ${name} to programme`)}
        >
          <Plus className="h-[18px] w-[18px]" />
        </button>
      </div>
    </article>
  );
});
