"""Dev server entry point — reads host/port from config (.env)."""

import uvicorn

from backend_py.config import config


def main() -> None:
    uvicorn.run(
        "backend_py.main:app",
        host=config.host,
        port=config.port,
        reload=True,
    )


if __name__ == "__main__":
    main()
