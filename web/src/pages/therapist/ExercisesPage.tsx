import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta, useLabels } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Badge, ButtonLink, Card, EmptyState, ErrorState, PageHeader, Skeleton, Tabs } from '@/components/ui';
import { ExerciseThumb } from '@/components/app/ExerciseThumb';
import { Difficulty } from '@/components/app/StatusBadge';
import { ExerciseFilterBar, emptyFilters, useExerciseSearch, type ExerciseFilters } from '@/components/app/ExerciseSearch';
import type { Exercise } from '@/lib/types';

export function ExercisesPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Oefenbibliotheek', 'Exercise library'));
  const [params] = useSearchParams();
  const [f, setF] = useState<ExerciseFilters>({ ...emptyFilters, scope: params.get('scope') ?? 'all' });
  const q = useExerciseSearch(f, 96);
  return (
    <>
      <PageHeader
        title={t('Oefenbibliotheek', 'Exercise library')}
        description={t('Centrale bibliotheek plus de eigen oefeningen van je praktijk.', 'Central library plus your practice’s own exercises.')}
        actions={<ButtonLink to="/app/oefeningen/nieuw" icon={<Plus className="h-4 w-4" />}>{t('Eigen oefening', 'Custom exercise')}</ButtonLink>}
      />
      <Tabs
        className="mb-4"
        value={f.scope}
        onChange={(scope) => setF({ ...f, scope })}
        tabs={[
          { value: 'all', label: t('Alle', 'All') },
          { value: 'favorites', label: t('Favorieten', 'Favourites') },
          { value: 'practice', label: t('Praktijk', 'Practice') },
          { value: 'mine', label: t('Door mij gemaakt', 'Created by me') },
          { value: 'global', label: t('Centrale bibliotheek', 'Central library') },
          { value: 'unreviewed', label: t('Te controleren', 'To review') },
          { value: 'reviewed', label: t('Goedgekeurd', 'Approved') },
        ]}
      />
      <ExerciseFilterBar value={f} onChange={setF} />
      <div className="mb-3 mt-5 text-[13px] text-ink-500" aria-live="polite">
        {q.data ? t(`${q.data.total} oefeningen`, `${q.data.total} exercises`) : ' '}
      </div>
      {q.isError ? (
        <Card><ErrorState error={q.error} onRetry={() => q.refetch()} /></Card>
      ) : !q.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-60 rounded-xl" />)}</div>
      ) : q.data.items.length === 0 ? (
        <Card><EmptyState icon={<BookOpen className="h-5 w-5" />} title={t('Geen oefeningen gevonden', 'No exercises found')} description={t('Pas je zoekterm of filters aan, of maak een eigen oefening.', 'Adjust your search or filters, or create a custom exercise.')} action={<ButtonLink to="/app/oefeningen/nieuw" variant="secondary">{t('Eigen oefening maken', 'Create custom exercise')}</ButtonLink>} /></Card>
      ) : (
        <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', q.isFetching && 'opacity-70 transition-opacity')}>
          {q.data.items.map((e) => <ExerciseCard key={e.id} e={e} />)}
        </div>
      )}
    </>
  );
}

export function FavoriteButton({ e, className }: { e: Pick<Exercise, 'id' | 'favorite'>; className?: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [fav, setFav] = useState(e.favorite);
  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={fav ? t('Verwijder uit favorieten', 'Remove from favourites') : t('Voeg toe aan favorieten', 'Add to favourites')}
      className={cn('inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors', fav ? 'text-amber-500' : 'text-ink-400 hover:text-ink-700', className)}
      onClick={async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        setFav(!fav);
        try {
          if (fav) await api.del(`/exercises/${e.id}/favorite`);
          else await api.post(`/exercises/${e.id}/favorite`);
          qc.invalidateQueries({ queryKey: ['exercises'] });
          qc.invalidateQueries({ queryKey: ['dashboard'] });
        } catch {
          setFav(fav);
        }
      }}
    >
      <Star className={cn('h-4 w-4', fav && 'fill-current')} />
    </button>
  );
}

function ExerciseCard({ e }: { e: Exercise }) {
  const { locale, t } = useI18n();
  const L = useLabels();
  return (
    <Link to={`/app/oefeningen/${e.id}`} className="group card flex flex-col overflow-hidden transition-shadow hover:shadow-pop">
      <div className="relative">
        <ExerciseThumb thumbnailId={e.thumbnailMediaId} videoId={e.videoMediaId} region={e.bodyRegion} className="aspect-[16/10] w-full" rounded="rounded-none" showRegion hoverPlay />
        <FavoriteButton e={e} className="absolute right-2 top-2 bg-white/85 backdrop-blur" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[14.5px] font-semibold leading-snug text-ink-950">{locale === 'nl' ? e.nameNl : e.nameEn}</h3>
        </div>
        <p className="mt-1 line-clamp-1 text-[12.5px] text-ink-500">{e.targetMuscles.slice(0, 3).join(', ')}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {e.trainingCategories.slice(0, 2).map((c) => <Badge key={c}>{L.training(c)}</Badge>)}
          {e.scope === 'practice' && <Badge tone="accent">{t('Praktijk', 'Practice')}</Badge>}
          {e.reviewStatus === 'reviewed' && <Badge tone="ok">✓ {t('Goedgekeurd', 'Approved')}</Badge>}
        </div>
        <div className="mt-auto flex items-center justify-between pt-4 text-[12px] text-ink-500">
          <span className="truncate">{e.equipment.map(L.equipment).join(' · ')}</span>
          <Difficulty value={e.difficulty} />
        </div>
      </div>
    </Link>
  );
}
