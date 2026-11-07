# FP Flow — white label / andere praktijken

## Wat nu functioneert
- De praktijknaam, standaardtaal en accentkleur zijn bestaande praktijkinstellingen.
- Patiëntportaal toont al de praktijknaam en past het accent per praktijk toe.
- Nieuwe voorbeeldkaart in instellingen toont ongepubliceerde naam en contrast-gecontroleerde accentkleur. Er is géén tussentijdse write.

## Wat nog een release gate is
- Praktijklogo/brand-assets: opslag en veilige versie- en tenantgebonden toegangscontrole; output mag geen externe trackers bevatten.
- Isolatie: tests voor alle patiënt-, programma-, meet-, vriendschap- en co-opgegevens via praktijk A/B.
- Verwerkersovereenkomst, AVG/DPIA, bewaartermijnen, export/verwijderrechten en logging.
- Toegankelijkheid WCAG, rolrechten, MFA en audittrail van instellingen.
- Klinische toetsing van algoritmen/claims; beoordeel MDR-status vóór commerciële inzet.
- Abonnementen, tenant-provisioning, rate limits, monitoring en migratiestrategie.

De FP Flow-softwarenaam mag zichtbaar blijven als leverancier; andere praktijken worden niet gebrand als Functional Performance. Dit is geen volledige white-label-implementatie of compliance-certificering.
