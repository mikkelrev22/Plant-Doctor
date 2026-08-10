"""Graph state schema for the ReAct agent."""

from typing import Annotated

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict


class ReactState(TypedDict):
    """Conversation state for the ReAct agent graph.

    ``chat_token`` is carried alongside messages so the gateway-tool wrappers
    can present it as the ``x-chat-token`` header. It is set per request by the
    chat route (via the graph input) rather than read from the LLM config, which
    keeps the tools simple and stateless.
    """

    messages: Annotated[list[BaseMessage], add_messages]
    chat_token: str