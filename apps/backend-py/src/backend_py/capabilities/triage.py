"""Input triage and validation (local CLIP + text heuristics)."""

from __future__ import annotations

import logging
import re

from backend_py.capabilities.clip_plant import image_is_plant
from backend_py.schemas import StructuredFacts, TriageResult

logger = logging.getLogger(__name__)

_PLANT_TEXT_HINTS = re.compile(
    r"\b(plant|leaf|leaves|pothos|succulent|fern|monstera|cactus|"
    r"orchid|soil|pot|wilting|yellowing|chlorosis|houseplant)\b",
    re.IGNORECASE,
)

_WATERING = re.compile(
    r"(?:water(?:ed|ing)?\s+(?:it\s+)?(?:about\s+)?"
    r"(?:every\s+(?:\d+\s+)?(?:day|days|week|weeks)|once\s+a\s+week|weekly|daily)"
    r"|every\s+\d+\s+days?"
    r"|once\s+a\s+week|weekly|daily)",
    re.IGNORECASE,
)
_LIGHT = re.compile(
    r"((?:south|north|east|west)[\w\s-]{0,20}window"
    r"|bright(?:\s+indirect)?(?:\s+light)?"
    r"|direct\s+sun(?:light)?"
    r"|low\s+light|shade|sunny)",
    re.IGNORECASE,
)
_LOCATION = re.compile(
    r"(near\s+(?:a\s+)?[\w\s-]{0,30}window"
    r"|(?:in\s+the\s+)?(?:kitchen|bathroom|bedroom|living\s+room|office|balcony))",
    re.IGNORECASE,
)


def _first_match(pattern: re.Pattern[str], text: str) -> str | None:
    match = pattern.search(text)
    if not match:
        return None
    return " ".join(match.group(0).split())


def extract_structured_facts(user_text: str) -> StructuredFacts:
    """Lightweight fact extraction from free text (no LLM)."""
    text = user_text or ""
    return StructuredFacts(
        raw_text=text,
        location=_first_match(_LOCATION, text),
        watering_frequency=_first_match(_WATERING, text),
        light_conditions=_first_match(_LIGHT, text),
    )


def _is_plant_from_text(user_text: str) -> bool:
    if not user_text.strip():
        return True
    return bool(_PLANT_TEXT_HINTS.search(user_text))


async def validate_input(image_url: str, user_text: str) -> TriageResult:
    """
    Confirm the submission is plant-related and extract structured user facts.

    - ``is_plant``: local CLIP ViT-B/32 on the image when available; otherwise
      keyword heuristics on ``user_text``.
    - ``structured_facts``: regex heuristics on ``user_text``.
    """
    facts = extract_structured_facts(user_text)

    if image_url:
        try:
            is_plant, plant_prob = await image_is_plant(image_url)
            logger.info(
                "CLIP triage is_plant=%s plant_prob=%.3f url=%s",
                is_plant,
                plant_prob,
                image_url[:120],
            )
            return TriageResult(is_plant=is_plant, structured_facts=facts)
        except Exception:
            logger.exception(
                "CLIP triage failed; falling back to text heuristics for is_plant"
            )

    return TriageResult(
        is_plant=_is_plant_from_text(user_text),
        structured_facts=facts,
    )
