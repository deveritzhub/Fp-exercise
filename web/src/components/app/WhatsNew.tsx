import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Dialog } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * "What's new": the latest improvements in plain words, so testers know what to try. A dot shows
 * until the newest version was opened (a display preference in this browser, no personal data).
 */
type Item = { nl: string; en: string; to?: string; clinical?: true };
const STAFF: Item[] = [
  { clinical: true, nl: 'Vroege waarschuwing: "Pijnplek erger" als dezelfde plek op de pijnkaart in twee weken 2+ punten slechter wordt.', en: 'Early warning: "Sore spot worse" when the same spot on the pain map gets 2+ points worse within two weeks.', to: '/app' },
  { nl: 'Bij "Wijzigingen publiceren" kun je een kort bericht aan de patiënt meesturen.', en: 'With "Publish changes" you can send the patient a short message.' },
  { nl: 'Nieuw signaal op het dashboard: "Pijn loopt op" als de pijn na de training drie keer op rij stijgt.', en: 'New dashboard signal: "Pain rising" when pain after workouts goes up three times in a row.', to: '/app' },
  { clinical: true, nl: 'Uitleg over een klacht naar de patiënt sturen, vanuit de klachtwijzer. De patiënt leest hem in de app.', en: 'Send the explanation of a complaint to the patient from the complaint guide. The patient reads it in the app.', to: '/app/klachtwijzer' },
  { clinical: true, nl: 'Klachten zoeken met Ctrl+K: typ bijvoorbeeld "loperknie".', en: 'Search complaints with Ctrl+K: type e.g. "runner\'s knee".' },
  { clinical: true, nl: 'Het oefenvoorstel heeft nu ook functionele oefeningen voor nek, schouder, elleboog en hand.', en: 'The exercise proposal now also has functional exercises for neck, shoulder, elbow and hand.', to: '/app/klachtwijzer' },
  { clinical: true, nl: 'Controlepagina: alle teksten én 50 oefeningen met een conventionele dosering om na te lopen.', en: 'Review page: all texts plus 50 exercises with a conventional dose to check.', to: '/app/klachtwijzer/controle' },
  { nl: 'Reageren op een training bij "Markeer als gezien"; de patiënt krijgt je reactie.', en: 'Reply to a workout with "Mark as seen"; the patient gets your reply.' },
];
const PATIENT: Item[] = [
  { clinical: true, nl: 'Geeft je fysiotherapeut een volgende fase vrij, dan zie je "Hoofdstuk voltooid!" met je nieuwe doel.', en: 'When your physiotherapist releases a next phase, you see "Chapter completed!" with your new goal.' },
  { clinical: true, nl: 'In de uitleg over je klacht staat nu ook bij elke oefening van je programma waarom die helpt.', en: 'The explanation of your complaint now also says why each exercise in your programme helps.' },
  { nl: 'Loopt je pijn na het trainen drie keer op rij op, dan zie je dat met een tip om het rustiger aan te doen.', en: 'If your pain after training goes up three times in a row, you see it with a tip to take it easier.' },
  { nl: 'Berichten van je praktijk staan achter het belletje bovenin.', en: 'Messages from your practice are behind the bell at the top.', to: '/p/berichten' },
  { clinical: true, nl: 'Uitleg over je klacht van je fysiotherapeut vind je ook op Revalidatie.', en: 'The explanation of your complaint from your physiotherapist is also on Rehab.' },
  { nl: 'Mobiliteit zelf meten met vier tests en een meetlint, met je verloop in een grafiek.', en: 'Measure your mobility yourself with four tests and a tape measure, with your progress in a chart.', to: '/p/mobiliteit/meten' },
  { nl: 'Op Voortgang zie je hoe zwaar en pijnlijk je trainingen waren, in gewone taal.', en: 'Progress shows how hard and painful your workouts were, in plain words.', to: '/p/voortgang' },
  { nl: 'Nieuwe quizvragen over welke spier het werk overneemt als een andere zwak is.', en: 'New quiz questions on which muscle takes over when another is weak.' },
];
const VERSION = '2026-11-06f';
const KEY = 'fp.whatsnew.v1';

function seen() {
  try {
    return localStorage.getItem(KEY) === VERSION;
  } catch {
    return true;
  }
}

export function WhatsNew({ audience, clinical = true, className }: { audience: 'staff' | 'patient'; clinical?: boolean; className?: string }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [isNew, setIsNew] = useState(() => !seen());
  const items = (audience === 'staff' ? STAFF : PATIENT).filter((x) => clinical || !x.clinical);
  const show = () => {
    setOpen(true);
    setIsNew(false);
    try {
      localStorage.setItem(KEY, VERSION);
    } catch {
      /* storage unavailable */
    }
  };
  return (
    <>
      <button type="button" onClick={show} className={cn('flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-left text-[14px] font-medium text-ink-700 hover:bg-white/70', className)}>
        <Sparkles className="h-[18px] w-[18px] shrink-0 text-accent" aria-hidden />
        <span className="flex-1">{t('Wat is er nieuw?', "What's new?")}</span>
        {isNew && <span className="rounded-full bg-accent px-2 py-0.5 text-[11.5px] font-semibold text-accent-ink">{t('Nieuw', 'New')}</span>}
      </button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title={t('Wat is er nieuw?', "What's new?")} description={t('De laatste verbeteringen. Probeer ze uit en laat via de feedbackknop weten wat je ervan vindt.', 'The latest improvements. Try them and tell us what you think with the feedback button.')}>
          <ul className="space-y-3">
            {items.map((x, i) => (
              <li key={i} className="flex gap-2 text-[15px] text-ink-800">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>
                  {locale === 'nl' ? x.nl : x.en}
                  {x.to && <> <Link to={x.to} onClick={() => setOpen(false)} className="font-semibold text-accent hover:underline">{t('Bekijken', 'View')}</Link></>}
                </span>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </>
  );
}
