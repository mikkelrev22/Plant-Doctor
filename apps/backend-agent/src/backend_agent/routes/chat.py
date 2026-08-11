"""Agent chat route — emits the AI SDK UI Message Stream protocol as one batch.

POST /chat/agent/stream
  body: {"plant_id": int, "message": str, "thread_id": str | None}

The server mints the Node ``chatToken`` for ``plant_id`` on the first turn (when
``thread_id`` is absent), seeds the agent with the plant's ``contextText``, and
runs the ReAct loop. The ``chatToken`` doubles as the LangGraph ``thread_id``
(1:1), so the mobile only needs one handle to resume a thread and to load/save
its history. On resume, if the in-process checkpointer has lost the thread (an
agent restart), the saved ``UIMessage[]`` history is re-seeded into a fresh
thread so the conversation can continue with context.

The LLM runs **non-streaming** (``clients.py``: ``streaming=False``), so no
token deltas are produced. ``astream_events(v2)`` still drives the tool-call
and custom-event parts (``dynamic-tool`` cards, ``data-yesno``, …), and the
final assistant text is emitted as a single batched ``text-delta`` via the
fallback below. The mobile app's ``useChat`` therefore receives the whole
message at once and renders it whole. ``thread_id`` (== ``chatToken``) is
emitted as a ``data-thread`` part so the client can resume later.
"""

from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from backend_agent.agent_client import AgentClientError, get_agent_client
from backend_agent.graphs.react import react_invoke_config
from backend_agent.schemas import AgentStreamRequest
from backend_agent.uimessage import STREAM_HEADERS, UIStream

router = APIRouter(prefix="/chat", tags=["chat"])


def _message_content(message: Any) -> str:
    content = getattr(message, "content", message)
    if isinstance(content, str):
        return content
    return str(content)


async def _emit_event(enc: UIStream, event: dict) -> str:
    """Map one astream_events(v2) event to AI SDK stream parts."""
    kind = event["event"]
    node = event.get("metadata", {}).get("langgraph_node", "")

    if kind == "on_chat_model_start" and node == "agent":
        return enc.start_step()

    if kind == "on_chat_model_stream" and node == "agent":
        # Token streaming is intentionally off: we drop per-token deltas here
        # and emit the full final assistant text as ONE batched `text_delta`
        # via the fallback after the loop (the `not enc.emitted_text` block
        # below). This is the actual "no streaming on the wire" guarantee —
        # `astream_events` may still stream the LLM internally regardless of
        # `ChatOpenAI(streaming=False)`, so skipping here is what matters.
        # To re-enable token streaming: return `enc.text_delta(delta)` (and
        # let `text_delta` set `enc.emitted_text = True` so the fallback skips).
        return ""

    if kind == "on_chat_model_end" and node == "agent":
        return enc.finish_step()

    if kind == "on_tool_start":
        tool_name = event.get("name", "tool")
        tool_call_id = event.get("run_id", f"call_{uuid4().hex}")
        tool_input = event.get("data", {}).get("input", {})
        return enc.tool_start(tool_call_id, tool_name, tool_input)

    if kind == "on_tool_end":
        tool_call_id = event.get("run_id", "")
        output = event.get("data", {}).get("output", "")
        return enc.tool_end(tool_call_id, _message_content(output))

    if kind == "on_custom_event":
        data = event.get("data") or {}
        part_type = data.get("type", "custom") if isinstance(data, dict) else "custom"
        return enc.custom(part_type, data)

    return ""


def _ui_messages_to_langchain(history: Any) -> list[Any]:
    """Convert a saved AI SDK ``UIMessage[]`` history blob into LangChain
    messages for re-seeding a thread after the in-process checkpointer loses
    state (e.g. an agent restart). Text-only for v1: ``user`` -> HumanMessage,
    ``assistant`` -> AIMessage; system/custom parts are skipped. Tolerant of any
    shape — returns ``[]`` if nothing usable is found.
    """
    if not isinstance(history, list):
        return []
    messages: list[Any] = []
    for item in history:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        parts = item.get("parts")
        text = ""
        if isinstance(parts, list):
            text = " ".join(
                p.get("text", "")
                for p in parts
                if isinstance(p, dict) and p.get("type") == "text"
            ).strip()
        elif isinstance(item.get("content"), str):
            text = item["content"].strip()
        if not text:
            continue
        if role == "user":
            messages.append(HumanMessage(content=text))
        elif role == "assistant":
            messages.append(AIMessage(content=text))
    return messages


