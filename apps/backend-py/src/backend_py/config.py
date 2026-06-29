"""Application configuration loaded from the workspace root .env file."""

import os
from pathlib import Path

from dotenv import load_dotenv

_workspace_root = Path(__file__).resolve().parents[4]
load_dotenv(_workspace_root / ".env")


class Config:
    llm_api_key: str = os.getenv("LLM_API_KEY")
    host: str = os.getenv("HOST", "localhost")
    port: int = int(os.getenv("BACKEND_PY_PORT", "4200"))
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:4000")
    backend_py_url: str = os.getenv("BACKEND_PY_URL", "http://localhost:4200")


config = Config()
