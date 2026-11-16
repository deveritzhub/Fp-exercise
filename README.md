# Oefenprogramma (Fp-exercise)

Webapp voor de fysiotherapiepraktijk om thuisoefenschema's samen te stellen, met patiënten te delen en de voortgang te bekijken.

## Werking

1. **Schema maken** (`#/maak`): de therapeut kiest oefeningen uit de bibliotheek of voegt eigen oefeningen toe, stelt sets, herhalingen en vasthoudtijd in en maakt een link.
2. **Patiënt** (`#/p/...`): opent de link op de telefoon, vinkt per dag de oefeningen af, geeft een pijnscore (0–10) en kan een opmerking achterlaten. Ziet een weekoverzicht.
3. **Voortgang** (`#/v/...`): de patiënt maakt een voortgangslink en stuurt die naar de therapeut. Die ziet trouw per oefening, per dag en het verloop van de pijnscores.

## Privacy

Er is geen server en geen database. Het schema zit versleuteld (base64) in de link zelf, en de voortgang staat alleen in de browser (localStorage) van de patiënt, tot die zelf een voortgangslink deelt. Gebruik in schemanamen bij voorkeur initialen.

## Starten

Het zijn statische bestanden, dus elke webserver werkt:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Publiceren kan gratis via bijvoorbeeld GitHub Pages of Netlify.

## Bestanden

- `index.html`: pagina
- `app.js`: logica (schema maken, patiëntweergave, voortgang)
- `exercises.js`: oefenbibliotheek, uit te breiden of aan te passen
- `styles.css`: opmaak (licht en donker thema)