async def _agent_stream(
    graph: Any,
    payload: AgentStreamRequest,
) -> AsyncIterator[str]:
    enc = UIStream()
    message_id = f"msg_{uuid4().hex}"
    client = get_agent_client()

    # The Node-minted ``chatToken`` doubles as the LangGraph ``thread_id`` (1:1
    # by design), so the mobile only needs one handle to resume AND to load/save
    # history. First turn: mint the token, then adopt it as the thread id.
    # Resume: ``thread_id`` == the chat's ``chatToken``.
    if payload.thread_id:
        thread_id = payload.thread_id
        cfg = react_invoke_config(thread_id)
        state = await graph.aget_state(cfg)
        chat_token = (state.values or {}).get("chat_token")
        if chat_token:
            # Thread is alive in memory — resume in place.
            graph_input: dict[str, Any] = {
                "messages": [HumanMessage(content=payload.message)]
            }
        else:
            # Checkpointer lost the thread (agent restart). Re-seed from the
            # saved UIMessage history so the conversation continues with context.
            try:
                saved = await client.get_chat(thread_id)
            except AgentClientError as exc:
                yield enc.error(f"Failed to resume chat: {exc}")
                yield enc.done()
                return
            seed_messages = _ui_messages_to_langchain(saved.get("history"))
            if not seed_messages:
                yield enc.error(
                    "No saved history for this chat; start a new chat instead."
                )
                yield enc.done()
                return
            await graph.aupdate_state(
                cfg, {"messages": seed_messages, "chat_token": thread_id}
            )
            chat_token = thread_id
            graph_input = {"messages": [HumanMessage(content=payload.message)]}
        meta: dict[str, Any] = {"thread_id": thread_id, "chat_token": chat_token}
    else:
        try:
            created = await client.create_chat(payload.plant_id)
        except AgentClientError as exc:
            yield enc.error(f"Failed to start chat: {exc}")
            yield enc.done()
            return
        chat_token = created["chatToken"]
        thread_id = chat_token
        cfg = react_invoke_config(thread_id)
        context_text = created.get("contextText", "")
        graph_input = {
            "messages": [
                SystemMessage(
                    content=(
                        "You are a friendly, concise plant-care assistant for the "
                        "user's houseplants.\n"
                        "- Use the provided tools to read the plant's reports, "
                        "history, and photos BEFORE answering when the user asks "
                        "about a specific plant or symptoms.\n"
                        "- Lead with the direct answer. Keep replies short and "
                        "conversational — a few sentences, not a wall of text. No "
                        "long preambles, restatements, or wrap-up summaries.\n"
                        "- Don't echo raw report contents back; extract what "
                        "matters and turn it into plain, actionable advice.\n"
                        "- Use a short bulleted list ONLY for concrete care "
                        "actions, and keep each bullet to one line.\n\n"
                        f"Initial context for this chat:\n{context_text}"
                    )
                ),
                HumanMessage(content=payload.message),
            ],
            "chat_token": chat_token,
        }
        meta = {
            "thread_id": thread_id,
            "chat_token": chat_token,
            "plant_id": created.get("plantId"),
            "plant_name": created.get("plantName"),
            "default_report_id": created.get("defaultReportId"),
        }

    cfg["configurable"]["chat_token"] = chat_token

    try:
        yield enc.start(message_id)
        # Tell the client which thread/chat this is so it can resume later.
        yield enc.custom("thread", meta)

        errored = False
        async for event in graph.astream_events(graph_input, config=cfg, version="v2"):
            if event["event"] == "on_chain_error":
                err = event.get("data", {}).get("error", "Agent error")
                yield enc.error(str(err))
                errored = True
                break
            out = await _emit_event(enc, event)
            if out:
                yield out

        # Fallback for non-streaming / placeholder runs: emit the final assistant
        # message as a single text delta if nothing streamed.
        if not errored and not enc.emitted_text:
            state = await graph.aget_state(cfg)
            messages = (state.values or {}).get("messages", [])
            for message in reversed(messages):
                if isinstance(message, AIMessage):
                    content = _message_content(message)
                    if content:
                        yield enc.text_delta(content)
                    break

        if not errored:
            yield enc.finish()
    except Exception as exc:  # noqa: BLE001 - surface as an AI SDK error part
        yield enc.error(str(exc))
    finally:
        yield enc.done()


@router.post("/agent/stream")
async def chat_agent_stream(
    request: Request, payload: AgentStreamRequest
) -> StreamingResponse:
    """Stream agent output as the AI SDK UI Message Stream (SSE parts)."""
    graph = request.app.state.react_graph
    return StreamingResponse(
        _agent_stream(graph, payload),
        media_type="text/event-stream",
        headers=STREAM_HEADERS,
    )


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}