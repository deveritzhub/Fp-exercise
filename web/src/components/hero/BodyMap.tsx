import { useState } from 'react';
import { BODY_AREAS, type Side } from '@shared/hero';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Segmented } from '@/components/ui';

export type PainEntries = Record<string, number>;

/** Severity as words as well as colour (never colour alone). */
export function painWord(score: number, nl: boolean) {
  if (score === 0) return nl ? 'geen pijn' : 'no pain';
  if (score <= 3) return nl ? 'licht' : 'mild';
  if (score <= 6) return nl ? 'matig' : 'moderate';
  return nl ? 'veel' : 'severe';
}
const tone = (score: number) => (score <= 3 ? 'bg-ok text-white' : score <= 6 ? 'bg-warn text-white' : 'bg-bad text-white');

function Figure() {
  return (
    <g fill="#e6eee8" stroke="#b5c1ba" strokeWidth="2">
      <circle cx="100" cy="36" r="24" />
      <rect x="90" y="58" width="20" height="16" rx="6" />
      <path d="M58 86c8-10 26-14 42-14s34 4 42 14l8 46-14 4-6-30v62H70v-62l-6 30-14-4z" />
      <path d="M50 132l-10 52-12 30 10 4 16-30 10-46zM150 132l10 52 12 30-10 4-16-30-10-46z" />
      <path d="M70 196h60l4 30-6 90-4 74H106l-4-74-2-60-2 60-4 74H76l-4-74-6-90z" />
    </g>
  );
}

/**
 * Clickable body map (front and back). Every area is a real button (keyboard, screen reader,
 * 44 px touch target). With `onChange` the patient marks areas and sets a score 0–10.
 */
export function BodyMap({ entries, onChange, compare, className }: { entries: PainEntries; onChange?: (e: PainEntries) => void; compare?: PainEntries; className?: string }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [side, setSide] = useState<Side>('front');
  const [selected, setSelected] = useState<string | null>(null);
  const areas = BODY_AREAS.filter((a) => a.side === side);
  const sel = BODY_AREAS.find((a) => a.key === selected);
  const count = (s: Side) => BODY_AREAS.filter((a) => a.side === s && entries[a.key] !== undefined).length;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex justify-center [&>div]:w-full [&>div]:max-w-xs">
        <Segmented<Side>
          size="lg"
          label={t('Kant van het lichaam', 'Side of the body')}
          value={side}
          onChange={(v) => { setSide(v); setSelected(null); }}
          options={[
            { value: 'front', label: `${t('Voorkant', 'Front')}${count('front') ? ` (${count('front')})` : ''}` },
            { value: 'back', label: `${t('Achterkant', 'Back')}${count('back') ? ` (${count('back')})` : ''}` },
          ]}
        />
      </div>
      <div className="relative mx-auto aspect-[200/420] w-full max-w-[240px]">
        <svg viewBox="0 0 200 420" className="absolute inset-0 h-full w-full" aria-hidden><Figure /></svg>
        <ul className="absolute inset-0" aria-label={side === 'front' ? t('Voorkant van het lichaam', 'Front of the body') : t('Achterkant van het lichaam', 'Back of the body')}>
          {areas.map((a) => {
            const v = entries[a.key];
            const before = compare?.[a.key];
            const label = `${nl ? a.nl : a.en}${v !== undefined ? `: ${v}/10, ${painWord(v, nl)}` : onChange ? `: ${t('geen pijn aangegeven', 'no pain marked')}` : ''}${before !== undefined ? ` (${t('start', 'start')} ${before}/10)` : ''}`;
            const dot = v !== undefined ? (
              <span className={cn('flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white px-1 text-[13px] font-bold tabular-nums shadow-xs', tone(v))}>{v}</span>
            ) : (
              <span className="h-4 w-4 rounded-full border-2 border-ink-400 bg-white/80" />
            );
            return (
              <li key={a.key} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(a.x / 200) * 100}%`, top: `${(a.y / 420) * 100}%` }}>
                {onChange ? (
                  <button
                    type="button"
                    aria-label={label}
                    aria-pressed={selected === a.key}
                    onClick={() => {
                      setSelected(a.key);
                      if (entries[a.key] === undefined) onChange({ ...entries, [a.key]: 5 });
                    }}
                    className={cn('tap flex h-11 w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent', selected === a.key && 'ring-2 ring-accent ring-offset-2')}
                  >
                    {dot}
                  </button>
                ) : v !== undefined ? (
                  <span role="img" aria-label={label} className="flex h-11 w-11 items-center justify-center">{dot}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {onChange && sel && entries[sel.key] !== undefined && (
        <div className="rounded-xl border border-line bg-white p-4" role="group" aria-label={nl ? sel.nl : sel.en}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-ink-900">{nl ? sel.nl : sel.en}</span>
            <span className="text-[15px] tabular-nums text-ink-700"><strong className="font-display text-[22px]">{entries[sel.key]}</strong>/10 · {painWord(entries[sel.key], nl)}</span>
          </div>
          <label className="mt-3 block text-[14px] text-ink-600" htmlFor="pain-score">{t('Hoeveel pijn? 0 = geen, 10 = ergst denkbaar', 'How much pain? 0 = none, 10 = worst imaginable')}</label>
          <input
            id="pain-score"
            type="range"
            min={0}
            max={10}
            step={1}
            value={entries[sel.key]}
            onChange={(e) => onChange({ ...entries, [sel.key]: Number(e.target.value) })}
            className="mt-2 h-11 w-full accent-[rgb(var(--accent))]"
            aria-valuetext={`${entries[sel.key]}/10, ${painWord(entries[sel.key], nl)}`}
          />
          <button
            type="button"
            className="mt-1 min-h-[44px] text-[14px] font-medium text-ink-600 underline-offset-4 hover:text-ink-900 hover:underline"
            onClick={() => {
              const next = { ...entries };
              delete next[sel.key];
              onChange(next);
              setSelected(null);
            }}
          >
            {t('Hier heb ik geen pijn', 'No pain here')}
          </button>
        </div>
      )}
    </div>
  );
}
