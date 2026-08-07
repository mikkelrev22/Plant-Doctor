"""Diagnosis node adapter."""

from backend_py.capabilities.diagnosis import reason_diagnosis
from backend_py.schemas import CareProfile, SymptomReport, TriageResult
from backend_py.state import LinearState


async def diagnose(state: LinearState) -> LinearState:
    report = SymptomReport.model_validate(state.get("symptom_report", {}))
    profile = CareProfile.model_validate(state.get("care_profile", {}))
    triage = TriageResult.model_validate(state.get("triage", {}))
    result = await reason_diagnosis(
        report,
        profile,
        triage.structured_facts,
    )
    return {"diagnosis": result.model_dump()}
