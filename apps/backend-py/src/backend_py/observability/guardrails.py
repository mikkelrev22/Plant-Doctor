"""Guardrail rails and event recording at orchestration seams."""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Protocol


class Rail(StrEnum):
    INGRESS_REJECT = "ingress_reject"
    STEP_CAP = "step_cap"
    DEADLINE = "deadline"
    BUDGET = "budget"
    LOOP_BREAK = "loop_break"
    TOOL_ARG_REJECT = "tool_arg_reject"
    TOOL_ERROR = "tool_error"
    SCHEMA_REPAIR = "schema_repair"
    LOW_CONF_HEDGE = "low_conf_hedge"
    ASK_USER = "ask_user"


@dataclass
class GuardrailEvent:
    rail: Rail
    detail: dict[str, Any] = field(default_factory=dict)


class RunContext(Protocol):
    events: list[GuardrailEvent]


def record(run_ctx: RunContext, rail: Rail, **detail: Any) -> None:
    """Record one line at each guardrail seam."""
    run_ctx.events.append(GuardrailEvent(rail, detail))
