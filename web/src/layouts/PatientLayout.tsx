import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarCheck2, LineChart, UserRound } from 'lucide-react';
import { Logo } from '@/components/app/Brand';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/cn';

/** Mobile-first shell for patients: large type, bottom tab bar, minimal chrome. */
export function PatientLayout() {
  const { t } = useI18n();
  const { user } = useSession();
  const loc = useLocation();
  const inPlayer = loc.pathname.includes('/sessie');
  if (!user?.patient) return null;
  const tabs = [
    { to: '/p', end: true, icon: CalendarCheck2, label: t('Vandaag', 'Today') },
    { to: '/p/voortgang', icon: LineChart, label: t('Voortgang', 'Progress') },
    { to: '/p/account', icon: UserRound, label: t('Account', 'Account') },
  ];
  return (
    <div className="min-h-screen bg-canvas text-[16px]">
      {!inPlayer && (
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
            <Logo to="/p" />
            <span className="max-w-[50%] truncate text-[13px] text-ink-500">{user.patient.practiceName}</span>
          </div>
        </header>
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
