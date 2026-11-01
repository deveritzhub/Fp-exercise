import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, User } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button, Input, Notice, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { describeError, fieldErrors, useI18n } from '@/lib/i18n';
import { homePathFor } from '@/lib/session';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import type { SessionUser } from '@/lib/types';
import { SocialButtons } from './SocialLogin';

export type AuthOptions = { signup: ('coach' | 'personal')[]; google?: boolean; apple?: boolean; passkeys?: boolean };
export const useAuthOptions = () => useQuery({ queryKey: ['auth-options'], queryFn: () => api.get<AuthOptions>('/auth/options'), staleTime: 300_000 });

/** Self-signup for personal trainers and for people training for themselves. Physio practices are set up with us. */
export function SignupPage() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Account aanmaken', 'Create account'));
  const opts = useAuthOptions();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [kind, setKind] = useState<'personal' | 'coach'>('personal');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  if (!opts.data) return <Spinner className="min-h-screen" />;
  const kinds = opts.data.signup;
  if (!kinds.length) {
    return (
      <AuthLayout title={t('Aanmelden is nu gesloten', 'Sign-up is closed for now')} footer={<Link className="link" to="/login">{t('Naar inloggen', 'Go to login')}</Link>}>
        <p className="text-[15px] text-ink-700">{t('Je fysiotherapeut of praktijk stuurt je een uitnodiging. Wil je FP Flow voor je praktijk? Neem contact met ons op.', 'Your physiotherapist or practice will send you an invitation. Want FP Flow for your practice? Get in touch.')}</p>
        <Link to="/contact" className="mt-4 inline-flex h-12 items-center rounded-lg bg-accent px-5 font-semibold text-accent-ink">{t('Contact', 'Contact')}</Link>
      </AuthLayout>
    );
  }
  const k = kinds.includes(kind) ? kind : kinds[0];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrs({});
    if (!terms) return setErrs({ acceptTerms: t('Ga akkoord om verder te gaan.', 'Please agree to continue.') });
    setBusy(true);
    try {
      const r = await api.post<{ user: SessionUser }>('/auth/signup', {
        kind: k, fullName, businessName: k === 'coach' && businessName.trim() ? businessName : undefined, email, password, locale, acceptTerms: true,
      });
      qc.setQueryData(['me'], r.user);
      nav(r.user.patient ? '/p/held/nieuw' : homePathFor(r.user), { replace: true });
    } catch (err) {
      setErrs(fieldErrors(err, locale));
      setError(describeError(err, locale));
    } finally {
      setBusy(false);
    }
  };

  const options = [
    { v: 'personal' as const, icon: User, title: t('Ik train voor mezelf', 'I train for myself'), text: t('Kracht- en mobiliteitsschema’s, je sportheld en vrienden.', 'Strength and mobility plans, your sports hero and friends.') },
    { v: 'coach' as const, icon: Dumbbell, title: t('Ik ben personal trainer', 'I am a personal trainer'), text: t('Schema’s maken voor je klanten en hun voortgang volgen.', 'Build plans for your clients and follow their progress.') },
  ].filter((o) => kinds.includes(o.v));

  return (
    <AuthLayout
      title={t('Account aanmaken', 'Create account')}
      description={t('Gratis beginnen. Fysiotherapiepraktijk? Neem contact op voor een praktijkaccount.', 'Start for free. Physiotherapy practice? Contact us for a practice account.')}
      footer={<>{t('Heb je al een account?', 'Already have an account?')} <Link className="link" to="/login">{t('Inloggen', 'Log in')}</Link></>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {options.length > 1 && (
          <fieldset>
            <legend className="mb-2 text-[14px] font-medium text-ink-800">{t('Waarvoor gebruik je FP Flow?', 'What will you use FP Flow for?')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {options.map((o) => (
                <label key={o.v} className={cn('relative flex cursor-pointer gap-3 rounded-xl border p-3', k === o.v ? 'border-accent bg-accent-soft' : 'border-line hover:border-ink-300')}>
                  <input type="radio" name="kind" value={o.v} checked={k === o.v} onChange={() => setKind(o.v)} className="absolute inset-0 z-10 cursor-pointer opacity-0" />
                  <o.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <span>
                    <span className="block text-[14.5px] font-semibold text-ink-900">{o.title}</span>
                    <span className="block text-[13px] text-ink-600">{o.text}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {error && <Notice tone="bad">{error}</Notice>}
        <Input label={t('Je naam', 'Your name')} autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} error={errs.fullName} />
        {k === 'coach' && <Input label={t('Naam van je bedrijf', 'Business name')} optional={t('optioneel', 'optional')} value={businessName} onChange={(e) => setBusinessName(e.target.value)} error={errs.businessName} />}
        <Input label={t('E-mailadres', 'Email address')} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errs.email} />
        <Input label={t('Wachtwoord', 'Password')} type="password" autoComplete="new-password" required hint={t('Minimaal 10 tekens, met een cijfer of leesteken.', 'At least 10 characters, with a digit or symbol.')} value={password} onChange={(e) => setPassword(e.target.value)} error={errs.password} />
        <div>
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-[14px] text-ink-800">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--accent))]" checked={terms} onChange={(e) => setTerms(e.target.checked)} aria-describedby={errs.acceptTerms ? 'terms-err' : undefined} />
            <span>
              {t('Ik ga akkoord met de ', 'I agree to the ')}<Link className="link" to="/voorwaarden" target="_blank">{t('voorwaarden', 'terms')}</Link>{t(' en de ', ' and the ')}<Link className="link" to="/privacy" target="_blank">{t('privacyverklaring', 'privacy statement')}</Link>.
              {k === 'personal' && <span className="mt-0.5 block text-[13px] text-ink-600">{t('FP Flow is een trainingsapp, geen medisch hulpmiddel: we geven geen medisch advies.', 'FP Flow is a training app, not a medical device: we do not give medical advice.')}</span>}
            </span>
          </label>
          {errs.acceptTerms && <p id="terms-err" className="mt-1 text-[13px] font-medium text-bad">{errs.acceptTerms}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy}>{t('Account aanmaken', 'Create account')}</Button>
      </form>
      <SocialButtons intent="signup" kind={k} />
    </AuthLayout>
  );
}
