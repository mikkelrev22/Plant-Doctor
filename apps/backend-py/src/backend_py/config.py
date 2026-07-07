"""Application configuration loaded from the workspace root .env file."""

import os
from pathlib import Path

from dotenv import load_dotenv

_workspace_root = Path(__file__).resolve().parents[4]
load_dotenv(_workspace_root / ".env")


class Config:
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_model: str = os.getenv("LLM_API_MODEL", "")
    embedding_model: str = os.getenv("LLM_API_EMBEDDING", "text-embedding-3-small")
    vector_store_url: str = os.getenv(
        "VECTOR_STORE_URL",
        f"sqlite:///{_workspace_root / 'data' / 'vector_store.db'}",
    )
    checkpointer_backend: str = os.getenv("CHECKPOINTER_BACKEND", "sqlite")
    checkpointer_url: str = os.getenv(
        "CHECKPOINTER_URL",
        f"sqlite:///{_workspace_root / 'data' / 'checkpoints.db'}",
    )
    langsmith_tracing: bool = os.getenv("LANGCHAIN_TRACING_V2", "").lower() == "true"
    langsmith_project: str = os.getenv("LANGCHAIN_PROJECT", "plant-doctor")
    react_recursion_limit: int = int(os.getenv("REACT_RECURSION_LIMIT", "25"))
    llm_api_key: str = os.getenv("LLM_API_KEY")
    llm_max_tokens: int = int(os.getenv("LLM_MAX_TOKENS", "8192"))
    llm_timeout_ms: int = int(os.getenv("LLM_TIMEOUT_MS", "120000"))
    host: str = os.getenv("HOST", "localhost")
    port: int = int(os.getenv("BACKEND_PY_PORT", "4200"))
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:4000")
    backend_py_url: str = os.getenv("BACKEND_PY_URL", "http://localhost:4200")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgres://plant_doctor:plant_doctor@localhost:5432/plant_doctor",
    )


config = Config()
