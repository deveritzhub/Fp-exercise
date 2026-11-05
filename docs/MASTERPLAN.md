# FP Flow masterplan (november 2026)

Doel: een app die familie en collega's zonder uitleg kunnen testen, en die fysiotherapeuten
echt helpt. Claude werkt dit plan stap voor stap af, test elke stap en zet hem direct live.
Alleen wat onder "Vraagt jouw beslissing" staat, wacht op de eigenaar.

Status: `[x]` klaar en live · `[ ]` nog te doen.

## Fase 1 – Betrouwbaar voor testers
1. [x] **Foutmeldingen uit de app zien.** Crasht een scherm bij een tester, dan komt er een
   korte melding in de serverlog (`[client-error]`, zonder gezondheidsgegevens). Nu zien we
   alleen fouten op de server.
2. [x] **Nette foutpagina's.** Een kapot scherm toont "Er ging iets mis" met "Opnieuw laden"
   in plaats van een wit scherm.
3. [x] **Stabiele testset.** De volledige set (123 testen) slaagt met de standaardinstelling
   (één worker, gedeelde testdatabase). Niet met `--workers=4` draaien en geen code wijzigen
   tijdens een run: dan falen testen die niets mis hebben.
4. [x] **Beveiligingstest voor de nieuwe tabellen.** Automatische controle dat een andere
   patiënt of een andere praktijk de mobiliteitsmetingen en quizantwoorden niet kan zien.

## Fase 2 – Patiënt: rustiger en slimmer
5. [x] **Vandaag rustiger.** Eén hoofdactie bovenaan; de rest compact eronder. Kaarten die
   vandaag niets te doen hebben, klappen in. (Dagkist alleen als hij open kan; logboek op Held
   ingeklapt; dagcheck zonder vooringevuld cijfer.)
6. [x] **Meting → advies.** Na een mobiliteitsmeting: "Je enkel is stijver dan je andere
   kant, dit programma helpt" (bestaande programma's, geen nieuwe medische claims).
7. [x] **Voortgang op één plek.** De pagina Voortgang toont ook mobiliteitsmetingen,
   krachtrecords en de quiz, niet alleen trainingen.
8. [x] **Quiz over sliders en tests.** Nieuwe level 2-vragen: welke slider hoort bij welke
   zenuw, wat meet de knie-tot-muur-test.

## Fase 3 – Fysiotherapeut
9. [x] **Overzicht per patiënt.** In het tabblad Overzicht: laatste mobiliteitsmeting en
   krachtrecords (alleen als de patiënt dat deelt).
10. [x] **Rapport.** Het voortgangsrapport (print/PDF) krijgt de mobiliteitsmetingen erbij.
11. [x] **Dashboard.** "Vraagt aandacht" ook bij een patiënt die al 3 weken niets deed.

## Fase 4 – Snelheid en onderhoud
12. [x] **Held-pagina sneller.** Uitgezocht: 42 kB gecomprimeerd, en de app laadt hem al vooraf
    en bewaart hem voor offline. Opsplitsen kost een grote verbouwing voor zo'n 0,1 s winst; niet gedaan.
13. [x] **Toegankelijkheid nieuwe schermen.** Toetsenbord en schermlezer nalopen op
    Mobiliteit meten, Prijzenkast en Dagcheck.
14. [x] **Opruimen.** Dubbele code en oude teksten weg, documentatie bij (`docs/MOBILITEIT_METEN.md`).

## Nog open (Claude)
15. [x] **Uitlogtest soms rood.** Oorzaak gevonden: als de inactiviteitstimer opnieuw startte
    (bijv. na het verversen van de sessie), telde dat als activiteit en begon de 30 minuten
    opnieuw. Een therapeut kon zo langer ingelogd blijven. Opgelost; test 3× in de reeks groen.
16. [x] **Meetherinnering op Vandaag.** Wie eerder mat en 14+ dagen niet meer, ziet op Vandaag
    "Tijd om je mobiliteit te meten · +20 XP".
17. [x] **Fysio vraagt om te meten.** Knop "Vraag om te meten" in het tabblad Mobiliteit; de
    patiënt krijgt een melding met een link naar de tests (ook als Mobiliteit niet gedeeld wordt).

## Fase 5 – Klaar voor testers
18. [x] **Eerste stappen op Vandaag.** Na het maken van de held: dagcheck, eerste training,
    quizvraag goed en mobiliteit meten, met vinkjes. Verdwijnt als alles af is, na een maand of
    met het kruisje.
19. [x] **Feedback vragen.** Na de derde training één keer: "Wat vind je ervan?" met de
    feedbackknop, zodat testers makkelijk iets laten weten.
20. [x] **Uitnodigen zonder e-mail.** De uitnodigingslink (app.fpflow.nl) makkelijk delen via
    WhatsApp of QR-code, zolang er nog geen echte e-mail is.

## Fase 6 – Klachtwijzer met ketens en compensaties (ontwerp: `docs/KLACHTWIJZER.md`)
21. [ ] **Data.** Regio's, klachten, ketens en compensaties (o.a. TFL-overuse bij zwakke gluteus
    medius), met tests die elke verwijzing naar spier, test en programma bewaken.
22. [ ] **Klachtwijzer voor de therapeut.** Regio → klacht → klachtkaart, met zoeken op synoniem.
23. [ ] **Compensatiekaarten en ketenschema**, ook te openen vanuit de atlas.
24. [ ] **Eén klik naar een programma** met de aangevinkte oefeningen.
25. [ ] **Vanuit het dossier**: Programma maken → op klacht.
26. [ ] **Patiënt: "Waarom deze oefening?"** in gewone taal.
27. [ ] **Atlas: ketens en "neemt vaak over van"** bij spieren.
28. [ ] **Klinische controle**: alle wijzerteksten op één pagina om af te tekenen.

## Vraagt jouw beslissing (Claude wacht hierop)
- Render Starter (betaald) en een vaste schijf voor video's (`STORAGE_DIR`).
- `DEMO_PASSWORD` instellen in Render (zelf doen, niet naar Claude sturen).
- [x] app.fpflow.nl werkt; `APP_ORIGIN=https://app.fpflow.nl` staat in Render (5 nov 2026).
- Echte e-mail (Zoho) in plaats van links op het scherm.
- Kling-video's voor bankdrukken, leg curl en voorwaartse uitvalspas (credits).
- Klinische controle van de nieuwe sliderteksten en de mobiliteitstests.
