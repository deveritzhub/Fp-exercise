"""Bel-agent via Twilio Voice: spraak -> tekst (Twilio) -> Claude -> tekst -> spraak (Twilio)."""

from __future__ import annotations

import hmac
import logging
from urllib.parse import urlencode

from fastapi import APIRouter, Header, HTTPException, Request, Response
from pydantic import BaseModel
from twilio.request_validator import RequestValidator
from twilio.rest import Client as TwilioClient
from twilio.twiml.voice_response import Gather, VoiceResponse

from .agent import handle_message
from .business import get_business
from .config import settings
from .whatsapp import notify_owner, send_text

log = logging.getLogger(__name__)
router = APIRouter(prefix="/voice", tags=["voice"])

MAX_SILENT_TURNS = 2


def _twiml(vr: VoiceResponse) -> Response:
    return Response(content=str(vr), media_type="application/xml")


def _say(target, text: str) -> None:
    target.say(text, voice=settings.voice_name, language=settings.voice_language)


def _gather(vr: VoiceResponse, prompt: str | None, silent: int = 0) -> None:
    gather = Gather(
        input="speech",
        language=settings.voice_language,
        speech_timeout="auto",
        action=f"/voice/respond?{urlencode({'silent': silent})}",
        method="POST",
        action_on_empty_result=True,
    )
    if prompt:
        _say(gather, prompt)
    vr.append(gather)


async def _validated_form(request: Request) -> dict:
    form = dict(await request.form())
    if not settings.twilio_validate_signature:
        return form
    if not settings.twilio_auth_token:
        raise HTTPException(status_code=500, detail="TWILIO_AUTH_TOKEN ontbreekt")
    # Achter een proxy/tunnel is request.url vaak http://; gebruik de publieke URL.
    url = str(request.url)
    if settings.public_base_url:
        url = settings.public_base_url + request.url.path
        if request.url.query:
            url += "?" + request.url.query
    validator = RequestValidator(settings.twilio_auth_token)
    if not validator.validate(url, form, request.headers.get("X-Twilio-Signature", "")):
        raise HTTPException(status_code=403, detail="Ongeldige Twilio-handtekening")
    return form


def _customer_number(form: dict) -> str:
    # Bij uitgaande gesprekken is de klant 'To', bij inkomende 'From'.
    if form.get("Direction", "").startswith("outbound"):
        return form.get("To", "onbekend")
    return form.get("From", "onbekend")


async def _respond(form: dict, user_text: str) -> Response:
    call_sid = form.get("CallSid", "onbekend")
    phone = _customer_number(form)
    reply = await handle_message("voice", call_sid, phone, user_text)
    await notify_owner(reply.notifications)

    vr = VoiceResponse()
    if reply.handoff_reason:
        _say(vr, reply.text)
        if settings.owner_whatsapp:
            await send_text(
                settings.owner_whatsapp,
                f"📞 Doorverbonden beller {phone}\n{reply.handoff_reason}",
            )
        if settings.owner_phone:
            vr.dial(settings.owner_phone, caller_id=settings.twilio_phone_number or None)
        else:
            _say(vr, "Er is op dit moment geen medewerker bereikbaar. We bellen u zo snel mogelijk terug.")
            vr.hangup()
        return _twiml(vr)

    if reply.end_call:
        _say(vr, reply.text)
        vr.hangup()
        return _twiml(vr)

    _gather(vr, reply.text)
    # Geen reactie binnen de Gather: Twilio valt hierop door.
    vr.redirect("/voice/respond?silent=1", method="POST")
    return _twiml(vr)


@router.post("/incoming")
async def incoming_call(request: Request) -> Response:
    """Twilio roept dit aan als er gebeld wordt (of een uitgaand gesprek wordt opgenomen)."""
    form = await _validated_form(request)
    purpose = request.query_params.get("purpose")
    if purpose:
        # Uitgaand gesprek: laat Claude zelf de openingszin maken op basis van het doel.
        return await _respond(
            form,
            f"(Uitgaand gesprek dat jij namens het bedrijf voert; de klant heeft net opgenomen. "
            f"Doel van het gesprek: {purpose}. Stel jezelf kort voor en begin het gesprek.)",
        )

    business = get_business()
    vr = VoiceResponse()
    _gather(
        vr,
        f"Goedendag, u spreekt met de digitale assistent van {business.name}. Waarmee kan ik u helpen?",
    )
    vr.redirect("/voice/respond?silent=1", method="POST")
    return _twiml(vr)


@router.post("/respond")
async def respond(request: Request) -> Response:
    form = await _validated_form(request)
    speech = (form.get("SpeechResult") or "").strip()
    silent = int(request.query_params.get("silent", "0") or 0)

    if not speech:
        vr = VoiceResponse()
        if silent >= MAX_SILENT_TURNS:
            _say(vr, "Ik hoor u helaas niet. Bel gerust nog een keer of stuur ons een WhatsApp. Tot ziens!")
            vr.hangup()
        else:
            _gather(vr, "Sorry, ik verstond u niet. Kunt u dat herhalen?", silent=silent + 1)
            vr.redirect(f"/voice/respond?silent={silent + 1}", method="POST")
        return _twiml(vr)

    log.info("Beller %s zegt: %s", _customer_number(form), speech)
    return await _respond(form, speech)


class OutboundCall(BaseModel):
    to: str          # E.164, bijv. +31612345678
    purpose: str     # bijv. "Afspraak van morgen 10:00 bevestigen"


@router.post("/outbound")
async def start_outbound_call(call: OutboundCall, x_api_key: str = Header(default="")) -> dict:
    """Start een uitgaand gesprek waarin de agent zelf belt (bijv. afspraakherinnering)."""
    if not settings.admin_api_key or not hmac.compare_digest(x_api_key, settings.admin_api_key):
        raise HTTPException(status_code=401, detail="Ongeldige API-sleutel")
    if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_phone_number):
        raise HTTPException(status_code=500, detail="Twilio is niet geconfigureerd")
    if not settings.public_base_url:
        raise HTTPException(status_code=500, detail="PUBLIC_BASE_URL is niet gezet")

    client = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)
    created = client.calls.create(
        to=call.to,
        from_=settings.twilio_phone_number,
        url=f"{settings.public_base_url}/voice/incoming?{urlencode({'purpose': call.purpose})}",
        method="POST",
    )
    return {"call_sid": created.sid, "status": created.status}
