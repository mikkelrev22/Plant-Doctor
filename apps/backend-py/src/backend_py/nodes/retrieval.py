"""Retrieval node adapter."""

from backend_py.capabilities.retrieval import search_care_profile
from backend_py.schemas import SymptomReport
from backend_py.state import LinearState


async def retrieve_care_profile(state: LinearState) -> LinearState:
    report = SymptomReport.model_validate(state.get("symptom_report", {}))
    profile = await search_care_profile(report.species)
    return {"care_profile": profile.model_dump()}
