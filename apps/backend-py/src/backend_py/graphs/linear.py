"""Deterministic linear diagnosis pipeline graph."""

from langgraph.graph import END, START, StateGraph

from backend_py.nodes import diagnosis, formatting, persist, retrieval, triage, vision
from backend_py.state import LinearState


def build_linear_graph():
    """Build triage -> vision -> retrieval -> diagnosis -> format -> persist."""
    graph = StateGraph(LinearState)

    graph.add_node("triage", triage.triage)
    graph.add_node("vision", vision.analyze_vision)
    graph.add_node("retrieval", retrieval.retrieve_care_profile)
    graph.add_node("diagnosis", diagnosis.diagnose)
    graph.add_node("format", formatting.format_advice_node)
    graph.add_node("persist", persist.persist_diagnosis)

    graph.add_edge(START, "triage")
    graph.add_edge("triage", "vision")
    graph.add_edge("vision", "retrieval")
    graph.add_edge("retrieval", "diagnosis")
    graph.add_edge("diagnosis", "format")
    graph.add_edge("format", "persist")
    graph.add_edge("persist", END)

    return graph.compile()


linear_graph = build_linear_graph()
