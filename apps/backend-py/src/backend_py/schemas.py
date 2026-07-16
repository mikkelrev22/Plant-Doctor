"""Pydantic models for API contracts and structured LLM outputs."""

from typing import Any

from pydantic import BaseModel, Field


class StructuredFacts(BaseModel):
    raw_text: str = ""
    location: str | None = None
    light_intensity: str | None = None
    window_direction: str | None = None
    distance_from_window: str | None = None
    daily_light_hours: str | None = None
    water_amount: str | None = None
    watering_frequency: str | None = None
    water_type: str | None = None
    watering_method: str | None = None
    soil_moisture: str | None = None
    soil_drainage: str | None = None
    humidity: str | None = None
    temperature: str | None = None


class CareContext(BaseModel):
    """Required plant-environment fields collected from the diagnose form.

    Plants are assumed indoors; location is not collected from the user.
    """

    light_intensity: str
    window_direction: str
    distance_from_window: str
    daily_light_hours: str
    water_amount: str
    watering_frequency: str
    water_type: str
    watering_method: str
    soil_moisture: str
    soil_drainage: str
    humidity: str
    temperature: str


class TriageResult(BaseModel):
    """Output of the triage step — survey formatting + plant-photo check only.

    ``structured_facts`` holds the formatted care survey in graph state until
    later nodes (after species determination) consume it. Triage does not
    identify species.
    """

    is_plant: bool
    plant_probability: float | None = None
    structured_facts: StructuredFacts


class SymptomReport(BaseModel):
    species: str
    symptoms: list[str] = Field(default_factory=list)
    confidence: float = 0.0


class CareProfile(BaseModel):
    species: str
    ideal_conditions: dict[str, str] = Field(default_factory=dict)
    common_failure_modes: list[str] = Field(default_factory=list)


class CandidateCause(BaseModel):
    name: str
    likelihood: float
    rationale: str


class Diagnosis(BaseModel):
    species: str
    symptoms: list[str] = Field(default_factory=list)
    candidate_causes: list[CandidateCause] = Field(default_factory=list)


class Advice(BaseModel):
    summary: str
    actions: list[str] = Field(default_factory=list)


class DiagnoseRequest(BaseModel):
    image_url: str = ""
    user_text: str = ""
    plant_id: int | None = None
    plant_name: str | None = None
    care: CareContext | None = None


class DiagnoseResponse(BaseModel):
    result: dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None


class ChatResponse(BaseModel):
    thread_id: str
    result: dict[str, Any] = Field(default_factory=dict)
