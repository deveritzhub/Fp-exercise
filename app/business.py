"""Bedrijfsprofiel (business.yaml): naam, openingstijden, diensten, FAQ."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import time
from functools import lru_cache
from zoneinfo import ZoneInfo

import yaml

from .config import settings

WEEKDAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"]


@dataclass
class Service:
    name: str
    duration_minutes: int
    price: str = ""
    description: str = ""


@dataclass
class Business:
    name: str
    description: str
    timezone: ZoneInfo
    language: str
    tone: str
    address: str
    phone: str
    email: str
    website: str
    # weekday index (0 = maandag) -> (open, dicht) of None als gesloten
    opening_hours: dict[int, tuple[time, time] | None]
    services: list[Service]
    faq: list[dict[str, str]] = field(default_factory=list)
    policies: list[str] = field(default_factory=list)
    extra_instructions: str = ""

    def service(self, name: str) -> Service | None:
        wanted = name.strip().lower()
        for s in self.services:
            if s.name.lower() == wanted:
                return s
        for s in self.services:
            if wanted in s.name.lower() or s.name.lower() in wanted:
                return s
        return None


def _parse_hours(raw: dict) -> dict[int, tuple[time, time] | None]:
    hours: dict[int, tuple[time, time] | None] = {i: None for i in range(7)}
    for day, value in (raw or {}).items():
        idx = WEEKDAYS.index(str(day).lower())
        if not value or str(value).lower() in {"gesloten", "closed"}:
            continue
        start, end = str(value).split("-")
        hours[idx] = (time.fromisoformat(start.strip()), time.fromisoformat(end.strip()))
    return hours


def load_business(path: str | None = None) -> Business:
    with open(path or settings.business_file, encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    return Business(
        name=raw["name"],
        description=raw.get("description", ""),
        timezone=ZoneInfo(raw.get("timezone", "Europe/Amsterdam")),
        language=raw.get("language", "Nederlands"),
        tone=raw.get("tone", "vriendelijk en professioneel"),
        address=raw.get("address", ""),
        phone=raw.get("phone", ""),
        email=raw.get("email", ""),
        website=raw.get("website", ""),
        opening_hours=_parse_hours(raw.get("opening_hours", {})),
        services=[Service(**s) for s in raw.get("services", [])],
        faq=raw.get("faq", []),
        policies=raw.get("policies", []),
        extra_instructions=raw.get("extra_instructions", ""),
    )


@lru_cache
def get_business() -> Business:
    return load_business()


def business_summary(b: Business) -> str:
    """Bedrijfsinformatie als tekst voor de systeemprompt (stabiel -> goed te cachen)."""
    lines = [f"# {b.name}", b.description, ""]
    contact = [
        ("Adres", b.address), ("Telefoon", b.phone), ("E-mail", b.email), ("Website", b.website),
    ]
    lines += [f"- {k}: {v}" for k, v in contact if v]
    lines += ["", "## Openingstijden"]
    for i, day in enumerate(WEEKDAYS):
        h = b.opening_hours[i]
        lines.append(f"- {day}: {h[0]:%H:%M}-{h[1]:%H:%M}" if h else f"- {day}: gesloten")
    lines += ["", "## Diensten"]
    for s in b.services:
        extra = f", {s.price}" if s.price else ""
        desc = f" - {s.description}" if s.description else ""
        lines.append(f"- {s.name} ({s.duration_minutes} min{extra}){desc}")
    if b.faq:
        lines += ["", "## Veelgestelde vragen"]
        for item in b.faq:
            lines += [f"V: {item['q']}", f"A: {item['a']}", ""]
    if b.policies:
        lines += ["", "## Beleid"] + [f"- {p}" for p in b.policies]
    return "\n".join(lines).strip()
