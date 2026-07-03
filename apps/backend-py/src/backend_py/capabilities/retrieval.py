"""Plant-care knowledge retrieval."""

from backend_py.clients import get_vector_store
from backend_py.schemas import CareProfile


async def search_care_profile(species: str) -> CareProfile:
    """Query the vector store for ideal conditions and common failure modes."""
    store = get_vector_store()
    return await store.search(species)
