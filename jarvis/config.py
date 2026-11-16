"""Instellingen voor Jarvis, gelezen uit omgevingsvariabelen / .env."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # python-dotenv is optioneel
    pass


@dataclass(frozen=True)
class Settings:
    vault: Path
    default_provider: str
    claude_model: str
    claude_effort: str
    openai_model: str
    password: str
    name: str
    user_name: str

    @property
    def has_claude(self) -> bool:
        return bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))

    @property
    def has_openai(self) -> bool:
        return bool(os.getenv("OPENAI_API_KEY"))


def load_settings() -> Settings:
    return Settings(
        vault=Path(os.getenv("JARVIS_VAULT", "./brein")).expanduser().resolve(),
        default_provider=os.getenv("JARVIS_DEFAULT_PROVIDER", "claude").lower(),
        claude_model=os.getenv("CLAUDE_MODEL", "claude-opus-5-5"),
        claude_effort=os.getenv("CLAUDE_EFFORT", "medium"),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-5"),
        password=os.getenv("JARVIS_PASSWORD", ""),
        name=os.getenv("JARVIS_NAME", "Jarvis"),
        user_name=os.getenv("JARVIS_USER_NAME", ""),
    )
