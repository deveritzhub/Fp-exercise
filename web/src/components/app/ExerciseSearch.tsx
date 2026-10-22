import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { api, qs } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { taxonomy } from '@/lib/meta';
import { Input, Select, useDebounced } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Exercise } from '@/lib/types';

export type ExerciseFilters = { q: string; region: string; category: string; equipment: string; difficulty: string; scope: string };
export const emptyFilters: ExerciseFilters = { q: '', region: '', category: '', equipment: '', difficulty: '', scope: 'all' };

export function useExerciseSearch(f: ExerciseFilters, limit = 48) {
  const dq = useDebounced(f.q, 180);
  const params = { ...f, q: dq };
  return useQuery({
    queryKey: ['exercises', params, limit],
    queryFn: () => api.get<{ items: Exercise[]; total: number }>(`/exercises${qs({ ...params, scope: params.scope === 'all' ? undefined : params.scope, limit })}`),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function ExerciseFilterBar({ value, onChange, compact }: { value: ExerciseFilters; onChange: (f: ExerciseFilters) => void; compact?: boolean }) {
  const { t, locale } = useI18n();
  const [showMore, setShowMore] = useState(!compact);
  const set = (k: keyof ExerciseFilters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const active = [value.region, value.category, value.equipment, value.difficulty].filter(Boolean).length;
  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <Input
          leading={<Search className="h-4 w-4" />}
          placeholder={t('Zoek op naam, spier, regio of materiaal…', 'Search by name, muscle, region or equipment…')}
          value={value.q}
          onChange={set('q')}
          aria-label={t('Oefeningen zoeken', 'Search exercises')}
          containerClassName="min-w-0 flex-1"
        />
        {compact && (
          <button type="button" onClick={() => setShowMore((s) => !s)} aria-expanded={showMore} className={cn('relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium', showMore ? 'border-ink-300 bg-ink-50' : 'border-line bg-white')}>
            <SlidersHorizontal className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">{t('Filters', 'Filters')}</span>
            {active > 0 && <span className="rounded bg-accent px-1 text-2xs text-white">{active}</span>}
          </button>
        )}
      </div>
      {showMore && (
        <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4')}>
          <Select aria-label={t('Lichaamsregio', 'Body region')} value={value.region} onChange={set('region')}>
            <option value="">{t('Alle regio’s', 'All regions')}</option>
            {taxonomy.BODY_REGIONS.map((r) => <option key={r.key} value={r.key}>{r[locale]}</option>)}
          </Select>
          <Select aria-label={t('Categorie', 'Category')} value={value.category} onChange={set('category')}>
            <option value="">{t('Alle categorieën', 'All categories')}</option>
            <optgroup label={t('Training', 'Training')}>
              {taxonomy.TRAINING_CATEGORIES.map((r) => <option key={r.key} value={r.key}>{r[locale]}</option>)}
            </optgroup>
            <optgroup label={t('Bewegingspatroon', 'Movement pattern')}>
              {taxonomy.MOVEMENT_CATEGORIES.map((r) => <option key={r.key} value={r.key}>{r[locale]}</option>)}
            </optgroup>
          </Select>
          <Select aria-label={t('Materiaal', 'Equipment')} value={value.equipment} onChange={set('equipment')}>
            <option value="">{t('Alle materialen', 'All equipment')}</option>
            {taxonomy.EQUIPMENT.map((r) => <option key={r.key} value={r.key}>{r[locale]}</option>)}
          </Select>
          <Select aria-label={t('Niveau', 'Level')} value={value.difficulty} onChange={set('difficulty')}>
            <option value="">{t('Elk niveau', 'Any level')}</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{t('Niveau', 'Level')} {n}</option>)}
          </Select>
        </div>
      )}
      {active > 0 && (
        <button type="button" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-500 hover:text-ink-900" onClick={() => onChange({ ...emptyFilters, q: value.q, scope: value.scope })}>
          <X className="h-3 w-3" /> {t('Filters wissen', 'Clear filters')}
        </button>
      )}
    </div>
  );
}
