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
  { clinical: true, nl: 'VKB-route toewijzen in één keer: vijf fases, bazen en standaardcriteria. Testsessie met LSI, fasedoelen en een grafiek in het dossier.', en: 'Assign the ACL route in one go: five phases, bosses and default criteria. A test session with LSI, phase goals and a chart in the record.', to: '/app/patienten?filter=acl' },
  { nl: 'Snelfilters in de patiëntenlijst: vraagt aandacht, nog niet uitgenodigd, uitnodiging open, geen programma.', en: 'Quick filters in the patient list: needs attention, not invited, invitation open, no programme.', to: '/app/patienten' },
  { nl: 'Bij "Kies een sjabloon" staan je laatst gebruikte sjablonen bovenaan.', en: '"Choose a template" shows your recently used templates first.' },
  { nl: 'Patiënten kunnen tijdens een oefening op "Dit doet pijn" tikken; je ziet de reden en pijnscore bij de sessie.', en: 'Patients can tap "This hurts" during an exercise; you see the reason and pain score with the session.' },
  { clinical: true, nl: 'Programma maken vanuit de klachtwijzer: de uitleg over de klacht gaat in één keer mee naar de patiënt.', en: 'Make a programme from the complaint guide: the explanation of the complaint goes along to the patient in one go.', to: '/app/klachtwijzer' },
  { clinical: true, nl: 'In de klachtwijzer: "Vraag om te meten" met de mobiliteitstest die bij de klacht hoort.', en: 'In the complaint guide: "Ask to measure" with the mobility test that fits the complaint.' },
  { clinical: true, nl: 'Het voortgangsrapport (PDF) toont nu ook de pijnkaart: start en laatste meting per plek.', en: 'The progress report (PDF) now also shows the pain map: start and latest per area.' },
  { nl: 'Kies in het dossier (bij de held) welke skill de patiënt deze week traint in de weekquest.', en: 'Choose in the record (hero section) which skill the patient trains in this week\'s quest.' },
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
  { nl: 'Je held in 3D: tik bij Held → Inventaris op "3D-weergave" en draai je held rond met alles wat je draagt.', en: 'Your hero in 3D: on Hero → Inventory tap "3D view" and turn your hero around with everything it wears.', to: '/p/held/inventaris' },
  { nl: 'Laat een oefening voorlezen met de knop "Lees voor" in de training.', en: 'Have an exercise read aloud with the "Read aloud" button in the workout.' },
  { nl: 'Doet een oefening pijn? Tik op "Dit doet pijn": kies een lichtere variant of sla over.', en: 'Does an exercise hurt? Tap "This hurts": choose a lighter variation or skip it.' },
  { nl: 'Alles gedaan voor vandaag? Je ziet je reeks en wanneer je volgende training is.', en: 'Done for today? You see your streak and when your next workout is.' },
  { nl: 'Moedig je vrienden aan met een vaste tekst, zoals "Zet \'m op!", één keer per dag.', en: 'Cheer on your friends with a fixed text, like "Go for it!", once a day.', to: '/p/held/vrienden' },
  { clinical: true, nl: 'Geeft je fysiotherapeut een volgende fase vrij, dan zie je "Hoofdstuk voltooid!" met je nieuwe doel.', en: 'When your physiotherapist releases a next phase, you see "Chapter completed!" with your new goal.' },
  { clinical: true, nl: 'In de uitleg over je klacht staat nu ook bij elke oefening van je programma waarom die helpt.', en: 'The explanation of your complaint now also says why each exercise in your programme helps.' },
  { nl: 'Loopt je pijn na het trainen drie keer op rij op, dan zie je dat met een tip om het rustiger aan te doen.', en: 'If your pain after training goes up three times in a row, you see it with a tip to take it easier.' },
  { nl: 'Berichten van je praktijk staan achter het belletje bovenin.', en: 'Messages from your practice are behind the bell at the top.', to: '/p/berichten' },
  { clinical: true, nl: 'Uitleg over je klacht van je fysiotherapeut vind je ook op Revalidatie.', en: 'The explanation of your complaint from your physiotherapist is also on Rehab.' },
  { nl: 'Mobiliteit zelf meten met vier tests en een meetlint, met je verloop in een grafiek.', en: 'Measure your mobility yourself with four tests and a tape measure, with your progress in a chart.', to: '/p/mobiliteit/meten' },
  { nl: 'Op Voortgang zie je hoe zwaar en pijnlijk je trainingen waren, in gewone taal.', en: 'Progress shows how hard and painful your workouts were, in plain words.', to: '/p/voortgang' },
  { nl: 'Nieuwe quizvragen over welke spier het werk overneemt als een andere zwak is.', en: 'New quiz questions on which muscle takes over when another is weak.' },
];
const VERSION = '2026-11-08b';
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
  const items = (audience === 'staff' ? STAFF : PATIENT).filter((x) => clinical || !x.clinical).slice(0, 8);
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
