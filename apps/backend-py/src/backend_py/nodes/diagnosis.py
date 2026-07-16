"""Diagnosis node adapter."""

from backend_py.capabilities.diagnosis import reason_diagnosis
from backend_py.schemas import CareProfile, SymptomReport, TriageResult
from backend_py.state import LinearState


async def diagnose(state: LinearState) -> LinearState:
    """Rank causes using vision species/symptoms, care profile, and survey facts."""
    report = SymptomReport.model_validate(state.get("symptom_report", {}))
    profile = CareProfile.model_validate(state.get("care_profile", {}))
    # Survey answers parked by triage (before species determination).
    triage = TriageResult.model_validate(state.get("triage", {}))
    result = await reason_diagnosis(
        report,
        profile,
        triage.structured_facts,
    )
    return {"diagnosis": result.model_dump()}
