import { useEffect } from 'react';
import { TestBanner } from '@/components/app/TestBanner';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarCheck2, CloudOff, Dumbbell, HeartPulse, Move, RefreshCw, Settings, Trophy } from 'lucide-react';
import type { PatientHomeData } from '@/pages/patient/PatientHome';
import { isClinical } from '@shared/accountKind';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { HeroState } from '@/lib/types';
import { usePendingCount, useOnline, useOutboxSync } from '@/lib/outbox';
import { Logo } from '@/components/app/Brand';
import { FeedbackButton } from '@/components/app/Feedback';
import { useI18n, useAccountKind } from '@/lib/i18n';
import { usePracticeAccent } from '@/lib/accent';
import { useTextSize } from '@/lib/textSize';
import { useSession } from '@/lib/session';
import { QuickLogButton } from '@/components/patient/QuickLog';
import { cn } from '@/lib/cn';

const HERO_LATER_KEY = 'fp.heroLater';

/** Mobile-first shell for patients: large type, bottom tab bar, minimal chrome. */
export function PatientLayout() {
  const { t } = useI18n();
  const { user } = useSession();
  usePracticeAccent(user?.patient?.accent);
  useAccountKind(user?.patient?.kind);
  useTextSize();
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
  // Load the main patient screens ahead, so they still open when the connection drops
  // during a workout (in a basement gym, on the train).
  useEffect(() => {
    const warm = () => {
      void import('@/pages/patient/PatientHome').catch(() => {});
      void import('@/pages/patient/SessionPlayer').catch(() => {});
      void import('@/pages/patient/ModulePage').catch(() => {});
    };
    warm();
  }, []);
  useEffect(() => {
    void import('@/pages/patient/PatientHome');
    void import('@/pages/patient/SessionPlayer');
    void import('@/pages/patient/PatientProgress');
    void import('@/pages/patient/ModulePage');
    void import('@/pages/patient/GymLogPage');
    void import('@/pages/patient/SettingsPage');
    void import('@/pages/AccountPage');
    void import('@/pages/patient/HeroPages');
    void import('@/pages/patient/LogbookPage');
  }, []);
  const inPlayer = loc.pathname.includes('/sessie');
  // Links with a #section (e.g. /p/held#boss) scroll to it once the page has rendered its data.
  useEffect(() => {
    if (!loc.hash) return;
    const id = decodeURIComponent(loc.hash.slice(1));
    let tries = 0;
    const timer = setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++tries > 20) {
        clearInterval(timer);
        el?.scrollIntoView({ block: 'start' });
      }
    }, 100);
    return () => clearInterval(timer);
  }, [loc.pathname, loc.hash]);
  // Messages appear above the tab bar (with the + button in it), not on top of the tabs.
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--toast-bottom', inPlayer ? '1rem' : 'calc(env(safe-area-inset-bottom, 0px) + 92px)');
    return () => { root.removeProperty('--toast-bottom'); };
  }, [inPlayer]);
  // Creating the hero is a focused flow: no tab bar.
  const inSetup = loc.pathname === '/p/held/nieuw';
  // First visit: create the sports hero first (once per session it can be postponed with "Later").
  const hero = useQuery({ queryKey: ['patient-hero'], queryFn: () => api.get<HeroState>('/patient/hero'), enabled: !!user?.patient });
  const home = useQuery({ queryKey: ['patient-home'], queryFn: () => api.get<PatientHomeData>('/patient/home'), enabled: !!user?.patient });
  let later = false;
  try {
    later = sessionStorage.getItem(HERO_LATER_KEY) === '1';
  } catch {
    /* storage unavailable */
  }
  if (!user?.patient) return null;
  if (loc.pathname === '/p' && hero.data && !hero.data.hero && !later) return <Navigate to="/p/held/nieuw" replace />;
  // Tabs: today's overview, one per part (rehabilitation only with a physiotherapist), and the hero
  // (logbook inside). A dot marks a part that still has a workout open today. Account is in the header.
  const clinical = isClinical(user.patient.kind);
  const openIn = (m: string) => (home.data?.programs ?? []).some((p) => (p.module === m || (m === 'revalidatie' && p.module !== 'kracht' && p.module !== 'mobiliteit')) && !p.paused && ((p.today.scheduled > 0 && !p.today.done) || !!p.openSession));
  const tabs = [
    { to: '/p', end: true, icon: CalendarCheck2, label: t('Vandaag', 'Today'), dot: false },
    ...(clinical ? [{ to: '/p/revalidatie', end: false, icon: HeartPulse, label: t('Revalidatie', 'Rehab'), dot: openIn('revalidatie') }] : []),
    { to: '/p/kracht', end: false, icon: Dumbbell, label: t('Kracht', 'Strength'), dot: openIn('kracht') },
    { to: '/p/mobiliteit', end: false, icon: Move, label: t('Mobiliteit', 'Mobility'), dot: openIn('mobiliteit') },
    { to: '/p/held', end: false, icon: Trophy, label: t('Held', 'Hero'), dot: false },
  ];
  const renderTab = (tab: (typeof tabs)[number]) => (
    <NavLink key={tab.to} to={tab.to} end={tab.end} aria-label={tab.dot ? t(`${tab.label} (nog open)`, `${tab.label} (still open)`) : undefined} className={({ isActive }) => cn('tap group flex min-h-[60px] min-w-0 flex-col items-center justify-center gap-1 py-2', tabs.length === 5 ? 'text-[10.5px] tracking-[-0.01em]' : 'text-[12.5px]', isActive ? 'font-semibold text-accent' : 'font-medium text-ink-500 hover:text-ink-800')}>
      {({ isActive }) => (
        <>
          {/* Active tab: filled sage pill behind the icon plus bold label, not colour alone. */}
          <span className={cn('relative flex h-8 w-11 items-center justify-center rounded-full transition-colors', isActive ? 'bg-accent-soft' : 'group-hover:bg-ink-100')}>
            <tab.icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
            {tab.dot && <span className="absolute right-1 top-0.5 h-2.5 w-2.5 rounded-full bg-[#c2410c] ring-2 ring-white" aria-hidden />}
          </span>
          <span className="max-w-full truncate">{tab.label}</span>
        </>
      )}
    </NavLink>
  );
  return (
    <div className="patient-app min-h-screen bg-canvas text-[16px] print:bg-white">
      {!inPlayer && (
        <header className="sticky top-0 z-20 border-b print:hidden border-line bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-xl items-center justify-between gap-3 px-4">
            {/* Narrow phones: logo mark only, so the practice name fits in full. */}
            <Logo to="/p" compact className="min-h-[44px] min-w-[44px] justify-center min-[430px]:hidden" />
            <Logo to="/p" className="hidden min-h-[44px] min-[430px]:inline-flex" />
            <div className="flex min-w-0 items-center gap-1">
              <span className="min-w-0 text-right text-[13.5px] font-medium leading-tight text-ink-600">{user.patient.kind === 'personal' ? t('Persoonlijk account', 'Personal account') : user.patient.practiceName}</span>
              <FeedbackButton big />
              <Link to="/p/instellingen" aria-label={t('Instellingen', 'Settings')} title={t('Instellingen', 'Settings')} className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100', (loc.pathname.startsWith('/p/instellingen') || loc.pathname.startsWith('/p/account')) && 'bg-accent-soft text-accent')}>
                <Settings className="h-[22px] w-[22px]" aria-hidden />
              </Link>
            </div>
          </div>
        </header>
      )}
      {(!online || pending > 0) && (
        <div role="status" className={cn('flex items-center justify-center gap-2 px-4 py-2 print:hidden text-center text-[13.5px]', online ? 'bg-accent-soft text-accent' : 'bg-ink-900 text-white')}>
          {online ? <RefreshCw className="h-4 w-4 shrink-0 animate-spin" /> : <CloudOff className="h-4 w-4 shrink-0" />}
          {!online
            ? pending > 0
              ? t('Geen internet. Houd de app open: je training wordt verstuurd zodra er weer verbinding is.', 'No internet. Keep the app open: your workout is sent as soon as you are back online.')
              : t('Geen internet. Je kunt gewoon trainen; we versturen het later.', 'No internet. You can still train; we will send it later.')
            : t('Je training wordt verstuurd…', 'Sending your workout…')}
        </div>
      )}
      <TestBanner />
      <main className={cn('mx-auto max-w-xl print:max-w-none print:p-0', inPlayer ? '' : 'px-4 pb-28 pt-5')}>
        <Outlet />
      </main>
      {!inPlayer && !inSetup && (
        <nav className="fixed inset-x-0 bottom-0 z-30 print:hidden border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label={t('Navigatie', 'Navigation')}>
          {/* The + (quick log) sits exactly in the middle: two tabs on the left, the rest on the right. */}
          <div className="mx-auto flex max-w-xl">
            <div className="grid min-w-0 flex-1 grid-cols-2">{tabs.slice(0, 2).map(renderTab)}</div>
            <div className="flex w-[60px] shrink-0 items-start justify-center">{!inSetup && <QuickLogButton />}</div>
            <div className={cn('grid min-w-0 flex-1', tabs.length - 2 === 3 ? 'grid-cols-3' : 'grid-cols-2')}>{tabs.slice(2).map(renderTab)}</div>
          </div>
        </nav>
      )}
    </div>
  );
}
