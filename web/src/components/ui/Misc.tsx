import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
  const hues = ['#e6eee8', '#dbe6de', '#eef0e8', '#ece6da', '#d9e4dc', '#e8e2d5'];
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

/**
 * Tabs that scroll horizontally on small screens. Soft edge fades show there is more to the left or
 * right, and the active tab is scrolled into view.
 */
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, tabs.length]);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [value]);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((t) => t.value === value);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    onChange(next.value);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
  };
  return (
    <div className={cn('relative border-b border-line', className)}>
      <div ref={ref} role="tablist" onScroll={measure} onKeyDown={onKeyDown} className="no-scrollbar -mb-px flex gap-1 overflow-x-auto overscroll-x-contain scroll-smooth">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={value === t.value}
            tabIndex={value === t.value ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(
              'inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm transition-colors',
              value === t.value ? 'border-accent font-semibold text-ink-950' : 'border-transparent font-medium text-ink-500 hover:text-ink-800 active:text-ink-950',
            )}
          >
            {t.label}
            {t.count !== undefined && <span className={cn('rounded-md px-1.5 text-2xs tabular-nums', value === t.value ? 'bg-accent text-white' : 'bg-ink-100 text-ink-600')}>{t.count}</span>}
          </button>
        ))}
      </div>
      <span aria-hidden className={cn('pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-canvas to-transparent transition-opacity', edges.left ? 'opacity-100' : 'opacity-0')} />
      <span aria-hidden className={cn('pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-canvas to-transparent transition-opacity', edges.right ? 'opacity-100' : 'opacity-0')} />
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

export function NumberStepper({ value, onChange, min = 0, max = 999, label, suffix, compact, large }: { value: number | null; onChange: (v: number | null) => void; min?: number; max?: number; label: string; suffix?: string; compact?: boolean; /** Touch-friendly, full width. */ large?: boolean }) {
  const set = (v: number | null) => onChange(v === null ? null : Math.max(min, Math.min(max, v)));
  return (
    <div className={cn('flex items-center rounded-lg border border-line bg-white shadow-xs', large ? 'h-11 w-full' : compact ? 'h-8' : 'h-9')}>
      <button type="button" aria-label={`${label} −`} className={cn('tap flex h-full items-center justify-center text-ink-400 hover:text-ink-900 active:bg-ink-50', large ? 'w-11 rounded-l-lg' : 'w-7')} onClick={() => set((value ?? min + 1) - 1)}>
        <Minus className={large ? 'h-4 w-4' : 'h-3 w-3'} />
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        className={cn('h-full min-w-0 border-0 bg-transparent p-0 text-center tabular-nums text-ink-900 focus:outline-none focus:ring-0', large ? 'flex-1 text-[15px] font-medium' : 'w-10 text-sm')}
        value={value ?? ''}
        placeholder="–"
        onChange={(e) => {
          const n = e.target.value.replace(/\D/g, '');
          set(n === '' ? null : Number(n));
        }}
      />
      {suffix && <span className="-ml-1 pr-1 text-2xs text-ink-400">{suffix}</span>}
      <button type="button" aria-label={`${label} +`} className={cn('tap flex h-full items-center justify-center text-ink-400 hover:text-ink-900 active:bg-ink-50', large ? 'w-11 rounded-r-lg' : 'w-7')} onClick={() => set((value ?? min - 1) + 1)}>
        <Plus className={large ? 'h-4 w-4' : 'h-3 w-3'} />
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

/**
 * Wide table that scrolls sideways on narrow screens. Focusable with a name, so keyboard users can
 * scroll it too (WCAG 2.1.1).
 */
export function TableScroll({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className={cn('overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50', className)}>
      {children}
    </div>
  );
}
