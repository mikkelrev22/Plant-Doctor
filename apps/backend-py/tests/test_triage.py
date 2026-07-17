"""Triage holds formatted survey results before vision/species ID."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from backend_py.capabilities.triage import facts_from_care
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


def test_triage_node_parks_structured_facts_without_vision() -> None:
    """Call only the triage node; vision must not run and survey stays in state."""

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
