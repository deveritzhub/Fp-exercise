"""Tools die Claude kan gebruiken: agenda bekijken, afspraken maken/annuleren, doorverbinden."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

from . import db
from .business import WEEKDAYS, Business

SLOT_STEP_MINUTES = 30
MAX_DAYS_AHEAD = 60


@dataclass
class ToolContext:
    business: Business
    channel: str              # 'whatsapp' | 'voice'
    customer_phone: str
    # Zet door tools; de kanaal-code (WhatsApp/telefoon) handelt dit af na het antwoord.
    handoff_reason: str | None = None
    end_call: bool = False
    events: list[str] = field(default_factory=list)


def _schema(properties: dict, required: list[str]) -> dict:
    return {
        "type": "object",
        "properties": properties,
        "required": required,
        "additionalProperties": False,
    }


TOOLS: list[dict] = [
    {
        "name": "check_availability",
        "description": (
            "Geeft de vrije tijdsloten voor een dienst op een bepaalde datum. Gebruik dit altijd "
            "voordat je een tijd voorstelt of een afspraak boekt."
        ),
        "input_schema": _schema(
            {
                "date": {"type": "string", "description": "Datum als YYYY-MM-DD"},
                "service": {"type": "string", "description": "Naam van de dienst"},
            },
            ["date", "service"],
        ),
        "strict": True,
    },
    {
        "name": "book_appointment",
        "description": (
            "Boekt een afspraak. Alleen gebruiken nadat de klant de dienst, datum, tijd en naam "
            "expliciet heeft bevestigd."
        ),
        "input_schema": _schema(
            {
                "customer_name": {"type": "string"},
                "service": {"type": "string"},
                "start": {"type": "string", "description": "Starttijd als YYYY-MM-DDTHH:MM (lokale tijd)"},
                "notes": {"type": "string", "description": "Eventuele opmerkingen, anders leeg"},
            },
            ["customer_name", "service", "start", "notes"],
        ),
        "strict": True,
    },
    {
        "name": "list_my_appointments",
        "description": "Toont de komende afspraken van deze klant (op basis van het telefoonnummer).",
        "input_schema": _schema({}, []),
        "strict": True,
    },
    {
        "name": "cancel_appointment",
        "description": "Annuleert een afspraak van deze klant. Vraag eerst om bevestiging.",
        "input_schema": _schema({"appointment_id": {"type": "integer"}}, ["appointment_id"]),
        "strict": True,
    },
    {
        "name": "handoff_to_human",
        "description": (
            "Draagt het gesprek over aan een medewerker. Gebruik dit bij klachten, als de klant "
            "om een mens vraagt, of als je de vraag niet met de beschikbare informatie kunt "
            "beantwoorden."
        ),
        "input_schema": _schema(
            {
                "reason": {"type": "string"},
                "summary": {"type": "string", "description": "Korte samenvatting voor de medewerker"},
            },
            ["reason", "summary"],
        ),
        "strict": True,
    },
]

VOICE_ONLY_TOOLS: list[dict] = [
    {
        "name": "end_call",
        "description": (
            "Beëindigt het telefoongesprek na jouw laatste zin. Gebruik dit als de klant klaar is "
            "of afscheid neemt; zeg in dezelfde beurt eerst gedag."
        ),
        "input_schema": _schema({}, []),
        "strict": True,
    },
]


def tools_for(channel: str) -> list[dict]:
    return TOOLS + (VOICE_ONLY_TOOLS if channel == "voice" else [])


# --- implementaties -----------------------------------------------------------

def _fmt(dt: datetime) -> str:
    return f"{WEEKDAYS[dt.weekday()]} {dt:%d-%m-%Y %H:%M}"


def free_slots(business: Business, day: date, duration: int, now: datetime) -> list[datetime]:
    hours = business.opening_hours[day.weekday()]
    if not hours:
        return []
    tz = business.timezone
    open_at = datetime.combine(day, hours[0], tzinfo=tz)
    close_at = datetime.combine(day, hours[1], tzinfo=tz)
    booked = db.appointments_between(open_at, close_at)
    busy = [(datetime.fromisoformat(a["start"]), datetime.fromisoformat(a["end"])) for a in booked]

    slots = []
    t = open_at
    while t + timedelta(minutes=duration) <= close_at:
        end = t + timedelta(minutes=duration)
        if t > now and not any(s < end and t < e for s, e in busy):
            slots.append(t)
        t += timedelta(minutes=SLOT_STEP_MINUTES)
    return slots


def _check_availability(ctx: ToolContext, date_str: str, service_name: str) -> str:
    service = ctx.business.service(service_name)
    if not service:
        return f"Onbekende dienst '{service_name}'. Beschikbaar: " + ", ".join(
            s.name for s in ctx.business.services
        )
    try:
        day = date.fromisoformat(date_str)
    except ValueError:
        return "Ongeldige datum, gebruik YYYY-MM-DD."
    now = datetime.now(ctx.business.timezone)
    if day < now.date():
        return "Die datum ligt in het verleden."
    if day > now.date() + timedelta(days=MAX_DAYS_AHEAD):
        return f"Je kunt maximaal {MAX_DAYS_AHEAD} dagen vooruit boeken."
    if not ctx.business.opening_hours[day.weekday()]:
        return f"Op {WEEKDAYS[day.weekday()]} {day:%d-%m-%Y} zijn we gesloten."
    slots = free_slots(ctx.business, day, service.duration_minutes, now)
    if not slots:
        return f"Geen vrije plekken voor {service.name} op {day:%d-%m-%Y}."
    return (
        f"Vrije starttijden voor {service.name} ({service.duration_minutes} min) op "
        f"{WEEKDAYS[day.weekday()]} {day:%d-%m-%Y}: " + ", ".join(f"{s:%H:%M}" for s in slots)
    )


def _book(ctx: ToolContext, name: str, service_name: str, start_str: str, notes: str) -> str:
    service = ctx.business.service(service_name)
    if not service:
        return f"Onbekende dienst '{service_name}'."
    try:
        start = datetime.fromisoformat(start_str)
    except ValueError:
        return "Ongeldige starttijd, gebruik YYYY-MM-DDTHH:MM."
    if start.tzinfo is None:
        start = start.replace(tzinfo=ctx.business.timezone)
    now = datetime.now(ctx.business.timezone)
    if start not in free_slots(ctx.business, start.date(), service.duration_minutes, now):
        return "Dit tijdstip is niet (meer) beschikbaar. Controleer de beschikbaarheid opnieuw."
    end = start + timedelta(minutes=service.duration_minutes)
    appt_id = db.create_appointment(
        customer_name=name.strip(),
        customer_phone=ctx.customer_phone,
        service=service.name,
        start=start.isoformat(),
        end=end.isoformat(),
        notes=notes.strip(),
        channel=ctx.channel,
    )
    ctx.events.append(f"Afspraak #{appt_id} geboekt: {service.name} {_fmt(start)} voor {name}")
    return f"Geboekt. Afspraaknummer {appt_id}: {service.name} op {_fmt(start)} tot {end:%H:%M}."


def _list(ctx: ToolContext) -> str:
    appts = db.appointments_for_phone(ctx.customer_phone)
    if not appts:
        return "Deze klant heeft geen komende afspraken."
    return "\n".join(
        f"#{a['id']}: {a['service']} op {_fmt(datetime.fromisoformat(a['start']))} ({a['customer_name']})"
        for a in appts
    )


def _cancel(ctx: ToolContext, appointment_id: int) -> str:
    if db.cancel_appointment(appointment_id, ctx.customer_phone):
        ctx.events.append(f"Afspraak #{appointment_id} geannuleerd")
        return f"Afspraak {appointment_id} is geannuleerd."
    return "Geen actieve afspraak met dat nummer gevonden voor deze klant."


def execute_tool(ctx: ToolContext, name: str, args: dict) -> str:
    if name == "check_availability":
        return _check_availability(ctx, args["date"], args["service"])
    if name == "book_appointment":
        return _book(ctx, args["customer_name"], args["service"], args["start"], args.get("notes", ""))
    if name == "list_my_appointments":
        return _list(ctx)
    if name == "cancel_appointment":
        return _cancel(ctx, int(args["appointment_id"]))
    if name == "handoff_to_human":
        ctx.handoff_reason = f"{args['reason']} — {args['summary']}"
        if ctx.channel == "voice":
            return "Overdracht gestart. Zeg de klant dat je doorverbindt met een medewerker."
        return "Overdracht gestart. Laat de klant weten dat een medewerker zo snel mogelijk reageert."
    if name == "end_call":
        ctx.end_call = True
        return "Het gesprek wordt na je laatste zin beëindigd."
    raise ValueError(f"Onbekende tool: {name}")
