import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...rest} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="t-card">{title}</h2>
        {description && <p className="t-help mt-0.5">{description}</p>}
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
        <h1 className="t-page [overflow-wrap:anywhere]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-500">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * A key figure: label, the number with its icon beside it, and a short hint. With `to` (a route) or
 * `href` (an anchor on the same page) the whole card is a link, with a small arrow by the label.
 */
export function Stat({ label, value, hint, icon, tone, to, href }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: 'default' | 'warn'; to?: string; href?: string }) {
  const link = !!(to || href);
  const body = (
    <>
      <div className="flex items-start justify-between gap-1">
        <span className="min-w-0 text-[13.5px] font-medium leading-snug text-ink-600 [overflow-wrap:anywhere]">{label}</span>
        {link && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5" aria-hidden />}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-display text-[28px] font-bold leading-none tabular-nums tracking-tight text-ink-950">{value}</span>
        {icon && <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone === 'warn' ? 'bg-warn-soft text-warn' : 'bg-sage text-accent')} aria-hidden>{icon}</span>}
      </div>
      {hint && <div className="mt-1.5 text-[12.5px] leading-snug text-ink-500">{hint}</div>}
    </>
  );
  const cls = 'card group block h-full p-4 transition-colors hover:border-ink-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent sm:p-5';
  if (to) return <Link to={to} className={cls}>{body}</Link>;
  if (href) return <a href={href} className={cls}>{body}</a>;
  return <div className="card h-full p-4 sm:p-5">{body}</div>;
}
