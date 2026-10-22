import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';
import { Languages } from 'lucide-react';

export function Logo({ className, to = '/', compact }: { className?: string; to?: string; compact?: boolean }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5 font-semibold tracking-tight text-ink-950', className)} aria-label="FP Exercise">
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-accent" />
        <path d="M10 22V10h9M10 16h7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="22.5" cy="20.5" r="2.5" fill="#9fd3c4" />
      </svg>
      {!compact && <span className="text-[15px]">FP Exercise</span>}
    </Link>
  );
}

export function LocaleSwitch({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'nl' ? 'en' : 'nl')}
      className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900', className)}
      aria-label={t('Taal wijzigen naar Engels', 'Switch language to Dutch')}
    >
      <Languages className="h-4 w-4" />
      {locale === 'nl' ? 'EN' : 'NL'}
    </button>
  );
}
