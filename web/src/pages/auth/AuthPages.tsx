import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { CodeInput, MfaSetup } from '@/components/app/Mfa';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button, Input, Notice, Spinner, useToast } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { homePathFor, useLogout, useSession } from '@/lib/session';
import { useDocumentMeta } from '@/lib/meta';
import type { SessionUser } from '@/lib/types';

export const DEMO_ACCOUNTS = [
  { email: 'therapeut@praktijk-a.test', nl: 'Fysiotherapeut — praktijk A', en: 'Physiotherapist — practice A' },
  { email: 'eigenaar@praktijk-a.test', nl: 'Praktijkeigenaar — praktijk A', en: 'Practice owner — practice A' },
  { email: 'patient@praktijk-a.test', nl: 'Patiënt — praktijk A', en: 'Patient — practice A' },
  { email: 'therapeut@praktijk-b.test', nl: 'Fysiotherapeut — praktijk B', en: 'Physiotherapist — practice B' },
  { email: 'patient@praktijk-b.test', nl: 'Patiënt — praktijk B', en: 'Patient — practice B' },
  { email: 'admin@fp-exercise.test', nl: 'Platformbeheerder', en: 'Platform administrator' },
];
export const DEMO_PASSWORD = 'Demo-wachtwoord-1';
export const showDemoAccounts = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === '1';

function safeNext(next: string | null) {
  // Same-site paths only. Backslashes are refused too: browsers treat "/\evil.example" as "//evil.example".
  return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : null;
}

export function LoginPage() {
  const { t, locale, setLocale } = useI18n();
  useDocumentMeta(t('Inloggen', 'Log in'));
  const [params] = useSearchParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const toast = useToast();

  const signedIn = (user: SessionUser) => {
    qc.setQueryData(['me'], user);
    if (user.locale !== locale) setLocale(user.locale);
    nav(safeNext(params.get('next')) ?? homePathFor(user), { replace: true });
  };

  const submit = async (e?: FormEvent, creds?: { email: string; password: string }) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ user: SessionUser } | { mfaRequired: true; mfaToken: string }>('/auth/login', creds ?? { email, password });
      if ('mfaToken' in r) {
        setMfaToken(r.mfaToken);
        setCode('');
      } else signedIn(r.user);
    } catch (err) {
      setError(errorMessage(err instanceof ApiError ? err.code : undefined, locale));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ user: SessionUser; recoveryCodesLeft?: number }>('/auth/login/mfa', { mfaToken, code: code.trim() });
      if (r.recoveryCodesLeft !== undefined) {
        toast(t(`Herstelcode gebruikt — nog ${r.recoveryCodesLeft} over. Maak nieuwe codes via Account.`, `Recovery code used — ${r.recoveryCodesLeft} left. Create new codes under Account.`), r.recoveryCodesLeft < 3 ? 'bad' : undefined);
      }
      signedIn(r.user);
    } catch (err) {
      const c = err instanceof ApiError ? err.code : undefined;
      if (c === 'mfa_session_expired') setMfaToken(null);
      setError(errorMessage(c, locale));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (mfaToken) {
    return (
      <AuthLayout
        title={t('Bevestig dat jij het bent', 'Confirm it’s you')}
        description={useRecovery
          ? t('Voer één van je herstelcodes in.', 'Enter one of your recovery codes.')
          : t('Open je authenticator-app en voer de 6-cijferige code in.', 'Open your authenticator app and enter the 6-digit code.')}
        footer={<button type="button" className="link" onClick={() => { setMfaToken(null); setError(null); }}>{t('Terug naar inloggen', 'Back to login')}</button>}
      >
        <form onSubmit={submitCode} className="space-y-4" noValidate>
          <div className="flex justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent"><ShieldCheck className="h-6 w-6" /></span></div>
          {error && <Notice tone="bad">{error}</Notice>}
          <CodeInput
            key={useRecovery ? 'r' : 'c'}
            id="mfa-code"
            label={useRecovery ? t('Herstelcode', 'Recovery code') : t('Verificatiecode', 'Verification code')}
            recovery={useRecovery}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            required
          />
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!code.trim()}>{t('Inloggen', 'Log in')}</Button>
          <button type="button" className="block w-full text-center text-[13px] font-medium text-accent hover:underline" onClick={() => { setUseRecovery(!useRecovery); setCode(''); setError(null); }}>
            {useRecovery ? t('Gebruik de code uit je app', 'Use the code from your app') : t('Telefoon kwijt? Gebruik een herstelcode', 'Lost your phone? Use a recovery code')}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('Welkom terug', 'Welcome back')}
      description={t('Log in bij FP Exercise.', 'Log in to FP Exercise.')}
      footer={
        <>
          {t('Nog geen account? Je fysiotherapeut of praktijk stuurt je een uitnodiging.', 'No account yet? Your physiotherapist or practice will send you an invitation.')}
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {params.get('reden') === 'inactief' && !error && (
          <Notice tone="info" title={t('Je bent automatisch uitgelogd', 'You were logged out automatically')}>
            {t('Na een tijd zonder activiteit loggen we je uit, zodat niemand anders op deze computer bij gegevens kan. Log opnieuw in om verder te gaan.', 'After a while without activity we log you out, so nobody else on this computer can see any data. Log in again to continue.')}
          </Notice>
        )}
        {error && <Notice tone="bad">{error}</Notice>}
        <Input label={t('E-mailadres', 'Email address')} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label={t('Wachtwoord', 'Password')} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex justify-end">
          <Link to="/wachtwoord-vergeten" className="text-[13px] font-medium text-accent hover:underline">{t('Wachtwoord vergeten?', 'Forgot password?')}</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy}>{t('Inloggen', 'Log in')}</Button>
      </form>
      {showDemoAccounts && (
        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-2 text-[12.5px] font-medium text-ink-500">{t('Demo-accounts (synthetische gegevens)', 'Demo accounts (synthetic data)')}</p>
          <div className="grid gap-1.5">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} type="button" disabled={busy} onClick={() => submit(undefined, { email: a.email, password: DEMO_PASSWORD })} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-left text-[13px] hover:border-ink-300 hover:bg-ink-50">
                <span className="font-medium text-ink-800">{locale === 'nl' ? a.nl : a.en}</span>
                <span className="truncate pl-2 text-[12px] text-ink-400">{a.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Wachtwoord vergeten', 'Forgot password'));
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <AuthLayout title={t('Wachtwoord vergeten', 'Forgot password')} description={t('We sturen je een link om een nieuw wachtwoord in te stellen.', 'We will email you a link to set a new password.')} footer={<Link className="link" to="/login">{t('Terug naar inloggen', 'Back to login')}</Link>}>
      {done ? (
        <Notice tone="ok" icon={<Mail className="h-4 w-4" />}>
          {t('Als er een account bestaat voor dit adres, ontvang je binnen enkele minuten een e-mail.', 'If an account exists for this address, you will receive an email within a few minutes.')}
        </Notice>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await api.post('/auth/password/forgot', { email });
              setDone(true);
            } catch (err) {
              setError(errorMessage(err instanceof ApiError ? err.code : undefined, locale));
            } finally {
              setBusy(false);
            }
          }}
        >
          {error && <Notice tone="bad">{error}</Notice>}
          <Input label={t('E-mailadres', 'Email address')} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" size="lg" className="w-full" loading={busy}>{t('Verstuur link', 'Send link')}</Button>
        </form>
      )}
    </AuthLayout>
  );
}

