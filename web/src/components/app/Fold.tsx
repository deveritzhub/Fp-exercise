import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const KEY = (id: string) => `fp.fold.${id}`;

function initial(id: string, defaultOpen: boolean) {
  try {
    const v = localStorage.getItem(KEY(id));
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {
    /* storage unavailable: use the default */
  }
  return defaultOpen;
}

/**
 * A section that folds to one line (title + short summary) to keep long pages scannable. The open
 * card keeps its own heading; a small button in its corner folds it again. Only the open/closed
 * choice is remembered on this device (a display preference, no health data).
 */
export function Fold({ id, title, summary, icon, defaultOpen = false, children }: { id: string; title: string; summary?: ReactNode; icon?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(() => initial(id, defaultOpen));
  const toggle = (v: boolean) => {
    setOpen(v);
    try {
      localStorage.setItem(KEY(id), v ? '1' : '0');
    } catch {
      /* ignore */
    }
  };
  if (!open) {
    return (
      <button
        type="button"
        aria-expanded={false}
        aria-controls={`fold-${id}`}
        onClick={() => toggle(true)}
        data-fold={id}
        className="tap flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 text-left shadow-card hover:border-ink-300"
      >
        {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden>{icon}</span>}
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold text-ink-900">{title}</span>
          {summary && <span className="block truncate text-[13.5px] text-ink-600">{summary}</span>}
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
      </button>
    );
  }
  return (
    <div id={`fold-${id}`} className="relative" data-fold={id}>
      {children}
      <button
        type="button"
        aria-expanded
        aria-controls={`fold-${id}`}
        aria-label={t(`${title} inklappen`, `Collapse ${title}`)}
        onClick={() => toggle(false)}
        className="tap absolute -right-1 -top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink-600 shadow-xs hover:text-ink-900"
      >
        <ChevronUp className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
