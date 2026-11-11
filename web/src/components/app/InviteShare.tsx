import { useState } from 'react';
import { Copy, MessageCircle, QrCode, Share2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button, useToast } from '@/components/ui';

/**
 * Hand an invitation link to the patient while there is no real e-mail yet: copy it, send it via
 * WhatsApp (or the phone's share sheet), or let them scan a QR code in the practice.
 */
export function InviteShare({ url, firstName }: { url: string; firstName?: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [qr, setQr] = useState<string | null>(null);
  const text = t(
    `Hoi${firstName ? ` ${firstName}` : ''}! Je fysiotherapeut heeft je oefenprogramma in FP Flow klaargezet. Maak hier je account aan: ${url}`,
    `Hi${firstName ? ` ${firstName}` : ''}! Your physiotherapist has set up your exercise programme in FP Flow. Create your account here: ${url}`,
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast(t('Link gekopieerd', 'Link copied'));
    } catch {
      toast(t('Kopiëren lukte niet; selecteer de link en kopieer hem zelf.', 'Copying failed; select the link and copy it yourself.'), 'bad');
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: 'FP Flow', text });
    } catch {
      /* cancelled */
    }
  };
  const showQr = async () => {
    if (qr) return setQr(null);
    const QRCode = (await import('qrcode')).default;
    setQr(await QRCode.toDataURL(url, { margin: 1, width: 240 }));
  };
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  return (
    <div className="mt-2 space-y-2">
      <p className="break-all rounded-lg bg-white/70 px-2 py-1.5 font-mono text-[12.5px] text-ink-800">{url}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={copy} icon={<Copy className="h-4 w-4" />}>{t('Kopiëren', 'Copy')}</Button>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13.5px] font-semibold text-ink-900 hover:bg-ink-50">
          <MessageCircle className="h-4 w-4" aria-hidden />{t('Via WhatsApp', 'Via WhatsApp')}
        </a>
        {canShare && <Button size="sm" variant="secondary" onClick={share} icon={<Share2 className="h-4 w-4" />}>{t('Delen', 'Share')}</Button>}
        <Button size="sm" variant="secondary" onClick={showQr} aria-expanded={!!qr} icon={<QrCode className="h-4 w-4" />}>{qr ? t('QR-code verbergen', 'Hide QR code') : t('QR-code', 'QR code')}</Button>
      </div>
      {qr && (
        <figure className="inline-block rounded-xl bg-white p-2">
          <img src={qr} alt={t('QR-code met de uitnodigingslink', 'QR code with the invitation link')} width={240} height={240} />
          <figcaption className="mt-1 text-center text-[12.5px] text-ink-600">{t('Laat de patiënt scannen met de camera', 'Let the patient scan it with the camera')}</figcaption>
        </figure>
      )}
      <p className="text-[12.5px] text-ink-600">{t('Deel de link alleen met de patiënt zelf: wie hem heeft, kan het account aanmaken. Hij werkt één keer.', 'Share the link only with the patient: whoever has it can create the account. It works once.')}</p>
    </div>
  );
}
