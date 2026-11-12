# FP Flow — vijf cosmeticacollecties

**Stand: 12 november 2026.** Originele 2D/SVG-objecten voor de bestaande avatar. De 3D-held is hier niet heringevoerd.

| Tier | Collectie | Items |
|---|---|---|
| 1 | Gym Starter | Warm-up hoodie, sportbandana, foamroller, gymsneakers |
| 2 | Trail Explorer | Trailjack/tights, pet, hydratierugzak, trailschoenen |
| 3 | Arena Athlete | Sporttenue, compressiekniekous, kettlebell, pulse-amulet |
| 4 | Kyokushin Fighter | Witte karate-gi, zwarte obi, handwikkels, dojo-hoofdband, medaille |
| 5 | Astral Champion | Sterrenharnas, feniksvleugels, komeetlaarzen, sterrenstaf, halo |

Totaal: **22 nieuwe unieke items**, naast de reeds bestaande 26 winkelitems.

## Anatomie en presentatie

- De nieuwe kleding volgt de torsovorm en arm-/beenpaden van `HumanFigure`; afzonderlijke items zijn geplaatst op hoofd, nek, middel, handen, knie, voeten, rug of bij de hand.
- Achtergronditems zoals vleugels en rugzak worden **achter** het lichaam getekend; volledige tenues boven op de lichaamsvorm; accessoires **voor** de figuur.
- De winkel en de avatar delen hetzelfde originele vector-artwork; geen ongefundeerde duplicaten of ontbrekende pictogrammen.
- De fotorealistische basisavatar blijft de standaard. **De nieuwe items hebben nog geen fotorealistische cut-outs.** In fotomodus wordt dat expliciet vermeld en is er een knop naar de geteste 2D-pasvorm. Er worden geen slecht passende vectorstickers op de fotografie gelegd.
- De Kyokushin-gi is herkenbaar als klassieke witte gi met gekruiste kraag en optionele zwarte band. Geen officiële bondsemblemen zijn gereproduceerd.
- Tierprijzen/coinshop, één item per lichaamslot en privé-eigendom gebruiken bestaande backendregels. Geen medische of trainingsprogressie ontgrendeld, geen prestatiedruk.

## Review en resterend werk

- TypeScript, build, SSR-tests en visuele Playwright-test voor alle vijf sets, drie lichaamsbouwen en mobiel.
- De bestaande foto-items worden onafhankelijk verbeterd in PR #30; geparkeerde 3D-avatar in PR #35; drie uitrustingsloadouts in PR #29.
- **Volgende artstap**: eigen fotorealistische, per avatarlichaam passende assets genereren en één voor één controleren, daarna pas opnemen. Automatische koppeling van AI-video's is geen vereiste en wordt niet geactiveerd.
- Nog niet mergen, deployen, aan patiënten tonen of echt patiëntgegevens wijzigen zonder expliciete toestemming.
