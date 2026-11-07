# WhatsApp- en bel-assistent (Functional Performance)

Een AI-assistent (Claude) die in de FP Flow-server meedraait en klanten van de praktijk helpt via
**WhatsApp** en **telefoon**. Code: `server/src/agents/`, tests: `server/test/agents.test.ts`,
database: migratie `037_agents.sql`.

```
WhatsApp ──► Meta Cloud API ──► /agents/whatsapp/webhook ─┐
                                                           ├─► assistent (Claude + tools) ─► Postgres (agent_*)
Telefoon ──► Twilio (spraak↔tekst) ──► /agents/voice/* ───┘
```

## Wat de assistent doet

- Vragen beantwoorden **alleen** op basis van `server/src/agents/practice.ts`: locaties, tarieven
  2026, vergoeding, team, FAQ en beleid (overgenomen van functionalperformance.nl).
- **Afspraken:** de praktijk plant in Flux, dus de assistent boekt niet zelf.
  - Op WhatsApp stuurt hij de juiste Flux-link: intake per locatie, vervolgafspraak, massage,
    personal training of leefstijlcoaching.
  - Aan de telefoon, of bij verzetten of annuleren, zet hij een **terugbelverzoek** klaar.
    Dat komt als WhatsApp-bericht binnen bij `OWNER_WHATSAPP`.
- **Overdracht** aan een medewerker:
  - Op WhatsApp krijg je een melding en zwijgt de bot in dat gesprek. Stuur `#bot 316…` om hem
    het gesprek weer te laten overnemen.
  - Aan de telefoon wordt de beller doorgeschakeld naar `OWNER_PHONE`.
- **Zelf bellen** (bijvoorbeeld een afspraakherinnering) via `POST /agents/voice/outbound`.
- **Medische veiligheid:** de assistent stelt geen diagnose en geeft geen oefenadvies. Bij
  alarmsignalen verwijst hij naar de huisarts, de huisartsenpost of 112.

Pas `practice.ts` aan als tarieven, diensten of boekingslinks veranderen. Een **open punt**: op de
website verschillen de prijzen van PT-pakketten tussen /tarieven en /personal-training-rotterdam.
Daarom noemt de assistent alleen de losse sessie en het traject van 24 sessies.

## Instellen op Render

Alle variabelen staan in `render.yaml` en `.env.example`. Laat je een kanaal leeg, dan antwoordt
dat kanaal met 503. De rest van FP Flow werkt gewoon door. Controleer na het instellen
`https://<app>/agents/health`; die laat zien welke kanalen aan staan.

| Variabele | Waar vandaan |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` | developers.facebook.com → je app → WhatsApp / App settings |
| `WHATSAPP_VERIFY_TOKEN` | zelf verzonnen (Render genereert er een); dezelfde waarde vul je in bij Meta |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | twilio.com console |
| `OWNER_WHATSAPP` / `OWNER_PHONE` | jouw nummers, voor meldingen en doorverbinden |
| `CLAUDE_EFFORT` | `low` (standaard; snelst, aanbevolen voor de telefoon) |

**WhatsApp (Meta):**
1. Maak een Business-app aan en voeg WhatsApp toe.
2. Ga naar *Configuration → Webhook*:
   - Callback URL: `https://<app>/agents/whatsapp/webhook`
   - Verify token: dezelfde waarde als `WHATSAPP_VERIFY_TOKEN`
   - Abonneer op het veld **messages**.
3. Maak een permanent token aan via een System user.

**Telefoon (Twilio):** stel bij je nummer in: *A call comes in → Webhook →
`https://<app>/agents/voice/incoming` (POST)*.

**Plan:** gebruik voor de telefoon het **Starter**-plan. Twilio wacht maximaal 15 seconden op een
antwoord, en een gratis service die slaapt doet er ongeveer 50 seconden over om op te starten.

## Privacy en veiligheid

- Gesprekken en terugbelverzoeken staan in `agent_conversations` en `agent_callback_requests`.
  Ze zijn alleen leesbaar in een transactie met `app.agent = 'on'` (RLS). Gewone API-routes
  kunnen er niet bij.
- Na `AGENT_RETENTION_DAYS` (standaard 90 dagen) worden ze automatisch verwijderd.
- Webhooks worden gecontroleerd met de handtekeningen van Meta (`X-Hub-Signature-256`) en Twilio
  (`X-Twilio-Signature`). Uitgaand bellen vereist `AGENT_ADMIN_KEY`.
- **Let op:** FP Flow draait nu als demo die alleen voor synthetische data is goedgekeurd (zie
  README / RELEASE_CHECKLIST). De assistent verwerkt wél echte klantgegevens: naam, telefoonnummer
  en een korte omschrijving van de klacht. Regel daarom vóór livegang verwerkersovereenkomsten met
  Anthropic, Meta, Twilio, Render en Neon, en vermeld de assistent in je privacyverklaring.

## Testen

```bash
npm test -- server/test/agents.test.ts
```

De tests gebruiken een nep-Claude, nep-WhatsApp en ondertekende nep-Twilio-verzoeken tegen de
echte testdatabase.
