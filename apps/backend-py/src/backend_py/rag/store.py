"""Vector store wrapper for plant-care knowledge retrieval."""

from pathlib import Path

from langchain_core.embeddings import Embeddings

from backend_py.schemas import CareProfile


class VectorStore:
    """Minimal vector store facade — swap for Chroma, pgvector, etc."""

    def __init__(self, url: str, embeddings: Embeddings | None = None) -> None:
        self.url = url
        self.embeddings = embeddings
        if url.startswith("sqlite:///"):
            db_dir = Path(url.removeprefix("sqlite:///")).parent
            db_dir.mkdir(parents=True, exist_ok=True)

    async def search(self, species: str, limit: int = 5) -> CareProfile:
        """Return the best-matching care profile for a species."""
        _ = limit
        return CareProfile(
            species=species,
            ideal_conditions={},
            common_failure_modes=[],
        )

    async def upsert(self, profiles: list[CareProfile]) -> int:
        """Insert or update care profiles in the index."""
        _ = profiles
        return 0
