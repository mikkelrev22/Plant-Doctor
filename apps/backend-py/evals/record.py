"""Aggregated metrics for a single target run on one case."""


from backend_py.observability.guardrails import GuardrailEvent, Rail
from pydantic import BaseModel, Field


class RunRecord(BaseModel):
    target: str
    case_id: str
    run: int
    latency: float
    tokens: int
    tool_calls: int
    events: list[GuardrailEvent]
    correct: bool
    quality: float
    expected_rails: set[Rail] = Field(default_factory=set)

    model_config = {"arbitrary_types_allowed": True}

    def should_trip(self, rail: Rail) -> bool:
        """Whether this rail was expected to fire for the case."""
        return rail in self.expected_rails
