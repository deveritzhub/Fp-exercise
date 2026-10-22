import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...rest} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink-950">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow, children }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 sm:mb-6">
      <div className="min-w-0 flex-[1_1_14rem]">
        {eyebrow && <div className="mb-1.5 text-[13px] text-ink-500">{eyebrow}</div>}
        <h1 className="text-[22px] font-semibold leading-tight [overflow-wrap:anywhere] min-[360px]:text-2xl sm:text-[26px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14.5px] text-ink-500">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Stat({ label, value, hint, icon, tone }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: 'default' | 'warn' }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between text-[13px] text-ink-500">
        <span>{label}</span>
        {icon && <span className={cn('text-ink-400', tone === 'warn' && 'text-warn')}>{icon}</span>}
      </div>
      <div className="mt-2 text-[26px] font-semibold tabular-nums tracking-tight text-ink-950">{value}</div>
      {hint && <div className="mt-1 text-[12.5px] text-ink-500">{hint}</div>}
    </div>
  );
}
