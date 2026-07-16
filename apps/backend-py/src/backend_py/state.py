"""Shared graph state schemas for linear and ReAct orchestrations."""

from typing import Annotated, Any, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class LinearState(TypedDict, total=False):
    """Accumulated structured output from each deterministic pipeline step."""

    image_url: str
    user_text: str
    plant_id: int
    plant_name: str
    upload: dict[str, Any]
    # Raw care survey from the form (input).
    care: dict[str, Any]
    # Triage output: formatted survey (structured_facts) + is_plant check.
    # Survey facts stay here until diagnosis (after vision species ID).
    triage: dict[str, Any]
    symptom_report: dict[str, Any]
    care_profile: dict[str, Any]
    diagnosis: dict[str, Any]
    advice: dict[str, Any]
    persisted: dict[str, Any]


class ReactState(TypedDict):
    """Conversation state for the non-deterministic ReAct agent graph."""

    messages: Annotated[list[BaseMessage], add_messages]
