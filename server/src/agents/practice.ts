/**
 * Practice profile for the WhatsApp/phone assistant. Source: functionalperformance.nl (fetched 7 Nov 2026).
 * The assistant answers ONLY from this information, so keep it in sync with the website
 * (rates, services, booking links). Bookings happen in Flux; the assistant never books itself.
 */
export interface PracticeProfile {
  name: string;
  description: string;
  timezone: string;
  language: string;
  tone: string;
  phone: string;
  website: string;
  locations: { name: string; address: string; notes?: string }[];
  bookingLinks: { label: string; url: string }[];
  openingHours: string;
  services: { name: string; minutes: number; price: string; description?: string }[];
  faq: { q: string; a: string }[];
  policies: string[];
  extraInstructions: string;
}

export const practice: PracticeProfile = {
  "name": "Functional Performance",
  "description": "Fysiotherapiepraktijk in Rotterdam met twee locaties en een eigen gym voor actieve revalidatie. Voor klachten aan nek, schouder, rug, knie en heup, voor sporters die terug willen naar hun niveau, en voor revalidatie na een operatie. Specialisatie: sportgerelateerde fysiotherapie, ACL/knie-revalidatie, kracht- en performance-revalidatie, overbelasting en return-to-sport, ook voor kracht- en vechtsporters (kickboksen, kyokushin karate, MMA). Ook mensen met langdurige of complexe pijnklachten zijn welkom. Klein, vast team: je houdt zoveel mogelijk dezelfde behandelaar. BIG-geregistreerd, KNGF-aangesloten.",
  "timezone": "Europe/Amsterdam",
  "language": "Nederlands (Engels als de klant Engels schrijft of spreekt)",
  "tone": "warm, persoonlijk, eerlijk en to-the-point; spreek klanten aan met 'je', net als op de website",
  "phone": "+31 6 81 70 08 29",
  "website": "https://functionalperformance.nl",
  "locations": [
    {
      "name": "Rotterdam Noord & Blijdorp",
      "address": "Noorderhavenkade 158C, 3038 XV Rotterdam (op de grens van Bergpolder en Blijdorp)",
      "notes": "Rustige praktijk met eigen revalidatiegym. Betaald parkeren in de omgeving. Hier vinden ook de massages plaats."
    },
    {
      "name": "Rotterdam Centrum (Wijnhaven)",
      "address": "Wijnhaven 66, 3011 WT Rotterdam (vlak bij Blaak)",
      "notes": "Afspraken vroeg in de ochtend, tussen de middag en na werktijd. Betaald parkeren en parkeergarages in de buurt."
    }
  ],
  "bookingLinks": [
    {
      "label": "Nieuwe klacht: intake + onderzoek (60 min), locatie naar keuze",
      "url": "https://flux.healthcare/schedule/functional-performance/flex?appointment_type=nieuwe-klachtonderzoek-behandeling"
    },
    {
      "label": "Nieuwe klacht: intake op locatie Rotterdam Noord & Blijdorp",
      "url": "https://flux.healthcare/schedule/functional-performance/flex?appointment_type=nieuwe-klachtonderzoek-behandeling&location=9ca9fc8d-157a-4930-8881-baf27a7dfa91"
    },
    {
      "label": "Nieuwe klacht: intake op locatie Rotterdam Centrum (Wijnhaven)",
      "url": "https://flux.healthcare/schedule/functional-performance/flex?appointment_type=nieuwe-klachtonderzoek-behandeling&location=9ca9fc8d-17a1-4576-bfac-e92a0ffe47f1"
    },
    {
      "label": "Vervolgafspraak (al onder behandeling)",
      "url": "https://flux.healthcare/schedule/functional-performance/flex?appointment_type=vervolgafspraak"
    },
    {
      "label": "Sportmassage (60 min, Rotterdam Noord)",
      "url": "https://flux.healthcare/schedule/functional-performance/flex?appointment_type=sportmassage&location=9ca9fc8d-157a-4930-8881-baf27a7dfa91&user_label=a144f4ae-67aa-4acd-808e-3e6915444e8c&user=a12be61a-7000-4631-9060-3a300afca965"
    },
    {
      "label": "Ontspanningsmassage, optioneel met cupping (60 min, Rotterdam Noord)",
      "url": "https://flux.healthcare/schedule/functional-performance/flex?appointment_type=ontspanningsmassage&location=9ca9fc8d-157a-4930-8881-baf27a7dfa91&user_label=a144f4ae-67aa-4acd-808e-3e6915444e8c&user=a12be61a-7000-4631-9060-3a300afca965"
    },
    {
      "label": "Deep tissue / triggerpoint massage (60 min, Rotterdam Noord)",
      "url": "https://flux.healthcare/schedule/functional-performance/flex?appointment_type=deep-tissue-triggerpoint-massage&location=9ca9fc8d-157a-4930-8881-baf27a7dfa91&user_label=a144f4ae-67aa-4acd-808e-3e6915444e8c&user=a12be61a-7000-4631-9060-3a300afca965"
    },
    {
      "label": "Personal training (geen fysiotherapie, niet vergoed)",
      "url": "https://flux.healthcare/schedule/functional-performance/flex?user_label=a2082030-ec98-48a3-8b39-96fde2628b5a&appointment_type=personal-training-geen-fysiotherapie-niet-vergoed"
    },
    {
      "label": "Intake leefstijlcoaching",
      "url": "https://flux.healthcare/schedule/functional-performance/flex?appointment_type=intake-leeftstijlcoaching&user_label=a29c27cd-f0df-46e8-9801-ad57e318f077&user=a29a0dd9-526f-4fc8-b6b8-0c0a0408ebd0"
    }
  ],
  "openingHours": "Doordeweeks geopend, in het weekend gesloten. Afspraken worden ingepland op een tijd die past, ook vroeg in de ochtend, tussen de middag en na werktijd (vooral op locatie Centrum). Vaak een eerste afspraak binnen 24 uur. Exacte tijden staan niet op de website: noem geen tijden, verwijs naar de online planner of een terugbelverzoek.",
  "services": [
    {
      "name": "Intake en onderzoek fysiotherapie",
      "minutes": 60,
      "price": "€ 60 zonder (aanvullende) verzekering",
      "description": "Eerste afspraak: gesprek, onderzoek en samen een plan. Geen verwijzing nodig."
    },
    {
      "name": "Fysiotherapie behandeling",
      "minutes": 25,
      "price": "€ 49 zonder (aanvullende) verzekering (tarief 2026)",
      "description": "Hands-on therapie, oefentherapie en actieve revalidatie in de eigen gym. Meestal 4 tot 8 sessies."
    },
    {
      "name": "Dry needling",
      "minutes": 25,
      "price": "geen extra kosten; valt binnen een reguliere fysiotherapiebehandeling",
      "description": "Alleen binnen een fysiotherapietraject, niet als losse behandeling. Specialisatie van Chelsea: vermeld bij aanmelding dat je bij haar wilt."
    },
    {
      "name": "Fysiotherapie aan huis",
      "minutes": 25,
      "price": "behandeltarief + € 15 toeslag per bezoek; toeslag vervalt met een indicatie aan huis op je verwijzing",
      "description": "In Rotterdam Noord, Blijdorp, Bergpolder, Provenierswijk, Oude Noorden, centrum, Kralingen en direct aangrenzende wijken. Net daarbuiten: even bellen, soms kan het toch."
    },
    {
      "name": "Sportmassage",
      "minutes": 60,
      "price": "€ 75 (niet vergoed; pinnen na afloop)",
      "description": "Diepe weefseltechnieken voor spierherstel, minder spierpijn en blessurepreventie."
    },
    {
      "name": "Ontspanningsmassage",
      "minutes": 60,
      "price": "€ 75 (niet vergoed); cupping op verzoek zonder meerprijs",
      "description": "Rustgevend, voor spanning in nek, schouders en rug."
    },
    {
      "name": "Deep tissue / triggerpoint massage",
      "minutes": 60,
      "price": "€ 75 (niet vergoed)",
      "description": "Gerichte druk op hardnekkige spierknopen."
    },
    {
      "name": "Massage rittenkaart 5 ritten",
      "minutes": 60,
      "price": "€ 350 (5 x 60 min naar keuze)"
    },
    {
      "name": "Massage rittenkaart 10 ritten (Athlete Recovery)",
      "minutes": 60,
      "price": "€ 675 (10 x 60 min naar keuze)"
    },
    {
      "name": "Personal training, losse sessie",
      "minutes": 60,
      "price": "€ 90 per uur (niet vergoed; vaak via vitaliteitsbudget werkgever, zakelijke factuur mogelijk)",
      "description": "Physio-led strength & conditioning, 1-op-1 in de eigen studio. Inclusief korte intake."
    },
    {
      "name": "Personal training traject 24 sessies",
      "minutes": 60,
      "price": "€ 1.990 (3 maanden, 2x per week, incl. 1 sportmassage)"
    },
    {
      "name": "Leefstijlcoaching intake",
      "minutes": 60,
      "price": "€ 75 (niet vergoed)",
      "description": "Voeding, slaap, stress, beweging en gewoontes. Geen abonnement."
    },
    {
      "name": "Leefstijlcoaching vervolgconsult",
      "minutes": 45,
      "price": "€ 60 (niet vergoed)"
    },
    {
      "name": "Rapportage bij letselschade",
      "minutes": 0,
      "price": "€ 95"
    }
  ],
  "faq": [
    {
      "q": "Heb ik een verwijzing van de huisarts nodig?",
      "a": "Nee, fysiotherapie is direct toegankelijk (DTF). Je kunt zelf bellen of online plannen."
    },
    {
      "q": "Wordt het vergoed?",
      "a": "Er zijn contracten met alle grote zorgverzekeraars (Achmea, VGZ, CZ, Menzis, a.s.r., ONVZ, DSW, Zorg en Zekerheid, Salland, EUCARE en hun labels). Met een aanvullende verzekering wordt fysiotherapie vaak volledig vergoed en declareert de praktijk rechtstreeks, je krijgt dan geen factuur. Check in de app van je verzekeraar hoeveel behandelingen je nog hebt. Chronische indicatie: vergoeding vanuit de basisverzekering vanaf de 21e behandeling. Massage, personal training en leefstijlcoaching worden niet vergoed."
    },
    {
      "q": "Hoe lang duurt een behandeling?",
      "a": "Een reguliere zitting duurt 25 minuten. De eerste afspraak (intake + onderzoek) duurt 60 minuten."
    },
    {
      "q": "Hoeveel behandelingen heb ik nodig?",
      "a": "Dat hangt af van je klacht en doelen; na de intake krijg je een eerlijk advies, meestal 4 tot 8 sessies."
    },
    {
      "q": "Hoe snel kan ik terecht?",
      "a": "Vaak binnen 24 uur. Bij urgente klachten doen we ons best je dezelfde dag te zien."
    },
    {
      "q": "Wat neem ik mee naar de eerste afspraak?",
      "a": "Je verzekeringspas, een ID-bewijs en (indien aanwezig) een verwijsbrief of eerdere onderzoeksgegevens. Trek makkelijk zittende kleding aan."
    },
    {
      "q": "Wie zijn de fysiotherapeuten?",
      "a": "Dinish Everitz (praktijkeigenaar; sportgerelateerde fysiotherapie, performance, revalidatie, ruim 25 jaar vechtsportervaring), Chelsea Kerklaan Diaz Lopez (topsportachtergrond in karate en volleybal; return-to-sport, mentale weerbaarheid, dry needling) en Syabend Oruc (karate, krachttraining, massagetherapie; volgt een master sportfysiotherapie en manuele therapie). Het team werkt op beide locaties."
    },
    {
      "q": "Kan ik in mijn lunchpauze terecht?",
      "a": "Ja, op locatie Centrum (Wijnhaven) zijn afspraken vroeg in de ochtend, tussen de middag en na werktijd mogelijk."
    }
  ],
  "policies": [
    "Niet nagekomen afspraak: € 40,00.",
    "Massage: betalen per pin direct na de behandeling in de praktijk.",
    "Personal training en leefstijlcoaching vallen buiten de zorgverzekering; een zakelijke factuur (bijv. vitaliteitsbudget) is mogelijk.",
    "Contact: bellen, WhatsApp of het contactformulier; reactie binnen een werkdag. Nieuwe patiënten worden dezelfde dag teruggebeld om een afspraak te plannen."
  ],
  "extraInstructions": "## Medische veiligheid\n- Je bent geen fysiotherapeut. Stel geen diagnose en geef geen behandel- of oefenadvies voor iemands klacht;\n  luister kort, toon begrip en verwijs naar een intake.\n- Alarmsignalen (bijv. pijn op de borst, benauwdheid, plotselinge krachtsvermindering of gevoelloosheid,\n  problemen met plassen of ontlasting of een doof gevoel in het zitvlak bij rugpijn, hoge koorts met pijn,\n  een ongeval met mogelijk een breuk): adviseer direct contact met de huisarts of huisartsenpost,\n  en bij levensgevaar 112. Maak daar geen afspraak voor.\n- Vraag niet naar uitgebreide medische details via WhatsApp; een korte omschrijving van de klacht is genoeg.\n## Afspraken\n- Stuur bij een nieuwe klacht de intake-link (vraag eventueel welke locatie de voorkeur heeft) en bied aan\n  dat de praktijk terugbelt. Wie al onder behandeling is, krijgt de link voor een vervolgafspraak.\n- Afspraak verzetten of annuleren kan de agent niet zelf: zet een terugbelverzoek klaar.\n- Voor personal training noem je alleen de prijzen hierboven; voor pakketten van 5 of 10 sessies verwijs je naar de website of de intake."
};
