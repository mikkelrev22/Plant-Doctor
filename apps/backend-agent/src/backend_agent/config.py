"""Application configuration loaded from the workspace root .env file."""

import os
from pathlib import Path

from dotenv import load_dotenv

_workspace_root = Path(__file__).resolve().parents[4]
load_dotenv(_workspace_root / ".env")


class Config:
    # --- LLM ----------------------------------------------------------------
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_api_url: str = os.getenv("LLM_API_URL", "")
    llm_model: str = os.getenv("LLM_API_MODEL", "")
    llm_max_tokens: int = int(os.getenv("LLM_MAX_TOKENS", "8192"))
    llm_timeout_ms: int = int(os.getenv("LLM_TIMEOUT_MS", "120000"))
    # 0 is fully deterministic (rigid, repetitive phrasing). 0.3 loosens tone
    # while keeping tool-calling reliable; don't push much higher for an agent
    # with tools (tool-call errors rise sharply above ~0.6). Qwen3 free-chat
    # guidance is ~0.6 if you want more variety at the cost of consistency.
    llm_temperature: float = float(os.getenv("LLM_TEMPERATURE", "0.3"))
    # Fireworks reasoning depth for thinking-capable models (qwen3 etc.):
    # none | low | medium | high | xhigh | max. "medium" = solid reasoning
    # without the latency/length of high. Empty/None lets the model default apply.
    llm_reasoning_effort: str = os.getenv("LLM_REASONING_EFFORT", "medium")

    # --- tracing ------------------------------------------------------------
    langsmith_tracing: bool = os.getenv("LANGCHAIN_TRACING_V2", "").lower() == "true"
    langsmith_project: str = os.getenv("LANGCHAIN_PROJECT", "plant-doctor")

    # --- agent runtime ------------------------------------------------------
    react_recursion_limit: int = int(os.getenv("REACT_RECURSION_LIMIT", "25"))

    # --- networking ---------------------------------------------------------
    host: str = os.getenv("HOST", "localhost")
    port: int = int(os.getenv("BACKEND_AGENT_PORT", "4300"))
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:4000")
    backend_agent_url: str = os.getenv(
        "BACKEND_AGENT_URL", f"http://localhost:{port}"
    )

    # --- CORS (browser / Expo web target) -----------------------------------
    # The native Expo Go app doesn't enforce CORS; this only gates the web
    # target (`expo start --web`), whose dev-server origin differs from
    # FRONTEND_URL. Auth is the bundled x-api-key header (not cookies), so
    # credentials stay off and "*" is fine for the prototype. Set
    # AGENT_CORS_ORIGINS to a comma-separated list to lock it down.
    cors_origins: list[str] = [
        o.strip() for o in os.getenv("AGENT_CORS_ORIGINS", "*").split(",") if o.strip()
    ]

    # --- Node backend tool gateway (/agent/*) -------------------------------
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:4100")
    backend_api_key: str = os.getenv("BACKEND_API_KEY", "")


config = Config()