# FP Flow — revalidatieroute (PR #17)

- Vervangt de passieve fasenlijst in de bestaande hoofdquest door een **interactieve, alleen-lezen route**.
- Backendbron: `GET /patient/hero` via het bestaande quest-object; fase, doel, weken, status komen uit therapeutprogramma en bestaande series-functie.
- De patiënt mag eerdere en toekomstige hoofdstukken **bekijken**, maar nergens zelf fasen afronden, vrijgeven of criteria afvinken.
- Een toekomstig hoofdstuk blijft expliciet een preview; huidige status komt uitsluitend uit serverwaarden.
- Bestaande criteria en verificaties blijven uitsluitend in de professionele `PhaseCard` van `ProgramBuilderPage.tsx`. Geen nieuwe API's of permissies; geen patiëntgegevens, diagnoses of therapeutnotities gedeeld.
- De getoonde weekreeks is indicatief, geen medische vrijgave. Geen XP/rewards voor automatische progressie. Geen nieuwe claims over genezing.
- Ondersteunt NL/EN, toetsenbord en focus, klikbare kaartknoppen, aria-labels en een rustig ontwerp.
- Geen wijzigingen aan databaseschema, faseovergangen, patiëntprogramma's of rollen.

## Verificatie
Run CI: TypeScript, Vite build, Vitest, Playwright. Handmatige mobiele/keyboard-review op synthetische testgebruikers is nog vereist.

## Mergevolgorde
PR #15 → PR #16 → deze PR. Geen merges en geen Render-deploy zonder expliciete goedkeuring.
