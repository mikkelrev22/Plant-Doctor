"""FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.memory import MemorySaver

from backend_agent.config import config
from backend_agent.graphs.react import build_react_graph
from backend_agent.routes.chat import router as chat_router


def init_tracing() -> None:
    """Enable LangSmith tracing when configured."""
    if not config.langsmith_tracing:
        return
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGCHAIN_PROJECT", config.langsmith_project)
    if config.llm_api_key:
        os.environ.setdefault("LANGCHAIN_API_KEY", config.llm_api_key)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_tracing()
    # MemorySaver keeps thread state in-process — fine for a draft. To survive
    # restarts, swap in AsyncSqliteSaver/AsyncPostgresSaver (see backend-py's
    # persistence.py) and re-add the langgraph-checkpoint-* deps.
    app.state.react_graph = build_react_graph(checkpointer=MemorySaver())
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    # Auth is the x-api-key header, not cookies — keep credentials off so the
    # wildcard origin below is spec-compliant and the browser doesn't reject it.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-vercel-ai-ui-message-stream"],
)

app.include_router(chat_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Plant Doctor agent service is running"}