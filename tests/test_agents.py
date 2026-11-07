"""Tests met een nep-Claude-client: geen API-sleutels of netwerk nodig."""

import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta
from types import SimpleNamespace

os.environ.setdefault("ANTHROPIC_API_KEY", "test")
os.environ["TWILIO_VALIDATE_SIGNATURE"] = "false"
os.environ["WHATSAPP_VERIFY_TOKEN"] = "geheim"
os.environ["WHATSAPP_APP_SECRET"] = "appsecret"

import pytest
from fastapi.testclient import TestClient

from app import agent, db, whatsapp
from app.business import get_business, load_business
from app.main import app
from app.tools import ToolContext, execute_tool


# --- nep-Claude ---------------------------------------------------------------

class Block(SimpleNamespace):
    def to_dict(self):
        return {k: v for k, v in vars(self).items()}


def text(t):
    return Block(type="text", text=t)


def tool(name, args, id="tu_1"):
    return Block(type="tool_use", id=id, name=name, input=args)


class FakeClaude:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self._create))

    async def _create(self, **kwargs):
        self.calls.append(json.loads(json.dumps(kwargs, default=str)))
        content, stop = self.responses.pop(0)
        return SimpleNamespace(content=content, stop_reason=stop)


# Voorbeeldbedrijf met eigen agenda (booking.mode: internal) voor de agenda-tests.
SALON = load_business("examples/kapsalon-eigen-agenda.yaml")


@pytest.fixture(autouse=True)
def fresh_db():
    db.reset_for_tests()
    yield


def next_open_day():
    b = SALON
    d = datetime.now(b.timezone).date() + timedelta(days=1)
    while not b.opening_hours[d.weekday()]:
        d += timedelta(days=1)
    return d


# --- tools --------------------------------------------------------------------

def test_availability_and_booking_blocks_slot():
    b = SALON
    ctx = ToolContext(business=b, channel="whatsapp", customer_phone="31600000001")
    day = next_open_day()
    start = b.opening_hours[day.weekday()][0]

    out = execute_tool(ctx, "check_availability", {"date": day.isoformat(), "service": "Knippen heren"})
    assert f"{start:%H:%M}" in out

    iso = f"{day.isoformat()}T{start:%H:%M}"
    booked = execute_tool(ctx, "book_appointment", {
        "customer_name": "Jan", "service": "knippen heren", "start": iso, "notes": ""})
    assert "Geboekt" in booked

    again = execute_tool(ctx, "book_appointment", {
        "customer_name": "Piet", "service": "Knippen heren", "start": iso, "notes": ""})
    assert "niet (meer) beschikbaar" in again

    assert "Jan" in execute_tool(ctx, "list_my_appointments", {})
    other = ToolContext(business=b, channel="voice", customer_phone="31600000002")
    assert "Geen actieve afspraak" in execute_tool(other, "cancel_appointment", {"appointment_id": 1})
    assert "geannuleerd" in execute_tool(ctx, "cancel_appointment", {"appointment_id": 1})


def test_closed_day():
    b = SALON
    ctx = ToolContext(business=b, channel="whatsapp", customer_phone="1")
    d = datetime.now(b.timezone).date() + timedelta(days=1)
    while b.opening_hours[d.weekday()]:
        d += timedelta(days=1)
    assert "gesloten" in execute_tool(ctx, "check_availability", {"date": d.isoformat(), "service": "Kleuren"})


# --- agent-loop ---------------------------------------------------------------

async def test_agent_tool_loop_and_history():
    day = next_open_day()
    fake = FakeClaude([
        ([tool("check_availability", {"date": day.isoformat(), "service": "Kleuren"})], "tool_use"),
        ([text("Er is plek om 09:00. Zal ik die boeken?")], "end_turn"),
        ([text("Graag gedaan!")], "end_turn"),
    ])
    r1 = await agent.handle_message("whatsapp", "316", "316", "Kan ik morgen kleuren?", business=SALON, client=fake)
    assert r1.text.startswith("Er is plek")
    req = fake.calls[0]
    assert req["fallbacks"] == "default" and req["thinking"] == {"type": "adaptive"}
    assert {t["name"] for t in req["tools"]} >= {"check_availability", "handoff_to_human"}
    assert "end_call" not in {t["name"] for t in req["tools"]}

    await agent.handle_message("whatsapp", "316", "316", "Dank je", business=SALON, client=fake)
    # Geschiedenis is append-only: het eerdere verzoek is een prefix van het nieuwe.
    first, last = fake.calls[1]["messages"], fake.calls[2]["messages"]
    assert last[: len(first)] == first
    assert last[len(first)]["role"] == "assistant"


