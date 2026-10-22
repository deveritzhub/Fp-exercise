import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, BookOpen, Check, CheckCircle2, ClipboardList, FileWarning, Layers, Lock, MessageSquareText, Search, Send, Smartphone, Star, Users } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { errorMessage, useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Badge, Button, ButtonLink, Checkbox, Input, Notice, Select, Segmented, Textarea } from '@/components/ui';

function Hero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <section className="border-b border-line bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="text-[13px] font-semibold uppercase tracking-wider text-accent">{eyebrow}</div>
        <h1 className="mt-3 max-w-3xl text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[44px]">{title}</h1>
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-600">{intro}</p>
      </div>
    </section>
  );
}

export function FeaturesPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Functies', 'Features'), t('Oefenbibliotheek, programmabouwer, patiëntapp en voortgangsmonitoring voor fysiotherapeuten.', 'Exercise library, programme builder, patient app and progress monitoring for physiotherapists.'));
  const blocks: [typeof BookOpen, string, string, string[]][] = [
    [BookOpen, t('Oefenbibliotheek', 'Exercise library'), t('Een centrale bibliotheek met oefeningen in het Nederlands en Engels, aangevuld met de eigen oefeningen en video’s van je praktijk.', 'A central library of exercises in Dutch and English, extended with your practice’s own exercises and videos.'), [t('Zoeken op naam, spier, regio, materiaal en categorie', 'Search by name, muscle, region, equipment and category'), t('Regressies, progressies en alternatieven', 'Regressions, progressions and alternatives'), t('Klinische notities alleen zichtbaar voor therapeuten', 'Clinical notes only visible to therapists'), t('Favorieten voor snelle toegang', 'Favourites for quick access')]],
    [Layers, t('Programmabouwer', 'Programme builder'), t('Van lege pagina of sjabloon naar een persoonlijk programma in een paar minuten.', 'From blank page or template to a personal programme in minutes.'), [t('Slepen of met toetsenbord herschikken', 'Reorder by drag or keyboard'), t('Sets, herhalingen, tempo, belasting, vasthouden, rust en frequentie', 'Sets, reps, tempo, load, hold, rest and frequency'), t('Trainingsdagen per oefening, start- en einddatum', 'Training days per exercise, start and end date'), t('Versiegeschiedenis, dupliceren en praktijksjablonen', 'Version history, duplication and practice templates')]],
    [Smartphone, t('Patiëntapp', 'Patient app'), t('Een progressive web app die werkt op elke smartphone, zonder installatie uit een app store.', 'A progressive web app that works on any smartphone, no app store installation needed.'), [t('Vandaag-overzicht met één startknop', 'Today view with one start button'), t('Video, instructies, set-teller en rusttimer', 'Video, instructions, set counter and rest timer'), t('Zwaarte, pijn en opmerkingen registreren', 'Log difficulty, pain and comments'), t('Grote, toegankelijke bediening', 'Large, accessible controls')]],
    [BarChart3, t('Voortgang & feedback', 'Progress & feedback'), t('Zie per patiënt en per oefening hoe het programma wordt uitgevoerd.', 'See per patient and per exercise how the programme is carried out.'), [t('Therapietrouw per week', 'Weekly adherence'), t('Pijn- en zwaartetrends per sessie', 'Pain and difficulty trends per session'), t('Lijst “vraagt aandacht” op je dashboard', '“Needs attention” list on your dashboard'), t('Feedback markeren als gezien', 'Mark feedback as seen')]],
  ];
  return (
    <>
      <Hero eyebrow={t('Functies', 'Features')} title={t('Van voorschrijven tot bijsturen, in één rustige omgeving', 'From prescribing to adjusting, in one calm environment')} intro={t('FP Exercise ondersteunt de fysiotherapeut — het systeem stelt geen diagnoses en schrijft niets automatisch voor. Jij houdt de klinische regie.', 'FP Exercise supports the physiotherapist — it does not diagnose or prescribe automatically. You stay in clinical control.')} />
      <section className="mx-auto max-w-6xl space-y-6 px-5 py-20">
        {blocks.map(([Icon, title, text, points]) => (
          <div key={title} className="grid gap-8 rounded-2xl border border-line p-8 shadow-card lg:grid-cols-2">
            <div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon className="h-5 w-5" /></span>
              <h2 className="mt-4 text-[24px] font-semibold">{title}</h2>
              <p className="mt-2 text-[15.5px] leading-relaxed text-ink-600">{text}</p>
            </div>
            <ul className="space-y-3 self-center">
              {points.map((p) => <li key={p} className="flex gap-3 text-[15px] text-ink-700"><Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />{p}</li>)}
            </ul>
          </div>
        ))}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-line p-8"><Users className="h-5 w-5 text-accent" /><h3 className="mt-3 text-lg font-semibold">{t('Meerdere praktijken, strikt gescheiden', 'Multiple practices, strictly separated')}</h3><p className="mt-1.5 text-[15px] text-ink-600">{t('Elke praktijk heeft eigen therapeuten, patiënten, oefeningen, sjablonen en instellingen. Afscherming gebeurt op database-niveau.', 'Each practice has its own therapists, patients, exercises, templates and settings. Isolation is enforced at database level.')}</p></div>
          <div className="rounded-2xl border border-line p-8"><Lock className="h-5 w-5 text-accent" /><h3 className="mt-3 text-lg font-semibold">{t('Gebouwd met privacy by design', 'Built with privacy by design')}</h3><p className="mt-1.5 text-[15px] text-ink-600">{t('Minimale gegevens, rolgebaseerde toegang, audit logging en export van patiëntgegevens. Geen tracking-cookies.', 'Minimal data, role-based access, audit logging and patient data export. No tracking cookies.')}</p></div>
        </div>
      </section>
    </>
  );
}

