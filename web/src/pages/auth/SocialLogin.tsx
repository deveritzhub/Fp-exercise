import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { Fingerprint, KeyRound, Link2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, errorMessage, useI18n } from '@/lib/i18n';
import { fmtDate } from '@/lib/format';
import { Button, Card, CardHeader, Input, Notice, useToast } from '@/components/ui';
import type { SessionUser } from '@/lib/types';
import { useAuthOptions } from './SignupPage';

const LABEL = { google: 'Google', apple: 'Apple' } as const;
type Provider = keyof typeof LABEL;

/** Full-page navigation to the provider (the server redirects back). */
export function startSocial(p: Provider, intent: 'login' | 'signup' | 'link', kind?: string, next?: string | null) {
  const q = new URLSearchParams({ intent });
  if (kind) q.set('kind', kind);
  if (next) q.set('next', next);
  window.location.assign(`/api/auth/oauth/${p}/start?${q}`);
}

/** "Continue with Google / Apple" and "Log in with a passkey", when this server offers them. */
export function SocialButtons({ intent, kind, next, onPasskeyLogin }: { intent: 'login' | 'signup'; kind?: string; next?: string | null; onPasskeyLogin?: (u: SessionUser) => void }) {
  const { t, locale } = useI18n();
  const opts = useAuthOptions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providers = (['google', 'apple'] as const).filter((p) => opts.data?.[p]);
  const passkey = intent === 'login' && !!opts.data?.passkeys && browserSupportsWebAuthn() && !!onPasskeyLogin;
  if (!providers.length && !passkey) return null;
  const loginWithPasskey = async () => {
    setBusy(true);
    setError(null);
    try {
      const { options, handle } = await api.post<{ options: Parameters<typeof startAuthentication>[0]['optionsJSON']; handle: string }>('/auth/passkeys/login/options');
      const response = await startAuthentication({ optionsJSON: options });
      const r = await api.post<{ user: SessionUser }>('/auth/passkeys/login', { handle, response });
      onPasskeyLogin!(r.user);
    } catch (e) {
      // Cancelled by the user: say nothing.
      if ((e as Error)?.name !== 'NotAllowedError') setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-5 space-y-2">
      <div className="flex items-center gap-3 text-[13px] text-ink-500" aria-hidden><span className="h-px flex-1 bg-line" />{t('of', 'or')}<span className="h-px flex-1 bg-line" /></div>
      {error && <Notice tone="bad">{error}</Notice>}
      {passkey && (
        <Button variant="secondary" size="lg" className="w-full" loading={busy} icon={<Fingerprint className="h-5 w-5" aria-hidden />} onClick={loginWithPasskey}>
          {t('Inloggen met passkey', 'Log in with a passkey')}
        </Button>
      )}
      {providers.map((p) => (
        <Button key={p} variant="secondary" size="lg" className="w-full" onClick={() => startSocial(p, intent, kind, next)}>
          {t(`Doorgaan met ${LABEL[p]}`, `Continue with ${LABEL[p]}`)}
        </Button>
      ))}
    </div>
  );
}

type Methods = {
  hasPassword: boolean;
  providers: Provider[];
  identities: { provider: Provider; email: string | null; createdAt: string; lastUsedAt: string | null }[];
  passkeys: { id: string; name: string; createdAt: string; lastUsedAt: string | null }[];
};

/** Account page: linked Google/Apple accounts and passkeys. */
export function LoginMethodsCard() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['login-methods'], queryFn: () => api.get<Methods>('/auth/login-methods') });
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState('');
  const params = new URLSearchParams(window.location.search);
  const linked = params.get('gekoppeld');
  const failed = params.get('fout');
  const d = q.data;
  const supports = browserSupportsWebAuthn();
  const refresh = () => qc.invalidateQueries({ queryKey: ['login-methods'] });
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      await refresh();
      toast(ok, 'ok');
    } catch (e) {
      if ((e as Error)?.name !== 'NotAllowedError') toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(null);
    }
  };
  const addPasskey = () =>
    run('add', async () => {
      const { options, handle } = await api.post<{ options: Parameters<typeof startRegistration>[0]['optionsJSON']; handle: string }>('/auth/passkeys/register/options');
      const response = await startRegistration({ optionsJSON: options });
      await api.post('/auth/passkeys/register', { handle, response, name: name.trim() || t('Mijn apparaat', 'My device') });
      setName('');
    }, t('Passkey toegevoegd', 'Passkey added'));

  return (
    <Card>
      <CardHeader title={t('Inlogmethoden', 'Login methods')} description={t('Log in zonder wachtwoord: met Face ID of je vingerafdruk (passkey), of met Google of Apple.', 'Log in without a password: with Face ID or your fingerprint (passkey), or with Google or Apple.')} />
      <div className="space-y-4 p-5 pt-0">
        {linked && <Notice tone="ok">{t(`${LABEL[linked as Provider] ?? linked} is gekoppeld.`, `${LABEL[linked as Provider] ?? linked} is linked.`)}</Notice>}
        {failed && <Notice tone="bad">{errorMessage(failed, locale)}</Notice>}
        {!d ? null : (
          <>
            <section aria-labelledby="pk-title">
              <h3 id="pk-title" className="t-card flex items-center gap-2"><Fingerprint className="h-4 w-4 text-accent" aria-hidden />{t('Passkeys', 'Passkeys')}</h3>
              {d.passkeys.length === 0 && <p className="mt-1 text-[14px] text-ink-600">{t('Nog geen passkey. Voeg er een toe op dit apparaat.', 'No passkey yet. Add one on this device.')}</p>}
              <ul className="mt-2 space-y-1.5">
                {d.passkeys.map((k) => (
                  <li key={k.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                    <KeyRound className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-medium">{k.name}</span>
                      <span className="block text-[12.5px] text-ink-600">{t('Toegevoegd', 'Added')} {fmtDate(k.createdAt, locale)}{k.lastUsedAt ? ` · ${t('laatst gebruikt', 'last used')} ${fmtDate(k.lastUsedAt, locale)}` : ''}</span>
                    </span>
                    <Button size="sm" variant="ghost" className="h-11" aria-label={t(`${k.name} verwijderen`, `Remove ${k.name}`)} loading={busy === k.id} icon={<Trash2 className="h-4 w-4" aria-hidden />}
                      onClick={() => run(k.id, () => api.del(`/auth/passkeys/${encodeURIComponent(k.id)}`), t('Passkey verwijderd', 'Passkey removed'))} />
                  </li>
                ))}
              </ul>
              {supports ? (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Input label={t('Naam van dit apparaat', 'Name of this device')} placeholder={t('Bijv. mijn iPhone', 'E.g. my iPhone')} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} containerClassName="sm:flex-1" />
                  <Button size="lg" loading={busy === 'add'} icon={<Fingerprint className="h-4 w-4" aria-hidden />} onClick={addPasskey}>{t('Passkey toevoegen', 'Add passkey')}</Button>
                </div>
              ) : (
                <p className="mt-2 text-[13.5px] text-ink-600">{t('Deze browser ondersteunt geen passkeys.', 'This browser does not support passkeys.')}</p>
              )}
            </section>

            {d.providers.length > 0 && (
              <section aria-labelledby="sso-title" className="border-t border-line pt-4">
                <h3 id="sso-title" className="t-card flex items-center gap-2"><Link2 className="h-4 w-4 text-accent" aria-hidden />{t('Gekoppelde accounts', 'Linked accounts')}</h3>
                <ul className="mt-2 space-y-1.5">
                  {d.providers.map((p) => {
                    const id = d.identities.find((i) => i.provider === p);
                    return (
                      <li key={p} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] font-medium">{LABEL[p]}</span>
                          <span className="block truncate text-[12.5px] text-ink-600">{id ? id.email ?? t('Gekoppeld', 'Linked') : t('Niet gekoppeld', 'Not linked')}</span>
                        </span>
                        {id ? (
                          <Button size="sm" variant="secondary" className="h-11" loading={busy === p} onClick={() => run(p, () => api.del(`/auth/identities/${p}`), t(`${LABEL[p]} ontkoppeld`, `${LABEL[p]} unlinked`))}>{t('Ontkoppelen', 'Unlink')}</Button>
                        ) : (
                          <Button size="sm" variant="secondary" className="h-11" onClick={() => startSocial(p, 'link')}>{t('Koppelen', 'Link')}</Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            {!d.hasPassword && <p className="text-[13px] text-ink-600">{t('Je hebt geen wachtwoord. Je kunt er een instellen via “Wachtwoord vergeten” op de inlogpagina.', 'You have no password. You can set one via “Forgot password” on the login page.')}</p>}
          </>
        )}
      </div>
    </Card>
  );
}
