"""Formatting node adapter."""

from backend_py.capabilities.formatting import format_advice
from backend_py.schemas import Diagnosis
from backend_py.state import LinearState


async def format_advice_node(state: LinearState) -> LinearState:
    diagnosis = Diagnosis.model_validate(state.get("diagnosis", {}))
    advice = await format_advice(diagnosis)
    return {"advice": advice.model_dump()}
