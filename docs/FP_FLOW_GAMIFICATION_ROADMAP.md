# FP Flow — kleine, veilige verbeterslagen

## Werkwijze
Per stap: inspecteer GitHub en huidige actieve branch; verander alleen het benodigde; schrijf regressietests; laat GitHub CI (typecheck, build, Vitest, Playwright) draaien; los fouten op; maak een reviewbare PR. **Geen merge, Render-deploy, mutatie van patiëntgegevens of echte notificatie zonder expliciete toestemming.** Werk met synthetische testdata en controleer RLS/tenantisolatie.

## Stand
- P0 — Vandaag-status: PR #15, CI groen; rustdag mag open of gepauzeerde trainingen niet verhullen.
- P1 — Visuele dagmissie: deze PR, gestapeld op #15. Alleen bestaande voorgeschreven sessies, geen nieuw XP-mechanisme of automatische fasewissel.

## Daarna
1. Dagmissie visueel in de browser en op mobiel beoordelen; kleine UX-toegankelijkheidscorrecties.
2. Hoofdquest / revalidatieroute op basis van bestaande fasen en objectieve therapiecriteria; geen klinische automatische vrijgave.
3. Rustige, optionele beloningsanimaties met reduced-motion; geen extra trainingsdruk.
4. Therapeutendashboard: duidelijke signaleringen, meetmomenten, tijdwinst.
5. White-label praktijkbranding, AVG/DPIA/MDR-beoordeling vóór externe patiëntinzet.

## Veiligheidsregels
- Geen beloning voor overbelasting, hogere pijnscore of extra onvoorgeschreven herhalingen.
- Meldingen en gepauzeerde programma's blijven zichtbaar, ook in gamified UI.
- Rustdagen hebben geen verplichte missie; geen straf voor herstel en geen geforceerde streak.
- Geen behandelclaims uit XP, avatarlevel of een tijdlijn.
- Gebruik zonder klinische review uitsluitend fictieve testgegevens.

## Mergevolgorde
PR #15 -> deze gestapelde PR; voer niet rechtstreeks uit op de Render-productiebranch zonder expliciete goedkeuring.
