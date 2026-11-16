from jarvis.brain import Jarvis
from jarvis.config import Settings
from jarvis.memory import Memory
from jarvis.vault import Vault


def settings(tmp_path):
    return Settings(vault=tmp_path, default_provider="claude", claude_model="claude-opus-5-5",
                    claude_effort="medium", openai_model="gpt-5", password="",
                    name="Jarvis", user_name="")


def run(j, text):
    return "".join(j.handle(text))


def test_vault_note_and_search(tmp_path):
    v = Vault(tmp_path)
    v.add_note("Plan voor de marathon in april: drie keer per week hardlopen", title="Marathon")
    v.add_note("Boodschappen: melk, brood", title="Boodschappen")
    hits = v.search("hardlopen marathon")
    assert hits and hits[0].title == "Marathon"


def test_vault_read_blocks_escape(tmp_path):
    v = Vault(tmp_path)
    try:
        v.read("../../etc/passwd")
    except ValueError:
        return
    raise AssertionError("pad buiten de kluis moet geweigerd worden")


def test_memory_roundtrip(tmp_path):
    m = Memory(tmp_path)
    m.remember("Houdt van koffie zonder suiker")
    m.remember("Houdt van koffie zonder suiker")
    assert m.facts() and len(m.facts()) == 1
    assert m.forget("koffie") == 1 and m.facts() == []


def test_commands_without_api_keys(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_AUTH_TOKEN", raising=False)
    j = Jarvis(settings(tmp_path))
    assert "Inbox" in run(j, "/notitie Idee: app voor plantjes water geven")
    assert "dagboek" in run(j, "/dag Goed gesport").lower()
    assert "plantjes" in run(j, "/zoek plantjes")
    run(j, "/onthoud Woont in Utrecht")
    assert "Utrecht" in run(j, "/geheugen")
    path = j.vault.rel(j.vault.inbox()[0])
    assert "Verplaatst" in run(j, f"/verplaats {path} projecten")
    assert "ANTHROPIC_API_KEY" in run(j, "hallo")
    assert j.history == []


def test_auto_memory_from_answer(tmp_path):
    class Fake:
        def stream(self, *a):
            yield "Leuk!\nONTHOUD: Speelt gitaar"

    j = Jarvis(settings(tmp_path))
    j._providers["claude"] = Fake()
    out = run(j, "Ik speel trouwens gitaar")
    assert "Onthouden" in out and "Speelt gitaar" in j.memory.facts()[0]
    assert len(j.history) == 2


def test_web_api(tmp_path):
    from fastapi.testclient import TestClient

    from jarvis.server import create_app

    c = TestClient(create_app(Jarvis(settings(tmp_path))))
    assert c.get("/api/status").json()["notes"] == 0
    assert c.post("/api/capture", json={"message": "test"}).status_code == 200
    assert "Commando" in c.post("/api/chat", json={"message": "/help"}).text


def test_web_password(tmp_path):
    from dataclasses import replace

    from fastapi.testclient import TestClient

    from jarvis.server import create_app

    c = TestClient(create_app(Jarvis(replace(settings(tmp_path), password="geheim"))))
    assert c.get("/api/status").status_code == 401
    assert c.get("/api/status", headers={"X-Jarvis-Key": "geheim"}).status_code == 200
