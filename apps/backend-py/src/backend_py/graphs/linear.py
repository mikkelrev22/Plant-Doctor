"""Deterministic linear diagnosis pipeline graph."""

from langgraph.graph import END, START, StateGraph

from backend_py.nodes import (
    diagnosis,
    formatting,
    persist,
    reject_non_plant,
    retrieval,
    triage,
    vision,
)
from backend_py.state import LinearState


def _after_triage(state: LinearState) -> str:
    """Route to vision when CLIP says plant; otherwise graceful reject."""
    triage_out = state.get("triage") or {}
    if triage_out.get("is_plant"):
        return "vision"
    return "reject_non_plant"


def build_linear_graph():
    """Build triage → (plant? vision… : reject) pipeline.

    Triage formats the care survey and checks is_plant. Non-plants exit with
    advice; plants continue to vision → retrieval → diagnosis → format → persist.
    """
    graph = StateGraph(LinearState)

    graph.add_node("triage", triage.triage)
    graph.add_node("reject_non_plant", reject_non_plant.reject_non_plant)
    graph.add_node("vision", vision.analyze_vision)
    graph.add_node("retrieval", retrieval.retrieve_care_profile)
    graph.add_node("diagnosis", diagnosis.diagnose)
    graph.add_node("format", formatting.format_advice_node)
    graph.add_node("persist", persist.persist_diagnosis)

    graph.add_edge(START, "triage")
    graph.add_conditional_edges(
        "triage",
        _after_triage,
        {
            "vision": "vision",
            "reject_non_plant": "reject_non_plant",
        },
    )
    graph.add_edge("reject_non_plant", END)
    graph.add_edge("vision", "retrieval")
    graph.add_edge("retrieval", "diagnosis")
    graph.add_edge("diagnosis", "format")
    graph.add_edge("format", "persist")
    graph.add_edge("persist", END)

    return graph.compile()


linear_graph = build_linear_graph()
