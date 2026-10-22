import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, RotateCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useI18n, errorMessage } from '@/lib/i18n';
import { ApiError } from '@/lib/api';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-10 text-sm text-ink-500', className)} role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label && <span>{label}</span>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white text-ink-500 shadow-xs">{icon}</div>}
      <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13.5px] text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const { locale, t } = useI18n();
  const code = error instanceof ApiError ? error.code : undefined;
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)} role="alert">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-bad-soft text-bad">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="text-sm text-ink-700">{errorMessage(code, locale)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" icon={<RotateCw className="h-3.5 w-3.5" />} onClick={onRetry}>
          {t('Opnieuw proberen', 'Try again')}
        </Button>
      )}
    </div>
  );
}

export function Notice({ tone = 'info', title, children, icon, className }: { tone?: 'info' | 'warn' | 'ok' | 'bad'; title?: ReactNode; children?: ReactNode; icon?: ReactNode; className?: string }) {
  const tones = { info: 'bg-info-soft text-info border-info/15', warn: 'bg-warn-soft text-warn border-warn/20', ok: 'bg-ok-soft text-ok border-ok/15', bad: 'bg-bad-soft text-bad border-bad/15' };
  return (
    <div className={cn('flex gap-3 rounded-xl border px-4 py-3 text-[13.5px]', tones[tone], className)}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0">
        {title && <div className="font-medium">{title}</div>}
        {children && <div className={cn('text-ink-700', title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  );
}
