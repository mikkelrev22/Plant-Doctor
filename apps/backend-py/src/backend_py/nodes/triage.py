"""Triage node adapter."""

from backend_py.capabilities.triage import validate_input
from backend_py.state import LinearState


async def triage(state: LinearState) -> LinearState:
    result = await validate_input(
        state.get("image_url", ""),
        state.get("user_text", ""),
    )
    return {"triage": result.model_dump()}
