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
11. [ ] **Dashboard.** "Vraagt aandacht" ook bij een patiënt die al 3 weken niets deed.

## Fase 4 – Snelheid en onderhoud
12. [ ] **Held-pagina sneller.** Het grootste stuk code (148 kB) opsplitsen, zodat Held
    sneller opent op een oude telefoon.
13. [ ] **Toegankelijkheid nieuwe schermen.** Toetsenbord en schermlezer nalopen op
    Mobiliteit meten, Prijzenkast en Dagcheck.
14. [ ] **Opruimen.** Dubbele code en oude teksten weg, documentatie bij.

## Vraagt jouw beslissing (Claude wacht hierop)
- Render Starter (betaald) en een vaste schijf voor video's (`STORAGE_DIR`).
- `DEMO_PASSWORD` instellen in Render (zelf doen, niet naar Claude sturen).
- app.fpflow.nl: CNAME bij TransIP en het domein in Render.
- Echte e-mail (Zoho) in plaats van links op het scherm.
- Kling-video's voor bankdrukken, leg curl en voorwaartse uitvalspas (credits).
- Klinische controle van de nieuwe sliderteksten en de mobiliteitstests.
