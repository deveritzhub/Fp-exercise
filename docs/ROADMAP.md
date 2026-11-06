# Roadmap — binnenkort

Ideeën die zijn goedgekeurd voor later. Volgorde = voorstel; niets hiervan is al gebouwd.

| # | Idee | Wat het doet | Afhankelijk van |
|---|------|--------------|-----------------|
| 3 | ✅ **Fase voltooid = boss-level** (gebouwd, nov 2026: feestscherm met nieuwe fase, doel en medaille) | Feestscherm als de therapeut de volgende fase vrijgeeft: "Hoofdstuk 1 voltooid", de nieuwe route en het nieuwe doel; medaille in de uitrusting. | — |
| 6 | ✅ **Vroege waarschuwing** (gebouwd, nov 2026: pijnplek, en pijn na de training) | Automatisch signaal op het dashboard bij twee weken stijgende pijn (≥ 2 punten) op dezelfde plek, of dalende therapietrouw. Gebruikt de pijntrend per plek en de dagchecks. | — |
| 7 | ✅ **Coachbericht bij programmawijziging** (gebouwd, nov 2026) | Korte boodschap van de therapeut bij een aanpassing ("Goed bezig, we gaan zwaarder!"), in de patiëntapp als bericht van je coach. | — |
| 8 | **Eigen oefenvideo's** | Met de telefoon filmen en uploaden (zie `docs/FILMCHECKLIST.md`); alle oefeningen krijgen een echte video. | Render Starter + Disk |
| 9 | **Leaderboard in de praktijk (opt-in)** | Anoniem, alleen voor wie meedoet: bijvoorbeeld meeste volle weken deze maand. Standaard uit (privacy). Vriendenranglijst is er al (zie hieronder). | Toestemming per patiënt |
| 10 | **Google Play-app** | Publicatie van de Android-app (staat klaar, zie `docs/ANDROID.md`). | Play-account, eigen domein |

Eerder genoemd en ook nog open:
- iPhone-app (App Store): eerst via "Zet op beginscherm"; native app vraagt Apple Developer-account en een Mac/buildservice.
- Weekquests die de therapeut zelf instelt (nu automatisch).

## Ecosysteem — volgende stappen na vriendenlijsten

Vriendenlijsten zijn gebouwd (opt-in, vriendcode + accepteren, ranglijst op totaal level, skills per vriend; geen pijn- of programmagegevens). Ideeën om hierop voort te bouwen:
- **Duo-quest**: twee vrienden doen samen een weekquest (bijv. allebei 3 trainingen) voor een gedeelde kist.
- **Aanmoedigen**: een vooraf gekozen duim/bericht ("Zet 'm op!") sturen; geen vrije tekst, dus geen moderatie nodig.
- **Seizoenen**: maandelijkse uitdaging met eigen uitrusting die je alleen die maand kunt verdienen.
- **Praktijk-teams**: praktijken die meedoen vormen een team; ranglijst op volle weken, anoniem en opt-in.
- **Wearables / Apple Health / Google Fit**: stappen en hartslag als extra XP voor Conditie (vraagt aparte toestemming en verwerkersafspraak).
