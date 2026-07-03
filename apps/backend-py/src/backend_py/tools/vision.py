"""Vision tool adapter for the ReAct agent."""

import json

from langchain_core.tools import tool

from backend_py.capabilities.vision import detect_symptoms


@tool
async def analyze_plant_image(image_url: str) -> str:
    """Analyze a plant image to identify species and visible symptoms."""
    report = await detect_symptoms(image_url)
    return json.dumps(report.model_dump())
