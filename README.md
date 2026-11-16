# 🤖 Jarvis – je geheime tweede brein

Jarvis is je persoonlijke AI-assistent die **jouw notities en geheugen** combineert met **Claude** en **ChatGPT**. Alles wat je vastlegt staat als gewone Markdown-bestanden op je eigen computer: privé, doorzoekbaar en te openen in Obsidian.

## Wat kan Jarvis?

| Functie | Hoe |
|---|---|
| 💬 Chatten met context uit je notities | gewoon typen |
| 📝 Snel iets vastleggen | `/notitie <tekst>` |
| 📅 Dagboek | `/dag <tekst>` |
| 🧠 Langetermijngeheugen (ook automatisch) | `/onthoud`, `/geheugen`, `/vergeet` |
| 🔎 Zoeken in je brein | `/zoek <vraag>` |
| 📥 Inbox laten opruimen door AI | `/inbox`, daarna `/verplaats` |
| ☀️ Dagelijkse briefing | `/briefing` |
| ⚖️ Claude én ChatGPT tegelijk vragen | `/beide <vraag>` |
| 🔁 Wisselen van AI | `/claude`, `/chatgpt` |
| 💾 Gesprek bewaren | `/bewaar [titel]` |
| 🎙️ Inspreken (in de browser) | microfoonknop |

## Installeren (5 minuten)

```bash
git clone <deze-repo> jarvis && cd jarvis
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env    # vul je API-sleutels in
```

API-sleutels:
- Claude: <https://console.anthropic.com> → API Keys → `ANTHROPIC_API_KEY`
- ChatGPT: <https://platform.openai.com/api-keys> → `OPENAI_API_KEY`

Eén van de twee is genoeg; met beide werkt `/beide`.

## Gebruiken

```bash
python -m jarvis                    # chat in de terminal
python -m jarvis web                # webinterface → http://127.0.0.1:8000
python -m jarvis notitie "Idee: ..."   # snel vastleggen
python -m jarvis vraag "Wat speelt er deze week?"
```

## Je brein (de kluis)

Standaard in `./brein` (aanpasbaar met `JARVIS_VAULT`, bijv. je bestaande Obsidian-map):

```
brein/
├── 0-Inbox/       snelle invallen
├── 1-Projecten/   met een deadline
├── 2-Gebieden/    doorlopend (gezondheid, geld, werk…)
├── 3-Bronnen/     kennis en ideeën
├── 4-Archief/     afgerond
├── Dagboek/       2026-11-16.md …
├── Gesprekken/    bewaarde chats
└── Geheugen.md    wat Jarvis over je weet
```

Bij elke vraag zoekt Jarvis lokaal (BM25) de meest relevante notities en stuurt alleen díe fragmenten plus je geheugen mee naar de AI.

## Geheim houden 🔒

- `brein/` en `.env` staan in `.gitignore`: je notities en sleutels komen nooit in Git.
- De webinterface luistert alleen op je eigen computer (`127.0.0.1`).
- Wil je hem vanaf je telefoon gebruiken? Zet eerst `JARVIS_PASSWORD` en start met `python -m jarvis web --host 0.0.0.0`; gebruik bij voorkeur een VPN zoals Tailscale in plaats van een open poort.
- Let op: de stukjes notitie die bij een vraag horen gaan wél naar Anthropic/OpenAI. Zet echt gevoelige dingen (wachtwoorden, pincodes) nooit in je brein.

## Snel vastleggen vanaf je telefoon

`POST /api/capture` met `{"message": "..."}` en header `X-Jarvis-Key: <wachtwoord>`. Maak hiervoor een iPhone-opdracht ("Inhoud van URL ophalen") of Android HTTP-shortcut.

## Ook in de Claude- en ChatGPT-apps

In [`prompts/jarvis-instructies.md`](prompts/jarvis-instructies.md) staan instructies om dezelfde Jarvis in een Claude Project en een Custom GPT te zetten.

## Instellingen (`.env`)

| Variabele | Standaard | Uitleg |
|---|---|---|
| `JARVIS_DEFAULT_PROVIDER` | `claude` | `claude` of `chatgpt` |
| `CLAUDE_MODEL` | `claude-opus-5-5` | Claude-model |
| `CLAUDE_EFFORT` | `medium` | `low`/`medium`/`high`: hoe diep Claude nadenkt |
| `OPENAI_MODEL` | `gpt-5` | ChatGPT-model |
| `JARVIS_VAULT` | `./brein` | map van je tweede brein |
| `JARVIS_PASSWORD` | – | wachtwoord voor de webinterface |
| `JARVIS_NAME` / `JARVIS_USER_NAME` | `Jarvis` / – | namen |

## Testen

```bash
pip install pytest httpx && python -m pytest
```
