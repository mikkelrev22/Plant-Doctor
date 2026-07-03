"""Diagnosis reasoning over symptoms and care profiles."""

from backend_py.schemas import (
    CareProfile,
    Diagnosis,
    StructuredFacts,
    SymptomReport,
)


async def reason_diagnosis(
    symptoms: SymptomReport,
    profile: CareProfile,
    user_context: StructuredFacts | None = None,
) -> Diagnosis:
    """Rank candidate causes from symptoms, care profile, and user context."""
    _ = user_context
    return Diagnosis(
        species=symptoms.species or profile.species,
        symptoms=symptoms.symptoms,
        candidate_causes=[],
    )
