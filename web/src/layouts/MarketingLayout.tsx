import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo, LocaleSwitch } from '@/components/app/Brand';
import { ButtonLink } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';

export function MarketingLayout() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  const links = [
    { to: '/functies', label: t('Functies', 'Features') },
    { to: '/hoe-het-werkt', label: t('Hoe het werkt', 'How it works') },
    { to: '/prijzen', label: t('Prijzen', 'Pricing') },
    { to: '/demo', label: t('Demo', 'Demo') },
    { to: '/contact', label: t('Contact', 'Contact') },
  ];
  return (
    <div className="min-h-screen bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow-pop">
        {t('Naar inhoud', 'Skip to content')}
      </a>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
          <Logo />
          <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label={t('Hoofdnavigatie', 'Main navigation')}>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => cn('rounded-lg px-3 py-2 text-[14px] font-medium transition-colors', isActive ? 'text-ink-950' : 'text-ink-500 hover:text-ink-900')}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LocaleSwitch className="hidden sm:inline-flex" />
            <Link to="/login" className="hidden rounded-lg px-3 py-2 text-[14px] font-medium text-ink-700 hover:text-ink-950 sm:block">
              {t('Inloggen', 'Log in')}
            </Link>
            <ButtonLink to="/contact?onderwerp=demo" size="md" className="hidden sm:inline-flex">
              {t('Plan een demo', 'Book a demo')}
            </ButtonLink>
            <button type="button" className="rounded-lg p-2 text-ink-700 md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={t('Menu', 'Menu')}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-line px-5 py-3 md:hidden">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className="block rounded-lg px-2 py-2.5 text-[15px] font-medium text-ink-800">
                {l.label}
              </NavLink>
            ))}
            <div className="mt-2 flex items-center gap-2 border-t border-line pt-3">
              <ButtonLink to="/login" variant="secondary" className="flex-1">{t('Inloggen', 'Log in')}</ButtonLink>
              <LocaleSwitch />
            </div>
          </nav>
        )}
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-ink-500">
              {t('Oefentherapie voorschrijven, volgen en bijsturen. Gebouwd met en voor fysiotherapeuten in Nederland.', 'Prescribe, monitor and adjust exercise therapy. Built with and for physiotherapists in the Netherlands.')}
            </p>
          </div>
          <FooterCol title={t('Product', 'Product')} links={[['/functies', t('Functies', 'Features')], ['/hoe-het-werkt', t('Hoe het werkt', 'How it works')], ['/prijzen', t('Prijzen', 'Pricing')], ['/demo', 'Demo']]} />
          <FooterCol title={t('Bedrijf', 'Company')} links={[['/contact', 'Contact'], ['/login', t('Inloggen', 'Log in')]]} />
          <FooterCol title={t('Juridisch', 'Legal')} links={[['/privacy', t('Privacyverklaring', 'Privacy notice')], ['/voorwaarden', t('Voorwaarden', 'Terms')], ['/cookies', t('Cookies', 'Cookies')]]} />
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-[12.5px] text-ink-500 sm:flex-row sm:justify-between">
            <span>© {new Date().getFullYear()} FP Exercise</span>
            <span>{t('FP Exercise is een hulpmiddel voor zorgprofessionals en stelt geen diagnoses.', 'FP Exercise is a tool for healthcare professionals and does not make diagnoses.')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="text-[13px] font-bold text-ink-900">{title}</h2>
      <ul className="mt-3 space-y-2">
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to} className="text-[14px] text-ink-500 hover:text-ink-900">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
