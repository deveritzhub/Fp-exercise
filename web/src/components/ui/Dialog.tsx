import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';

/**
 * Accessible modal built on the native <dialog> element (focus trapping, Esc, inert background).
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', side, sheet }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  side?: boolean;
  /** Bottom sheet on phones (thumb-friendly), regular centred dialog from `sm` up. */
  sheet?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  const titleId = useId();
  const descId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // showModal() focuses the first control; a dialog can name a safer default (e.g. "Doorgaan").
      d.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  const sheetWidths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'm-0 max-h-none w-full bg-transparent p-0 backdrop:bg-ink-950/30 backdrop:backdrop-blur-[2px]',
        side
          ? 'ml-auto h-full max-w-xl'
          : sheet
            ? cn('mb-0 mt-auto max-h-[92dvh] max-w-none sm:mx-auto sm:mb-auto sm:mt-[8vh] sm:max-h-[84vh]', sheetWidths[size])
            : cn('mx-auto mt-[8vh] max-h-[84vh]', widths[size]),
      )}
    >
      {open && (
        <div
          className={cn(
            'flex flex-col overflow-hidden bg-white shadow-pop',
            side
              ? 'h-full animate-slide-up border-l border-line'
              : sheet
                ? 'max-h-[92dvh] animate-slide-up rounded-t-2xl border-t border-line pb-[env(safe-area-inset-bottom)] sm:mx-4 sm:max-h-[84vh] sm:animate-scale-in sm:rounded-2xl sm:border sm:pb-0'
                : 'mx-4 max-h-[84vh] animate-scale-in rounded-2xl border border-line',
          )}
        >
          {sheet && <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-ink-200 sm:hidden" aria-hidden />}
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={titleId} className="text-base font-semibold">{title}</h2>
              {description && <p id={descId} className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label={t('Sluiten', 'Close')} className="-mr-3 -mt-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-500 hover:bg-ink-100 hover:text-ink-800">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-ink-50/50 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
