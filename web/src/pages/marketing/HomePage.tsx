import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Apple, ArrowRight, BarChart3, BookOpen, Building2, Check, Dumbbell, Gamepad2, HeartPulse, Layers, Lock, Smartphone, Sparkles, Timer } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { ButtonLink } from '@/components/ui';
import { ProductShot } from './ProductShot';

export function HomePage() {
  const { t } = useI18n();
  useDocumentMeta(
    t('FP Flow — Oefentherapie op maat voor fysiotherapiepraktijken', 'FP Flow — Tailored exercise therapy for physiotherapy practices'),
    t('Stel in een paar minuten een oefenprogramma samen. Je patiënt traint met een app met krachtschema’s, voeding, hartslag en een 3D-dorp dat meegroeit met elke training.', 'Build an exercise programme in minutes. Your patient trains with an app with strength plans, nutrition, heart rate and a 3D village that grows with every workout.'),
  );
  useEffect(() => {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'FP Flow',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web, iOS, Android (PWA)',
      inLanguage: ['nl', 'en'],
      description: 'Oefenprogramma’s voorschrijven, volgen en bijsturen voor fysiotherapeuten.',
      offers: { '@type': 'Offer', priceCurrency: 'EUR', price: '29.00' },
    });
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_70%_0%,rgba(65,61,40,0.08),transparent)]" />
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-14 px-5 pb-24 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:pt-24">
          <div className="min-w-0">
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-[13px] font-medium text-ink-600 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> {t('Gemaakt in Rotterdam, voor de Nederlandse fysiotherapie', 'Made in Rotterdam for Dutch physiotherapy')}
            </span>
            <h1 className="mt-6 text-[34px] font-bold leading-[1.08] [overflow-wrap:anywhere] sm:text-[42px] tracking-[-0.02em] sm:text-[56px]">
              {t('Oefentherapie die je patiënt', 'Exercise therapy your patients')} <span className="text-accent">{t('écht volhoudt', 'actually stick with')}</span>.
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-600">
              {t('Jij stelt in een paar minuten het programma samen. Je patiënt traint thuis met een app die motiveert: een eigen held in een 3D-dorp die sterker wordt van elke oefening, krachtschema’s, voeding en hartslag. Jij ziet direct hoe het gaat, inclusief pijn en zwaarte.', 'You build the programme in minutes. Your patient trains at home with an app that motivates: their own hero in a 3D village that grows stronger with every exercise, strength plans, nutrition and heart rate. You see straight away how it’s going, including pain and difficulty.')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/contact?onderwerp=demo" size="lg" icon={<ArrowRight className="h-4 w-4" />} className="flex-row-reverse">{t('Plan een demo', 'Book a demo')}</ButtonLink>
              <ButtonLink to="/demo" size="lg" variant="secondary">{t('Probeer de interactieve demo', 'Try the interactive demo')}</ButtonLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-500">
              {[t('Geen installatie', 'No installation'), t('Werkt op elke smartphone, ook liggend', 'Works on any smartphone, also sideways'), t('Nederlands & Engels', 'Dutch & English')].map((x) => (
                <li key={x} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-accent" />{x}</li>
              ))}
            </ul>
          </div>
          <ProductShot />
        </div>
      </section>

      {/* Value strip */}
      <section className="border-y border-line bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-3">
          {[
            [Timer, t('Programma in < 3 minuten', 'Programme in < 3 minutes'), t('Zoeken, toevoegen, doseren, toewijzen. Of start vanuit een sjabloon.', 'Search, add, dose, assign. Or start from a template.')],
            [Gamepad2, t('Volhouden wordt een spel', 'Sticking with it becomes a game'), t('Elke training geeft je patiënt XP, loot en een sterker personage. Wie traint, bouwt zijn dorp op.', 'Every workout gives your patient XP, loot and a stronger character. Training builds their village.')],
            [BarChart3, t('Bijsturen op basis van data', 'Adjust based on data'), t('Therapietrouw, zwaarte en pijn per oefening in één overzicht.', 'Adherence, difficulty and pain per exercise in one overview.')],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Timer;
            return (
              <div key={title as string}>
                <I className="h-5 w-5 text-accent" />
                <h2 className="mt-3 text-[16px] font-bold">{title as string}</h2>
                <p className="mt-1 text-[14.5px] leading-relaxed text-ink-500">{text as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Patient app showcase */}
      <section className="mx-auto max-w-6xl px-5 pt-24">
        <div className="max-w-2xl">
          <span className="text-[13px] font-semibold uppercase tracking-wider text-accent">{t('De patiëntapp', 'The patient app')}</span>
          <h2 className="mt-2 text-[32px] font-bold leading-tight tracking-tight">{t('Meer dan een oefenlijst', 'More than an exercise list')}</h2>
          <p className="mt-3 text-[16px] text-ink-500">{t('De app opent op Vandaag: wat er vandaag te doen is, in één oogopslag. Van daaruit is het één tik naar de training, de voeding of het dorp.', 'The app opens on Today: what to do today, at a glance. From there it’s one tap to the workout, nutrition or the village.')}</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['/marketing/today.webp', t('Vandaag', 'Today'), t('Oefeningen, water, eten en het dorp op één plek.', 'Exercises, water, food and the village in one place.')],
            ['/marketing/workout.webp', t('Training met hartslag', 'Workout with heart rate'), t('Set-teller, rusttimer en live hartslag via een borstband.', 'Set counter, rest timer and live heart rate from a chest strap.')],
            ['/marketing/nutrition.webp', t('Voeding', 'Nutrition'), t('Typ wat je at in je eigen woorden. De app rekent eiwit en energie uit.', 'Type what you ate in your own words. The app works out protein and energy.')],
          ].map(([src, title, text]) => (
            <figure key={src} className="overflow-hidden rounded-2xl border border-line bg-canvas">
              <div className="flex justify-center px-6 pt-6">
                <img src={src} alt={title} loading="lazy" width={390} height={844} className="h-[420px] w-auto rounded-t-[22px] border border-b-0 border-line object-cover object-top shadow-card" />
              </div>
              <figcaption className="border-t border-line bg-white p-5">
                <h3 className="text-[16px] font-bold">{title}</h3>
                <p className="mt-1 text-[14.5px] leading-relaxed text-ink-500">{text}</p>
              </figcaption>
            </figure>
          ))}
        </div>
        <figure className="mt-6 overflow-hidden rounded-2xl border border-line bg-ink-950">
          <img src="/marketing/village.webp" alt={t('Het 3D-dorp met de held van de patiënt', 'The 3D village with the patient’s hero')} loading="lazy" width={844} height={390} className="w-full" />
          <figcaption className="p-6 text-white sm:p-8">
            <h3 className="text-[20px] font-bold text-white">{t('Een eigen held in een 3D-dorp', 'Their own hero in a 3D village')}</h3>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-300">{t('Trainen levert XP en skills op. In het dorp hakt je patiënt bomen, plukt besjes, verslaat monsters en bouwt met de buit zijn huis uit. Water en eten uit de voedingslog houden de held fit. Speelbaar staand en liggend.', 'Training earns XP and skills. In the village your patient chops trees, picks berries, defeats monsters and uses the loot to upgrade their home. Water and food from the nutrition log keep the hero fit. Playable upright and sideways.')}</p>
          </figcaption>
        </figure>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="max-w-2xl">
          <h2 className="text-[32px] font-bold leading-tight tracking-tight">{t('Alles wat je nodig hebt. Niets wat je afleidt.', 'Everything you need. Nothing that distracts.')}</h2>
          <p className="mt-3 text-[16px] text-ink-500">{t('Snel voor jou tijdens het consult. Motiverend voor je patiënt thuis.', 'Fast for you during the session. Motivating for your patient at home.')}</p>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {[
            [BookOpen, t('Oefenbibliotheek', 'Exercise library'), t('Zoek op naam, spier, regio, materiaal of categorie. Met regressies, progressies en je eigen oefeningen en video’s.', 'Search by name, muscle, region, equipment or category. With regressions, progressions and your own exercises and videos.')],
            [Layers, t('Programmabouwer', 'Programme builder'), t('Slepen, doseren, trainingsdagen kiezen en persoonlijke notities toevoegen. Versiegeschiedenis inbegrepen.', 'Drag, dose, choose training days and add personal notes. Version history included.')],
            [Smartphone, t('Patiëntapp', 'Patient app'), t('Video of een duidelijke beschrijving, set-teller en rusttimer. Een training typen in eigen woorden kan ook.', 'Video or a clear description, set counter and rest timer. Typing a workout in your own words works too.')],
            [Dumbbell, t('Krachtschema’s', 'Strength plans'), t('Onderbouwde hypertrofieschema’s. De patiënt kiest vorm, dagen per week en doel; de app houdt gewichten en 1RM bij.', 'Evidence-based hypertrophy plans. The patient picks format, days per week and goal; the app tracks weights and 1RM.')],
            [Apple, t('Voeding', 'Nutrition'), t('Eetlog in eigen woorden, persoonlijke richtlijn, recepten (ook vegetarisch en veganistisch), weekplanning en boodschappenlijst.', 'Food log in your own words, a personal guide, recipes (also vegetarian and vegan), a week plan and a shopping list.')],
            [HeartPulse, t('Hartslag', 'Heart rate'), t('Live hartslag tijdens de training via een Bluetooth-borstband, met gemiddelde en maximum per sessie.', 'Live heart rate during the workout from a Bluetooth chest strap, with average and maximum per session.')],
            [BarChart3, t('Voortgang & signalen', 'Progress & signals'), t('Zie wie aandacht nodig heeft: hoge pijnscores, nieuwe feedback of lage therapietrouw.', 'See who needs attention: high pain scores, new feedback or low adherence.')],
            [Building2, t('Praktijkbeheer', 'Practice management'), t('Teamleden, rollen, gedeelde praktijksjablonen en eigen huisstijl.', 'Team members, roles, shared practice templates and your own branding.')],
            [Lock, t('Privacy by design', 'Privacy by design'), t('Strikte scheiding tussen praktijken, minimale gegevens en audit logging. Voeding blijft privé van de patiënt. Hosting in de EU.', 'Strict separation between practices, minimal data and audit logging. Nutrition stays private to the patient. Hosted in the EU.')],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Timer;
            return (
              <div key={title as string} className="bg-white p-7">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><I className="h-[18px] w-[18px]" /></span>
                <h3 className="mt-4 text-[16px] font-bold">{title as string}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-500">{text as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* For therapists / patients */}
      <section className="bg-canvas">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-24 lg:grid-cols-2">
          {[
            [t('Voor fysiotherapeuten', 'For physiotherapists'), [t('Minder tijd kwijt aan uitleg en papieren schema’s', 'Less time spent on explanations and paper sheets'), t('Bijsturen tussen consulten op basis van echte feedback', 'Adjust between sessions based on real feedback'), t('Eigen video’s en oefeningen voor je hele team', 'Your own videos and exercises for the whole team'), t('Sjablonen als startpunt — jij houdt de klinische regie', 'Templates as a starting point — you stay in clinical control'), t('Een praktijkdorp dat groeit met wat je patiënten samen trainen', 'A practice village that grows with what your patients train together')]],
            [t('Voor patiënten', 'For patients'), [t('Altijd weten wat en hoe — met video of beschrijving', 'Always know what and how — with video or description'), t('Een held die sterker wordt van elke training', 'A hero that grows stronger with every workout'), t('Krachtschema dat past bij je doel en agenda', 'A strength plan that fits your goal and schedule'), t('Voeding bijhouden in gewone taal, met recepten en boodschappenlijst', 'Track food in plain words, with recipes and a shopping list'), t('Hartslag live tijdens het trainen', 'Live heart rate while training'), t('Laat makkelijk weten hoe het ging', 'Easily share how it went')]],
          ].map(([title, points]) => (
            <div key={title as string} className="rounded-2xl border border-line bg-white p-8 shadow-card">
              <h2 className="text-[22px] font-bold">{title as string}</h2>
              <ul className="mt-5 space-y-3">
                {(points as string[]).map((p) => <li key={p} className="flex gap-3 text-[15px] text-ink-700"><Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="relative overflow-hidden rounded-3xl bg-ink-950 px-8 py-14 text-white sm:px-14">
          <div className="absolute inset-0 bg-[radial-gradient(50%_80%_at_90%_10%,rgba(187,185,161,0.22),transparent)]" />
          <div className="relative max-w-xl">
            <h2 className="text-[30px] font-bold leading-tight text-white">{t('Zie het in actie in je eigen praktijk', 'See it in action in your own practice')}</h2>
            <p className="mt-3 text-[16px] text-ink-300">{t('Een persoonlijke demo van 30 minuten. Daarna kun je 30 dagen kosteloos proberen.', 'A personal 30-minute demo. Then try it free for 30 days.')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/contact?onderwerp=demo" className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-[15px] font-medium text-ink-950 hover:bg-ink-100">{t('Plan een demo', 'Book a demo')}</Link>
              <Link to="/prijzen" className="inline-flex h-11 items-center rounded-lg border border-white/20 px-5 text-[15px] font-medium text-white hover:bg-white/10">{t('Bekijk prijzen', 'View pricing')}</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
