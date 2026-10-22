import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';

/**
 * Accessible modal built on the native <dialog> element (focus trapping, Esc, inert background).
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', side }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  side?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  const titleId = useId();
  const descId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
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
        side ? 'ml-auto h-full max-w-xl' : cn('mx-auto mt-[8vh] max-h-[84vh]', widths[size]),
      )}
    >
      {open && (
        <div
          className={cn(
            'flex flex-col overflow-hidden bg-white shadow-pop',
            side ? 'h-full animate-slide-up border-l border-line' : 'mx-4 max-h-[84vh] animate-scale-in rounded-2xl border border-line',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={titleId} className="text-base font-semibold">{title}</h2>
              {description && <p id={descId} className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label={t('Sluiten', 'Close')} className="-mr-1 rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-800">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-ink-50/50 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
