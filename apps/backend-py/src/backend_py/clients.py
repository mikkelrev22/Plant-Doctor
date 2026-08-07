"""Shared LLM, embedding, and vector-store clients (built once)."""

from functools import lru_cache

from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from backend_py.config import config
from backend_py.rag.store import VectorStore


@lru_cache
def get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        api_key=config.llm_api_key or None,
        base_url=config.llm_api_url or None,
        model=config.llm_model,
        temperature=0,
    )


@lru_cache
def get_embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        api_key=config.llm_api_key or None,
        base_url=config.llm_api_url or None,
        model=config.embedding_model,
    )


@lru_cache
def get_vector_store() -> VectorStore:
    return VectorStore(
        url=config.vector_store_url,
        embeddings=get_embeddings(),
    )
