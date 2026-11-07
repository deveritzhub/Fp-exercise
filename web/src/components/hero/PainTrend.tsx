import { BODY_AREAS } from '@shared/hero';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Sparkline } from '@/components/ui';
import type { PainTrend } from '@/lib/types';

/** Pain trend per body area (from body-map and daily check-ins). */
export function PainTrendList({ trends }: { trends: PainTrend[] }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const label = (key: string) => {
    const a = BODY_AREAS.find((x) => x.key === key);
    return a ? (nl ? a.nl : a.en) : t('Algemeen', 'General');
  };
  if (!trends.length) return null;
  return (
    <ul className="space-y-3" aria-label={t('Verloop van de pijn per plek', 'Pain trend per area')}>
      {trends.map((tr) => {
        const first = tr.points[0];
        const last = tr.points[tr.points.length - 1];
        const diff = last.score - first.score;
        return (
          <li key={tr.area} className="rounded-xl border border-line p-3">
            <div className="flex items-baseline justify-between gap-2 text-[14px]">
              <span className="font-semibold text-ink-900">{label(tr.area)}</span>
              <span className="tabular-nums text-ink-700">
                {first.score} → {last.score}
                <span className={cn('ml-1.5 font-semibold', diff < 0 ? 'text-ok' : diff > 0 ? 'text-bad' : 'text-ink-600')}>
                  {diff < 0 ? t(`(${diff}, beter)`, `(${diff}, better)`) : diff > 0 ? t(`(+${diff}, meer pijn)`, `(+${diff}, more pain)`) : t('(gelijk)', '(same)')}
                </span>
              </span>
            </div>
            <Sparkline values={tr.points.map((p) => p.score)} max={10} tone="bad" className="mt-1.5 h-10 w-full" />
            <p className="text-[12.5px] text-ink-600">{t(`${tr.points.length} metingen sinds ${new Date(first.day + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`, `${tr.points.length} measurements since ${new Date(first.day + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`)}</p>
          </li>
        );
      })}
    </ul>
  );
}

