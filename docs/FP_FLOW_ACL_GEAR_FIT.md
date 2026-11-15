# FP Flow — reisuitrusting: 2D-pasvormcorrectie

De ACL-revalidatiewereld heeft 23 beloningen, waarvan een subset kleding/uitrusting is; banners en huisdieren zijn geen gedragen items. De aparte **26 reguliere shopitems** hebben bestaande fotorealistische overlays.

## Wat hier wordt hersteld
- Het 2D/RPG-personage tekende ACL-beloningen niet als gedragen items. De meeste ACL-items bestonden uitsluitend als een generiek inventaris-icoon. Daardoor verschenen ze niet op het lijf.
- De oude inventarisvormen gebruikten icooncoördinaten: kniebrace op de borst/nekhoogte, laarzen bij de buik en de staf als klein verticaal blokje.
- De echte 2D-held gebruikt nu *dezelfde anatomische figuurgeometrie* voor knieën, voeten, middel, borst, hand, hoofd en capes.
- Mantel en windcape worden achter het lichaam gerenderd; sporttenues bedekken de getekende romp, armen en benen in plaats van een los vlak te tonen.
- De normale shop, aankopen, stages, XP en therapeutische autorisatie veranderen niet.
- Banners en huisdieren blijven niet-draagbare verzamelbeloningen.

## Belangrijke beperking
Dit is nadrukkelijk een **2D/RPG-pasvormcorrectie**. De fotorealistische renderer heeft nog niet alle originele foto-assets voor nieuwe ACL-beloningen, en de losstaande 3D-variant is voorlopig geparkeerd in PR #35. Daarom wordt niet beweerd dat een ontbrekende fotorealistische beloning nu ook als realistische fotografie op de avatar zit. Voor die tweede stap zijn echte bijpassende beelden en een aparte visuele review nodig. De reguliere fotofitcorrecties staan in PR #30 en zijn nog niet live.

## Testplan
- Statische React-regressietests voor alle gedragen ACL-items, correcte renderingvolgorde, correct geplaatste knieën/voeten en sporttenues.
- Gesimuleerde Playwright-gebruiker en avatars met slanke, atletische en vollere bouw, zonder echte data.
- Bounds voor elk item in de 200×420 SVG-avatar; 390px mobiele layout en één gegenereerde screenshotsample.
- Geen merge, deploy of echt patiëntgegevenswerk zonder producteigenaarbesluit.
