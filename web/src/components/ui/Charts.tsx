import { cn } from '@/lib/cn';

export function ProgressBar({ value, className, tone = 'accent', label }: { value: number | null; className?: string; tone?: 'accent' | 'auto'; label?: string }) {
  const v = Math.max(0, Math.min(1, value ?? 0));
  const color = tone === 'auto' ? (value === null ? 'bg-ink-200' : v >= 0.7 ? 'bg-ok' : v >= 0.4 ? 'bg-warn' : 'bg-bad') : 'bg-accent';
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-ink-100', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value === null ? undefined : Math.round(v * 100)} aria-label={label}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 88, stroke = 8, children, label }: { value: number | null; size?: number; stroke?: number; children?: React.ReactNode; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value ?? 0));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-ink-100" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} className="fill-none stroke-accent transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** Simple accessible vertical bar chart (0..1 values). */
/**
 * Bar chart. With `onSelect` every bar is a button (keyboard and touch) that opens its details;
 * `axisMax` prints the scale so heights can be read without hovering.
 */
export function Bars({ data, height = 120, format, highlightLast, onSelect, selected, axisMax, showValues }: { data: { label: string; value: number | null; sub?: string; display?: string; ariaLabel?: string }[]; height?: number; format?: (v: number | null) => string; highlightLast?: boolean; onSelect?: (i: number) => void; selected?: number | null; axisMax?: string; showValues?: boolean }) {
  return (
    <div className="flex w-full gap-2">
      {axisMax !== undefined && (
        <div className="flex shrink-0 flex-col justify-between pb-0 text-right text-2xs tabular-nums text-ink-600" style={{ height }} aria-hidden>
          <span>{axisMax}</span>
          <span>0</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-end gap-1 border-b border-line sm:gap-2" style={{ height }} role="list">
          {data.map((d, i) => {
            const v = d.value === null ? 0 : Math.max(0.02, Math.min(1, d.value));
            const shown = d.display ?? (format ? format(d.value) : d.value);
            const bar = (
              <>
                <div className={cn('mb-1 text-2xs font-medium tabular-nums text-ink-600', !showValues && 'opacity-0 transition-opacity group-hover:opacity-100')}>{shown}</div>
                <div className={cn('w-full max-w-10 rounded-t-md transition-all duration-500', d.value === null ? 'bg-ink-100' : selected === i ? 'bg-ink-900' : highlightLast && i === data.length - 1 ? 'bg-brand-wood' : 'bg-accent/85 group-hover:bg-accent')} style={{ height: `${d.value === null ? 4 : v * 100}%` }} />
              </>
            );
            return onSelect ? (
              <div key={i} className="flex h-full flex-1" role="listitem">
                <button type="button" onClick={() => onSelect(i)} aria-pressed={selected === i} aria-label={d.ariaLabel ?? `${d.label}: ${shown}`} className="group flex h-full w-full flex-col items-center justify-end rounded-t-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
                  {bar}
                </button>
              </div>
            ) : (
              <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end" role="listitem" aria-label={d.ariaLabel ?? `${d.label}: ${shown}`}>
                {bar}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1 sm:gap-2" aria-hidden>
          {data.map((d, i) => (
            <div key={i} className={cn('min-w-0 flex-1 text-center text-2xs text-ink-600', selected === i && 'font-semibold text-ink-900')}>
              {d.label}
              {d.sub && <div className="text-ink-500">{d.sub}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Small line chart for 0..10 scores (pain/difficulty), oldest → newest. */
export function Sparkline({ values, max = 10, className, tone = 'accent' }: { values: (number | null)[]; max?: number; className?: string; tone?: 'accent' | 'bad' }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p) => p.v !== null) as { v: number; i: number }[];
  const w = 240;
  const h = 56;
  if (pts.length < 2) return <div className={cn('flex h-14 items-center text-[12.5px] text-ink-400', className)}>—</div>;
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * (w - 8) + 4;
  const y = (v: number) => h - 4 - (v / max) * (h - 8);
  const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const color = tone === 'bad' ? 'stroke-bad' : 'stroke-accent';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-14 w-full', className)} preserveAspectRatio="none" aria-hidden>
      <line x1="0" x2={w} y1={y(5)} y2={y(5)} className="stroke-ink-100" strokeDasharray="3 4" />
      <path d={d} className={cn('fill-none', color)} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {pts.map((p) => (
        <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r="2.5" className={cn('fill-white', color)} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
