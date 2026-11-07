"""WhatsApp Business-agent via de Meta WhatsApp Cloud API."""

from __future__ import annotations

import hashlib
import hmac
import logging

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response

from . import db
from .agent import handle_message
from .config import settings

log = logging.getLogger(__name__)
router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

MAX_WHATSAPP_CHARS = 4096


def _graph_url() -> str:
    return (
        f"https://graph.facebook.com/{settings.whatsapp_api_version}/"
        f"{settings.whatsapp_phone_number_id}/messages"
    )


async def send_text(to: str, text: str) -> None:
    if not settings.whatsapp_token:
        log.warning("WHATSAPP_TOKEN ontbreekt; bericht aan %s niet verstuurd: %s", to, text)
        return
    async with httpx.AsyncClient(timeout=20) as http:
        for start in range(0, len(text), MAX_WHATSAPP_CHARS):
            r = await http.post(
                _graph_url(),
                headers={"Authorization": f"Bearer {settings.whatsapp_token}"},
                json={
                    "messaging_product": "whatsapp",
                    "to": to,
                    "type": "text",
                    "text": {"body": text[start:start + MAX_WHATSAPP_CHARS], "preview_url": False},
                },
            )
            if r.status_code >= 400:
                log.error("WhatsApp verzenden mislukt (%s): %s", r.status_code, r.text)


async def mark_read(message_id: str) -> None:
    if not settings.whatsapp_token:
        return
    async with httpx.AsyncClient(timeout=10) as http:
        await http.post(
            _graph_url(),
            headers={"Authorization": f"Bearer {settings.whatsapp_token}"},
            json={"messaging_product": "whatsapp", "status": "read", "message_id": message_id},
        )


async def notify_owner(messages: list[str]) -> None:
    for m in messages:
        if settings.owner_whatsapp:
            await send_text(settings.owner_whatsapp, m)
        else:
            log.info("Melding voor eigenaar (OWNER_WHATSAPP niet gezet): %s", m)


def verify_signature(body: bytes, signature_header: str | None) -> bool:
    """Controleert X-Hub-Signature-256 zodat alleen Meta je webhook kan aanroepen."""
    if not settings.whatsapp_app_secret:
        log.warning("WHATSAPP_APP_SECRET niet gezet: handtekening wordt NIET gecontroleerd")
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(settings.whatsapp_app_secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header.removeprefix("sha256="))


@router.get("/webhook")
async def verify_webhook(request: Request) -> Response:
    """Verificatie-handshake die Meta doet bij het instellen van de webhook."""
    p = request.query_params
    if (
        p.get("hub.mode") == "subscribe"
        and settings.whatsapp_verify_token
        and hmac.compare_digest(p.get("hub.verify_token", ""), settings.whatsapp_verify_token)
    ):
        return Response(content=p.get("hub.challenge", ""), media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verificatie mislukt")


def _extract_text(msg: dict) -> str | None:
    kind = msg.get("type")
    if kind == "text":
        return msg["text"]["body"]
    if kind == "button":
        return msg["button"].get("text")
    if kind == "interactive":
        inter = msg["interactive"]
        reply = inter.get("button_reply") or inter.get("list_reply") or {}
        return reply.get("title")
    return None


async def _handle_owner_command(text: str) -> bool:
    """Eigenaar kan '#bot 316...' sturen om de bot weer te laten antwoorden na een overdracht."""
    parts = text.strip().split()
    if len(parts) == 2 and parts[0].lower() == "#bot":
        number = parts[1].lstrip("+")
        conv = db.get_or_create_conversation("whatsapp", number, number)
        db.set_conversation_status(conv["id"], "active")
        await send_text(settings.owner_whatsapp, f"De assistent neemt het gesprek met +{number} weer over.")
        return True
    return False


async def process_message(msg: dict, contact_name: str | None) -> None:
    sender = msg["from"]  # internationaal formaat zonder '+', bijv. 31612345678
    if not db.mark_processed(msg["id"]):
        return  # Meta stuurt webhooks soms dubbel
    await mark_read(msg["id"])

    text = _extract_text(msg)
    if settings.owner_whatsapp and sender == settings.owner_whatsapp.lstrip("+") and text:
        if await _handle_owner_command(text):
            return

    if text is None:
        await send_text(sender, "Ik kan op dit moment alleen tekstberichten lezen. Wil je je vraag typen?")
        return
    if contact_name:
        text = f"(WhatsApp-naam: {contact_name})\n{text}"

    conv = db.get_or_create_conversation("whatsapp", sender, sender)
    if conv["status"] == "handoff":
        # Een medewerker heeft het gesprek; de bot zwijgt en stuurt het bericht door.
        if settings.owner_whatsapp:
            await send_text(settings.owner_whatsapp, f"Bericht van +{sender}:\n{text}")
        return

    reply = await handle_message("whatsapp", sender, sender, text)
    await send_text(sender, reply.text)
    await notify_owner(reply.notifications)

    if reply.handoff_reason and settings.owner_whatsapp:
        await send_text(
            settings.owner_whatsapp,
            f"🔔 Overdracht WhatsApp-klant +{sender}\n{reply.handoff_reason}\n\n"
            f"Antwoord de klant direct via WhatsApp Business. Stuur '#bot {sender}' om de "
            f"assistent het weer te laten overnemen.",
        )


@router.post("/webhook")
async def receive_webhook(request: Request, background: BackgroundTasks) -> dict:
    body = await request.body()
    if not verify_signature(body, request.headers.get("X-Hub-Signature-256")):
        raise HTTPException(status_code=401, detail="Ongeldige handtekening")
    payload = await request.json()

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            names = {c.get("wa_id"): c.get("profile", {}).get("name") for c in value.get("contacts", [])}
            for msg in value.get("messages", []):
                # Direct 200 teruggeven aan Meta; Claude draait op de achtergrond.
                background.add_task(process_message, msg, names.get(msg.get("from")))
    return {"status": "ok"}
