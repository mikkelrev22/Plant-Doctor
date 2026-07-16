"""Input triage: format care survey + plant-photo check (no species ID)."""

from __future__ import annotations

import logging
from typing import Any

from backend_py.capabilities.clip_plant import image_is_plant
from backend_py.schemas import CareContext, StructuredFacts, TriageResult

logger = logging.getLogger(__name__)

_REQUIRED_CARE_FIELDS = (
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


def facts_from_care(care: CareContext | dict[str, Any], user_text: str) -> StructuredFacts:
    """Normalize survey answers into StructuredFacts for later pipeline nodes."""
    if isinstance(care, CareContext):
        data = care.model_dump()
    else:
        data = dict(care)

    def field(name: str) -> str | None:
        value = str(data.get(name) or "").strip()
        return value or None

    return StructuredFacts(
        raw_text=(user_text or "").strip(),
        location="indoors",
        light_intensity=field("light_intensity"),
        window_direction=field("window_direction"),
        distance_from_window=field("distance_from_window"),
        daily_light_hours=field("daily_light_hours"),
        water_amount=field("water_amount"),
        watering_frequency=field("watering_frequency"),
        water_type=field("water_type"),
        watering_method=field("watering_method"),
        soil_moisture=field("soil_moisture"),
        soil_drainage=field("soil_drainage"),
        humidity=field("humidity"),
        temperature=field("temperature"),
    )


def _care_complete(care: dict[str, Any] | None) -> bool:
    if not care:
        return False
    return all(str(care.get(field) or "").strip() for field in _REQUIRED_CARE_FIELDS)


async def validate_input(
    image_url: str,
    user_text: str,
    care: dict[str, Any] | None = None,
) -> TriageResult:
    """
    Triage only:

    1. Format the care survey into ``structured_facts`` (held in graph state
       until diagnosis, after vision has determined species).
    2. Decide whether the photo depicts a plant (local CLIP).

    Does not identify species or diagnose.
    """
    if _care_complete(care):
        facts = facts_from_care(care or {}, user_text)
    else:
        # Incomplete payloads: keep comments only; route usually requires care.
        facts = StructuredFacts(raw_text=(user_text or "").strip())

    if not image_url:
        logger.warning("Triage received empty image_url; assuming is_plant=True")
        return TriageResult(
            is_plant=True,
            plant_probability=None,
            structured_facts=facts,
        )

    try:
        is_plant, plant_prob = await image_is_plant(image_url)
        logger.info(
            "CLIP triage is_plant=%s plant_prob=%.3f url=%s",
            is_plant,
            plant_prob,
            image_url[:120],
        )
        return TriageResult(
            is_plant=is_plant,
            plant_probability=plant_prob,
            structured_facts=facts,
        )
    except Exception:
        logger.exception(
            "CLIP triage failed; falling back to is_plant=True with survey facts kept"
        )
        return TriageResult(
            is_plant=True,
            plant_probability=None,
            structured_facts=facts,
        )
