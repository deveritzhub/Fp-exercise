"""De kluis: je tweede brein als gewone Markdown-bestanden (Obsidian-compatibel).

Structuur (PARA-methode):
    0-Inbox/      snelle invallen, nog te verwerken
    1-Projecten/  dingen met een deadline
    2-Gebieden/   doorlopende verantwoordelijkheden (gezondheid, financiën, ...)
    3-Bronnen/    kennis, artikelen, ideeën
    4-Archief/    afgerond
    Dagboek/      dagnotities (JJJJ-MM-DD.md)
    Gesprekken/   opgeslagen chats met Jarvis
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

FOLDERS = {
    "inbox": "0-Inbox",
    "projecten": "1-Projecten",
    "gebieden": "2-Gebieden",
    "bronnen": "3-Bronnen",
    "archief": "4-Archief",
    "dagboek": "Dagboek",
    "gesprekken": "Gesprekken",
}

_WORD = re.compile(r"[\wÀ-ÿ]{2,}", re.UNICODE)
_STOP = set(
    "de het een en van in op te dat die is voor met niet aan er zijn om als ook "
    "maar bij of wat dan nog wel door naar uit over the and of to a in is it for "
    "on with that this ik je jij mijn me we wij hij zij ze was heb hebt heeft".split()
)


def tokenize(text: str) -> list[str]:
    return [w for w in (m.lower() for m in _WORD.findall(text)) if w not in _STOP]


def slugify(title: str) -> str:
    s = re.sub(r"[^\w\s-]", "", title, flags=re.UNICODE).strip()
    s = re.sub(r"\s+", " ", s)
    return (s or "notitie")[:80]


@dataclass
class Hit:
    path: Path
    title: str
    score: float
    snippet: str


class Vault:
    def __init__(self, root: Path):
        self.root = Path(root)
        for folder in FOLDERS.values():
            (self.root / folder).mkdir(parents=True, exist_ok=True)

    # ---------- schrijven ----------
    def _unique(self, folder: str, title: str) -> Path:
        base = self.root / FOLDERS.get(folder, folder) / slugify(title)
        path, n = base.with_suffix(".md"), 2
        while path.exists():
            path = base.parent / f"{base.name} ({n}).md"
            n += 1
        return path

    def add_note(self, text: str, title: str | None = None, folder: str = "inbox",
                 tags: list[str] | None = None) -> Path:
        now = datetime.now()
        title = title or (text.strip().splitlines() or ["Notitie"])[0][:60]
        path = self._unique(folder, title)
        tag_line = " ".join(f"#{t.lstrip('#')}" for t in (tags or []))
        body = (
            f"---\naangemaakt: {now:%Y-%m-%d %H:%M}\n"
            f"tags: [{', '.join(t.lstrip('#') for t in (tags or []))}]\n---\n\n"
            f"# {title}\n\n{text.strip()}\n" + (f"\n{tag_line}\n" if tag_line else "")
        )
        path.write_text(body, encoding="utf-8")
        return path

    def daily_path(self, day: datetime | None = None) -> Path:
        day = day or datetime.now()
        return self.root / FOLDERS["dagboek"] / f"{day:%Y-%m-%d}.md"

    def append_daily(self, text: str) -> Path:
        path = self.daily_path()
        if not path.exists():
            path.write_text(f"# {datetime.now():%A %d %B %Y}\n\n", encoding="utf-8")
        with path.open("a", encoding="utf-8") as f:
            f.write(f"- {datetime.now():%H:%M} {text.strip()}\n")
        return path

    def save_conversation(self, title: str, messages: list[dict]) -> Path:
        lines = [f"**{m['role']}**: {m['content']}\n" for m in messages]
        return self.add_note("\n".join(lines), title=f"{datetime.now():%Y-%m-%d} {title}",
                             folder="gesprekken", tags=["gesprek"])

    # ---------- lezen ----------
    def all_notes(self) -> list[Path]:
        return sorted(p for p in self.root.rglob("*.md")
                      if p.is_file() and p.name != "Geheugen.md"
                      and not any(part.startswith(".") for part in p.relative_to(self.root).parts))

    def read(self, rel: str) -> str:
        path = (self.root / rel).resolve()
        if self.root.resolve() not in path.parents:
            raise ValueError("Pad buiten de kluis")
        return path.read_text(encoding="utf-8")

    def rel(self, path: Path) -> str:
        return str(path.relative_to(self.root))

    def search(self, query: str, limit: int = 5, exclude_folders: tuple[str, ...] = ()) -> list[Hit]:
        """BM25-zoeken over alle notities. Geen externe dienst nodig: alles blijft lokaal."""
        q = tokenize(query)
        if not q:
            return []
        docs = []
        for p in self.all_notes():
            if any(self.rel(p).startswith(f) for f in exclude_folders):
                continue
            try:
                text = p.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            docs.append((p, text, tokenize(p.stem + " " + text)))
        if not docs:
            return []
        n = len(docs)
        avg = sum(len(d[2]) for d in docs) / n or 1
        df = Counter(t for d in docs for t in set(d[2]))
        k1, b = 1.5, 0.75
        hits = []
        for path, text, toks in docs:
            tf = Counter(toks)
            score = 0.0
            for t in q:
                if t not in tf:
                    continue
                idf = math.log(1 + (n - df[t] + 0.5) / (df[t] + 0.5))
                score += idf * tf[t] * (k1 + 1) / (tf[t] + k1 * (1 - b + b * len(toks) / avg))
            if score > 0:
                hits.append(Hit(path, path.stem, score, _snippet(text, q)))
        hits.sort(key=lambda h: h.score, reverse=True)
        return hits[:limit]

    def recent(self, limit: int = 10) -> list[Path]:
        return sorted(self.all_notes(), key=lambda p: p.stat().st_mtime, reverse=True)[:limit]

    def inbox(self) -> list[Path]:
        return sorted((self.root / FOLDERS["inbox"]).glob("*.md"))

    def move(self, rel: str, folder: str) -> Path:
        src = (self.root / rel).resolve()
        if self.root.resolve() not in src.parents or not src.exists():
            raise ValueError(f"Notitie niet gevonden: {rel}")
        dest = self._unique(folder, src.stem)
        src.rename(dest)
        return dest


def _snippet(text: str, terms: list[str], width: int = 400) -> str:
    low = text.lower()
    pos = min((i for t in terms if (i := low.find(t)) >= 0), default=0)
    start = max(0, pos - width // 3)
    return text[start:start + width].replace("\n", " ").strip()
