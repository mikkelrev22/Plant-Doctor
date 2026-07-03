"""ReAct agent chat API routes."""

from uuid import uuid4

from fastapi import APIRouter, Request
from langchain_core.messages import HumanMessage

from backend_py.graphs.react import react_invoke_config
from backend_py.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/agent", response_model=ChatResponse)
async def chat_agent(request: Request, payload: ChatRequest) -> ChatResponse:
    """Run the non-deterministic ReAct agent graph (multi-turn via thread_id)."""
    thread_id = payload.thread_id or str(uuid4())
    graph = request.app.state.react_graph
    result = await graph.ainvoke(
        {"messages": [HumanMessage(content=payload.message)]},
        config=react_invoke_config(thread_id),
    )
    return ChatResponse(thread_id=thread_id, result=result)
