import { useView } from '@/components/patient/ViewChoice';
import { useEffect } from 'react';
import { TestBanner } from '@/components/app/TestBanner';
import { WelcomeTour } from '@/components/patient/WelcomeTour';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Apple, Bell, CalendarCheck2, CloudOff, Dumbbell, HeartPulse, Move, RefreshCw, Settings, Trophy } from 'lucide-react';
import type { PatientHomeData } from '@/pages/patient/PatientHome';
import { isClinical } from '@shared/accountKind';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePendingCount, useOnline, useOutboxSync } from '@/lib/outbox';
import { Logo } from '@/components/app/Brand';
import { FeedbackButton } from '@/components/app/Feedback';
import { useI18n, useAccountKind } from '@/lib/i18n';
import { usePracticeAccent } from '@/lib/accent';
import { useTextSize } from '@/lib/textSize';
import { useSession } from '@/lib/session';
import { QuickLogButton } from '@/components/patient/QuickLog';
import { BackToGame } from '@/components/patient/BackToGame';
import { closeGameFrame, inGameFrame } from '@/components/patient/GamePage';
import { PhaseCelebration } from '@/components/patient/PhaseCelebration';
import { UpdateNotice } from '@/components/app/WhatsNew';
import { cn } from '@/lib/cn';


