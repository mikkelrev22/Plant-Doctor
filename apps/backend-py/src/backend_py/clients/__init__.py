"""Shared LLM, embedding, vector-store, and Node backend clients."""

from __future__ import annotations

from functools import lru_cache

from langchain_core.embeddings import Embeddings
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from backend_py.clients.node_backend import NodeBackendClient, get_node_client
from backend_py.config import config
from backend_py.rag.store import VectorStore

__all__ = [
    "NodeBackendClient",
    "get_embeddings",
    "get_llm",
    "get_node_client",
    "get_vector_store",
]


class _NoOpEmbeddings(Embeddings):
    """Placeholder when no Python LLM/embedding API key is configured."""

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [[0.0] * 8 for _ in texts]

    def embed_query(self, text: str) -> list[float]:
        _ = text
        return [0.0] * 8


@lru_cache
def get_llm() -> ChatOpenAI:
    if not config.py_llm_api_key:
        raise RuntimeError(
            "BACKEND_PY_LLM_API_KEY is not configured "
            "(required for LangGraph LLM / agent calls)"
        )
    return ChatOpenAI(
        api_key=config.py_llm_api_key,
        base_url=config.py_llm_api_url or None,
        model=config.py_llm_model,
        temperature=0,
        max_tokens=config.llm_max_tokens,
        timeout=config.llm_timeout_ms / 1000,
    )


@lru_cache
def get_embeddings() -> Embeddings:
    """Return real OpenAI-compatible embeddings, or a no-op stub without keys."""
    if not config.py_llm_api_key:
        return _NoOpEmbeddings()
    return OpenAIEmbeddings(
        api_key=config.py_llm_api_key,
        base_url=config.py_llm_api_url or None,
        model=config.embedding_model,
    )


@lru_cache
def get_vector_store() -> VectorStore:
    return VectorStore(
        url=config.vector_store_url,
        embeddings=get_embeddings(),
    )
