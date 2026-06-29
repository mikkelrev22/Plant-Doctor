"""Smoke tests for the FastAPI application."""

from fastapi.testclient import TestClient

from backend_py.main import app

client = TestClient(app)


def test_root() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Python backend is running"}
