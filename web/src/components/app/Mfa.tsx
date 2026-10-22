import { useState, type InputHTMLAttributes } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Download, KeyRound, ShieldCheck, Smartphone } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, CardHeader, Checkbox, Dialog, Input, Notice, useToast } from '@/components/ui';

/** One input for the 6-digit code: numeric keyboard on phones, iOS/Android can autofill it. */
export function CodeInput({ id, label, recovery, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; recovery?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="label mb-1.5 block">{label}</label>
      <input
        id={id}
        autoComplete="one-time-code"
        inputMode={recovery ? 'text' : 'numeric'}
        pattern={recovery ? undefined : '[0-9 ]*'}
        maxLength={recovery ? 20 : 7}
        spellCheck={false}
        className={cn(
          'input h-14 text-center font-mono text-[22px] tracking-[0.35em] placeholder:tracking-[0.35em] placeholder:text-ink-300',
          recovery && 'text-[17px] tracking-[0.12em] placeholder:tracking-[0.12em]',
          className,
        )}
        placeholder={recovery ? 'xxxx-xxxx-xxxx' : '••••••'}
        {...rest}
      />
    </div>
  );
}

const errOf = (err: unknown, locale: 'nl' | 'en') => errorMessage(err instanceof ApiError ? err.code : undefined, locale);

/** Shown once after enabling: the single-use codes for when the phone is lost. */
export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = `FP Exercise — ${t('herstelcodes', 'recovery codes')}\n${t('Elke code werkt één keer.', 'Each code works once.')}\n\n${codes.join('\n')}\n`;
  return (
    <div className="space-y-4">
      <Notice tone="warn" title={t('Bewaar deze herstelcodes', 'Save these recovery codes')}>
        {t(
          'Ben je je telefoon kwijt? Dan log je in met één van deze codes. Elke code werkt één keer. Je ziet ze alleen nu.',
          'Lost your phone? Then sign in with one of these codes. Each code works once. You will only see them now.',
        )}
      </Notice>
      <ul className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-ink-50/60 p-4 font-mono text-[14px] text-ink-900" aria-label={t('Herstelcodes', 'Recovery codes')}>
        {codes.map((c) => <li key={c} className="text-center">{c}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={async () => {
          try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* clipboard unavailable */ }
        }}>{copied ? t('Gekopieerd', 'Copied') : t('Kopiëren', 'Copy')}</Button>
        <Button type="button" size="sm" variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
          a.download = 'fp-exercise-herstelcodes.txt';
          a.click();
          URL.revokeObjectURL(a.href);
        }}>{t('Downloaden', 'Download')}</Button>
      </div>
      <Checkbox label={t('Ik heb de codes op een veilige plek bewaard', 'I have stored the codes in a safe place')} checked={saved} onChange={(e) => setSaved(e.target.checked)} />
      <Button type="button" className="w-full" size="lg" disabled={!saved} onClick={onDone}>{t('Klaar', 'Done')}</Button>
    </div>
  );
}

type Setup = { secret: string; uri: string; qrSvg: string };

