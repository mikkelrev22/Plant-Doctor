"""Early exit when CLIP triage decides the photo is not a plant."""

from backend_py.schemas import Advice
from backend_py.state import LinearState

_NON_PLANT_SUMMARY = (
    "We couldn't identify this photo as a plant. "
    "Please try again with a clearer picture of your houseplant—"
    "ideally showing the leaves or the whole plant in good light, "
    "with less background clutter."
)

_NON_PLANT_ACTIONS = [
    "Upload a photo focused on the plant (leaves or whole plant).",
    "Use brighter, even lighting and avoid heavy blur.",
    "Crop out people, pets, furniture, or other non-plant subjects if you can.",
]


async def reject_non_plant(state: LinearState) -> LinearState:
    """Write a graceful message and mark the run as rejected (no vision)."""
    _ = state
    advice = Advice(summary=_NON_PLANT_SUMMARY, actions=list(_NON_PLANT_ACTIONS))
    return {
        "rejected": True,
        "advice": advice.model_dump(),
    }
