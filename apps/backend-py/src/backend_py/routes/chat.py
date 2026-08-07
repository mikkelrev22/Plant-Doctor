"""ReAct agent chat API routes."""

import json
from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from langchain_core.messages import BaseMessage, HumanMessage

from backend_py.graphs.react import react_invoke_config
from backend_py.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


def serialize_chat_result(result: dict[str, Any]) -> dict[str, Any]:
    """Point the frontend at /chat/agent/stream instead of /chat/agent
        Append tokens as they arrive
        Document the stream endpoint in docs/backend-endpoints.md
    """
    """Convert LangChain messages into JSON-safe payloads for the frontend."""
    messages = result.get("messages", [])
    return {
        "messages": [
            {
                "role": message.type,
                "content": _message_content(message),
            }
            for message in messages
            if isinstance(message, BaseMessage)
        ]
    }


def _message_content(message: BaseMessage) -> str:
    content = message.content
    if isinstance(content, str):
        return content
    return str(content)


def _format_sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def _agent_event_stream(
    graph: Any,
    payload: ChatRequest,
    thread_id: str,
) -> AsyncIterator[str]:
    config = react_invoke_config(thread_id)
    graph_input = {"messages": [HumanMessage(content=payload.message)]}

    yield _format_sse("thread", {"thread_id": thread_id})

    try:
        async for mode, chunk in graph.astream(
            graph_input,
            config=config,
            stream_mode=["messages", "updates"],
        ):
            if mode == "messages":
                message, metadata = chunk
                node = metadata.get("langgraph_node")
                if not message.content:
                    continue
                if node == "agent":
                    yield _format_sse(
                        "token",
                        {"content": _message_content(message), "node": node},
                    )
                elif node == "tools":
                    yield _format_sse(
                        "tool",
                        {"content": _message_content(message), "node": node},
                    )
            elif mode == "updates" and "tools" in chunk:
                yield _format_sse("status", {"message": "Running tools..."})

        state = await graph.aget_state(config)
        messages = state.values.get("messages", []) if state.values else []
        yield _format_sse(
            "done",
            {
                "thread_id": thread_id,
                "result": serialize_chat_result({"messages": messages}),
            },
        )
    except Exception as exc:  # noqa: BLE001 - stream errors to the client
        yield _format_sse("error", {"detail": str(exc)})


@router.post("/agent", response_model=ChatResponse)
async def chat_agent(request: Request, payload: ChatRequest) -> ChatResponse:
    """Run the non-deterministic ReAct agent graph (multi-turn via thread_id)."""
    thread_id = payload.thread_id or str(uuid4())
    graph = request.app.state.react_graph
    try:
        result = await graph.ainvoke(
            {"messages": [HumanMessage(content=payload.message)]},
            config=react_invoke_config(thread_id),
        )
    except Exception as exc:  # noqa: BLE001 - surface as a clean 502 for the UI
        raise HTTPException(
            status_code=502,
            detail=f"Agent run failed: {exc}",
        ) from exc
    return ChatResponse(thread_id=thread_id, result=serialize_chat_result(result))


@router.post("/agent/stream")
async def chat_agent_stream(request: Request, payload: ChatRequest) -> StreamingResponse:
    """Stream agent output as Server-Sent Events (token chunks + final state)."""
    thread_id = payload.thread_id or str(uuid4())
    graph = request.app.state.react_graph
    return StreamingResponse(
        _agent_event_stream(graph, payload, thread_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
