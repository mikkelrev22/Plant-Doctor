"""A single evaluation case: plant image plus user-supplied metadata."""

from typing import Any

from backend_py.observability.guardrails import Rail
from pydantic import BaseModel, Field


class Case(BaseModel):
    id: str
    image_url: str = ""
    user_text: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
    truth: dict[str, Any] = Field(default_factory=dict)
    rubric: str = ""
    expected_rails: list[Rail] = Field(default_factory=list)

    model_config = {"extra": "allow"}
