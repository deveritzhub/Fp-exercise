import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n, describeError } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { useDocumentMeta } from '@/lib/meta';
import { Button, Card, CardHeader, Input, Notice, PageHeader, Segmented, Select, useToast } from '@/components/ui';
import { Link } from 'react-router-dom';
import { MfaCard } from '@/components/app/Mfa';
import { LoginMethodsCard } from '@/pages/auth/SocialLogin';
import { useTextSize, type TextSize } from '@/lib/textSize';
import { useTheme, type ThemeChoice } from '@/lib/theme';

export function AccountPage({ patient }: { patient?: boolean }) {
  const { t, locale, setLocale } = useI18n();
  useDocumentMeta(t('Account', 'Account'));
  const { user } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(user?.fullName ?? '');
  const [lang, setLang] = useState<'nl' | 'en'>(user?.locale ?? locale);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwError, setPwError] = useState<string | null>(null);
  if (!user) return null;
  return (
    <div className={patient ? 'space-y-5' : 'max-w-2xl space-y-6'}>
      {patient && <Link to="/p/instellingen" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Instellingen', 'Settings')}</Link>}
      {patient ? <h1 className="text-2xl font-bold">{t('Profiel en inloggen', 'Profile and login')}</h1> : <PageHeader title={t('Account', 'Account')} />}
      <Card>
        <CardHeader title={t('Profiel', 'Profile')} />
        <form className="space-y-4 p-5" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.patch('/me', { fullName: name, locale: lang });
            setLocale(lang);
            qc.invalidateQueries({ queryKey: ['me'] });
            toast(t('Opgeslagen', 'Saved'));
          } catch (err) { toast(describeError(err, locale), 'bad'); }
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
          } catch (err) { setPwError(describeError(err, locale)); }
        }}>
          {pwError && <Notice tone="bad">{pwError}</Notice>}
          <Input label={t('Huidig wachtwoord', 'Current password')} type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
          <Input label={t('Nieuw wachtwoord', 'New password')} type="password" autoComplete="new-password" hint={t('Minimaal 10 tekens.', 'At least 10 characters.')} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
          <div className="flex justify-end"><Button type="submit" variant="secondary" size={patient ? 'lg' : 'md'}>{t('Wachtwoord wijzigen', 'Change password')}</Button></div>
        </form>
      </Card>
      {!patient && <ThemeCard />}
      <LoginMethodsCard />
      {!patient && <MfaCard />}
    </div>
  );
}

export function TextSizeCard() {
  const { t } = useI18n();
  const [size, setSize] = useTextSize();
  return (
    <Card className="p-5">
      <h2 className="font-bold text-ink-900">{t('Tekstgrootte', 'Text size')}</h2>
      <p className="mb-3 mt-0.5 text-[14px] text-ink-600">{t('Alleen op dit apparaat.', 'On this device only.')}</p>
      <div className="flex [&>div]:w-full [&>div]:flex">
        <Segmented<TextSize>
          size="lg"
          label={t('Tekstgrootte', 'Text size')}
          value={size}
          onChange={setSize}
          options={[
            { value: 'normal', label: t('Normaal', 'Normal') },
            { value: 'large', label: t('Groot', 'Large') },
            { value: 'xlarge', label: t('Extra groot', 'Extra large') },
          ]}
        />
      </div>
    </Card>
  );
}

/** Light, dark or follow the phone/computer. A display preference on this device only. */
export function ThemeCard() {
  const { t } = useI18n();
  const { choice, setChoice } = useTheme();
  return (
    <Card className="p-5">
      <h2 className="font-bold text-ink-900">{t('Weergave', 'Appearance')}</h2>
      <p className="mb-3 mt-0.5 text-[14px] text-ink-600">{t('Licht, donker of zoals je telefoon of computer staat. Alleen op dit apparaat.', 'Light, dark or like your phone or computer. On this device only.')}</p>
      <div className="flex [&>div]:w-full [&>div]:flex">
        <Segmented<ThemeChoice>
          size="lg"
          label={t('Weergave', 'Appearance')}
          value={choice}
          onChange={setChoice}
          options={[
            { value: 'light', label: t('Licht', 'Light') },
            { value: 'dark', label: t('Donker', 'Dark') },
            { value: 'system', label: t('Automatisch', 'Automatic') },
          ]}
        />
      </div>
    </Card>
  );
}
