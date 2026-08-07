"""Result of running one evaluation case through a target."""

from typing import Any

from backend_py.observability.guardrails import GuardrailEvent
from pydantic import BaseModel, Field


class RunResult(BaseModel):
    answer: dict[str, Any] | str
    telemetry: dict[str, Any] = Field(default_factory=dict)
    tokens: int = 0
    tool_calls: int = 0
    guardrail_events: list[GuardrailEvent] = Field(default_factory=list)

    model_config = {"arbitrary_types_allowed": True}