function PasswordForm({ onSubmit, cta, existingAccount }: { onSubmit: (pw: string) => Promise<void>; cta: string; existingAccount?: boolean }) {
  const { t, locale } = useI18n();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!existingAccount && pw !== pw2) return setError(t('De wachtwoorden komen niet overeen.', 'Passwords do not match.'));
        setBusy(true);
        setError(null);
        try {
          await onSubmit(pw);
        } catch (err) {
          setError(errorMessage(err instanceof ApiError ? err.code : undefined, locale));
        } finally {
          setBusy(false);
        }
      }}
    >
      {error && <Notice tone="bad">{error}</Notice>}
      <Input
        label={existingAccount ? t('Je huidige wachtwoord', 'Your current password') : t('Nieuw wachtwoord', 'New password')}
        hint={existingAccount ? undefined : t('Minimaal 10 tekens, met letters en cijfers of leestekens.', 'At least 10 characters, with letters and numbers or symbols.')}
        type="password"
        autoComplete={existingAccount ? 'current-password' : 'new-password'}
        required
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />
      {!existingAccount && <Input label={t('Herhaal wachtwoord', 'Repeat password')} type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />}
      <Button type="submit" size="lg" className="w-full" loading={busy}>{cta}</Button>
    </form>
  );
}

export function ResetPasswordPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Nieuw wachtwoord', 'New password'));
  const [params] = useSearchParams();
  const [done, setDone] = useState(false);
  const token = params.get('token') ?? '';
  return (
    <AuthLayout title={t('Nieuw wachtwoord instellen', 'Set a new password')} footer={<Link className="link" to="/login">{t('Naar inloggen', 'Go to login')}</Link>}>
      {done ? (
        <Notice tone="ok" icon={<CheckCircle2 className="h-4 w-4" />}>{t('Je wachtwoord is gewijzigd. Je kunt nu inloggen.', 'Your password has been changed. You can now log in.')}</Notice>
      ) : (
        <PasswordForm cta={t('Wachtwoord opslaan', 'Save password')} onSubmit={async (password) => { await api.post('/auth/password/reset', { token, password }); setDone(true); }} />
      )}
    </AuthLayout>
  );
}

