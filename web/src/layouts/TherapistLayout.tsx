import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BookOpen, Building2, ChevronsUpDown, LayoutDashboard, LogOut, Menu, Plus, Search, Settings, Users, Layers, X, UserRound, Check } from 'lucide-react';
import { Logo, LocaleSwitch } from '@/components/app/Brand';
import { Avatar, Popover, MenuItem, Button } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { usePracticeAccent } from '@/lib/accent';
import { useLogout, useSession } from '@/lib/session';
import { setActivePractice } from '@/lib/api';
import { cn } from '@/lib/cn';
import { NotificationBell } from './Notifications';
import { CommandPalette } from '@/components/app/CommandPalette';
import { FeedbackButton } from '@/components/app/Feedback';
import { useQueryClient } from '@tanstack/react-query';

export function TherapistLayout() {
  const { t } = useI18n();
  const { user, practice } = useSession();
  usePracticeAccent(practice?.accent);
  const logout = useLogout();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!user || !practice) return null;
  const isAdmin = practice.role !== 'therapist';
  const links = [
    { to: '/app', end: true, icon: LayoutDashboard, label: t('Dashboard', 'Dashboard') },
    { to: '/app/patienten', icon: Users, label: t('Patiënten', 'Patients') },
    { to: '/app/oefeningen', icon: BookOpen, label: t('Oefeningen', 'Exercises') },
    { to: '/app/programmas', icon: Layers, label: t("Programma's & sjablonen", 'Programmes & templates') },
    { to: '/app/praktijk', icon: Building2, label: t('Praktijk', 'Practice') },
  ];

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo to="/app" />
        <button type="button" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 hover:bg-white/70 lg:hidden" onClick={() => setMobileOpen(false)} aria-label={t('Menu sluiten', 'Close menu')}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="px-3 pb-3">
        <Popover
          align="left"
          className="w-60"
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle} className="flex w-full items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 text-left shadow-xs transition-colors hover:border-ink-300">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-[13px] font-bold text-accent-ink">{practice.practiceName[0]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-ink-900">{practice.practiceName}</span>
                <span className="block text-[12px] text-ink-500">{{ owner: t('Eigenaar', 'Owner'), admin: t('Beheerder', 'Admin'), therapist: t('Therapeut', 'Therapist') }[practice.role]}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 text-ink-400" aria-hidden />
            </button>
          )}
        >
          {(close) =>
            user.memberships.map((m) => (
              <MenuItem
                key={m.practiceId}
                icon={m.practiceId === practice.practiceId ? <Check className="h-4 w-4 text-accent" /> : <span className="inline-block w-4" />}
                onClick={() => {
                  setActivePractice(m.practiceId);
                  close();
                  qc.invalidateQueries();
                  nav('/app');
                }}
              >
                {m.practiceName}
              </MenuItem>
            ))
          }
        </Popover>
      </div>
      <div className="px-3 pb-3">
        <Button className="h-10 w-full" icon={<Plus className="h-4 w-4" />} onClick={() => { setMobileOpen(false); nav('/app/programmas/nieuw'); }}>
          {t('Nieuw programma', 'New programme')}
        </Button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label={t('Hoofdmenu', 'Main menu')}>
        <div className="t-label px-3 pb-1 pt-1">{t('Menu', 'Menu')}</div>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'group relative flex min-h-[42px] items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors',
                // Active: white tile, green icon and a bar on the left (not colour alone: weight and shape change too).
                isActive ? 'bg-white font-semibold text-ink-950 shadow-xs ring-1 ring-line before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-accent' : 'font-medium text-ink-600 hover:bg-white/60 hover:text-ink-900',
              )
            }
          >
            {({ isActive }) => (
              <>
                <l.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-accent' : 'text-ink-500 group-hover:text-ink-700')} aria-hidden />
                <span className="min-w-0">{l.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-lg border border-line bg-white/60 px-3 py-2.5 text-[12px] leading-relaxed text-ink-500">
        {t('Ontwikkelomgeving — alleen synthetische gegevens.', 'Development environment — synthetic data only.')}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-mist lg:block">{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/35" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade-in bg-mist shadow-pop">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-white/90 px-4 backdrop-blur sm:gap-3 sm:px-6">
        <button type="button" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label={t('Menu openen', 'Open menu')}>
          <Menu className="h-5 w-5" />
        </button>
        {/* Global "jump to" search (patients, exercises, actions) — distinct from the library's own search field. */}
        <button
          type="button"
          onClick={() => setPalette(true)}
          className="flex h-10 min-w-0 shrink-0 items-center gap-2 rounded-lg border border-line bg-canvas px-3 sm:shrink text-[14px] text-ink-500 transition-colors hover:border-ink-300 hover:bg-white sm:w-full sm:max-w-sm"
        >
          <Search className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:flex-1 sm:truncate sm:text-left">{t('Snel naar…', 'Jump to…')}</span>
          <span className="sr-only">{t(' patiënt, oefening of actie', ' patient, exercise or action')}</span>
          <kbd className="hidden rounded-md border border-line bg-white px-1.5 font-sans text-2xs text-ink-500 md:block">Ctrl K</kbd>
        </button>
        <div className="flex-1" />
        <FeedbackButton />
        <LocaleSwitch />
        <NotificationBell />
        <Popover
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle} className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-ink-100" aria-haspopup="menu">
              <Avatar name={user.fullName} size={28} />
              <span className="hidden text-[13.5px] font-medium text-ink-800 sm:inline">{user.fullName}</span>
              <span className="sr-only sm:hidden">{user.fullName}</span>
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="px-2.5 py-2">
                <div className="text-[13px] font-medium">{user.fullName}</div>
                <div className="truncate text-[12px] text-ink-500">{user.email}</div>
              </div>
              <div className="my-1 h-px bg-line" />
              <MenuItem icon={<UserRound className="h-4 w-4" />} onClick={() => { close(); nav('/app/account'); }}>{t('Account', 'Account')}</MenuItem>
              {isAdmin && <MenuItem icon={<Settings className="h-4 w-4" />} onClick={() => { close(); nav('/app/praktijk'); }}>{t('Praktijkinstellingen', 'Practice settings')}</MenuItem>}
              {user.isPlatformAdmin && <MenuItem icon={<Building2 className="h-4 w-4" />} onClick={() => { close(); nav('/admin'); }}>{t('Platformbeheer', 'Platform admin')}</MenuItem>}
              <MenuItem icon={<LogOut className="h-4 w-4" />} onClick={logout}>{t('Uitloggen', 'Log out')}</MenuItem>
            </>
          )}
        </Popover>
      </header>
      <main className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
