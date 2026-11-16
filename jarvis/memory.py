"""Langetermijngeheugen: korte feiten over jou die Jarvis altijd meeneemt.

Opgeslagen als leesbaar Markdown-bestand in de kluis (Geheugen.md), zodat je het
zelf kunt bekijken en aanpassen.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
import re

_SINCE = re.compile(r"\s*_\(sinds [^)]*\)_\s*$")

HEADER = "# Geheugen van Jarvis\n\nFeiten die Jarvis over je onthoudt. Pas gerust aan.\n\n"


class Memory:
    def __init__(self, vault_root: Path):
        self.path = Path(vault_root) / "Geheugen.md"
        if not self.path.exists():
            self.path.write_text(HEADER, encoding="utf-8")

    def facts(self) -> list[str]:
        lines = self.path.read_text(encoding="utf-8").splitlines()
        return [_SINCE.sub("", ln[2:]).strip() for ln in lines if ln.startswith("- ")]

    def remember(self, fact: str) -> None:
        fact = " ".join(fact.split())
        if not fact or fact in self.facts():
            return
        with self.path.open("a", encoding="utf-8") as f:
            f.write(f"- {fact} _(sinds {datetime.now():%Y-%m-%d})_\n")

    def forget(self, needle: str) -> int:
        needle = needle.lower()
        lines = self.path.read_text(encoding="utf-8").splitlines(keepends=True)
        kept = [ln for ln in lines if not (ln.startswith("- ") and needle in ln.lower())]
        self.path.write_text("".join(kept), encoding="utf-8")
        return len(lines) - len(kept)
