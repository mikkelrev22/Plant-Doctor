"""Triage node: park formatted survey + plant check before vision/species."""

from backend_py.capabilities.triage import validate_input
from backend_py.state import LinearState


async def triage(state: LinearState) -> LinearState:
    """
    First pipeline step.

    - Formats care survey answers into ``triage.structured_facts`` so later
      nodes (especially diagnosis, after species ID) can read them.
    - Sets ``triage.is_plant`` / ``triage.plant_probability`` from CLIP.
    - Does not identify species; that happens in the vision node next.
    """
    result = await validate_input(
        state.get("image_url", ""),
        state.get("user_text", ""),
        care=state.get("care"),
    )
    return {"triage": result.model_dump()}