export function HowItWorksPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Hoe het werkt', 'How it works'), t('Zo werkt FP Exercise voor fysiotherapeuten en patiënten.', 'How FP Exercise works for physiotherapists and patients.'));
  const steps = (list: [typeof Search, string, string][]) => (
    <ol className="space-y-4">
      {list.map(([Icon, title, text], i) => (
        <li key={title} className="flex gap-4 rounded-2xl border border-line bg-white p-5 shadow-card">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-[14px] font-semibold text-white">{i + 1}</span>
          <div>
            <h3 className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-accent" />{title}</h3>
            <p className="mt-1 text-[15px] text-ink-600">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <Hero eyebrow={t('Hoe het werkt', 'How it works')} title={t('Drie minuten in de spreekkamer, weken resultaat thuis', 'Three minutes in the treatment room, weeks of results at home')} intro={t('Zo ziet een gemiddelde dag eruit voor de fysiotherapeut en de patiënt.', 'This is what an average day looks like for the physiotherapist and the patient.')} />
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-2">
        <div>
          <h2 className="mb-6 text-[24px] font-semibold">{t('Fysiotherapeut', 'Physiotherapist')}</h2>
          {steps([
            [Users, t('Patiënt toevoegen', 'Add patient'), t('Alleen naam en e-mailadres. De patiënt krijgt een veilige uitnodigingslink.', 'Just a name and email address. The patient receives a secure invitation link.')],
            [Search, t('Oefeningen kiezen', 'Choose exercises'), t('Zoek in de bibliotheek of start vanuit een sjabloon of favoriet.', 'Search the library or start from a template or favourite.')],
            [ClipboardList, t('Doseren en toewijzen', 'Dose and assign'), t('Stel sets, herhalingen, rust en trainingsdagen in, voeg een persoonlijke notitie toe en wijs toe.', 'Set sets, reps, rest and training days, add a personal note and assign.')],
            [BarChart3, t('Volgen en bijsturen', 'Monitor and adjust'), t('Bekijk therapietrouw en feedback, en pas het programma aan. Elke wijziging krijgt een versie.', 'Review adherence and feedback, and adjust the programme. Every change gets a version.')],
          ])}
        </div>
        <div>
          <h2 className="mb-6 text-[24px] font-semibold">{t('Patiënt', 'Patient')}</h2>
          {steps([
            [Send, t('Account activeren', 'Activate account'), t('Via de link in de e-mail een wachtwoord kiezen — klaar.', 'Choose a password via the email link — done.')],
            [Smartphone, t('Vandaag openen', 'Open today'), t('Eén scherm met de oefeningen van vandaag en een grote startknop.', 'One screen with today’s exercises and a large start button.')],
            [CheckCircle2, t('Oefenen', 'Exercise'), t('Video en uitleg per oefening, sets aftikken, rusttimer loopt mee.', 'Video and explanation per exercise, tick off sets, rest timer runs along.')],
            [MessageSquareText, t('Laten weten hoe het ging', 'Share how it went'), t('Zwaarte en eventuele pijn invullen, met een optionele opmerking.', 'Enter difficulty and any pain, with an optional comment.')],
          ])}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <Notice tone="info" icon={<FileWarning className="h-4 w-4" />} title={t('Beoogd gebruik', 'Intended use')}>
          {t('FP Exercise is een hulpmiddel voor het delen en registreren van door een zorgprofessional voorgeschreven oefeningen. De software stelt geen diagnoses, geeft geen geautomatiseerd behandeladvies en vervangt niet het oordeel van de fysiotherapeut.', 'FP Exercise is a tool to share and log exercises prescribed by a healthcare professional. The software does not diagnose, does not give automated treatment advice and does not replace the physiotherapist’s judgement.')}
        </Notice>
      </section>
    </>
  );
}

type Plan = { code: string; name: string; priceMonthCents: number | null; priceYearCents: number | null; limits: Record<string, number>; features: string[] };

export function PricingPage() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Prijzen', 'Pricing'), t('Transparante prijzen voor solopraktijken en teams. 30 dagen gratis proberen.', 'Transparent pricing for solo practices and teams. 30-day free trial.'));
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const q = useQuery({ queryKey: ['plans'], queryFn: () => api.get<{ items: Plan[] }>('/public/plans') });
  const eur = (c: number) => new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(c / 100);
  return (
    <>
      <Hero eyebrow={t('Prijzen', 'Pricing')} title={t('Eenvoudige prijzen, zonder verrassingen', 'Simple pricing, no surprises')} intro={t('Alle prijzen exclusief btw. Start met 30 dagen gratis, zonder betaalgegevens.', 'All prices excl. VAT. Start with 30 days free, no payment details required.')} />
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-8 flex justify-center">
          <Segmented label={t('Facturatieperiode', 'Billing period')} value={period} onChange={setPeriod} options={[{ value: 'month', label: t('Maandelijks', 'Monthly') }, { value: 'year', label: t('Jaarlijks (2 maanden gratis)', 'Yearly (2 months free)') }]} />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {(q.data?.items ?? []).map((p) => {
            const featured = p.code === 'praktijk';
            const cents = period === 'month' ? p.priceMonthCents : p.priceYearCents;
            return (
              <div key={p.code} className={cn('relative flex flex-col rounded-2xl border bg-white p-7 shadow-card', featured ? 'border-accent ring-1 ring-accent' : 'border-line')}>
                {featured && <Badge tone="accent" className="absolute -top-2.5 left-7"><Star className="h-3 w-3 fill-current" />{t('Meest gekozen', 'Most popular')}</Badge>}
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <div className="mt-4 flex items-baseline gap-1">
                  {cents === null ? <span className="text-3xl font-semibold">{t('Op maat', 'Custom')}</span> : (
                    <>
                      <span className="text-4xl font-semibold tracking-tight">{eur(cents)}</span>
                      <span className="text-[14px] text-ink-500">/ {p.code === 'praktijk' ? t('therapeut', 'therapist') + ' / ' : ''}{period === 'month' ? t('maand', 'month') : t('jaar', 'year')}</span>
                    </>
                  )}
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {p.features.map((f) => <li key={f} className="flex gap-2.5 text-[14.5px] text-ink-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{f}</li>)}
                </ul>
                <ButtonLink to={`/contact?onderwerp=${p.code === 'organisatie' ? 'pricing' : 'demo'}`} variant={featured ? 'primary' : 'secondary'} size="lg" className="mt-7 w-full">
                  {p.priceMonthCents === null ? t('Neem contact op', 'Contact us') : t('Start proefperiode', 'Start free trial')}
                </ButtonLink>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-center text-[13px] text-ink-500">{t('Prijzen zijn indicatief en kunnen wijzigen vóór de officiële lancering. Online betalen is nog niet beschikbaar.', 'Prices are indicative and may change before the official launch. Online payment is not yet available.')}</p>
      </section>
    </>
  );
}

export function ContactPage() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Contact', 'Contact'), t('Plan een demo of stel je vraag over FP Exercise.', 'Book a demo or ask a question about FP Exercise.'));
  const [params] = useSearchParams();
  const [startedAt] = useState(() => Date.now());
  const [f, setF] = useState({ name: '', email: '', practice: '', message: '', topic: (params.get('onderwerp') as string) || 'demo', consent: false, website: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <Hero eyebrow="Contact" title={t('Laten we kennismaken', 'Let’s get acquainted')} intro={t('Plan een demo, vraag naar de mogelijkheden voor je praktijk of stel een vraag. We reageren binnen één werkdag.', 'Book a demo, ask about options for your practice or ask a question. We reply within one working day.')} />
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[1.3fr_1fr]">
        {state === 'done' ? (
          <Notice tone="ok" icon={<CheckCircle2 className="h-5 w-5" />} title={t('Bedankt voor je bericht!', 'Thanks for your message!')}>{t('We nemen zo snel mogelijk contact met je op.', 'We will get back to you as soon as possible.')}</Notice>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!f.consent) return setError(t('Geef toestemming om je bericht te kunnen verwerken.', 'Please give consent so we can process your message.'));
              setState('busy');
              setError(null);
              try {
                await api.post('/public/contact', { ...f, consent: true, startedAt });
                setState('done');
              } catch (err) {
                setError(errorMessage(err instanceof ApiError ? err.code : undefined, locale));
                setState('idle');
              }
            }}
          >
            {error && <Notice tone="bad">{error}</Notice>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('Naam', 'Name')} required value={f.name} onChange={set('name')} autoComplete="name" />
              <Input label={t('E-mailadres', 'Email')} type="email" required value={f.email} onChange={set('email')} autoComplete="email" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('Praktijk', 'Practice')} optional={t('optioneel', 'optional')} value={f.practice} onChange={set('practice')} autoComplete="organization" />
              <Select label={t('Onderwerp', 'Topic')} value={f.topic} onChange={set('topic')}>
                <option value="demo">{t('Demo aanvragen', 'Request a demo')}</option>
                <option value="pricing">{t('Prijzen & abonnementen', 'Pricing & plans')}</option>
                <option value="question">{t('Vraag', 'Question')}</option>
                <option value="other">{t('Anders', 'Other')}</option>
              </Select>
            </div>
            <Textarea label={t('Bericht', 'Message')} required rows={5} value={f.message} onChange={set('message')} hint={t('Deel geen patiëntgegevens via dit formulier.', 'Do not share patient information via this form.')} />
            {/* honeypot — hidden from humans and assistive tech */}
            <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
              <label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label>
            </div>
            <Checkbox checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} label={<>{t('Ik ga akkoord met de verwerking van mijn gegevens om op mijn bericht te reageren, zoals beschreven in de ', 'I agree to my data being processed to respond to my message, as described in the ')}<Link to="/privacy" className="link">{t('privacyverklaring', 'privacy notice')}</Link>.</>} />
            <Button type="submit" size="lg" loading={state === 'busy'}>{t('Verstuur bericht', 'Send message')}</Button>
          </form>
        )}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-line bg-canvas p-6">
            <h2 className="font-semibold">{t('Wat je kunt verwachten', 'What to expect')}</h2>
            <ul className="mt-3 space-y-2 text-[14.5px] text-ink-600">
              {[t('Demo van 30 minuten, online of in Rotterdam', '30-minute demo, online or in Rotterdam'), t('Advies over overstap en het opzetten van je bibliotheek', 'Advice on switching and setting up your library'), t('Antwoord op vragen over privacy en beveiliging', 'Answers to privacy and security questions')].map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{x}</li>)}
            </ul>
          </div>
        </aside>
      </section>
    </>
  );
}

function LegalDraft({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n();
  useDocumentMeta(title);
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <Notice tone="warn" icon={<FileWarning className="h-4 w-4" />} className="mb-8" title={t('Concept — juridische review vereist', 'Draft — legal review required')}>
        {t('Deze tekst is een conceptstructuur en moet vóór publicatie door een jurist/privacy-specialist worden beoordeeld en aangevuld.', 'This text is a draft structure and must be reviewed and completed by a lawyer/privacy specialist before publication.')}
      </Notice>
      <h1 className="text-[34px] font-semibold tracking-tight">{title}</h1>
      <div className="prose-legal mt-8 space-y-6 text-[15.5px] leading-relaxed text-ink-700 [&_h2]:mt-10 [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2]:text-ink-950 [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </div>
  );
}

export function PrivacyPage() {
  const { t } = useI18n();
  return (
    <LegalDraft title={t('Privacyverklaring', 'Privacy notice')}>
      <p>{t('[Concept] Deze privacyverklaring beschrijft hoe FP Exercise persoonsgegevens verwerkt.', '[Draft] This privacy notice describes how FP Exercise processes personal data.')}</p>
      <h2>{t('1. Rollen', '1. Roles')}</h2>
      <p>{t('De fysiotherapiepraktijk is verwerkingsverantwoordelijke voor patiëntgegevens. FP Exercise treedt op als verwerker op basis van een verwerkersovereenkomst. Voor de website en het contactformulier is FP Exercise zelf verwerkingsverantwoordelijke. [In te vullen: rechtspersoon, KvK, contactgegevens, FG indien van toepassing].', 'The physiotherapy practice is the controller for patient data. FP Exercise acts as processor under a data processing agreement. For the website and contact form, FP Exercise is itself the controller. [To complete: legal entity, chamber of commerce, contact details, DPO if applicable].')}</p>
      <h2>{t('2. Welke gegevens', '2. Which data')}</h2>
      <ul>
        <li>{t('Account: naam, e-mailadres, taalvoorkeur.', 'Account: name, email address, language preference.')}</li>
        <li>{t('Patiënt: naam, e-mailadres, optionele praktijkreferentie; voorgeschreven oefeningen; registraties (uitvoering, ervaren zwaarte, pijnscore, opmerkingen). Pijnscores zijn gezondheidsgegevens (bijzondere persoonsgegevens).', 'Patient: name, email address, optional practice reference; prescribed exercises; logs (completion, perceived difficulty, pain score, comments). Pain scores are health data (special category data).')}</li>
        <li>{t('Technisch: sessiecookie voor inloggen, beveiligingslogs zonder inhoud van medische gegevens.', 'Technical: session cookie for login, security logs without medical content.')}</li>
      </ul>
      <h2>{t('3. Doelen en grondslagen', '3. Purposes and legal bases')}</h2>
      <p>{t('[In te vullen na juridische toetsing, o.a. art. 6 en 9 AVG en de Wgbo.]', '[To complete after legal review, incl. Art. 6 and 9 GDPR and the Dutch Medical Treatment Contracts Act.]')}</p>
      <h2>{t('4. Bewaartermijnen', '4. Retention')}</h2>
      <p>{t('[In te vullen. Uitgangspunt: gegevens worden bewaard zolang de praktijk dat nodig heeft voor de behandeling en conform wettelijke bewaartermijnen, en daarna verwijderd of geanonimiseerd.]', '[To complete. Principle: data is kept as long as needed by the practice for treatment and in line with statutory retention periods, then deleted or anonymised.]')}</p>
      <h2>{t('5. Beveiliging en hosting', '5. Security and hosting')}</h2>
      <p>{t('Gegevens worden versleuteld verzonden en opgeslagen bij een hostingpartij binnen de EU/EER. Toegang is rolgebaseerd en wordt gelogd. [Details in te vullen na keuze productie-infrastructuur.]', 'Data is encrypted in transit and stored with a hosting provider in the EU/EEA. Access is role-based and logged. [Details to complete after choosing production infrastructure.]')}</p>
      <h2>{t('6. Je rechten', '6. Your rights')}</h2>
      <p>{t('Inzage, rectificatie, verwijdering, beperking, overdraagbaarheid en bezwaar. Patiënten richten verzoeken bij voorkeur aan hun eigen praktijk. [Contactgegevens en klachtrecht bij de Autoriteit Persoonsgegevens toevoegen.]', 'Access, rectification, erasure, restriction, portability and objection. Patients preferably address requests to their own practice. [Add contact details and the right to complain to the Dutch DPA.]')}</p>
    </LegalDraft>
  );
}

export function TermsPage() {
  const { t } = useI18n();
  return (
    <LegalDraft title={t('Algemene voorwaarden', 'Terms and conditions')}>
      <p>{t('[Concept] Structuur voor de gebruiksvoorwaarden voor praktijken.', '[Draft] Structure of the terms of use for practices.')}</p>
      <h2>{t('1. Definities', '1. Definitions')}</h2><p>[…]</p>
      <h2>{t('2. Dienst en beoogd gebruik', '2. Service and intended use')}</h2>
      <p>{t('FP Exercise is een hulpmiddel om door een zorgprofessional voorgeschreven oefeningen te delen en te registreren. De zorgprofessional blijft verantwoordelijk voor de klinische geschiktheid van elk programma, ook wanneer een sjabloon of bibliotheekoefening wordt gebruikt.', 'FP Exercise is a tool to share and log exercises prescribed by a healthcare professional. The professional remains responsible for the clinical appropriateness of every programme, including when using a template or library exercise.')}</p>
      <h2>{t('3. Abonnement, proefperiode en betaling', '3. Subscription, trial and payment')}</h2><p>[…]</p>
      <h2>{t('4. Verwerking van persoonsgegevens', '4. Processing of personal data')}</h2><p>{t('Zie verwerkersovereenkomst. […]', 'See data processing agreement. […]')}</p>
      <h2>{t('5. Beschikbaarheid en ondersteuning', '5. Availability and support')}</h2><p>[…]</p>
      <h2>{t('6. Aansprakelijkheid', '6. Liability')}</h2><p>[…]</p>
      <h2>{t('7. Beëindiging en dataportabiliteit', '7. Termination and data portability')}</h2><p>[…]</p>
    </LegalDraft>
  );
}

export function CookiesPage() {
  const { t } = useI18n();
  return (
    <LegalDraft title={t('Cookieverklaring', 'Cookie notice')}>
      <p>{t('[Concept] FP Exercise gebruikt alleen functionele cookies en lokale opslag die nodig zijn om de dienst te laten werken. Er worden geen tracking- of advertentiecookies geplaatst, en daarom tonen we geen cookiebanner.', '[Draft] FP Exercise only uses functional cookies and local storage needed to run the service. No tracking or advertising cookies are set, which is why we do not show a cookie banner.')}</p>
      <h2>{t('Overzicht', 'Overview')}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-[14px]">
          <thead className="text-left text-ink-500"><tr><th className="py-2 pr-4 font-medium">{t('Naam', 'Name')}</th><th className="py-2 pr-4 font-medium">{t('Doel', 'Purpose')}</th><th className="py-2 font-medium">{t('Bewaartermijn', 'Retention')}</th></tr></thead>
          <tbody className="divide-y divide-line">
            <tr><td className="py-2 pr-4 font-mono">fp_session</td><td className="py-2 pr-4">{t('Inlogsessie (httpOnly, functioneel)', 'Login session (httpOnly, functional)')}</td><td className="py-2">{t('12 uur', '12 hours')}</td></tr>
            <tr><td className="py-2 pr-4 font-mono">fp.locale</td><td className="py-2 pr-4">{t('Taalvoorkeur (lokale opslag)', 'Language preference (local storage)')}</td><td className="py-2">{t('Tot verwijderd', 'Until deleted')}</td></tr>
            <tr><td className="py-2 pr-4 font-mono">fp.practice</td><td className="py-2 pr-4">{t('Actieve praktijk (lokale opslag)', 'Active practice (local storage)')}</td><td className="py-2">{t('Tot verwijderd', 'Until deleted')}</td></tr>
          </tbody>
        </table>
      </div>
    </LegalDraft>
  );
}
