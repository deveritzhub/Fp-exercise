import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { BookOpen, Building2, ChevronsUpDown, LayoutDashboard, LogOut, Menu, Plus, Settings, Users, Layers, X, UserRound, Check } from 'lucide-react';
import { Logo, LocaleSwitch } from '@/components/app/Brand';
import { Avatar, Popover, MenuItem, Button } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useLogout, useSession } from '@/lib/session';
import { setActivePractice } from '@/lib/api';
import { cn } from '@/lib/cn';
import { NotificationBell } from './Notifications';
import { useQueryClient } from '@tanstack/react-query';

export function TherapistLayout() {
  const { t } = useI18n();
  const { user, practice } = useSession();
  const logout = useLogout();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
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
      <div className="flex h-14 items-center justify-between px-4">
        <Logo to="/app" />
        <button type="button" className="rounded-md p-1 text-ink-500 lg:hidden" onClick={() => setMobileOpen(false)} aria-label={t('Menu sluiten', 'Close menu')}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="px-3 pb-3">
        <Popover
          align="left"
          className="w-60"
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle} className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-white px-2.5 py-2 text-left shadow-xs hover:border-ink-200">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft text-[11px] font-bold text-accent">{practice.practiceName[0]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{practice.practiceName}</span>
                <span className="block text-2xs text-ink-500">{{ owner: t('Eigenaar', 'Owner'), admin: t('Beheerder', 'Admin'), therapist: t('Therapeut', 'Therapist') }[practice.role]}</span>
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-ink-400" />
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
      <div className="px-3 pb-2">
        <Button className="w-full" icon={<Plus className="h-4 w-4" />} onClick={() => { setMobileOpen(false); nav('/app/programmas/nieuw'); }}>
          {t('Nieuw programma', 'New programme')}
        </Button>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label={t('Hoofdmenu', 'Main menu')}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors', isActive ? 'bg-white text-ink-950 shadow-xs ring-1 ring-line' : 'text-ink-600 hover:bg-ink-100/70 hover:text-ink-900')
            }
          >
            <l.icon className="h-4 w-4 shrink-0" />
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-3 text-2xs leading-relaxed text-ink-500">
        {t('Ontwikkelomgeving — alleen synthetische gegevens.', 'Development environment — synthetic data only.')}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-[#efebe3] lg:block">{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-slide-up bg-[#efebe3] shadow-pop">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-6">
        <button type="button" className="-ml-1 rounded-md p-1.5 text-ink-600 lg:hidden" onClick={() => setMobileOpen(true)} aria-label={t('Menu openen', 'Open menu')}>
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex-1" />
        <LocaleSwitch />
        <NotificationBell />
        <Popover
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle} className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-ink-100" aria-haspopup="menu">
              <Avatar name={user.fullName} size={28} />
              <span className="hidden text-[13px] font-medium sm:inline">{user.fullName}</span>
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
      <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
