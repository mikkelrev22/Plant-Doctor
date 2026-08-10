"""Dev server entry point — reads host/port from config (.env)."""

import uvicorn

from backend_agent.config import config


def main() -> None:
    uvicorn.run(
        "backend_agent.main:app",
        host=config.host,
        port=config.port,
        reload=True,
    )


if __name__ == "__main__":
    main()