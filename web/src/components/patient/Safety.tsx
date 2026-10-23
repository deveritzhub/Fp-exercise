import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { OctagonAlert, PhoneCall } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { Button, Dialog, Notice, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * W11: the patient reports an alarm signal. The programme stops right away (the server pauses it)
 * and the therapist is notified. Shows the programme's own red flags plus free text.
 */
export function RedFlagButton({ programId, redFlags, sessionId, onReported, className }: { programId: string; redFlags: string[]; sessionId?: string | null; onReported?: () => void; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-bad/30 bg-white px-4 text-[15px] font-medium text-bad hover:bg-bad-soft/50', className)}
      >
        <OctagonAlert className="h-5 w-5" aria-hidden />
        {t('Alarmsignaal melden', 'Report a warning sign')}
      </button>
      <RedFlagDialog open={open} onClose={() => setOpen(false)} programId={programId} redFlags={redFlags} sessionId={sessionId} onReported={onReported} />
    </>
  );
}

function RedFlagDialog({ open, onClose, programId, redFlags, sessionId, onReported }: { open: boolean; onClose: () => void; programId: string; redFlags: string[]; sessionId?: string | null; onReported?: () => void }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const close = () => {
    onClose();
    if (done) {
      // Refresh only now: refreshing earlier pauses the screen and would unmount this confirmation.
      qc.invalidateQueries({ queryKey: ['patient-home'] });
      qc.invalidateQueries({ queryKey: ['patient-program', programId] });
      onReported?.();
    }
    setPicked([]);
    setNote('');
    setError(null);
    setDone(false);
  };
  const send = async () => {
    if (!picked.length && !note.trim()) return setError(t('Kies wat je merkt of beschrijf het kort.', 'Choose what you notice or describe it briefly.'));
    setBusy(true);
    setError(null);
    try {
      await api.post(`/patient/programs/${programId}/red-flag`, { flags: picked, note: note.trim() || undefined, sessionId: sessionId ?? undefined });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'network_error'
        ? t('Geen internet: je melding is niet verstuurd. Stop met oefenen en bel je praktijk.', 'No internet: your report was not sent. Stop exercising and call your practice.')
        : errorMessage(e instanceof ApiError ? e.code : undefined, locale));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title={done ? t('Stop met oefenen', 'Stop exercising') : t('Alarmsignaal melden', 'Report a warning sign')}
      description={done ? undefined : t('Je fysiotherapeut krijgt direct een melding. Je oefeningen staan stil tot hij of zij contact met je heeft gehad.', 'Your physiotherapist is notified right away. Your exercises are paused until they have been in touch with you.')}
      size="sm"
      footer={
        done ? (
          <Button size="lg" className="w-full" data-autofocus onClick={close}>{t('Begrepen', 'Understood')}</Button>
        ) : (
          <div className="grid w-full grid-cols-2 gap-2">
            <Button size="lg" variant="secondary" onClick={close}>{t('Annuleren', 'Cancel')}</Button>
            <Button size="lg" variant="danger" loading={busy} onClick={send}>{t('Melden', 'Report')}</Button>
          </div>
        )
      }
    >
      {done ? (
        <div className="space-y-3 text-[15.5px] leading-relaxed text-ink-800" role="status">
          <p>{t('Je melding is verstuurd. Doe geen oefeningen tot je fysiotherapeut contact met je heeft opgenomen.', 'Your report has been sent. Do not exercise until your physiotherapist has contacted you.')}</p>
          <Notice tone="bad" icon={<PhoneCall className="h-4 w-4" />}>
            {t('Ernstige of snel erger wordende klachten? Bel je huisarts, of bij spoed 112.', 'Severe or quickly worsening symptoms? Call your GP, or 112 in an emergency.')}
          </Notice>
        </div>
      ) : (
        <div className="space-y-4">
          {error && <Notice tone="bad">{error}</Notice>}
          {redFlags.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-[15px] font-semibold">{t('Wat merk je?', 'What do you notice?')}</legend>
              <div className="space-y-1">
                {redFlags.map((f) => (
                  <label key={f} className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-ink-50">
                    <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-bad" checked={picked.includes(f)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, f] : p.filter((x) => x !== f)))} />
                    <span className="text-[15px] text-ink-800">{f}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <Textarea label={redFlags.length ? t('Iets anders of toelichting', 'Something else or details') : t('Wat merk je?', 'What do you notice?')} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className="text-[16px]" />
        </div>
      )}
    </Dialog>
  );
}

/** Shown instead of "Start training" while a report is open. */
export function PausedNotice() {
  const { t } = useI18n();
  return (
    <div className="space-y-2 rounded-xl border border-bad/25 bg-bad-soft/50 p-4 text-[15px] text-ink-800" role="status">
      <p className="flex items-center gap-2 font-semibold text-bad"><OctagonAlert className="h-5 w-5" aria-hidden />{t('Je programma staat stil', 'Your programme is paused')}</p>
      <p>{t('Je hebt een alarmsignaal gemeld. Doe geen oefeningen tot je fysiotherapeut contact met je heeft gehad.', 'You reported a warning sign. Do not exercise until your physiotherapist has been in touch.')}</p>
      <p className="text-[14px] text-ink-700">{t('Ernstige of snel erger wordende klachten? Bel je huisarts, of bij spoed 112.', 'Severe or quickly worsening symptoms? Call your GP, or 112 in an emergency.')}</p>
    </div>
  );
}
