# Formulieren in Play Console — conceptantwoorden

Dit zijn voorstellen op basis van hoe FP Flow nu werkt. **Controleer ze zelf**: jij (of je praktijk)
bent verantwoordelijk voor de juistheid tegenover Google en patiënten.

## Gegevensveiligheid (*Beleid → App-content → Gegevensveiligheid*)

**Verzamelt of deelt de app gegevens?** Ja, verzamelt. **Delen met derden:** Nee (alleen met de eigen
praktijk van de gebruiker, die de dienst zelf aanbiedt; dat telt niet als delen met derden).

**Versleuteld tijdens verzending:** Ja (HTTPS). **Kan de gebruiker verwijdering aanvragen:** Ja
(Instellingen → Gegevens en privacy → Vraag verwijdering aan).

| Gegevenstype | Verzameld | Waarom | Verplicht? |
|---|---|---|---|
| Persoonlijke info → Naam | Ja | Accountbeheer, app-functionaliteit | Ja |
| Persoonlijke info → E-mailadres | Ja | Accountbeheer, communicatie (uitnodiging, herinnering) | Ja |
| Gezondheid en fitness → Gezondheidsinfo | Ja (pijnscores, lichaamskaart, alarmsignalen, gewicht, lichaamsvet, eiwit, slaap, water) | App-functionaliteit | Deels optioneel |
| Gezondheid en fitness → Fitnessinfo | Ja (trainingen, sets, 1RM, stappen) | App-functionaliteit | Ja |
| App-activiteit → App-interacties | Ja (afgeronde oefeningen, aankopen met in-app muntjes) | App-functionaliteit | Ja |
| Locatie, contacten, foto's, financiële info | Nee | — | — |

Geen advertenties, geen verkoop van gegevens, geen tracking voor marketing. Echte betalingen zijn er
niet: muntjes zijn spelpunten zonder geldwaarde.

## Verklaring voor gezondheidsapps (*App-content → Gezondheid*)

- Kies: **"Gezondheid en fitness"** / **"Revalidatie / fysiotherapie-oefeningen"**.
- **Geen medisch hulpmiddel**: de app toont oefenprogramma's die een fysiotherapeut of trainer
  klaarzet, en registreert hoe de training ging. Ze stelt geen diagnose en geeft geen
  behandeladvies. (Laat dit bevestigen als je twijfelt over de MDR-indeling.)
- Leg in de beschrijving uit dat de app geen behandeling vervangt (staat al in `LISTING.md`).

## Overige formulieren

| Formulier | Antwoord |
|---|---|
| Doelgroep en content | 18 jaar en ouder (patiënten van een praktijk; geen kinderen als doelgroep) |
| Advertenties | Bevat geen advertenties |
| Contentclassificatie (IARC) | Vragenlijst invullen: geen geweld, geen gokken met echt geld (muntjes zijn spelpunten zonder waarde), geen gebruikerscontact behalve vriendenlevels → meestal "Iedereen / PEGI 3" |
| Overheids-/financiële/nieuwsapp | Nee |
| App-toegang | "Alle of sommige functies zijn beperkt" → testaccount opgeven (zie `REVIEW.md`) |
| Gegevensverwijdering (URL) | https://app.fpflow.nl/privacy — vermeld daar hoe je verwijdering aanvraagt |
