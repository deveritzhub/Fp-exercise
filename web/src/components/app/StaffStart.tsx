import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useClinicalPractice } from '@/lib/session';
import { cn } from '@/lib/cn';
import { Card, ProgressBar } from '@/components/ui';

/** Display preferences on this device (no personal data): hidden, and whether the guide was opened. */
const HIDE = 'fp.staffstart.v1';
export const GUIDE_SEEN = 'fp.staffstart.guide';
const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
/** Called by the complaint guide when it opens. */
export function markGuideSeen() {
  try {
    localStorage.setItem(GUIDE_SEEN, '1');
  } catch {
    /* storage unavailable */
  }
}

export type StaffStartData = { since: string; patients: number; programs: number; invited: number };

/**
 * "Get started" on the dashboard for a new professional (first month): add a patient, make a
 * programme, invite the patient, and (physio) try the complaint guide. Gone when done or hidden.
 */
export function StaffStart({ data }: { data: StaffStartData }) {
  const { t } = useI18n();
  const clinical = useClinicalPractice();
  const [hidden, setHidden] = useState(() => get(HIDE) === 'hidden');
  if (hidden || Date.now() - new Date(data.since).getTime() > 30 * 86400_000) return null;
  const steps = [
    { done: data.patients > 0, to: '/app/patienten?nieuw=1', label: t('Maak een (test)patiënt aan', 'Add a (test) patient') },
    { done: data.programs > 0, to: clinical ? '/app/klachtwijzer' : '/app/programmas/nieuw', label: clinical ? t('Maak een programma, bijvoorbeeld via de klachtwijzer', 'Make a programme, for example from the complaint guide') : t('Maak een programma', 'Make a programme') },
    { done: data.invited > 0, to: '/app/patienten', label: t('Nodig de patiënt uit (link via WhatsApp of QR-code)', 'Invite the patient (link via WhatsApp or QR code)') },
    ...(clinical ? [{ done: get(GUIDE_SEEN) === '1', to: '/app/klachtwijzer', label: t('Bekijk de klachtwijzer: keten, compensatie en oefenvoorstel', 'Look at the complaint guide: chain, compensation and proposal') }] : []),
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const hide = () => {
    try {
      localStorage.setItem(HIDE, 'hidden');
    } catch {
      /* ignore */
    }
    setHidden(true);
  };
  return (
    <Card className="mt-6">
      <section aria-labelledby="staff-start" className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="staff-start" className="font-semibold text-ink-900">{t('Aan de slag', 'Get started')}</h2>
            <p className="text-[13.5px] text-ink-600">{t(`${done} van ${steps.length} gedaan`, `${done} of ${steps.length} done`)}</p>
          </div>
          <button type="button" onClick={hide} aria-label={t('Aan de slag verbergen', 'Hide get started')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" aria-hidden /></button>
        </div>
        <ProgressBar value={done / steps.length} className="mt-2 h-2" label={t('Aan de slag', 'Get started')} />
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {steps.map((s) => {
            const body = (
              <>
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', s.done ? 'border-ok bg-ok text-white' : 'border-ink-300')} aria-hidden>{s.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                <span className={cn('min-w-0 flex-1 text-[14.5px]', s.done ? 'text-ink-500 line-through' : 'text-ink-900')}><span className="sr-only">{s.done ? t('Gedaan: ', 'Done: ') : t('Nog te doen: ', 'To do: ')}</span>{s.label}</span>
                {!s.done && <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />}
              </>
            );
            return <li key={s.label}>{s.done ? <div className="flex min-h-[44px] items-center gap-3 px-1">{body}</div> : <Link to={s.to} className="tap flex min-h-[44px] items-center gap-3 rounded-lg px-1 hover:bg-ink-50">{body}</Link>}</li>;
          })}
        </ul>
      </section>
    </Card>
  );
}
