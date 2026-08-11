"""Smoke tests for the FastAPI application and the UI-stream encoder."""

import asyncio

from fastapi.testclient import TestClient

from backend_agent.agent_client import AgentClient
from backend_agent.main import app
from backend_agent.schemas import AgentStreamRequest
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
    assert by_type["tool-input-start"]["dynamic"] is True
    assert by_type["tool-input-available"]["input"] == {"plant_id": None}
    assert by_type["tool-input-available"]["dynamic"] is True
    assert by_type["tool-output-available"]["output"] == "Last 3 reports ..."
    assert by_type["data-yesno"]["data"]["prompt"] == "Look at the photo?"


class _FakeResp:
    is_success = True

    def json(self) -> dict:
        return {
            "chatToken": "t",
            "contextText": "c",
            "plantId": 1,
            "plantName": "Aloe",
            "defaultReportId": 99,
        }


def _client_with_captured_post() -> tuple[AgentClient, dict]:
    """An `AgentClient` whose httpx client is replaced with a capturing fake so
    we can assert on the JSON body `create_chat` posts without a network call."""
    client = AgentClient("http://backend", "key")
    captured: dict = {}

    async def fake_post(url, *, headers=None, json=None, **_):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        return _FakeResp()

    client._client.post = fake_post  # type: ignore[attr-defined]
    return client, captured


def test_agent_stream_request_accepts_optional_report_id() -> None:
    assert AgentStreamRequest(plant_id=1, message="hi", report_id=99).report_id == 99
    assert AgentStreamRequest(plant_id=1, message="hi").report_id is None


def test_create_chat_sends_report_id_when_given() -> None:
    client, captured = _client_with_captured_post()
    asyncio.run(client.create_chat(1, 99))
    assert captured["json"] == {"plantId": 1, "reportId": 99}


def test_create_chat_omits_report_id_when_none() -> None:
    client, captured = _client_with_captured_post()
    asyncio.run(client.create_chat(1))
    assert captured["json"] == {"plantId": 1}