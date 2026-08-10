"""LangGraph ``@tool`` wrappers over the Node ``/agent`` tool gateway.

These are the four tools documented in ``docs/agent-integration.md`` §6.3 plus
one demo interactive tool (``ask_yes_no``) that shows the custom ``data-*`` part
pattern the mobile UI renders as buttons.

``chat_token`` is threaded per request through the ``RunnableConfig``'s
``configurable`` dict (set by the chat route) and read inside each tool via
``ensure_config()`` — so the model never sees it and the tools stay stateless.
"""

from uuid import uuid4

from langchain_core.runnables import ensure_config
from langchain_core.tools import tool
from langgraph.config import get_stream_writer

from backend_agent.agent_client import get_agent_client


@tool
async def get_recent_reports(plant_id: int | None = None) -> str:
    """Get the last 3 diagnostic reports for the chat's plant (or another plant
    owned by the user) WITH FULL DETAIL: date, identified species, likely
    stressors, summary, recommendations, and each stress sign with severity and
    notes. Use this to answer questions about recent findings or specific signs.

    Leave plant_id as None to use the chat's default plant. Returns plain text;
    reports are separated by blank lines. If the plant has >3 reports, a final
    line notes how many more exist in history.
    """
    cfg = ensure_config()
    chat_token = cfg["configurable"]["chat_token"]
    return await get_agent_client().plant_reports(chat_token, plant_id)


@tool
async def get_report_history(plant_id: int | None = None) -> str:
    """Get EVERY diagnostic report for the chat's plant (or another owned plant)
    in BRIEF form: date, summary, and stress signs WITHOUT notes. Use this for
    trends over time or to see the full list of past reports. For detail on
    recent reports, use get_recent_reports instead.

    Leave plant_id as None to use the chat's default plant. Returns plain text.
    """
    cfg = ensure_config()
    chat_token = cfg["configurable"]["chat_token"]
    return await get_agent_client().plant_history(chat_token, plant_id)


@tool
async def list_user_plants() -> str:
    """List the user's plants (up to 10): name, species, report count, and
    current stress signs from the latest report. Use this when the user asks
    about their plants in general, or to find a plant id before asking about a
    specific plant's reports. Returns plain text."""
    cfg = ensure_config()
    chat_token = cfg["configurable"]["chat_token"]
    return await get_agent_client().user_plants(chat_token)


@tool
async def look_at_photo(query: str, report_id: int | None = None) -> str:
    """Answer a question about a plant photo by sending it to the vision LLM.
    Use this when the user asks something visible in the photo (leaf color,
    spots, texture, damage) that the stored report text alone may not cover.

    query: the question about the photo (required, non-empty).
    report_id: which report's photo to inspect. Leave as None to use the chat's
    default report (the latest report at chat creation). Returns the LLM's
    answer as plain text.
    """
    cfg = ensure_config()
    chat_token = cfg["configurable"]["chat_token"]
    return await get_agent_client().look_at_photo(chat_token, query, report_id)


@tool
async def ask_yes_no(prompt: str) -> str:
    """Ask the user a yes/no question. The chat UI renders Yes and No buttons;
    the user's choice arrives as their next message, so stop generating after
    calling this and wait for their reply. Use it when you need a binary decision
    before continuing (e.g. "Want me to look at the latest photo?").

    prompt: the yes/no question to show the user.
    """
    # Emit a custom `data-yesno` part the mobile renders as Yes/No buttons.
    # The identical pattern (a tool or node calling get_stream_writer() with a
    # {"type": "<name>", ...} payload) is how data-questionnaire and
    # data-photo-request parts would be emitted too.
    writer = get_stream_writer()
    writer({"type": "yesno", "prompt": prompt, "id": f"yn_{uuid4().hex}"})
    return f"Asked the user a yes/no question: {prompt!r}. Await their reply."