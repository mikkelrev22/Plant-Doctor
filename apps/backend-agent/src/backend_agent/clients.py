"""Shared LLM client (built once)."""

from functools import lru_cache

from langchain_openai import ChatOpenAI

from backend_agent.config import config


@lru_cache
def get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        api_key=config.llm_api_key or None,
        base_url=config.llm_api_url or None,
        model=config.llm_model,
        temperature=config.llm_temperature,
        reasoning_effort=config.llm_reasoning_effort or None,
        # Non-streaming: the chat route emits the complete assistant message
        # as one batch (see routes/chat.py fallback) instead of token deltas.
        streaming=False,
        max_tokens=config.llm_max_tokens,
        timeout=config.llm_timeout_ms / 1000,
    )