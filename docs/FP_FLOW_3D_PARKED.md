# FP Flow — 3D-personage tijdelijk geparkeerd (9 november 2026)

## Productbesluit
De eerste 3D-variant van de held ziet er visueel niet goed genoeg uit voor FP Flow. De 3D-view wordt **uit de patiënt-UI gehaald**, niet verder gepolijst en niet als keuze aangeboden. Geen automatische terugkeer totdat een toekomstige afzonderlijke review expliciet groen licht krijgt.

## Wat patiënten wel houden
- Standaard fotorealistische held met de bestaande uitrusting.
- De bestaande optionele geïllustreerde **2D/RPG-weergave**.
- Items, zeldzaamheidslagen, inventory, aankopen, outfits en medische veiligheidsregels ongewijzigd.

## Implementatie
- `web/src/pages/patient/HeroPages.tsx`: 3D-toggle, 3D-component-import en 3D-renderbranch verwijderd. De eerdere `fp.inventory.3d` sessionStorage-voorkeur wordt opgeschoond en kan dus geen verouderde 3D-weergave activeren.
- `e2e/hero-3d.spec.ts`: test op aanwezigheid van fotoweergave + 2D-weergave, afwezigheid van 3D-knop/canvas en geen 3D-modelrequests, ook met oude opgeslagen voorkeur.
- Alle prototypebroncode, Blender-scripts en GLB-modellen blijven intact in de repository. De runtime gebruikt of downloadt ze niet automatisch; **het verwijderen van de statische assets uit deployment wordt apart beoordeeld**. Dit is parkeren, niet vernietigen.
- De losse prototype-PR #34 hoeft niet verder te worden gemerged voor deze wijziging.

## Voorwaarden voor latere herintroductie
Alleen met kwalitatief sterkere ontwerpbeelden van meerdere avatars en outfits, aantoonbare itempasvorm, prestatie-/batterijbudget, WCAG, veilige fallback en expliciete productgoedkeuring. Geen klinische herstelclaims of extra trainingsdruk.

**Deze PR moet eerst getest en gereviewd worden; dit document claimt geen automatische livegang.**
