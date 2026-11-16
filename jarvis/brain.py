"""Jarvis-kern: verbindt je kluis, geheugen en de AI-modellen."""

from __future__ import annotations

import re
from collections.abc import Iterator
from datetime import datetime

from .config import Settings, load_settings
from .memory import Memory
from .vault import FOLDERS, Vault

MEMORY_TAG = re.compile(r"^ONTHOUD:\s*(.+)$", re.MULTILINE)

HELP = """**Commando's**
- `/notitie <tekst>` – snel iets vastleggen in je Inbox (ook `/n`)
- `/dag <tekst>` – regel toevoegen aan je dagboek van vandaag
- `/onthoud <feit>` – Jarvis onthoudt dit voorgoed
- `/vergeet <woord>` – feiten met dit woord uit het geheugen halen
- `/geheugen` – laat zien wat Jarvis over je weet
- `/zoek <vraag>` – zoek in je tweede brein
- `/lees <pad>` – toon een notitie
- `/inbox` – Jarvis stelt voor hoe je je Inbox opruimt
- `/verplaats <pad> <map>` – notitie verplaatsen (inbox, projecten, gebieden, bronnen, archief)
- `/briefing` – dagelijkse briefing op basis van je notities
- `/beide <vraag>` – stel dezelfde vraag aan Claude én ChatGPT
- `/claude` of `/chatgpt` – wissel van AI
- `/bewaar [titel]` – sla dit gesprek op in je brein
- `/nieuw` – begin een nieuw gesprek
"""


