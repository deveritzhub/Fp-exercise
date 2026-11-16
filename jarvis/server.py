"""Webinterface + API voor Jarvis (ook bruikbaar vanaf je telefoon)."""

from __future__ import annotations

import hmac
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from .brain import Jarvis

STATIC = Path(__file__).parent / "static"


class Message(BaseModel):
    message: str


def create_app(jarvis: Jarvis | None = None) -> FastAPI:
    j = jarvis or Jarvis()
    app = FastAPI(title=j.s.name, docs_url=None, redoc_url=None)

    def auth(x_jarvis_key: str = Header(default="")) -> None:
        if j.s.password and not hmac.compare_digest(x_jarvis_key, j.s.password):
            raise HTTPException(status_code=401, detail="Verkeerd wachtwoord")

    @app.get("/")
    def index():
        return FileResponse(STATIC / "index.html")

    @app.get("/api/status", dependencies=[Depends(auth)])
    def status():
        return {
            "name": j.s.name,
            "provider": j.provider_name,
            "claude": j.s.has_claude,
            "chatgpt": j.s.has_openai,
            "notes": len(j.vault.all_notes()),
            "facts": len(j.memory.facts()),
        }

    @app.post("/api/chat", dependencies=[Depends(auth)])
    def chat(msg: Message):
        return StreamingResponse(j.handle(msg.message), media_type="text/plain; charset=utf-8")

    @app.post("/api/capture", dependencies=[Depends(auth)])
    def capture(msg: Message):
        """Snel vastleggen, bijv. via een iPhone-opdracht of Android-widget."""
        return {"saved": j.vault.rel(j.vault.add_note(msg.message))}

    @app.get("/api/auth-required")
    def auth_required():
        return {"required": bool(j.s.password)}

    return app
