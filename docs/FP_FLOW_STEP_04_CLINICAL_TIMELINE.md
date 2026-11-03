# Stap 04 — veilige klinische voortgangstijdlijn (eerste deel)

- Nieuwe read-only tijdlijn in het bestaande therapeutenoverzicht, direct onder de pijnkaart.
- Bestaande sessiescores voor pijn en ervaren zwaarte, chronologisch; maximaal 30 recente regels getoond.
- Aandachtspunt bij niet-beoordeelde feedback of sessiepijn ≥6. Dit is uitsluitend een werkvoorraadindicator, geen diagnose.
- ROM, kracht, functie en vertrouwen zijn **expliciet niet beschikbaar** totdat een geautoriseerde en gevalideerde gegevensbron gekoppeld is. Er worden geen meetwaarden gefabriceerd.
- Geen databasewijzigingen, geen nieuwe endpoints, geen toegang tot andere tenants, geen automatische vrijgave of notificatie.
- Testen op grenswaarden, ontbrekende gegevens, volgorde, review-status en afwezigheid van gefabriceerde klinische velden.

Vervolg stap 04: gecontroleerde datamodellen en therapeutische meetinvoer voor ROM, kracht, functie en vertrouwen, met tenant-isolatie en auditlogging, in een afzonderlijke PR.

PR-keten: #15 → #16 → #17 → deze PR. Niet mergen of deployen zonder expliciete goedkeuring.
