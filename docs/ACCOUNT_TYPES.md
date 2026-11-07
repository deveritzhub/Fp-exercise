# Accounttypes

| Type | Wie | Aanmaken | Medisch |
|---|---|---|---|
| `physio` | Fysiotherapiepraktijk | Door platformbeheer (contract + verwerkersovereenkomst) | Ja: pijnkaart, alarmsignalen naar de therapeut, revalidatie met fases |
| `coach` | Personal trainer / studio | Zelf via `/aanmelden` (als `SELF_SIGNUP` het toelaat) of door beheer | Nee |
| `personal` | Iemand die voor zichzelf traint | Zelf via `/aanmelden` | Nee |

Niet-medisch betekent:
- geen revalidatieprogramma's (database-trigger `programs_no_rehab_outside_physio`);
- geen alarmsignaal-meldingen, maar algemeen veiligheidsadvies ("bel 112 bij…");
- de pijnkaart is een dagboek; de app trekt er geen conclusies uit en past niets automatisch aan;
- voor krachttraining doet een persoonlijk account een korte zelfcheck (PAR-Q-achtig). Alleen de uitkomst wordt opgeslagen, nooit de antwoorden.

Coaches zien dezelfde schermen als fysiotherapeuten, met andere woorden (klant, studio, coach); zie `shared/accountKind.ts`.
Coach-accounts vereisen tweestapsverificatie, net als praktijken.

## Aanmelden openzetten
`SELF_SIGNUP` (Render → Environment): `coach,personal`, `personal`, `coach` of leeg (= dicht). In productie staat het standaard dicht.
Zet het pas open als de voorwaarden en privacyverklaring voor consumenten klaar zijn en er echte gebruikers bij mogen (geen synthetische demo meer).
