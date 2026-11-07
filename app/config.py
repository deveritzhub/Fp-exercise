"""Instellingen uit omgevingsvariabelen (.env)."""

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


@dataclass(frozen=True)
class Settings:
    # Claude
    claude_model: str = field(default_factory=lambda: _env("CLAUDE_MODEL", "claude-opus-5-5"))
    claude_effort: str = field(default_factory=lambda: _env("CLAUDE_EFFORT", "low"))

    # Bedrijfsprofiel + opslag
    business_file: str = field(default_factory=lambda: _env("BUSINESS_FILE", "business.yaml"))
    database_path: str = field(default_factory=lambda: _env("DATABASE_PATH", "data/agent.db"))
    public_base_url: str = field(default_factory=lambda: _env("PUBLIC_BASE_URL").rstrip("/"))

    # WhatsApp Cloud API (Meta)
    whatsapp_token: str = field(default_factory=lambda: _env("WHATSAPP_TOKEN"))
    whatsapp_phone_number_id: str = field(default_factory=lambda: _env("WHATSAPP_PHONE_NUMBER_ID"))
    whatsapp_verify_token: str = field(default_factory=lambda: _env("WHATSAPP_VERIFY_TOKEN"))
    whatsapp_app_secret: str = field(default_factory=lambda: _env("WHATSAPP_APP_SECRET"))
    whatsapp_api_version: str = field(default_factory=lambda: _env("WHATSAPP_API_VERSION", "v21.0"))

    # Twilio (telefoon)
    twilio_account_sid: str = field(default_factory=lambda: _env("TWILIO_ACCOUNT_SID"))
    twilio_auth_token: str = field(default_factory=lambda: _env("TWILIO_AUTH_TOKEN"))
    twilio_phone_number: str = field(default_factory=lambda: _env("TWILIO_PHONE_NUMBER"))
    twilio_validate_signature: bool = field(
        default_factory=lambda: _env("TWILIO_VALIDATE_SIGNATURE", "true").lower() != "false"
    )
    voice_language: str = field(default_factory=lambda: _env("VOICE_LANGUAGE", "nl-NL"))
    voice_name: str = field(default_factory=lambda: _env("VOICE_NAME", "Google.nl-NL-Standard-A"))

    # Eigenaar / medewerker voor overdracht
    owner_whatsapp: str = field(default_factory=lambda: _env("OWNER_WHATSAPP"))
    owner_phone: str = field(default_factory=lambda: _env("OWNER_PHONE"))

    # Admin-endpoint (uitgaande gesprekken starten)
    admin_api_key: str = field(default_factory=lambda: _env("ADMIN_API_KEY"))


settings = Settings()
