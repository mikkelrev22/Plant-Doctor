"""Ingest plant-care documents into the vector store."""

from backend_py.clients import get_vector_store
from backend_py.schemas import CareProfile


async def ingest_profiles(profiles: list[CareProfile]) -> int:
    """Embed and upsert care profiles into the vector index."""
    store = get_vector_store()
    return await store.upsert(profiles)
