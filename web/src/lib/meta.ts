import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BODY_REGIONS, EQUIPMENT, MOVEMENT_CATEGORIES, TRAINING_CATEGORIES, WEEKDAYS, label } from '@shared/taxonomy';
import { useI18n } from './i18n';

export const taxonomy = { BODY_REGIONS, EQUIPMENT, MOVEMENT_CATEGORIES, TRAINING_CATEGORIES, WEEKDAYS };

export function useLabels() {
  const { locale } = useI18n();
  return {
    region: (k: string | null | undefined) => label('region', k, locale),
    training: (k: string) => label('training', k, locale),
    movement: (k: string | null | undefined) => label('movement', k, locale),
    equipment: (k: string) => label('equipment', k, locale),
    weekday: (n: number) => WEEKDAYS[n - 1]?.[locale] ?? String(n),
  };
}

/** Per-page <title> and meta description (SPA SEO foundation). */
export function useDocumentMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title.includes('FP Exercise') ? title : `${title} · FP Exercise`;
    if (description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute('name', 'description');
        document.head.appendChild(m);
      }
      m.setAttribute('content', description);
    }
  }, [title, description]);
}

export { useQuery };
