# FP Quest

Je fysio-oefeningen als RPG voor je telefoon. Patiënten maken een held aan en kiezen een herstelpad
(knie, rug, schouder, enkel of algemeen fit). Daarna verdienen ze XP en goud met hun dagelijkse oefeningen.

## Wat zit erin

- **Dagelijkse quest**: het oefenprogramma van het gekozen herstelpad.
- **Monster van de dag**: elke voltooide oefening doet schade. Na het hele programma is het monster verslagen en krijg je extra buit.
- **Oefensessie**: herhalingen tellen met een tik, een timer voor vasthoudoefeningen, rusttimers, piepjes en trillen.
- **Pijnregistratie**: na elke oefening geeft de patiënt een pijnscore (0–10) en de zwaarte op. Bij hoge pijn verschijnt een waarschuwing.
- **Held**: levels, eigenschappen (kracht, mobiliteit, balans, stabiliteit), een wereldkaart met zones en prestaties.
- **Winkel**: met goud koop je cosmetische uitrusting voor je held.
- **Logboek**: een pijnverloop over 14 dagen, de geschiedenis en een verslag dat je met de fysio deelt (via de deelknop of het klembord).
- **PWA**: installeerbaar op je telefoon (via "Zet op beginscherm") en werkt offline.

Voortgang wordt lokaal op het toestel opgeslagen (localStorage). Via Held → Instellingen maak je een back-up of zet je die terug.

## Lokaal draaien

```bash
cd public
python3 -m http.server 8000
# open http://localhost:8000
```

Er is geen build-stap nodig: het is gewone HTML, CSS en JavaScript (ES-modules).

## Online zetten op Render

1. Open Render → **New** → **Blueprint** en kies deze repository.
2. Render leest `render.yaml` en maakt een gratis statische site aan (`public/`).
3. Open de URL op je telefoon en kies **Zet op beginscherm**.

## Oefeningen aanpassen

Alle oefeningen, herstelpaden, monsters, zones en winkelitems staan in `public/js/data.js`.
Na een wijziging verhoog je `VERSION` in `public/sw.js`, zodat telefoons de nieuwe versie ophalen.

## Disclaimer

FP Quest vervangt geen fysiotherapeut. Doe alleen oefeningen die met je fysiotherapeut zijn afgesproken.
