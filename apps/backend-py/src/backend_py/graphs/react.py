"""Non-deterministic ReAct agent graph with tool-use loops."""

from langchain_core.messages import AIMessage
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph import START, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

from backend_py.clients import get_llm
from backend_py.config import config
from backend_py.state import ReactState
from backend_py.tools.ask_user import ask_user
from backend_py.tools.retrieval import lookup_plant_care
from backend_py.tools.vision import analyze_plant_image

TOOLS = [analyze_plant_image, lookup_plant_care, ask_user]


async def call_model(state: ReactState) -> ReactState:
    """Agent node — LLM chooses tools or returns a final answer."""
    if not config.llm_api_key:
        last_message = state["messages"][-1].content if state["messages"] else ""
        return {
            "messages": [
                AIMessage(
                    content=(
                        "ReAct agent placeholder. Set LLM_API_KEY to enable "
                        f"tool use. Last user message: {last_message}"
                    )
                )
            ]
        }

    llm = get_llm().bind_tools(TOOLS)
    response = await llm.ainvoke(state["messages"])
    return {"messages": [response]}


def build_react_graph(checkpointer: BaseCheckpointSaver | None = None):
    """Build agent <-> tools loop for non-linear, agentic workflows."""
    graph = StateGraph(ReactState)

    graph.add_node("agent", call_model)
    graph.add_node("tools", ToolNode(TOOLS))

    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", tools_condition)
    graph.add_edge("tools", "agent")

    return graph.compile(checkpointer=checkpointer)


def react_invoke_config(thread_id: str) -> dict:
    """Standard invoke config: thread persistence + recursion guard."""
    return {
        "configurable": {"thread_id": thread_id},
        "recursion_limit": config.react_recursion_limit,
    }
