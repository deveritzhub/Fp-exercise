"""SQLite-opslag: gesprekken (per klant/kanaal), afspraken en overdrachten."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
from contextlib import contextmanager
from datetime import datetime

from .config import settings

_lock = threading.Lock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,          -- 'whatsapp' of 'voice'
    session_key TEXT NOT NULL,      -- telefoonnummer (whatsapp) of CallSid (voice)
    customer_phone TEXT NOT NULL,
    messages TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',   -- active | handoff | closed
    updated_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conv_session ON conversations(channel, session_key);

CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    service TEXT NOT NULL,
    start TEXT NOT NULL,            -- ISO 8601 met tijdzone
    end TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'booked',   -- booked | cancelled
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS callback_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    reason TEXT NOT NULL,
    preference TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',     -- open | done
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS processed_messages (
    message_id TEXT PRIMARY KEY,
    created_at REAL NOT NULL
);
"""


def _connect() -> sqlite3.Connection:
    path = settings.database_path
    if path != ":memory:":
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


_conn: sqlite3.Connection | None = None


@contextmanager
def db():
    global _conn
    with _lock:
        if _conn is None:
            _conn = _connect()
        yield _conn
        _conn.commit()


def reset_for_tests(path: str = ":memory:") -> None:
    global _conn
    with _lock:
        _conn = sqlite3.connect(path, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.executescript(SCHEMA)


# --- gesprekken ---------------------------------------------------------------

# Na zoveel uur stilte begint een WhatsApp-klant een nieuw gesprek. Zo groeit de
# geschiedenis niet eindeloos en hoeven we nooit oude berichten weg te knippen
# (de geschiedenis blijft append-only, wat Claude vereist voor thinking-blokken).
CONVERSATION_IDLE_HOURS = 24


def get_or_create_conversation(channel: str, session_key: str, customer_phone: str) -> dict:
    now = time.time()
    with db() as c:
        row = c.execute(
            "SELECT * FROM conversations WHERE channel=? AND session_key=? AND status!='closed' "
            "ORDER BY id DESC LIMIT 1",
            (channel, session_key),
        ).fetchone()
        if row and now - row["updated_at"] > CONVERSATION_IDLE_HOURS * 3600:
            c.execute("UPDATE conversations SET status='closed' WHERE id=?", (row["id"],))
            row = None
        if row is None:
            cur = c.execute(
                "INSERT INTO conversations(channel, session_key, customer_phone, updated_at) "
                "VALUES (?,?,?,?)",
                (channel, session_key, customer_phone, now),
            )
            row = c.execute("SELECT * FROM conversations WHERE id=?", (cur.lastrowid,)).fetchone()
    conv = dict(row)
    conv["messages"] = json.loads(conv["messages"])
    return conv


def save_messages(conversation_id: int, messages: list) -> None:
    with db() as c:
        c.execute(
            "UPDATE conversations SET messages=?, updated_at=? WHERE id=?",
            (json.dumps(messages, ensure_ascii=False), time.time(), conversation_id),
        )


def set_conversation_status(conversation_id: int, status: str) -> None:
    with db() as c:
        c.execute("UPDATE conversations SET status=? WHERE id=?", (status, conversation_id))


def get_conversation_status(conversation_id: int) -> str:
    with db() as c:
        row = c.execute("SELECT status FROM conversations WHERE id=?", (conversation_id,)).fetchone()
    return row["status"] if row else "closed"


# --- afspraken ----------------------------------------------------------------

def appointments_between(start: datetime, end: datetime) -> list[dict]:
    with db() as c:
        rows = c.execute(
            "SELECT * FROM appointments WHERE status='booked' AND start < ? AND end > ?",
            (end.isoformat(), start.isoformat()),
        ).fetchall()
    return [dict(r) for r in rows]


def create_appointment(**fields) -> int:
    with db() as c:
        cur = c.execute(
            "INSERT INTO appointments(customer_name, customer_phone, service, start, end, notes, "
            "channel, created_at) VALUES (?,?,?,?,?,?,?,?)",
            (
                fields["customer_name"], fields["customer_phone"], fields["service"],
                fields["start"], fields["end"], fields.get("notes", ""), fields["channel"],
                time.time(),
            ),
        )
        return cur.lastrowid


def appointments_for_phone(phone: str) -> list[dict]:
    with db() as c:
        rows = c.execute(
            "SELECT * FROM appointments WHERE customer_phone=? AND status='booked' AND end > ? "
            "ORDER BY start",
            (phone, datetime.now().astimezone().isoformat()),
        ).fetchall()
    return [dict(r) for r in rows]


def cancel_appointment(appointment_id: int, phone: str) -> bool:
    with db() as c:
        cur = c.execute(
            "UPDATE appointments SET status='cancelled' WHERE id=? AND customer_phone=? "
            "AND status='booked'",
            (appointment_id, phone),
        )
        return cur.rowcount > 0


# --- terugbelverzoeken --------------------------------------------------------

def create_callback_request(**fields) -> int:
    with db() as c:
        cur = c.execute(
            "INSERT INTO callback_requests(customer_name, customer_phone, reason, preference, channel, "
            "created_at) VALUES (?,?,?,?,?,?)",
            (
                fields["customer_name"], fields["customer_phone"], fields["reason"],
                fields.get("preference", ""), fields["channel"], time.time(),
            ),
        )
        return cur.lastrowid


# --- deduplicatie van webhooks ------------------------------------------------

def mark_processed(message_id: str) -> bool:
    """True als het bericht nieuw is; False als we het al eerder verwerkt hebben."""
    with db() as c:
        try:
            c.execute(
                "INSERT INTO processed_messages(message_id, created_at) VALUES (?,?)",
                (message_id, time.time()),
            )
            return True
        except sqlite3.IntegrityError:
            return False
