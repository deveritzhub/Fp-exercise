# FP Flow — wereldkaart en praktijkgilde

De wereldkaart (`/p/wereld`) toont het bestaande traject als een RPG-kaart. Een zone is een fase van de revalidatieroute, of — zonder fasen — het actieve schema. Het thema komt uit de lichaamsregio van het programma (Knievallei, Schouderbergen, Rugwoud; anders Het oefenland).

- De fotorealistische held staat op de huidige zone. Afgeronde trainingen zijn padpunten. Aan het eind van elke zone staat de bestaande hoofdstukbaas.
- Een latere zone blijft op slot, ook als er al trainingen in staan. Alleen de fase die de therapeut heeft vrijgegeven is `current`. Meer herhalingen of meer gewicht veranderen die status niet. Er is geen knop en geen endpoint om een zone te openen.
- Een open zone (tik of toetsenbord) opent een paneel: wanneer de fase is vrijgegeven en gestart, de data van afgeronde trainingen, de oefeningen van dat programma (link naar de bestaande oefenpagina) en bekers of badges uit de prijzenkast. Een beker hoort bij een skill die in die zone getraind wordt; tel-badges vallen in de zone waar het aantal voorgeschreven trainingen de grens haalt. Een dichte zone toont alleen de naam en "Je therapeut geeft deze zone vrij" — geen doel, geen oefeningen, geen data.
- Aan het begin van het pad staat het dorp. Smederij (uitrusting), bibliotheek (spierenatlas en quiz), trofeeënhal (prijzenkast), prikbord (missie van vandaag, met een link naar de weekquests) en gildehal (de raid op deze kaart). Een gebouw ontbreekt als die functie voor het account uit staat.
- Een open zone toont, als de therapeut een meetdoel zette, een meting-boss: de balk is de afstand van de eerste meting naar het streefgetal. De baas is verslagen alleen als een meting van de therapeut, of een door de therapeut bevestigde zelftest, het doel haalt. Dat opent de volgende zone niet; de therapeut krijgt een melding en het dashboard toont "doel gehaald".
- Het kracht-erfstuk is één sieraad (wapen, schild of amulet), één keer gekozen. De vorm (1–5) volgt de beste voortgang van de eigen metingen naar de doelen, niet het aantal herhalingen. Een mindere dag haalt de vorm niet naar beneden.
- Coach- en persoonlijke accounts krijgen alleen zelftests als meetdoel, geen ROM-, kracht-, functie- of vertrouwensmeting, en andere zinnen: geen klacht, diagnose of revalidatie.
- De VKB-route (`acl_vkb_flagship`, alleen een fysiotherapiepraktijk) is de vlaggenschipkaart: vijf zones in de Knievallei (De Poort, Het Pad, De Krachtbron, De Springsprong, Het Veld), elk met een genoemde baas (De Zwelling, De Stramme Reus, De Weegschaal, De Landing, De Terugkeer). De streefwaarden — extensie 0°, buiging 90° en 120°, weinig zwelling, eenbenige stand, LSI 70/80/90, hoptests, ACL-RSI 65 — zijn standaardwaarden. De therapeut past ze aan. De limb symmetry index rekent de server uit beide zijden van dezelfde dag; niemand typt de index in. Een verslagen baas meldt de therapeut en toont de overwinning. De volgende fase blijft dicht tot de therapeut die zelf vrijgeeft.
- De patiënt ziet gewone taal ("72% nu, nog 8% te gaan", "je therapeut beoordeelt"), nooit de criteriatekst of een diagnose. Het kracht-erfstuk volgt de beste voortgang op die metingen en zakt niet na een mindere dag.
- Bronnen en de volledige criteriatekst staan op de klinische controlepagina (`/app/klachtwijzer/controle`, kop "VKB-route") en in `shared/aclRoute.ts`. Nakijken vóór gebruik in de zorg. Geen behandeladvies.

Hoe de therapeut de route toewijst, tests invoert en de criteria leest: [VKB_ROUTE.md](VKB_ROUTE.md).

## Bronnen van de standaardwaarden

Criteriegestuurde VKB-revalidatie, geen enkel protocol: van Melick e.a. 2016 (Br J Sports Med), Adams e.a. 2012 (JOSPT), Grindem e.a. 2016 (Delaware-Oslo, Br J Sports Med), Kyritsis e.a. 2016 (Br J Sports Med), Noyes e.a. 1991 (hops, Clin Orthop Relat Res), Webster e.a. 2008 (ACL-RSI, Phys Ther Sport), Sturgill e.a. 2009 (stroke-test, JOSPT). De 70% en 80% zijn aanpasbare tussenstappen in deze route. 90% wordt in die literatuur vaak genoemd bij terugkeer naar sport. 65 op de ACL-RSI is een voorbeeld, geen vaste afkapwaarde. Het chirurgisch protocol blijft bindend.
- Een rustdag op het schema, of een pijnmelding van vandaag, toont een rustbuff. Padpunten en zones blijven gelijk. Er valt niets in te halen.

## Gilderaid

Alle actieve patiënten van een praktijk zijn het gilde. `app.practice_guild_week` (migratie 037, security definer, alleen toevoegend) geeft drie getallen terug: de groepsgrootte, het aantal afgeronde voorgeschreven trainingen deze week, en het eigen aantal van de aanroeper. Zelf toegevoegde trainingen buiten het schema tellen niet mee.

De API past dezelfde grens toe als de teamquest: onder vijf patiënten gaat er geen totaal naar buiten. Daarboven alleen het totaal, de band "5+" en de levenspunten van de raidbaas (40 min het totaal, nooit onder nul). Geen namen, geen ranglijst, geen chat, geen bijdrage per persoon. De gildebanier is een uiterlijk voor wie deze week minstens één voorgeschreven training afrondde. Extra sessies geven niets extra's.

De therapeut ziet op het dashboard dezelfde totalen, zonder de persoonlijke banier.

## Verificatie

Vitest dekt thema's, het slot op latere fasen (zonder doel of oefeningen), de prijzen per zone, het dorp, de rustbuff, de cohortgrens en de migratie. Playwright opent de kaart, het dorp, een open zone en een dichte zone op 360 px, met toetsenbord en schermlezercontrole. Schermafbeeldingen staan in `screenshots/world-map/`. Geen merge en geen deploy.
