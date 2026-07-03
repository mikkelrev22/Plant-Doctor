"""LangGraph checkpointer for multi-turn agent resume (SQLite dev / Postgres prod)."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from langgraph.checkpoint.base import BaseCheckpointSaver

from backend_py.config import config


@asynccontextmanager
async def checkpointer_lifespan() -> AsyncIterator[BaseCheckpointSaver]:
    """Keep a checkpointer open for the app lifetime."""
    if config.checkpointer_backend == "postgres":
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

        async with AsyncPostgresSaver.from_conn_string(
            config.checkpointer_url
        ) as checkpointer:
            yield checkpointer
        return

    from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

    db_path = config.checkpointer_url.removeprefix("sqlite:///")
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    async with AsyncSqliteSaver.from_conn_string(db_path) as checkpointer:
        yield checkpointer
