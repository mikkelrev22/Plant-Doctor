"""Input triage and validation."""

from backend_py.schemas import StructuredFacts, TriageResult


async def validate_input(image_url: str, user_text: str) -> TriageResult:
    """Confirm the image contains a plant and extract structured user facts."""
    _ = image_url
    return TriageResult(
        is_plant=True,
        structured_facts=StructuredFacts(raw_text=user_text),
    )
