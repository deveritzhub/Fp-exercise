# UX-audit oktober 2026 — uitvoering

Alles lokaal uitgevoerd op synthetische gegevens (databases `fp_exercise`, `fp_exercise_test`,
`fp_exercise_e2e`). Niet gedeployed.

## Classificatie van de bevindingen

| Bevinding | Soort | Oorzaak / aanpak |
|---|---|---|
| Voorbeeld toont 4 oefeningen, patiënt 2 | Bevestigde fout | Voorbeeld negeerde weekdagen en periode. Eén planningsregel in `shared/schedule.ts` voor patiëntapp, trainingsspeler en voorbeeld; voorbeeld gebruikt dezelfde schermcomponenten, heeft een voorbeelddatum en slaat niets op. |
| Progressie als "Alternatieve oefening" (Spaanse squat) | Bevestigde fout | Keuzelijst bood alle relaties aan. Nu alleen regressies en gelijkwaardige alternatieven, plus expliciet zoeken; server weigert een progressie; patiënt ziet een oude progressie-vervanger nooit. |
| Split squat met "Dumbbell" onder "Geen materiaal" | Bevestigde fout (labeling) | Opgeslagen als `none + dumbbell` (optioneel materiaal). Label nu "Geen materiaal nodig (optioneel: Dumbbell)", in filter en kaart gelijk. |
| "119 resultaten voor pols" / "Niets gevonden" tijdens laden | Bevestigde fout | Vorige resultaten bleven staan met de nieuwe zoekterm. Nu laadstatus, geen telling of lege staat van een oude zoekopdracht, verouderde verzoeken worden afgebroken. |
| Bron/status/favorieten niet combineerbaar | Ontbrekende functionaliteit | Drie onafhankelijke filters (oude `?scope=`-links blijven werken). |
| Dubbele Dead bug, Bilbrug/Bekkenbrug | Onvoldoende zichtbaar | Varianten gemarkeerd en naast elkaar vergeleken; niets samengevoegd of verwijderd. |
| Dumbbell curl onder Schouder | Metadata-twijfel | Bron geeft geen regio; import koos Schouder. Niet zelf gecorrigeerd: zie `docs/KLINISCHE_REVIEW.md`. |
| Detailpagina: upload bovenaan, titel laag | Onvoldoende zichtbaar | Titel/dosering eerst, compacte melding bij ontbrekende media, uploads onder "Media beheren". |
| Ingeklapte rij toont geen tempo/belasting/frequentie/notitie | Onvoldoende zichtbaar | Samenvatting toont alles wat is ingevuld. |
| Quick add en editor andere standaarddosering | Bevestigde fout | Eén `defaultDose()`. |
| Leeg = 0, geen validatie | Ontbrekende functionaliteit | Leeg blijft leeg; fouten per oefening, datumvolgorde, trainingsdagen. |
| Concept/opgeslagen/gepubliceerd onduidelijk | Onvoldoende zichtbaar | Statusbalk + publicatiedialoog met wijzigingen en wie een melding krijgt; versies blijven bewaard. |
| Timers zonder pauze; klaar = afgevinkt | Ontbrekende functionaliteit | Pauzeerbare vasthoud- en rusttimer; een timer vinkt nooit iets af. |
| Geen "Training hervatten" | Ontbrekende functionaliteit | Thuisscherm toont voortgang en hervatten (ook na een al afgeronde training vandaag). |
| Oefening bekijken start sessie | Ontbrekende functionaliteit | Oefening openen vanuit het programma, zonder registratie. |
| Native confirm bij onderbreken | Bevestigde fout (a11y) | Toegankelijke dialoog Doorgaan/Onderbreken met uitleg; focus op Doorgaan, Escape sluit. |
| Dashboard-signalen zonder reden/datum | Onvoldoende zichtbaar | Werklijst bovenaan met reden, datum, aantallen en directe actie; niet-geactiveerd, geen registratie en lage therapietrouw apart. |
| Therapietrouw zonder teller/noemer | Onvoldoende zichtbaar | "x van y geplande trainingsdagen (7 dagen)", overal dezelfde berekening. |
| Grafieken zonder datum/schaal | Onvoldoende zichtbaar | Data, schaal, waarden; dag kiezen toont sessies. |
| Sessie- vs oefenscores, vasthoudtijd | Onvoldoende zichtbaar | Gelabeld; vasthoudtijd in sessiegeschiedenis. |
| Feedbackbadge | Onvoldoende zichtbaar | "N te beoordelen". |
| "Mijn recente programma's" | Ontbrekende functionaliteit | Doorzoekbaar overzicht met status-, patiënt- en therapeutfilter. |
| "Let op" zonder reden | Onvoldoende zichtbaar | Concrete waarschuwing op de badge. |
| Responsive/toegankelijkheid | Bevestigde fouten | Overloop dashboard/editor/patiëntdossier op 360–430 px (grid zonder `min-w-0`, niet-krimpende knoppenrij); 17 tikdoelen < 44 px in de patiëntapp; regiochips deels onbereikbaar op desktop; dialoogfocus. Alle opgelost en getest. |

## Tests

- Vitest: 113 tests (nieuw: `shared/schedule.test.ts`, `server/test/ux-audit.test.ts`).
- Playwright: 45 tests (nieuw: `e2e/ux-audit.spec.ts`: voorbeeld = patiëntapp, vervanger, verouderde
  zoekresultaten met vertraagd antwoord, materiaal, timers/hervatten/onderbreken, klinische notities,
  breedtes 360/390/430/768/1440 zonder horizontale overloop of inhoud onder vaste balken, tikdoelen ≥ 44 px,
  alle regio's bereikbaar).
- Screenshots: `screenshots/ux-audit/`.

## Beperkingen

- Lokaal zijn geen video's aanwezig; de getoonde "geen video"-meldingen zijn echt. Ontbrekende media per
  oefening staat in `docs/KLINISCHE_REVIEW.md`. Er zijn geen video's verzonnen.
- Klinische review nodig: zie `docs/KLINISCHE_REVIEW.md` (regio's, varianten, optioneel materiaal,
  oefeningen zonder makkelijkere variant).
- Native datumvelden volgen de taal van de browser (in de testbrowser mm/dd/jjjj); in een Nederlandse
  browser dd-mm-jjjj. Alle door de app geschreven datums zijn uitgeschreven ("23 oktober 2026").
- Getest in Chromium (desktop en geëmuleerde telefoon); Safari/iOS en Firefox niet getest.
- Contrast is via axe (WCAG AA) gecontroleerd op de geteste schermen, niet op elk scherm.
- De backend van "Doe alles" (modi, toestemming, kracht, alarmsignalen, verwijderverzoeken) is lokaal
  gecommit; de bijbehorende schermen zijn nog niet gebouwd.
