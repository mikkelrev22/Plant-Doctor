"""Linear diagnosis pipeline API routes."""

import json
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from starlette.datastructures import UploadFile

from backend_py.graphs.linear import linear_graph
from backend_py.schemas import CareContext, DiagnoseRequest, DiagnoseResponse
from backend_py.services.uploads import store_plant_photo

router = APIRouter(prefix="/diagnose", tags=["diagnose"])

_STEP_LABELS = {
    "triage": "Formatting care survey and checking photo…",
    "vision": "Identifying species and symptoms…",
    "retrieval": "Looking up care profile…",
    "diagnosis": "Ranking causes…",
    "format": "Writing advice…",
    "persist": "Saving via Node backend…",
}

_CARE_FIELDS = (
    "light_intensity",
    "window_direction",
    "distance_from_window",
    "daily_light_hours",
    "water_amount",
    "watering_frequency",
    "water_type",
    "watering_method",
    "soil_moisture",
    "soil_drainage",
    "humidity",
    "temperature",
)


def _parse_optional_int(value: object) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(str(value))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid plant_id") from exc


def _format_sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _parse_care_from_form(form: Any) -> CareContext:
    values: dict[str, str] = {}
    missing: list[str] = []
    for field in _CARE_FIELDS:
        raw = str(form.get(field) or "").strip()
        if not raw:
            missing.append(field)
        else:
            values[field] = raw
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required care fields: {', '.join(missing)}",
        )
    return CareContext.model_validate(values)


def _build_graph_input(
    *,
    image_url: str,
    user_text: str,
    plant_id: int | None,
    plant_name: str | None,
    care: CareContext,
    upload_meta: dict | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "image_url": image_url,
        "user_text": user_text,
        "care": care.model_dump(),
    }
    if plant_id is not None:
        payload["plant_id"] = plant_id
    if plant_name:
        payload["plant_name"] = plant_name
    if upload_meta:
        payload["upload"] = upload_meta
    return payload


async def _parse_diagnose_request(request: Request) -> dict[str, Any]:
    """Parse JSON or multipart into a linear-graph input dict."""
    content_type = request.headers.get("content-type", "")

    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        # Comments are optional; structured care fields are required.
        user_text = str(form.get("user_text") or form.get("comments") or "").strip()
        care = _parse_care_from_form(form)

        image_url = str(form.get("image_url") or "").strip()
        plant_id = _parse_optional_int(form.get("plant_id"))
        plant_name = str(form.get("plant_name") or "").strip() or None
        upload_meta = None

        image = form.get("image")
        if isinstance(image, UploadFile) and (image.filename or image.size):
            # Temporary: store on Python disk until Node has upload-only API.
            # See NodeBackendClient.upload_plant_photo for the intended handoff.
            stored = await store_plant_photo(image)
            image_url = stored.image_url
            upload_meta = {
                "image_url": stored.image_url,
                "storage_key": stored.storage_key,
                "mime_type": stored.mime_type,
                "width": stored.width,
                "height": stored.height,
                "thumbnail_url": stored.thumbnail.image_url,
                "thumbnail_storage_key": stored.thumbnail.storage_key,
                "thumbnail_width": stored.thumbnail.width,
                "thumbnail_height": stored.thumbnail.height,
            }
        elif not image_url:
            raise HTTPException(
                status_code=400,
                detail="Provide an image file or image_url",
            )

        return _build_graph_input(
            image_url=image_url,
            user_text=user_text,
            plant_id=plant_id,
            plant_name=plant_name,
            care=care,
            upload_meta=upload_meta,
        )

    body = await request.json()
    payload = DiagnoseRequest.model_validate(body)
    if payload.care is None:
        raise HTTPException(status_code=400, detail="care object is required")
    return _build_graph_input(
        image_url=payload.image_url,
        user_text=payload.user_text,
        plant_id=payload.plant_id,
        plant_name=payload.plant_name,
        care=payload.care,
    )


async def _run_linear(graph_input: dict[str, Any]) -> dict[str, Any]:
    return await linear_graph.ainvoke(graph_input)


async def _linear_event_stream(graph_input: dict[str, Any]) -> AsyncIterator[str]:
    """Emit SSE events as each pipeline node completes."""
    yield _format_sse(
        "status",
        {"message": "Starting linear diagnosis…", "step": "start"},
    )

    accumulated: dict[str, Any] = dict(graph_input)
    try:
        async for update in linear_graph.astream(
            graph_input,
            stream_mode="updates",
        ):
            if not isinstance(update, dict):
                continue
            for node_name, node_output in update.items():
                if isinstance(node_output, dict):
                    accumulated.update(node_output)
                yield _format_sse(
                    "step",
                    {
                        "step": node_name,
                        "message": _STEP_LABELS.get(node_name, f"Running {node_name}…"),
                        "partial": accumulated,
                    },
                )

        yield _format_sse("done", {"result": accumulated})
    except Exception as exc:  # noqa: BLE001
        yield _format_sse("error", {"detail": str(exc)})


@router.post("/linear", response_model=DiagnoseResponse)
async def diagnose_linear(request: Request) -> DiagnoseResponse:
    """Run triage -> vision -> RAG -> diagnosis; accepts JSON or multipart upload."""
    try:
        graph_input = await _parse_diagnose_request(request)
        result = await _run_linear(graph_input)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502,
            detail=f"Linear diagnosis failed: {exc}",
        ) from exc

    return DiagnoseResponse(result=result)


@router.post("/linear/stream")
async def diagnose_linear_stream(request: Request) -> StreamingResponse:
    """Stream linear pipeline progress as SSE (one event per completed node)."""
    try:
        graph_input = await _parse_diagnose_request(request)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=400,
            detail=f"Invalid diagnose request: {exc}",
        ) from exc

    return StreamingResponse(
        _linear_event_stream(graph_input),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
