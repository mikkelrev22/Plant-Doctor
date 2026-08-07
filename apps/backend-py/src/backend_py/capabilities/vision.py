"""Vision analysis for species and symptom detection."""

from backend_py.schemas import SymptomReport


async def detect_symptoms(
    image_url: str,
    species_hint: str | None = None,
) -> SymptomReport:
    """Identify species and visible symptoms from a plant image."""
    _ = image_url
    return SymptomReport(
        species=species_hint or "unknown",
        symptoms=[],
        confidence=0.0,
    )
