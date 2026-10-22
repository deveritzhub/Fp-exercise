import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .filter((c) => c === c.toUpperCase())
    .slice(0, 2)
    .join('') || name.slice(0, 1).toUpperCase();
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hues = ['#e9e4db', '#dbd3c0', '#e2dfcf', '#e6dccd', '#d9d8c6', '#ebe2d4'];
  return (
    <span
      className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-ink-700', className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: hues[hash % hues.length] }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b border-line', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            '-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            value === t.value ? 'border-accent text-ink-950' : 'border-transparent text-ink-500 hover:text-ink-800',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded-md bg-ink-100 px-1.5 text-2xs tabular-nums text-ink-600">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label, size = 'md' }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-ink-50 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md font-medium transition-all',
            size === 'sm' ? 'px-2.5 py-1 text-[12.5px]' : 'px-3 py-1.5 text-[13px]',
            value === o.value ? 'bg-white text-ink-950 shadow-xs' : 'text-ink-500 hover:text-ink-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors',
        active ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-white text-ink-700 hover:border-ink-300',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function NumberStepper({ value, onChange, min = 0, max = 999, label, suffix, compact }: { value: number | null; onChange: (v: number | null) => void; min?: number; max?: number; label: string; suffix?: string; compact?: boolean }) {
  const set = (v: number | null) => onChange(v === null ? null : Math.max(min, Math.min(max, v)));
  return (
    <div className={cn('flex items-center rounded-lg border border-line bg-white shadow-xs', compact ? 'h-8' : 'h-9')}>
      <button type="button" aria-label={`${label} −`} className="flex h-full w-7 items-center justify-center text-ink-400 hover:text-ink-900" onClick={() => set((value ?? min + 1) - 1)}>
        <Minus className="h-3 w-3" />
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        className="h-full w-10 min-w-0 border-0 bg-transparent p-0 text-center text-sm tabular-nums text-ink-900 focus:outline-none focus:ring-0"
        value={value ?? ''}
        placeholder="–"
        onChange={(e) => {
          const n = e.target.value.replace(/\D/g, '');
          set(n === '' ? null : Number(n));
        }}
      />
      {suffix && <span className="-ml-1 pr-1 text-2xs text-ink-400">{suffix}</span>}
      <button type="button" aria-label={`${label} +`} className="flex h-full w-7 items-center justify-center text-ink-400 hover:text-ink-900" onClick={() => set((value ?? min - 1) + 1)}>
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

/** 0–10 scale with large touch targets (patient app). */
export function ScaleInput({ value, onChange, label, lowLabel, highLabel, tone = 'accent' }: { value: number | null; onChange: (v: number | null) => void; label: string; lowLabel: string; highLabel: string; tone?: 'accent' | 'pain' }) {
  return (
    <fieldset>
      <legend className="mb-3 text-[15px] font-semibold text-ink-900">{label}</legend>
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={value === i}
            aria-label={`${label}: ${i}`}
            onClick={() => onChange(value === i ? null : i)}
            className={cn(
              'flex h-11 items-center justify-center rounded-lg border text-[15px] font-semibold tabular-nums transition-all sm:h-12',
              value === i
                ? tone === 'pain' && i >= 6
                  ? 'border-bad bg-bad text-white'
                  : 'border-accent bg-accent text-white'
                : 'border-line bg-white text-ink-700 hover:border-ink-300',
            )}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[12.5px] text-ink-500">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </fieldset>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-ink-50 px-1.5 py-0.5 font-sans text-2xs font-medium text-ink-500">{children}</kbd>;
}

export function useDebounced<T>(value: T, ms = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function Popover({ trigger, children, align = 'right', className }: { trigger: (p: { open: boolean; toggle: () => void }) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className={cn('absolute z-40 mt-2 min-w-56 animate-scale-in rounded-xl border border-line bg-white p-1 shadow-pop', align === 'right' ? 'right-0' : 'left-0', className)}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, danger }: { icon?: ReactNode; children: ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-ink-50', danger ? 'text-bad' : 'text-ink-800')}>
      {icon && <span className="text-ink-400">{icon}</span>}
      {children}
    </button>
  );
}
