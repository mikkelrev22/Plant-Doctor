"""Triage survey formatting and CLIP plant / non-plant graph routes."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from backend_py.capabilities.triage import facts_from_care
from backend_py.graphs.linear import _after_triage, build_linear_graph
from backend_py.nodes.reject_non_plant import reject_non_plant
from backend_py.nodes.triage import triage
from backend_py.schemas import CareContext

SAMPLE_CARE = {
    "light_intensity": "bright_indirect",
    "window_direction": "south",
    "distance_from_window": "within_3ft",
    "daily_light_hours": "6_to_8h",
    "water_amount": "moderate",
    "watering_frequency": "weekly",
    "water_type": "tap",
    "watering_method": "top",
    "soil_moisture": "slightly_moist",
    "soil_drainage": "good",
    "humidity": "average",
    "temperature": "room",
}

_GRAPH_INPUT = {
    "image_url": "https://example.com/photo.jpg",
    "user_text": "Leaves curling.",
    "care": SAMPLE_CARE,
}


def test_facts_from_care_formats_survey() -> None:
    facts = facts_from_care(SAMPLE_CARE, "Yellow tips after moving.")

    assert facts.raw_text == "Yellow tips after moving."
    assert facts.location == "indoors"
    assert facts.light_intensity == "bright_indirect"
    assert facts.window_direction == "south"
    assert facts.watering_method == "top"
    assert facts.soil_moisture == "slightly_moist"
    assert facts.temperature == "room"


def test_facts_from_care_accepts_care_context_model() -> None:
    care = CareContext.model_validate(SAMPLE_CARE)
    facts = facts_from_care(care, "")
    assert facts.light_intensity == "bright_indirect"
    assert facts.location == "indoors"
    assert facts.raw_text == ""


def test_triage_node_parks_structured_facts() -> None:
    """Triage alone formats survey + CLIP; does not produce vision output."""

    async def run() -> dict:
        with patch(
            "backend_py.capabilities.triage.image_is_plant",
            new_callable=AsyncMock,
            return_value=(True, 0.91),
        ) as mock_clip:
            update = await triage(
                {
                    "image_url": "https://example.com/plant.jpg",
                    "user_text": "Leaves curling.",
                    "care": SAMPLE_CARE,
                }
            )
            mock_clip.assert_awaited_once()
            return update

    update = asyncio.run(run())
    assert "symptom_report" not in update

    triage_out = update["triage"]
    assert triage_out["is_plant"] is True
    assert triage_out["plant_probability"] == pytest.approx(0.91)

    facts = triage_out["structured_facts"]
    assert facts["location"] == "indoors"
    assert facts["light_intensity"] == "bright_indirect"
    assert facts["daily_light_hours"] == "6_to_8h"
    assert facts["water_type"] == "tap"
    assert facts["raw_text"] == "Leaves curling."


def test_after_triage_routes_on_is_plant() -> None:
    assert _after_triage({"triage": {"is_plant": True}}) == "vision"
    assert _after_triage({"triage": {"is_plant": False}}) == "reject_non_plant"
    assert _after_triage({}) == "reject_non_plant"


def test_reject_non_plant_writes_graceful_advice() -> None:
    update = asyncio.run(reject_non_plant({}))
    assert update["rejected"] is True
    assert "couldn't identify" in update["advice"]["summary"].lower()
    assert len(update["advice"]["actions"]) >= 1


def test_graph_plant_route_continues_to_vision() -> None:
    """CLIP says plant → vision runs; survey stays in triage; not rejected."""
    graph = build_linear_graph()

    async def run() -> dict:
        with patch(
            "backend_py.capabilities.triage.image_is_plant",
            new_callable=AsyncMock,
            return_value=(True, 0.91),
        ) as mock_clip:
            result = await graph.ainvoke(_GRAPH_INPUT)
            mock_clip.assert_awaited_once()
            return result

    result = asyncio.run(run())

    assert result["triage"]["is_plant"] is True
    assert result["triage"]["structured_facts"]["light_intensity"] == "bright_indirect"
    assert result.get("rejected") is not True
    assert "symptom_report" in result
    assert "advice" in result  # full plant path reaches format


def test_graph_non_plant_route_rejects_without_vision() -> None:
    """CLIP says non-plant → reject advice; vision/diagnosis never run."""
    graph = build_linear_graph()

    async def run() -> dict:
        with patch(
            "backend_py.capabilities.triage.image_is_plant",
            new_callable=AsyncMock,
            return_value=(False, 0.12),
        ) as mock_clip:
            result = await graph.ainvoke(_GRAPH_INPUT)
            mock_clip.assert_awaited_once()
            return result

    result = asyncio.run(run())

    assert result["triage"]["is_plant"] is False
    assert result["triage"]["structured_facts"]["light_intensity"] == "bright_indirect"
    assert result["rejected"] is True
    assert "couldn't identify" in result["advice"]["summary"].lower()
    assert "symptom_report" not in result
    assert "diagnosis" not in result
    assert "care_profile" not in result
