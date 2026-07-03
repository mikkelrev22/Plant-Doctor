"""User-facing advice formatting."""

from backend_py.schemas import Advice, Diagnosis


async def format_advice(diagnosis: Diagnosis) -> Advice:
    """Turn a structured diagnosis into friendly, actionable advice."""
    return Advice(
        summary=f"Diagnosis draft for {diagnosis.species}.",
        actions=["Review watering schedule", "Check light exposure"],
    )
