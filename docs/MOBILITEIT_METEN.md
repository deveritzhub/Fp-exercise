# Mobiliteit meten (zelftests)

Patiënten meten thuis vier gepubliceerde veldtests met een meetlint (Mobiliteit → Mobiliteit meten).
Code: `shared/mobilityTests.ts` (tests en rekenregels), `server/src/routes/mobilityTests.ts`,
`web/src/components/MobilityTests.tsx`. Tabel `mobility_tests` (migratie 033).

| Test | Kanten | Eenheid | Beter | Meetfout in de app | Bron |
|---|---|---|---|---|---|
| Knie-tot-muur | links/rechts | cm teen–muur | hoger | ±1,5 cm | Bennell 1998; Powden 2015 |
| Vinger-vloerafstand | één | cm vinger–vloer | lager | geen | Perret 2001 |
| Rugkrabtest | links/rechts (arm boven) | cm, gat negatief | hoger | geen | Rikli & Jones |
| Stoel-zit-en-reiktest | links/rechts (gestrekt been) | cm, niet tot tenen negatief | hoger | geen | Rikli & Jones |

## Regels
- Vergelijken alleen met eigen eerdere metingen en links met rechts; geen normwaarden.
- "Beweeglijker/stijver" en "binnen de meetfout" alleen waar een meetfout gepubliceerd is
  (knie-tot-muur). Bij de andere tests toont de app alleen het aantal centimeters.
- Eén meting per test, kant en dag; waarden op 0,5 cm afgerond.
- XP voor meten, nooit voor de uitslag: +20 XP en Mobiliteit-skill-XP, één keer per 14 dagen.
- Suggestie: een bestaand mobiliteitsprogramma van de praktijk waarvan de titel past
  (`programHints`). Stelliger alleen bij stijver worden of een duidelijk achterblijvende kant,
  altijd met "bespreek pijn met je fysiotherapeut".
- Privacy: van de patiënt. Fysiotherapeut ziet de metingen (tabblad Mobiliteit, overzicht en
  voortgangsrapport) alleen als de patiënt het onderdeel Mobiliteit deelt. In de gegevensexport.

## Nog klinisch na te lopen
De stap-voor-stap-teksten en waarschuwingen zijn eigen formuleringen op basis van de
oorspronkelijke protocollen.
