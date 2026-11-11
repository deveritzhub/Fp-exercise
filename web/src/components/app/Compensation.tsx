import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { MUSCLES } from '@shared/muscleAtlas';
import type { Compensation } from '@shared/complaints';

type Fn = readonly [string, string];

/** Muscle names as chips: green to train, amber to offload. Links go to the therapist atlas. */
export function MuscleChips({ keys, tone, links = true }: { keys: readonly string[]; tone: 'train' | 'calm'; links?: boolean }) {
  const { locale } = useI18n();
  const cls = cn('inline-flex min-h-[28px] items-center rounded-full px-2.5 text-[12.5px] font-medium', tone === 'train' ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn');
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {keys.map((k) => {
        const m = MUSCLES.find((x) => x.key === k);
        if (!m) return null;
        const name = locale === 'nl' ? m.nl : m.en;
        return links ? <Link key={k} to={`/app/spieren?spier=${k}`} className={cls}>{name}</Link> : <span key={k} className={cls}>{name}</span>;
      })}
    </span>
  );
}

/** One compensation pattern, folded: weak link → what takes over, what you see, test, approach. */
export function CompensationCard({ c, open = false }: { c: Compensation; open?: boolean }) {
  const { t, locale } = useI18n();
  const L = (f: Fn) => (locale === 'nl' ? f[0] : f[1]);
  const rows: [string, Fn | null][] = [
    [t('Zwakke schakel → neemt over', 'Weak link → takes over'), null],
    [t('Wat zie je', 'What you see'), c.see],
    [t('Snelle test', 'Quick test'), c.test],
    [t('Aanpak', 'Approach'), c.approach],
    [t('Cue', 'Cue'), c.cue],
    [t('Even aanpassen', 'Adjust for now'), c.adjust],
  ];
  return (
    <details open={open} className="group rounded-2xl border border-line bg-white shadow-card">
      <summary className="tap flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink-900">{L(c.name)}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[12.5px] text-ink-600">
            <MuscleChips keys={c.weak} tone="train" links={false} /><span aria-hidden>→</span><span className="sr-only">{t('neemt over', 'taken over by')}</span><MuscleChips keys={c.over} tone="calm" links={false} />
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-500 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <dl className="grid gap-2 border-t border-line px-4 py-3 text-[14px] sm:grid-cols-[9rem_1fr]">
        {rows.map(([label, f]) => (
          <div key={label} className="contents">
            <dt className="font-medium text-ink-600">{label}</dt>
            <dd className="text-ink-900">{f ? L(f) : <span className="inline-flex flex-wrap items-center gap-1.5"><MuscleChips keys={c.weak} tone="train" /><span aria-hidden>→</span><MuscleChips keys={c.over} tone="calm" /></span>}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

