"""Pydantic models for the chat API contract."""

from pydantic import BaseModel, Field


class AgentStreamRequest(BaseModel):
    """Start or resume a plant-scoped agent chat.

    The server mints the Node ``chatToken`` for ``plant_id`` on the first turn
    (when ``thread_id`` is absent) so the mobile client only needs to know the
    plant and the message. ``thread_id`` resumes an existing LangGraph thread.

    ``report_id`` is optional and only used on the first turn: when present the
    chat is pinned to that specific report instead of the plant's latest report,
    so a user can ask about an older report. Ignored when ``thread_id`` is set.
    """

    plant_id: int
    message: str
    thread_id: str | None = None
    report_id: int | None = None


class AgentStreamMeta(BaseModel):
    """Diagnostic metadata returned alongside the stream (not the stream body)."""

    thread_id: str = ""
    chat_token: str = ""
    plant_id: int | None = None
    plant_name: str | None = None
    default_report_id: int | None = Field(default=None)