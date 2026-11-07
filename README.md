# WhatsApp- en bel-agent voor Functional Performance

Eén AI-assistent (Claude) voor fysiotherapiepraktijk **Functional Performance** (Rotterdam) die
klanten helpt via **WhatsApp** én **telefoon**. `business.yaml` is gevuld met de informatie van
functionalperformance.nl (locaties, tarieven, vergoeding, team, FAQ, Flux-boekingslinks).

> **Afspraken:** de praktijk plant in Flux, dus de agent boekt níet zelf (`booking.mode: link`).
> Op WhatsApp stuurt hij de juiste Flux-link (intake per locatie, vervolgafspraak, massage, PT,
> leefstijlcoaching). Aan de telefoon, of bij verzetten/annuleren, zet hij een **terugbelverzoek**
> klaar dat als WhatsApp-melding bij `OWNER_WHATSAPP` binnenkomt.
> Een bedrijf zonder eigen planner kan `booking.mode: internal` gebruiken; dan boekt de agent in een
> eigen agenda (zie `examples/kapsalon-eigen-agenda.yaml`).

Wat de assistent doet:

- vragen beantwoorden op basis van jouw bedrijfsinfo (`business.yaml`)
- de juiste **boekingslink** sturen of een **terugbelverzoek** klaarzetten
  (of, met `booking.mode: internal`, zelf afspraken boeken, tonen en annuleren)
- geen diagnoses of oefenadvies; bij alarmsignalen verwijzen naar huisarts/huisartsenpost of 112
- **doorverbinden met een medewerker** (WhatsApp-melding of de beller doorschakelen)
- **zelf bellen**: uitgaande gesprekken, bijvoorbeeld om een afspraak te bevestigen

```
WhatsApp ──► Meta Cloud API ──► /whatsapp/webhook ─┐
                                                    ├─► agent (Claude + tools) ─► SQLite (afspraken, gesprekken)
Telefoon ──► Twilio (spraak↔tekst) ──► /voice/* ───┘
```

## 1. Installeren

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # vul daarna je sleutels in
```

Controleer **`business.yaml`**: locaties, tarieven, vergoeding, team, FAQ, beleid en boekingslinks.
De agent gebruikt alleen deze informatie en verzint niets. Houd het gelijk met je website als
tarieven of diensten veranderen.

Starten:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Je server moet via **https** bereikbaar zijn. Lokaal testen kan met `ngrok http 8000`;
zet de https-URL in `PUBLIC_BASE_URL`. Of draai het met Docker:
`docker build -t business-agent . && docker run --env-file .env -p 8000:8000 business-agent`.

## 2. WhatsApp-agent koppelen

1. Maak op [developers.facebook.com](https://developers.facebook.com) een app van het type **Business** en voeg **WhatsApp** toe.
2. Kopieer onder *WhatsApp → API Setup* de **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`.
3. Maak een **permanent access token** (Business Settings → System users) met de rechten
   `whatsapp_business_messaging` → `WHATSAPP_TOKEN`.
4. Kopieer het **App secret** (App settings → Basic) → `WHATSAPP_APP_SECRET`.
5. Ga naar *WhatsApp → Configuration → Webhook*:
   - Callback URL: `https://<jouw-domein>/whatsapp/webhook`
   - Verify token: dezelfde waarde als `WHATSAPP_VERIFY_TOKEN`
   - Abonneer op het veld **messages**.
6. Stuur een WhatsApp naar je bedrijfsnummer. Klaar.

**Overdracht:** als de agent doorverwijst, krijgt `OWNER_WHATSAPP` een melding en zwijgt de bot
in dat gesprek. Je beantwoordt de klant dan zelf. Stuur `#bot 31612345678` vanaf het
eigenaarsnummer om de assistent het gesprek weer te laten overnemen.
(Let op: WhatsApp staat vrije tekstberichten alleen toe binnen 24 uur na het laatste bericht van
die ontvanger. Stuur dus zelf eens een bericht naar je bedrijfsnummer vanaf `OWNER_WHATSAPP`.)

## 3. Bel-agent koppelen (Twilio)

1. Maak een account op [twilio.com](https://www.twilio.com) en koop een (Nederlands) telefoonnummer.
   Vul `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` en `TWILIO_PHONE_NUMBER` in.
2. Stel bij het nummer onder *Voice Configuration* in:
   **A call comes in → Webhook → `https://<jouw-domein>/voice/incoming` (HTTP POST)**.
3. Bel je nummer. De agent begroet de beller, luistert (Twilio-spraakherkenning in `nl-NL`),
   denkt na met Claude en antwoordt met een Nederlandse stem.

Bellers worden bij overdracht doorgeschakeld naar `OWNER_PHONE`.
De stem wijzig je met `VOICE_NAME` (bijv. `Polly.Lotte` of `Google.nl-NL-Wavenet-B`).

**Uitgaand bellen** (bijv. afspraakherinnering):

```bash
curl -X POST https://<jouw-domein>/voice/outbound \
  -H "X-API-Key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"to": "+31612345678", "purpose": "Herinnering aan de afspraak van morgen 10:00; vraag of die doorgaat"}'
```

> Houd je bij uitgaande gesprekken aan de regels voor telemarketing (o.a. het Bel-me-niet Register);
> gebruik dit vooral voor bestaande klanten en service-gesprekken.

## Instellingen

| Variabele | Uitleg |
|---|---|
| `ANTHROPIC_API_KEY` | Sleutel van [console.anthropic.com](https://console.anthropic.com) |
| `CLAUDE_MODEL` | Standaard `claude-opus-5-5` |
| `CLAUDE_EFFORT` | `low` (snelst, aanbevolen voor telefoon), `medium` of `high` |
| `PUBLIC_BASE_URL` | Publieke https-URL; nodig voor Twilio-handtekeningen en uitgaand bellen |

Alle andere variabelen staan met uitleg in `.env.example`.

## Hoe het werkt

- `app/agent.py` — het brein: systeemprompt, Claude-aanroep, tool-loop. Eén agent voor beide kanalen,
  met per kanaal eigen schrijfregels (chatstijl vs. gesproken taal).
- `app/tools.py` — link-modus: `request_callback`; interne agenda: `check_availability`,
  `book_appointment`, `list_my_appointments`, `cancel_appointment`. Altijd: `handoff_to_human`
  en (alleen telefoon) `end_call`.
- `app/whatsapp.py` — webhook (handtekening-controle, dubbele berichten negeren), antwoorden versturen.
- `app/voice.py` — Twilio TwiML: luisteren, antwoorden, doorverbinden, ophangen, uitgaand bellen.
- `app/db.py` — SQLite met gesprekken, terugbelverzoeken en afspraken (`data/agent.db`).

De klant wordt herkend aan het telefoonnummer, dus een afspraak die via WhatsApp is gemaakt, kan
telefonisch worden geannuleerd en andersom. Een WhatsApp-gesprek begint opnieuw na 24 uur stilte.

Claude-verzoeken gebruiken prompt caching (de bedrijfsinfo staat in een vaste systeemprompt) en
server-side fallbacks, zodat een geweigerd verzoek automatisch op een ander model wordt opgevangen.

## Testen

```bash
pip install -r requirements-dev.txt
pytest
```

De tests gebruiken een nep-Claude en hebben geen sleutels of internet nodig.
