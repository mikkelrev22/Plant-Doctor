"""Persist linear diagnosis via the Node.js backend (DB source of truth)."""

from __future__ import annotations

import logging
from typing import Any

from backend_py.clients.node_backend import NodeBackendError, get_node_client
from backend_py.state import LinearState

logger = logging.getLogger(__name__)


async def persist_diagnosis(state: LinearState) -> LinearState:
    """
    Resolve plant via Node; attempt to save the linear report via Node.

    Report save soft-fails until Node exposes a from-linear endpoint.
    """
    plant_id = state.get("plant_id")
    plant_name = state.get("plant_name")
    if plant_id is None and not plant_name:
        return {
            "persisted": {
                "saved": False,
                "reason": "No plant_id or plant_name provided; skipped DB write.",
            }
        }

    advice = state.get("advice") or {}
    diagnosis = state.get("diagnosis") or {}
    summary = advice.get("summary") or "Linear diagnosis complete."
    actions = advice.get("actions") or []
    recommendations = "\n".join(f"- {action}" for action in actions) or summary
    stressors = [
        cause.get("name", "")
        for cause in (diagnosis.get("candidate_causes") or [])
        if isinstance(cause, dict) and cause.get("name")
    ]

    client = get_node_client()
    plant: dict[str, Any] | None = None

    try:
        plant = await client.find_or_create_plant(
            plant_id=plant_id,
            plant_name=plant_name,
        )
    except NodeBackendError as exc:
        logger.exception("Failed to resolve plant via Node backend")
        return {
            "persisted": {
                "saved": False,
                "reason": f"Could not resolve plant via Node backend: {exc}",
            }
        }

    report_payload = {
        "source": "linear_pipeline",
        "summary": summary,
        "recommendations": recommendations,
        "likelyStressors": stressors,
        "identifiedPlantName": (
            diagnosis.get("species")
            or (state.get("symptom_report") or {}).get("species")
            or plant_name
            or "Unknown plant"
        ),
        "diagnosis": diagnosis,
        "symptomReport": state.get("symptom_report"),
        "careProfile": state.get("care_profile"),
        "advice": advice,
    }

    try:
        saved = await client.save_linear_report(
            plant_id=plant.get("id") if plant else plant_id,
            plant_name=plant_name,
            summary=summary,
            recommendations=recommendations,
            stressors=stressors,
            report_payload=report_payload,
            upload=state.get("upload"),
        )
        return {
            "persisted": {
                "saved": True,
                "plant": plant,
                "report": saved,
            }
        }
    except NodeBackendError as exc:
        logger.warning("Linear report not saved via Node: %s", exc)
        return {
            "persisted": {
                "saved": False,
                "plant": plant,
                "reason": str(exc),
            }
        }
