"""Minimal ReAct agent graph: agent (LLM + tool binding) <-> tools loop."""

from langchain_core.messages import AIMessage
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph import START, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

from backend_agent.clients import get_llm
from backend_agent.config import config
from backend_agent.state import ReactState
from backend_agent.tools import (
    ask_yes_no,
    get_recent_reports,
    get_report_history,
    list_user_plants,
    look_at_photo,
)

TOOLS = [
    get_recent_reports,
    get_report_history,
    list_user_plants,
    look_at_photo,
    ask_yes_no,
]


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
    """Build the agent <-> tools loop."""
    graph = StateGraph(ReactState)

    graph.add_node("agent", call_model)
    graph.add_node("tools", ToolNode(TOOLS))

    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", tools_condition)
    graph.add_edge("tools", "agent")

    return graph.compile(checkpointer=checkpointer)


def react_invoke_config(thread_id: str) -> dict:
    """Standard invoke config: thread persistence + recursion guard.

    The chat route also injects ``chat_token`` into ``configurable`` so the
    gateway-tool wrappers can read it via ``ensure_config()``.
    """
    return {
        "configurable": {"thread_id": thread_id},
        "recursion_limit": config.react_recursion_limit,
    }