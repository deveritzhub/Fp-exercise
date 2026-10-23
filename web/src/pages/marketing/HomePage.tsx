import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpen, Building2, Check, Layers, Lock, Smartphone, Sparkles, Timer } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { ButtonLink } from '@/components/ui';
import { ProductShot } from './ProductShot';

export function HomePage() {
  const { t } = useI18n();
  useDocumentMeta(
    t('FP Exercise — Oefentherapie op maat voor fysiotherapiepraktijken', 'FP Exercise — Tailored exercise therapy for physiotherapy practices'),
    t('Stel in een paar minuten een oefenprogramma samen, deel het via een eenvoudige patiëntapp en volg therapietrouw en feedback.', 'Build an exercise programme in minutes, share it through a simple patient app and follow adherence and feedback.'),
  );
  useEffect(() => {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'FP Exercise',
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
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-16 lg:grid-cols-[1fr_1.15fr] lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-[13px] font-medium text-ink-600 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> {t('Gemaakt in Rotterdam, voor de Nederlandse fysiotherapie', 'Made in Rotterdam for Dutch physiotherapy')}
            </span>
            <h1 className="mt-6 text-[42px] font-normal leading-[1.08] tracking-[-0.02em] sm:text-[56px]">
              {t('Oefentherapie die je patiënt', 'Exercise therapy your patients')} <span className="text-accent">{t('écht volhoudt', 'actually stick with')}</span>.
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-600">
              {t('Stel in een paar minuten een programma samen uit een doorzoekbare oefenbibliotheek, deel het via een rustige patiëntapp en zie direct hoe het gaat — inclusief pijn- en zwaarte-feedback.', 'Build a programme in minutes from a searchable exercise library, share it through a calm patient app and see straight away how it’s going — including pain and difficulty feedback.')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/contact?onderwerp=demo" size="lg" icon={<ArrowRight className="h-4 w-4" />} className="flex-row-reverse">{t('Plan een demo', 'Book a demo')}</ButtonLink>
              <ButtonLink to="/demo" size="lg" variant="secondary">{t('Probeer de interactieve demo', 'Try the interactive demo')}</ButtonLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-500">
              {[t('Geen installatie', 'No installation'), t('Werkt op elke smartphone', 'Works on any smartphone'), t('Nederlands & Engels', 'Dutch & English')].map((x) => (
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
            [Smartphone, t('Eenvoudig voor elke patiënt', 'Simple for every patient'), t('Grote knoppen, duidelijke instructies, video en één ding tegelijk.', 'Large buttons, clear instructions, video and one thing at a time.')],
            [BarChart3, t('Bijsturen op basis van data', 'Adjust based on data'), t('Therapietrouw, zwaarte en pijn per oefening in één overzicht.', 'Adherence, difficulty and pain per exercise in one overview.')],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Timer;
            return (
              <div key={title as string}>
                <I className="h-5 w-5 text-accent" />
                <h2 className="mt-3 text-[16px] font-semibold">{title as string}</h2>
                <p className="mt-1 text-[14.5px] leading-relaxed text-ink-500">{text as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="max-w-2xl">
          <h2 className="text-[32px] font-semibold leading-tight tracking-tight">{t('Alles wat je nodig hebt. Niets wat je afleidt.', 'Everything you need. Nothing that distracts.')}</h2>
          <p className="mt-3 text-[16px] text-ink-500">{t('Ontworpen rond de spreekkamer: snel tijdens het consult, rustig voor de patiënt thuis.', 'Designed around the treatment room: fast during the session, calm for the patient at home.')}</p>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {[
            [BookOpen, t('Oefenbibliotheek', 'Exercise library'), t('Zoek op naam, spier, regio, materiaal of categorie. Met regressies, progressies en je eigen oefeningen en video’s.', 'Search by name, muscle, region, equipment or category. With regressions, progressions and your own exercises and videos.')],
            [Layers, t('Programmabouwer', 'Programme builder'), t('Slepen, doseren, trainingsdagen kiezen en persoonlijke notities toevoegen. Versiegeschiedenis inbegrepen.', 'Drag, dose, choose training days and add personal notes. Version history included.')],
            [Smartphone, t('Patiëntapp', 'Patient app'), t('Video, instructies, set-teller en rusttimer. Registreer uitvoering, zwaarte en pijn in een paar tikken.', 'Video, instructions, set counter and rest timer. Log completion, difficulty and pain in a few taps.')],
            [BarChart3, t('Voortgang & signalen', 'Progress & signals'), t('Zie wie aandacht nodig heeft: hoge pijnscores, nieuwe feedback of lage therapietrouw.', 'See who needs attention: high pain scores, new feedback or low adherence.')],
            [Building2, t('Praktijkbeheer', 'Practice management'), t('Teamleden, rollen, gedeelde praktijksjablonen en eigen huisstijl.', 'Team members, roles, shared practice templates and your own branding.')],
            [Lock, t('Privacy by design', 'Privacy by design'), t('Strikte scheiding tussen praktijken, minimale gegevens en audit logging. Hosting in de EU.', 'Strict separation between practices, minimal data and audit logging. Hosted in the EU.')],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Timer;
            return (
              <div key={title as string} className="bg-white p-7">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><I className="h-[18px] w-[18px]" /></span>
                <h3 className="mt-4 text-[16px] font-semibold">{title as string}</h3>
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
            [t('Voor fysiotherapeuten', 'For physiotherapists'), [t('Minder tijd kwijt aan uitleg en papieren schema’s', 'Less time spent on explanations and paper sheets'), t('Bijsturen tussen consulten op basis van echte feedback', 'Adjust between sessions based on real feedback'), t('Eigen video’s en oefeningen voor je hele team', 'Your own videos and exercises for the whole team'), t('Sjablonen als startpunt — jij houdt de klinische regie', 'Templates as a starting point — you stay in clinical control')]],
            [t('Voor patiënten', 'For patients'), [t('Altijd weten wat en hoe — met video', 'Always know what and how — with video'), t('Eén oefening tegelijk, grote knoppen', 'One exercise at a time, large buttons'), t('Zie je eigen voortgang groeien', 'See your own progress grow'), t('Laat makkelijk weten hoe het ging', 'Easily share how it went')]],
          ].map(([title, points]) => (
            <div key={title as string} className="rounded-2xl border border-line bg-white p-8 shadow-card">
              <h2 className="text-[22px] font-semibold">{title as string}</h2>
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
            <h2 className="text-[30px] font-semibold leading-tight text-white">{t('Zie het in actie in je eigen praktijk', 'See it in action in your own practice')}</h2>
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
