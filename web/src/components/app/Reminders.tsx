import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, BellRing, Share } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { Badge, Button, Card, Notice, Select, useToast } from '@/components/ui';

type Settings = { publicKey: string; enabled: boolean; time: string; endpoints: string[] };

const TIMES = Array.from({ length: 29 }, (_, i) => {
  const m = 7 * 60 + i * 30; // 07:00 … 21:00
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 ? '30' : '00'}`;
});

function keyBytes(base64url: string) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type Support = 'ok' | 'ios-install' | 'unsupported' | 'denied';

function detectSupport(): Support {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  // iPhone/iPad only allow web notifications for apps added to the home screen.
  if (ios && !standalone) return 'ios-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'ok';
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration();
  return { reg, sub: (await reg?.pushManager.getSubscription()) ?? null };
}

/** Patient: daily reminder on training days, at a chosen time. */
export function ReminderCard() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['reminders'], queryFn: () => api.get<Settings>('/reminders') });
  const [support, setSupport] = useState<Support>('ok');
  const [onDevice, setOnDevice] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupport(detectSupport());
    if ('serviceWorker' in navigator) {
      currentSubscription().then(({ sub }) => setOnDevice(!!sub && !!q.data?.endpoints.includes(sub.endpoint))).catch(() => {});
    }
  }, [q.data]);

  const fail = (err: unknown) => toast(errorMessage(err instanceof ApiError ? err.code : undefined, locale), 'bad');
  const refresh = () => qc.invalidateQueries({ queryKey: ['reminders'] });

  const enable = async () => {
    if (!q.data) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setSupport(permission === 'denied' ? 'denied' : 'ok');
        return;
      }
      const { reg } = await currentSubscription();
      if (!reg) {
        setSupport('unsupported');
        return;
      }
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(q.data.publicKey) }));
      await api.post('/reminders/subscribe', sub.toJSON());
      await api.put('/reminders', { enabled: true, time: q.data.time });
      setOnDevice(true);
      toast(t('Herinneringen staan aan', 'Reminders are on'));
      refresh();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  if (!q.data) return null;
  const on = q.data.enabled && onDevice;

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          {on ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-ink-900">{t('Herinnering', 'Reminder')}</h2>
            {on ? <Badge tone="ok">{t('Aan', 'On')}</Badge> : <Badge>{t('Uit', 'Off')}</Badge>}
          </div>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-600">
            {t('Een seintje op je telefoon op dagen dat er oefeningen klaarstaan. Heb je al getraind? Dan krijg je niets.', 'A nudge on your phone on days with exercises. Already trained? Then you get nothing.')}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {support === 'ios-install' && (
          <Notice tone="info" icon={<Share className="h-4 w-4" />}>
            {t('Op een iPhone werkt dit alleen vanaf je beginscherm. Tik in Safari op Deel → "Zet op beginscherm", open de app daar en zet de herinnering aan.', 'On an iPhone this only works from the home screen. In Safari tap Share → "Add to Home Screen", open the app there and turn the reminder on.')}
          </Notice>
        )}
        {support === 'unsupported' && <Notice tone="warn">{t('Deze browser ondersteunt geen meldingen. Probeer Chrome, Edge, Firefox of Safari (iPhone: vanaf het beginscherm).', 'This browser does not support notifications. Try Chrome, Edge, Firefox or Safari (iPhone: from the home screen).')}</Notice>}
        {support === 'denied' && (
          <Notice tone="warn" icon={<BellOff className="h-4 w-4" />}>
            {t('Meldingen zijn geblokkeerd. Sta ze toe in de instellingen van je telefoon of browser voor deze app, en probeer het opnieuw.', 'Notifications are blocked. Allow them for this app in your phone or browser settings, then try again.')}
          </Notice>
        )}

        {on ? (
          <>
            <Select
              label={t('Hoe laat?', 'What time?')}
              value={q.data.time}
              onChange={async (e) => {
                try {
                  await api.put('/reminders', { enabled: true, time: e.target.value });
                  refresh();
                  toast(t('Tijd opgeslagen', 'Time saved'));
                } catch (err) { fail(err); }
              }}
            >
              {TIMES.map((tm) => <option key={tm} value={tm}>{tm}</option>)}
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={async () => {
                try {
                  const r = await api.post<{ sent: number }>('/reminders/test');
                  toast(r.sent ? t('Testmelding verstuurd', 'Test notification sent') : t('Versturen lukte niet. Zet de herinnering opnieuw aan.', 'Sending failed. Turn the reminder on again.'), r.sent ? 'ok' : 'bad');
                  if (!r.sent) refresh();
                } catch (err) { fail(err); }
              }}>{t('Stuur een test', 'Send a test')}</Button>
              <Button variant="ghost" onClick={async () => {
                try { await api.put('/reminders', { enabled: false, time: q.data!.time }); refresh(); } catch (err) { fail(err); }
              }}>{t('Uitzetten', 'Turn off')}</Button>
            </div>
          </>
        ) : (
          support === 'ok' && <Button size="lg" className="w-full" icon={<Bell className="h-5 w-5" />} loading={busy} onClick={enable}>{t('Herinnering aanzetten', 'Turn on reminder')}</Button>
        )}
      </div>
    </Card>
  );
}
