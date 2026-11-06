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
21. [x] **Data.** Regio's, klachten, ketens en compensaties (o.a. TFL-overuse bij zwakke gluteus
    medius), met tests die elke verwijzing naar spier, test en programma bewaken.
22. [x] **Klachtwijzer voor de therapeut.** Regio → klacht → klachtkaart, met zoeken op synoniem.
23. [x] **Compensatiekaarten en ketenschema**, ook te openen vanuit de atlas.
24. [x] **Eén klik naar een programma** met de aangevinkte oefeningen.
25. [x] **Vanuit het dossier**: Programma maken → op klacht.
26. [x] **Patiënt: "Waarom deze oefening?"** in gewone taal.
27. [x] **Atlas: ketens en "neemt vaak over van"** bij spieren.
28. [x] **Klinische controle**: alle wijzerteksten op één pagina om af te tekenen.

## Fase 7 – Klachtwijzer slimmer
29. [x] **Van pijnkaart naar wijzer.** Bij de pijnkaart van de patiënt: per pijnlijke regio een
    knop naar de klachtwijzer, met de patiënt al gekoppeld.
30. [x] **Fase kiezen.** Prikkelbaar, opbouwen of terug naar sport: het voorstel verschuift
    (isometrie en ontlasten / kracht / springen en functioneel), met een doseringsrichtlijn.
31. [x] **Oefening → klachten.** Op de oefenpagina: bij welke klachten de oefening past en als wat
    (ontlasten, versterken, functioneel), meest relevante eerst. Atlasfout hersteld: "exorotator"
    koppelde heupoefeningen aan de schouder.

## Fase 8 – Bijsturen op wat patiënten melden
32. [x] **Testerssignalen.** Serverlog nagelopen op `[client-error]` en `[feedback]` (4–6 nov):
    nog geen meldingen. Opnieuw doen zodra testers actief zijn ("kijk naar de feedback").
33. [x] **Progressiesignaal.** Uit de eigen scores na de trainingen: 3× licht met weinig pijn →
    "Klaar voor zwaarder"; 2× erg zwaar → "Te zwaar?". Op het dashboard en in het dossier;
    een suggestie, nooit een automatische wijziging.
34. [x] **Sjabloon uit de klachtwijzer.** Het voorstel ook als praktijksjabloon kunnen opslaan.
35. [x] **Volledige regressietest** van alle schermen na fase 6–8: 122 geslaagd, 0 gefaald (6 nov).

## Fase 9 – De patiënt zelf laten bijsturen
36. [x] **Progressietip voor eigen programma's.** Bij een zelf gestart kracht- of
    mobiliteitsprogramma: 3× licht → "Dit gaat je makkelijk af, tijd voor een stapje meer";
    2× erg zwaar → "Doe minder of een lichtere variant". Revalidatie blijft bij de fysio.
    Bug opgelost: Kracht en Mobiliteit toonden nooit hun eigen afgeronde trainingen (de
    geschiedenis gaf het onderdeel niet mee).
37. [x] **Eigen verloop van zwaarte en pijn** op Voortgang (laatste 12 trainingen) met een zin in
    gewone taal: "Je pijn na het trainen daalt: van gemiddeld 4 naar 2".
38. [x] **Bestaand programma in de klachtwijzer.** Past een programma (sjabloon) van de praktijk
    bij de klacht, dan staat het bovenaan het voorstel met "Hiermee starten".
39. [x] **Reageren op een training.** Bij "Markeer als gezien" kan de fysio een korte reactie
    meesturen; de patiënt krijgt die als melding ("Reactie van je fysiotherapeut").
40. [x] **Uitleg voor de patiënt per klacht.** Eén printbare pagina in gewone taal: wat het is,
    hoe het lichaam samenwerkt, waarom deze oefeningen, waar je op let, pijn tijdens oefenen en
    wanneer je direct contact opneemt.
41. [x] **Reactie bewaard.** De reactie op een training wordt opgeslagen (migratie 034, alleen een
    kolom erbij): de fysio ziet "Jouw reactie" in het dossier, de patiënt ziet hem bij de training
    op Voortgang.
42. [x] **Berichten voor de patiënt.** Belletje in de kop (met stip bij iets nieuws) naar een
    overzicht van alles wat de praktijk stuurde: reacties, spierkaarten, meetverzoeken, nieuwe
    programma's. Ook: "zojuist" in plaats van "binnen een minuut" bij net verstuurde berichten.
43. [x] **Quiz over compensaties** (level 2): per patroon "Als je middelste bilspier zwak is,
    welke spier neemt dan vaak het werk over?", met uitleg. Rondleiding noemt het belletje.

