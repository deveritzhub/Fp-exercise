# FP Flow — drie MMO-uitrustingssets (niet live)

De bestaande fotorealistische avatar, 26 items, aankoopsysteem en RLS-autorisaties blijven behouden.
Nieuw: drie cosmetische looks bewaren en met één tik aandoen. Persoonlijke, beveiligde serveropslag werkt ook op andere apparaten; geen browser-localStorage en geen toegang voor therapeuten of vrienden.

- De API `GET /api/patient/hero/loadouts` levert alleen eigen slots.
- `PUT /api/patient/hero/loadouts/:slot` valideert eigendom en items op de server.
- **Aantrekken** gebruikt de bestaande beschermde `PUT /api/patient/hero/gear`; een preset koopt of ontgrendelt nooit iets automatisch.
- Een lege outfit is toegestaan en verwijdert uitsluitend cosmetische gear, niet een door de therapeut ingestelde loophulp.
- Opslag: `hero_loadouts`, drie slots, RLS alleen eigen patiënt-ID, cascaded delete, inbegrepen bij AVG-export.
- Nooit pijn, ROM, behandelfase, medische scores of hersteltempo in presets/beloningen.
- Nieuwe UI ondersteunt toetsenbord, statusfeedback en Nederlandse/Engelse teksten.

Vóór samenvoegen: controleer PostgreSQL-integratietests, accessibility, release-CI en impact van migratie 037. De huidige hostingbranch heeft los hiervan een falende template-volgorde-unit-test; behandel dit niet als bewijs van een wardrobe-regressie. PR #28 (koptelefoonpasvorm) is onafhankelijk en moet apart gereviewd worden.

**Niet automatisch mergen of deployen.**
