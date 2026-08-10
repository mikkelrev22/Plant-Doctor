"""Smoke tests for the FastAPI application and the UI-stream encoder."""

from fastapi.testclient import TestClient

from backend_agent.main import app
from backend_agent.uimessage import UIStream, parse_chunks


def test_root() -> None:
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "Plant Doctor agent service is running"}


def test_health() -> None:
    with TestClient(app) as client:
        response = client.get("/chat/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_uistream_text_block_open_close() -> None:
    enc = UIStream()
    out = enc.start("msg_1")
    out += enc.start_step()
    out += enc.text_delta("Hello ")
    out += enc.text_delta("world")
    out += enc.finish_step()
    out += enc.finish()
    out += enc.done()

    parts = list(parse_chunks(out))
    types = [p["type"] if isinstance(p, dict) else p for p in parts]
    assert types == [
        "start",
        "start-step",
        "text-start",
        "text-delta",
        "text-delta",
        "text-end",
        "finish-step",
        "finish",
        "[DONE]",
    ]
    # text-start / text-delta share the same id
    text_id = parts[2]["id"]
    assert parts[3]["id"] == text_id and parts[3]["delta"] == "Hello "
    assert parts[4]["delta"] == "world"


def test_uistream_tool_and_custom_parts() -> None:
    enc = UIStream()
    out = enc.start("msg_1")
    out += enc.tool_start("call_1", "get_recent_reports", {"plant_id": None})
    out += enc.tool_end("call_1", "Last 3 reports ...")
    out += enc.custom("yesno", {"type": "yesno", "prompt": "Look at the photo?"})
    out += enc.finish()
    out += enc.done()

    parts = [p for p in parse_chunks(out) if isinstance(p, dict)]
    by_type = {p["type"]: p for p in parts}
    assert by_type["tool-input-start"]["toolName"] == "get_recent_reports"
    assert by_type["tool-input-available"]["input"] == {"plant_id": None}
    assert by_type["tool-output-available"]["output"] == "Last 3 reports ..."
    assert by_type["data-yesno"]["data"]["prompt"] == "Look at the photo?"