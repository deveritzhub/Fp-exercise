import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarCheck2, CloudOff, LineChart, RefreshCw, UserRound } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { usePendingCount, useOnline, useOutboxSync } from '@/lib/outbox';
import { Logo } from '@/components/app/Brand';
import { FeedbackButton } from '@/components/app/Feedback';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/cn';

/** Mobile-first shell for patients: large type, bottom tab bar, minimal chrome. */
export function PatientLayout() {
  const { t } = useI18n();
  const { user } = useSession();
  const loc = useLocation();
  const qc = useQueryClient();
  const online = useOnline();
  const pending = usePendingCount();
  useOutboxSync(user?.id, () => {
    qc.invalidateQueries({ queryKey: ['patient-home'] });
    qc.invalidateQueries({ queryKey: ['patient-history'] });
  });
  // Load every patient screen up front, so all of them also open without internet later on
  // (the service worker keeps the files).
  useEffect(() => {
    void import('@/pages/patient/PatientHome');
    void import('@/pages/patient/SessionPlayer');
    void import('@/pages/patient/PatientProgress');
    void import('@/pages/AccountPage');
  }, []);
  const inPlayer = loc.pathname.includes('/sessie');
  if (!user?.patient) return null;
  const tabs = [
    { to: '/p', end: true, icon: CalendarCheck2, label: t('Vandaag', 'Today') },
    { to: '/p/voortgang', icon: LineChart, label: t('Voortgang', 'Progress') },
    { to: '/p/account', icon: UserRound, label: t('Account', 'Account') },
  ];
  return (
    <div className="patient-app min-h-screen bg-canvas text-[16px]">
      {!inPlayer && (
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
            <Logo to="/p" className="min-h-[44px]" />
            <div className="flex min-w-0 items-center gap-1">
              <span className="truncate text-[13px] text-ink-500">{user.patient.practiceName}</span>
              <FeedbackButton big />
            </div>
          </div>
        </header>
      )}
      {(!online || pending > 0) && (
        <div role="status" className={cn('flex items-center justify-center gap-2 px-4 py-2 text-center text-[13.5px]', online ? 'bg-accent-soft text-accent' : 'bg-ink-900 text-white')}>
          {online ? <RefreshCw className="h-4 w-4 shrink-0 animate-spin" /> : <CloudOff className="h-4 w-4 shrink-0" />}
          {!online
            ? pending > 0
              ? t('Geen internet. Houd de app open: je training wordt verstuurd zodra er weer verbinding is.', 'No internet. Keep the app open: your workout is sent as soon as you are back online.')
              : t('Geen internet. Je kunt gewoon trainen; we versturen het later.', 'No internet. You can still train; we will send it later.')
            : t('Je training wordt verstuurd…', 'Sending your workout…')}
        </div>
      )}
      <main className={cn('mx-auto max-w-xl', inPlayer ? '' : 'px-4 pb-28 pt-5')}>
        <Outlet />
      </main>
      {!inPlayer && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label={t('Navigatie', 'Navigation')}>
          <div className="mx-auto grid max-w-xl grid-cols-3">
            {tabs.map((tab) => (
              <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => cn('flex flex-col items-center gap-1 py-2.5 text-[12.5px] font-medium', isActive ? 'text-accent' : 'text-ink-500')}>
                <tab.icon className="h-6 w-6" strokeWidth={1.8} />
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
