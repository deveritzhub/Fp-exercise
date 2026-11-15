import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Apple, ArrowRight, BarChart3, BookOpen, Building2, Check, Dumbbell, HeartPulse, Layers, Lock, Smartphone, Sparkles, Stethoscope, Timer, User } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { ButtonLink } from '@/components/ui';
import { ProductShot } from './ProductShot';

export function HomePage() {
  const { t } = useI18n();
  useDocumentMeta(
    t('FP Flow — Oefentherapie op maat voor fysiotherapiepraktijken', 'FP Flow — Tailored exercise therapy for physiotherapy practices'),
    t('Stel in een paar minuten een oefenprogramma samen. Je patiënt traint met een heldere app met krachtschema’s, voeding en hartslag, en voor de lol een 3D-dorp met jouw praktijk erin.', 'Build an exercise programme in minutes. Your patient trains with a clear app with strength plans, nutrition and heart rate, and for fun a 3D village with your practice in it.'),
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
              <Sparkles className="h-3.5 w-3.5 text-accent" /> {t('Gemaakt in Rotterdam, voor fysiotherapeuten en personal trainers', 'Made in Rotterdam for physiotherapists and personal trainers')}
            </span>
            <h1 className="mt-6 text-[34px] font-bold leading-[1.08] [overflow-wrap:anywhere] sm:text-[42px] tracking-[-0.02em] sm:text-[56px]">
              {t('Oefentherapie die je patiënt', 'Exercise therapy your patients')} <span className="text-accent">{t('écht volhoudt', 'actually stick with')}</span>.
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-600">
              {t('Jij stelt in een paar minuten het programma samen. Je patiënt traint thuis met een heldere app, met krachtschema’s, voeding en hartslag. Jij ziet direct hoe het gaat, inclusief pijn en zwaarte. En voor de lol: een eigen held in een 3D-dorp, met jouw praktijk erin.', 'You build the programme in minutes. Your patient trains at home with a clear app, with strength plans, nutrition and heart rate. You see straight away how it’s going, including pain and difficulty. And for fun: their own hero in a 3D village, with your practice in it.')}
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
            [Smartphone, t('Eenvoudig voor elke patiënt', 'Simple for every patient'), t('De app opent op Vandaag: wat er te doen is, grote knoppen, video of beschrijving en één ding tegelijk.', 'The app opens on Today: what to do, large buttons, video or description and one thing at a time.')],
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

      {/* For whom */}
      <section className="mx-auto max-w-6xl px-5 pt-24">
        <div className="max-w-2xl">
          <span className="text-[13px] font-semibold uppercase tracking-wider text-accent">{t('Voor wie', 'Who it’s for')}</span>
          <h2 className="mt-2 text-[32px] font-bold leading-tight tracking-tight">{t('Fysio, personal trainer of zelf aan de slag', 'Physio, personal trainer or on your own')}</h2>
          <p className="mt-3 text-[16px] text-ink-500">{t('Bij je account kies je wat je bent. De app past zich daarop aan: de woorden, de schermen en wat er wel en niet in zit.', 'With your account you choose what you are. The app adapts to it: the words, the screens and what is and isn’t in it.')}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            [Stethoscope, t('Fysiotherapeut', 'Physiotherapist'), t('Alles erin: revalidatieprogramma’s met fases en criteria, pijnregistratie en signalen bij waarschuwingstekens. Je werkt met patiënten.', 'Everything in: rehab programmes with phases and criteria, pain logging and alerts on warning signs. You work with patients.')],
            [Dumbbell, t('Personal trainer', 'Personal trainer'), t('Dezelfde tools voor kracht en mobiliteit, zonder het medische deel. Je werkt met klanten en ziet hun schema’s, gewichten en voortgang.', 'The same tools for strength and mobility, without the medical part. You work with clients and see their plans, weights and progress.')],
            [User, t('Voor jezelf', 'For yourself'), t('Zelf trainen zonder begeleider: krachtschema’s, mobiliteit, voeding en je eigen held. Geen medische adviezen.', 'Train on your own without a coach: strength plans, mobility, nutrition and your own hero. No medical advice.')],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Timer;
            return (
              <div key={title as string} className="rounded-2xl border border-line bg-white p-7 shadow-card">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent"><I className="h-5 w-5" /></span>
                <h3 className="mt-4 text-[18px] font-bold">{title as string}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-500">{text as string}</p>
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
      </section>

      {/* The village: an extra, for fun */}
      <section className="mx-auto max-w-6xl px-5 pt-16">
        <div className="overflow-hidden rounded-3xl border border-line bg-ink-950 text-white">
          <div className="grid gap-px bg-white/10 lg:grid-cols-2">
            <figure className="bg-ink-950">
              <img src="/marketing/practice.webp" alt={t('De held van de patiënt in de oefenzaal van de praktijk, naast de fysiotherapeut', 'The patient’s hero in the practice’s exercise room, next to the physiotherapist')} loading="lazy" width={844} height={390} className="w-full" />
              <figcaption className="px-5 py-3 text-[13px] text-ink-300">{t('In de oefenzaal van de praktijk, bij de tv met de oefeningen van vandaag', 'In the practice’s exercise room, by the TV with today’s exercises')}</figcaption>
            </figure>
            <figure className="bg-ink-950">
              <img src="/marketing/village.webp" alt={t('Het 3D-dorp rond de praktijk', 'The 3D village around the practice')} loading="lazy" width={844} height={390} className="w-full" />
              <figcaption className="px-5 py-3 text-[13px] text-ink-300">{t('Het dorp rond de praktijk', 'The village around the practice')}</figcaption>
            </figure>
          </div>
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-2">
            <div>
              <span className="text-[13px] font-semibold uppercase tracking-wider text-[#d9e021]">{t('Een extraatje, voor de lol', 'An extra, for fun')}</span>
              <h2 className="mt-2 text-[26px] font-bold leading-tight text-white">{t('Waarom een dorp?', 'Why a village?')}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-300">{t('Revalideren duurt vaak maanden, en dezelfde oefeningen worden een keer saai. Het dorp is een knipoog om het leuk te houden: je patiënt loopt als eigen held rond, hakt bomen, plukt besjes, verslaat een monster en bouwt zijn huis uit. Wie getraind heeft, is sterker in het spel.', 'Rehab often takes months, and the same exercises get dull at some point. The village is a wink to keep it fun: your patient walks around as their own hero, chops trees, picks berries, beats a monster and upgrades their home. Training makes the hero stronger in the game.')}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-300">{t('Het blijft een extraatje. De app opent op de oefeningen van vandaag, en wie niet wil spelen, mist niets.', 'It stays an extra. The app opens on today’s exercises, and anyone who doesn’t want to play misses nothing.')}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-[18px] font-bold text-white">{t('Jouw eigen praktijk in het spel', 'Your own practice in the game')}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-300">{t('Scan je eigen praktijkruimte in met je telefoon, of stuur een paar foto’s. Wij bouwen hem na in het dorp: met jouw rek, jouw banken en jouw tv. Je patiënt herkent de ruimte waar hij bij jou traint, en de oefeningen van vandaag staan daar op de tv.', 'Scan your own practice room with your phone, or send a few photos. We rebuild it in the village: with your rack, your benches and your TV. Your patient recognises the room where they train with you, and today’s exercises are on the TV there.')}</p>
              <Link to="/contact?onderwerp=demo" className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-[15px] font-medium text-ink-950 hover:bg-ink-100">{t('Vraag ernaar in de demo', 'Ask about it in the demo')}<ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
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
            [t('Voor patiënten', 'For patients'), [t('Altijd weten wat en hoe — met video of beschrijving', 'Always know what and how — with video or description'), t('Voor de lol: een eigen held in een dorp met jouw praktijk erin', 'For fun: their own hero in a village with your practice in it'), t('Krachtschema dat past bij je doel en agenda', 'A strength plan that fits your goal and schedule'), t('Voeding bijhouden in gewone taal, met recepten en boodschappenlijst', 'Track food in plain words, with recipes and a shopping list'), t('Hartslag live tijdens het trainen', 'Live heart rate while training'), t('Laat makkelijk weten hoe het ging', 'Easily share how it went')]],
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
