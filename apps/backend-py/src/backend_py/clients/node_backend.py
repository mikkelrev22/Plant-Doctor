"""HTTP client for the Node.js product backend (DB + uploads source of truth)."""

from __future__ import annotations

from typing import Any

import httpx

from backend_py.config import config


class NodeBackendError(Exception):
    """Raised when a Node backend request fails."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class NodeBackendClient:
    """Thin async wrapper around existing Node Fastify routes."""

    def __init__(self, base_url: str | None = None, timeout: float = 30.0) -> None:
        self.base_url = (base_url or config.backend_url).rstrip("/")
        self.timeout = timeout

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        files: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(
                    method,
                    url,
                    json=json,
                    files=files,
                    data=data,
                )
        except httpx.RequestError as exc:
            raise NodeBackendError(
                f"Could not reach Node backend at {self.base_url}: {exc}"
            ) from exc

        if response.status_code >= 400:
            detail = response.text
            try:
                body = response.json()
                if isinstance(body, dict):
                    detail = str(
                        body.get("message")
                        or body.get("detail")
                        or body.get("error")
                        or detail
                    )
            except ValueError:
                pass
            raise NodeBackendError(detail, status_code=response.status_code)

        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    async def health(self) -> dict[str, Any]:
        return await self._request("GET", "/")

    async def list_plants(self) -> list[dict[str, Any]]:
        result = await self._request("GET", "/plants")
        return result if isinstance(result, list) else []

    async def get_plant(self, plant_id: int) -> dict[str, Any]:
        return await self._request("GET", f"/plants/{plant_id}")

    async def create_plant(self, name: str | None = None) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if name:
            body["name"] = name
        return await self._request("POST", "/plants", json=body)

    async def update_plant_name(self, plant_id: int, name: str) -> dict[str, Any]:
        return await self._request(
            "PATCH",
            f"/plants/{plant_id}",
            json={"name": name},
        )

    async def list_plant_reports(self, plant_id: int) -> list[dict[str, Any]]:
        result = await self._request("GET", f"/plants/{plant_id}/reports")
        return result if isinstance(result, list) else []

    async def list_plant_reports_extended(
        self, plant_id: int
    ) -> list[dict[str, Any]]:
        result = await self._request("GET", f"/plants/{plant_id}/reports/extended")
        return result if isinstance(result, list) else []

    async def get_report(self, report_id: int) -> dict[str, Any]:
        return await self._request("GET", f"/reports/{report_id}")

    async def list_stress_signs(self) -> Any:
        return await self._request("GET", "/stress-signs")

    async def get_llm_request(self, llm_request_id: int) -> dict[str, Any]:
        return await self._request("GET", f"/llm-requests/{llm_request_id}")

    async def find_or_create_plant(
        self,
        *,
        plant_id: int | None = None,
        plant_name: str | None = None,
    ) -> dict[str, Any]:
        """Resolve a plant using existing Node plant routes."""
        if plant_id is not None:
            return await self.get_plant(plant_id)
        return await self.create_plant(plant_name)

    async def upload_plant_photo(
        self,
        *,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> dict[str, Any]:
        """
        Upload-only is not available on Node yet.

        Needed: POST /uploads/plant-photos (multipart image) returning storage
        metadata / public URLs — without running dashboard LLM analysis.
        """
        _ = (filename, content, content_type)
        raise NodeBackendError(
            "Node has no upload-only endpoint yet. "
            "Needed: POST /uploads/plant-photos (multipart). "
            "POST /reports/analyze uploads a photo but also runs Node LLM analysis."
        )

    async def save_linear_report(
        self,
        *,
        plant_id: int | None = None,
        plant_name: str | None = None,
        summary: str,
        recommendations: str,
        stressors: list[str] | None = None,
        report_payload: dict[str, Any] | None = None,
        upload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Persist a Python linear diagnosis via Node.

        Needed: POST /reports/from-linear (or similar) that accepts a precomputed
        analysis and writes plant_reports (+ optional photo / stress signs)
        without calling Node's plant-analysis LLM.
        """
        _ = (
            plant_id,
            plant_name,
            summary,
            recommendations,
            stressors,
            report_payload,
            upload,
        )
        raise NodeBackendError(
            "Node has no endpoint to save a precomputed linear report yet. "
            "Needed: POST /reports/from-linear accepting summary, recommendations, "
            "optional plantId/plantName, optional photo metadata, and reportPayload. "
            "POST /reports/analyze always re-runs Node LLM analysis."
        )


def get_node_client() -> NodeBackendClient:
    return NodeBackendClient()
