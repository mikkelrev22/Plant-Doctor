"""Suspend/resume tool for agent clarifying questions."""

from langchain_core.tools import tool
from langgraph.types import interrupt


@tool
def ask_user(question: str) -> str:
    """Ask the user a clarifying question and suspend until they respond."""
    response = interrupt({"question": question})
    if isinstance(response, dict):
        return str(response.get("answer", response))
    return str(response)
