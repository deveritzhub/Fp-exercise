import { isClinical } from '@shared/accountKind';
import { Link } from 'react-router-dom';
import { ChevronRight, LogOut, Shield, UserRound, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useLogout, useSession } from '@/lib/session';
import { useDocumentMeta } from '@/lib/meta';
import { Button, Card } from '@/components/ui';
import { ReminderCard } from '@/components/app/Reminders';
import { ViewCard } from '@/components/patient/ViewChoice';
import { ConsentToggle, MyDataCard, useModes } from '@/components/patient/Modules';
import { TextSizeCard, ThemeCard } from '@/pages/AccountPage';
import { WhatsNew } from '@/components/app/WhatsNew';

/**
 * Patient settings in one place: what is shared with the practice and with friends, reminders,
 * text size, your data and privacy, account and logging out. Opened from the icon in the header.
 */
export function SettingsPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Instellingen', 'Settings'));
  const { user } = useSession();
  const modes = useModes();
  const logout = useLogout();
  if (!user?.patient) return null;
  const personal = user.patient.kind === 'personal';
  const shared = (['kracht', 'mobiliteit'] as const).filter((m) => modes.data?.modules.includes(m));
  return (
    <div className="space-y-6">
      <h1 className="text-[28px] font-bold leading-tight">{t('Instellingen', 'Settings')}</h1>

      <section aria-labelledby="set-account" className="space-y-2">
        <h2 id="set-account" className="text-[13px] font-semibold uppercase tracking-wide text-ink-600">{t('Account', 'Account')}</h2>
        <RowLink to="/p/account" icon={<UserRound className="h-5 w-5" />} title={t('Profiel, wachtwoord en inloggen', 'Profile, password and login')} sub={user.email} />
      </section>

      {!personal && modes.data && shared.length > 0 && (
        <section id="delen" aria-labelledby="set-share" className="scroll-mt-20 space-y-2">
          <h2 id="set-share" className="text-[13px] font-semibold uppercase tracking-wide text-ink-600">{t('Delen met je fysiotherapeut', 'Sharing with your physiotherapist')}</h2>
          <p className="text-[14px] text-ink-600">{t('Je revalidatie ziet je fysiotherapeut altijd. Kracht en mobiliteit zijn van jou, tenzij je ze deelt.', 'Your physiotherapist always sees your rehabilitation. Strength and mobility are yours unless you share them.')}</p>
          {shared.map((m) => <ConsentToggle key={m} module={m} since={modes.data!.consents[m]} />)}
        </section>
      )}

      <section aria-labelledby="set-friends" className="space-y-2">
        <h2 id="set-friends" className="text-[13px] font-semibold uppercase tracking-wide text-ink-600">{t('Vrienden', 'Friends')}</h2>
        <RowLink to="/p/held/vrienden" icon={<Users className="h-5 w-5" />} title={t('Held delen met vrienden', 'Share your hero with friends')} sub={t('Levels en skills vergelijken, alleen als jullie dat allebei willen', 'Compare levels and skills, only if you both want to')} />
      </section>

      <section aria-labelledby="set-app" className="space-y-3">
        <h2 id="set-app" className="text-[13px] font-semibold uppercase tracking-wide text-ink-600">{t('App', 'App')}</h2>
        <ViewCard />
        <ReminderCard />
        <TextSizeCard />
        <ThemeCard />
        <div className="rounded-2xl border border-line bg-white p-1 shadow-card"><WhatsNew audience="patient" clinical={isClinical(user?.patient?.kind)} /></div>
      </section>

      <section aria-labelledby="set-data" className="space-y-3">
        <h2 id="set-data" className="text-[13px] font-semibold uppercase tracking-wide text-ink-600">{t('Gegevens en privacy', 'Data and privacy')}</h2>
        <MyDataCard />
        <Card className="flex items-start gap-3 p-5 text-[14px] leading-relaxed text-ink-600">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" aria-hidden />
          <p>
            {personal
              ? t('Je gegevens zijn alleen voor jou. Je muntjes en aankopen ziet niemand anders.', 'Your data is just for you. Nobody else sees your coins and purchases.')
              : t('Je oefengegevens worden alleen gedeeld met je eigen praktijk. Je muntjes en aankopen ziet alleen jij.', 'Your exercise data is only shared with your own practice. Only you see your coins and purchases.')}{' '}
            <Link to="/privacy" className="link">{t('Privacyverklaring', 'Privacy notice')}</Link>
          </p>
        </Card>
      </section>

      <Button variant="secondary" size="xl" className="w-full" icon={<LogOut className="h-5 w-5" />} onClick={() => logout()}>{t('Uitloggen', 'Log out')}</Button>
    </div>
  );
}

function RowLink({ to, icon, title, sub }: { to: string; icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <Link to={to} className="tap flex min-h-[64px] items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card hover:border-ink-300">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink-900">{title}</span>
        {sub && <span className="block truncate text-[14px] text-ink-600">{sub}</span>}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" aria-hidden />
    </Link>
  );
}
