"""Vision node adapter."""

from backend_py.capabilities.vision import detect_symptoms
from backend_py.state import LinearState


async def analyze_vision(state: LinearState) -> LinearState:
    report = await detect_symptoms(state.get("image_url", ""))
    return {"symptom_report": report.model_dump()}
