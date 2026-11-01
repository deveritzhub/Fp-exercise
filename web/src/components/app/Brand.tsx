import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';
import { Languages } from 'lucide-react';

export function Logo({ className, to = '/', compact }: { className?: string; to?: string; compact?: boolean }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5 text-ink-950', className)} aria-label={compact ? 'FP Flow' : undefined}>
      <img src="/favicon.svg" alt="" className="h-8 w-8 shrink-0 rounded-lg" aria-hidden="true" />
      {!compact && (
        <span className="flex flex-col whitespace-nowrap leading-none">
          <span className="font-display text-[16px] font-extrabold uppercase tracking-[0.12em] text-brand-forest">FP Flow</span>
          <span className="mt-1 hidden text-[9.5px] font-medium uppercase tracking-[0.24em] text-ink-500 min-[360px]:block">Functional Performance</span>
        </span>
      )}
    </Link>
  );
}

export function LocaleSwitch({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'nl' ? 'en' : 'nl')}
      className={cn('inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13.5px] font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900', className)}
      aria-label={t('Taal wijzigen naar EN', 'Switch language to NL')}
    >
      <Languages className="h-4 w-4" />
      {locale === 'nl' ? 'EN' : 'NL'}
    </button>
  );
}
