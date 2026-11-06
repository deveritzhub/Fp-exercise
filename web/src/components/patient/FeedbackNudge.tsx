import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
import { FeedbackDialog } from '@/components/app/Feedback';

/** Asked once per device; only a display preference. */
const KEY = 'fp.feedbackAsked.v1';
const asked = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true; // storage unavailable: do not ask on every visit
  }
};

/** After the third workout, ask once what the person thinks (test phase). */
export function FeedbackNudge({ sessions }: { sessions: number }) {
  const { t } = useI18n();
  const [done, setDone] = useState(asked);
  const [open, setOpen] = useState(false);
  if (done || sessions < 3) return null;
  const finish = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setDone(true);
  };
  return (
    <section aria-labelledby="fb-nudge" className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden><MessageSquarePlus className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="fb-nudge" className="font-semibold text-ink-900">{t(`Al ${sessions} trainingen gedaan. Wat vind je van de app?`, `${sessions} workouts done. What do you think of the app?`)}</h2>
          <p className="text-[13.5px] text-ink-600">{t('De app is nog in de testfase. Wat werkt fijn, wat is lastig?', 'The app is still being tested. What works well, what is hard?')}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={finish}>{t('Nu niet', 'Not now')}</Button>
        <Button onClick={() => setOpen(true)}>{t('Laat het weten', 'Tell us')}</Button>
      </div>
      <FeedbackDialog open={open} onClose={() => setOpen(false)} initialKind="idea" onSent={finish} />
    </section>
  );
}
