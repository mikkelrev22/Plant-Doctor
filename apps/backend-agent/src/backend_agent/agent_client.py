"""HTTP client for the Node backend's ``/agent`` tool gateway.

First real implementation of the contract documented in
``docs/agent-integration.md`` §6.1. Centralizes the ``x-api-key`` header on every
call and the ``x-chat-token`` header on every token-gated call. Chat lifecycle
calls return JSON; the four tool endpoints return ``text/plain`` (only error
responses are JSON).
"""

from functools import lru_cache
from typing import Any

import httpx

from backend_agent.config import config


def _plant_params(plant_id: int | None) -> dict[str, int] | None:
    return {"plantId": plant_id} if plant_id is not None else None


class AgentClientError(RuntimeError):
    """Raised when the Node gateway returns a non-2xx response."""


class AgentClient:
    def __init__(self, base_url: str, api_key: str, *, timeout: float = 30.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self._client = httpx.AsyncClient(timeout=timeout)

    def _headers(self, chat_token: str | None = None) -> dict[str, str]:
        h: dict[str, str] = {"x-api-key": self.api_key}
        if chat_token is not None:
            h["x-chat-token"] = chat_token
        return h

    @staticmethod
    def _raise_for_status(resp: httpx.Response) -> None:
        if resp.is_success:
            return
        try:
            body = resp.json()
            msg = body.get("message") or f"HTTP {resp.status_code}"
        except Exception:  # noqa: BLE001 - fall back to raw text
            msg = resp.text or f"HTTP {resp.status_code}"
        raise AgentClientError(f"{resp.status_code}: {msg}")

    # --- chat lifecycle (JSON) --------------------------------------------
    async def create_chat(self, plant_id: int) -> dict[str, Any]:
        """POST /agent/chats — mint an opaque chatToken + initial contextText."""
        r = await self._client.post(
            f"{self.base_url}/agent/chats",
            headers={**self._headers(), "Content-Type": "application/json"},
            json={"plantId": plant_id},
        )
        self._raise_for_status(r)
        return r.json()

    async def get_chat(self, chat_token: str) -> dict[str, Any]:
        r = await self._client.get(
            f"{self.base_url}/agent/chats/{chat_token}",
            headers=self._headers(chat_token),
        )
        self._raise_for_status(r)
        return r.json()

    async def save_chat(self, chat_token: str, history: Any) -> None:
        r = await self._client.put(
            f"{self.base_url}/agent/chats/{chat_token}",
            headers={**self._headers(chat_token), "Content-Type": "application/json"},
            json={"history": history},
        )
        self._raise_for_status(r)  # 204 on success

    # --- tools (text/plain) ------------------------------------------------
    async def plant_reports(self, chat_token: str, plant_id: int | None = None) -> str:
        params = _plant_params(plant_id)
        r = await self._client.get(
            f"{self.base_url}/agent/plantReports",
            params=params,
            headers=self._headers(chat_token),
        )
        self._raise_for_status(r)
        return r.text

    async def plant_history(self, chat_token: str, plant_id: int | None = None) -> str:
        params = _plant_params(plant_id)
        r = await self._client.get(
            f"{self.base_url}/agent/plantHistory",
            params=params,
            headers=self._headers(chat_token),
        )
        self._raise_for_status(r)
        return r.text

    async def user_plants(self, chat_token: str) -> str:
        r = await self._client.get(
            f"{self.base_url}/agent/userPlants",
            headers=self._headers(chat_token),
        )
        self._raise_for_status(r)
        return r.text

    async def look_at_photo(
        self, chat_token: str, query: str, report_id: int | None = None
    ) -> str:
        body: dict[str, Any] = {"query": query}
        if report_id is not None:
            body["reportId"] = report_id
        r = await self._client.post(
            f"{self.base_url}/agent/lookAtPhoto",
            headers={**self._headers(chat_token), "Content-Type": "application/json"},
            json=body,
        )
        self._raise_for_status(r)
        return r.text


@lru_cache
def get_agent_client() -> AgentClient:
    """Process-wide client (built once, reused for the app lifetime)."""
    return AgentClient(
        base_url=config.backend_url,
        api_key=config.backend_api_key,
    )