export function InvitePage() {
  const { t, setLocale } = useI18n();
  useDocumentMeta(t('Uitnodiging', 'Invitation'));
  const { token = '' } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['invite', token], queryFn: () => api.get<{ email: string; fullName: string; locale: 'nl' | 'en'; hasPassword: boolean }>(`/auth/invite/${token}`), retry: false });
  if (q.isLoading) return <Spinner className="min-h-screen" />;
  if (q.isError || !q.data)
    return (
      <AuthLayout title={t('Uitnodiging ongeldig', 'Invalid invitation')}>
        <Notice tone="warn">{t('Deze uitnodiging is verlopen of al gebruikt. Vraag je fysiotherapeut om een nieuwe uitnodiging.', 'This invitation has expired or was already used. Ask your physiotherapist for a new invitation.')}</Notice>
      </AuthLayout>
    );
  const inv = q.data;
  return (
    <AuthLayout
      title={t(`Welkom, ${inv.fullName.split(' ')[0]}`, `Welcome, ${inv.fullName.split(' ')[0]}`)}
      description={inv.hasPassword ? t('Bevestig met je bestaande wachtwoord om de uitnodiging te accepteren.', 'Confirm with your existing password to accept the invitation.') : t('Kies een wachtwoord om je account te activeren.', 'Choose a password to activate your account.')}
    >
      <div className="mb-4 rounded-lg bg-ink-50 px-3 py-2 text-[13.5px] text-ink-600">{inv.email}</div>
      <PasswordForm
        existingAccount={inv.hasPassword}
        cta={t('Account activeren', 'Activate account')}
        onSubmit={async (password) => {
          const r = await api.post<{ user: SessionUser } | { mfaRequired: true }>('/auth/invite/accept', { token, password });
          // Accounts with two-factor authentication finish by signing in normally.
          if (!('user' in r)) return nav('/login', { replace: true });
          qc.setQueryData(['me'], r.user);
          setLocale(r.user.locale);
          nav(homePathFor(r.user), { replace: true });
        }}
      />
      <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">
        {t('Door je account te activeren ga je akkoord met de verwerking van je oefengegevens door je praktijk, zoals beschreven in de ', 'By activating your account you agree to your practice processing your exercise data as described in the ')}
        <Link to="/privacy" className="link">{t('privacyverklaring', 'privacy notice')}</Link>.
      </p>
    </AuthLayout>
  );
}

export function VerifyEmailPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const q = useQuery({ queryKey: ['verify', params.get('token')], queryFn: () => api.post('/auth/verify-email', { token: params.get('token') }), retry: false });
  return (
    <AuthLayout title={t('E-mailadres bevestigen', 'Confirm email address')} footer={<Link className="link" to="/login">{t('Naar inloggen', 'Go to login')}</Link>}>
      {q.isLoading ? <Spinner /> : q.isError ? <Notice tone="warn">{t('Deze link is ongeldig of verlopen.', 'This link is invalid or has expired.')}</Notice> : <Notice tone="ok">{t('Je e-mailadres is bevestigd.', 'Your email address is confirmed.')}</Notice>}
    </AuthLayout>
  );
}

/** Shown when a practice requires two-factor authentication and this login has not set it up yet. */
export function MfaRequiredPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Tweestapsverificatie instellen', 'Set up two-factor authentication'));
  const [params] = useSearchParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useSession();
  const logout = useLogout();
  if (loading) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mfaRequired) return <Navigate to={safeNext(params.get('next')) ?? homePathFor(user)} replace />;
  return (
    <AuthLayout
      title={t('Beveilig je account', 'Secure your account')}
      description={t(
        'Je praktijk vereist tweestapsverificatie voor iedereen die patiëntgegevens kan zien. Stel het nu eenmalig in.',
        'Your practice requires two-factor authentication for everyone who can see patient data. Set it up once now.',
      )}
      footer={<button type="button" className="link" onClick={() => logout()}>{t('Uitloggen', 'Log out')}</button>}
    >
      <MfaSetup
        onDone={async () => {
          await qc.invalidateQueries({ queryKey: ['me'] });
          nav(safeNext(params.get('next')) ?? '/app', { replace: true });
        }}
      />
    </AuthLayout>
  );
}
