"""Pydantic models for API contracts and structured LLM outputs."""

from typing import Any

from pydantic import BaseModel, Field


class StructuredFacts(BaseModel):
    raw_text: str = ""
    location: str | None = None
    watering_frequency: str | None = None
    light_conditions: str | None = None


class TriageResult(BaseModel):
    is_plant: bool
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


class DiagnoseResponse(BaseModel):
    result: dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None


class ChatResponse(BaseModel):
    thread_id: str
    result: dict[str, Any] = Field(default_factory=dict)