async def test_handoff_and_end_call_flags():
    fake = FakeClaude([
        ([tool("handoff_to_human", {"reason": "klacht", "summary": "boos"})], "tool_use"),
        ([text("Ik verbind u door.")], "end_turn"),
    ])
    r = await agent.handle_message("voice", "CA1", "+316", "Ik wil een klacht indienen", business=SALON, client=fake)
    assert r.handoff_reason.startswith("klacht")
    assert "end_call" in {t["name"] for t in fake.calls[0]["tools"]}

    fake = FakeClaude([([text("Tot ziens!"), tool("end_call", {})], "tool_use"), ([], "end_turn")])
    r = await agent.handle_message("voice", "CA2", "+316", "Dat was het, doei", business=SALON, client=fake)
    assert r.end_call and r.text == "Tot ziens!"


async def test_refusal_gives_polite_reply():
    fake = FakeClaude([([], "refusal")])
    r = await agent.handle_message("whatsapp", "317", "317", "...", business=SALON, client=fake)
    assert "medewerker" in r.text


# --- WhatsApp webhook ---------------------------------------------------------

def test_whatsapp_verify():
    c = TestClient(app)
    ok = c.get("/whatsapp/webhook", params={"hub.mode": "subscribe", "hub.verify_token": "geheim", "hub.challenge": "42"})
    assert ok.status_code == 200 and ok.text == "42"
    bad = c.get("/whatsapp/webhook", params={"hub.mode": "subscribe", "hub.verify_token": "fout", "hub.challenge": "42"})
    assert bad.status_code == 403


def test_whatsapp_message_flow(monkeypatch):
    sent = []

    async def fake_send(to, body):
        sent.append((to, body))

    async def fake_read(_):
        pass

    async def fake_handle(channel, key, phone, text_in):
        return agent.AgentReply(text=f"echo: {text_in}")

    monkeypatch.setattr(whatsapp, "send_text", fake_send)
    monkeypatch.setattr(whatsapp, "mark_read", fake_read)
    monkeypatch.setattr(whatsapp, "handle_message", fake_handle)

    payload = {"entry": [{"changes": [{"value": {
        "contacts": [{"wa_id": "31611111111", "profile": {"name": "Sanne"}}],
        "messages": [{"id": "wamid.1", "from": "31611111111", "type": "text", "text": {"body": "Hoi"}}],
    }}]}]}
    body = json.dumps(payload).encode()
    sig = "sha256=" + hmac.new(b"appsecret", body, hashlib.sha256).hexdigest()

    c = TestClient(app)
    assert c.post("/whatsapp/webhook", content=body, headers={"X-Hub-Signature-256": "sha256=00"}).status_code == 401
    for _ in range(2):  # tweede keer = duplicaat, moet genegeerd worden
        assert c.post("/whatsapp/webhook", content=body, headers={"X-Hub-Signature-256": sig}).status_code == 200
    assert sent == [("31611111111", "echo: (WhatsApp-naam: Sanne)\nHoi")]


# --- Telefoon (Twilio) --------------------------------------------------------

def test_voice_incoming_and_respond(monkeypatch):
    async def fake_handle(channel, key, phone, text_in):
        assert channel == "voice" and key == "CA9" and phone == "+31622222222"
        return agent.AgentReply(text="Morgen om tien uur is er plek.")

    from app import voice
    monkeypatch.setattr(voice, "handle_message", fake_handle)
    c = TestClient(app)

    r = c.post("/voice/incoming", data={"CallSid": "CA9", "From": "+31622222222", "Direction": "inbound"})
    assert "<Gather" in r.text and "Functional Performance" in r.text

    r = c.post("/voice/respond", data={"CallSid": "CA9", "From": "+31622222222", "SpeechResult": "Kan ik morgen?"})
    assert "Morgen om tien uur" in r.text and "<Gather" in r.text

    r = c.post("/voice/respond?silent=2", data={"CallSid": "CA9", "From": "+31622222222", "SpeechResult": ""})
    assert "<Hangup" in r.text


# --- Functional Performance (booking.mode: link) -----------------------------

def test_fp_profile_uses_links_not_internal_agenda():
    fp = get_business()
    assert fp.name == "Functional Performance" and fp.booking_mode == "link"
    names = {t["name"] for t in agent.tools_for("whatsapp", fp.booking_mode)}
    assert names == {"request_callback", "handoff_to_human"}
    prompt = agent.system_prompt(fp, "whatsapp")
    assert "flux.healthcare/schedule/functional-performance" in prompt
    assert "Noorderhavenkade 158C" in prompt and "Wijnhaven 66" in prompt
    assert "€ 49" in prompt
    assert "Noem geen URL's" in agent.system_prompt(fp, "voice")


async def test_fp_callback_request_notifies_owner():
    fake = FakeClaude([
        ([tool("request_callback", {"customer_name": "Sanne", "reason": "afspraak verzetten", "preference": "Centrum"})], "tool_use"),
        ([text("Top, we bellen je binnen een werkdag terug.")], "end_turn"),
    ])
    r = await agent.handle_message("whatsapp", "31612", "31612", "Ik wil mijn afspraak verzetten", client=fake)
    assert "terug" in r.text
    assert len(r.notifications) == 1 and "Sanne" in r.notifications[0] and "+31612" in r.notifications[0]
