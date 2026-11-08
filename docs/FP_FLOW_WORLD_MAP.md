# FP Flow — wereldkaart en praktijkgilde

De wereldkaart (`/p/wereld`) toont het bestaande traject als een RPG-kaart. Een zone is een fase van de revalidatieroute, of — zonder fasen — het actieve schema. Het thema komt uit de lichaamsregio van het programma (Knievallei, Schouderbergen, Rugwoud; anders Het oefenland).

- De fotorealistische held staat op de huidige zone. Afgeronde trainingen zijn padpunten. Aan het eind van elke zone staat de bestaande hoofdstukbaas.
- Een latere zone blijft op slot, ook als er al trainingen in staan. Alleen de fase die de therapeut heeft vrijgegeven is `current`. Meer herhalingen of meer gewicht veranderen die status niet. Er is geen knop en geen endpoint om een zone te openen.
- Een open zone (tik of toetsenbord) opent een paneel: wanneer de fase is vrijgegeven en gestart, de data van afgeronde trainingen, de oefeningen van dat programma (link naar de bestaande oefenpagina) en bekers of badges uit de prijzenkast. Een beker hoort bij een skill die in die zone getraind wordt; tel-badges vallen in de zone waar het aantal voorgeschreven trainingen de grens haalt. Een dichte zone toont alleen de naam en "Je therapeut geeft deze zone vrij" — geen doel, geen oefeningen, geen data.
- Aan het begin van het pad staat het dorp. Smederij (uitrusting), bibliotheek (spierenatlas en quiz), trofeeënhal (prijzenkast), prikbord (missie van vandaag, met een link naar de weekquests) en gildehal (de raid op deze kaart). Een gebouw ontbreekt als die functie voor het account uit staat.
- Coach- en persoonlijke accounts krijgen andere zinnen: geen klacht, diagnose of revalidatie. Het eindpunt heet daar geen hoofdstukbaas. Klinische badges (pijn, fase voltooid) komen niet op hun kaart.
- Een rustdag op het schema, of een pijnmelding van vandaag, toont een rustbuff. Padpunten en zones blijven gelijk. Er valt niets in te halen.

## Gilderaid

Alle actieve patiënten van een praktijk zijn het gilde. `app.practice_guild_week` (migratie 037, security definer, alleen toevoegend) geeft drie getallen terug: de groepsgrootte, het aantal afgeronde voorgeschreven trainingen deze week, en het eigen aantal van de aanroeper. Zelf toegevoegde trainingen buiten het schema tellen niet mee.

De API past dezelfde grens toe als de teamquest: onder vijf patiënten gaat er geen totaal naar buiten. Daarboven alleen het totaal, de band "5+" en de levenspunten van de raidbaas (40 min het totaal, nooit onder nul). Geen namen, geen ranglijst, geen chat, geen bijdrage per persoon. De gildebanier is een uiterlijk voor wie deze week minstens één voorgeschreven training afrondde. Extra sessies geven niets extra's.

De therapeut ziet op het dashboard dezelfde totalen, zonder de persoonlijke banier.

## Verificatie

Vitest dekt thema's, het slot op latere fasen (zonder doel of oefeningen), de prijzen per zone, het dorp, de rustbuff, de cohortgrens en de migratie. Playwright opent de kaart, het dorp, een open zone en een dichte zone op 360 px, met toetsenbord en schermlezercontrole. Schermafbeeldingen staan in `screenshots/world-map/`. Geen merge en geen deploy.