class Jarvis:
    def __init__(self, settings: Settings | None = None):
        self.s = settings or load_settings()
        self.vault = Vault(self.s.vault)
        self.memory = Memory(self.s.vault)
        self.history: list[dict] = []
        self._providers: dict = {}
        self.provider_name = self.s.default_provider if self.s.default_provider in ("claude", "chatgpt") else "claude"

    # ---------- AI-modellen ----------
    def provider(self, name: str | None = None):
        name = name or self.provider_name
        if name not in self._providers:
            if name == "claude":
                if not self.s.has_claude:
                    raise RuntimeError("Geen ANTHROPIC_API_KEY ingesteld (zie .env).")
                from .claude_provider import ClaudeProvider
                self._providers[name] = ClaudeProvider(self.s.claude_model, self.s.claude_effort)
            elif name == "chatgpt":
                if not self.s.has_openai:
                    raise RuntimeError("Geen OPENAI_API_KEY ingesteld (zie .env).")
                from .openai_provider import OpenAIProvider
                self._providers[name] = OpenAIProvider(self.s.openai_model)
            else:
                raise ValueError(f"Onbekende AI: {name}")
        return self._providers[name]

    # ---------- prompts ----------
    def system_stable(self) -> str:
        who = f" van {self.s.user_name}" if self.s.user_name else ""
        return (
            f"Je bent {self.s.name}, de persoonlijke AI-assistent en het tweede brein{who}. "
            "Je spreekt Nederlands tenzij de gebruiker een andere taal gebruikt. Je bent "
            "scherp, warm, beknopt en proactief: je denkt mee, legt verbanden tussen notities "
            "en wijst op losse eindjes en vervolgstappen.\n\n"
            "Je krijgt bij elke vraag relevante fragmenten uit de persoonlijke notitiekluis en "
            "het langetermijngeheugen. Gebruik die als bron, noem de notitie bij naam als je er "
            "iets uit haalt (bijv. [[Projectplan]]), en zeg eerlijk als iets niet in de notities staat.\n\n"
            "Als de gebruiker iets blijvends over zichzelf vertelt (voorkeur, doel, relatie, "
            "gewoonte, belangrijk gegeven) dat nog niet in het geheugen staat, eindig je antwoord "
            "dan met een aparte regel per feit in exact dit formaat:\n"
            "ONTHOUD: <kort feit in de derde persoon>\n"
            "Doe dit alleen voor echt blijvende, nuttige feiten."
        )

    def system_context(self, query: str) -> str:
        parts = [f"Huidige datum en tijd: {datetime.now():%A %d %B %Y, %H:%M}"]
        facts = self.memory.facts()
        if facts:
            parts.append("## Langetermijngeheugen\n" + "\n".join(f"- {f}" for f in facts))
        hits = self.vault.search(query, limit=6)
        if hits:
            parts.append("## Relevante notities\n" + "\n\n".join(
                f"### [[{h.title}]] ({self.vault.rel(h.path)})\n{h.snippet}" for h in hits))
        today = self.vault.daily_path()
        if today.exists():
            parts.append("## Dagboek van vandaag\n" + today.read_text(encoding="utf-8")[-2000:])
        return "\n\n".join(parts)

    # ---------- hoofdingang ----------
    def handle(self, text: str) -> Iterator[str]:
        text = text.strip()
        if not text:
            return
        if text.startswith("/"):
            yield from self._command(text)
        else:
            yield from self._chat(text)

    def _chat(self, text: str, provider: str | None = None, remember: bool = True) -> Iterator[str]:
        self.history.append({"role": "user", "content": text})
        answer = []
        try:
            for piece in self.provider(provider).stream(
                self.system_stable(), self.system_context(text), self.history
            ):
                answer.append(piece)
                yield piece
        except Exception as e:  # netwerk/sleutel-fouten netjes tonen
            self.history.pop()
            yield f"\n⚠️ Fout bij {provider or self.provider_name}: {e}"
            return
        full = "".join(answer)
        self.history.append({"role": "assistant", "content": full})
        if remember:
            for fact in MEMORY_TAG.findall(full):
                self.memory.remember(fact)
                yield f"\n🧠 _Onthouden: {fact.strip()}_"

    def _command(self, text: str) -> Iterator[str]:
        cmd, _, arg = text.partition(" ")
        cmd, arg = cmd.lower(), arg.strip()
        v = self.vault

        if cmd in ("/help", "/hulp", "/?"):
            yield HELP
        elif cmd in ("/notitie", "/n"):
            if not arg:
                yield "Gebruik: `/notitie <tekst>`"
                return
            yield f"📝 Opgeslagen in je Inbox: `{v.rel(v.add_note(arg))}`"
        elif cmd == "/dag":
            yield f"📅 Toegevoegd aan `{v.rel(v.append_daily(arg))}`"
        elif cmd == "/onthoud":
            self.memory.remember(arg)
            yield f"🧠 Onthouden: {arg}"
        elif cmd == "/vergeet":
            yield f"🗑️ {self.memory.forget(arg)} feit(en) vergeten."
        elif cmd == "/geheugen":
            facts = self.memory.facts()
            yield "\n".join(f"- {f}" for f in facts) if facts else "Ik weet nog niets over je. Vertel eens!"
        elif cmd == "/zoek":
            hits = v.search(arg, limit=8)
            if not hits:
                yield "Niets gevonden."
            for h in hits:
                yield f"- **{h.title}** (`{v.rel(h.path)}`)\n  {h.snippet[:200]}…\n"
        elif cmd == "/lees":
            try:
                yield v.read(arg)
            except (ValueError, OSError) as e:
                yield f"Kan niet lezen: {e}"
        elif cmd == "/verplaats":
            path, _, folder = arg.rpartition(" ")
            if folder not in FOLDERS:
                yield f"Kies een map: {', '.join(FOLDERS)}"
                return
            try:
                yield f"📂 Verplaatst naar `{v.rel(v.move(path, folder))}`"
            except ValueError as e:
                yield str(e)
        elif cmd == "/inbox":
            items = v.inbox()
            if not items:
                yield "✨ Je Inbox is leeg."
                return
            listing = "\n\n".join(
                f"### {v.rel(p)}\n{p.read_text(encoding='utf-8')[:600]}" for p in items[:25])
            yield from self._chat(
                "Hier zijn de notities in mijn Inbox. Stel per notitie voor naar welke map ze moet "
                "(projecten, gebieden, bronnen, archief) of dat ze weg kan, met een korte reden. "
                "Geef per notitie een kant-en-klaar commando `/verplaats <pad> <map>`. "
                "Noem ook acties of taken die je erin ziet.\n\n" + listing, remember=False)
        elif cmd == "/briefing":
            recent = "\n\n".join(
                f"### {v.rel(p)}\n{p.read_text(encoding='utf-8')[:800]}" for p in v.recent(12))
            yield from self._chat(
                "Geef me een korte dagelijkse briefing: waar ben ik mee bezig, welke open taken "
                "en losse eindjes zie je, wat verdient vandaag aandacht, en één verrassend "
                "verband tussen mijn notities.\n\nRecente notities:\n" + recent, remember=False)
        elif cmd == "/beide":
            if not arg:
                yield "Gebruik: `/beide <vraag>`"
                return
            start = len(self.history)
            yield "### 🟠 Claude\n"
            yield from self._chat(arg, "claude")
            claude_turn = self.history[start:]
            del self.history[start:]
            yield "\n\n### 🟢 ChatGPT\n"
            yield from self._chat(arg, "chatgpt", remember=False)
            # Bewaar alleen Claudes antwoord in de lopende gespreksgeschiedenis.
            del self.history[start:]
            self.history.extend(claude_turn)
        elif cmd in ("/claude", "/chatgpt"):
            self.provider_name = cmd[1:]
            yield f"🔁 Je praat nu met {self.provider_name}."
        elif cmd == "/bewaar":
            if not self.history:
                yield "Er is nog geen gesprek om op te slaan."
                return
            yield f"💾 Gesprek opgeslagen: `{v.rel(v.save_conversation(arg or 'Gesprek', self.history))}`"
        elif cmd == "/nieuw":
            self.history.clear()
            yield "🆕 Nieuw gesprek gestart."
        else:
            yield f"Onbekend commando `{cmd}`. Typ `/help`."