/** Guided setup: app → scan → confirm with a code → recovery codes. */
export function MfaSetup({ onDone }: { onDone: () => void }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (codes) {
    return <RecoveryCodes codes={codes} onDone={() => { qc.invalidateQueries({ queryKey: ['me'] }); qc.invalidateQueries({ queryKey: ['mfa'] }); onDone(); }} />;
  }

  if (!setup) {
    return (
      <div className="space-y-4">
        <ol className="space-y-3 text-[14px] text-ink-700">
          {[
            [<Smartphone key="i" className="h-4 w-4" />, t('Installeer een authenticator-app op je telefoon, bijvoorbeeld Google Authenticator, Microsoft Authenticator of de Wachtwoorden-app van je iPhone.', 'Install an authenticator app on your phone, e.g. Google Authenticator, Microsoft Authenticator or the iPhone Passwords app.')],
            [<KeyRound key="i" className="h-4 w-4" />, t('Scan de QR-code die we zo laten zien.', 'Scan the QR code we will show next.')],
            [<ShieldCheck key="i" className="h-4 w-4" />, t('Voortaan vul je bij het inloggen ook de 6-cijferige code uit de app in.', 'From now on you also enter the 6-digit code from the app when signing in.')],
          ].map(([icon, text], i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        {error && <Notice tone="bad">{error}</Notice>}
        <Button className="w-full" size="lg" loading={busy} onClick={async () => {
          setBusy(true); setError(null);
          try { setSetup(await api.post<Setup>('/auth/mfa/setup')); } catch (err) { setError(errOf(err, locale)); } finally { setBusy(false); }
        }}>{t('Start met instellen', 'Start setup')}</Button>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true); setError(null);
      try { setCodes((await api.post<{ recoveryCodes: string[] }>('/auth/mfa/enable', { code: code.replace(/\s/g, '') })).recoveryCodes); }
      catch (err) { setError(errOf(err, locale)); setCode(''); }
      finally { setBusy(false); }
    }}>
      <div className="flex flex-col items-center gap-3">
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(setup.qrSvg)}`}
          alt={t('QR-code voor je authenticator-app', 'QR code for your authenticator app')}
          className="h-48 w-48 rounded-xl border border-line bg-white p-2"
        />
        <a href={setup.uri} className="link text-[13px] sm:hidden">{t('Op deze telefoon? Open in je authenticator-app', 'On this phone? Open in your authenticator app')}</a>
        <details className="w-full text-center text-[13px] text-ink-500">
          <summary className="cursor-pointer">{t('Lukt scannen niet? Voer de sleutel handmatig in', 'Can’t scan? Enter the key manually')}</summary>
          <code className="mt-2 block select-all break-all rounded-lg bg-ink-50 px-3 py-2 font-mono text-[13.5px] text-ink-900">{setup.secret.match(/.{1,4}/g)!.join(' ')}</code>
        </details>
      </div>
      {error && <Notice tone="bad">{error}</Notice>}
      <CodeInput id="mfa-setup-code" label={t('Code uit de app', 'Code from the app')} value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
      <Button type="submit" className="w-full" size="lg" loading={busy} disabled={code.replace(/\s/g, '').length !== 6}>{t('Bevestigen en aanzetten', 'Confirm and turn on')}</Button>
    </form>
  );
}

/** Account page card: status, setup, new recovery codes, switch off. */
export function MfaCard() {
  const { t, locale } = useI18n();
  const { user } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const status = useQuery({ queryKey: ['mfa'], queryFn: () => api.get<{ enabled: boolean; recoveryCodesLeft: number }>('/auth/mfa/status') });
  const [dialog, setDialog] = useState<null | 'setup' | 'codes' | 'off'>(null);
  const [form, setForm] = useState({ password: '', code: '' });
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const on = status.data?.enabled ?? user?.mfaEnabled ?? false;
  const close = () => { setDialog(null); setForm({ password: '', code: '' }); setNewCodes(null); setError(null); };

  return (
    <Card>
      <CardHeader
        title={t('Tweestapsverificatie', 'Two-factor authentication')}
        description={t('Extra beveiliging: naast je wachtwoord een code uit een app op je telefoon.', 'Extra security: besides your password, a code from an app on your phone.')}
        action={on ? <Badge tone="ok">{t('Aan', 'On')}</Badge> : <Badge tone="warn">{t('Uit', 'Off')}</Badge>}
      />
      <div className="space-y-3 p-5">
        {on ? (
          <>
            <p className="flex items-center gap-2 text-[14px] text-ink-700">
              <ShieldCheck className="h-4 w-4 text-ok" />
              {t(`Je account is beschermd. Nog ${status.data?.recoveryCodesLeft ?? '…'} herstelcodes over.`, `Your account is protected. ${status.data?.recoveryCodesLeft ?? '…'} recovery codes left.`)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDialog('codes')}>{t('Nieuwe herstelcodes', 'New recovery codes')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setDialog('off')}>{t('Uitzetten', 'Turn off')}</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[14px] text-ink-700">{t('Omdat je met gezondheidsgegevens werkt, raden we dit sterk aan. Instellen duurt twee minuten.', 'Because you work with health data, we strongly recommend this. Setup takes two minutes.')}</p>
            <Button icon={<ShieldCheck className="h-4 w-4" />} onClick={() => setDialog('setup')}>{t('Instellen', 'Set up')}</Button>
          </>
        )}
      </div>

      <Dialog open={dialog === 'setup'} onClose={close} title={t('Tweestapsverificatie instellen', 'Set up two-factor authentication')} size="sm">
        {dialog === 'setup' && <MfaSetup onDone={() => { close(); toast(t('Tweestapsverificatie staat aan', 'Two-factor authentication is on')); }} />}
      </Dialog>

      <Dialog open={dialog === 'codes'} onClose={close} title={t('Nieuwe herstelcodes', 'New recovery codes')} size="sm">
        {newCodes ? <RecoveryCodes codes={newCodes} onDone={() => { close(); qc.invalidateQueries({ queryKey: ['mfa'] }); }} /> : (
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault(); setBusy(true); setError(null);
            try { setNewCodes((await api.post<{ recoveryCodes: string[] }>('/auth/mfa/recovery-codes', { code: form.code })).recoveryCodes); }
            catch (err) { setError(errOf(err, locale)); } finally { setBusy(false); }
          }}>
            <p className="text-[14px] text-ink-600">{t('Je oude herstelcodes werken daarna niet meer.', 'Your old recovery codes will stop working.')}</p>
            {error && <Notice tone="bad">{error}</Notice>}
            <CodeInput id="mfa-codes-code" label={t('Code uit de app', 'Code from the app')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <Button type="submit" className="w-full" loading={busy}>{t('Maak nieuwe codes', 'Create new codes')}</Button>
          </form>
        )}
      </Dialog>

      <Dialog open={dialog === 'off'} onClose={close} title={t('Tweestapsverificatie uitzetten', 'Turn off two-factor authentication')} size="sm">
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true); setError(null);
          try {
            await api.post('/auth/mfa/disable', form);
            close();
            qc.invalidateQueries({ queryKey: ['me'] });
            qc.invalidateQueries({ queryKey: ['mfa'] });
            toast(t('Tweestapsverificatie staat uit', 'Two-factor authentication is off'));
          } catch (err) { setError(errOf(err, locale)); } finally { setBusy(false); }
        }}>
          <Notice tone="warn">{t('Je account is daarna minder goed beveiligd. Andere apparaten worden uitgelogd.', 'Your account will be less secure. Other devices will be signed out.')}</Notice>
          {error && <Notice tone="bad">{error}</Notice>}
          <Input label={t('Wachtwoord', 'Password')} type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <CodeInput id="mfa-off-code" label={t('Code uit de app of herstelcode', 'Code from the app or recovery code')} recovery value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Button type="submit" variant="danger" className="w-full" loading={busy}>{t('Uitzetten', 'Turn off')}</Button>
        </form>
      </Dialog>
    </Card>
  );
}