/** Messages from the practice, with a dot while something is unread. */
function MessagesButton() {
  const { t } = useI18n();
  const loc = useLocation();
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<{ unread: number }>('/me/notifications'), refetchInterval: 120_000 });
  const unread = q.data?.unread ?? 0;
  return (
    <Link to="/p/berichten" aria-label={unread ? t(`Berichten (${unread} nieuw)`, `Messages (${unread} new)`) : t('Berichten', 'Messages')} title={t('Berichten', 'Messages')}
      className={cn('relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100', loc.pathname.startsWith('/p/berichten') && 'bg-accent-soft text-accent')}>
      <Bell className="h-[22px] w-[22px]" aria-hidden />
      {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#c2410c] ring-2 ring-white" aria-hidden />}
    </Link>
  );
}

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
  // Load the patient screens ahead, so they still open when the connection drops during a
  // workout (in a basement gym, on the train); the service worker keeps the files.
  useEffect(() => {
    const pages = [
      () => import('@/pages/patient/PatientHome'),
      () => import('@/pages/patient/SessionPlayer'),
      () => import('@/pages/patient/PatientProgress'),
      () => import('@/pages/patient/ModulePage'),
      () => import('@/pages/patient/HeroPages'),
      () => import('@/pages/patient/WorldMapPage'),
      () => import('@/pages/patient/GymLogPage'),
      () => import('@/pages/patient/MobilityTestsPage'),
      () => import('@/pages/patient/AtlasPage'),
      () => import('@/pages/patient/SettingsPage'),
      () => import('@/pages/AccountPage'),
      () => import('@/pages/patient/LogbookPage'),
      () => import('@/pages/patient/MessagesPage'),
      () => import('@/pages/patient/ComplaintExplanationPage'),
    ];
    for (const load of pages) void load().catch(() => {});
  }, []);
  const inPlayer = loc.pathname.includes('/sessie');
  // Playing one of the little games: the play area gets the whole screen, without the tab bar over it.
  const playingGame = /^\/p\/spellen\/[^/]+$/.test(loc.pathname);
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
  // Opening the app after being away starts on Today, not in the game where it was left.
  const nav = useNavigate();
  useEffect(() => {
    const KEY = 'fp.p.seen';
    const stamp = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* storage optional */ } };
    const inGame = () => /^\/p\/(dorp|wereld)(\/|$)/.test(window.location.pathname);
    // Back after a quarter of an hour or more, and the game is what was left open: go to Today.
    const back = () => {
      try {
        const seen = Number(localStorage.getItem(KEY)) || 0;
        if (seen && Date.now() - seen > 15 * 60_000 && inGame()) nav('/p', { replace: true });
      } catch { /* storage optional */ }
      stamp();
    };
    // Opening the app (a new tab or the installed app starting) always starts on Today; the 3D village
    // is one tap away there. A reload within the same visit keeps the place.
    try {
      if (!sessionStorage.getItem('fp.p.open') && inGame()) nav('/p', { replace: true });
      sessionStorage.setItem('fp.p.open', '1');
    } catch { /* storage optional */ }
    back();
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') stamp(); }, 60_000);
    const seenChange = () => (document.visibilityState === 'visible' ? back() : stamp());
    document.addEventListener('visibilitychange', seenChange);
    window.addEventListener('pagehide', stamp);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', seenChange); window.removeEventListener('pagehide', stamp); };
  }, [nav]);
  const home = useQuery({ queryKey: ['patient-home'], queryFn: () => api.get<PatientHomeData>('/patient/home'), enabled: !!user?.patient });
  const { simple: simpleView } = useView();
  const simple = simpleView === true;
  if (!user?.patient) return null;
  // Shown in the game's panel: only the page itself, no header and no tabs. The village itself never
  // opens inside the panel: a way back to it closes the panel instead.
  if (inGameFrame()) {
    // The way back to the village, or to Today (where most pages lead back to), closes the panel.
    if (loc.pathname.startsWith('/p/dorp') || loc.pathname === '/p' || loc.pathname === '/p/') {
      closeGameFrame();
      return null;
    }
    return (
      <div className="patient-app min-h-screen bg-canvas text-[16px]">
        <main className="mx-auto max-w-xl px-4 pb-10 pt-4"><Outlet /></main>
      </div>
    );
  }
  // Today always opens on today's training. Someone without a hero gets an invitation there, not the
  // character creator in the way (a new account still starts with it, straight after signing up).
  // Tabs: today's overview, one per part (rehabilitation only with a physiotherapist), and the hero
  // (logbook inside). A dot marks a part that still has a workout open today. Account is in the header.
  const clinical = isClinical(user.patient.kind);
  const openIn = (m: string) => (home.data?.programs ?? []).some((p) => (p.module === m || (m === 'revalidatie' && p.module !== 'kracht' && p.module !== 'mobiliteit')) && !p.paused && ((p.today.scheduled > 0 && !p.today.done) || !!p.openSession));
  const hasPart = (m: string) => (home.data?.programs ?? []).some((p) => p.module === m);
  const tabs = [
    { to: '/p', end: true, icon: CalendarCheck2, label: t('Vandaag', 'Today'), dot: false },
    ...(clinical ? [{ to: '/p/revalidatie', end: false, icon: HeartPulse, label: t('Revalidatie', 'Rehab'), dot: openIn('revalidatie') }] : []),
    { to: '/p/kracht', end: false, icon: Dumbbell, label: t('Kracht', 'Strength'), dot: openIn('kracht') },
    { to: '/p/mobiliteit', end: false, icon: Move, label: t('Mobiliteit', 'Mobility'), dot: openIn('mobiliteit') },
    { to: '/p/voeding', end: false, icon: Apple, label: t('Voeding', 'Food'), dot: false },
    // Plain view: no hero, and only the parts that have a programme; progress takes the hero's place.
    ...(simple ? [{ to: '/p/voortgang', end: false, icon: Trophy, label: t('Voortgang', 'Progress'), dot: false }] : [{ to: '/p/held', end: false, icon: Trophy, label: t('Held', 'Hero'), dot: false, also: ['/p/dorp', '/p/spellen'] }]),
  ].filter((tab) => !simple || !['/p/kracht', '/p/mobiliteit'].includes(tab.to) || hasPart(tab.to.slice(3)));
  // The + sits in the middle: as many tabs on its left as fit evenly, the rest on its right.
  const half = Math.floor(tabs.length / 2);
  // The hero tab opens the hero page; the 3D world counts as that tab too.
  const tabOn = (tab: (typeof tabs)[number], isActive: boolean) => isActive || ('also' in tab && !!tab.also && tab.also.some((a) => loc.pathname.startsWith(a)));
  const renderTab = (tab: (typeof tabs)[number]) => (
    <NavLink key={tab.to} to={tab.to} end={tab.end} data-testid={'also' in tab && tab.also ? 'tab-hero' : undefined} aria-label={tab.dot ? t(`${tab.label} (nog open)`, `${tab.label} (still open)`) : undefined} className={({ isActive: navActive }) => { const isActive = tabOn(tab, navActive); return cn('tap group flex min-h-[60px] min-w-0 flex-col items-center justify-center gap-1 py-2', tabs.length >= 6 ? 'text-[10px] tracking-[-0.02em]' : tabs.length === 5 ? 'text-[10.5px] tracking-[-0.01em]' : 'text-[12.5px]', isActive ? 'font-semibold text-accent' : 'font-medium text-ink-500 hover:text-ink-800'); }}>
      {({ isActive: navActive }) => { const isActive = tabOn(tab, navActive); return (
        <>
          {/* Active tab: filled sage pill behind the icon plus bold label, not colour alone. */}
          <span className={cn('relative flex h-8 w-11 items-center justify-center rounded-full transition-colors', isActive ? 'bg-accent-soft' : 'group-hover:bg-ink-100')}>
            <tab.icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
            {tab.dot && <span className="absolute right-1 top-0.5 h-2.5 w-2.5 rounded-full bg-[#c2410c] ring-2 ring-white" aria-hidden />}
          </span>
          <span className="max-w-full truncate">{tab.label}</span>
        </>
      ); }}
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
              <span className="line-clamp-2 min-w-0 text-right text-[12.5px] font-medium leading-[1.15] text-ink-600 min-[400px]:text-[13px]" title={user.patient.kind === 'personal' ? undefined : user.patient.practiceName}>{user.patient.kind === 'personal' ? t('Persoonlijk account', 'Personal account') : user.patient.practiceName}</span>
              <MessagesButton />
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
      {/* First use: a short welcome on Vandaag (after the hero is made or postponed). */}
      {loc.pathname === '/p' && <WelcomeTour />}
      {/* A released rehabilitation phase: celebrate once (not during a workout or hero setup). */}
      {!inPlayer && !inSetup && <PhaseCelebration />}
      <main className={cn('mx-auto max-w-xl print:max-w-none print:p-0', inPlayer ? '' : playingGame ? 'px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5' : 'px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-5')}>
        {!inPlayer && <UpdateNotice audience="patient" clinical={isClinical(user?.patient?.kind)} />}
        {!inPlayer && <BackToGame />}
        <Outlet />
      </main>
      {!inPlayer && !inSetup && !playingGame && (
        <nav className="fixed inset-x-0 bottom-0 z-30 print:hidden border-t border-line bg-white pb-[env(safe-area-inset-bottom)]" aria-label={t('Navigatie', 'Navigation')}>
          {/* The + (quick log) sits exactly in the middle: two tabs on the left, the rest on the right. */}
          {simple ? (
            // Plain view: a few large tabs of equal width, and no quick-log button between them.
            <div className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>{tabs.map(renderTab)}</div>
          ) : (
          <div className="mx-auto flex max-w-xl">
            <div className="grid min-w-0" style={{ flex: half, gridTemplateColumns: `repeat(${half}, minmax(0, 1fr))` }}>{tabs.slice(0, half).map(renderTab)}</div>
            <div className="flex w-[56px] shrink-0 items-start justify-center">{!inSetup && <QuickLogButton />}</div>
            <div className="grid min-w-0" style={{ flex: tabs.length - half, gridTemplateColumns: `repeat(${tabs.length - half}, minmax(0, 1fr))` }}>{tabs.slice(half).map(renderTab)}</div>
          </div>
          )}
        </nav>
      )}
    </div>
  );
}
