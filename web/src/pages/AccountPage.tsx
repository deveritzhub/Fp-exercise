import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { useLogout, useSession } from '@/lib/session';
import { useDocumentMeta } from '@/lib/meta';
import { Button, Card, CardHeader, Input, Notice, PageHeader, Select, useToast } from '@/components/ui';
import { Link } from 'react-router-dom';
import { MfaCard } from '@/components/app/Mfa';
import { ReminderCard } from '@/components/app/Reminders';
import { MyDataCard } from '@/components/patient/Modules';

export function AccountPage({ patient }: { patient?: boolean }) {
  const { t, locale, setLocale } = useI18n();
  useDocumentMeta(t('Account', 'Account'));
  const { user } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const logout = useLogout();
  const [name, setName] = useState(user?.fullName ?? '');
  const [lang, setLang] = useState<'nl' | 'en'>(user?.locale ?? locale);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwError, setPwError] = useState<string | null>(null);
  if (!user) return null;
  return (
    <div className={patient ? 'space-y-5' : 'max-w-2xl space-y-6'}>
      {patient ? <h1 className="text-2xl font-semibold">{t('Account', 'Account')}</h1> : <PageHeader title={t('Account', 'Account')} />}
      <Card>
        <CardHeader title={t('Profiel', 'Profile')} />
        <form className="space-y-4 p-5" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.patch('/me', { fullName: name, locale: lang });
            setLocale(lang);
            qc.invalidateQueries({ queryKey: ['me'] });
            toast(t('Opgeslagen', 'Saved'));
          } catch (err) { toast(errorMessage(err instanceof ApiError ? err.code : undefined, locale), 'bad'); }
        }}>
          <Input label={t('Naam', 'Name')} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label={t('E-mailadres', 'Email')} value={user.email} disabled />
          <Select label={t('Taal', 'Language')} value={lang} onChange={(e) => setLang(e.target.value as 'nl' | 'en')}>
            <option value="nl">Nederlands</option><option value="en">English</option>
          </Select>
          <div className="flex justify-end"><Button type="submit" size={patient ? 'lg' : 'md'}>{t('Opslaan', 'Save')}</Button></div>
        </form>
      </Card>
      <Card>
        <CardHeader title={t('Wachtwoord wijzigen', 'Change password')} />
        <form className="space-y-4 p-5" onSubmit={async (e) => {
          e.preventDefault();
          setPwError(null);
          try {
            await api.post('/auth/password/change', pw);
            setPw({ current: '', next: '' });
            toast(t('Wachtwoord gewijzigd', 'Password changed'));
          } catch (err) { setPwError(errorMessage(err instanceof ApiError ? err.code : undefined, locale)); }
        }}>
          {pwError && <Notice tone="bad">{pwError}</Notice>}
          <Input label={t('Huidig wachtwoord', 'Current password')} type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
          <Input label={t('Nieuw wachtwoord', 'New password')} type="password" autoComplete="new-password" hint={t('Minimaal 10 tekens.', 'At least 10 characters.')} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
          <div className="flex justify-end"><Button type="submit" variant="secondary" size={patient ? 'lg' : 'md'}>{t('Wachtwoord wijzigen', 'Change password')}</Button></div>
        </form>
      </Card>
      {!patient && <MfaCard />}
      {patient && (
        <>
          <ReminderCard />
          <MyDataCard />
          <Card className="p-5 text-[14px] leading-relaxed text-ink-600">
            <h2 className="mb-1 font-semibold text-ink-900">{t('Privacy', 'Privacy')}</h2>
            {t('Je oefengegevens worden alleen gedeeld met je eigen praktijk. Vragen over je gegevens? Neem contact op met je fysiotherapeut.', 'Your exercise data is only shared with your own practice. Questions about your data? Contact your physiotherapist.')}{' '}
            <Link to="/privacy" className="link">{t('Privacyverklaring', 'Privacy notice')}</Link>
          </Card>
          <Button variant="secondary" size="xl" className="w-full" icon={<LogOut className="h-5 w-5" />} onClick={logout}>{t('Uitloggen', 'Log out')}</Button>
        </>
      )}
    </div>
  );
}