## Fase 10 – Sneller vinden, geen gaten
44. [x] **Klacht zoeken met Ctrl+K.** "loperknie" of "muisarm" in de snelzoekbalk opent direct de
    klachtwijzer op die klacht. Bibliotheekgat gedicht: carpaletunnelklachten hadden geen
    versterkende oefening; nu duimoppositie met elastiekje en knijpen in een zacht balletje.
45. [x] **Geen vals "gat" bij heuppijn buitenkant.** Daar stond bij Ontlasten "nog geen passende
    oefening", terwijl rekken hier bewust vermeden wordt. Nu: "Bewust geen rek" met ontlastadvies
    voor het dagelijks leven.
46. [x] **Functioneel blok ook voor nek, schouder en bovenrug.** Dat bleef leeg (alleen been-
    bewegingen telden). Nu: opdrukken, roeien, drukken en dragen, nadat activatie gekozen heeft;
    in de prikkelbare fase niets boven het hoofd.
47. [x] **Hand en elleboog in het dagelijks leven.** Tennisarm en carpaletunnelklachten kregen geen
    functionele oefening; nu "Tas dragen met de handrug naar boven" en "Kleine voorwerpen oppakken
    met duim en vingertoppen". Elke klacht heeft nu in elk blok iets, behalve bewust geen rek bij
    heuppijn aan de buitenkant.
48. [x] **Regressietest na fase 10:** 128 geslaagd, 1 keer de uitlogtest rood (los 15× groen).
    Uitloggen robuuster gemaakt: elke stap maximaal 2 s, en na uiterlijk 5 s sta je altijd op het
    inlogscherm, ook als iets blijft hangen.
49. [x] **Uitleg naar de patiënt sturen.** In de klachtwijzer (vanuit een dossier) de knop "Stuur
    naar de patiënt": de patiënt krijgt een bericht en leest de uitleg in gewone taal in de app,
    met rode vlaggen. Alleen voor eigen patiënten (getest).
50. [x] **Uitleg sturen zonder dossier.** Ook als je de klachtwijzer los opent: "Stuur naar een
    patiënt" opent een venster om de patiënt te kiezen, met een optionele korte toelichting.
51. [x] **Uitleg blijft vindbaar.** Een verstuurde uitleg staat ook op het tabblad Revalidatie
    ("Uitleg over je klacht"), ook nadat het bericht gelezen is.
52. [x] **Controlepagina ook voor oefeningen.** Op "Alle teksten nalopen" staan nu ook de 50
    oefeningen waarvan de dosering een gangbare conventie is (instructie, dosering, symptoomregel),
    met akkoord/wijziging per oefening.
53. [x] **Klachtwijzer alleen voor fysiotherapie.** Coach- en persoonlijke accounts zijn bewust
    niet-medisch: daar is de klachtwijzer (menu, snelzoeken, links bij pijnkaart, oefening, atlas en
    dossier) verborgen, en de server weigert het versturen van een uitleg.
54. [x] **"Wat is er nieuw?" voor testers.** Onderin het menu (therapeut) en bij Instellingen
    (patiënt): de laatste verbeteringen in gewone taal met een link ernaartoe, en een "Nieuw"-label
    tot je het geopend hebt. Bij elke grote stap bijwerken (`web/src/components/app/WhatsNew.tsx`).
55. [x] **Signaal "Pijn loopt op".** In "Vraagt aandacht": pijn na de training drie keer op rij
    hoger (en minstens 4/10), al voordat het een hoge pijnscore wordt. Met "van 2 naar 5/10" en een
    link naar de sessies. Een suggestie om te kijken, geen diagnose.
56. [x] **Patiënt ziet het ook.** Stijgt de pijn na de training drie keer op rij, dan staat op dat
    onderdeel: "Je pijn na het trainen loopt op (van 2 naar 5 op 10). Doe het rustiger aan en laat
    het je fysiotherapeut weten." Coach- en persoonlijke accounts krijgen een niet-medische tekst.

## Vraagt jouw beslissing (Claude wacht hierop)
- Render Starter (betaald) en een vaste schijf voor video's (`STORAGE_DIR`).
- `DEMO_PASSWORD` instellen in Render (zelf doen, niet naar Claude sturen).
- [x] app.fpflow.nl werkt; `APP_ORIGIN=https://app.fpflow.nl` staat in Render (5 nov 2026).
- Echte e-mail (Zoho) in plaats van links op het scherm.
- Kling-video's voor bankdrukken, leg curl en voorwaartse uitvalspas (credits).
- Klinische controle van de klachtwijzer, sliders, mobiliteitstests en 50 oefeningen met een
  conventionele dosering: alles staat op één pagina (Klachtwijzer → "Alle teksten nalopen", ook als PDF).
