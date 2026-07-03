"""FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend_py.config import config
from backend_py.graphs.linear import build_linear_graph
from backend_py.graphs.react import build_react_graph
from backend_py.persistence import checkpointer_lifespan
from backend_py.routes.chat import router as chat_router
from backend_py.routes.diagnose import router as diagnose_router


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
    async with checkpointer_lifespan() as checkpointer:
        app.state.linear_graph = build_linear_graph()
        app.state.react_graph = build_react_graph(checkpointer=checkpointer)
        yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(diagnose_router)
app.include_router(chat_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Python backend is running"}
