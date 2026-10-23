import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bug, Heart, Lightbulb, MessageSquarePlus } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, CardHeader, Dialog, EmptyState, Notice, Spinner, Textarea, useToast } from '@/components/ui';

type Kind = 'idea' | 'problem' | 'praise';

function useKinds() {
  const { t } = useI18n();
  return [
    { value: 'problem' as const, icon: Bug, label: t('Iets werkt niet', 'Something is broken') },
    { value: 'idea' as const, icon: Lightbulb, label: t('Idee', 'Idea') },
    { value: 'praise' as const, icon: Heart, label: t('Compliment', 'Compliment') },
  ];
}

/** Header button + dialog for quick feedback during the test phase (therapist and patient app). */
export function FeedbackButton({ big }: { big?: boolean }) {
  const { t, locale } = useI18n();
  const loc = useLocation();
  const toast = useToast();
  const kinds = useKinds();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>('problem');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => { setOpen(false); setError(null); };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('flex items-center gap-1.5 rounded-lg text-ink-600 hover:bg-ink-100 hover:text-ink-900', big ? 'h-11 w-11 shrink-0 justify-center' : 'px-2 py-1.5 text-[13px] font-medium')}
        aria-label={t('Feedback geven', 'Give feedback')}
      >
        <MessageSquarePlus className={big ? 'h-6 w-6' : 'h-4 w-4'} strokeWidth={big ? 1.8 : 2} />
        {!big && <span className="hidden md:inline">{t('Feedback', 'Feedback')}</span>}
      </button>
      <Dialog
        open={open}
        onClose={close}
        size="sm"
        title={t('Wat vind je ervan?', 'What do you think?')}
        description={t('Je bericht gaat naar het FP Exercise-team. Elke opmerking helpt!', 'Your message goes to the FP Exercise team. Every remark helps!')}
        footer={
          <>
            <Button variant="ghost" onClick={close}>{t('Annuleren', 'Cancel')}</Button>
            <Button type="submit" form="feedback-form" loading={busy} disabled={!message.trim()}>{t('Versturen', 'Send')}</Button>
          </>
        }
      >
        <form
          id="feedback-form"
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await api.post('/feedback', { kind, message: message.trim(), page: loc.pathname, device: `${window.innerWidth}×${window.innerHeight} · ${navigator.userAgent}`.slice(0, 200) });
              setMessage('');
              close();
              toast(t('Bedankt! Je feedback is verstuurd.', 'Thanks! Your feedback was sent.'));
            } catch (err) {
              setError(errorMessage(err instanceof ApiError ? err.code : undefined, locale));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div role="radiogroup" aria-label={t('Soort feedback', 'Type of feedback')} className="grid grid-cols-3 gap-2">
            {kinds.map((k) => (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={kind === k.value}
                onClick={() => setKind(k.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[12.5px] font-medium transition-colors',
                  kind === k.value ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-600 hover:border-ink-300',
                )}
              >
                <k.icon className="h-5 w-5" />
                {k.label}
              </button>
            ))}
          </div>
          {error && <Notice tone="bad">{error}</Notice>}
          <Textarea
            label={t('Je bericht', 'Your message')}
            rows={4}
            maxLength={2000}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={kind === 'problem' ? t('Wat deed je, en wat ging er mis?', 'What did you do, and what went wrong?') : kind === 'idea' ? t('Wat zou het makkelijker maken?', 'What would make it easier?') : t('Wat vind je fijn?', 'What do you like?')}
            hint={t('Noem geen namen of gezondheidsgegevens van patiënten.', 'Do not mention patient names or health details.')}
          />
        </form>
      </Dialog>
    </>
  );
}

type Item = { id: string; kind: Kind; role: string; message: string; page: string | null; device: string | null; createdAt: string; author: string | null; practice: string | null };

/** List for practice owners/admins (their practice) and the platform admin (everything). */
export function FeedbackList() {
  const { t, locale } = useI18n();
  const kinds = useKinds();
  const q = useQuery({ queryKey: ['feedback'], queryFn: () => api.get<{ items: Item[] }>('/feedback') });
  const role = (r: string) => ({ owner: t('Eigenaar', 'Owner'), admin: t('Beheerder', 'Admin'), therapist: t('Therapeut', 'Therapist'), patient: t('Patiënt', 'Patient'), platform_admin: t('Platformbeheer', 'Platform admin') })[r] ?? r;
  if (!q.data) return <Spinner />;
  return (
    <Card>
      <CardHeader title={t('Feedback', 'Feedback')} description={t('Wat je team en je patiënten via de feedbackknop hebben gestuurd.', 'What your team and patients sent via the feedback button.')} />
      {!q.data.items.length ? (
        <EmptyState icon={<MessageSquarePlus className="h-5 w-5" />} title={t('Nog geen feedback', 'No feedback yet')} description={t('Iedereen kan feedback geven via de knop bovenin de app.', 'Everyone can give feedback via the button at the top of the app.')} />
      ) : (
        <ul className="divide-y divide-line">
          {q.data.items.map((f) => {
            const k = kinds.find((x) => x.value === f.kind)!;
            return (
              <li key={f.id} className="flex gap-3 px-5 py-4">
                <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', f.kind === 'problem' ? 'bg-bad-soft text-bad' : f.kind === 'praise' ? 'bg-ok-soft text-ok' : 'bg-accent-soft text-accent')}>
                  <k.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-[14px] text-ink-900">{f.message}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-500">
                    <Badge tone="outline">{k.label}</Badge>
                    <span>{f.author ?? '—'} · {role(f.role)}</span>
                    {f.practice && <span>· {f.practice}</span>}
                    {f.page && <span>· {f.page}</span>}
                    <span>· {fmtDateTime(f.createdAt, locale)}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
