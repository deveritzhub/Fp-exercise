import { useState } from 'react';
import { CalendarCheck2, Plus, Settings, Trophy } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button, Dialog } from '@/components/ui';

/** Seen once per device; only a display preference, no health data. */
export const TOUR_KEY = 'fp.tour.v1';

const seen = () => {
  try {
    return localStorage.getItem(TOUR_KEY) === 'done';
  } catch {
    return true; // storage unavailable: do not show it on every visit
  }
};

const STEPS = [
  { icon: CalendarCheck2, nl: ['Vandaag', 'Hier staat je training van vandaag. Eén tik op Start en de app neemt je oefening voor oefening mee, met video en timer. Ook vind je hier elke dag een quizvraag.'], en: ['Today', 'Your workout for today is here. One tap on Start and the app takes you through it exercise by exercise, with video and timer. You also get a quiz question here every day.'] },
  { icon: Plus, nl: ['De plusknop', 'Midden onderin. Snel iets bijhouden: je dagcheck en pijn, water, eiwit of een set in de Krachtlog.'], en: ['The plus button', 'Bottom centre. Quickly log something: your daily check-in and pain, water, protein or a set in the strength log.'] },
  { icon: Trophy, nl: ['Je held', 'Je held groeit mee met wat je doet: skills, munten voor de winkel, de baas van de week en de spierenatlas met quiz.'], en: ['Your hero', 'Your hero grows with what you do: skills, coins for the shop, the boss of the week and the muscle atlas with quiz.'] },
  { icon: Settings, nl: ['Instellingen', 'Rechtsboven: het belletje met berichten van je fysiotherapeut, de feedbackknop (iets geks of een idee?) en het tandwiel voor wat je deelt, herinneringen en de tekstgrootte.'], en: ['Settings', 'Top right: the bell with messages from your physiotherapist, the feedback button (something odd or an idea?) and the cog for what you share, reminders and text size.'] },
] as const;

/** A four-step welcome on first use of the patient app; skippable, shown once per device. */
export function WelcomeTour() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [open, setOpen] = useState(() => !seen());
  const [step, setStep] = useState(0);
  const done = () => {
    try {
      localStorage.setItem(TOUR_KEY, 'done');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };
  if (!open) return null;
  const s = STEPS[step];
  const [title, body] = nl ? s.nl : s.en;
  const last = step === STEPS.length - 1;
  return (
    <Dialog open onClose={done} size="sm" title={t(`Welkom bij FP Flow · ${step + 1}/${STEPS.length}`, `Welcome to FP Flow · ${step + 1}/${STEPS.length}`)}
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="secondary" onClick={done}>{t('Overslaan', 'Skip')}</Button>
          <Button data-autofocus onClick={() => (last ? done() : setStep(step + 1))}>{last ? t('Aan de slag', 'Get started') : t('Volgende', 'Next')}</Button>
        </div>
      }>
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent" aria-hidden><s.icon className="h-6 w-6" /></span>
        <div>
          <p className="font-display text-[18px] font-bold text-ink-950">{title}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{body}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
        {STEPS.map((_, i) => <span key={i} className={i === step ? 'h-2 w-5 rounded-full bg-accent' : 'h-2 w-2 rounded-full bg-ink-200'} />)}
      </div>
    </Dialog>
  );
}
